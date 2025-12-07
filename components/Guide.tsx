import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Camera, Zap, Box, BarChart2, BookOpen, ChevronRight, Scan, ShieldCheck } from 'lucide-react';

// -- AUDIO ENGINE (Local) --
const useGuideSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'open' | 'hover' | 'click' | 'confirm') => {
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

    if (type === 'open') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'hover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'confirm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
  }, []);

  return playSound;
};

interface GuideProps {
  onClose: () => void;
}

export const Guide: React.FC<GuideProps> = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const playSound = useGuideSound();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    playSound('open');
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    playSound('confirm');
    setTimeout(onClose, 300);
  };

  const steps = [
    {
      id: '01',
      title: 'TARGET ACQUISITION',
      desc: 'Deploy the optical sensor (Camera) to scan geological assets in the field. Ensure optimal lighting conditions for accurate identification.',
      icon: Camera,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30'
    },
    {
      id: '02',
      title: 'NEURAL ANALYSIS',
      desc: 'Engage the Gemini AI Core to cross-reference visual data against the global mineral database. Analysis provides type, rarity, and chemical composition.',
      icon: Zap,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    },
    {
      id: '03',
      title: 'SECURE STORAGE',
      desc: 'Archive identified specimens into your personal Vault. Organize your collection and review holographic models of your finds.',
      icon: Box,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30'
    },
    {
      id: '04',
      title: 'CAREER PROGRESSION',
      desc: 'Monitor your operator level via the Stats dashboard. Earn XP by discovering rare minerals and completing field challenges.',
      icon: BarChart2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    }
  ];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100 backdrop-blur-md bg-black/60' : 'opacity-0 backdrop-blur-none bg-transparent'}`}>
      <style>{`
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .guide-card { transform-style: preserve-3d; perspective: 1000px; }
      `}</style>

      <div className={`w-full max-w-lg bg-[#050a10]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden guide-card transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        
        {/* Holographic Header */}
        <div className="relative p-6 border-b border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 via-transparent to-indigo-900/20" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            
            <div className="relative flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-3 font-mono">
                        <BookOpen className="w-5 h-5 text-cyan-500" />
                        FIELD_MANUAL
                    </h2>
                    <p className="text-[10px] text-gray-400 font-mono mt-1 tracking-[0.2em] uppercase">
                        Operator Orientation v3.0
                    </p>
                </div>
                <button 
                    onClick={handleClose}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Content Modules */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
            {steps.map((step, index) => (
                <div 
                    key={step.id}
                    onMouseEnter={() => playSound('hover')}
                    className={`group relative p-4 rounded-xl border ${step.border} bg-black/40 hover:bg-white/5 transition-all duration-300 cursor-default hover:scale-[1.02]`}
                    style={{ animation: `slide-up-fade 0.5s ease-out backwards ${index * 0.1}s` }}
                >
                    {/* Hover Glow */}
                    <div className={`absolute inset-0 ${step.bg} opacity-0 group-hover:opacity-20 transition-opacity rounded-xl blur-lg`} />
                    
                    <div className="relative flex gap-4">
                        <div className={`w-12 h-12 rounded-lg ${step.bg} flex items-center justify-center flex-none border ${step.border}`}>
                            <step.icon className={`w-6 h-6 ${step.color}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className={`font-bold text-sm text-gray-200 tracking-wider font-mono group-hover:text-white transition-colors`}>
                                    {step.id} // {step.title}
                                </h3>
                                <ChevronRight className={`w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform ${step.color}`} />
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-sans border-l-2 border-white/5 pl-3 group-hover:border-white/20 transition-colors">
                                {step.desc}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Tactical Footer */}
        <div className="p-6 border-t border-white/5 bg-[#080c14]">
            <button 
                onClick={handleClose}
                onMouseEnter={() => playSound('hover')}
                className="w-full py-4 relative group overflow-hidden rounded-xl"
            >
                <div className="absolute inset-0 bg-indigo-600 transition-all group-hover:bg-indigo-500" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] opacity-30" />
                
                <div className="relative flex items-center justify-center gap-3 text-white font-bold tracking-[0.2em] text-sm uppercase">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Acknowledge Protocol</span>
                </div>
            </button>
            <div className="text-center mt-3">
                <span className="text-[9px] text-gray-600 font-mono flex items-center justify-center gap-2">
                    <Scan className="w-3 h-3" /> SECURITY CLEARANCE VERIFIED
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};