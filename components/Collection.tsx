
import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { Rock, RockType } from '../types';
import { Search, ArrowUpDown, Loader2, Sparkles, Box, Star, Database, ScanLine, Plus, X, Target, Activity, Cpu, ShieldCheck, Microscope, Atom } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getGlobalAudioContext, registerSource } from '../services/audioUtils';

function useInView(options: IntersectionObserverInit = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), options);
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, [options]);
  return [ref, inView] as const;
}

const useCollectionSound = () => {
  return useCallback((type: string) => {
    const ctx = getGlobalAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'hover') {
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
    } else {
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
    }
    osc.start(); osc.stop(now + 0.1);
  }, []);
};

export const Collection: React.FC<any> = ({ 
    rocks, onRockClick, isLoading, onStartComparisonMode, onFinalizeComparison, preSelectedRocks, isComparisonModeActive: propIsComparisonModeActive 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<RockType>>(new Set<RockType>());
  const [favoriteRockIds, setFavoriteRockIds] = useState<Set<string>>(new Set<string>());
  const [sortOrder, setSortOrder] = useState('date_desc');
  const playSound = useCollectionSound();

  const [localIsComparisonMode, setLocalIsComparisonMode] = useState(propIsComparisonModeActive);
  const [comparisonSelectionOrder, setComparisonSelectionOrder] = useState<string[]>(() => preSelectedRocks.map((r: any) => r.id));
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalIsComparisonMode(propIsComparisonModeActive); }, [propIsComparisonModeActive]);
  useEffect(() => { setComparisonSelectionOrder(preSelectedRocks.map((r: any) => r.id)); }, [preSelectedRocks]);

  const sortedAndFilteredRocks = useMemo(() => {
    return rocks.filter((r: any) => {
      const match = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = filterTypes.size === 0 || filterTypes.has(r.type);
      return match && typeMatch;
    }).sort((a: any, b: any) => b.dateFound - a.dateFound);
  }, [rocks, searchTerm, filterTypes]);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(sortedAndFilteredRocks.length / 2),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  const handleToggleSelection = useCallback((id: string) => {
    setComparisonSelectionOrder(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
    playSound('click');
  }, [playSound]);

  return (
    <div className="h-full flex flex-col bg-[#030508] relative overflow-hidden">
      <div className="relative z-20 px-6 pt-20 pb-4 space-y-4">
        <h2 className="text-3xl font-black text-white tracking-widest font-mono flex items-center gap-3">
          <Database className="w-6 h-6 text-cyan-500 animate-pulse" /> VAULT
        </h2>
        <div className="flex gap-2">
            <input 
                type="text" placeholder="SEARCH_ARCHIVE..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white flex-1"
            />
            <button onClick={() => setLocalIsComparisonMode(!localIsComparisonMode)} className={`p-3 rounded-xl border ${localIsComparisonMode ? 'bg-purple-500/20 border-purple-500' : 'border-white/10'}`}><Plus size={16} /></button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {Object.values(RockType).map(type => (
            <button key={type} onClick={() => setFilterTypes(prev => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; })} className={`px-4 py-2 rounded-xl text-[9px] font-black border ${filterTypes.has(type) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-black/60 border-white/5 text-gray-500'}`}>{type}</button>
          ))}
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto no-scrollbar px-6">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(row => {
             const items = sortedAndFilteredRocks.slice(row.index * 2, row.index * 2 + 2);
             return (
               <div key={row.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${row.size}px`, transform: `translateY(${row.start}px)` }} className="grid grid-cols-2 gap-4 py-2">
                  {items.map(rock => (
                    <SpecimenCard 
                        key={rock.id} rock={rock} 
                        onClick={() => localIsComparisonMode ? handleToggleSelection(rock.id) : onRockClick(rock)} 
                        isSelected={comparisonSelectionOrder.includes(rock.id)}
                        selectionIndex={comparisonSelectionOrder.indexOf(rock.id)}
                    />
                  ))}
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

const SpecimenCard = memo(({ rock, onClick, isSelected, selectionIndex }: any) => {
    const [ref, inView] = useInView({ threshold: 0.1 });
    return (
        <div ref={ref} onClick={onClick} className={`relative aspect-[3/4] rounded-2xl border ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-white/5'} bg-gray-900/40 overflow-hidden transition-all duration-300 active:scale-95`}>
            {inView && <img src={rock.imageUrl} className="w-full h-full object-cover opacity-60" />}
            {isSelected && <div className="absolute top-2 left-2 bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded">SIG_{selectionIndex+1}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            <div className="absolute bottom-4 left-4">
                <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{rock.type}</span>
                <h3 className="text-xs font-bold text-white uppercase">{rock.name}</h3>
            </div>
            {rock.type === RockType.SYNTHETIC && <Atom size={12} className="absolute top-2 right-2 text-indigo-400 animate-spin-slow" />}
        </div>
    );
});
