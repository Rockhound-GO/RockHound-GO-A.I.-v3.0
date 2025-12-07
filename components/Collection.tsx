import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Rock, RockType } from '../types';
import { Search, ArrowUpDown, Loader2, Sparkles, Box, Star, Heart, Filter, Database, ScanLine, Grid3X3, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

// -- AUDIO ENGINE (Local) --
const useCollectionSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'hover' | 'click' | 'filter' | 'success') => {
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
    }
  }, []);

  return playSound;
};

interface CollectionProps {
  rocks: Rock[];
  onRockClick: (rock: Rock) => void;
  isLoading?: boolean;
}

type SortOrder = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'rarity_asc' | 'rarity_desc';
type RockStatusFilter = 'all' | 'approved' | 'pending';

export const Collection: React.FC<CollectionProps> = ({ rocks, onRockClick, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<RockType>>(new Set());
  const [filterStatus, setFilterStatus] = useState<RockStatusFilter>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteRockIds, setFavoriteRockIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc');
  const playSound = useCollectionSound();

  // Load favorites
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
        toast('Archived to standard storage', { icon: '📉', style: { background: '#374151', color: '#fff' } });
      } else {
        newFavorites.add(rockId);
        toast('Marked as Priority Asset', { icon: '🌟', style: { background: '#eab308', color: '#fff' } });
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

  const sortedAndFilteredRocks = useMemo(() => {
    let filtered = rocks.filter(rock => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = (rock.name.toLowerCase().includes(lowerSearch) || 
                             (rock.scientificName && rock.scientificName.toLowerCase().includes(lowerSearch)));
      const matchesType = filterTypes.size === 0 || filterTypes.has(rock.type);
      const matchesStatus = filterStatus === 'all' || rock.status === filterStatus;
      const matchesFavorite = !showFavorites || favoriteRockIds.has(rock.id);
      return matchesSearch && matchesType && matchesStatus && matchesFavorite;
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
  }, [rocks, searchTerm, filterTypes, filterStatus, showFavorites, favoriteRockIds, sortOrder]);

  return (
    <div className="h-full flex flex-col bg-[#030508] relative overflow-hidden font-sans selection:bg-cyan-500/30">
      <style>{`
        .mask-linear-fade { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .specimen-card { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
        .specimen-content { transform: translateZ(20px); }
        .holo-grid { background-image: radial-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px); background-size: 20px 20px; }
      `}</style>

      {/* Background Ambience */}
      <div className="absolute inset-0 holo-grid pointer-events-none opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* --- CONTROL DECK (Header) --- */}
      <div className="relative z-20 px-6 pt-20 pb-4 flex-none space-y-6 bg-gradient-to-b from-[#030508] via-[#030508]/90 to-transparent">
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
                    <Database className="w-6 h-6 text-cyan-500 animate-pulse" />
                    VAULT_DB
                </h2>
                <p className="text-[10px] text-cyan-500/60 font-mono tracking-[0.2em] mt-1">
                    SECURE STORAGE // {rocks.length} SPECIMENS LOGGED
                </p>
            </div>
            <div className="flex gap-2">
                {/* Visual Style Toggles (Non-functional for demo, just aesthetic) */}
                <button className="p-2 rounded bg-white/5 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"><Grid3X3 size={14} /></button>
                <button className="p-2 rounded bg-transparent text-gray-500 border border-gray-800 hover:text-white transition-colors"><Layers size={14} /></button>
            </div>
        </div>
        
        {/* Search Console */}
        <div className="relative group">
           <div className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
           <div className="relative flex items-center bg-[#0a0f18] border border-white/10 rounded-xl px-4 py-3 shadow-inner transition-all focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <Search className="w-4 h-4 text-cyan-500/50 mr-3" />
              <input 
                type="text" 
                placeholder="QUERY DATABASE..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); playSound('click'); }}
                className="bg-transparent border-none outline-none text-white text-xs font-mono flex-1 placeholder-gray-700 tracking-wider uppercase"
              />
              {/* Sort Dial */}
              <div className="relative flex items-center pl-4 border-l border-white/10">
                 <span className="text-[9px] text-gray-500 font-bold mr-2">SORT:</span>
                 <select
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value as SortOrder); playSound('filter'); }}
                  className="bg-transparent text-[10px] font-mono text-cyan-400 uppercase outline-none appearance-none pr-4 cursor-pointer hover:text-white transition-colors"
                >
                  <option value="date_desc" className="bg-gray-900">Newest</option>
                  <option value="date_asc" className="bg-gray-900">Oldest</option>
                  <option value="rarity_desc" className="bg-gray-900">Rarity ▼</option>
                  <option value="rarity_asc" className="bg-gray-900">Rarity ▲</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-cyan-500/50 pointer-events-none absolute right-0" />
              </div>
           </div>
        </div>
        
        {/* Tactical Filters */}
        <div className="flex flex-col gap-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
              <FilterButton 
                active={filterTypes.size === 0} 
                onClick={() => { setFilterTypes(new Set()); playSound('filter'); }} 
                label="ALL CLASSES"
              />
              {Object.values(RockType).filter(t => t !== 'Unknown').map(type => (
                <FilterButton 
                    key={type} 
                    active={filterTypes.has(type)} 
                    onClick={() => toggleTypeFilter(type)} 
                    label={type}
                />
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                    {['all', 'approved', 'pending'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setFilterStatus(status as RockStatusFilter); playSound('filter'); }}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                                filterStatus === status ? 'bg-cyan-900/50 text-cyan-300 shadow-sm border border-cyan-500/30' : 'text-gray-600 hover:text-gray-400'
                            }`}
                        >
                            {status === 'all' ? 'ALL' : status}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => { setShowFavorites(p => !p); playSound('filter'); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                        showFavorites ? 'bg-amber-900/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                >
                    <Heart className={`w-3 h-3 ${showFavorites ? 'fill-amber-400' : ''}`} /> PRIORITY
                </button>
            </div>
        </div>
      </div>

      {/* --- INVENTORY GRID --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-4 relative z-10">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-cyan-900 rounded-full" />
                <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <ScanLine className="absolute inset-0 m-auto text-cyan-500 w-6 h-6 animate-pulse" />
            </div>
            <p className="text-cyan-500/50 text-xs font-mono animate-pulse tracking-[0.3em]">DECRYPTING ARCHIVES...</p>
          </div>
        ) : rocks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 space-y-4">
            <div className="w-24 h-24 border border-dashed border-gray-600 rounded-2xl flex items-center justify-center bg-gray-900/50">
                <Box className="w-10 h-10 text-gray-600" />
            </div>
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">NO ASSETS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-max">
            {sortedAndFilteredRocks.map((rock) => (
                <SpecimenCard 
                    key={rock.id} 
                    rock={rock} 
                    onClick={() => { playSound('click'); onRockClick(rock); }} 
                    onToggleFavorite={(e) => toggleFavorite(rock.id, e)}
                    isFavorite={favoriteRockIds.has(rock.id)}
                    playSound={playSound}
                />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// -- MICRO COMPONENTS --

const FilterButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`whitespace-nowrap px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border backdrop-blur-sm ${
        active 
            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
            : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
        }`}
    >
        {label}
    </button>
);

const SpecimenCard: React.FC<{ rock: Rock; onClick: () => void; onToggleFavorite: (e: React.MouseEvent) => void; isFavorite: boolean; playSound: any }> = ({ rock, onClick, onToggleFavorite, isFavorite, playSound }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    
    // 3D Tilt Logic
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Gentle tilt
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    const isLegendary = rock.rarityScore > 80;
    const isRare = rock.rarityScore > 50 && rock.rarityScore <= 80;

    const borderColor = isLegendary ? 'border-amber-500/50' : isRare ? 'border-indigo-500/50' : 'border-white/10';
    const glowColor = isLegendary ? 'shadow-amber-500/20' : isRare ? 'shadow-indigo-500/20' : 'shadow-black/50';

    return (
        <div 
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={() => playSound('hover')}
            className={`specimen-card relative aspect-[3/4] rounded-xl border ${borderColor} bg-[#0a0f18] overflow-hidden cursor-pointer shadow-xl ${glowColor} group transition-all duration-300`}
        >
            {/* Holographic Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />
            
            {/* Rarity Particles */}
            {isLegendary && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.2),transparent_70%)] animate-pulse z-10 pointer-events-none" />}

            {/* Background Image with Parallax hint */}
            <div className="absolute inset-0 z-0">
                <img src={rock.imageUrl} alt={rock.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-[#0a0f18]/20 to-transparent" />
            </div>

            {/* Content Layer */}
            <div className="specimen-content absolute inset-0 p-4 flex flex-col justify-between z-20">
                <div className="flex justify-between items-start">
                    {/* ID Badge */}
                    <div className="px-2 py-1 rounded bg-black/60 border border-white/10 backdrop-blur-md text-[8px] font-mono text-cyan-400">
                        {rock.id.slice(0, 4).toUpperCase()}
                    </div>
                    
                    {/* Favorite Button */}
                    <button 
                        onClick={onToggleFavorite}
                        className={`p-1.5 rounded-full backdrop-blur-md transition-all ${isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-black/40 text-gray-500 hover:text-white'}`}
                    >
                        <Star className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLegendary ? 'bg-amber-500 animate-ping' : 'bg-cyan-500'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-cyan-300 transition-colors">
                            {rock.type}
                        </span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors">
                        {rock.name}
                    </h3>
                    <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-2">
                        <span className="text-[9px] text-gray-600 font-mono">{new Date(rock.dateFound).toLocaleDateString()}</span>
                        {isLegendary && <Sparkles className="w-3 h-3 text-amber-400" />}
                    </div>
                </div>
            </div>
        </div>
    );
};