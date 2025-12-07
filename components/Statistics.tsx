

import React, { useMemo } from 'react';
import { Rock, RockType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Trophy, Award, Star } from 'lucide-react';

interface StatisticsProps {
  rocks: Rock[];
}

const COLORS = {
  [RockType.IGNEOUS]: '#ef4444', // red-500
  [RockType.SEDIMENTARY]: '#eab308', // yellow-500
  [RockType.METAMORPHIC]: '#a855f7', // purple-500
  [RockType.MINERAL]: '#3b82f6', // blue-500
  [RockType.FOSSIL]: '#10b981', // green-500
  [RockType.UNKNOWN]: '#6b7280', // gray-500
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
    // Bin rocks by rarity
    const bins = [
        { name: 'Common', range: [0, 40], count: 0 },
        { name: 'Uncommon', range: [41, 70], count: 0 },
        { name: 'Rare', range: [71, 90], count: 0 },
        { name: 'Legendary', range: [91, 100], count: 0 },
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
          <div className={`h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-4`}>
              <Trophy className={`w-16 h-16 text-gray-700`} />
              <p>No statistics available yet.<br/>Start your adventure by collecting rocks!</p>
          </div>
      );
  }

  return (
    <div className={`h-full p-6 space-y-6 overflow-y-auto no-scrollbar pb-20`}>
        <h2 className={`text-2xl font-bold text-white mb-2`}>Collection Stats</h2>

        {/* Key Metrics */}
        <div className={`grid grid-cols-3 gap-3`}>
            <div className={`bg-gray-800/50 p-3 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center`}>
                <div className={`bg-indigo-500/20 p-2 rounded-lg mb-2`}>
                    <Trophy className={`w-5 h-5 text-indigo-400`} />
                </div>
                <div className={`text-2xl font-bold text-white`}>{stats.total}</div>
                <div className={`text-[10px] text-gray-400 uppercase tracking-wide`}>Collected</div>
            </div>
            <div className={`bg-gray-800/50 p-3 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center`}>
                <div className={`bg-purple-500/20 p-2 rounded-lg mb-2`}>
                    <Star className={`w-5 h-5 text-purple-400`} />
                </div>
                <div className={`text-2xl font-bold text-white`}>{stats.avgRarity}</div>
                <div className={`text-[10px] text-gray-400 uppercase tracking-wide`}>Avg Rarity</div>
            </div>
            <div className={`bg-gray-800/50 p-3 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center`}>
                <div className={`bg-green-500/20 p-2 rounded-lg mb-2`}>
                    <Award className={`w-5 h-5 text-green-400`} />
                </div>
                <div className={`text-2xl font-bold text-white`}>Lvl {Math.floor(stats.total / 5) + 1}</div>
                <div className={`text-[10px] text-gray-400 uppercase tracking-wide`}>Rank</div>
            </div>
        </div>

        {/* Type Distribution */}
        <div className={`bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50`}>
            <h3 className={`text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide`}>Type Distribution</h3>
            <div className={`h-48 w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as RockType] || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className={`flex flex-wrap gap-2 justify-center mt-2`}>
                {typeData.map((entry) => (
                    <div key={entry.name} className={`flex items-center gap-1.5 text-xs text-gray-400`}>
                        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: COLORS[entry.name as RockType] || '#8884d8' }} />
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>

        {/* Rarity Chart */}
        <div className={`bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50`}>
            <h3 className={`text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide`}>Rarity Breakdown</h3>
            <div className={`h-48 w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rarityData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Top Find */}
        {stats.rarest && (
            <div className={`bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-700/30 rounded-xl p-4 flex items-center gap-4`}>
                <div className={`w-16 h-16 rounded-lg overflow-hidden flex-none border border-yellow-700/50`}>
                    <img src={stats.rarest.imageUrl} alt={stats.rarest.name} className={`w-full h-full object-cover`} />
                </div>
                <div>
                    <div className={`text-xs text-yellow-500 font-bold uppercase tracking-wide mb-1`}>Rarest Find</div>
                    <div className={`font-bold text-white text-lg`}>{stats.rarest.name}</div>
                    <div className={`text-sm text-gray-400`}>Score: {stats.rarest.rarityScore}</div>
                </div>
            </div>
        )}
    </div>
  );
};