

import React, { useMemo } from 'react';
import { Rock, RockType, Achievement } from '../types';
import { User } from '../services/api';
import { Gem, Compass, Sprout, BarChart3, Microscope, Shield, Star, Award, Mountain, Crown } from 'lucide-react';

const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_find',
    title: 'First Find',
    description: 'Identify your very first rock.',
    icon: Sprout,
    xpReward: 50,
    goal: 1,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'collector_1',
    title: 'Novice Collector',
    description: 'Collect 10 different specimens.',
    icon: Award,
    xpReward: 100,
    goal: 10,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'collector_2',
    title: 'Adept Collector',
    description: 'Collect 50 different specimens.',
    icon: Star,
    xpReward: 500,
    goal: 50,
    progress: (user, rocks) => rocks.length,
  },
  {
    id: 'geologist_1',
    title: 'Geologist in Training',
    description: 'Reach Level 5.',
    icon: BarChart3,
    xpReward: 250,
    goal: 5,
    progress: (user) => user.level,
  },
  {
    id: 'geologist_2',
    title: 'Senior Geologist',
    description: 'Reach Level 10.',
    icon: Crown,
    xpReward: 1000,
    goal: 10,
    progress: (user) => user.level,
  },
  {
    id: 'igneous_expert',
    title: 'Igneous Investigator',
    description: 'Identify 5 Igneous rocks.',
    icon: Mountain,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.IGNEOUS).length,
  },
  {
    id: 'sedimentary_expert',
    title: 'Sedimentary Sleuth',
    description: 'Identify 5 Sedimentary rocks.',
    icon: Compass,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.SEDIMENTARY).length,
  },
  {
    id: 'metamorphic_expert',
    title: 'Metamorphic Master',
    description: 'Identify 5 Metamorphic rocks.',
    icon: Shield,
    xpReward: 150,
    goal: 5,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.METAMORPHIC).length,
  },
  {
    id: 'mineral_expert',
    title: 'Mineral Maven',
    description: 'Identify 10 Minerals.',
    icon: Microscope,
    xpReward: 150,
    goal: 10,
    progress: (user, rocks) => rocks.filter(r => r.type === RockType.MINERAL).length,
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Find a specimen with rarity over 75.',
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
    <div className={`h-full p-6 space-y-6 overflow-y-auto no-scrollbar pb-20`}>
      <h2 className={`text-2xl font-bold text-white mb-2`}>Achievements</h2>
      <div className={`space-y-3`}>
        {processedAchievements.map(ach => (
          <div 
            key={ach.id}
            className={`
              p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300
              ${ach.isCompleted 
                ? 'bg-gradient-to-br from-emerald-900/40 to-gray-800/30 border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                : 'bg-gray-800/40 border-gray-700/50'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-lg flex-none flex items-center justify-center transition-colors
              ${ach.isCompleted 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-gray-700/50 text-gray-400'}
            `}>
              <ach.icon className={`w-6 h-6`} />
            </div>
            <div className={`flex-1`}>
              <div className={`flex justify-between items-baseline`}>
                <h3 className={`font-bold transition-colors ${ach.isCompleted ? 'text-white' : 'text-gray-300'}`}>
                  {ach.title}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${ach.isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>
                  +{ach.xpReward} XP
                </span>
              </div>
              <p className={`text-xs text-gray-400 mt-1`}>{ach.description}</p>
              <div className={`flex items-center gap-2 mt-2`}>
                <div className={`w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden`}>
                  <div 
                    className={`h-full transition-all duration-500 ${ach.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${ach.progressPercent}%` }}
                  />
                </div>
                <span className={`text-[10px] text-gray-500 font-mono`}>
                  {Math.min(ach.currentProgress, ach.goal)}/{ach.goal}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};