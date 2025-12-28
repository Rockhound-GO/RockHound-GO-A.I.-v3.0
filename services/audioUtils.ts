
// -- GLOBAL AUDIO ARCHITECTURE --
// Prevents stacking by tracking all active sources in a central registry.

let globalAudioContext: AudioContext | null = null;
const activeSources = new Set<AudioScheduledSourceNode>();
let currentSpeechSource: AudioBufferSourceNode | null = null;

export function getGlobalAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioContext = new AudioContextClass({ sampleRate: 24000 });
    }
  }
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    globalAudioContext.resume().catch(() => {});
  }
  return globalAudioContext;
}

/**
 * Registers a source to be tracked. Automatically removes it when it ends.
 */
export function registerSource(source: AudioScheduledSourceNode) {
  activeSources.add(source);
  source.addEventListener('ended', () => {
    activeSources.delete(source);
  });
  return source;
}

/**
 * Stops all currently playing sounds tracked by the registry.
 */
export function stopAllSources() {
  activeSources.forEach(source => {
    try {
      source.stop();
      source.disconnect();
    } catch (e) {}
  });
  activeSources.clear();
  currentSpeechSource = null;
}

/**
 * Specifically manages Clover's speech channel to ensure only one voice is active.
 */
export function setSpeechSource(source: AudioBufferSourceNode | null) {
  if (currentSpeechSource) {
    try {
      currentSpeechSource.stop();
      currentSpeechSource.disconnect();
    } catch (e) {}
    activeSources.delete(currentSpeechSource);
  }
  if (source) {
    currentSpeechSource = source;
    registerSource(source);
  } else {
    currentSpeechSource = null;
  }
}

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
  let buffer = data.buffer;
  if (data.byteLength % 2 !== 0) {
    const newBuffer = new ArrayBuffer(data.byteLength + 1);
    const newUint8Array = new Uint8Array(newBuffer);
    newUint8Array.set(data);
    buffer = newBuffer;
  }

  const dataInt16 = new Int16Array(buffer);
  const frameCount = dataInt16.length / numChannels;
  
  const outputChannels = numChannels === 1 ? 2 : numChannels;
  const audioBuffer = ctx.createBuffer(outputChannels, frameCount, sampleRate);

  let maxAmplitude = 0;
  const floatData = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    let sample = 0;
    for (let c = 0; c < numChannels; c++) {
        sample += dataInt16[i * numChannels + c];
    }
    sample /= numChannels;
    
    const floatSample = sample / 32768.0;
    floatData[i] = floatSample;

    if (Math.abs(floatSample) > maxAmplitude) {
        maxAmplitude = Math.abs(floatSample);
    }
  }

  const normalizationFactor = maxAmplitude > 0.01 ? (0.95 / maxAmplitude) : 1.0;

  for (let channel = 0; channel < outputChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    
    for (let i = 0; i < frameCount; i++) {
      let sample = floatData[i];
      sample *= normalizationFactor;

      if (numChannels === 1 && outputChannels === 2 && channel === 1) {
         const prevIndex = Math.max(0, i - 1);
         sample = (sample + floatData[prevIndex] * normalizationFactor) * 0.5;
      }

      channelData[i] = sample;
    }
  }

  return audioBuffer;
}
