
import React, { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { Rock } from '../types';
import { ArrowLeft, Trash2, Share2, MapPin, Volume2, Loader2, PauseCircle, Hexagon, Quote, Box, Activity, ScanLine, FileWarning, GitCompare, Zap, Layers, Compass, Microscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateRockSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../services/audioUtils';

const Rock3DViewer = lazy(() => import('./Rock3DModel').then(module => ({ default: module.Rock3DViewer })));

const useDetailSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const playSound = useCallback((type: 'hover' | 'click' | 'purge' | 'scan') => {
    if (!audioCtx.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioCtx.current = new AudioContextClass();
    }
    const ctx = audioCtx.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    switch (type) {
        case 'hover': osc.frequency.setValueAtTime(400, now); gain.gain.setValueAtTime(0.02, now); break;
        case 'click': osc.frequency.setValueAtTime(300, now); gain.gain.setValueAtTime(0.05, now); break;
        case 'scan': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.02, now); break;
    }
    osc.start(); osc.stop(now + 0.3);
  }, []);
  return playSound;
};

interface RockDetailsProps {
  rock: Rock;
  onBack: () => void;
  onDelete: (id: string) => void;
  onStartComparisonMode: (initialRock?: Rock) => void; 
}

export const RockDetails: React.FC<RockDetailsProps> = ({ rock, onBack, onDelete, onStartComparisonMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'NOTES'>('DETAILS');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playSound = useDetailSound();

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) { audioSourceRef.current.stop(); audioSourceRef.current = null; }
    setIsPlaying(false);
  };

  const handlePlayAudio = async () => {
    playSound('click');
    if (isPlaying) { stopAudio(); return; }
    if (audioBufferRef.current) { playBuffer(audioBufferRef.current); return; }
    setIsGeneratingAudio(true);
    try {
      const ctx = getAudioContext();
      const speechText = activeTab === 'NOTES' ? rock.expertExplanation : rock.description;
      const result = await generateRockSpeech(speechText);
      const audioBytes = decode(result.audioData);
      const buffer = await decodeAudioData(audioBytes, ctx!, 24000, 1);
      audioBufferRef.current = buffer;
      playBuffer(buffer);
    } catch { toast.error("Audio failure"); } finally { setIsGeneratingAudio(false); }
  };

  const playBuffer = (buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') ctx.resume();
    const source = ctx!.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx!.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#050a10] overflow-y-auto no-scrollbar font-sans relative">
      <div className="relative h-[40vh] flex-none overflow-hidden group">
         <img src={rock.imageUrl} className="w-full h-full object-cover opacity-80" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#050a10] to-transparent" />
         <button onClick={() => { playSound('click'); onBack(); }} className="absolute top-safe mt-6 left-6 p-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-md z-20"><ArrowLeft className="w-5 h-5" /></button>
         <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <span className="px-2 py-0.5 border border-cyan-500/30 bg-cyan-900/30 text-cyan-400 text-[9px] font-bold uppercase tracking-[0.2em] rounded mb-2 inline-block">{rock.type}</span>
            <h1 className="text-4xl font-bold text-white tracking-tighter drop-shadow-2xl">{rock.name.toUpperCase()}</h1>
         </div>
      </div>

      <div className="flex-none px-6 mt-4 flex gap-2">
          <button onClick={() => { setActiveTab('DETAILS'); stopAudio(); audioBufferRef.current = null; }} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'DETAILS' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-500 border border-white/10'}`}>Specimen Data</button>
          <button onClick={() => { setActiveTab('NOTES'); stopAudio(); audioBufferRef.current = null; }} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${activeTab === 'NOTES' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-500 border border-white/10'}`}><Microscope size={12}/> Clover's Field Notes</button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {activeTab === 'DETAILS' ? (
            <>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                    <p className="text-gray-300 text-sm leading-relaxed">{rock.description}</p>
                </div>
                <div className="h-64 w-full bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
                    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>}>
                        <Rock3DViewer modelUrl="https://aistudiocdn.com/assets/rock.glb" rock={rock} />
                    </Suspense>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <StatBox label="Hardness" value={`${rock.hardness}/10`} icon={Layers} color="indigo" />
                    <StatBox label="Rarity" value={`${rock.rarityScore}%`} icon={Zap} color="amber" />
                </div>
            </>
        ) : (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 relative">
                    <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Microscope size={14}/> Geologist's Explanation</h3>
                    <p className="text-emerald-50/90 text-sm italic leading-relaxed">"{rock.expertExplanation}"</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Formation Genesis</h3>
                    <p className="text-gray-300 text-xs font-mono leading-loose">{rock.formationGenesis}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <StatBox label="Rarity Bonus" value={`+${rock.bonusXP.rarity} XP`} icon={Zap} color="emerald" />
                    <StatBox label="Expert Eye" value={`+${rock.bonusXP.expertEye} XP`} icon={Compass} color="emerald" />
                </div>
            </div>
        )}

        <div className="flex justify-center gap-4 py-8">
            <button onClick={handlePlayAudio} className={`p-4 rounded-full border transition-all ${isPlaying ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                {isGeneratingAudio ? <Loader2 className="animate-spin" /> : isPlaying ? <PauseCircle /> : <Volume2 />}
            </button>
            <button onClick={() => { if(window.confirm('Purge this asset?')) onDelete(rock.id); }} className="px-6 py-3 rounded-xl bg-red-900/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Trash2 size={14} /> Purge</button>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => {
    const colors: any = { indigo: 'text-indigo-400 border-indigo-500/30', amber: 'text-amber-400 border-amber-500/30', emerald: 'text-emerald-400 border-emerald-500/30' };
    return (
        <div className={`p-4 bg-white/5 border ${colors[color]} rounded-xl`}>
            <Icon className="w-4 h-4 mb-2 opacity-80" />
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{label}</div>
        </div>
    );
};
