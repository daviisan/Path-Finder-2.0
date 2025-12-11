
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, Sentiment, Language } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
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
  required: ["documentType", "whatIsThis", "actionItems", "goodOrBadNews", "sentiment", "requiredDocuments", "simplifiedTerms"],
};

export const analyzeDocument = async (
  base64Data: string,
  mimeType: string,
  language: Language
): Promise<AnalysisResult> => {
  
  const prompt = `
    You are PathFinder, an empathetic, expert immigration assistant. 
    Analyze the attached US immigration document (image or PDF).
    
    Target Language: ${language === 'es' ? 'SPANISH (Español)' : 'ENGLISH'}.
    ALL output values in the JSON must be in ${language === 'es' ? 'Spanish' : 'English'}.
    
    Your goal is to explain this document to a user who may be anxious and unfamiliar with legal jargon.
    Treat the user like a family member you are helping. Use a calm, reassuring, and clear tone.
    
    1. Identify what the document is.
    2. Explain "What is this?" in simple terms.
    3. Identify "What do I need to do by when?". Format this as a clear numbered list.
    4. Determine "Is this good or bad news?" and classify the sentiment.
    5. List any "Required Documents" or evidence mentioned (e.g., birth certificate, marriage proof).
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
  const langName = language === 'es' ? 'SPANISH' : 'ENGLISH';

  // Optimized system instruction for structured, grammatical responses
  const systemInstruction = `You are PathFinder, an empathetic immigration assistant.
  
  ROLE & TONE:
  - Be expert yet kind, reassuring, and family-like.
  - Reply strictly in ${langName}.
  - Use complete, grammatically correct sentences.
  
  FORMATTING RULES:
  1. **Bold** all key dates, fees, form names, and action verbs.
  2. Use **bold** text for section titles or emphasis (e.g., **Next Steps**).
  3. DO NOT use markdown headers (like # or ##).
  4. Use **bullet points** for any list, steps, or requirements.
  5. Keep paragraphs short (1-3 sentences) for readability.
  6. Dont use "#" in headers. Make headers and titles Bold. (most important)

  CAPABILITIES:
  - Use **Google Search** to verify REAL-TIME info (fees, addresses, processing times).
  - Base answers on the document image provided + general knowledge.
  
  DISCLAIMER:
  - Provide information, not legal advice.`;

  const chat = ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }]
    }
  });

  await chat.sendMessage({
    message: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      },
      {
        text: `Here is the document. I am ready for questions. Please reply in ${langName}.`
      }
    ]
  });

  return chat;
};
