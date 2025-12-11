import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Audio utilities
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const createPcmBlob = (data: Float32Array): { data: string; mimeType: string } => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  // Custom manual encoding to avoid external library dependency
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
};

export const decodeAudioData = async (
  base64: string,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length; 
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

// Live Session Manager
export class LiveSession {
  private nextStartTime = 0;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: ScriptProcessorNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private session: any = null;
  private stream: MediaStream | null = null;
  private isConnecting = false;

  constructor(
    private onConnect: () => void,
    private onDisconnect: () => void,
    private onError: (e: any) => void,
    private onTranscript: (text: string, role: 'user' | 'model') => void
  ) {}

  async connect(systemInstruction: string) {
    if (this.isConnecting || this.session) {
        console.warn("Already connected or connecting");
        return;
    }

    if (!process.env.API_KEY) {
        this.onError(new Error("API Key not found"));
        return;
    }

    this.isConnecting = true;

    // Initialize AI client here to ensure env vars are ready
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Resume audio contexts if suspended (browser policy)
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session connected');
            this.isConnecting = false;
            this.onConnect();
            this.startAudioInput(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Audio Output Handling
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
                this.playAudioChunk(base64Audio);
            }
            
            // 2. Transcription Handling
            if (message.serverContent?.outputTranscription?.text) {
                this.onTranscript(message.serverContent.outputTranscription.text, 'model');
            }
            if (message.serverContent?.inputTranscription?.text) {
                this.onTranscript(message.serverContent.inputTranscription.text, 'user');
            }

            // 3. Interruption Handling
            if (message.serverContent?.interrupted) {
                this.stopAudioPlayback();
            }
          },
          onclose: () => {
            console.log('Live session closed');
            this.isConnecting = false;
            this.onDisconnect();
          },
          onerror: (err) => {
            console.error('Live session error', err);
            this.isConnecting = false;
            this.onError(err);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
      
      this.session = sessionPromise;

    } catch (err) {
      console.error("Connection failed", err);
      this.isConnecting = false;
      this.onError(err);
    }
  }

  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    // 4096 buffer size is standard for script processor to balance latency and overhead
    this.inputNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.inputNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then(session => {
         session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.inputNode);
    this.inputNode.connect(this.inputAudioContext.destination);
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) return;

    // Sync start time
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

    try {
        const audioBuffer = await decodeAudioData(base64Audio, this.outputAudioContext);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
    } catch (e) {
        console.error("Error decoding audio", e);
    }
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => source.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    this.isConnecting = false;
    
    if (this.session) {
      try {
        const s = await this.session;
        if (s && typeof s.close === 'function') {
            s.close();
        }
      } catch (e) {
        console.error("Error closing session", e);
      }
    }

    if (this.inputNode) {
        this.inputNode.disconnect();
        this.inputNode.onaudioprocess = null;
        this.inputNode = null;
    }
    
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }

    if (this.inputAudioContext) {
        await this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        await this.outputAudioContext.close();
        this.outputAudioContext = null;
    }

    this.onDisconnect();
  }
}