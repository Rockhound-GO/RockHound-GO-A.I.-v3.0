
import React, { useEffect, useState } from 'react';
import { getWeatherData } from '../services/weatherService';
import { WeatherData } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area } from 'recharts';
import { CloudRain, Sun, Clock, MapPin, Loader2, ArrowLeft, Cloud, Thermometer, Wind } from 'lucide-react';

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
      <div className="h-full flex flex-col items-center justify-center bg-black space-y-4 font-mono">
        <div className="w-16 h-16 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-cyan-500/50 text-xs tracking-widest animate-pulse">ACQUIRING SATELLITE DATA...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-cyan-500 font-mono">SIGNAL LOST. NO DATA.</div>;

  const hourlyChartData = data.hourly.time.slice(0, 24).map((timeStr, i) => {
    const time = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      temp: data.hourly.temperature_2m[i],
      prev1: data.hourly.temperature_2m_previous_day1[i],
      prev2: data.hourly.temperature_2m_previous_day2[i],
      cloud: data.hourly.cloudcover[i],
    };
  });

  const currentTemp = data.hourly.temperature_2m[0];

  return (
    <div className="h-full bg-[#030712] flex flex-col overflow-y-auto no-scrollbar pb-24 font-mono relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),transparent_50%)]" />

      {/* Header */}
      <div className="p-6 border-b border-cyan-900/30 bg-[#030712]/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
            <button onClick={onBack} className="p-2 border border-cyan-900/50 rounded-lg text-cyan-400 hover:bg-cyan-900/20 transition-all hover:border-cyan-500/50">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white uppercase tracking-[0.2em] text-glow">Planetary Conditions</h1>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 text-[10px] font-bold uppercase tracking-widest mb-1">
              <MapPin className="w-3 h-3" /> Sector: {data.latitude.toFixed(2)}, {data.longitude.toFixed(2)}
            </div>
            <div className="text-5xl font-black text-white tracking-tighter flex items-start gap-1">
              {currentTemp}<span className="text-2xl text-cyan-500 mt-2">{data.hourly_units.temperature_2m}</span>
            </div>
            <div className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider flex gap-4">
              <span>Elev: {data.elevation}m</span>
              <span className="text-cyan-800">|</span>
              <span>Zone: {data.timezone_abbreviation}</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center animate-[spin_20s_linear_infinite]">
            <Sun className="w-8 h-8 text-amber-400 animate-[pulse_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 relative z-10">
        {/* 24 Hour Forecast */}
        <div className="glass-panel p-1 rounded-none border border-cyan-900/30">
          <div className="bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-6 border-b border-cyan-900/30 pb-2">
                <Thermometer className="w-4 h-4 text-cyan-400" />
                <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em]">Thermal Forecast (24h)</h3>
            </div>

            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#4b5563"
                        fontSize={9}
                        tickMargin={10}
                        interval={3}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#4b5563"
                        fontSize={9}
                        unit="°"
                        domain={['auto', 'auto']}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ backgroundColor: 'rgba(3, 7, 18, 0.95)', borderColor: '#0e7490', borderRadius: '0', color: '#fff', fontSize: '10px' }}
                    />
                    <Line
                        type="step"
                        dataKey="temp"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#0891b2', stroke: '#fff' }}
                    />
                </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sky Cover Analysis */}
        <div className="glass-panel p-1 rounded-none border border-cyan-900/30">
          <div className="bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-6 border-b border-cyan-900/30 pb-2">
                <Cloud className="w-4 h-4 text-indigo-400" />
                <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Atmospheric Density</h3>
            </div>

            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#4b5563"
                        fontSize={9}
                        tickMargin={10}
                        interval={3}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        yAxisId="left"
                        stroke="#22d3ee"
                        fontSize={9}
                        unit="°"
                        domain={['auto', 'auto']}
                        orientation="left"
                        hide
                    />
                    <YAxis
                        yAxisId="right"
                        stroke="#6366f1"
                        fontSize={9}
                        unit="%"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(3, 7, 18, 0.95)', borderColor: '#4338ca', borderRadius: '0', color: '#fff', fontSize: '10px' }}
                    />

                    <Area
                        yAxisId="right"
                        name="Cloud Cover"
                        type="monotone"
                        dataKey="cloud"
                        fill="url(#colorCloud)"
                        stroke="#6366f1"
                        strokeWidth={2}
                    />
                    <defs>
                        <linearGradient id="colorCloud" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                </ComposedChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Historical Comparison */}
        <div className="glass-panel p-1 rounded-none border border-cyan-900/30 opacity-80">
          <div className="bg-black/40 p-4">
            <div className="flex items-center gap-2 mb-6 border-b border-cyan-900/30 pb-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Temporal Delta (72h)</h3>
            </div>

            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyChartData}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(3, 7, 18, 0.95)', borderColor: '#059669', borderRadius: '0', color: '#fff', fontSize: '10px' }}
                    />
                    <Legend iconType="rect" wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' }} />

                    <Line name="Current" type="monotone" dataKey="temp" stroke="#fff" strokeWidth={2} dot={false} />
                    <Line name="T-24h" type="monotone" dataKey="prev1" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                    <Line name="T-48h" type="monotone" dataKey="prev2" stroke="#475569" strokeWidth={1} dot={false} />
                </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
