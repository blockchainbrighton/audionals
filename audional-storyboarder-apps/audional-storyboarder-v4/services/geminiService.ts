import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryPage, BookletData } from "../types";

// Initialize the client
// API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textModelName = "gemini-2.5-flash";
const imageModelName = "gemini-2.5-flash-image";

const storyPageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    pageNumber: { type: Type.INTEGER, description: "The sequential page number, starting at 1." },
    title: { type: Type.STRING, description: "A catchy title for this page of the booklet." },
    visualDescription: { type: Type.STRING, description: "A vivid description of the illustration or graphic for this page. Should be exciting and futuristic." },
    content: { type: Type.STRING, description: "The main body text for the page. Explain the concept simply but excitedly." },
    keyTakeaway: { type: Type.STRING, description: "A short, punchy summary sentence for the bottom of the page." }
  },
  required: ["pageNumber", "title", "visualDescription", "content", "keyTakeaway"]
};

const bookletSchema: Schema = {
  type: Type.ARRAY,
  items: storyPageSchema,
  description: "A list of pages for the informational booklet."
};

// Helper for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateAudionalBooklet = async (musicianType: string, vibe: string): Promise<BookletData> => {
  const prompt = `
    You are an expert creative director and blockchain music historian. 
    Your task is to create a storyboard for a 6-page informational booklet about "Audionals" (Music on the Bitcoin Blockchain).
    
    The target audience is: ${musicianType}.
    The desired vibe/tone is: ${vibe}.

    Research Context:
    - Audionals allow storing audio data directly on the Bitcoin blockchain using Ordinals theory.
    - Unlike NFTs on other chains which often point to IPFS or AWS URLs (which can rot), Audionals are fully on-chain.
    - It's like "Digital Vinyl" - permanent, immutable, and scarce.
    - Benefits: 100% ownership, uncensorable, direct fan connection, historical preservation.
    
    Booklet Structure:
    Page 1: Cover Page (Hook).
    Page 2: The Status Quo (The problem with streaming/renting music).
    Page 3: Introducing Audionals (The "Aha!" moment).
    Page 4: How it Works (Simple technical explanation: Encoding -> Inscribing).
    Page 5: The Future/Benefits (Legacy, Remixing, Rights).
    Page 6: Call to Action (Start your on-chain discography).

    Make the content exciting for musicians who might be skeptical of crypto. Focus on the *music* and *preservation*, not financial speculation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: textModelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: bookletSchema,
        systemInstruction: "You are a world-class music tech educator. Be concise, inspiring, and visually evocative.",
        temperature: 0.7,
      },
    });

    const pages = JSON.parse(response.text || "[]") as StoryPage[];
    
    return {
      targetAudience: musicianType,
      tone: vibe,
      pages: pages
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate booklet. Please check your API key and try again.");
  }
};

export const generateBookletIllustration = async (description: string, vibe: string, retryCount = 0): Promise<string | null> => {
  try {
    const prompt = `Create a high-quality, artistic album-art style illustration. 
    Style: ${vibe}. 
    Subject: ${description}.
    Do not include any text, words, or letters in the image. Purely visual art.`;

    const response = await ai.models.generateContent({
      model: imageModelName,
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    // Iterate through parts to find the inlineData (image)
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
        }
      }
    }
    
    return null;
  } catch (error: any) {
    // Handle Rate Limiting (429)
    if (error.toString().includes('429') || error.status === 429 || error.response?.status === 429) {
        if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 10000; // Wait 10s, 20s, 30s
            console.warn(`Quota exceeded. Retrying in ${waitTime/1000}s...`);
            await sleep(waitTime);
            return generateBookletIllustration(description, vibe, retryCount + 1);
        }
    }

    console.error("Image Generation Error:", error);
    return null;
  }
};