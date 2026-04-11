import { GoogleGenAI, Modality } from "@google/genai";
import { NovelConcept, Chapter, WorldContext } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GENERATION_MODEL = 'gemini-3-pro-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// --- Text Generation ---

export const generateConcept = async (userInstructions: string = ""): Promise<NovelConcept> => {
  const prompt = `
    You are a world-class novelist and creative writing coach collaborating with a user to develop an original novel concept.
    The genre, tone, and audience should follow the user's instructions; otherwise propose something broadly compelling and market-ready.
    Focus on a clear hook, rich character potential, and a story engine that can sustain a full-length novel.
    
    ${userInstructions ? `User Instructions: ${userInstructions}` : ''}

    Output a JSON object with the following keys: title, premise, style, theme.
    Do not include markdown code blocks. Just the raw JSON.
  `;

  const response = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
};

export const generateOutline = async (concept: NovelConcept, numChapters: number = 20, userInstructions: string = ""): Promise<Chapter[]> => {
  const prompt = `
    Create a chapter outline for a novel titled "${concept.title}".
    Premise: ${concept.premise}
    Style: ${concept.style}
    Theme: ${concept.theme}
    
    There should be approximately ${numChapters} chapters.
    Ensure strong narrative escalation, meaningful turning points, and steady character development.
    Include a clear inciting incident, midpoint shift, climax, and resolution, with each chapter advancing plot and/or character.
    
    ${userInstructions ? `User Instructions: ${userInstructions}` : ''}

    Output a JSON array of objects, where each object has: "number" (integer), "title" (string), and "summary" (string).
    Do not include markdown code blocks.
  `;

  const response = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const rawChapters = JSON.parse(response.text || "[]");
  return rawChapters.map((ch: any) => ({ ...ch, id: crypto.randomUUID(), content: "" }));
};

export const generateChapterContent = async (
  chapter: Chapter,
  concept: NovelConcept,
  outline: Chapter[],
  worldContext: WorldContext,
  previousChapterContent: string | null,
  userInstructions: string = ""
): Promise<string> => {
  
  const contextString = `
    Characters: ${worldContext.characters.map(c => `${c.name}: ${c.bio}`).join('; ')}
    Locations: ${worldContext.locations.map(l => `${l.name}: ${l.description}`).join('; ')}
  `;

  const outlineContext = outline.map(c => `Chapter ${c.number}: ${c.title} - ${c.summary}`).join('\n');

  const prompt = `
    Write the full content for Chapter ${chapter.number}: "${chapter.title}".
    
    Novel Title: ${concept.title}
    Overall Premise: ${concept.premise}
    Style: ${concept.style}
    
    Current Chapter Summary: ${chapter.summary}
    
    World Context (Use these references):
    ${contextString}
    
    Full Outline Context:
    ${outlineContext}
    
    ${previousChapterContent ? `The previous chapter ended with: ...${previousChapterContent.slice(-500)}` : "This is the first chapter."}
    
    ${userInstructions ? `IMPORTANT User Instructions: ${userInstructions}` : ''}
    
    Write the chapter prose. Maintain continuity, voice, and pacing; show rather than tell; and balance dialogue, action, and interiority.
    Keep the chapter purposeful, with clear scene goals and a compelling ending (unless it is the final chapter).
  `;

  const response = await ai.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
  });

  return response.text || "";
};

// --- Text to Speech ---

export const generateSpeechRaw = async (text: string): Promise<Uint8Array | null> => {
  if (!text.trim()) return null;

  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return decode(base64Audio);
    }
  } catch (e) {
    console.error("Gemini TTS API Error:", e);
  }
  return null;
};

export const streamTTS = async (text: string, onAudioChunk: (buffer: AudioBuffer) => void) => {
  const audioBytes = await generateSpeechRaw(text);
  if (audioBytes) {
     const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
     const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
     onAudioChunk(audioBuffer);
  }
};

// Helper for TTS
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
