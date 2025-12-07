import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getWeatherData } from '../services/weatherService';
import { WeatherData } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area } from 'recharts';
import { CloudRain, Sun, Clock, MapPin, Loader2, ArrowLeft, Cloud, Wind, Droplets } from 'lucide-react';

// -- AUDIO ENGINE (Local Ambience) --
const useWeatherSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const ambienceRef = useRef<OscillatorNode | null>(null);

  const startAmbience = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Wind/White Noise Generator
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }
    let lastOut = 0;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    // Filter to make it sound like wind
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.05;

    // LFO for wind gusting
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    lfo.start();

    // Store refs to stop later
    // For simplicity in this hook, we just return a stop function
    return () => {
        noise.stop();
        lfo.stop();
        gain.disconnect();
    };
  }, []);

  return startAmbience;
};

interface WeatherDashboardProps {
  onBack: () => void;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({ onBack }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const startAmbience = useWeatherSound();
  const stopAmbienceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadData();
    // Start subtle wind noise
    stopAmbienceRef.current = startAmbience();
    return () => {
        if (stopAmbienceRef.current) stopAmbienceRef.current();
    };
  }, [startAmbience]);

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
      <div className="h-full flex flex-col items-center justify-center bg-[#050a10] space-y-6">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-900 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <Cloud className="absolute inset-0 m-auto text-indigo-400 w-8 h-8 animate-pulse" />
        </div>
        <p className="text-indigo-400/50 font-mono text-xs tracking-[0.3em] animate-pulse">ACQUIRING SATELLITE FEED...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-400 font-mono">SIGNAL LOST. RETRYING...</div>;

  // Chart Data Prep
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
    <div className="h-full bg-[#050a10] flex flex-col overflow-y-auto no-scrollbar pb-20 relative font-sans">
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />

      {/* Header */}
      <div className="p-6 relative z-10">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:scale-105 group">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <Wind className="w-5 h-5 text-indigo-400" />
                    Field Conditions
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    LIVE TELEMETRY
                </div>
            </div>
        </div>
        
        {/* Main Status Card */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-gray-900/40 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
            
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 bg-indigo-500/10 w-fit px-2 py-1 rounded border border-indigo-500/20">
                        <MapPin className="w-3 h-3" /> Berlin Sector
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                            {currentTemp}°
                        </span>
                        <span className="text-xl font-medium text-gray-400">F</span>
                    </div>
                    <div className="mt-4 flex gap-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Droplets className="w-3 h-3 text-cyan-400" />
                            <span>Hum: 42%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Wind className="w-3 h-3 text-gray-300" />
                            <span>Wind: 12mph NW</span>
                        </div>
                    </div>
                </div>
                
                {/* Weather Icon (Dynamic) */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
                    <Sun className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-[spin_60s_linear_infinite]" />
                </div>
            </div>
        </div>
      </div>

      <div className="px-6 space-y-6 relative z-10">
        
        {/* 24 Hour Forecast */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3 text-indigo-400" /> 24-Hour Projection
            </h3>
          </div>
          
          <div className="h-64 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickMargin={10}
                  interval={3}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  unit="°"
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="url(#lineGrad)" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#fff', stroke: '#818cf8', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sky Cover Analysis */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Cloud className="w-3 h-3 text-cyan-400" /> Sky Cover Density
            </h3>
          </div>
          
          <div className="h-64 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyChartData} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickMargin={10}
                    interval={3}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    yAxisId="left"
                    stroke="#818cf8" 
                    fontSize={10} 
                    unit="°"
                    domain={['auto', 'auto']}
                    orientation="left"
                    axisLine={false}
                    tickLine={false}
                    hide
                />
                <YAxis 
                    yAxisId="right"
                    stroke="#3b82f6" 
                    fontSize={10} 
                    unit="%"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                
                <Area 
                    yAxisId="right"
                    name="Cloud Cover %"
                    type="monotone" 
                    dataKey="cloud" 
                    fill="url(#cloudGrad)" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                />
                
                <Line 
                    yAxisId="left"
                    name="Temp"
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#fff" 
                    strokeWidth={1} 
                    strokeOpacity={0.5}
                    dot={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trends */}
        <div className="bg-[#0a0f18]/80 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <CloudRain className="w-3 h-3 text-emerald-400" /> Historical Delta (3 Days)
            </h3>
          </div>
          
          <div className="h-64 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyChartData} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px', fontFamily: 'monospace' }} />
                
                <Line name="Today" type="monotone" dataKey="temp" stroke="#fff" strokeWidth={2} dot={false} />
                <Line name="Yesterday" type="monotone" dataKey="prev1" stroke="#9ca3af" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                <Line name="2 Days Ago" type="monotone" dataKey="prev2" stroke="#4b5563" strokeWidth={2} dot={false} strokeOpacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};