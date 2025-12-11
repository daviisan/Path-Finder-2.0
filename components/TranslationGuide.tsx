import React from 'react';

interface TranslationGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const TranslationGuide: React.FC<TranslationGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="translation-guide-title"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          aria-label="Close translation guide"
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 z-10"
          autoFocus
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8">
          <div className="w-12 h-12 bg-calm-100 text-calm-600 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
          </div>
          
          <h2 id="translation-guide-title" className="text-2xl font-bold text-slate-900 mb-2">Translate PathFinder / Traducir</h2>
          <p className="text-slate-600 mb-6">
            We support translation directly through your web browser. This ensures the entire page is translated accurately.
            <br/><br/>
            <span className="text-calm-700 font-medium">Soportamos la traducción directamente a través de su navegador web.</span>
          </p>

          <div className="space-y-6">
            {/* iOS/Safari */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🍎</span> iPhone (Safari)
              </h3>
              <div className="space-y-4">
                  <div>
                      <h4 className="font-bold text-xs uppercase text-slate-500 mb-1">English</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                        <li>Tap the <span className="font-bold">"Aa"</span> or <span className="font-bold">puzzle icon</span> in the address bar.</li>
                        <li>Select <span className="font-bold">Translate Website</span>.</li>
                        <li>Choose your preferred language.</li>
                      </ol>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                      <h4 className="font-bold text-xs uppercase text-slate-500 mb-1">Español</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                        <li>Toque el icono <span className="font-bold">"Aa"</span> o el <span className="font-bold">rompecabezas</span> en la barra de direcciones.</li>
                        <li>Seleccione <span className="font-bold">Traducir sitio web</span>.</li>
                        <li>Elija su idioma preferido.</li>
                      </ol>
                  </div>
              </div>
            </div>

            {/* Android/Chrome */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🤖</span> Android & Chrome
              </h3>
               <div className="space-y-4">
                  <div>
                      <h4 className="font-bold text-xs uppercase text-slate-500 mb-1">English</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                        <li>Tap the <span className="font-bold">three dots (⋮)</span> menu icon.</li>
                        <li>Tap <span className="font-bold">Translate</span>.</li>
                      </ol>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                      <h4 className="font-bold text-xs uppercase text-slate-500 mb-1">Español</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                        <li>Toque el icono de <span className="font-bold">tres puntos (⋮)</span>.</li>
                        <li>Seleccione <span className="font-bold">Traducir</span>.</li>
                      </ol>
                  </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button 
            onClick={onClose}
            className="text-calm-700 font-semibold hover:text-calm-800 text-sm focus:outline-none focus:underline"
          >
            Got it, thanks! / ¡Entendido, gracias!
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationGuide;