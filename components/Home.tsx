
import React, { useState, useEffect } from 'react';
import { User, DailyBounty } from '../types';
import { api } from '../services/api';
import { getDailyBounty } from '../services/geminiService';
import { Zap, Flame, ShieldCheck, Hammer, Eye, Compass, MapPin, Activity, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface HomeProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
  const [bounty, setBounty] = useState<DailyBounty | null>(null);
  const [loadingBounty, setLoadingBounty] = useState(true);
  const [gearChecked, setGearChecked] = useState<Record<string, boolean>>({
    hammer: false,
    goggles: false,
    streakPlate: false,
    water: false
  });

  useEffect(() => {
    const fetchBounty = async () => {
      try {
        // Simple mock location if geolocation fails
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

  const handleGearToggle = (item: string) => {
    setGearChecked(prev => {
      const next = { ...prev, [item]: !prev[item] };
      const allDone = Object.values(next).every(v => v === true);
      if (allDone && !prev[item]) {
         // Persistent Achievement Tracking
         const current = localStorage.getItem('gear_verified_count') ? parseInt(localStorage.getItem('gear_verified_count')!) : 0;
         localStorage.setItem('gear_verified_count', (current + 1).toString());
         toast.success("GEAR VERIFIED: +10 XP 'Prepared Geologist' bonus unlocked!", { icon: '🛡️' });
      }
      return next;
    });
  };

  return (
    <div className="h-full bg-[#030508] p-6 overflow-y-auto no-scrollbar pb-24 font-sans selection:bg-cyan-500/30">
      <style>{`
        .bg-grid-glow { background-image: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 1px, transparent 1px); background-size: 24px 24px; }
        @keyframes float-gear { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>
      
      <div className="absolute inset-0 bg-grid-glow pointer-events-none" />

      {/* Header Stat Strip */}
      <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-[#0a0f18] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                  <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Streak</div>
                  <div className="text-2xl font-black text-white">{user.operatorStats?.scanStreak || 0} DAYS</div>
              </div>
          </div>
          <div className="flex-1 bg-[#0a0f18] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                  <Activity className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                  <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Level Progression</div>
                  <div className="text-2xl font-black text-white">{user.xp % 100}%</div>
              </div>
          </div>
      </div>

      {/* Daily Bounty Card */}
      <div className="relative group mb-8">
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
                        onClick={() => onNavigate('MAP')}
                        className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 transition-all flex items-center justify-center gap-3"
                      >
                          Deploy to Sector <Zap size={14} />
                      </button>
                  </>
              )}
          </div>
      </div>

      {/* Safety Gear Checklist */}
      <div className="bg-[#0a0f18] border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Pre-Field Safety Protocol</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <GearItem label="Rock Hammer" icon={Hammer} checked={gearChecked.hammer} onToggle={() => handleGearToggle('hammer')} />
              <GearItem label="Eye Protection" icon={Eye} checked={gearChecked.goggles} onToggle={() => handleGearToggle('goggles')} />
              <GearItem label="Streak Plate" icon={Activity} checked={gearChecked.streakPlate} onToggle={() => handleGearToggle('streakPlate')} />
              <GearItem label="Hydration" icon={Compass} checked={gearChecked.water} onToggle={() => handleGearToggle('water')} />
          </div>
      </div>

      <div className="mt-8 p-6 border-t border-white/5 text-center">
          <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.4em]">Clover Neural Core v4.5 // Online</p>
      </div>
    </div>
  );
};

const GearItem: React.FC<{ label: string, icon: any, checked: boolean, onToggle: () => void }> = ({ label, icon: Icon, checked, onToggle }) => (
    <button 
        onClick={onToggle}
        className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 group relative overflow-hidden
            ${checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
    >
        <div className={`p-2 rounded-xl transition-all duration-300 ${checked ? 'bg-emerald-500 text-black scale-110' : 'bg-gray-800 text-gray-500'}`}>
            <Icon size={20} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${checked ? 'text-emerald-400' : 'text-gray-600'}`}>{label}</span>
        {checked && <CheckCircle2 size={12} className="absolute top-2 right-2 text-emerald-500" />}
    </button>
);
