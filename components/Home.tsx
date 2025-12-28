
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, DailyBounty } from '../types';
import { api } from '../services/api';
import { getDailyBounty } from '../services/geminiService';
import { Zap, Flame, ShieldCheck, Hammer, Eye, Compass, MapPin, Activity, CheckCircle2, ScanLine, ChevronRight, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { getGlobalAudioContext } from '../services/audioUtils';

// -- LOCAL TACTICAL AUDIO ENGINE --
const useHomeSound = () => {
  const currentSourceRef = useRef<OscillatorNode | null>(null);

  const playSound = useCallback((type: 'click' | 'success' | 'hover' | 'boot') => {
    const ctx = getGlobalAudioContext();
    if (!ctx) return;

    if (currentSourceRef.current && type !== 'hover') {
        try { currentSourceRef.current.stop(); } catch(e) {}
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'success':
        [440, 554, 659].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          o.connect(g).connect(ctx.destination);
          g.gain.setValueAtTime(0, now + (i * 0.05));
          g.gain.linearRampToValueAtTime(0.05, now + 0.1 + (i * 0.05));
          g.gain.linearRampToValueAtTime(0, now + 0.4 + (i * 0.05));
          o.start(now + (i * 0.05));
          o.stop(now + 0.5 + (i * 0.05));
        });
        break;
      case 'hover':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'boot':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
    currentSourceRef.current = osc;
  }, []);

  return playSound;
};

interface HomeProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
  const [bounty, setBounty] = useState<DailyBounty | null>(null);
  const [loadingBounty, setLoadingBounty] = useState(true);
  const playSound = useHomeSound();
  const containerRef = useRef<HTMLDivElement>(null);
  const [gearChecked, setGearChecked] = useState<Record<string, boolean>>({
    hammer: false,
    goggles: false,
    streakPlate: false,
    water: false
  });

  const xpToNext = useMemo(() => {
    return (user.level * 100) - user.xp;
  }, [user]);

  useEffect(() => {
    const fetchBounty = async () => {
      try {
        const lat = 37.7749, lng = -122.4194;
        const b = await getDailyBounty(lat, lng);
        setBounty(b);
      } catch (e) {
        toast.error("Bounty Link Offline");
      } finally {
        setLoadingBounty(false);
      }
    };
    fetchBounty();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleGearToggle = (item: string) => {
    playSound('click');
    setGearChecked(prev => {
      const next = { ...prev, [item]: !prev[item] };
      const allDone = Object.values(next).every(v => v === true);
      const newlyCompleted = allDone && !Object.values(prev).every(v => v === true);
      
      if (newlyCompleted) {
         const current = localStorage.getItem('gear_verified_count') ? parseInt(localStorage.getItem('gear_verified_count')!) : 0;
         localStorage.setItem('gear_verified_count', (current + 1).toString());
         playSound('success');
         toast.success("GEAR VERIFIED: +10 XP 'Prepared Geologist' bonus unlocked!", { icon: '🛡️' });
      }
      return next;
    });
  };

  const handleDeploy = () => {
    playSound('click');
    onNavigate('MAP');
  };

  const handleQuickScan = () => {
    playSound('click');
    onNavigate('SCANNER');
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="h-full bg-[#030508] p-6 overflow-y-auto no-scrollbar pb-24 font-sans selection:bg-cyan-500/30 relative"
    >
      <style>{`
        .bg-grid-glow { background-image: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 1px, transparent 1px); background-size: 24px 24px; }
        .liquid-bg { 
            background: radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(34, 211, 238, 0.08), transparent 40%);
            pointer-events: none;
            position: absolute;
            inset: 0;
            z-index: 0;
        }
        @keyframes float-gear { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes pulse-cyan { 0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(34, 211, 238, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); } }
      `}</style>
      
      <div className="absolute inset-0 bg-grid-glow pointer-events-none z-0" />
      <div className="liquid-bg" />

      {/* Greeting Section */}
      <div className="relative z-10 mb-8 flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-black text-white tracking-tight italic">Welcome back, {user.username}!</h1>
              <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mt-1">
                  Clover Status: Signal Locked 🔥
              </p>
          </div>
          <div className="text-right">
              <div className="text-lg font-black text-white">{xpToNext} XP</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">To Level {user.level + 1}</div>
          </div>
      </div>

      {/* Header Stat Strip */}
      <div className="flex gap-4 mb-8 relative z-10">
          <div className="flex-1 bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                  <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Streak</div>
                  <div className="text-2xl font-black text-white">{user.operatorStats?.scanStreak || 0} DAYS</div>
              </div>
          </div>
          <div className="flex-1 bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <Activity className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                  <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Next Career Rank</div>
                  <div className="text-2xl font-black text-white">{user.level + 1}</div>
              </div>
          </div>
      </div>

      {/* Primary Action: Quick Scan Area */}
      <button 
        onClick={handleQuickScan}
        onMouseEnter={() => playSound('hover')}
        className="w-full py-6 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/40 rounded-3xl mb-8 flex items-center justify-between px-6 group active:scale-[0.98] transition-all relative overflow-hidden animate-[pulse-cyan_4s_infinite] z-10"
      >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.05)_50%,transparent_75%)] bg-[length:200%_100%] animate-[data-stream_3s_linear_infinite]" />
          
          <div className="flex items-center gap-5 relative z-10">
              <div className="p-3.5 bg-cyan-500/20 rounded-2xl border border-cyan-400/30 group-hover:border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all">
                  <ScanLine className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <div className="text-left">
                  <div className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em]">Neural Optics Active</div>
                  <div className="text-2xl font-black text-white tracking-tighter">SCAN AREA</div>
              </div>
          </div>
          
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all relative z-10">
              <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
      </button>

      {/* Daily Bounty Card */}
      <div className="relative group mb-8 z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 blur-2xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-[#050a10]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                        <h2 className="text-xs font-black text-yellow-400 uppercase tracking-[0.3em]">Sector Bounty Active</h2>
                      </div>
                      <h3 className="text-3xl font-black text-white tracking-tighter">
                          {loadingBounty ? "SCANNING SECTOR..." : bounty?.targetMineral.toUpperCase()}
                      </h3>
                  </div>
                  <div className="bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                      {bounty?.xpMultiplier || 1.5}x Multiplier
                  </div>
              </div>

              {loadingBounty ? (
                  <div className="h-24 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
              ) : (
                  <>
                      <div className="space-y-4 mb-6">
                          <div className="flex items-start gap-3">
                              <MapPin size={16} className="text-cyan-400 mt-1" />
                              <div>
                                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Primary Zone</div>
                                  <div className="text-sm text-gray-200 font-medium">{bounty?.locationName}</div>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <Compass size={16} className="text-indigo-400 mt-1" />
                              <div>
                                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Clover's Intel</div>
                                  <div className="text-sm text-gray-400 leading-relaxed italic">"{bounty?.geologicalReason}"</div>
                              </div>
                          </div>
                      </div>
                      <button 
                        onClick={handleDeploy}
                        onMouseEnter={() => playSound('hover')}
                        className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 transition-all flex items-center justify-center gap-3"
                      >
                          Deploy to Sector <Zap size={14} />
                      </button>
                  </>
              )}
          </div>
      </div>

      {/* Safety Gear Checklist */}
      <div className="bg-[#0a0f18]/80 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Pre-Field Safety Protocol</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <GearItem label="Rock Hammer" icon={Hammer} checked={gearChecked.hammer} onToggle={() => handleGearToggle('hammer')} onHover={() => playSound('hover')} />
              <GearItem label="Eye Protection" icon={Eye} checked={gearChecked.goggles} onToggle={() => handleGearToggle('goggles')} onHover={() => playSound('hover')} />
              <GearItem label="Streak Plate" icon={Activity} checked={gearChecked.streakPlate} onToggle={() => handleGearToggle('streakPlate')} onHover={() => playSound('hover')} />
              <GearItem label="Hydration" icon={Compass} checked={gearChecked.water} onToggle={() => handleGearToggle('water')} onHover={() => playSound('hover')} />
          </div>
      </div>

      <div className="mt-8 p-6 border-t border-white/5 text-center relative z-10">
          <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.4em]">Clover Neural Core v4.5 // Online</p>
      </div>
    </div>
  );
};

const GearItem: React.FC<{ label: string, icon: any, checked: boolean, onToggle: () => void, onHover?: () => void }> = ({ label, icon: Icon, checked, onToggle, onHover }) => (
    <button 
        onClick={onToggle}
        onMouseEnter={onHover}
        className={`p-4 rounded-2xl border transition-all duration-300 border-box flex flex-col items-center gap-3 group relative overflow-hidden
            ${checked ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
    >
        <div className={`p-2 rounded-xl transition-all duration-300 ${checked ? 'bg-emerald-500 text-black scale-110' : 'bg-gray-800 text-gray-500'}`}>
            <Icon size={20} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${checked ? 'text-emerald-400' : 'text-gray-600'}`}>{label}</span>
        {checked && <CheckCircle2 size={12} className="absolute top-2 right-2 text-emerald-500" />}
    </button>
);
