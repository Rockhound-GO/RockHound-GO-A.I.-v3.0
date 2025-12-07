import React from 'react';

// --- CORE ENUMS ---
export enum RockType {
  IGNEOUS = 'Igneous',
  SEDIMENTARY = 'Sedimentary',
  METAMORPHIC = 'Metamorphic',
  MINERAL = 'Mineral',
  FOSSIL = 'Fossil',
  UNKNOWN = 'Unknown'
}

export enum UserRank {
  NOVICE = 'Novice Scout',
  OPERATOR = 'Field Operator',
  SPECIALIST = 'Rock Specialist',
  VETERAN = 'Veteran Geologist',
  ELITE = 'Elite Sentinel',
  ARCHITECT = 'System Architect'
}

// --- ENTITY INTERFACES ---

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or URL
  dateUnlocked: string;
}

export interface OperatorStats {
  totalScans: number;
  distanceTraveled: number; // in km
  uniqueSpeciesFound: number;
  legendaryFinds: number;
  highestRarityFound: number;
  scanStreak: number;
}

export interface UserSettings {
  theme: 'cyber_dark' | 'tactical_light' | 'high_contrast';
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  notifications: boolean;
  dataSaver: boolean;
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
  createdAt?: string;
  isAdmin?: boolean;
  operatorStats?: OperatorStats;
  badges?: Badge[];
  settings?: UserSettings;
}

// --- GEOLOGICAL DATA ---

export interface RockAnalysis {
  name: string;
  type: RockType;
  scientificName: string;
  description: string;
  rarityScore: number; // 1-100
  hardness: number; // Mohs scale 1-10
  color: string[];
  composition: string[];
  funFact: string;
  comparisonImageUrl?: string;
  
  // AI Metadata (The "Science" Layer)
  aiConfidence?: number;
  modelVersion?: string;
  spectralHash?: string; // For future spectral analysis features
}

export interface Rock extends RockAnalysis {
  id: string;
  userId: string; // Owner ID
  dateFound: number; // timestamp
  imageUrl: string;
  location?: {
    lat: number;
    lng: number;
  };
  status: 'approved' | 'pending' | 'flagged';
  manualCorrection?: string;
  scanWaveform?: number[]; // For audio visualization of the scan
}

// --- GAMIFICATION & MISSIONS ---

export interface Challenge {
  id: string;
  title: string;
  description: string;
  targetType?: RockType;
  minRarity?: number;
  xpReward: number;
  isCompleted: boolean;
  expiresAt?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  xpReward: number;
  goal: number;
  progress: (user: User, rocks: Rock[]) => number;
  isHidden?: boolean; // Secret achievements
}

// --- ENVIRONMENTAL DATA ---

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  temperature_2m_previous_day1: number[];
  temperature_2m_previous_day2: number[];
  temperature_2m_previous_day3: number[];
  temperature_2m_previous_day4: number[];
  temperature_2m_previous_day5: number[];
  cloudcover: number[];
  // Future expansion
  precipitation_probability?: number[];
  windspeed_10m?: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    temperature_2m_previous_day1: string;
    temperature_2m_previous_day2: string;
    temperature_2m_previous_day3: string;
    temperature_2m_previous_day4: string;
    temperature_2m_previous_day5: string;
    cloudcover: string;
  };
  hourly: WeatherHourly;
}

// --- SYSTEM TELEMETRY ---

export interface SystemLog {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  module: string;
  message: string;
  metadata?: any;
}