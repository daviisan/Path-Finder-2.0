
import { GoogleGenAI, Type, Schema, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisResult, Sentiment, Language } from '../types';

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isImmigrationDocument: {
      type: Type.BOOLEAN,
      description: "Set to TRUE if this is a USCIS form, legal notice, court document, or supporting evidence (birth/marriage cert). Set to FALSE if it is unrelated (e.g., a menu, random photo).",
    },
    documentType: {
      type: Type.STRING,
      description: "The official name of the document (e.g., I-797C Notice of Action).",
    },
    whatIsThis: {
      type: Type.STRING,
      description: "A simple, empathetic explanation of what the document is for a layperson.",
    },
    actionItems: {
      type: Type.STRING,
      description: "A specific, numbered list of actions the user needs to take. Use newlines to separate items.",
    },
    deadline: {
      type: Type.STRING,
      description: "Any specific dates mentioned for action. If none, leave empty.",
    },
    goodOrBadNews: {
      type: Type.STRING,
      description: "A reassuring explanation of whether this is positive, neutral, or negative news.",
    },
    sentiment: {
      type: Type.STRING,
      enum: [Sentiment.POSITIVE, Sentiment.NEUTRAL, Sentiment.NEGATIVE, Sentiment.UNKNOWN],
      description: "The overall sentiment classification.",
    },
    requiredDocuments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of specific supporting documents or evidence mentioned that the user needs to provide (e.g., marriage cert, photos).",
    },
    exampleOfRequirement: {
      type: Type.STRING,
      description: "If the document asks for evidence, provide a concrete example of what satisfies it. Otherwise, explain the next step.",
    },
    simplifiedTerms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING },
        },
      },
      description: "A list of at least 20 complex legal terms found in the text with simple definitions.",
    }
  },
  required: ["isImmigrationDocument", "documentType", "whatIsThis", "actionItems", "goodOrBadNews", "sentiment", "requiredDocuments", "simplifiedTerms"],
};

export const analyzeDocument = async (
  base64Data: string,
  mimeType: string,
  language: Language
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are PathFinder, an expert immigration assistant. Analyze the attached image/PDF.
    
    STEP 1: VALIDATION CHECK (Critical)
    Determine if this is a valid US Immigration document. Look for these specific features:
    - Headers: "Department of Homeland Security", "U.S. Citizenship and Immigration Services", "USCIS", "Department of Justice", "Notice of action", "THE UNITED STATE OF AMERICA".
    - Form IDs: Patterns like "Form I-130", "I-797", "I-765", "I-485", "N-400", "G-28", "OMB No.".
    - Key Terms: "Petitioner", "Beneficiary", "A-Number", "Alien Relative", "Notice of Action", "Receipt Notice", "Approval Notice", "Employment Authorization", "EAD".
    - Supporting Docs: Birth certificates, Marriage certificates, Passports, Visas, Green Cards.
    
    If the document DOES NOT contain these features (e.g., it is a food menu, a selfie, a landscape, or a random text), set 'isImmigrationDocument' to FALSE and fill the other fields with generic placeholders.

    STEP 2: ANALYSIS (Only if Valid)
    Target Language: ${language === 'es' ? 'SPANISH (Español)' : 'ENGLISH'}.
    ALL output values in the JSON must be in ${language === 'es' ? 'Spanish' : 'English'}.
    
    Treat the user like a family member you are helping. Use a calm, reassuring, and clear tone.
    
    1. Identify what the document is.
    2. Explain "What is this?" in simple terms.
    3. Identify "What do I need to do by when?". Format this as a clear numbered list.
    4. Determine "Is this good or bad news?" and classify the sentiment.
    5. List any "Required Documents" or evidence mentioned.
    6. Provide an "Example" of what they might need to provide or what happens next.
    7. Extract and simplify at least 24 complex legal terms found in the text.

    Return the result in strictly structured JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const createDocumentChat = async (
  base64Data: string,
  mimeType: string,
  language: Language
): Promise<Chat> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const langName = language === 'es' ? 'SPANISH' : 'ENGLISH';

  // Optimized system instruction for structured, grammatical responses
  const systemInstruction = `You are PathFinder, an empathetic immigration assistant.
  
  CONTEXT:
  - The user has uploaded a US Immigration document (image/PDF) to this chat.
  - You MUST analyze the uploaded document in the chat history to answer questions.
  - Do NOT ask the user to upload the document again. It is already provided in the first message.
  
  ROLE & TONE:
  - Be expert yet kind, reassuring, and family-like.
  - Reply strictly in ${langName}.
  - Use complete, grammatically correct sentences.
  - **CRITICAL: Keep responses CONCISE (max 150 words).** Avoid unnecessary fluff.
  - Get straight to the answer.

  TOPIC RESTRICTION:
  - **STRICTLY LIMIT** answers to US Immigration topics or specific details found in the uploaded document.
  - If the user asks about anything else (e.g., cooking, sports, coding, general life advice), **politely REFUSE**. 
  - Say exactly: "I can only help with questions about this immigration document or US immigration procedures."
  
  FORMATTING RULES:
  1. **STRICTLY FORBIDDEN: Do NOT use Markdown headers (like #, ##, ###).**
  2. Use **Bold** for emphasis, keys, dates, and section titles instead of headers.
  3. Use **bullet points** for lists.
  4. Keep paragraphs short (1-2 sentences).

  CAPABILITIES:
  - Use **Google Search** to verify REAL-TIME info (fees, addresses, processing times).
  - Base answers on the document image provided + general knowledge.
  
  DISCLAIMER:
  - Provide information, not legal advice.`;

  const chat = ai.chats.create({
    model: "gemini-2.5-flash", // Using 2.5 Flash for reliable multimodal context retention
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 1000, 
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ]
    }
  });

  // Seed the chat with the document and a confirmation prompt
  await chat.sendMessage({
    message: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      },
      {
        text: `This is the document I need help with. Please briefly confirm you can see it and what type of document it is. Reply in ${langName}.`
      }
    ]
  });

  return chat;
};
