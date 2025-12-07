
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Rock, RockType } from '../types';
import { Search, Filter, ArrowUpDown, Loader2, Sparkles, Box, Star, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({});

  useEffect(() => {
    const storedFavorites = localStorage.getItem('rockhound_favorites');
    if (storedFavorites) {
      setFavoriteRockIds(new Set(JSON.parse(storedFavorites)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rockhound_favorites', JSON.stringify(Array.from(favoriteRockIds)));
  }, [favoriteRockIds]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const scrollY = scrollContainerRef.current.scrollTop;
    const viewportHeight = scrollContainerRef.current.clientHeight;

    Object.entries(imageRefs.current).forEach(([, img]) => {
      if (img instanceof HTMLImageElement && img.parentElement) {
        const cardTop = img.parentElement.offsetTop - scrollY;
        const cardBottom = cardTop + img.parentElement.clientHeight;

        if (cardBottom > 0 && cardTop < viewportHeight) {
          const center = cardTop + img.parentElement.clientHeight / 2;
          const viewportCenter = viewportHeight / 2;
          const offset = (center - viewportCenter) * 0.05;

          img.style.transform = `translateY(${offset}px)`;
        }
      }
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); 
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [rocks, handleScroll]);

  const toggleFavorite = (rockId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavoriteRockIds(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(rockId)) {
        newFavorites.delete(rockId);
        toast('Removed from favorites', { icon: '💔', style: { background: '#ef4444', color: '#fff' } });
      } else {
        newFavorites.add(rockId);
        toast('Added to favorites!', { icon: '🌟', style: { background: '#eab308', color: '#fff' } });
      }
      return newFavorites;
    });
  };

  const toggleTypeFilter = (type: RockType) => {
    setFilterTypes(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const clearTypeFilters = () => {
    setFilterTypes(new Set());
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
    <div className={`h-full flex flex-col px-4 pt-20 pb-24 space-y-6 overflow-hidden`}>
      <div className={`space-y-4 flex-none z-10`}>
        <h2 className={`text-2xl font-bold text-white tracking-widest uppercase mb-1 text-glow`}>Vault</h2>
        
        {/* Search Bar & Sort */}
        <div className={`relative group`}>
           <div className={`absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
           <div className={`relative flex items-center glass-panel rounded-2xl px-4 py-3 shadow-lg`}>
              <Search className={`w-4 h-4 text-gray-400 mr-3`} />
              <input 
                type="text" 
                placeholder="SEARCH DATABASE..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`bg-transparent border-none outline-none text-white text-xs font-mono flex-1 placeholder-gray-600 tracking-wider`}
              />
              <div className={`w-px h-4 bg-gray-700 mx-3`} />
              <div className={`relative group`}>
                 <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className={`bg-transparent text-[10px] font-mono text-gray-400 uppercase outline-none appearance-none pr-6 cursor-pointer hover:text-cyan-400 transition-colors`}
                  aria-label="Sort Order"
                >
                  <option value="date_desc" className={`bg-gray-900`}>Newest</option>
                  <option value="date_asc" className={`bg-gray-900`}>Oldest</option>
                  <option value="name_asc" className={`bg-gray-900`}>Name (A-Z)</option>
                  <option value="name_desc" className={`bg-gray-900`}>Name (Z-A)</option>
                  <option value="rarity_desc" className={`bg-gray-900`}>Rarity (High-Low)</option>
                  <option value="rarity_asc" className={`bg-gray-900`}>Rarity (Low-High)</option>
                </select>
                <ArrowUpDown className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none group-hover:text-cyan-400 transition-colors`} />
              </div>
           </div>
        </div>
        
        {/* Filter Chips & Status/Favorite Filters */}
        <div className={`flex flex-col gap-3`}>
            <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade`}>
              <button
                  onClick={clearTypeFilters}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    filterTypes.size === 0 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                      : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:border-gray-500 hover:bg-gray-800'
                  }`}
                  title="Show all rock types"
                >
                  All Types
                </button>
              {Object.values(RockType).filter(type => type !== RockType.UNKNOWN).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    filterTypes.has(type) 
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                      : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:border-gray-500 hover:bg-gray-800'
                  }`}
                  title={`Filter by ${type} type`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className={`flex gap-2`}>
                {/* Status Filter */}
                <div className={`flex bg-gray-900/60 border border-gray-700 rounded-full p-0.5 relative group`}>
                    {['all', 'approved', 'pending'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as RockStatusFilter)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                filterStatus === status
                                ? 'bg-purple-600/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {status === 'all' ? 'All Status' : status}
                        </button>
                    ))}
                </div>

                {/* Show Favorites Toggle */}
                <button
                    onClick={() => setShowFavorites(prev => !prev)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        showFavorites
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:border-gray-500 hover:bg-gray-800'
                    }`}
                >
                    <Heart className={`w-3 h-3 ${showFavorites ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}`} />
                    Favorites
                </button>
            </div>
        </div>
      </div>

      {/* Grid */}
      <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto no-scrollbar -mx-2 px-2 pb-24`}>
        {isLoading ? (
          <div className={`h-64 flex flex-col items-center justify-center space-y-4`}>
            <Loader2 className={`w-8 h-8 text-cyan-500 animate-spin`} />
            <p className={`text-cyan-500/50 text-xs font-mono animate-pulse tracking-widest`}>DECRYPTING ARCHIVES...</p>
          </div>
        ) : rocks.length === 0 ? (
          <div className={`h-64 flex flex-col items-center justify-center text-center opacity-30 space-y-4`}>
            <div className={`w-20 h-20 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center`}>
                <Box className={`w-8 h-8 text-gray-600`} />
            </div>
            <p className={`font-mono text-xs text-gray-500 uppercase tracking-widest`}>VAULT EMPTY</p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-4`}>
            {sortedAndFilteredRocks.map((rock) => (
              <div 
                key={rock.id}
                onClick={() => onRockClick(rock)}
                className={`group relative aspect-[4/5] cursor-pointer perspective-1000`}
              >
                {/* Data Shard Card */}
                <div className={`absolute inset-0 glass-card rounded-2xl overflow-hidden group-hover:transform group-hover:scale-[1.02] transition-transform duration-500`}>
                  <div className={`absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10 opacity-80`} />
                  
                  {/* Parallax Image */}
                  <img 
                    ref={el => imageRefs.current[rock.id] = el}
                    src={rock.imageUrl} 
                    alt={rock.name} 
                    className={`parallax-bg`} 
                  />
                  
                  {/* Holographic Sheen */}
                  <div className={`absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none`} />

                  {/* Content Overlay */}
                  <div className={`absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col justify-end`}>
                    <div className={`flex justify-between items-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0`}>
                       <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-md border ${
                          rock.type === 'Igneous' ? 'border-red-500/30 text-red-400 bg-red-900/20' :
                          rock.type === 'Sedimentary' ? 'border-amber-500/30 text-amber-400 bg-amber-900/20' :
                          rock.type === 'Metamorphic' ? 'border-purple-500/30 text-purple-400 bg-purple-900/20' :
                          rock.type === 'Mineral' ? 'border-blue-500/30 text-blue-400 bg-blue-900/20' :
                          rock.type === 'Fossil' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-900/20' :
                          'border-gray-500/30 text-gray-400 bg-gray-900/20'
                       }`}>{rock.type}</span>
                       <div className={`flex items-center gap-1`}>
                          {rock.rarityScore > 75 && <Sparkles className={`w-3 h-3 text-amber-400 animate-pulse`} />}
                          <button 
                            onClick={(e) => toggleFavorite(rock.id, e)} 
                            className={`p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors`}
                            aria-label={favoriteRockIds.has(rock.id) ? "Unfavorite rock" : "Favorite rock"}
                          >
                            <Star className={`w-3 h-3 ${favoriteRockIds.has(rock.id) ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                          </button>
                       </div>
                    </div>
                    <div>
                        <h3 className={`text-white font-bold text-sm truncate leading-tight tracking-wide group-hover:text-cyan-400 transition-colors text-glow`}>{rock.name}</h3>
                        <p className={`text-gray-500 text-[9px] font-mono mt-0.5 uppercase tracking-wider`}>{new Date(rock.dateFound).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};