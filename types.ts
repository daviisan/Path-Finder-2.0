
export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  UNKNOWN = 'UNKNOWN'
}

export type Language = 'en' | 'es';

export interface SimplifiedTerm {
  term: string;
  definition: string;
}

export interface AnalysisResult {
  isImmigrationDocument: boolean;
  documentType: string;
  whatIsThis: string;
  actionItems: string;
  deadline?: string;
  goodOrBadNews: string;
  sentiment: Sentiment;
  requiredDocuments: string[];
  exampleOfRequirement?: string;
  simplifiedTerms: SimplifiedTerm[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  sources?: { title: string; uri: string }[];
  feedback?: 'up' | 'down';
}