
import React, { useMemo } from 'react';
import { Rock, RockType, Achievement } from '../types';
import { User } from '../services/api';
import { Gem, Compass, Sprout, BarChart3, Microscope, Shield, Star, Award, Mountain, Crown, Lock } from 'lucide-react';

const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_find',
    title: 'First Contact',
    description: 'Log your initial discovery.',
    icon: Sprout,
    xpReward: 50,
    goal: 1,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'collector_1',
    title: 'Data Hoarder',
    description: 'Archive 10 unique specimens.',
    icon: Award,
    xpReward: 100,
    goal: 10,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'collector_2',
    title: 'Vault Keeper',
    description: 'Archive 50 unique specimens.',
    icon: Star,
    xpReward: 500,
    goal: 50,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'geologist_1',
    title: 'Field Operative',
    description: 'Attain Clearance Level 5.',
    icon: BarChart3,
    xpReward: 250,
    goal: 5,
    progress: (user) => user.level,
  },
  {
    id: 'geologist_2',
    title: 'Sector Commander',
    description: 'Attain Clearance Level 10.',
    icon: Crown,
    xpReward: 1000,
    goal: 10,
    progress: (user) => user.level,
  },
  {
    id: 'igneous_expert',
    title: 'Magmaborn',
    description: 'Analyze 5 Igneous formations.',
    icon: Mountain,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.IGNEOUS).length,
  },
  {
    id: 'sedimentary_expert',
    title: 'Time Walker',
    description: 'Analyze 5 Sedimentary layers.',
    icon: Compass,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.SEDIMENTARY).length,
  },
  {
    id: 'metamorphic_expert',
    title: 'Pressure Cooker',
    description: 'Analyze 5 Metamorphic samples.',
    icon: Shield,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.METAMORPHIC).length,
  },
  {
    id: 'mineral_expert',
    title: 'Crystal Gazer',
    description: 'Analyze 10 pure Minerals.',
    icon: Microscope,
    xpReward: 150,
    goal: 10,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.MINERAL).length,
  },
  {
    id: 'high_roller',
    title: 'Anomaly Hunter',
    description: 'Secure a specimen with >75 Rarity.',
    icon: Gem,
    xpReward: 200,
    goal: 1,
    progress: (user, rocks) => rocks.filter(r => r.rarityScore > 75).length,
  },
];

interface AchievementsProps {
  user: User;
  rocks: Rock[];
}

export const Achievements: React.FC<AchievementsProps> = ({ user, rocks }) => {
  const processedAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS.map(ach => {
      const currentProgress = ach.progress(user, rocks);
      const isCompleted = currentProgress >= ach.goal;
      const progressPercent = Math.min(100, (currentProgress / ach.goal) * 100);
      return { ...ach, currentProgress, isCompleted, progressPercent };
    }).sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;
      return b.progressPercent - a.progressPercent;
    });
  }, [user, rocks]);

  return (
    <div className={`h-full p-6 space-y-6 overflow-y-auto no-scrollbar pb-24 font-mono bg-[#030712]`}>
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h2 className={`text-xl font-bold text-white uppercase tracking-[0.2em] text-glow`}>Honor Roll</h2>
        <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            {processedAchievements.filter(a => a.isCompleted).length} / {processedAchievements.length} UNLOCKED
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4`}>
        {processedAchievements.map(ach => (
          <div 
            key={ach.id}
            className={`
              relative p-4 rounded-xl border transition-all duration-500 overflow-hidden group
              ${ach.isCompleted 
                ? 'bg-gradient-to-r from-emerald-900/20 to-gray-900 border-emerald-500/30'
                : 'bg-gray-900/40 border-gray-800 grayscale-[0.5]'}
            `}
          >
            {/* Holographic Sheen for completed */}
            {ach.isCompleted && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent pointer-events-none opacity-50" />
            )}

            <div className="flex items-center gap-4 relative z-10">
                <div className={`
                w-14 h-14 rounded-lg flex-none flex items-center justify-center border shadow-lg transition-transform group-hover:scale-105
                ${ach.isCompleted
                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20'
                    : 'bg-gray-800 border-gray-700 text-gray-600'}
                `}>
                {ach.isCompleted ? <ach.icon className={`w-7 h-7`} /> : <Lock className="w-6 h-6 opacity-50" />}
                </div>

                <div className={`flex-1 min-w-0`}>
                <div className={`flex justify-between items-center mb-1`}>
                    <h3 className={`font-bold text-sm tracking-wide truncate ${ach.isCompleted ? 'text-white text-glow' : 'text-gray-500'}`}>
                    {ach.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ach.isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-600'}`}>
                    XP +{ach.xpReward}
                    </span>
                </div>

                <p className={`text-[10px] text-gray-400 mb-3 truncate`}>{ach.description}</p>

                {/* Progress Bar */}
                <div className="relative w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${ach.isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-500'}`}
                        style={{ width: `${ach.progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-end mt-1">
                    <span className={`text-[9px] font-mono ${ach.isCompleted ? 'text-emerald-500' : 'text-gray-600'}`}>
                        {Math.min(ach.currentProgress, ach.goal)} / {ach.goal}
                    </span>
                </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
