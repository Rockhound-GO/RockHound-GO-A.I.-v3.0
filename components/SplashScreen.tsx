
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Pickaxe, Gem, ChevronRight, Zap, Hexagon, CircleDashed, Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import { getGlobalAudioContext, registerSource } from '../services/audioUtils';

interface SplashScreenProps {
  onFinish: () => void;
}

type SplashStage = 'INTRO' | 'LOADING' | 'READY';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<SplashStage>('INTRO');
  const [progress, setProgress] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const audioInitialized = useRef(false);

  // -- SOUND EFFECTS --
  const playSplashFx = useCallback((type: 'glimmer' | 'boot' | 'warp') => {
    const ctx = getGlobalAudioContext();
    if (!ctx) return;
    
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    registerSource(osc);

    if (type === 'glimmer') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 1.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.5);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
    } else if (type === 'boot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
    } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    osc.start(now);
    osc.stop(now + 1.5);
  }, []);

  // -- ANIMATION LOGIC --
  useEffect(() => {
    // Stage 1: Cinematic Intro
    const introTimer = setTimeout(() => {
      setStage('LOADING');
      playSplashFx('boot');
    }, 4500);

    return () => clearTimeout(introTimer);
  }, [playSplashFx]);

  useEffect(() => {
    if (stage !== 'LOADING') return;

    let start: number | null = null;
    const duration = 3000;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(nextProgress);

      if (nextProgress < 100) {
        requestAnimationFrame(step);
      } else {
        setStage('READY');
      }
    };

    requestAnimationFrame(step);
  }, [stage]);

  const handleGo = () => {
    setIsLaunching(true);
    playSplashFx('warp');
    setTimeout(onFinish, 800);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030508] overflow-hidden transition-opacity duration-1000 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes shine-sweep { 0% { left: -100%; } 100% { left: 100%; } }
        @keyframes float-gentle { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 0.1; } 100% { transform: scale(1); opacity: 0.3; } }
        @keyframes warp-out { 0% { transform: scale(1); opacity: 1; filter: blur(0px); } 100% { transform: scale(10); opacity: 0; filter: blur(20px); } }
        
        .font-cinematic { font-family: 'Playfair Display', serif; }
        .warp-active { animation: warp-out 0.8s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .intro-text-glow { text-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(34,211,238,0.2); }
      `}</style>

      {/* BACKGROUND SCENE */}
      <div className="absolute inset-0 z-0">
          {/* Base Layer: Landscape-esque gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#1e1b4b_0%,#030508_80%)]" />
          
          {/* Animated Stars/Sparkles */}
          <div className="absolute inset-0 opacity-40">
              <Sparkles count={50} scale={10} size={2} speed={0.5} color="#22d3ee" />
          </div>

          {/* Scanline / CRT Effect (Very subtle for cinematic) */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] opacity-30 pointer-events-none" />
      </div>

      <div className={`relative z-10 w-full flex flex-col items-center justify-center transition-all duration-1000 ${isLaunching ? 'warp-active' : ''}`}>
        
        {/* --- STAGE 1: BRANDING INTRO --- */}
        {stage === 'INTRO' && (
          <div className="flex flex-col items-center animate-[fade-in-up_2s_ease-out]">
             {/* Glowing Crystal Asset */}
             <div className="relative w-48 h-48 mb-12 animate-[float-gentle_6s_ease-in-out_infinite]">
                 <div className="absolute inset-0 bg-cyan-500 rounded-full blur-[60px] opacity-20" />
                 <div className="absolute inset-4 border-2 border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Gem className="w-24 h-24 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" strokeWidth={1} />
                    <Sparkles className="absolute inset-0 w-full h-full text-cyan-400 opacity-50" />
                 </div>
             </div>

             <div className="text-center space-y-4 px-6">
                <h2 className="text-white text-lg tracking-[0.4em] uppercase font-light opacity-60 animate-[fade-in-up_1.5s_ease-out_0.5s_both]">Hidden Gem</h2>
                <h1 className="text-6xl md:text-7xl font-cinematic font-bold text-white italic intro-text-glow animate-[fade-in-up_1.5s_ease-out_0.8s_both] tracking-tight">
                    RockHounding Inc.
                </h1>
                <div className="flex flex-col items-center gap-2 mt-8 animate-[fade-in-up_1.5s_ease-out_1.2s_both]">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                    <p className="text-[11px] font-mono text-cyan-400/80 tracking-[0.3em] uppercase">Reimagining the RockHound Experience</p>
                    <p className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase mt-1 italic">Since 2019</p>
                </div>
             </div>
          </div>
        )}

        {/* --- STAGE 2: NEURAL CALIBRATION (LOADING) --- */}
        {stage === 'LOADING' && (
           <div className="w-full max-w-sm px-8 flex flex-col items-center animate-[fade-in-up_1s_ease-out]">
              <div className="relative w-32 h-32 mb-12">
                  <div className="absolute inset-0 border-2 border-cyan-900/50 rounded-full" />
                  <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
                  <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
              </div>

              <div className="w-full space-y-3">
                  <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest">Neural Calibration</span>
                        <span className="block text-[8px] font-mono text-gray-500 uppercase">SYS_LOAD: CLOVER_OS_v4.5</span>
                      </div>
                      <span className="text-lg font-black text-white font-mono">{Math.round(progress)}%</span>
                  </div>
                  
                  <div className="h-3 bg-gray-900/50 rounded-full border border-white/5 overflow-hidden relative shadow-inner backdrop-blur-md">
                      <div 
                          className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-white relative transition-all duration-100"
                          style={{ width: `${progress}%` }}
                      >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
                          <div className="absolute right-0 top-0 bottom-0 w-4 bg-white blur-[8px]" />
                      </div>
                  </div>
                  <p className="text-center text-[8px] text-gray-600 mt-4 font-mono tracking-[0.4em] uppercase animate-pulse">
                      Synchronizing Voxel Data Streams...
                  </p>
              </div>
           </div>
        )}

        {/* --- STAGE 3: READY (GO BUTTON) --- */}
        {stage === 'READY' && (
           <div className="flex flex-col items-center animate-[fade-in-up_0.8s_cubic-bezier(0.34,1.56,0.64,1)]">
              <div className="relative mb-8 group cursor-pointer" onClick={handleGo}>
                  <div className="absolute inset-[-20px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[spin_8s_linear_infinite]" />
                  <div className="absolute inset-[-10px] rounded-full border border-dashed border-indigo-500/20 animate-[spin_12s_linear_infinite_reverse]" />
                  
                  <button 
                      className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-1 shadow-[0_0_50px_rgba(34,211,238,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_70px_rgba(34,211,238,0.6)] transition-all duration-500 flex items-center justify-center outline-none"
                  >
                      <div className="w-full h-full rounded-full bg-[#050a10] flex items-center justify-center relative overflow-hidden group-active:scale-95 transition-transform">
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
                          <span className="text-4xl font-black text-white italic tracking-tighter transform -skew-x-6">GO</span>
                          <ChevronRight className="w-6 h-6 text-cyan-400 absolute right-4 group-hover:translate-x-2 transition-transform opacity-0 group-hover:opacity-100" />
                      </div>
                  </button>
              </div>

              <div className="flex flex-col items-center gap-4">
                  <div className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-md flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Neural Uplink Secure</span>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                      <div className="flex flex-col items-center opacity-40">
                          <ShieldCheck size={14} className="text-gray-400" />
                          <span className="text-[7px] uppercase mt-1">Encrypted</span>
                      </div>
                      <div className="flex flex-col items-center opacity-40">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="text-[7px] uppercase mt-1">Geo-Locked</span>
                      </div>
                  </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
