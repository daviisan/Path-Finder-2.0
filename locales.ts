
export type Language = 'en' | 'es';

export const translations = {
  en: {
    // App Header & Intro
    appTitle: "PathFinder",
    subtitle: "AI Immigration Assistant",
    headlinePart1: "Understand your USCIS letters, ",
    headlinePart2: "instantly",
    description: "Upload a photo or PDF. We'll translate the legalese into plain human language and answer your questions, so you know exactly what to do.",
    
    // Upload Area
    uploadTitle: "Upload a document",
    uploadSubtitle: "PDF, JPG, or PNG (Max 10MB)",
    selectFile: "Select File",
    takePhoto: "Take Photo",
    readingDoc: "Reading your document...",
    loadingSteps: [
      "Scanning Document...",
      "Translating Legalese...",
      "Preparing Summary...",
      "Simplifying..."
    ],
    patientMessage: "Please be patient, I am carefully analyzing every detail to ensure accuracy. This may take a moment.",
    analyzeNow: "Analyze Now",
    removeFile: "Remove file",
    errorGeneric: "We couldn't analyze that document. Please try a clear image or PDF of a USCIS form.",
    
    // Mission
    missionTitle: "Why PathFinder Exists",
    missionBody1: "Figuring out the path to a new life is already an act of immense courage, it shouldn't be defined by the fear of paperwork. For countless families, the hope of a fresh start is often overshadowed by the anxiety of complex government letters, where a single misunderstood term can feel like a barrier to their future.",
    missionBody2: "This project was born from a deep, personal understanding of the silence and stress. I believe that peace of mind shouldn't be a luxury reserved only for those who can afford expensive legal advise.",
    missionBody3: "I built this app to offer a helping hand to anyone feeling lost in the process. The goal: to ensure that clarity, comfort, and understanding are accessible to everyone, so that no one has to face these documents alone.",
    
    // Footer
    poweredBy: "Powered by Google Gemini. Private & Secure.",
    disclaimer: "PathFinder is an AI assistant, not a lawyer. This is for informational purposes only.",

    // Analysis View
    docAnalysis: "Document Analysis",
    save: "Save",
    saved: "Saved!",
    goodNews: "Good News!",
    actionRequired: "Action Required",
    neutralUpdate: "Neutral Update",
    analysisComplete: "Analysis Complete",
    whatIsThis: "What is this?",
    whatIsThisTooltip: "A simplified explanation of what this document is and why you received it.",
    todoTitle: "To-Do & Deadline",
    todoTooltip: "Actionable steps you need to take and any critical dates to remember.",
    requiredDocs: "Required Documents",
    requiredDocsTooltip: "A checklist of supporting documents or evidence mentioned in the form that you may need to provide.",
    due: "Due:",
    example: "Example",
    simpleDefinitions: "Simple Definitions",
    uploadDifferent: "Upload a different document",
    
    // Supplemental Docs Checklist
    supplementalTitle: "Common Supporting Evidence (Checklist)",
    supplementalDocs: [
      "Civil Marriage Certificate",
      "Birth Certificates (Long Form)",
      "Proof of Joint Assets (Bank Accounts, Lease)",
      "Photos together (with dates & locations)",
      "Affidavits from friends/family",
      "Passport / Travel Documents"
    ],

    // Chat
    chatTitle: "Chat with PathFinder",
    chatSubtitle: "Ask specific questions about your form",
    typeQuestion: "Type your question...",
    verifiedSources: "Verified Sources:",
    chatWaiting: "Please wait a moment while I read your document details to prepare for our chat... 🧐",
    chatReady: "I've finished reading your document. Feel free to ask me specific questions about it, or I can search for the latest USCIS fees and processing times for you!",
    chatError: "I had trouble reading the document for the chat, but I am still here to answer general questions.",
    chatConnectError: "I'm having trouble connecting right now. Please try again.",
    
    // Live Chat
    liveConnecting: "Connecting...",
    liveListening: "Listening...",
    liveError: "Error",
    liveTitle: "PathFinder Live",
    
    // Live Voice System Prompt Context
    liveSystemPrompt: "IMPORTANT: Speak in English unless the user speaks Spanish. Keep responses conversational.",
  },
  es: {
    // App Header & Intro
    appTitle: "PathFinder",
    subtitle: "Asistente de Inmigración con IA",
    headlinePart1: "Entienda sus cartas de USCIS, ",
    headlinePart2: "al instante",
    description: "Suba una foto o PDF. Traduciremos la terminología legal a un lenguaje humano sencillo y responderemos sus preguntas para que sepa exactamente qué hacer.",
    
    // Upload Area
    uploadTitle: "Subir un documento",
    uploadSubtitle: "PDF, JPG, o PNG (Max 10MB)",
    selectFile: "Seleccionar Archivo",
    takePhoto: "Tomar Foto",
    readingDoc: "Leyendo su documento...",
    loadingSteps: [
      "Escaneando documento...",
      "Traduciendo términos legales...",
      "Preparando resumen...",
      "Simplificando..."
    ],
    patientMessage: "Por favor tenga paciencia, estoy analizando cuidadosamente cada detalle para asegurar la precisión. Esto puede tomar un momento.",
    analyzeNow: "Analizar Ahora",
    removeFile: "Eliminar archivo",
    errorGeneric: "No pudimos analizar ese documento. Intente con una imagen clara o PDF de un formulario de USCIS.",
    
    // Mission
    missionTitle: "¿Por qué existe PathFinder?",
    missionBody1: "Descifrar el camino hacia una nueva vida ya es un acto de inmensa valentía; no debería definirse por el miedo al papeleo. Para innumerables familias, la esperanza de un nuevo comienzo a menudo se ve ensombrecida por la ansiedad de cartas gubernamentales complejas, donde un solo término malentendido puede sentirse como una barrera para su futuro.",
    missionBody2: "Este proyecto nació de una comprensión profunda y personal del silencio y el estrés. Creo que la tranquilidad no debería ser un lujo reservado solo para aquellos que pueden pagar costosos consejos legales.",
    missionBody3: "Construí esta aplicación para ofrecer una mano amiga a cualquiera que se sienta perdido en el proceso. El objetivo: asegurar que la claridad, el consuelo y la comprensión sean accesibles para todos, para que nadie tenga que enfrentar estos documentos solo.",
    
    // Footer
    poweredBy: "Impulsado por Google Gemini. Privado y Seguro.",
    disclaimer: "PathFinder es un asistente de IA, no un abogado. Esto es solo para fines informativos.",

    // Analysis View
    docAnalysis: "Análisis del Documento",
    save: "Guardar",
    saved: "¡Guardado!",
    goodNews: "¡Buenas Noticias!",
    actionRequired: "Acción Requerida",
    neutralUpdate: "Actualización Neutral",
    analysisComplete: "Análisis Completo",
    whatIsThis: "¿Qué es esto?",
    whatIsThisTooltip: "Una explicación simplificada de qué es este documento y por qué lo recibió.",
    todoTitle: "Tareas y Fecha Límite",
    todoTooltip: "Pasos procesables que debe tomar y fechas críticas para recordar.",
    requiredDocs: "Documentos Requeridos",
    requiredDocsTooltip: "Una lista de verificación de documentos de respaldo o evidencia mencionados en el formulario que puede necesitar proporcionar.",
    due: "Vence:",
    example: "Ejemplo",
    simpleDefinitions: "Definiciones Simples",
    uploadDifferent: "Subir un documento diferente",
    
    // Supplemental Docs Checklist
    supplementalTitle: "Evidencia de Respaldo Común (Lista de Verificación)",
    supplementalDocs: [
      "Certificado de Matrimonio Civil",
      "Certificados de Nacimiento (Forma Larga)",
      "Prueba de Activos Conjuntos (Cuentas, Contratos)",
      "Fotos juntos (con fechas y lugares)",
      "Declaraciones Juradas de amigos/familia",
      "Pasaporte / Documentos de Viaje"
    ],

    // Chat
    chatTitle: "Chatear con PathFinder",
    chatSubtitle: "Haga preguntas específicas sobre su formulario",
    typeQuestion: "Escriba su pregunta...",
    verifiedSources: "Fuentes Verificadas:",
    chatWaiting: "Espere un momento mientras leo los detalles de su documento para preparar nuestro chat... 🧐",
    chatReady: "He terminado de leer su documento. ¡Siéntase libre de hacerme preguntas específicas al respecto, o puedo buscar las últimas tarifas y tiempos de procesamiento de USCIS para usted!",
    chatError: "Tuve problemas para leer el documento para el chat, pero todavía estoy aquí para responder preguntas generales.",
    chatConnectError: "Tengo problemas para conectarme en este momento. Por favor inténtelo de nuevo.",

    // Live Chat
    liveConnecting: "Conectando...",
    liveListening: "Escuchando...",
    liveError: "Error",
    liveTitle: "PathFinder en Vivo",
    
    // Live Voice System Prompt Context
    liveSystemPrompt: "IMPORTANTE: Hable en ESPAÑOL. Mantenga las respuestas conversacionales.",
  }
};
