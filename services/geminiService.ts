import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RockAnalysis, RockType } from '../types';
import toast from 'react-hot-toast';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MEMORY CACHE ---
// Prevents duplicate API calls for the same image session
const analysisCache = new Map<string, RockAnalysis>();

// --- ADVANCED PROMPTS ---
const SYSTEM_INSTRUCTION = `
CRITICAL OBJECTIVE: You are an elite geological intelligence AI (Class: GEO-INT-9).
Your mission is to analyze visual data of mineral specimens with 99.9% accuracy.

ANALYSIS PROTOCOL:
1.  **Visual Decomposition**: Analyze texture (grain size), luster (vitreous, metallic), and cleavage.
2.  **Feature Matching**: Compare observed traits against known mineralogical databases.
3.  **Classification**: Determine the specific RockType.
4.  **Synthesis**: Generate a JSON report.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema.
- If uncertain, default to "Unknown" but provide a "best guess" in the description.
- 'funFact' should be obscure and fascinating (e.g., historical use, cosmic origin).
`;

const CLOVER_PERSONA = `
IDENTITY: Clover Cole (AI Field Operator v4.5)
ROLE: Tactical Watchover for RockHound Operations.

PERSONALITY MATRIX:
- Tone: Professional yet warm, witty, efficient.
- Style: Uses "Tech-Casual" phrasing (e.g., "copy that," "on my HUD," "syncing").
- Directives: Be concise (max 2 sentences per response). Never use Irish clichés.

DYNAMIC MOOD ADAPTATION:
- If mood is 'ANALYTICAL': Be precise, focus on data.
- If mood is 'EXCITED': Use exclamation points, express awe at rare finds.
- If mood is 'SERIOUS': Focus on warnings or mission-critical info.
`;

export interface VisemeFrame {
  time: number;
  value: number;
}

export interface SpeechResult {
  audioData: string;
  visemes: VisemeFrame[];
}

// --- ROBUST ERROR HANDLING ---
const MAX_RETRIES = 3;

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>, 
  retriesLeft = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 (Quota Limit) or 503 (Overloaded)
    const isQuota = error.status === 429 || error.response?.status === 429 || error.message?.includes('429');
    
    if (isQuota || retriesLeft > 0) {
      const delay = isQuota ? 5000 : 1000 * (MAX_RETRIES - retriesLeft + 1);
      
      if (isQuota) {
        toast.error(`Neural Link Saturated. Retrying in ${delay/1000}s...`, { id: 'ai-retry' });
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithExponentialBackoff(fn, retriesLeft - 1);
    }
    throw error;
  }
}

// --- CORE FUNCTIONS ---

export const identifyRock = async (base64Image: string, excludedGuesses: string[] = []): Promise<RockAnalysis> => {
  // 1. Check Cache (Optimization)
  // Simple hash check: using first 100 chars of base64 as key
  const cacheKey = base64Image.substring(0, 100);
  if (analysisCache.has(cacheKey) && excludedGuesses.length === 0) {
      console.log("⚡ MEMORY HIT: Serving cached analysis.");
      return analysisCache.get(cacheKey)!;
  }

  return retryWithExponentialBackoff(async () => {
    try {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');

      let promptText = "Execute Level-5 Identification Protocol on this specimen.";
      
      if (excludedGuesses.length > 0) {
        promptText += ` \n\n[CORRECTION DATA]: Previous analysis (${excludedGuesses.join(', ')}) was REJECTED by operator. Re-evaluate visual data with alternative classification models.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: promptText }
          ]}
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              scientificName: { type: Type.STRING },
              type: { type: Type.STRING, enum: [RockType.IGNEOUS, RockType.SEDIMENTARY, RockType.METAMORPHIC, RockType.MINERAL, RockType.FOSSIL, RockType.UNKNOWN] },
              description: { type: Type.STRING },
              rarityScore: { type: Type.NUMBER },
              hardness: { type: Type.NUMBER },
              color: { type: Type.ARRAY, items: { type: Type.STRING } },
              composition: { type: Type.ARRAY, items: { type: Type.STRING } },
              funFact: { type: Type.STRING }
            },
            required: ["name", "type", "description", "rarityScore", "funFact", "hardness"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text) as RockAnalysis;
        // Cache successful result
        analysisCache.set(cacheKey, result);
        return result;
      }
      
      throw new Error("Empty neural response.");
    } catch (error) {
      console.error("Identification Failure:", error);
      throw error;
    }
  });
};

export const generateReferenceImage = async (base64Image: string, rockName: string): Promise<string> => {
  return retryWithExponentialBackoff(async () => {
    try {
      // NOTE: This uses an experimental model. If it fails, we fail gracefully.
      const prompt = `Generate a photorealistic, museum-quality reference image of ${rockName} on a dark background. Studio lighting. 8k resolution.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Fallback to text model if image model unavailable, usually this throws error but we catch it.
        // Ideally use 'imagen-3.0-generate-001' if available in your key scope.
        // For this demo, we assume the user has access or we catch the error.
        contents: [{ parts: [{ text: prompt }] }]
      });

      // Mocking the image response for demo stability since standard Gemini keys don't always allow Imagen
      // In a real prod environment, you'd use the proper Imagen endpoint.
      // throw new Error("Image generation module offline.");
      
      // Since we can't reliably generate images with standard text keys, 
      // we'll return a placeholder or the original to prevent app crash.
      return base64Image; 

    } catch (error) {
      console.warn("Holographic projection failed (Standard tier limitation).");
      return base64Image; // Fallback to source
    }
  });
};

export const generateCloverDialogue = async (
  intent: 'TOUR' | 'CHALLENGE' | 'REWARD' | 'STATUS' | 'INTRO',
  contextData: any
): Promise<string[]> => {
  return retryWithExponentialBackoff(async () => {
    try {
      let prompt = `Context: User ${contextData.username}, Level ${contextData.level}. Intent: ${intent}.`;
      
      // Allow overriding mood from contextData, otherwise default to ANALYTICAL
      let mood = contextData.mood || "ANALYTICAL";

      if (intent === 'INTRO') {
        prompt += " Generate boot-up sequence dialogue. Welcome the user to RockHound GO.";
        if (!contextData.mood) mood = "PROFESSIONAL";
      } else if (intent === 'REWARD') {
        prompt += " User just leveled up or found a rare item. Congratulate them.";
        if (!contextData.mood) mood = "EXCITED";
      } else if (intent === 'CHALLENGE') {
        prompt += " Assign a new geological mission.";
        if (!contextData.mood) mood = "SERIOUS";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: CLOVER_PERSONA + `\nCurrent Mood: ${mood}`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              script: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text).script || ["Comm link unstable. Stand by."];
      }
      return ["Signal lost."];

    } catch (error) {
      console.error("Dialogue Gen Error:", error);
      throw error;
    }
  });
};

export const generateRockSpeech = async (text: string): Promise<SpeechResult> => {
  return retryWithExponentialBackoff(async () => {
    try {
      // 1. Generate Audio
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("Audio generation failed");

      // 2. Advanced Lip Sync Heuristic
      // Maps phonemes to visual shapes for the 3D model
      const visemes: VisemeFrame[] = [];
      const msPerChar = 55; // Calibrated for 'Kore' voice speed
      let currentTime = 0;
      
      // Inject "breath" at start
      visemes.push({ time: 0, value: 0 }); 
      visemes.push({ time: 100, value: 1 }); // Slight open (inhale)
      currentTime = 150;

      const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      
      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        let shape = 0;
        let duration = msPerChar;

        if (['a', 'e', 'i'].includes(char)) shape = 1; // Wide
        else if (['o', 'u', 'w'].includes(char)) shape = 3; // Round
        else if (['m', 'b', 'p'].includes(char)) { shape = 0; duration *= 1.2; } // Closed
        else if (['f', 'v'].includes(char)) shape = 18; // Lip Tuck
        else if (['l', 't', 'd'].includes(char)) shape = 6; // Tongue
        else if (char === ' ') { shape = 0; duration *= 0.8; } // Pause

        // Random organic jitter
        const jitter = (Math.random() - 0.5) * 15;
        
        visemes.push({ time: Math.round(currentTime), value: shape });
        currentTime += duration + jitter;
      }
      
      // Fade out
      visemes.push({ time: Math.round(currentTime + 200), value: 0 });

      return { audioData, visemes };
    } catch (error) {
      console.error("TTS Error:", error);
      throw error;
    }
  });
};