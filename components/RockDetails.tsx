

import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Rock } from '../types';
import { ArrowLeft, Trash2, Share2, MapPin, Volume2, Loader2, PauseCircle, Hexagon, Quote, Box as Cube } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateRockSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../services/audioUtils';

// Lazy load the 3D viewer component
const Rock3DViewer = lazy(() => import('./Rock3DModel').then(module => ({ default: module.Rock3DViewer })));

interface RockDetailsProps {
  rock: Rock;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

export const RockDetails: React.FC<RockDetailsProps> = ({ rock, onBack, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Placeholder for a 3D model URL. In a real app, this would come from a database 
  // or a CDN based on `rock.name` or `rock.scientificName`.
  const threeDModelUrl = 'https://aistudiocdn.com/assets/rock.glb'; // Generic rock model

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayAudio = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (audioBufferRef.current) {
      playBuffer(audioBufferRef.current);
      return;
    }
    setIsGeneratingAudio(true);
    try {
      const result = await generateRockSpeech(`This is ${rock.name}. ${rock.description}`);
      const audioBytes = decode(result.audioData);
      const buffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
      audioBufferRef.current = buffer;
      playBuffer(buffer);
    } catch (error) {
      toast.error("Audio unavailable");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer) => {
    if (audioContext.state === 'suspended') audioContext.resume();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  useEffect(() => () => stopAudio(), []);

  return (
    <div className={`h-full flex flex-col bg-[#030712] overflow-y-auto no-scrollbar font-sans`}>
      {/* Immersive Header Image */}
      <div className={`relative h-[60vh] flex-none`}>
         <img src={rock.imageUrl} className={`w-full h-full object-cover`} />
         <div className={`absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/50 to-transparent`} />
         
         <button onClick={onBack} className={`absolute top-safe mt-4 left-4 p-3 rounded-full bg-black/20 border border-white/10 backdrop-blur-md hover:bg-black/40 transition-colors z-20 group`}>
            <ArrowLeft className={`w-5 h-5 text-white group-hover:-translate-x-1 transition-transform`} />
         </button>

         <div className={`absolute bottom-0 left-0 right-0 p-6 z-20`}>
            <div className={`flex items-end justify-between`}>
                <div>
                    <div className={`flex items-center gap-2 mb-3`}>
                        <span className={`px-2 py-0.5 border border-cyan-500/30 bg-cyan-900/30 text-cyan-400 text-[9px] font-bold uppercase tracking-widest rounded backdrop-blur-sm`}>{rock.type} CLASS</span>
                        {rock.location && (
                            <span className={`text-[9px] text-gray-400 font-mono flex items-center gap-1 uppercase tracking-wide bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm`}>
                                <MapPin className={`w-3 h-3`} /> {rock.location.lat.toFixed(2)}, {rock.location.lng.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <h1 className={`text-5xl font-bold text-white tracking-tighter mb-1 drop-shadow-xl`}>{rock.name.toUpperCase()}</h1>
                    <p className={`text-sm text-gray-400 italic font-serif opacity-80`}>{rock.scientificName}</p>
                </div>
                <button onClick={handlePlayAudio} className={`w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 backdrop-blur-md hover:bg-indigo-600/40 hover:scale-105 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]`}>
                    {isGeneratingAudio ? <Loader2 className={`w-6 h-6 animate-spin`} /> : isPlaying ? <PauseCircle className={`w-7 h-7`} /> : <Volume2 className={`w-7 h-7`} />}
                </button>
            </div>
         </div>
      </div>

      {/* Data Content */}
      <div className={`p-6 space-y-8 relative z-10 -mt-8`}>
         <div className={`glass-panel p-6 rounded-2xl border-l-4 border-l-indigo-500/50`}>
             <p className={`text-gray-200 text-sm leading-relaxed font-light`}>
                {rock.description}
             </p>
         </div>

         <div className={`grid grid-cols-2 gap-4`}>
            <div className={`glass-panel p-4 rounded-xl relative overflow-hidden group`}>
               <div className={`absolute -right-6 -top-6 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors`}><Hexagon className={`w-24 h-24`} /></div>
               <div className={`text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-3`}>Rarity Index</div>
               <div className={`flex items-end gap-2 mb-3`}>
                   <div className={`text-3xl font-bold text-white`}>{rock.rarityScore}</div>
                   <div className={`text-xs text-gray-500 mb-1`}>/100</div>
               </div>
               <div className={`h-1.5 bg-gray-800 w-full rounded-full overflow-hidden`}>
                  <div className={`h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]`} style={{ width: `${rock.rarityScore}%` }} />
               </div>
            </div>
            <div className={`glass-panel p-4 rounded-xl relative overflow-hidden group`}>
               <div className={`absolute -right-6 -top-6 text-cyan-500/10 group-hover:text-cyan-500/20 transition-colors`}><Hexagon className={`w-24 h-24`} /></div>
               <div className={`text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-3`}>Hardness</div>
               <div className={`flex items-end gap-2 mb-3`}>
                   <div className={`text-3xl font-bold text-white`}>{rock.hardness}</div>
                   <div className={`text-xs text-gray-500 mb-1`}>/10</div>
               </div>
               <div className={`h-1.5 bg-gray-800 w-full rounded-full overflow-hidden`}>
                  <div className={`h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]`} style={{ width: `${rock.hardness * 10}%` }} />
               </div>
            </div>
         </div>

         {/* 3D Model Viewer Section */}
         <div className={`space-y-3`}>
            <h3 className={`text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2`}>
                <Cube className={`w-3 h-3 text-cyan-400`} /> 3D Specimen View
            </h3>
            <div className={`w-full h-64 rounded-xl overflow-hidden glass-panel border border-cyan-500/20 relative`}>
                <Suspense fallback={
                    <div className={`flex flex-col items-center justify-center w-full h-full text-cyan-400`}>
                        <Loader2 className={`w-8 h-8 animate-spin mb-2`} />
                        <span className={`text-xs uppercase tracking-wider`}>Loading 3D Model...</span>
                    </div>
                }>
                    <Rock3DViewer modelUrl={threeDModelUrl} />
                </Suspense>
            </div>
            <p className={`text-[9px] text-gray-600 text-center uppercase tracking-wide`}>
              (Model is generic. In a full system, this would be specific to {rock.name.toLowerCase()}.)
            </p>
         </div>

         {rock.comparisonImageUrl && (
            <div className={`space-y-3`}>
                <h3 className={`text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]`}>Reference Specimen</h3>
                <div className={`w-full h-40 rounded-xl overflow-hidden border border-white/10 relative group`}>
                    <img src={rock.comparisonImageUrl} className={`w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className={`absolute inset-0 bg-gradient-to-r from-black/60 to-transparent pointer-events-none`} />
                    <div className={`absolute top-3 left-3 flex items-center gap-2`}>
                        <span className={`w-2 h-2 rounded-full bg-indigo-500 animate-pulse`} />
                        <span className={`text-[9px] font-mono text-indigo-300 tracking-wider`}>IDEAL FORM</span>
                    </div>
                </div>
            </div>
         )}
         
         <div className={`glass-panel p-5 rounded-xl border border-amber-500/20 bg-amber-900/5`}>
            <div className={`flex items-center gap-2 mb-2 text-amber-500/80`}>
                <Quote className={`w-4 h-4`} />
                <h3 className={`text-[10px] font-bold uppercase tracking-widest`}>Field Note</h3>
            </div>
            <p className={`text-gray-400 text-xs italic pl-6`}>"{rock.funFact}"</p>
         </div>

         <div className={`flex gap-4 pt-6 border-t border-white/5 pb-24`}>
            <button onClick={() => navigator.share?.({ title: rock.name, text: rock.description })} className={`flex-1 py-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white rounded-xl font-mono text-xs uppercase transition-all flex items-center justify-center gap-2 tracking-wider`}>
                <Share2 className={`w-4 h-4`} /> Share Data
            </button>
            <button onClick={() => onDelete(rock.id)} className={`flex-1 py-4 border border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-500/50 rounded-xl font-mono text-xs uppercase transition-all flex items-center justify-center gap-2 tracking-wider`}>
                <Trash2 className={`w-4 h-4`} /> Purge
            </button>
         </div>
      </div>
    </div>
  );
};