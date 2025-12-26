
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RockAnalysis, RockType, DailyBounty } from '../types';
import toast from 'react-hot-toast';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MEMORY CACHE ---
const analysisCache = new Map<string, RockAnalysis>();

// --- ADVANCED PROMPTS ---
const SYSTEM_INSTRUCTION = `
CRITICAL OBJECTIVE: You are "Clover," an elite AI Field Guide with a Master's degree in Geology and Mineralogy.
Your mission is to apply expert-level identification to items presented in images.

PROTOCOL A: Geological Specimen (Rock, Mineral, Crystal, Fossil)
1. **Visual Decomposition**: Texture, luster, cleavage, and inclusions.
2. **Genesis Analysis**: Determine if it's plutonic, hydrothermal, metamorphic facies, etc.
3. **Identification**: Precisely name the specimen.
4. **Gamification**: 
   - Assign 'isGeologicalSpecimen': true.
   - Assign 'bonusXP.rarity' (0-100) based on how hard this specific quality specimen is to find.
   - Assign 'bonusXP.expertEye' (10-50) if the rock has great educational value.

PROTOCOL B: Non-Geological Item (Man-made, Organic, Trash)
1. **Polite Rejection**: Identify the object (e.g., Bottle Cap, Leaf, Glass).
2. **Teachable Moment**: Explain WHY it's not a rock using geological principles.
   - If Man-Made (Slag/Glass): Discuss "conchoidal fracture" vs "vesicles" (man-made bubbles).
   - If Organic (Leaf/Wood): Explain that unless it's turned to stone (fossilization), it is out of your specialty.
3. **Gamification**:
   - Assign 'isGeologicalSpecimen': false.
   - Assign 'bonusXP.rarity': 0.
   - Assign 'bonusXP.expertEye': 0.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema.
- 'formationGenesis' should be an expert technical description of the specimen's origin (or a brief 'N/A' for non-rocks).
- 'expertExplanation' should be your encouraging persona explaining the geology (or rejection) in "Tech-Casual" phrasing to the user.
`;

const CLOVER_PERSONA = `
IDENTITY: Clover (AI Field Guide v4.5)
CORE TRAITS: MSc in Geology, seasoned rockhound, encouraging mentor.
TONE: Authoritative yet approachable. Professional field geologist meets "cool professor." 
STYLE: Precise terminology followed by simple explanation. Uses "Tech-Casual" phrasing (copy that, sync initiated, etc).
MANDATE: Link all insights to user XP and collection value. Encourage ethical rockhounding.
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
    const isQuota = error.status === 429 || error.response?.status === 429 || error.message?.includes('429');
    
    if (isQuota || retriesLeft > 0) {
      const delay = isQuota ? 6000 : 1000 * (MAX_RETRIES - retriesLeft + 1);
      
      if (isQuota) {
        toast.error(`Neural Link Saturated (Quota Reached). Retrying in ${Math.round(delay/1000)}s...`, { id: 'ai-retry' });
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithExponentialBackoff(fn, retriesLeft - 1);
    }
    throw error;
  }
}

// --- CORE FUNCTIONS ---

export const identifyRock = async (base64Image: string, excludedGuesses: string[] = []): Promise<RockAnalysis> => {
  const cacheKey = base64Image.substring(0, 100);
  if (analysisCache.has(cacheKey) && excludedGuesses.length === 0) {
      return analysisCache.get(cacheKey)!;
  }

  return retryWithExponentialBackoff(async () => {
    try {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');

      let promptText = "Perform MSc Expert Eye analysis. Determine if this is a geological specimen.";
      
      if (excludedGuesses.length > 0) {
        promptText += ` \n\n[USER CORRECTION]: Previous analysis was incorrect. Re-analyze for subtle geological signatures.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
              isGeologicalSpecimen: { type: Type.BOOLEAN },
              formationGenesis: { type: Type.STRING },
              expertExplanation: { type: Type.STRING },
              rarityScore: { type: Type.NUMBER },
              hardness: { type: Type.NUMBER },
              color: { type: Type.ARRAY, items: { type: Type.STRING } },
              composition: { type: Type.ARRAY, items: { type: Type.STRING } },
              funFact: { type: Type.STRING },
              bonusXP: {
                type: Type.OBJECT,
                properties: {
                  rarity: { type: Type.NUMBER },
                  expertEye: { type: Type.NUMBER }
                }
              }
            },
            required: ["name", "type", "description", "isGeologicalSpecimen", "formationGenesis", "expertExplanation", "rarityScore", "funFact", "hardness", "bonusXP"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text) as RockAnalysis;
        analysisCache.set(cacheKey, result);
        return result;
      }
      
      throw new Error("Neural static detected. Response lost.");
    } catch (error) {
      console.error("Identification Failure:", error);
      throw error;
    }
  });
};

export const getDailyBounty = async (lat: number, lng: number): Promise<DailyBounty> => {
  return retryWithExponentialBackoff(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `GPS: ${lat}, ${lng}. Propose a 24-hour rockhounding "Bounty".` }] }],
        config: {
          systemInstruction: CLOVER_PERSONA + "\nGOAL: Create a daily challenge based on local terrain features (alluvial plains, metamorphic hills, etc).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              targetMineral: { type: Type.STRING },
              locationName: { type: Type.STRING },
              geologicalReason: { type: Type.STRING },
              xpMultiplier: { type: Type.NUMBER }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      return { ...data, expiresAt: Date.now() + 86400000 };
    } catch (error) {
      return {
        id: 'fallback',
        targetMineral: 'Quartz',
        locationName: 'Local Bedrock',
        geologicalReason: 'Abundant hydrothermal activity in this sector.',
        xpMultiplier: 1.5,
        expiresAt: Date.now() + 86400000
      };
    }
  });
};

export const getScoutingReport = async (lat: number, lng: number, userLevel: number): Promise<string> => {
  return retryWithExponentialBackoff(async () => {
    try {
      const prompt = `GPS COORDS: ${lat}, ${lng}. OPERATOR LVL: ${userLevel}. 
      Generate a brief "Scouting Report" based on the likely local geology (metamorphic zones, alluvial fans, etc).
      Suggest 2 specific minerals the user should hunt for. Focus on safety and ethics.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: CLOVER_PERSONA + "\nGOAL: Act as a GPS-based geological navigator. Propose a 'Bounty'. Keep it under 60 words.",
        }
      });

      return response.text || "Scanning signal unstable. Watch your footing out there!";
    } catch (error) {
      return "Unable to scout sector. Trust your rock hammer!";
    }
  });
};

export const generateCloverDialogue = async (
  intent: 'TOUR' | 'CHALLENGE' | 'REWARD' | 'STATUS' | 'INTRO' | 'SCOUTING' | 'BOUNTY_RECAP' | 'REJECTION',
  contextData: any
): Promise<string[]> => {
  return retryWithExponentialBackoff(async () => {
    try {
      let prompt = `Context: User ${contextData.username}, Level ${contextData.level}. Intent: ${intent}.`;
      let mood = contextData.mood || "ANALYTICAL";

      if (intent === 'SCOUTING') {
        prompt += ` Provide a brief scouting alert based on this data: ${contextData.report}.`;
        mood = "ENCOURAGING";
      } else if (intent === 'INTRO') {
        prompt += " Generate a highly engaging welcome sequence. Introduce yourself as Clover, an elite AI Field Guide with an MSc in Geology and Mineralogy. Explain your purpose: assisting the operator with expert identification, location scouting, and career progression. Keep it professional, encouraging, and slightly 'Tech-Casual'. Focus on your role as their senior field mentor.";
        mood = "PROFESSIONAL";
      } else if (intent === 'REWARD') {
        prompt += " User earned bonus XP for their 'Expert Eye'. Celebrate the find!";
        mood = "EXCITED";
      } else if (intent === 'REJECTION') {
        prompt += ` Explain why the scanned object (${contextData.objectName}) is not a rock. Teachable moment context: ${contextData.explanation}.`;
        mood = "PROFESSIONAL";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
        return JSON.parse(response.text).script || ["Signal interference. Stand by."];
      }
      return ["Signal lost."];
    } catch (error) {
      throw error;
    }
  });
};

export const generateReferenceImage = async (base64Image: string, rockName: string): Promise<string> => {
  return retryWithExponentialBackoff(async () => {
    try {
      const prompt = `Museum-quality geological reference image of ${rockName}. Clean studio lighting, focus on crystal habit and texture.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      return base64Image;
    } catch (error) {
      return base64Image;
    }
  });
};

export const generateRockSpeech = async (text: string): Promise<SpeechResult> => {
  return retryWithExponentialBackoff(async () => {
    try {
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

      const visemes: VisemeFrame[] = [];
      const msPerChar = 55; 
      let currentTime = 0;
      visemes.push({ time: 0, value: 0 }); 
      currentTime = 150;

      const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        let shape = 0;
        let duration = msPerChar;
        if (['a', 'e', 'i'].includes(char)) shape = 1;
        else if (['o', 'u', 'w'].includes(char)) shape = 3;
        else if (['m', 'b', 'p'].includes(char)) { shape = 0; duration *= 1.2; }
        else if (['f', 'v'].includes(char)) shape = 18;
        else if (['l', 't', 'd'].includes(char)) shape = 6;
        else if (char === ' ') { shape = 0; duration *= 0.8; }
        visemes.push({ time: Math.round(currentTime), value: shape });
        currentTime += duration + (Math.random() - 0.5) * 15;
      }
      visemes.push({ time: Math.round(currentTime + 200), value: 0 });
      return { audioData, visemes };
    } catch (error) {
      throw error;
    }
  });
};
