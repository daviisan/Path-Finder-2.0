
import React, { useState, useRef, useEffect } from 'react';
import { analyzeDocument } from './services/geminiService';
import { AnalysisResult, Language } from './types';
import AnalysisView from './components/AnalysisView';
import { translations } from './locales';

// Custom Logo Component to ensure it never breaks
const PathFinderLogo = () => (
  <svg 
    viewBox="0 0 100 100" 
    className="h-14 w-14 drop-shadow-sm" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <title>PathFinder Logo</title>
    {/* Background Circle - Ocean Blue */}
    <circle cx="50" cy="50" r="48" className="fill-calm-800" />
    
    {/* Stylized Globe Grid */}
    <path d="M50 2A48 48 0 0 0 50 98" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    <path d="M2 50H98" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    <circle cx="50" cy="50" r="32" stroke="white" strokeOpacity="0.1" strokeWidth="1" />

    {/* Lighthouse Tower */}
    <path d="M42 80L46 40H54L58 80H42Z" fill="#fdfbf7" />
    {/* Lighthouse Lantern - Removed yellow accent for cleaner look */}
    <path d="M45 40L50 30L55 40H45Z" fill="#f0f9ff" />
    
    {/* The Path - Swirling Up */}
    <path d="M20 85C35 85 45 70 50 65C55 70 65 85 80 85" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
    
    {/* Dove Silhouette */}
    <path d="M25 40C25 40 28 35 32 36C36 37 35 42 35 42C35 42 40 38 42 40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const processFile = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    // 1. Handle PDF (Pass through)
    if (file.type === 'application/pdf') {
       const reader = new FileReader();
       reader.onload = () => {
         const result = reader.result as string;
         // Remove Data URL prefix
         resolve({
           base64: result.split(',')[1],
           mimeType: file.type
         });
       };
       reader.onerror = reject;
       reader.readAsDataURL(file);
       return;
    }

    // 2. Handle Images (Resize & Compress)
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1500; 

                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    } else {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Canvas context failed")); return; }
                
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                resolve({
                    base64: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg'
                });
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
    }

    reject(new Error("Unsupported file type. Please upload an image or PDF."));
  });
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
      setIsMobile(true);
    }
  }, []);

  // Cycle through loading steps during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          // Cycle through 0 to length-1
          return (prev + 1) % (t.loadingSteps?.length || 4);
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, t.loadingSteps]);

  // Validation Helper
  const validateFile = (selectedFile: File): boolean => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError(language === 'es' ? "Tipo de archivo no válido. Use PDF o Imagen." : "Invalid file type. Please use PDF or Image.");
      setFile(null);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        setFile(selected);
        setError(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       const dropped = e.dataTransfer.files[0];
       if (validateFile(dropped)) {
         setFile(dropped);
         setError(null);
       }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isAnalyzing) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const performAnalysis = async (data: {base64: string, mimeType: string}, lang: Language) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeDocument(data.base64, data.mimeType, lang);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError(t.errorGeneric);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    let currentFileData = fileData;
    if (!currentFileData) {
        try {
            currentFileData = await processFile(file);
            setFileData(currentFileData);
        } catch (err) {
            setError("Failed to process file. Please try again.");
            return;
        }
    }
    
    await performAnalysis(currentFileData, language);
  };

  // Toggle Language and re-analyze if needed
  const toggleLanguage = async () => {
      const newLang = language === 'en' ? 'es' : 'en';
      setLanguage(newLang);
      
      // If we already have a document analyzed, re-analyze it in the new language automatically
      if (result && fileData) {
          await performAnalysis(fileData, newLang);
      }
  };

  const handleReset = () => {
    setFile(null);
    setFileData(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 selection:bg-calm-200">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PathFinderLogo />
            <span className="text-2xl font-serif font-bold text-slate-800 tracking-tight">{t.appTitle}</span>
          </div>
          
          <button
             onClick={toggleLanguage}
             aria-label={language === 'en' ? "Switch to Spanish" : "Cambiar a Inglés"}
             className="flex items-center gap-2 bg-white/80 border border-calm-200 hover:border-calm-400 text-slate-600 hover:text-calm-700 text-sm font-medium rounded-full px-4 py-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-calm-500"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
             {language === 'en' ? 'Español' : 'English'}
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12" role="main">
        
        {/* Intro Text (Only show if no result) */}
        {!result && (
          <div className="text-center mb-10 max-w-3xl mx-auto animate-fade-in bg-white/40 p-8 rounded-3xl backdrop-blur-sm shadow-sm border border-white/40">
            <span className="inline-block py-1 px-3 rounded-full bg-calm-100 text-calm-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
              {t.subtitle}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              {t.headlinePart1}<span className="text-calm-700 italic">{t.headlinePart2}</span>.
            </h1>
            <p className="text-lg md:text-xl text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
              {t.description}
            </p>
          </div>
        )}

        {/* Result View */}
        {result && fileData && (
          <AnalysisView 
            result={result} 
            onReset={handleReset} 
            fileData={fileData}
            language={language}
          />
        )}

        {/* Upload View */}
        {!result && (
          <div className="max-w-xl mx-auto animate-slide-up">
            <div 
              className={`
                relative group border-2 border-dashed rounded-3xl p-8 transition-all duration-300
                flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden shadow-lg outline-none
                ${isAnalyzing 
                  ? 'border-calm-300 bg-white/90 cursor-wait' 
                  : error 
                    ? 'border-red-300 bg-red-50/50 hover:bg-red-50/70' 
                    : file 
                      ? 'border-green-400 bg-green-50/40 hover:bg-green-50/60 ring-4 ring-green-50' 
                      : 'border-calm-200 hover:border-calm-400 hover:bg-white/90 bg-white/70 backdrop-blur-md focus:border-calm-500 focus:ring-4 focus:ring-calm-200'
                }
              `}
              role="button"
              tabIndex={0}
              aria-label="Upload document area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              onKeyDown={handleKeyDown}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={isAnalyzing}
                tabIndex={-1}
              />

              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={isAnalyzing}
                tabIndex={-1}
              />
              
              {isAnalyzing ? (
                <div className="py-12 px-6" aria-live="polite" aria-busy="true">
                  {/* Progressive Status Loader */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                     <div className="absolute inset-0 rounded-full border-4 border-calm-100 opacity-25"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-calm-500 border-t-transparent animate-spin"></div>
                     <div className="absolute inset-2 rounded-full border-4 border-sand-300 border-b-transparent animate-spin-reverse opacity-50"></div>
                  </div>
                  
                  <p className="text-xl font-bold text-slate-700 animate-pulse mb-2 transition-all duration-300 min-h-[1.75rem]">
                    {t.loadingSteps?.[loadingStep] || t.readingDoc}
                  </p>
                  <p className="text-calm-600 max-w-sm mx-auto leading-relaxed">{t.patientMessage}</p>
                </div>
              ) : file ? (
                <div className="py-8 w-full">
                  {/* File Icon with Success Badge */}
                  <div className="relative inline-block mx-auto mb-4">
                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                        {file.type.includes('image') ? (
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ) : (
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                     </div>
                     <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 border-4 border-white shadow-md animate-fade-in">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                     </div>
                  </div>

                  <p className="font-semibold text-lg text-slate-800 mb-1 truncate px-4 flex items-center justify-center gap-2">
                    {file.name}
                    <span className="text-green-600" aria-label="Accepted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze();
                      }}
                      className="bg-calm-600 hover:bg-calm-700 text-white font-medium py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-calm-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      {t.analyzeNow}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setError(null);
                      }}
                      className="text-slate-500 hover:text-red-600 text-sm font-medium py-2 focus:outline-none focus:text-red-600"
                    >
                      {t.removeFile}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 w-full">
                  <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300
                    ${error ? 'bg-red-50 text-red-400' : 'bg-calm-50 text-calm-400'}
                  `}>
                     {error ? (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                     )}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${error ? 'text-red-700' : 'text-slate-800'}`}>
                    {error ? "Oops!" : t.uploadTitle}
                  </h3>
                  <p className={`${error ? 'text-red-600 font-medium' : 'text-slate-600'} mb-8`}>
                    {error ? error : t.uploadSubtitle}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                     <button className="flex-1 bg-white border border-slate-200 hover:border-calm-400 hover:bg-calm-50 text-slate-700 font-medium py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-calm-500">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       {t.selectFile}
                     </button>
                     
                     {isMobile && (
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           cameraInputRef.current?.click();
                         }}
                         className="flex-1 bg-calm-600 hover:bg-calm-700 text-white font-medium py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-calm-600"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                         {t.takePhoto}
                       </button>
                     )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mission Statement */}
        {!result && (
          <article className="mt-20 max-w-3xl mx-auto text-center px-6 py-12 bg-white/80 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm relative overflow-hidden" aria-labelledby="mission-heading">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-calm-300 to-sand-300" aria-hidden="true"></div>
             <h2 id="mission-heading" className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">{t.missionTitle}</h2>
             <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>{t.missionBody1}</p>
                <p>{t.missionBody2}</p>
                <p className="font-medium text-slate-800">{t.missionBody3}</p>
             </div>
          </article>
        )}

        {/* Trust Footer */}
        <footer className="mt-20 border-t border-slate-900/10 pt-8 text-center text-slate-600 text-sm font-medium" role="contentinfo">
          <p className="mb-2">{t.poweredBy}</p>
          <p>{t.disclaimer}</p>
        </footer>

      </main>
    </div>
  );
};

export default App;
