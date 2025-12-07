import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, Cpu, Zap, Activity } from 'lucide-react';

// -- AUDIO ENGINE (Local for Splash) --
const useSplashSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playStartup = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Deep drone rising to high pitch
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 3);
    
    // Filter sweep
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 2.5);

    // Gain envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 3.5);
  }, []);

  return playStartup;
};

interface SplashScreenProps {
  onFinish: () => void;
}

const LOADING_TEXTS = [
  "INITIALIZING CORE...",
  "LOADING GEOMETRY...",
  "CONNECTING SATELLITE...",
  "DECRYPTING DATABASE...",
  "CALIBRATING SENSORS...",
  "SYNCING AI NEURAL NET...",
  "SYSTEM READY"
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playSound = useSplashSound();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    // Start Audio
    const soundTimer = setTimeout(() => playSound(), 500);

    // Animate progress bar & text
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Non-linear progress for realism
        const increment = Math.random() * 3; 
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // Glitch effect loop
    const glitchInterval = setInterval(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 150);
    }, 2000);

    return () => {
        clearInterval(interval);
        clearInterval(glitchInterval);
        clearTimeout(soundTimer);
    };
  }, [playSound]);

  // Sync text with progress
  useEffect(() => {
      const index = Math.floor((progress / 100) * (LOADING_TEXTS.length - 1));
      setLoadingText(LOADING_TEXTS[index]);

      if (progress >= 100) {
          setTimeout(() => {
              setOpacity(0);
              setTimeout(onFinish, 800);
          }, 500);
      }
  }, [progress, onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030508] transition-opacity duration-800 ease-in-out font-mono overflow-hidden`}
      style={{ opacity }}
    >
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes glitch-skew { 
            0% { transform: skew(0deg); } 
            20% { transform: skew(-10deg); } 
            40% { transform: skew(10deg); } 
            60% { transform: skew(-5deg); } 
            80% { transform: skew(5deg); } 
            100% { transform: skew(0deg); } 
        }
        .glitch-active { animation: glitch-skew 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite; color: #22d3ee; text-shadow: 2px 0 #ef4444, -2px 0 #facc15; }
      `}</style>

      {/* Background Video with Overlay */}
      <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            // Remove 'loop' so it plays once if it's an intro sequence, 
            // or keep it if it's a seamless loop.
            className="absolute inset-0 w-full h-full object-cover opacity-60 contrast-110"
            // POINTING TO LOCAL ASSET
            src="/video/rockhound-loading.mp4" 
          />
          <div className="absolute inset-0 bg-[#030508]/60" /> {/* Darken slightly to make text pop */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-500/20 shadow-[0_0_20px_#22d3ee] animate-[scanline_4s_linear_infinite]" />
      </div>
      
      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        
        {/* Holographic Logo Projector */}
        <div className="relative mb-12 group">
            <div className={`absolute inset-0 bg-cyan-500/30 rounded-full blur-3xl transition-opacity duration-100 ${glitch ? 'opacity-80' : 'opacity-20'}`} />
            
            <div className={`relative w-40 h-40 flex items-center justify-center ${glitch ? 'glitch-active' : ''}`}>
                {/* Rotating Rings */}
                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-2 border border-indigo-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
                <div className="absolute inset-4 border border-white/10 rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
                
                {/* Center Icon */}
                <ShieldCheck className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
            </div>
        </div>

        {/* Typography */}
        <div className="text-center mb-10 space-y-2">
            <h1 className={`text-5xl font-black text-white tracking-tighter ${glitch ? 'glitch-active' : ''}`}>
                ROCKHOUND<span className="text-cyan-500">.GO</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-cyan-500/70 tracking-[0.3em] font-bold">
                <Cpu size={12} />
                <span>GEOLOGICAL_INTEL_SYSTEM_v4.0</span>
            </div>
        </div>

        {/* Tactical Loader */}
        <div className="w-full space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                <span>{loadingText}</span>
                <span>{Math.round(progress)}%</span>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="h-3 flex gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                        key={i} 
                        className={`flex-1 rounded-sm transition-all duration-300 ${
                            i < (progress / 5) 
                                ? 'bg-cyan-500 shadow-[0_0_10px_#22d3ee]' 
                                : 'bg-gray-800 border border-white/5'
                        }`} 
                    />
                ))}
            </div>
        </div>

        {/* Footer Status */}
        <div className="mt-8 flex gap-4 text-[9px] text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-1">
                <Zap size={10} className={progress > 30 ? "text-yellow-500 animate-pulse" : ""} />
                <span>Power</span>
            </div>
            <div className="flex items-center gap-1">
                <Activity size={10} className={progress > 60 ? "text-green-500 animate-pulse" : ""} />
                <span>Network</span>
            </div>
            <div className="flex items-center gap-1">
                <ShieldCheck size={10} className={progress > 90 ? "text-blue-500 animate-pulse" : ""} />
                <span>Security</span>
            </div>
        </div>

      </div>
    </div>
  );
};