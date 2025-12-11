import React, { useEffect, useRef, useState } from 'react';
import { LiveSession } from '../services/liveService';

interface LiveAudioChatProps {
  systemContext: string;
  onClose: () => void;
  onTranscript: (text: string, role: 'user' | 'model') => void;
}

const LiveAudioChat: React.FC<LiveAudioChatProps> = ({ systemContext, onClose, onTranscript }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  
  // Use refs to keep latest callbacks without triggering re-connect
  const onTranscriptRef = useRef(onTranscript);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onCloseRef.current = onClose;
  }, [onTranscript, onClose]);

  useEffect(() => {
    // Initialize session on mount
    const session = new LiveSession(
      () => setIsConnected(true),
      () => setIsConnected(false),
      (err) => setError("Connection failed. Check API key."),
      (text, role) => onTranscriptRef.current(text, role)
    );

    sessionRef.current = session;
    
    // Construct a specific system instruction for the live persona
    const instructions = `
      ${systemContext}
      
      IMPORTANT: You are now in a real-time voice call with the user.
      - Keep responses conversational (1-3 sentences).
      - Be warm, encouraging, and empathetic.
      - Do not read out long lists or legal text verbatim unless asked. Summarize instead.
    `;

    session.connect(instructions);

    return () => {
      // Clean up session on unmount
      session.disconnect();
    };
  }, [systemContext]); // Removed onTranscript from dependencies to prevent disconnect loop

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 animate-slide-up">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700/50 flex items-center justify-between text-white">
        
        {/* Left Side: Status & Visualizer */}
        <div className="flex items-center gap-4">
           {/* Visualizer Icon */}
           <div className={`
             w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative
             ${isConnected ? 'bg-calm-500' : 'bg-slate-700'}
             ${error ? 'bg-red-500' : ''}
           `}>
             {isConnected && !error && (
               <>
                 <div className="absolute inset-0 rounded-full border border-calm-400 animate-ping opacity-75"></div>
                 <div className="absolute -inset-1 rounded-full border border-calm-500/50 animate-pulse opacity-50"></div>
               </>
             )}
             
             {error ? (
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             )}
           </div>

           <div>
              <h3 className="font-bold text-sm">
                {error ? "Error" : isConnected ? "PathFinder Live" : "Connecting..."}
              </h3>
              <p className="text-xs text-slate-400">
                {error || (isConnected ? "Listening..." : "Establishing secure link...")}
              </p>
           </div>
        </div>

        {/* Right Side: Controls */}
        <button 
          onClick={onClose}
          className="bg-red-500/20 hover:bg-red-500/40 text-red-100 p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          title="End Call"
        >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default LiveAudioChat;