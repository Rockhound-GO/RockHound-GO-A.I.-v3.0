
import React, { useMemo } from 'react';
import { Rock, RockType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trophy, Award, Star, Activity, BarChart2, Hash, Zap } from 'lucide-react';

interface StatisticsProps {
  rocks: Rock[];
}

const COLORS = {
  [RockType.IGNEOUS]: '#ef4444',
  [RockType.SEDIMENTARY]: '#eab308',
  [RockType.METAMORPHIC]: '#a855f7',
  [RockType.MINERAL]: '#06b6d4',
  [RockType.FOSSIL]: '#10b981',
  [RockType.UNKNOWN]: '#6b7280',
};

export const Statistics: React.FC<StatisticsProps> = ({ rocks }) => {
  
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    rocks.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rocks]);

  const rarityData = useMemo(() => {
    const bins = [
        { name: 'COM', range: [0, 40], count: 0, fill: '#6b7280' },
        { name: 'UNC', range: [41, 70], count: 0, fill: '#10b981' },
        { name: 'RAR', range: [71, 90], count: 0, fill: '#8b5cf6' },
        { name: 'LEG', range: [91, 100], count: 0, fill: '#eab308' },
    ];
    
    rocks.forEach(r => {
        const bin = bins.find(b => r.rarityScore >= b.range[0] && r.rarityScore <= b.range[1]);
        if (bin) bin.count++;
    });
    
    return bins;
  }, [rocks]);

  const stats = useMemo(() => {
      const total = rocks.length;
      const avgRarity = total > 0 ? Math.round(rocks.reduce((acc, r) => acc + r.rarityScore, 0) / total) : 0;
      const rarest = rocks.length > 0 ? rocks.reduce((prev, current) => (prev.rarityScore > current.rarityScore) ? prev : current) : null;
      return { total, avgRarity, rarest };
  }, [rocks]);

  if (rocks.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-cyan-500/50 space-y-4 font-mono">
              <div className="w-24 h-24 border border-cyan-900 rounded-full flex items-center justify-center animate-pulse">
                <Activity className="w-12 h-12" />
              </div>
              <p className="tracking-widest uppercase text-xs">NO TELEMETRY DATA<br/>INITIATE SCAN SEQUENCE</p>
          </div>
      );
  }

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto no-scrollbar pb-24 font-mono bg-[#030712] relative">
         {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

        <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
            <h2 className="text-xl font-bold text-cyan-400 tracking-[0.2em] uppercase text-glow">Tactical Uplink</h2>
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-cyan-500 rounded-sm animate-pulse" />
                <span className="w-2 h-2 bg-indigo-500 rounded-sm animate-pulse delay-75" />
                <span className="w-2 h-2 bg-purple-500 rounded-sm animate-pulse delay-150" />
            </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-3 rounded-none border-l-2 border-cyan-500 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors" />
                <div className="mb-1 text-cyan-500 group-hover:scale-110 transition-transform">
                    <Hash className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tighter">{stats.total}</div>
                <div className="text-[9px] text-cyan-600 uppercase tracking-widest">Specimens</div>
            </div>
            <div className="glass-panel p-3 rounded-none border-l-2 border-purple-500 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
                <div className="mb-1 text-purple-500 group-hover:scale-110 transition-transform">
                    <Star className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tighter">{stats.avgRarity}</div>
                <div className="text-[9px] text-purple-600 uppercase tracking-widest">Avg Index</div>
            </div>
            <div className="glass-panel p-3 rounded-none border-l-2 border-emerald-500 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                <div className="mb-1 text-emerald-500 group-hover:scale-110 transition-transform">
                    <Award className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tighter">IV</div>
                <div className="text-[9px] text-emerald-600 uppercase tracking-widest">Clearance</div>
            </div>
        </div>

        {/* Type Distribution */}
        <div className="glass-panel p-4 border border-cyan-900/30 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />

            <h3 className="text-[10px] font-bold text-cyan-600 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <Zap className="w-3 h-3" /> Composition Analysis
            </h3>
            <div className="h-48 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            {typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as RockType] || '#374151'} className="hover:opacity-80 transition-opacity" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(3, 7, 18, 0.9)', borderColor: '#06b6d4', borderRadius: '0px', color: '#fff', fontSize: '10px', textTransform: 'uppercase' }}
                            itemStyle={{ color: '#22d3ee' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="block text-[9px] text-cyan-600 tracking-widest">TOTAL</span>
                        <span className="block text-xl font-bold text-white">{stats.total}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                {typeData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase tracking-wider border border-white/5 px-2 py-1 rounded-sm">
                        <div className="w-1.5 h-1.5" style={{ backgroundColor: COLORS[entry.name as RockType] || '#374151' }} />
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>

        {/* Rarity Chart */}
        <div className="glass-panel p-4 border border-cyan-900/30 relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />

            <h3 className="text-[10px] font-bold text-cyan-600 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <BarChart2 className="w-3 h-3" /> Rarity Distribution
            </h3>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rarityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4b5563', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(3, 7, 18, 0.9)', borderColor: '#06b6d4', borderRadius: '0px', color: '#fff', fontSize: '10px' }}
                        />
                        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                            {rarityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Top Find */}
        {stats.rarest && (
            <div className="relative group overflow-hidden border border-amber-500/30 bg-amber-900/10 p-1">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.05)_10px,rgba(245,158,11,0.05)_20px)]" />
                <div className="flex items-center gap-4 relative z-10 p-3">
                    <div className="w-16 h-16 border border-amber-500/50 p-0.5 flex-none relative">
                        <img src={stats.rarest.imageUrl} alt={stats.rarest.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.2em] mb-1">High Value Asset</div>
                            <Trophy className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="font-bold text-white text-lg truncate tracking-tight">{stats.rarest.name}</div>
                        <div className="text-[10px] text-amber-400/60 font-mono">
                            IDX: {stats.rarest.rarityScore} // CLASS: {stats.rarest.type.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
