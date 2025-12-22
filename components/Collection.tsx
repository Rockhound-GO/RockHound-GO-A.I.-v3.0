import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Rock, RockType } from '../types';
import { Search, ArrowUpDown, Loader2, Sparkles, Box, Star, Database, ScanLine, Plus, X, Target, Activity, Cpu, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVirtualizer } from '@tanstack/react-virtual';

// -- CUSTOM HOOK: useInView (Lazy Loading Utility) --
function useInView(options: IntersectionObserverInit = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, inView] as const;
}

// -- AUDIO ENGINE (Local) --
const useCollectionSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'hover' | 'click' | 'filter' | 'success' | 'select' | 'deselect') => {
    if (!audioCtx.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx.current = new AudioContextClass();
      }
    }
    const ctx = audioCtx.current;
    if (ctx && ctx.state === 'suspended') ctx.resume();

    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case 'hover':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(500, now + 0.05);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'click':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'filter':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'success':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'select':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        case 'deselect':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(500, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
            break;
    }
  }, []);

  return playSound;
};

interface CollectionProps {
  rocks: Rock[];
  onRockClick: (rock: Rock) => void;
  isLoading?: boolean;
  onStartComparisonMode: (initialRock?: Rock) => void;
  onFinalizeComparison: (rocks: Rock[]) => void;
  preSelectedRocks: Rock[];
  isComparisonModeActive: boolean;
}

type SortOrder = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'rarity_asc' | 'rarity_desc';

export const Collection: React.FC<CollectionProps> = ({ 
    rocks, 
    onRockClick, 
    isLoading = false,
    onStartComparisonMode,
    onFinalizeComparison,
    preSelectedRocks,
    isComparisonModeActive: propIsComparisonModeActive
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<RockType>>(new Set<RockType>());
  const [favoriteRockIds, setFavoriteRockIds] = useState<Set<string>>(new Set<string>());
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc');
  const playSound = useCollectionSound();

  const [localIsComparisonMode, setLocalIsComparisonMode] = useState(propIsComparisonModeActive);
  const [comparisonSelectionOrder, setComparisonSelectionOrder] = useState<string[]>(() => 
    preSelectedRocks.map(rock => rock.id)
  );

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalIsComparisonMode(propIsComparisonModeActive);
  }, [propIsComparisonModeActive]);

  useEffect(() => {
    setComparisonSelectionOrder(preSelectedRocks.map(rock => rock.id));
  }, [preSelectedRocks]);

  useEffect(() => {
    const storedFavorites = localStorage.getItem('rockhound_favorites');
    if (storedFavorites) setFavoriteRockIds(new Set(JSON.parse(storedFavorites)));
  }, []);

  useEffect(() => {
    localStorage.setItem('rockhound_favorites', JSON.stringify(Array.from(favoriteRockIds)));
  }, [favoriteRockIds]);

  const toggleFavorite = (rockId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    playSound('success');
    setFavoriteRockIds(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(rockId)) {
        newFavorites.delete(rockId);
      } else {
        newFavorites.add(rockId);
        toast('Marked as Priority Asset', { icon: '🌟' });
      }
      return newFavorites;
    });
  };

  const toggleTypeFilter = (type: RockType) => {
    playSound('filter');
    setFilterTypes(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) newFilters.delete(type);
      else newFilters.add(type);
      return newFilters;
    });
  };

  const handleToggleComparisonSelection = useCallback((rockId: string) => {
    setComparisonSelectionOrder(prev => {
      const isSelected = prev.includes(rockId);
      if (isSelected) {
        playSound('deselect');
        return prev.filter(id => id !== rockId);
      } else {
        if (prev.length < 3) {
          playSound('select');
          return [...prev, rockId];
        } else {
          toast.error("COMPARISON OVERLOAD: Max 3 specimens.", { id: 'comparison-limit' });
          playSound('click');
          return prev;
        }
      }
    });
  }, [playSound]);

  const handleToggleComparisonMode = () => {
    playSound('click');
    if (localIsComparisonMode) {
      setComparisonSelectionOrder([]);
      setLocalIsComparisonMode(false);
      onStartComparisonMode(undefined);
    } else {
      setLocalIsComparisonMode(true);
    }
  };

  const handleFinalizeComparison = () => {
    playSound('click');
    const rocksToCompare = comparisonSelectionOrder.map(id => rocks.find(r => r.id === id)).filter(Boolean) as Rock[];
    if (rocksToCompare.length < 2) {
      toast.error("COMPARISON REQUIRED: Select at least 2 specimens.", { id: 'comparison-min' });
      return;
    }
    onFinalizeComparison(rocksToCompare);
    setComparisonSelectionOrder([]);
    setLocalIsComparisonMode(false);
  };

  const sortedAndFilteredRocks = useMemo(() => {
    let filtered = rocks.filter(rock => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = (rock.name.toLowerCase().includes(lowerSearch) || 
                             (rock.scientificName && rock.scientificName.toLowerCase().includes(lowerSearch)));
      const matchesType = filterTypes.size === 0 || filterTypes.has(rock.type);
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'date_asc': return a.dateFound - b.dateFound;
        case 'date_desc': return b.dateFound - a.dateFound;
        case 'rarity_asc': return a.rarityScore - b.rarityScore;
        case 'rarity_desc': return b.rarityScore - a.rarityScore;
        default: return b.dateFound - a.dateFound;
      }
    });
  }, [rocks, searchTerm, filterTypes, sortOrder]);

  const numColumns = 2;
  const numRows = Math.ceil(sortedAndFilteredRocks.length / numColumns);

  // --- VIRTUAL SCROLL ENGINE ---
  const rowVirtualizer = useVirtualizer({
    count: numRows,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 280, []), // Adjusted for padding and gaps
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const numSelected = comparisonSelectionOrder.length;

  return (
    <div className="h-full flex flex-col bg-[#030508] relative overflow-hidden font-sans selection:bg-cyan-500/30">
      <style>{`
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .holo-grid { background-image: radial-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px); background-size: 24px 24px; }
        @keyframes selection-pulse { 0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); } 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); } }
        .animate-selection { animation: selection-pulse 2s infinite; }
        .virtual-row { width: 100%; display: grid; grid-template-cols: repeat(2, 1fr); gap: 1rem; padding: 0.5rem 0; }
      `}</style>

      <div className="absolute inset-0 holo-grid pointer-events-none opacity-40" />

      {/* --- HUD HEADER --- */}
      <div className="relative z-20 px-6 pt-20 pb-4 flex-none space-y-6 bg-gradient-to-b from-[#030508] via-[#030508]/90 to-transparent">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
                    <Database className="w-6 h-6 text-cyan-500 animate-pulse" />
                    VAULT_DB
                </h2>
                <div className="flex items-center gap-3 mt-1">
                    <div className="text-[8px] text-cyan-500/60 font-mono tracking-widest uppercase flex items-center gap-1.5">
                        <Activity size={10} className="text-cyan-500" />
                        LOAD: 0.82MS
                    </div>
                    <div className="h-3 w-[1px] bg-white/10" />
                    <div className="text-[8px] text-cyan-500/60 font-mono tracking-widest uppercase flex items-center gap-1.5">
                        <Cpu size={10} className="text-cyan-500" />
                        INDEXED: {rocks.length}
                    </div>
                </div>
            </div>
            
            <button 
                onClick={handleToggleComparisonMode}
                className={`px-4 py-2 rounded-lg transition-all duration-300 border flex items-center gap-2 group relative overflow-hidden
                    ${localIsComparisonMode 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                        : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
            >
                <Plus size={14} className={`transition-transform duration-300 ${localIsComparisonMode ? 'rotate-45 text-purple-400' : ''}`} />
                <span className="text-[10px] font-black tracking-widest uppercase">Compare</span>
            </button>
        </div>
        
        {/* Tactical Search Console */}
        <div className="flex gap-2">
            <div className="relative flex-1 group">
               <div className="absolute inset-0 bg-cyan-500/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative flex items-center bg-black/40 border border-white/5 rounded-xl px-4 py-3 shadow-inner transition-all focus-within:border-cyan-500/40">
                  <Search className="w-4 h-4 text-cyan-500/30 mr-3" />
                  <input 
                    type="text" 
                    placeholder="SCAN_ARCHIVE_QUERY..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-white text-xs font-mono flex-1 placeholder-gray-800 tracking-widest uppercase"
                  />
               </div>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-xl px-3 flex items-center group hover:border-cyan-500/30 transition-colors">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="bg-transparent text-[10px] font-mono text-cyan-500/70 uppercase outline-none cursor-pointer group-hover:text-cyan-400 transition-colors"
                >
                  <option value="date_desc" className="bg-gray-950">New</option>
                  <option value="date_asc" className="bg-gray-950">Old</option>
                  <option value="rarity_desc" className="bg-gray-950">Rare</option>
                  <option value="rarity_asc" className="bg-gray-950">Common</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-cyan-500/30 ml-2" />
            </div>
        </div>
        
        {/* Tactical Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade pb-1">
          <FilterButton active={filterTypes.size === 0} onClick={() => setFilterTypes(new Set<RockType>())} label="ALL_SPECIMENS" />
          {Object.values(RockType).filter(t => t !== 'Unknown').map(type => (
            <FilterButton key={type} active={filterTypes.has(type)} onClick={() => toggleTypeFilter(type)} label={type} />
          ))}
        </div>
      </div>

      {/* --- VIRTUALIZED INVENTORY GRID --- */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto no-scrollbar px-6 relative z-10 scroll-smooth"
      >
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            <p className="text-cyan-500/50 text-[10px] font-mono animate-pulse tracking-[0.4em]">CONNECTING_TO_CORE...</p>
          </div>
        ) : sortedAndFilteredRocks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
            <Box className="w-16 h-16 text-gray-500" />
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">NO_RECORDS_MATCH_SIG</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualRows.map((virtualRow) => {
              const startIndex = virtualRow.index * numColumns;
              const endIndex = Math.min(startIndex + numColumns, sortedAndFilteredRocks.length);
              const rowRocks = sortedAndFilteredRocks.slice(startIndex, endIndex);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="virtual-row"
                >
                  {rowRocks.map((rock) => (
                    <SpecimenCard 
                        key={rock.id} 
                        rock={rock} 
                        onClick={() => { 
                            if (!localIsComparisonMode) { 
                                playSound('click'); 
                                onRockClick(rock); 
                            }
                        }} 
                        onToggleFavorite={(e) => toggleFavorite(rock.id, e)}
                        isFavorite={favoriteRockIds.has(rock.id)}
                        playSound={playSound}
                        isComparisonMode={localIsComparisonMode}
                        selectionIndex={comparisonSelectionOrder.indexOf(rock.id)}
                        onToggleSelection={() => handleToggleComparisonSelection(rock.id)}
                    />
                  ))}
                  {/* Fill empty grid cell if odd number */}
                  {rowRocks.length < numColumns && <div className="flex-1" />}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Bottom Spacer for Fixed Bar */}
        <div className="h-32" />
      </div>

      {/* Floating Tactical Comparison Bar */}
      {localIsComparisonMode && numSelected > 0 && (
        <div className="fixed bottom-safe mb-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/90 backdrop-blur-2xl border border-purple-500/40 rounded-2xl p-4 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 duration-500 ring-1 ring-white/5">
            <div className="flex -space-x-3 items-center pr-4 border-r border-white/10">
                {comparisonSelectionOrder.map(id => {
                    const r = rocks.find(rock => rock.id === id);
                    return r ? (
                        <div key={id} className="w-10 h-10 rounded-xl border-2 border-purple-500 overflow-hidden bg-black shadow-lg relative group">
                            <img src={r.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-purple-500/20 group-hover:opacity-0 transition-opacity" />
                        </div>
                    ) : null;
                })}
                {Array.from({ length: 3 - numSelected }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-xl border border-dashed border-white/10 flex items-center justify-center bg-white/5 text-white/20">
                        <Box size={14} />
                    </div>
                ))}
            </div>
            
            <div className="flex gap-2 items-center">
                <button 
                    onClick={() => { playSound('deselect'); setComparisonSelectionOrder([]); setLocalIsComparisonMode(false); onStartComparisonMode(undefined); }}
                    className="p-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Abort Selection"
                >
                    <X size={20} />
                </button>
                <button 
                    onClick={handleFinalizeComparison}
                    disabled={numSelected < 2}
                    className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 transition-all
                        ${numSelected >= 2 
                            ? 'bg-purple-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:bg-purple-500 active:scale-95' 
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                >
                    <Target size={16} className={numSelected >= 2 ? 'animate-pulse' : ''} />
                    Finalize Specimen Delta ({numSelected}/3)
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

// -- MICRO COMPONENTS --

const FilterButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all border backdrop-blur-md ${
        active 
            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
            : 'bg-black/60 border-white/5 text-gray-600 hover:border-white/20 hover:text-gray-400'
        }`}
    >
        {label}
    </button>
);

interface SpecimenCardProps {
    rock: Rock;
    onClick: () => void;
    onToggleFavorite: (e: React.MouseEvent) => void;
    isFavorite: boolean;
    playSound: (type: 'hover' | 'click' | 'filter' | 'success' | 'select' | 'deselect') => void;
    isComparisonMode: boolean;
    selectionIndex: number;
    onToggleSelection: () => void;
}

const SpecimenCard: React.FC<SpecimenCardProps> = ({ 
    rock, 
    onClick, 
    onToggleFavorite, 
    isFavorite, 
    playSound,
    isComparisonMode,
    selectionIndex,
    onToggleSelection
}) => {
    const isSelected = selectionIndex !== -1;
    const [inViewRef, isInView] = useInView({ threshold: 0.05, rootMargin: '200px' });
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    
    const handleClick = (e: React.MouseEvent) => {
        if (isComparisonMode) {
            e.stopPropagation();
            onToggleSelection();
        } else {
            onClick();
        }
    };

    const isLegendary = rock.rarityScore > 80;
    const borderColor = isSelected ? 'border-purple-500' : 'border-white/5';

    return (
        <div ref={inViewRef} className="w-full h-full">
            <div 
                onClick={handleClick}
                onMouseEnter={() => playSound('hover')}
                className={`relative aspect-[3/4.2] rounded-2xl border ${borderColor} bg-[#0a0f18]/60 overflow-hidden cursor-pointer transition-all duration-500 group
                    ${isSelected ? 'animate-selection z-10' : 'hover:border-cyan-500/30'}
                    ${isComparisonMode && !isSelected ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                `}
            >
                {/* Tactical Selection HUD Overlay */}
                {isSelected && (
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500" />
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-purple-600 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter">
                            <ShieldCheck size={10} />
                            SPECIMEN_LOCKED_{selectionIndex + 1}
                        </div>
                    </div>
                )}

                {/* Imagery Layer */}
                <div className="absolute inset-0 z-0 bg-black/40">
                    {!isImageLoaded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050a10]">
                            <ScanLine className="w-6 h-6 text-cyan-500/20 animate-pulse" />
                            <div className="w-12 h-1 bg-white/5 mt-2 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500/50 w-1/2 animate-[scan-v_1s_infinite_linear]" />
                            </div>
                        </div>
                    )}
                    {isInView && (
                        <img 
                            src={rock.imageUrl} 
                            alt={rock.name} 
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-1000 ${isSelected ? 'scale-110 blur-[1px]' : 'group-hover:scale-105'} ${!isImageLoaded ? 'opacity-0' : 'opacity-60'}`} 
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-black/20" />
                </div>

                {/* Content Layer */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between z-20">
                    <div className="flex justify-between items-start">
                        <div className={`px-2 py-1 rounded border backdrop-blur-xl text-[8px] font-mono transition-colors ${isSelected ? 'bg-purple-900/40 border-purple-500 text-purple-300' : 'bg-black/60 border-white/5 text-cyan-500/60'}`}>
                            #{rock.id.slice(0, 4).toUpperCase()}
                        </div>
                        
                        {!isComparisonMode && (
                            <button 
                                onClick={onToggleFavorite}
                                className={`p-2 rounded-full backdrop-blur-xl transition-all ${isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-black/40 text-gray-600 hover:text-white hover:bg-white/10'}`}
                            >
                                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className={`w-1 h-1 rounded-full ${isLegendary ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]'}`} />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-cyan-400/80 transition-colors">
                                {rock.type} CLASS
                            </span>
                        </div>
                        <h3 className={`font-bold text-base leading-tight transition-colors ${isSelected ? 'text-purple-300' : 'text-white group-hover:text-cyan-400'}`}>
                            {rock.name}
                        </h3>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-1 opacity-60">
                            <span className="text-[8px] text-gray-500 font-mono tracking-widest">{new Date(rock.dateFound).toLocaleDateString()}</span>
                            {isLegendary && <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />}
                        </div>
                    </div>
                </div>

                {/* Interactive Scan Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-500/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </div>
        </div>
    );
};