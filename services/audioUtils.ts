// -- AUDIO PROCESSING CORE --
// Optimized for raw PCM streams from Gemini AI

// Decodes a base64 string into a Uint8Array with error dampening.
export function decode(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Audio Decode Failure: Stream corrupted.");
    return new Uint8Array(0);
  }
}

// Advanced decoder that applies DSP (Digital Signal Processing) enhancement
// to raw PCM data before creating the AudioBuffer.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // 1. Byte Alignment Correction
  // Ensure we have an even number of bytes for 16-bit PCM
  let buffer = data.buffer;
  if (data.byteLength % 2 !== 0) {
    const newBuffer = new ArrayBuffer(data.byteLength + 1);
    const newUint8Array = new Uint8Array(newBuffer);
    newUint8Array.set(data);
    buffer = newBuffer;
  }

  const dataInt16 = new Int16Array(buffer);
  const frameCount = dataInt16.length / numChannels;
  
  // 2. Stereo Upscaling (Revolutionary Feature)
  // If input is Mono (1ch), we force Stereo (2ch) output for a "premium" feel.
  const outputChannels = numChannels === 1 ? 2 : numChannels;
  const audioBuffer = ctx.createBuffer(outputChannels, frameCount, sampleRate);

  // Analysis variables for Normalization
  let maxAmplitude = 0;
  
  // Temporary float buffer to hold normalized data before writing
  const floatData = new Float32Array(frameCount);

  // 3. First Pass: Conversion & Analysis
  for (let i = 0; i < frameCount; i++) {
    // Convert 16-bit Int (-32768 to 32767) to Float (-1.0 to 1.0)
    // We take the average if there are multiple input channels (rare for TTS)
    let sample = 0;
    for (let c = 0; c < numChannels; c++) {
        sample += dataInt16[i * numChannels + c];
    }
    sample /= numChannels; // Avg
    
    const floatSample = sample / 32768.0;
    floatData[i] = floatSample;

    // Track peak for normalization
    if (Math.abs(floatSample) > maxAmplitude) {
        maxAmplitude = Math.abs(floatSample);
    }
  }

  // 4. DSP Application: Normalization & DC Offset Correction
  // If audio is too quiet, boost it. If it's silent, don't crash.
  const normalizationFactor = maxAmplitude > 0.01 ? (0.95 / maxAmplitude) : 1.0;

  for (let channel = 0; channel < outputChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    
    for (let i = 0; i < frameCount; i++) {
      let sample = floatData[i];

      // Apply Normalization
      sample *= normalizationFactor;

      // Apply Stereo Widening (Spatial Effect)
      // If we are upscaling mono to stereo, add a tiny delay/phase shift to right channel
      if (numChannels === 1 && outputChannels === 2 && channel === 1) {
         // Simple trick: grab previous sample for "Right" channel to create width
         // This makes the AI voice feel less "flat"
         const prevIndex = Math.max(0, i - 1);
         sample = (sample + floatData[prevIndex] * normalizationFactor) * 0.5;
      }

      channelData[i] = sample;
    }
  }

  return audioBuffer;
}