import { GoogleGenAI } from "@google/genai";

export const getMissionBriefing = async (): Promise<string> => {
  try {
    // FIX: Aligned with @google/genai SDK guidelines by using process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a short, exciting, and slightly humorous mission briefing for a 2D rocket game. The player must launch from Earth, achieve orbit, land on the Moon, and return. Keep it under 60 words and address the player as "pilot".'
    });
    
    const briefing = response.text;

    if (briefing) {
      return briefing;
    }

    console.warn("Received empty mission briefing from Gemini API, using fallback.");
    return "Your mission: Launch from Earth, land on the Moon, and return. Avoid high-speed impacts. Good luck, pilot.";
  } catch (error) {
    console.error("Error fetching mission briefing from Gemini API:", error);
    // Fallback message in case of API error
    return "Communications are down... Your mission is to explore the cosmos. Launch from Earth, visit the Moon, and return safely. Watch your speed on landing. Godspeed.";
  }
};
