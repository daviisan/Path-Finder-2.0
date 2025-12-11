
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { AnalysisResult, Sentiment, ChatMessage, Language } from '../types';
import LiveAudioChat from './LiveAudioChat';
import { FormattedMessage } from './FormattedMessage';
import Tooltip from './Tooltip';
import { createDocumentChat } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { translations } from '../locales';

// Lazy load Confetti to improve initial render performance
const Confetti = React.lazy(() => import('./Confetti'));

interface AnalysisViewProps {
  result: AnalysisResult;
  onReset: () => void;
  fileData: {
    base64: string;
    mimeType: string;
  };
  language: Language;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, onReset, fileData, language }) => {
  const t = translations[language];

  // Case-insensitive check to be safe
  const isPositive = result.sentiment?.toUpperCase().includes('POSITIVE');
  const isNegative = result.sentiment?.toUpperCase().includes('NEGATIVE');
  
  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialization Lock & tracking
  const chatInitializedRef = useRef(false);
  const currentLangRef = useRef(language);
  
  // Helper to detect USCIS forms and create links
  const renderDocumentLink = (docName: string) => {
    // Regex to find patterns like "I-130", "N-400", "Form I-797", etc.
    const formRegex = /\b([A-Z]{1,3}-\d{2,3}([A-Z]+)?)\b/g;
    const match = docName.match(formRegex);

    if (match) {
        // If a form number is found, link to USCIS
        const formNumber = match[0];
        const url = `https://www.uscis.gov/${formNumber.toLowerCase()}`;
        
        // Split text to insert the link
        const parts = docName.split(formRegex);
        
        return (
            <span className="leading-snug">
                {docName.split(formNumber).map((part, i, arr) => (
                    <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                            <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-calm-600 hover:text-calm-800 underline decoration-calm-300 underline-offset-2 font-medium inline-flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {formNumber}
                                <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        )}
                    </React.Fragment>
                ))}
            </span>
        );
    }
    
    // Default render for non-form documents (e.g., "Marriage Certificate")
    return <span className="leading-snug select-none">{docName}</span>;
  };

  // Play sound effect on mount if positive
  useEffect(() => {
    const playSuccessSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
  
        const t = ctx.currentTime;
        
        // "Cha-ching" effect
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987, t); 
        osc1.frequency.exponentialRampToValueAtTime(1318, t + 0.1);
        
        gain1.gain.setValueAtTime(0.3, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.6);
  
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318, t + 0.1);
        gain2.gain.setValueAtTime(0, t);
        gain2.gain.linearRampToValueAtTime(0.2, t + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
  
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.8);
        
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };

    if (isPositive) {
      setTimeout(playSuccessSound, 300);
    }
  }, [isPositive]);

  // Initialize Text Chat (re-run if language changes)
  useEffect(() => {
    // If language changed, we need to re-init
    if (chatInitializedRef.current && currentLangRef.current === language) return;
    
    chatInitializedRef.current = true;
    currentLangRef.current = language;

    const initChat = async () => {
      setMessages([{
        role: 'model',
        text: t.chatWaiting
      }]);

      try {
        const chat = await createDocumentChat(fileData.base64, fileData.mimeType, language);
        setChatSession(chat);
        setMessages([{
          role: 'model',
          text: t.chatReady.replace('{docType}', result.documentType)
        }]);
      } catch (e) {
        console.error("Failed to init chat", e);
        setMessages([{
          role: 'model',
          text: t.chatError,
          isError: true
        }]);
      }
    };
    initChat();
  }, [fileData, result.documentType, language, t]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSession || isSending) return;

    const newMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response: GenerateContentResponse = await chatSession.sendMessage({ message: textToSend });
      
      let aiText = "";
      const candidate = response.candidates?.[0];
      
      if (response.text) {
          aiText = response.text;
      } else if (candidate) {
          if (candidate.finishReason === 'SAFETY') {
              aiText = "I cannot answer that because it flagged a safety filter. This sometimes happens with legal documents mentioning penalties. Please try asking in a simpler way.";
          } else if (candidate.finishReason === 'RECITATION') {
               aiText = "I cannot quote that text directly due to copyright limits. I can summarize it instead.";
          } else {
              aiText = "I received a response but couldn't understand it (Empty Text). Please try again.";
          }
      } else {
          aiText = "I'm sorry, I couldn't understand that completely (No Candidate).";
      }

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: { title: string; uri: string }[] = [];
      
      if (groundingChunks) {
        groundingChunks.forEach(chunk => {
          if (chunk.web) {
            sources.push({ 
              title: chunk.web.title || t.verifiedSources.replace(':', ''), 
              uri: chunk.web.uri || "#" 
            });
          }
        });
      }

      setMessages(prev => [...prev, { role: 'model', text: aiText, sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: t.chatConnectError, isError: true }]);
    } finally {
      setIsSending(false);
    }
  };

  // Wrapped in useCallback to ensure stability across renders
  const handleLiveTranscript = useCallback((text: string, role: 'user' | 'model') => {
    setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        // If the last message matches the role of the incoming transcript chunk, append to it
        if (lastMsg && lastMsg.role === role && !lastMsg.isError) {
             return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + text }];
        } else {
             return [...prev, { role: role, text: text }];
        }
    });
  }, []);

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, feedback: type } : msg
    ));
  };

  const getSentimentLabel = (s: Sentiment) => {
    const sent = s ? s.toString().toUpperCase() : 'UNKNOWN';
    if (sent.includes('POSITIVE')) return t.goodNews;
    if (sent.includes('NEGATIVE')) return t.actionRequired;
    if (sent.includes('NEUTRAL')) return t.neutralUpdate;
    return t.analysisComplete;
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 animate-fade-in relative grid grid-cols-1 lg:grid-cols-12 gap-8">
      {isPositive && (
        <Suspense fallback={null}>
          <Confetti />
        </Suspense>
      )}

      {/* Left Column: Summary Analysis */}
      <section className="lg:col-span-7 space-y-6" aria-label={t.docAnalysis}>
        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
               <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-wider uppercase mb-3">
                    {t.docAnalysis}
                  </span>
                  <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2 break-words">{result.documentType}</h1>
               </div>
               
               <div className="flex flex-wrap items-center gap-3 self-start">
                  <div 
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                      isPositive ? 'bg-green-50 border-green-100 text-green-800' :
                      isNegative ? 'bg-orange-50 border-orange-100 text-orange-800' :
                      'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                    role="status"
                  >
                      {isPositive ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : isNegative ? (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      ) : (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      )}
                      <span className="font-bold text-sm whitespace-nowrap">{getSentimentLabel(result.sentiment)}</span>
                  </div>
               </div>
            </div>

            <div className={`mt-4 p-4 rounded-xl border flex gap-3 ${
               isPositive ? 'bg-green-50/50 border-green-100 text-green-900' :
               isNegative ? 'bg-orange-50/50 border-orange-100 text-orange-900' :
               'bg-slate-50 border-slate-100 text-slate-700'
            }`} role="note">
               <svg className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <p className="font-medium leading-relaxed">{result.goodOrBadNews}</p>
            </div>
            
            <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
               <div className="flex items-center justify-between mb-2">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span aria-hidden="true">🧐</span> {t.whatIsThis}
                  <Tooltip content={t.whatIsThisTooltip} />
                </h2>
               </div>
              <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-line">
                {result.whatIsThis}
              </p>
            </div>
          </div>
        </div>

        {/* Required Documents (Full Width) */}
        <article className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span aria-hidden="true">📂</span> {t.requiredDocs}
              <Tooltip content={t.requiredDocsTooltip} />
            </h2>
            
            <div className="space-y-6">
                {/* Specifically mentioned in document */}
                {result.requiredDocuments && result.requiredDocuments.length > 0 ? (
                    <ul className="space-y-3">
                        {result.requiredDocuments.map((doc, idx) => (
                            <li key={`req-${idx}`} className="flex items-start gap-3 text-slate-600 text-sm">
                                <input type="checkbox" id={`req-doc-${idx}`} className="mt-1 w-4 h-4 rounded border-slate-300 text-calm-600 focus:ring-calm-500 cursor-pointer" />
                                <label htmlFor={`req-doc-${idx}`} className="leading-snug cursor-pointer">
                                  {renderDocumentLink(doc)}
                                </label>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 italic text-sm">No specific documents listed in the letter.</p>
                )}

                {/* Supplemental Checklist */}
                {t.supplementalDocs && t.supplementalDocs.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{t.supplementalTitle}</h3>
                     <ul className="space-y-3">
                        {t.supplementalDocs.map((doc, idx) => (
                            <li key={`sup-${idx}`} className="flex items-start gap-3 text-slate-600 text-sm opacity-90 hover:opacity-100 transition-opacity">
                                <input type="checkbox" id={`sup-doc-${idx}`} className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-400 focus:ring-slate-400 cursor-pointer" />
                                <label htmlFor={`sup-doc-${idx}`} className="leading-snug cursor-pointer select-none">{doc}</label>
                            </li>
                        ))}
                     </ul>
                  </div>
                )}
            </div>
        </article>
        
        {/* Example Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span aria-hidden="true">💡</span> {t.example}
            </h2>
             <p className="text-slate-600 italic">
              "{result.exampleOfRequirement || "No specific examples required."}"
            </p>
        </div>

        {/* Glossary */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span aria-hidden="true">📖</span> {t.simpleDefinitions}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {result.simplifiedTerms.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-calm-200 transition-colors">
                <dt className="block font-semibold text-calm-800 mb-1 text-sm">{item.term}</dt>
                <dd className="text-sm text-slate-600 leading-snug">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
        
        <div className="text-center pt-4">
           <button 
            onClick={onReset}
            className="text-slate-600 hover:text-calm-700 text-sm font-medium underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-calm-500 rounded"
          >
            {t.uploadDifferent}
          </button>
        </div>
      </section>

      {/* Right Column: Chat Interface */}
      <section className="lg:col-span-5 h-[600px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-24 flex flex-col bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden relative" aria-label={t.chatTitle}>
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-calm-500 to-calm-700 flex items-center justify-center text-white shadow-md" aria-hidden="true">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-800">{t.chatTitle}</h3>
                   <p className="text-xs text-slate-500">{t.chatSubtitle}</p>
                 </div>
              </div>
              
              {/* Live Voice Toggle */}
              <button 
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`p-2 rounded-full transition-colors ${isLiveMode ? 'bg-red-100 text-red-600' : 'text-calm-600 hover:bg-calm-100'}`}
                title={isLiveMode ? "End Voice Chat" : "Start Voice Chat"}
                aria-label={isLiveMode ? "End Voice Chat" : "Start Voice Chat"}
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 ${isLiveMode ? 'pb-24' : ''}`} aria-live="polite" aria-atomic="false">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative group
                    ${msg.role === 'user' 
                      ? 'bg-calm-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}
                    ${msg.isError ? 'bg-red-50 text-red-600 border-red-100' : ''}
                  `}>
                    {msg.role === 'model' ? (
                      <FormattedMessage text={msg.text} />
                    ) : (
                      msg.text
                    )}
                    
                    {msg.role === 'model' && !msg.isError && (
                      <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between gap-3">
                         <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleFeedback(i, 'up')}
                              className={`p-1 rounded hover:bg-slate-50 transition-colors ${msg.feedback === 'up' ? 'text-green-600' : 'text-slate-400 hover:text-green-600'}`}
                            >
                              <svg className="w-4 h-4" fill={msg.feedback === 'up' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                            </button>
                            <button 
                              onClick={() => handleFeedback(i, 'down')}
                              className={`p-1 rounded hover:bg-slate-50 transition-colors ${msg.feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                            >
                              <svg className="w-4 h-4" fill={msg.feedback === 'down' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                            </button>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 ml-1 flex flex-wrap gap-2 max-w-[85%]">
                      <span className="text-xs font-semibold text-slate-400 w-full mb-0.5">{t.verifiedSources}</span>
                      {msg.sources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-calm-200 rounded-md text-xs text-calm-700 hover:bg-calm-50 hover:border-calm-300 transition-colors shadow-sm"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {source.title.length > 20 ? source.title.substring(0, 20) + '...' : source.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                   <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 border border-slate-100 shadow-sm flex items-center gap-1" aria-label="Typing...">
                     <div className="w-2 h-2 bg-calm-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                     <div className="w-2 h-2 bg-calm-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                     <div className="w-2 h-2 bg-calm-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isLiveMode && (
                <div className="p-4 bg-white border-t border-slate-100">
                   <div className="flex gap-2">
                     <label htmlFor="chatInput" className="sr-only">{t.typeQuestion}</label>
                     <input
                        id="chatInput"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={t.typeQuestion}
                        disabled={isSending}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-calm-500 focus:border-calm-500 outline-none transition-all shadow-sm"
                     />

                     <button
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim() || isSending}
                        aria-label="Send message"
                        className="bg-calm-600 hover:bg-calm-700 disabled:bg-slate-300 text-white rounded-xl px-4 flex items-center justify-center transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-calm-600"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     </button>
                   </div>
                </div>
            )}
            
            {/* Live Audio Bar */}
            {isLiveMode && (
              <LiveAudioChat 
                systemContext={`You are analyzing a ${result.documentType}. Summary: ${result.whatIsThis}. ${t.liveSystemPrompt}. Keep answers short and concise.`}
                onClose={() => setIsLiveMode(false)}
                onTranscript={handleLiveTranscript}
              />
            )}
          </>
      </section>
    </div>
  );
};

export default AnalysisView;