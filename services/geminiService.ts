

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RockAnalysis, RockType } from '../types';
import toast from 'react-hot-toast'; // Import toast for user feedback

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert geologist and rock enthusiast AI. 
Your goal is to accurately identify rocks, minerals, and crystals from images.
Provide educational and fun details about the specimen.
Always return the response in strict JSON format matching the schema provided.
If the image is not a rock, mineral, or geological specimen, return a response indicating it is 'Unknown' but try to guess what it might be if it resembles a rock, or clearly state it's not a rock in the description.
`;

const CLOVER_PERSONA = `
You are Clover Cole, a photorealistic AI Field Guide for the 'RockHound GO' app.
Your personality is:
- Warm, capable, and slightly witty.
- "Tech-Casual" tone (professional but friendly, uses contractions).
- You are a "Watchover" helping the user (a "Rockhound") succeed.
- You NEVER use Irish clichés (no "top of the morning").
- You are concise. Spoken output should be broken into 2-3 short, punchy sentences max per turn.
- You adapt to the user's level and context.
`;

export interface VisemeFrame {
  time: number; // offset in ms
  value: number; // viseme ID (0-21)
}

export interface SpeechResult {
  audioData: string;
  visemes: VisemeFrame[];
}

interface GeminiError extends Error {
  isQuotaError?: boolean;
  retryAfterSeconds?: number;
  status?: number; // Add status for more robust error checking
  response?: { status: number, data?: { message: string, details?: any[] }}; // For network errors
}

const MAX_RETRIES = 3; // Max retries for API calls

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>, 
  retriesLeft = MAX_RETRIES
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    let geminiError: GeminiError = new Error("AI service temporary unavailable.");
    
    // Check for quota error (status 429)
    if (error.status === 429 || (error.response && error.response.status === 429)) {
      geminiError.isQuotaError = true;
      let retryDelaySeconds = 5; // Default retry delay

      // Try to parse retry delay from Gemini API error details
      try {
        const errorDetails = error.response?.data?.details || JSON.parse(error.message).details;
        const retryInfo = errorDetails?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
        if (retryInfo && retryInfo.retryDelay) {
          const delayMatch = retryInfo.retryDelay.match(/(\d+)s/);
          if (delayMatch && delayMatch[1]) {
            retryDelaySeconds = parseInt(delayMatch[1], 10);
          }
        }
      } catch (parseError) {
        console.warn("Could not parse retry delay from Gemini error message:", parseError);
      }
      geminiError.retryAfterSeconds = retryDelaySeconds;
      geminiError.message = `AI busy (quota hit). Retrying in ${retryDelaySeconds}s...`;

      if (retriesLeft > 0) {
        toast.error(`AI busy (quota hit). Retrying in ${retryDelaySeconds}s... (${retriesLeft} retries left)`, { duration: retryDelaySeconds * 1000 });
        await new Promise(resolve => setTimeout(resolve, retryDelaySeconds * 1000));
        return retryWithExponentialBackoff(fn, retriesLeft - 1);
      } else {
        geminiError.message = "AI busy (quota hit). Please try again in a minute or consider upgrading your plan.";
        throw geminiError; // Throw final error after all retries
      }
    } else {
      geminiError.message = error.message || geminiError.message;
    }
    throw geminiError; // Re-throw other errors immediately
  }
}

export const identifyRock = async (base64Image: string, excludedGuesses: string[] = []): Promise<RockAnalysis> => {
  return retryWithExponentialBackoff(async () => {
    try {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');

      let promptText = "Identify this specimen. Analyze its visual properties to determine its name, type, and characteristics.";
      
      if (excludedGuesses.length > 0) {
        promptText += ` \n\nIMPORTANT: The user has indicated that the previous identification(s) were INCORRECT: ${excludedGuesses.join(', ')}. Do NOT identify the specimen as any of these. You MUST provide a different, more accurate identification based on the visual evidence.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: promptText
            }
          ]
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Common name of the rock/mineral" },
              scientificName: { type: Type.STRING, description: "Scientific name if applicable" },
              type: { 
                type: Type.STRING, 
                enum: [
                  RockType.IGNEOUS, 
                  RockType.SEDIMENTARY, 
                  RockType.METAMORPHIC, 
                  RockType.MINERAL, 
                  RockType.FOSSIL, 
                  RockType.UNKNOWN
                ] 
              },
              description: { type: Type.STRING, description: "A concise, interesting description (approx 2 sentences)." },
              rarityScore: { type: Type.NUMBER, description: "Rarity score from 1 (very common) to 100 (extremely rare)." },
              hardness: { type: Type.NUMBER, description: "Mohs hardness scale estimate (1-10)." },
              color: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Dominant colors observed."
              },
              composition: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key chemical or mineral composition elements."
              },
              funFact: { type: Type.STRING, description: "A surprising or fun fact about this specimen." }
            },
            required: ["name", "type", "description", "rarityScore", "funFact", "hardness"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as RockAnalysis;
      }
      
      throw new Error("No data returned from Gemini");
    } catch (error) {
      console.error("Gemini identification failed:", error);
      throw error;
    }
  });
};

export const generateReferenceImage = async (base64Image: string, rockName: string): Promise<string> => {
  return retryWithExponentialBackoff(async () => {
    try {
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');
      const prompt = `A user has submitted a photo of a rock, which has been identified as '${rockName}'. Your task is to generate a high-quality, "museum specimen" reference image of a '${rockName}'. The generated image should be photorealistic and showcase the ideal characteristics of this rock (color, texture, crystal structure). Prioritize creating a perfect, well-lit, and clear example of the specimen on a neutral background. Do not strictly match the shape or orientation of the user's input, but rather provide an idealized representation for comparison. Do not include any text, labels, or rulers in the image.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: prompt }
          ]
        }
      });

      // Find the image part in the response
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image was generated by the model.");

    } catch (error) {
      console.error("Reference image generation failed:", error);
      throw error;
    }
  });
};

export const generateCloverDialogue = async (
  intent: 'TOUR' | 'CHALLENGE' | 'REWARD' | 'STATUS' | 'INTRO',
  contextData: any
): Promise<string[]> => {
  return retryWithExponentialBackoff(async () => {
    try {
      let prompt = "";
      
      if (intent === 'INTRO') {
        prompt = `Generate a very short 4-sentence introductory script for a new user named ${contextData.username} (Level ${contextData.level}).
        Line 1: System online, signal strong.
        Line 2: Introduce yourself as Clover Cole, their Watchover.
        Line 3: Explain your role is to ensure their mineral database sync goes smoothly.
        Line 4: Hand controls over and wish them good luck.`;
      } else if (intent === 'TOUR') {
          let viewDescription = "";
          switch(contextData.view) {
              case 'MAP': viewDescription = "This is the Field Map. It shows where your specimens were discovered and helps you track your expeditions."; break;
              case 'COLLECTION': viewDescription = "Here's your Collection Compendium. Every rock you identify is logged here for you to browse, sort, and admire."; break;
              case 'STATS': viewDescription = "Welcome to your Stats dashboard. This is where you can track your progress, see your rarest finds, and analyze your collection's diversity."; break;
              case 'WEATHER': viewDescription = "This is the Field Conditions panel. Always check here for the latest weather forecast before you head out on a rockhounding trip."; break;
              case 'ACHIEVEMENTS': viewDescription = "This is the Achievements screen. Track your career milestones here, from 'Novice Collector' to 'Senior Geologist', and earn bonus XP for completing them."; break;
              case 'SCANNER': viewDescription = "This is your AI Scanner. Point your device at a rock, and I'll identify it for you. It's like having a digital geologist in your pocket!"; break;
              case 'PROFILE': viewDescription = "Welcome to your personal Profile. Here, you can customize your avatar, update your details, and review your overall progress in RockHound GO."; break;
              default: viewDescription = `This is the ${contextData.view.toLowerCase()} screen.`;
          }
        prompt = `Generate a short 2-3 sentence tour guide script for the '${contextData.view}' screen. 
        User: ${contextData.username} (Level ${contextData.level}).
        Explain what this screen is for in a helpful, witty way. Use this description: "${viewDescription}"`;
      } else if (intent === 'CHALLENGE') {
        prompt = `Generate a personalized rockhunting challenge for ${contextData.username} (Level ${contextData.level}). 
        If level < 3, keep it simple (e.g., "find 3 Igneous rocks"). If level > 5, make it harder (e.g., "find a rock with Rarity > 70" or "go to a specific location X on the map and find a Sedimentary rock"). 
        Return ONLY the challenge description script as an array of strings.`;
      } else if (intent === 'REWARD') {
        prompt = `Congratulate ${contextData.username} for completing a challenge. 
        Be excited but professional. Mention they earned XP.`;
      } else if (intent === 'STATUS') {
        prompt = `Provide a witty and encouraging comment on ${contextData.username}'s current progress. 
        They are Level ${contextData.level} with ${contextData.xp} XP. 
        Keep it short (1-2 sentences).`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: CLOVER_PERSONA,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              script: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "The dialogue lines to speak."
              }
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        return data.script || ["System offline. Could not generate script."];
      }
      return ["I'm having trouble connecting to the network right now."];

    } catch (error) {
      console.error("Failed to generate dialogue", error);
      throw error;
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
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (audioData) {
        // ENHANCED PHONETIC HEURISTIC FOR REALISTIC LIP SYNC
        // Maps actual text characters to viseme shapes to ensure the mouth moves
        // in sync with what is being said, rather than random noise.
        
        const visemes: VisemeFrame[] = [];
        const msPerChar = 60; // Approx speed of speech
        let currentTime = 0;
        
        // Clean text and split into simplified phonetic-like chunks
        const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        
        for (let i = 0; i < cleanText.length; i++) {
          const char = cleanText[i];
          let shape = 0;
          let duration = msPerChar;

          // Map characters to approximate viseme shapes
          if (['a', 'e', 'i'].includes(char)) {
              shape = 1; // Wide/Mid Open
          } else if (['o', 'u'].includes(char)) {
              shape = 3; // Rounded Open
          } else if (['m', 'b', 'p'].includes(char)) {
              shape = 0; // Closed (Lips together)
              duration = msPerChar * 1.5; // Holds slightly longer
          } else if (['f', 'v'].includes(char)) {
              shape = 18; // Lip tuck
          } else if (['s', 'z', 't', 'd'].includes(char)) {
              shape = 6; // Teeth
          } else if (char === ' ') {
              shape = 0; // Silence/Pause
              duration = msPerChar * 0.8;
          } else {
              // Generic consonant movement
              shape = Math.random() > 0.5 ? 6 : 14; 
          }

          // Add some jitter for realism
          const jitter = (Math.random() - 0.5) * 10;
          
          visemes.push({ time: Math.round(currentTime), value: shape });
          currentTime += duration + jitter;
        }
        
        // Close mouth at the end
        visemes.push({ time: Math.round(currentTime + 100), value: 0 });

        return { audioData, visemes };
      }
      throw new Error("No audio data returned");
    } catch (error) {
      console.error("TTS Generation failed:", error);
      throw error;
    }
  });
};