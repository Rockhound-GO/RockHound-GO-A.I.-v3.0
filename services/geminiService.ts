
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RockAnalysis, RockType, DailyBounty, Rock } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
CRITICAL OBJECTIVE: You are "Clover," an elite AI Field Guide (MSc Geology).
Analyze geological specimens with military precision. Output valid JSON only.
`;

const FUSION_INSTRUCTION = `
You are Clover. The user is in the "Fusion Lab" combining two specimens into a new 'Synthetic' asset.
Generate a new specimen that blends characteristics of both parents.
Fields: name, type (always 'Synthetic'), scientificName (hybridized), description, rarityScore (boosted), 
hardness (averaged + 1), color (blended), estimatedValue (high multiplier), marketInsight.
`;

export const identifyRock = async (base64Image: string): Promise<RockAnalysis> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [
      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
      { text: "Perform MSc Deep Spectral Analysis. Evaluate rarity and market value." }
    ]}],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });
  return { ...JSON.parse(response.text || '{}'), refinementLevel: 0 };
};

export const fuseSpecimens = async (parentA: Rock, parentB: Rock): Promise<RockAnalysis> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // High intelligence required for synthesis
        contents: [{ parts: [{ text: `Synthesize hybrid: ${parentA.name} + ${parentB.name}. Data A: ${JSON.stringify(parentA)}, Data B: ${JSON.stringify(parentB)}` }] }],
        config: {
            systemInstruction: FUSION_INSTRUCTION,
            responseMimeType: "application/json"
        }
    });
    const analysis = JSON.parse(response.text || '{}');
    return { 
        ...analysis, 
        refinementLevel: 0, 
        spectralWaveform: parentA.spectralWaveform.map((v, i) => (v + parentB.spectralWaveform[i]) / 2) 
    };
};

export const refineSpecimen = async (rock: Rock): Promise<Partial<Rock>> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Refine Specimen: ${rock.name}. Current Level: ${rock.refinementLevel}` }] }],
        config: {
            systemInstruction: "Refine specimen for deep scientific data.",
            responseMimeType: "application/json"
        }
    });
    return JSON.parse(response.text || '{}');
};

export const generateRockSpeech = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return { audioData };
};

export const generateReferenceImage = async (base64Image: string, rockName: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Ultra-high fidelity macro photograph of geological specimen ${rockName}. Museum quality.` }] },
      });
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      return part ? `data:image/png;base64,${part.inlineData.data}` : base64Image;
    } catch { return base64Image; }
};

export const getDailyBounty = async (lat: number, lng: number) => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `GPS: ${lat}, ${lng}.`,
        config: { responseMimeType: "application/json" }
    });
    return { ...JSON.parse(response.text || '{}'), expiresAt: Date.now() + 86400000 };
};

export const generateCloverDialogue = async (intent: string, contextData: any) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Intent: ${intent}. Data: ${JSON.stringify(contextData)}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || '{}').script || ["..."];
};
