

import React, { useEffect, useState } from 'react';
import { getWeatherData } from '../services/weatherService';
import { WeatherData } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area } from 'recharts';
import { CloudRain, Sun, Clock, MapPin, Loader2, ArrowLeft, Cloud } from 'lucide-react';

interface WeatherDashboardProps {
  onBack: () => void;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const weather = await getWeatherData();
      setData(weather);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex flex-col items-center justify-center bg-gray-900 space-y-4`}>
        <Loader2 className={`w-10 h-10 text-indigo-500 animate-spin`} />
        <p className={`text-gray-400`}>Loading forecast...</p>
      </div>
    );
  }

  if (!data) return <div className={`p-8 text-center text-white`}>Weather data unavailable.</div>;

  // Prepare Chart Data (First 24 hours of current day)
  const hourlyChartData = data.hourly.time.slice(0, 24).map((timeStr, i) => {
    const time = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      temp: data.hourly.temperature_2m[i],
      prev1: data.hourly.temperature_2m_previous_day1[i],
      prev2: data.hourly.temperature_2m_previous_day2[i],
      cloud: data.hourly.cloudcover[i], // Add cloud cover to chart data
    };
  });

  const currentTemp = data.hourly.temperature_2m[0]; // Approximation for demo

  return (
    <div className={`h-full bg-gray-900 flex flex-col overflow-y-auto no-scrollbar pb-20`}>
      {/* Header */}
      <div className={`p-6 bg-gradient-to-br from-indigo-900 to-gray-900 border-b border-gray-800`}>
        <div className={`flex items-center gap-4 mb-6`}>
            <button onClick={onBack} className={`p-2 bg-gray-800/50 rounded-full text-white hover:bg-gray-700 transition-colors`}>
                <ArrowLeft className={`w-5 h-5`} />
            </button>
            <h1 className={`text-2xl font-bold text-white`}>Field Conditions</h1>
        </div>
        
        <div className={`flex justify-between items-end`}>
          <div>
            <div className={`flex items-center gap-2 text-indigo-300 text-sm font-medium mb-1`}>
              <MapPin className={`w-4 h-4`} /> Berlin (Lat: {data.latitude})
            </div>
            <div className={`text-5xl font-bold text-white tracking-tight`}>
              {currentTemp}{data.hourly_units.temperature_2m}
            </div>
            <div className={`text-gray-400 text-sm mt-1`}>
              Elevation: {data.elevation}m • {data.timezone}
            </div>
          </div>
          <div className={`w-16 h-16 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10`}>
            <Sun className={`w-8 h-8 text-yellow-400`} />
          </div>
        </div>
      </div>

      <div className={`p-6 space-y-8`}>
        {/* 24 Hour Forecast */}
        <div className={`bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50`}>
          <div className={`flex items-center gap-2 mb-6`}>
            <Clock className={`w-4 h-4 text-indigo-400`} />
            <h3 className={`text-sm font-bold text-white uppercase tracking-wide`}>24-Hour Temperature</h3>
          </div>
          
          <div className={`h-64 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af" 
                  fontSize={10} 
                  tickMargin={10}
                  interval={3}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={10} 
                  unit="°"
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#818cf8" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sky Cover Analysis (NEW) */}
        <div className={`bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50`}>
          <div className={`flex items-center gap-2 mb-6`}>
            <Cloud className={`w-4 h-4 text-blue-400`} />
            <h3 className={`text-sm font-bold text-white uppercase tracking-wide`}>Sky Cover Impact</h3>
          </div>
          <p className={`text-xs text-gray-400 mb-4`}>Comparing ground temperature (Line) vs. cloud density (Area).</p>
          
          <div className={`h-64 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af" 
                    fontSize={10} 
                    tickMargin={10}
                    interval={3}
                />
                <YAxis 
                    yAxisId="left"
                    stroke="#818cf8" 
                    fontSize={10} 
                    unit="°"
                    domain={['auto', 'auto']}
                    orientation="left"
                />
                <YAxis 
                    yAxisId="right"
                    stroke="#3b82f6" 
                    fontSize={10} 
                    unit="%"
                    orientation="right"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                
                {/* Cloud Cover Area */}
                <Area 
                    yAxisId="right"
                    name="Cloud Cover %"
                    type="monotone" 
                    dataKey="cloud" 
                    fill="#3b82f6" 
                    fillOpacity={0.2} 
                    stroke="#3b82f6" 
                />
                
                {/* Temperature Line */}
                <Line 
                    yAxisId="left"
                    name="Temperature"
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#818cf8" 
                    strokeWidth={3} 
                    dot={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Comparison */}
        <div className={`bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50`}>
          <div className={`flex items-center gap-2 mb-6`}>
            <CloudRain className={`w-4 h-4 text-emerald-400`} />
            <h3 className={`text-sm font-bold text-white uppercase tracking-wide`}>Historical Trends (Last 3 Days)</h3>
          </div>
          
          <div className={`h-64 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af" 
                    fontSize={10} 
                    tickMargin={10}
                    interval={3}
                    hide
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                
                <Line name="Today" type="monotone" dataKey="temp" stroke="#fff" strokeWidth={2} dot={false} />
                <Line name="Yesterday" type="monotone" dataKey="prev1" stroke="#9ca3af" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                <Line name="2 Days Ago" type="monotone" dataKey="prev2" stroke="#4b5563" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};