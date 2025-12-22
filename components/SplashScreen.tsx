import React, { useEffect, useState, useRef } from 'react';
import { Pickaxe, Gem, ChevronRight, Zap, Hexagon, CircleDashed } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  
  // -- ANIMATION LOOP --
  useEffect(() => {
    // Smooth progress simulation (0 to 100 in ~2.5s)
    let start: number | null = null;
    const duration = 2500;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(nextProgress);

      if (nextProgress < 100) {
        requestAnimationFrame(step);
      } else {
        setIsReady(true);
      }
    };

    requestAnimationFrame(step);
  }, []);

  const handleGo = () => {
    setIsLaunching(true);
    // Play transition sound effect here if available
    setTimeout(onFinish, 800); // Wait for warp animation
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030508] overflow-hidden transition-opacity duration-1000 ${isLaunching ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <style>{`
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes spin-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes warp-out { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(5); opacity: 0; } }
        
        .warp-active .main-content { animation: warp-out 0.6s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
        .neon-text { text-shadow: 0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(34, 211, 238, 0.4); }
        .gold-text { text-shadow: 0 0 10px rgba(250, 204, 21, 0.8), 0 0 20px rgba(250, 204, 21, 0.4); }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
      `}</style>

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#000000_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
          <div className="absolute top-0 left-0 right-0 h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)] animate-pulse" />
      </div>

      <div className={`relative z-10 w-full max-w-md px-8 flex flex-col items-center main-content ${isLaunching ? 'warp-active' : ''}`}>
        
        {/* HEADER TITLE */}
        <div className="mb-12 text-center relative">
            <h1 className="text-5xl font-black text-white tracking-tighter italic transform -skew-x-6 drop-shadow-2xl">
                ROCK<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 neon-text">HOUND</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-[1px] w-8 bg-cyan-500/50" />
                <span className="text-[10px] font-mono text-cyan-400 tracking-[0.4em] uppercase">Neural Edition</span>
                <div className="h-[1px] w-8 bg-cyan-500/50" />
            </div>
        </div>

        {/* CENTRAL EMBLEM / GO BUTTON */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-16">
            
            {/* Rotating Outer Gears */}
            <div className="absolute inset-0 border-2 border-dashed border-cyan-900/50 rounded-full animate-[spin-slow_20s_linear_infinite]" />
            <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-[spin-reverse_15s_linear_infinite]" />
            
            {/* Particle Ring */}
            <div className="absolute inset-0 rounded-full animate-[spin-slow_8s_linear_infinite]">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
            </div>

            {/* CORE INTERFACE */}
            <div className={`relative z-10 transition-all duration-500 ${isReady ? 'scale-110' : 'scale-100'}`}>
                {isReady ? (
                    // GO BUTTON STATE
                    <button 
                        onClick={handleGo}
                        className="group relative w-32 h-32 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.4)] hover:scale-105 transition-transform cursor-pointer outline-none"
                    >
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
                        <div className="absolute inset-1 rounded-full border-2 border-white/50" />
                        <span className="text-4xl font-black text-white italic tracking-tighter transform -skew-x-6 drop-shadow-md group-hover:text-yellow-100 transition-colors">
                            GO
                        </span>
                        <ChevronRight className="absolute right-4 w-6 h-6 text-white/80 animate-pulse" />
                    </button>
                ) : (
                    // LOADING STATE
                    <div className="relative w-32 h-32 glass-panel rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                        <Gem className="w-12 h-12 text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>

        {/* LOADING BAR (Only visible when loading) */}
        <div className={`w-full transition-all duration-500 ${isReady ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
            <div className="flex justify-between text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">
                <span className="flex items-center gap-2"><Zap size={10} className="animate-bounce" /> System Boot</span>
                <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            
            <div className="h-4 bg-gray-900 rounded-full border border-white/10 overflow-hidden relative shadow-inner">
                {/* Fill */}
                <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-white relative"
                    style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[4px]" />
                </div>
            </div>
            <p className="text-center text-[9px] text-gray-500 mt-3 font-mono tracking-[0.2em] uppercase">
                Optimizing Neural Pathways...
            </p>
        </div>

        {/* READY STATE TEXT (Only visible when ready) */}
        <div className={`absolute bottom-20 transition-all duration-500 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-3 px-6 py-3 glass-panel rounded-full border-yellow-500/30">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#facc15]" />
                <span className="text-xs font-bold text-yellow-400 tracking-[0.2em] uppercase gold-text">Awaiting Input</span>
            </div>
        </div>

      </div>
    </div>
  );
};
