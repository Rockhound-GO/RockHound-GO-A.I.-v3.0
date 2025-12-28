
import React from 'react';

export enum RockType {
  IGNEOUS = 'Igneous',
  SEDIMENTARY = 'Sedimentary',
  METAMORPHIC = 'Metamorphic',
  MINERAL = 'Mineral',
  FOSSIL = 'Fossil',
  UNKNOWN = 'Unknown',
  SYNTHETIC = 'Synthetic' // New class for fused assets
}

export interface FusionMetadata {
  parentAId: string;
  parentBId: string;
  fusionStability: number; // 0.0 to 1.0
  fusionDate: number;
}

// Added OperatorStats interface to fix line 30 error and missing type in api.ts
export interface OperatorStats {
  totalScans: number;
  distanceTraveled: number;
  uniqueSpeciesFound: number;
  legendaryFinds: number;
  highestRarityFound: number;
  scanStreak: number;
}

// Added Badge interface to fix missing type in api.ts
export interface Badge {
  id: string;
  dateUnlocked: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
  xp: number;
  level: number;
  rankTitle?: string;
  avatarUrl?: string;
  operatorStats?: OperatorStats;
  credits?: number;
}

export interface RockAnalysis {
  name: string;
  type: RockType;
  scientificName: string;
  description: string;
  rarityScore: number;
  hardness: number;
  color: string[];
  composition: string[];
  funFact: string;
  isGeologicalSpecimen: boolean;
  formationGenesis: string;
  expertExplanation: string;
  bonusXP: {
    rarity: number;
    expertEye: number;
  };
  estimatedValue: number; 
  marketInsight: string;
  spectralWaveform: number[];
  refinementLevel: number;
  geologicalLore?: string;
  molecularStructure?: string;
  // NEW: Fusion data
  fusionData?: FusionMetadata;
}

export interface Rock extends RockAnalysis {
  id: string;
  userId: string;
  dateFound: number;
  imageUrl: string;
  comparisonImageUrl?: string;
  location?: { lat: number; lng: number };
  status: 'approved' | 'pending' | 'flagged';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  xpReward: number;
  goal: number;
  progress: (user: User, rocks: Rock[]) => number;
}

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  temperature_2m_previous_day1: number[];
  temperature_2m_previous_day2: number[];
  temperature_2m_previous_day3: number[];
  temperature_2m_previous_day4: number[];
  temperature_2m_previous_day5: number[];
  cloudcover: number[];
  precipitation: number[];
  windspeed_10m: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: any;
  hourly: WeatherHourly;
}

// Added DailyBounty interface to fix missing type in geminiService.ts and Home.tsx
export interface DailyBounty {
  targetMineral: string;
  xpMultiplier: number;
  locationName: string;
  geologicalReason: string;
  expiresAt: number;
}

// Added GeologicalZone interface to fix missing type in UserMap.tsx
export interface GeologicalZone {
  id: string;
  type: 'METAMORPHIC' | 'ALLUVIAL' | 'IGNEOUS' | 'SEDIMENTARY';
  name: string;
  coordinates: [number, number];
  radius: number;
  access: 'PUBLIC' | 'PRIVATE';
  description: string;
  likelyMinerals: string[];
}
