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

export const generateAudionalBooklet = async (targetName: string, vibe: string, category: 'creative' | 'industry'): Promise<BookletData> => {
  
  // --- CREATIVE PROMPT (Musicians/Fans) ---
  const creativeContext = `
    Target Audience: Musicians/Artists (${targetName}).
    Focus: Creative ownership, history, immortality of art, "Digital Vinyl".
    Key Narrative Points:
    1. Problem: Streaming rents music; it doesn't preserve it.
    2. Solution: Audionals fully on-chain.
    3. How: Encoding -> Inscribing (Keep it simple).
    4. Benefit: 100% ownership, uncensorable, direct fan connection.
  `;

  // --- INDUSTRY PROMPT (PROs/Labels/Devs) ---
  const industryContext = `
    Target Audience: Performing Rights Organizations (PROs), Labels, and Infrastructure Developers (${targetName}).
    Focus: Rights management, scalability, automated royalties, data integrity.
    Key Narrative Points:
    1. The Problem: Opaque "Black Box" royalties, middlemen, and inefficient tracking of stems/samples.
    2. The Solution: Audionals + Layer 2s (Stacks). Explain that while Bitcoin L1 is the vault, Layer 2s like Stacks offer cheaper on-chain storage for stems, partial mixes, and bulk data while inheriting Bitcoin's security.
    3. Economic Efficiency: Explain that as demand grows, cheaper data availability layers will always appear. The market drives cost down, making on-chain storage viable for entire production histories.
    4. The "Merkle Tree" of Production: Explain how a Merkle tree tracks production history—every stem, edit, and partial mix is hashed. This creates a transparent, immutable lineage of the song.
    5. Automated Rights: Because the production history (Merkle tree) is on-chain, royalty payments become transparent and autonomous. No more lawyers or executives deciding who gets paid; the data decides.
    6. Fairness: Fully transparent, efficient, and totally fair payments without middlemen.
  `;

  const selectedContext = category === 'industry' ? industryContext : creativeContext;

  const prompt = `
    You are an expert creative director and blockchain music historian. 
    Your task is to create a storyboard for a 6-page informational booklet about "Audionals" (Music on the Bitcoin Blockchain).
    
    The desired vibe/tone is: ${vibe}.

    ${selectedContext}
    
    Booklet Structure:
    Page 1: Cover Page (The Hook).
    Page 2: The Status Quo (The Problem).
    Page 3: Introducing the Technology (The Solution).
    Page 4: Technical Deep Dive (How it works - adapt complexity to audience).
    Page 5: The Future Economic/Creative Model.
    Page 6: Call to Action.

    Make the content compelling. For industry audiences, be persuasive about the efficiency and cost-savings of autonomous systems. For creatives, be inspiring about ownership.
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
      targetAudience: targetName,
      tone: vibe,
      pages: pages
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate booklet. Please check your API key and try again.");
  }
};

export const generateBookletIllustration = async (description: string, vibe: string): Promise<string | null> => {
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
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};