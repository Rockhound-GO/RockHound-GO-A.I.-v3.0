import { WeatherData, WeatherHourly } from '../types';

// -- PROCEDURAL GENERATION ENGINE --

// Simple 1D noise for smooth transitions (Linear Interpolation)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Generate realistic diurnal cycle
const generateDiurnalCycle = (hour: number, baseTemp: number, amplitude: number) => {
    // Peak heat at 15:00 (3 PM), lowest at 04:00 (4 AM)
    const timeOffset = (hour - 15) / 24 * Math.PI * 2;
    return baseTemp + Math.cos(timeOffset) * amplitude;
};

const generateForecast = (days: number): WeatherHourly => {
    const hoursTotal = days * 24;
    const times: string[] = [];
    const temps: number[] = [];
    const clouds: number[] = [];
    
    // Historical buffers
    const prev1: number[] = [];
    const prev2: number[] = [];
    const prev3: number[] = [];
    const prev4: number[] = [];
    const prev5: number[] = [];

    const now = new Date();
    
    // Seed random starting conditions
    let currentCloudTrend = Math.random() * 100;
    
    for (let i = 0; i < hoursTotal; i++) {
        // Time Stamp
        const d = new Date(now);
        d.setHours(d.getHours() + i);
        times.push(d.toISOString().slice(0, 16));

        // 1. Temperature Simulation
        // Base temp 55F, Swing +/- 15F
        const baseTemp = generateDiurnalCycle(d.getHours(), 55, 15);
        // Add random "weather front" noise
        const frontNoise = Math.sin(i / 50) * 10; 
        const microNoise = (Math.random() - 0.5) * 2;
        temps.push(Math.round(baseTemp + frontNoise + microNoise));

        // 2. Cloud Cover Simulation (Brownian Motion)
        const drift = (Math.random() - 0.5) * 20;
        currentCloudTrend = Math.max(0, Math.min(100, currentCloudTrend + drift));
        // Clouds tend to build up in afternoon
        const afternoonBoost = (d.getHours() > 12 && d.getHours() < 18) ? 10 : 0;
        clouds.push(Math.round(Math.min(100, currentCloudTrend + afternoonBoost)));

        // 3. Historical Data Generation (Simulating "Ghost" traces)
        prev1.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5 - 2)); // Yesterday slightly cooler
        prev2.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5 + 3)); // 2 days ago warmer
        prev3.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
        prev4.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
        prev5.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
    }

    return {
        time: times,
        temperature_2m: temps,
        temperature_2m_previous_day1: prev1,
        temperature_2m_previous_day2: prev2,
        temperature_2m_previous_day3: prev3,
        temperature_2m_previous_day4: prev4,
        temperature_2m_previous_day5: prev5,
        cloudcover: clouds
    };
};

// -- MOCK DATA STORE --
let cachedForecast: WeatherData | null = null;

export const getWeatherData = async (): Promise<WeatherData> => {
  // Simulate satellite uplink delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Return cached data if valid (simulating real-time updates every hour)
  if (cachedForecast && new Date().getMinutes() !== 0) {
      return cachedForecast;
  }

  const generated = generateForecast(7); // Generate 7 days of data

  cachedForecast = {
    latitude: 52.52,
    longitude: 13.41,
    generationtime_ms: 0.85,
    utc_offset_seconds: 3600,
    timezone: "CET",
    timezone_abbreviation: "CET",
    elevation: 38,
    hourly_units: {
      time: "iso8601",
      temperature_2m: "°F",
      temperature_2m_previous_day1: "°F",
      temperature_2m_previous_day2: "°F",
      temperature_2m_previous_day3: "°F",
      temperature_2m_previous_day4: "°F",
      temperature_2m_previous_day5: "°F",
      cloudcover: "%"
    },
    hourly: generated
  };

  return cachedForecast;
};