
import React from 'react';


export enum RockType {
  IGNEOUS = 'Igneous',
  SEDIMENTARY = 'Sedimentary',
  METAMORPHIC = 'Metamorphic',
  MINERAL = 'Mineral',
  FOSSIL = 'Fossil',
  UNKNOWN = 'Unknown'
}

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
}

export interface Rock {
  id: string;
  dateFound: number; // timestamp
  imageUrl: string;
  location?: {
    lat: number;
    lng: number;
  };
  status: 'approved' | 'pending';
  manualCorrection?: string;
  // Flattened properties from RockAnalysis for easier usage
  name: string;
  type: RockType;
  scientificName: string;
  description: string;
  rarityScore: number;
  hardness: number;
  color: string[];
  composition: string[];
  funFact: string;
  comparisonImageUrl?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  targetType?: RockType;
  minRarity?: number;
  xpReward: number;
  isCompleted: boolean;
}

// Weather Interfaces
export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  temperature_2m_previous_day1: number[];
  temperature_2m_previous_day2: number[];
  temperature_2m_previous_day3: number[];
  temperature_2m_previous_day4: number[];
  temperature_2m_previous_day5: number[];
  cloudcover: number[];
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

// Achievement System
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  xpReward: number;
  goal: number;
  progress: (user: import('./services/api').User, rocks: Rock[]) => number;
}