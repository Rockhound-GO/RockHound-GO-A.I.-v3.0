
import { WeatherData, WeatherHourly } from '../types';

const generateCloudCover = (length: number): number[] => {
  // Generate realistic-looking cloud patterns (0-100)
  return Array.from({ length }, (_, i) => {
    // Simple sine wave pattern with noise for "weather-like" variation
    const base = Math.sin(i / 8) * 40 + 50; 
    const noise = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, Math.round(base + noise)));
  });
};

const generateTemperature = (length: number, baseTemp: number, dailyRange: number, noise: number, offset: number = 0): number[] => {
  return Array.from({ length }, (_, i) => {
    const hourOfDay = i % 24;
    // Simulate daily temperature cycle (cooler at night, warmer in afternoon)
    const cycle = Math.sin((hourOfDay - 8 + offset) * Math.PI / 12) * dailyRange;
    const randomNoise = (Math.random() - 0.5) * noise;
    return Math.round(baseTemp + cycle + randomNoise);
  });
};

const generatePastTemperatures = (hourlyTime: string[], daysAgo: number, baseTemp: number): number[] => {
  // Simulate past temperatures with slight variation from current base
  return hourlyTime.map((_, i) => {
    const hourOfDay = i % 24;
    const pastBaseTemp = baseTemp + (Math.random() - 0.5) * 5; // Slight variation for past days
    const cycle = Math.sin((hourOfDay - 8 - daysAgo * 0.5) * Math.PI / 12) * 15; // Slightly shifted cycle
    const randomNoise = (Math.random() - 0.5) * 3;
    return Math.round(pastBaseTemp + cycle + randomNoise);
  });
};

const HOURLY_TIMES = [
  "2025-12-06T00:00", "2025-12-06T01:00", "2025-12-06T02:00", "2025-12-06T03:00", "2025-12-06T04:00", "2025-12-06T05:00", "2025-12-06T06:00", "2025-12-06T07:00", "2025-12-06T08:00", "2025-12-06T09:00", "2025-12-06T10:00", "2025-12-06T11:00", "2025-12-06T12:00", "2025-12-06T13:00", "2025-12-06T14:00", "2025-12-06T15:00", "2025-12-06T16:00", "2025-12-06T17:00", "2025-12-06T18:00", "2025-12-06T19:00", "2025-12-06T20:00", "2025-12-06T21:00", "2025-12-06T22:00", "2025-12-06T23:00",
  "2025-12-07T00:00", "2025-12-07T01:00", "2025-12-07T02:00", "2025-12-07T03:00", "2025-12-07T04:00", "2025-12-07T05:00", "2025-12-07T06:00", "2025-12-07T07:00", "2025-12-07T08:00", "2025-12-07T09:00", "2025-12-07T10:00", "2025-12-07T11:00", "2025-12-07T12:00", "2025-12-07T13:00", "2025-12-07T14:00", "2025-12-07T15:00", "2025-12-07T16:00", "2025-12-07T17:00", "2025-12-07T18:00", "2025-12-07T19:00", "2025-12-07T20:00", "2025-12-07T21:00", "2025-12-07T22:00", "2025-12-07T23:00",
  "2025-12-08T00:00", "2025-12-08T01:00", "2025-12-08T02:00", "2025-12-08T03:00", "2025-12-08T04:00", "2025-12-08T05:00", "2025-12-08T06:00", "2025-12-08T07:00", "2025-12-08T08:00", "2025-12-08T09:00", "2025-12-08T10:00", "2025-12-08T11:00", "2025-12-08T12:00", "2025-12-08T13:00", "2025-12-08T14:00", "2025-12-08T15:00", "2025-12-08T16:00", "2025-12-08T17:00", "2025-12-08T18:00", "2025-12-08T19:00", "2025-12-08T20:00", "2025-12-08T21:00", "2025-12-08T22:00", "2025-12-08T23:00",
  "2025-12-09T00:00", "2025-12-09T01:00", "2025-12-09T02:00", "2025-12-09T03:00", "2025-12-09T04:00", "2025-12-09T05:00", "2025-12-09T06:00", "2025-12-09T07:00", "2025-12-09T08:00", "2025-12-09T09:00", "2025-12-09T10:00", "2025-12-09T11:00", "2025-12-09T12:00", "2025-12-09T13:00", "2025-12-09T14:00", "2025-12-09T15:00", "2025-12-09T16:00", "2025-12-09T17:00", "2025-12-09T18:00", "2025-12-09T19:00", "2025-12-09T20:00", "2025-12-09T21:00", "2025-12-09T22:00", "2025-12-09T23:00",
  "2025-12-10T00:00", "2025-12-10T01:00", "2025-12-10T02:00", "2025-12-10T03:00", "2025-12-10T04:00", "2025-12-10T05:00", "2025-12-10T06:00", "2025-12-10T07:00", "2025-12-10T08:00", "2025-12-10T09:00", "2025-12-10T10:00", "2025-12-10T11:00", "2025-12-10T12:00", "2025-12-10T13:00", "2025-12-10T14:00", "2025-12-10T15:00", "2025-12-10T16:00", "2025-12-10T17:00", "2025-12-10T18:00", "2025-12-10T19:00", "2025-12-10T20:00", "2025-12-10T21:00", "2025-12-10T22:00", "2025-12-10T23:00",
  "2025-12-11T00:00", "2025-12-11T01:00", "2025-12-11T02:00", "2025-12-11T03:00", "2025-12-11T04:00", "2025-12-11T05:00", "2025-12-11T06:00", "2025-12-11T07:00", "2025-12-11T08:00", "2025-12-11T09:00", "2025-12-11T10:00", "2025-12-11T11:00", "2025-12-11T12:00", "2025-12-11T13:00", "2025-12-11T14:00", "2025-12-11T15:00", "2025-12-11T16:00", "2025-12-11T17:00", "2025-12-11T18:00", "2025-12-11T19:00", "2025-12-11T20:00", "2025-12-11T21:00", "2025-12-11T22:00", "2025-12-11T23:00",
  "2025-12-12T00:00", "2025-12-12T01:00", "2025-12-12T02:00", "2025-12-12T03:00", "2025-12-12T04:00", "2025-12-12T05:00", "2025-12-12T06:00", "2025-12-12T07:00", "2025-12-12T08:00", "2025-12-12T09:00", "2025-12-12T10:00", "2025-12-12T11:00",
];

const MOCK_WEATHER_DATA: WeatherData = {
  "latitude": 52.52,
  "longitude": 13.419998,
  "generationtime_ms": 0.570535659790039,
  "utc_offset_seconds": 0,
  "timezone": "GMT",
  "timezone_abbreviation": "GMT",
  "elevation": 38,
  "hourly_units": {
    "time": "iso8601",
    "temperature_2m": "°F",
    "temperature_2m_previous_day1": "°F",
    "temperature_2m_previous_day2": "°F",
    "temperature_2m_previous_day3": "°F",
    "temperature_2m_previous_day4": "°F",
    "temperature_2m_previous_day5": "°F",
    "cloudcover": "%"
  },
  "hourly": {
    "time": HOURLY_TIMES,
    "temperature_2m": generateTemperature(HOURLY_TIMES.length, 50, 20, 5), // Current day temp
    "temperature_2m_previous_day1": generatePastTemperatures(HOURLY_TIMES, 1, 48), // Temp 1 day ago
    "temperature_2m_previous_day2": generatePastTemperatures(HOURLY_TIMES, 2, 52), // Temp 2 days ago
    "temperature_2m_previous_day3": generatePastTemperatures(HOURLY_TIMES, 3, 45), // Temp 3 days ago
    "temperature_2m_previous_day4": generatePastTemperatures(HOURLY_TIMES, 4, 55), // Temp 4 days ago
    "temperature_2m_previous_day5": generatePastTemperatures(HOURLY_TIMES, 5, 49), // Temp 5 days ago
    "cloudcover": generateCloudCover(HOURLY_TIMES.length)
  },
};

// Function to simulate fetching weather data
export const getWeatherData = async (): Promise<WeatherData> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500)); 
  return MOCK_WEATHER_DATA;
};