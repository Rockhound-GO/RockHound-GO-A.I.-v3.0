import React, { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { Rock } from '../types';
import { ArrowLeft, Trash2, Share2, MapPin, Volume2, Loader2, PauseCircle, Hexagon, Quote, Cube, Activity, ScanLine, FileWarning } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateRockSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../services/audioUtils';

// Lazy load the 3D viewer component
const Rock3DViewer = lazy(() => import('./Rock3DModel').then(module => ({ default: module.Rock3DViewer })));

// -- AUDIO ENGINE (Local FX) --
const useDetailSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'hover' | 'click' | 'purge' | 'scan') => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case 'hover':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'click':
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'scan':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.5);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'purge':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
  }, []);

  return playSound;
};

interface RockDetailsProps {
  rock: Rock;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

export const RockDetails: React.FC<RockDetailsProps> = ({ rock, onBack, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioAmplitude, setAudioAmplitude] = useState(0); // For Visualizer
  
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const playSound = useDetailSound();

  // Placeholder for a 3D model URL.
  const threeDModelUrl = 'https://aistudiocdn.com/assets/rock.glb';

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setAudioAmplitude(0);
  };

  const handlePlayAudio = async () => {
    playSound('click');
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
    
    // Analyzer for visualizer
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    source.onended = () => {
        setIsPlaying(false);
        setAudioAmplitude(0);
        cancelAnimationFrame(animationFrameRef.current!);
    };
    
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);

    const animate = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // Calculate average volume for single bar visualizer effect
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioAmplitude(average);
        animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  useEffect(() => {
      playSound('scan'); // Play scan sound on mount
      return () => stopAudio();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#050a10] overflow-y-auto no-scrollbar font-sans relative">
      <style>{`
        @keyframes scan-sweep { 0% { top: -10%; opacity: 0; } 50% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
        .tech-border { clip-path: polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%); }
      `}</style>

      {/* --- IMMERSIVE HEADER --- */}
      <div className="relative h-[55vh] flex-none overflow-hidden group">
         <div className="absolute inset-0 bg-black z-0" />
         
         <img src={rock.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
         
         {/* Scanning Overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#050a10] via-[#050a10]/40 to-transparent" />
         <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/50 shadow-[0_0_20px_#06b6d4] animate-[scan-sweep_4s_linear_infinite]" />

         {/* Navigation */}
         <button 
            onClick={() => { playSound('click'); onBack(); }} 
            className="absolute top-safe mt-6 left-6 p-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/30 transition-all z-20 group/back"
         >
            <ArrowLeft className="w-5 h-5 text-white group-hover/back:-translate-x-1 transition-transform" />
         </button>

         {/* Title Block */}
         <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 border border-cyan-500/30 bg-cyan-900/30 text-cyan-400 text-[9px] font-bold uppercase tracking-[0.2em] rounded backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            {rock.type} CLASS
                        </span>
                        {rock.location && (
                            <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1 uppercase tracking-wide bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
                                <MapPin className="w-3 h-3 text-red-400" /> {rock.location.lat.toFixed(4)}, {rock.location.lng.toFixed(4)}
                            </span>
                        )}
                    </div>
                    <h1 className="text-5xl font-bold text-white tracking-tighter mb-1 drop-shadow-2xl font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                        {rock.name.toUpperCase()}
                    </h1>
                    <p className="text-sm text-cyan-500/80 font-mono tracking-widest uppercase flex items-center gap-2">
                        <Activity className="w-3 h-3" /> {rock.scientificName || "UNKNOWN_DESIGNATION"}
                    </p>
                </div>

                {/* Audio FAB */}
                <button 
                    onClick={handlePlayAudio}
                    className={`relative w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] group ${isPlaying ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/20 hover:bg-white/10'}`}
                >
                    {/* Visualizer Ring */}
                    {isPlaying && (
                        <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400/50 animate-ping" />
                    )}
                    
                    {isGeneratingAudio ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : isPlaying ? (
                        <PauseCircle className="w-8 h-8 text-white" />
                    ) : (
                        <Volume2 className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    )}
                </button>
            </div>
         </div>
      </div>

      {/* --- ANALYSIS CONTENT --- */}
      <div className="p-6 space-y-8 relative z-10 -mt-6">
         
         {/* Description Console */}
         <div className="bg-[#0a0f18]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500" />
             <div className="absolute -right-10 -top-10 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                 <Hexagon size={120} />
             </div>
             
             <div className="relative z-10">
                 <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ScanLine size={12} /> Analysis Log
                 </h3>
                 <p className="text-gray-300 text-sm leading-relaxed font-light">
                    {rock.description}
                 </p>
             </div>
         </div>

         {/* Stat Modules */}
         <div className="grid grid-cols-2 gap-4">
            <div 
                onMouseEnter={() => playSound('hover')}
                className="bg-black/40 backdrop-blur border border-white/10 p-4 rounded-xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors"
            >
               <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative z-10">
                   <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-1">Rarity Index</div>
                   <div className="flex items-end gap-2 mb-3">
                       <div className="text-3xl font-bold text-white">{rock.rarityScore}</div>
                       <div className="text-xs text-gray-500 mb-1">/100</div>
                   </div>
                   {/* Animated Bar */}
                   <div className="h-1.5 bg-gray-800 w-full rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-1000" style={{ width: `${rock.rarityScore}%` }} />
                   </div>
               </div>
            </div>

            <div 
                onMouseEnter={() => playSound('hover')}
                className="bg-black/40 backdrop-blur border border-white/10 p-4 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors"
            >
               <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative z-10">
                   <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-1">Hardness</div>
                   <div className="flex items-end gap-2 mb-3">
                       <div className="text-3xl font-bold text-white">{rock.hardness}</div>
                       <div className="text-xs text-gray-500 mb-1">/10</div>
                   </div>
                   <div className="h-1.5 bg-gray-800 w-full rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-1000" style={{ width: `${rock.hardness * 10}%` }} />
                   </div>
               </div>
            </div>
         </div>

         {/* 3D Model Viewer Container */}
         <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Cube className="w-3 h-3 text-cyan-400" /> Digital Specimen
            </h3>
            <div className="w-full h-72 rounded-2xl overflow-hidden border border-white/10 relative bg-[#080c14] shadow-inner">
                {/* HUD Corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-white/20 rounded-tl" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/20 rounded-tr" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/20 rounded-bl" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-white/20 rounded-br" />
                
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center w-full h-full text-cyan-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs font-mono uppercase tracking-wider animate-pulse">Constructing Voxel Matrix...</span>
                    </div>
                }>
                    <Rock3DViewer modelUrl={threeDModelUrl} />
                </Suspense>
            </div>
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-wide font-mono">
              // CAUTION: Model represents generic class data.
            </p>
         </div>

         {rock.comparisonImageUrl && (
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Reference Data</h3>
                <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 relative group">
                    <img src={rock.comparisonImageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-4 left-4">
                        <span className="flex items-center gap-2 text-[9px] font-mono text-indigo-300 tracking-wider bg-black/60 px-2 py-1 rounded border border-indigo-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> IDEAL_SPECIMEN
                        </span>
                    </div>
                </div>
            </div>
         )}
         
         <div className="bg-[#0a0f18] p-5 rounded-xl border border-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Quote size={48} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-amber-500/80 relative z-10">
                <Quote className="w-4 h-4" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Field Note</h3>
            </div>
            <p className="text-gray-400 text-xs italic pl-6 border-l border-amber-500/30 relative z-10">"{rock.funFact}"</p>
         </div>

         {/* Action Footer */}
         <div className="flex gap-4 pt-6 border-t border-white/5 pb-24">
            <button 
                onClick={() => { playSound('click'); navigator.share?.({ title: rock.name, text: rock.description }); }} 
                className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500/50 text-white rounded-xl font-mono text-xs uppercase transition-all flex items-center justify-center gap-2 tracking-wider group"
            >
                <Share2 className="w-4 h-4 text-cyan-500 group-hover:animate-bounce" /> Encrypt & Share
            </button>
            <button 
                onClick={() => { playSound('purge'); onDelete(rock.id); }} 
                className="flex-1 py-4 border border-red-900/50 text-red-400 hover:bg-red-900/10 hover:border-red-500/50 hover:text-red-300 rounded-xl font-mono text-xs uppercase transition-all flex items-center justify-center gap-2 tracking-wider group"
            >
                <FileWarning className="w-4 h-4 group-hover:animate-pulse" /> Purge Asset
            </button>
         </div>
      </div>
    </div>
  );
};