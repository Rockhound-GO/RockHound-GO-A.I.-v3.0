import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Rock } from '../types';
// Fixed: Added Activity, Loader2, and ShieldCheck to lucide-react imports
import { ArrowLeft, Trash2, Volume2, PauseCircle, Layers, Zap, Microscope, TrendingUp, BarChart4, Gem, ChevronRight, Lock, Dna, Info, Activity, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { refineSpecimen, generateRockSpeech } from '../services/geminiService';

const Rock3DViewer = lazy(() => import('./Rock3DModel').then(m => ({ default: m.Rock3DViewer })));

export const RockDetails: React.FC<{ rock: Rock; onBack: () => void; onDelete: (id: string) => void; onUpdateRock: (rock: Rock) => void }> = ({ rock, onBack, onDelete, onUpdateRock }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'DATA' | 'MSc' | 'REFINE'>('DATA');
  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async () => {
    if (rock.refinementLevel >= 3) return;
    setIsRefining(true);
    try {
      const updates = await refineSpecimen(rock);
      const updatedRock = { ...rock, ...updates, refinementLevel: rock.refinementLevel + 1 };
      onUpdateRock(updatedRock);
      toast.success(`REFINE COMPLETE: LEVEL ${updatedRock.refinementLevel} UNLOCKED`, { icon: '💎' });
    } catch { toast.error("Refinement Signal Lost"); }
    finally { setIsRefining(false); }
  };

  return (
    <div className="h-full flex flex-col bg-[#030508] overflow-y-auto no-scrollbar pb-24 relative font-sans">
      <div className="relative h-[38vh] flex-none overflow-hidden">
         <img src={rock.imageUrl} className="w-full h-full object-cover opacity-40 scale-125 blur-md absolute" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#030508] via-[#030508]/60 to-transparent" />
         
         <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <button onClick={onBack} className="absolute top-12 left-6 p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl z-20 active:scale-90 transition-transform">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="relative z-10 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em] rounded-full border border-indigo-500/30">
                        {rock.type} Asset
                    </span>
                    <span className="px-3 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-[0.4em] rounded-full border border-cyan-500/30">
                        Level {rock.refinementLevel}
                    </span>
                </div>
                <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">{rock.name}</h1>
            </div>
         </div>
      </div>

      <div className="flex px-6 gap-2 mt-6 overflow-x-auto no-scrollbar">
          <TabBtn active={activeTab === 'DATA'} onClick={() => setActiveTab('DATA')} label="Specimen" icon={Zap} />
          <TabBtn active={activeTab === 'MSc'} onClick={() => setActiveTab('MSc')} label="Intelligence" icon={Microscope} />
          <TabBtn active={activeTab === 'REFINE'} onClick={() => setActiveTab('REFINE')} label="Refine" icon={Gem} color="indigo" />
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'DATA' && (
            <div className="animate-in fade-in duration-500 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <DataCard label="Market Value" value={`${rock.estimatedValue} CR`} icon={TrendingUp} color="yellow" />
                    <DataCard label="Hardness" value={`${rock.hardness} Mohs`} icon={Info} color="cyan" />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <p className="text-gray-300 text-lg leading-relaxed mb-6 font-medium">"{rock.description}"</p>
                    <div className="h-16 flex items-end gap-1 mb-3 opacity-50">
                        {rock.spectralWaveform.map((v, i) => (
                            <div key={i} className="flex-1 bg-cyan-400 rounded-t-sm animate-pulse" style={{ height: `${v * 100}%`, animationDelay: `${i * 0.05}s` }} />
                        ))}
                    </div>
                </div>

                <div className="h-[45vh] bg-black border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl">
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-500 font-mono text-xs animate-pulse">SYNCHRONIZING VOXELS...</div>}>
                        <Rock3DViewer modelUrl="https://aistudiocdn.com/assets/rock.glb" rock={rock} />
                    </Suspense>
                </div>
            </div>
        )}

        {activeTab === 'MSc' && (
            <div className="animate-in slide-in-from-right duration-500 space-y-6">
                <InsightSection title="Clover's Analysis" text={rock.expertExplanation} icon={Microscope} color="indigo" />
                
                {rock.refinementLevel >= 2 ? (
                    <InsightSection title="Geological Lore" text={rock.geologicalLore!} icon={Dna} color="emerald" />
                ) : (
                    <LockedSection level={2} label="Historical Lore" />
                )}

                {rock.refinementLevel >= 3 ? (
                    <InsightSection title="Molecular Structure" text={rock.molecularStructure!} icon={Activity} color="purple" />
                ) : (
                    <LockedSection level={3} label="Molecular Data" />
                )}
            </div>
        )}

        {activeTab === 'REFINE' && (
            <div className="animate-in zoom-in duration-500 space-y-8">
                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Specimen Refinement</h3>
                    <p className="text-gray-500 text-sm">Deepen scientific analysis using Laboratory Credits.</p>
                </div>

                <div className="relative flex justify-center">
                   <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
                   <div className="relative w-48 h-48 rounded-full border-4 border-dashed border-indigo-500/30 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                        <Gem className="w-16 h-16 text-indigo-400" />
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-black text-white">{rock.refinementLevel}/3</span>
                   </div>
                </div>

                <div className="space-y-4">
                    <RefineStep level={1} active={rock.refinementLevel >= 1} label="Basic Spectral Signature" />
                    <RefineStep level={2} active={rock.refinementLevel >= 2} label="Unlock Historical Lore" />
                    <RefineStep level={3} active={rock.refinementLevel >= 3} label="Analyze Molecular Geometry" />
                </div>

                <button 
                    disabled={isRefining || rock.refinementLevel >= 3} 
                    onClick={handleRefine}
                    className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.4em] text-sm transition-all flex items-center justify-center gap-4 ${rock.refinementLevel >= 3 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-95'}`}
                >
                    {isRefining ? <Loader2 className="animate-spin" /> : rock.refinementLevel >= 3 ? <ShieldCheck /> : <Zap />}
                    {isRefining ? 'REFRACTING...' : rock.refinementLevel >= 3 ? 'MAX_REFINEMENT_REACHED' : 'EXECUTE_REFINEMENT (500 CR)'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon: Icon, color = 'cyan' }: any) => (
    <button onClick={onClick} className={`flex-none px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${active ? `bg-${color}-500 text-black shadow-lg` : 'bg-white/5 text-gray-500 border border-white/10'}`}>
        <Icon size={14} /> {label}
    </button>
);

const DataCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
        <div className={`flex items-center gap-2 text-${color}-400 mb-2`}>
            <Icon size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
        </div>
        <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
    </div>
);

const InsightSection = ({ title, text, icon: Icon, color }: any) => (
    <div className={`bg-${color}-500/5 border border-${color}-500/20 rounded-3xl p-6 space-y-4`}>
        <div className={`flex items-center gap-3 text-${color}-400`}>
            <Icon size={18} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <p className="text-gray-200 text-base leading-relaxed font-medium">"{text}"</p>
    </div>
);

const LockedSection = ({ level, label }: any) => (
    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 grayscale">
        <Lock className="w-8 h-8 text-gray-700" />
        <div>
            <h4 className="text-gray-500 text-xs font-black uppercase">Level {level} Required</h4>
            <p className="text-[10px] text-gray-700 font-mono mt-1">REFINE_SPECIMEN_TO_UNLOCK_{label.toUpperCase()}</p>
        </div>
    </div>
);

const RefineStep = ({ level, active, label }: any) => (
    <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${active ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-black border-white/5 text-gray-600'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${active ? 'bg-indigo-500 text-black' : 'bg-gray-900'}`}>{level}</div>
            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
        {active && <ShieldCheck size={18} />}
    </div>
);
