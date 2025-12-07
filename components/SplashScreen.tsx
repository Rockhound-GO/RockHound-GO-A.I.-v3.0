
import React, { useEffect, useState, useRef } from 'react';
import { Shield, Cpu, Activity, Zap, Hexagon } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [bootStep, setBootStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const bootSequence = [
    "INITIALIZING KERNEL...",
    "LOADING NEURAL LINK...",
    "CALIBRATING SENSORS...",
    "CONNECTING TO SATELLITE NETWORK...",
    "ENCRYPTING DATA STREAMS...",
    "SYSTEM OPTIMAL."
  ];

  useEffect(() => {
    // Progress Bar Animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    // Boot Text Sequence
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < bootSequence.length) {
        setLogs(prev => [...prev, bootSequence[logIndex]]);
        setBootStep(prev => prev + 1);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 800);

    // Finish
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
        containerRef.current.style.transform = 'scale(1.1)';
      }
      setTimeout(onFinish, 800);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
      clearTimeout(timeout);
    };
  }, [onFinish]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden font-mono transition-all duration-700 ease-in-out"
    >
      {/* Background Matrix/Grid Effect */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:30px_30px] animate-[scan-grid_10s_linear_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">

        {/* Animated Logo/Core */}
        <div className="relative w-32 h-32 mb-12">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
            <div className="absolute inset-2 border-t-4 border-b-4 border-indigo-500/50 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Hexagon className="w-16 h-16 text-cyan-400 animate-pulse fill-cyan-900/20" />
            </div>
            <div className="absolute -inset-8 border border-cyan-500/10 rounded-full animate-ping opacity-20" />
        </div>

        {/* Title */}
        <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 tracking-[0.2em] mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] glitch" data-text="ROCKHOUND">
                ROCKHOUND
            </h1>
            <div className="flex items-center justify-center gap-2 text-[10px] text-cyan-600 tracking-[0.5em] font-bold">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                SYSTEM V.4.0
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            </div>
        </div>

        {/* Loading Bar */}
        <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden mb-2 relative">
            <div
                className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4] transition-all duration-100 ease-linear relative"
                style={{ width: `${progress}%` }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-sm" />
            </div>
        </div>
        <div className="flex justify-between w-full text-[10px] text-cyan-500/60 font-bold mb-8">
            <span>LOADING MODULES</span>
            <span>{progress}%</span>
        </div>

        {/* Boot Logs */}
        <div className="w-full h-24 overflow-hidden flex flex-col justify-end text-[10px] text-green-400/80 space-y-1 border-l-2 border-green-500/20 pl-4 bg-black/40 p-2 rounded-r-lg">
            {logs.map((log, i) => (
                <div key={i} className="animate-in slide-in-from-left-2 fade-in duration-300 flex items-center gap-2">
                    <span className="text-green-600">[{new Date().toLocaleTimeString()}]</span>
                    <span className="typing-effect">{log}</span>
                </div>
            ))}
            <div className="w-2 h-4 bg-green-500/50 animate-pulse inline-block" />
        </div>

      </div>

      {/* Bottom Status */}
      <div className="absolute bottom-8 flex gap-8 text-[9px] text-gray-600 tracking-widest uppercase">
        <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" /> Secure Connection
        </div>
        <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3" /> Memory: OK
        </div>
        <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" /> Network: 5G
        </div>
      </div>

    </div>
  );
};
