import React, { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { Rock } from '../types';
import { ArrowLeft, Trash2, Share2, MapPin, Volume2, Loader2, PauseCircle, Hexagon, Quote, Box, Activity, ScanLine, FileWarning, GitCompare, Zap, Layers } from 'lucide-react';
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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx.current = new AudioContextClass();
      }
    }
    const ctx = audioCtx.current;
    if (!ctx) return;
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
  onStartComparisonMode: (initialRock?: Rock) => void; // New prop for comparison
}

export const RockDetails: React.FC<RockDetailsProps> = ({ rock, onBack, onDelete, onStartComparisonMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioAmplitude, setAudioAmplitude] = useState(0); // For Visualizer
  
  // Safe Audio Context Init
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const playSound = useDetailSound();

  // Placeholder for a 3D model URL.
  const threeDModelUrl = 'https://aistudiocdn.com/assets/rock.glb';

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        }
    }
    return audioContextRef.current;
  }, []);

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
      const ctx = getAudioContext();
      if (!ctx) throw new Error("Audio not supported");

      const result = await generateRockSpeech(`This is ${rock.name}. ${rock.description}`);
      const audioBytes = decode(result.audioData);
      const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      audioBufferRef.current = buffer;
      playBuffer(buffer);
    } catch (error) {
      console.error(error);
      toast.error("Audio unavailable");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') ctx.resume();
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Analyzer for visualizer
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(ctx.destination);
    
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

  const handleCompareClick = () => {
    playSound('click');
    onStartComparisonMode(rock); // Initiate comparison with the current rock
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
      <div className="relative h-[45vh] flex-none overflow-hidden group">
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

         {/* Compare Button */}
         <button
            onClick={handleCompareClick}
            className="absolute top-safe mt-6 right-6 p-3 rounded-full bg-purple-900/40 border border-purple-500/50 backdrop-blur-md hover:bg-purple-800/50 hover:border-purple-300/50 transition-all z-20 group/compare"
         >
            <GitCompare className="w-5 h-5 text-purple-400 group-hover/compare:scale-110 transition-transform" />
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

      {/* --- CONTENT BODY --- */}
      <div className="flex-1 p-6 space-y-8 relative z-10">
        
        {/* 1. Description */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
            <Quote className="w-8 h-8 text-cyan-500/20 absolute top-4 right-4" />
            <p className="text-gray-300 leading-relaxed font-light text-sm">
                {rock.description}
            </p>
        </div>

        {/* 2. 3D MODEL VIEWER (ALWAYS VISIBLE) */}
        <div className="h-80 w-full bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl">
            <div className="absolute top-4 left-6 z-10">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Hexagon className="w-3 h-3 text-cyan-400" /> Holographic Analysis
                </h3>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>}>
                <Rock3DViewer modelUrl={threeDModelUrl} rock={rock} />
            </Suspense>
        </div>

        {/* 3. Data Grid */}
        <div className="grid grid-cols-2 gap-4">
            <StatBox label="Hardness" value={`${rock.hardness}/10`} sub="Mohs Scale" icon={Layers} color="indigo" />
            <StatBox label="Rarity" value={`${rock.rarityScore}%`} sub="Index" icon={Zap} color="amber" />
            <StatBox label="Composition" value={rock.composition[0] || 'N/A'} sub="Primary" icon={Activity} color="emerald" />
            <StatBox label="Color" value={rock.color.join(', ')} sub="Spectral" icon={ScanLine} color="pink" />
        </div>

        {/* 4. Fun Fact */}
        {rock.funFact && (
            <div className="p-5 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-2xl">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                    Did you know?
                </h4>
                <p className="text-xs text-indigo-200 italic">
                    "{rock.funFact}"
                </p>
            </div>
        )}

        {/* 5. Footer Actions */}
        <div className="pt-8 pb-12 flex justify-center">
            <button 
                onClick={() => { if(window.confirm('Purge this asset?')) onDelete(rock.id); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-900/10 border border-red-500/30 text-red-400 hover:bg-red-900/30 transition-all text-xs font-bold uppercase tracking-widest"
            >
                <Trash2 className="w-4 h-4" /> Purge Asset
            </button>
        </div>

      </div>
    </div>
  );
};

// -- MICRO COMPONENT: STAT BOX --
const StatBox: React.FC<{ label: string; value: string; sub: string; icon: any; color: string }> = ({ label, value, sub, icon: Icon, color }) => {
    const colorClasses: any = {
        indigo: 'text-indigo-400 border-indigo-500/30',
        amber: 'text-amber-400 border-amber-500/30',
        emerald: 'text-emerald-400 border-emerald-500/30',
        pink: 'text-pink-400 border-pink-500/30',
    };

    return (
        <div className={`p-4 bg-white/5 border ${colorClasses[color]} rounded-xl relative overflow-hidden group`}>
            <Icon className={`w-5 h-5 mb-2 ${colorClasses[color].split(' ')[0]} opacity-80`} />
            <div className="text-xl font-bold text-white tracking-tight leading-none mb-1 truncate">{value}</div>
            <div className="flex justify-between items-end">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label}</span>
                <span className="text-[8px] font-mono text-gray-600">{sub}</span>
            </div>
            {/* Hover Shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};