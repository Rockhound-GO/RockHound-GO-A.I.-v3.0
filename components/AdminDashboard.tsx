import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api, AdminStats } from '../services/api';
import { ArrowLeft, Users, Activity, Globe, Loader2, Terminal, ShieldAlert, Cpu, Lock, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

// -- AUDIO ENGINE (Local) --
const useAdminSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'hover' | 'click' | 'alert') => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }, []);

  return playSound;
};

// -- DUMMY LOG DATA GENERATOR --
const generateLog = () => {
  const actions = ['USER_LOGIN', 'DB_SYNC', 'ANOMALY_DETECTED', 'ROCK_UPLOAD', 'API_LATENCY_CHECK'];
  const status = ['OK', 'SUCCESS', 'PENDING', 'VERIFIED'];
  const id = Math.floor(Math.random() * 9999).toString(16).toUpperCase();
  return `[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random() * actions.length)]} :: ID_${id} ... ${status[Math.floor(Math.random() * status.length)]}`;
};

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const playSound = useAdminSound();

  // Load Data
  useEffect(() => {
    loadStats();
    // Initialize fake terminal logs
    setLogs(Array(8).fill(0).map(generateLog));
  }, []);

  // Live Terminal Effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) { // Random updates
        setLogs(prev => [generateLog(), ...prev.slice(0, 15)]);
        // playSound('hover'); // Subtle subtle sound on update might be annoying, keeping it silent for now
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Map Initialization
  useEffect(() => {
    if (!loading && stats && mapRef.current && !leafletMap.current && (window as any).L) {
        // @ts-ignore
        const L = (window as any).L;
        
        leafletMap.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(leafletMap.current);

        // Add pulsing markers
        stats.locations.forEach(loc => {
            const pulseIcon = L.divIcon({
                className: 'pulse-icon',
                html: '<div class="w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-75"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            L.marker([loc.lat, loc.lng], { icon: pulseIcon }).addTo(leafletMap.current);
            
            // Static center dot
            L.circleMarker([loc.lat, loc.lng], {
                radius: 2,
                fillColor: "#fff",
                color: "transparent",
                fillOpacity: 1
            }).addTo(leafletMap.current);
        });
    }

    return () => {
        if (leafletMap.current) {
            leafletMap.current.remove();
            leafletMap.current = null;
        }
    }
  }, [loading, stats]);

  const loadStats = async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black space-y-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-cyan-500 animate-pulse" />
            </div>
        </div>
        <p className="text-cyan-500 font-mono text-xs tracking-widest animate-pulse">ESTABLISHING SECURE LINK...</p>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-center text-red-500 font-mono">CONNECTION FAILURE. RETRYING...</div>;

  return (
    <div className="h-full bg-[#050a10] flex flex-col overflow-hidden relative font-sans">
      <style>{`
        .bg-grid-pattern {
            background-image: linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
        }
        @keyframes scan-vertical { 0% { top: -100%; } 100% { top: 200%; } }
        .animate-scan { animation: scan-vertical 8s linear infinite; }
      `}</style>

      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-900/30 bg-[#050a10]/90 backdrop-blur z-20">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => { playSound('click'); onBack(); }} 
                onMouseEnter={() => playSound('hover')}
                className="p-2 rounded-lg border border-white/10 hover:bg-cyan-900/20 hover:border-cyan-500/50 hover:text-cyan-400 text-gray-400 transition-all group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-widest uppercase">
                    <Globe className="w-5 h-5 text-cyan-500 animate-[spin_10s_linear_infinite]" />
                    Command Center
                </h1>
                <div className="flex gap-2 text-[10px] text-cyan-500/60 font-mono">
                    <span>SYS.STATUS: ONLINE</span>
                    <span>•</span>
                    <span>ENCRYPTION: AES-256</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-xs font-mono uppercase animate-pulse">
            <Lock className="w-3 h-3" /> Admin Access Granted
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10 p-6 flex gap-6">
        
        {/* Main Dashboard Area (Left) */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-20">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
                <MetricCard 
                    label="Total Operatives" 
                    value={stats.totalUsers.toLocaleString()} 
                    icon={<Users className="w-5 h-5 text-blue-400" />} 
                    color="blue"
                    playSound={playSound}
                />
                <MetricCard 
                    label="Active Signals" 
                    value={stats.activeUsers.toLocaleString()} 
                    icon={<Activity className="w-5 h-5 text-green-400" />} 
                    color="green"
                    playSound={playSound}
                />
                <MetricCard 
                    label="Total Artifacts" 
                    value={stats.totalRocks.toLocaleString()} 
                    icon={<Database className="w-5 h-5 text-purple-400" />} 
                    color="purple"
                    playSound={playSound}
                />
            </div>

            {/* Tactical Map */}
            <div className="relative group rounded-2xl border border-cyan-900/30 overflow-hidden bg-black/40 shadow-2xl h-[400px]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent z-20 opacity-50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] pointer-events-none z-10" />
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur px-3 py-1 rounded border border-white/10 text-xs text-cyan-400 font-mono">
                    LIVE_FEED::GLOBAL_SAT_UPLINK
                </div>
                
                {/* Scanline overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                <div className="absolute top-0 left-0 right-0 h-[20%] bg-gradient-to-b from-cyan-500/10 to-transparent z-10 animate-scan pointer-events-none" />

                <div ref={mapRef} className="w-full h-full grayscale-[50%] contrast-125" />
            </div>

            {/* Activity Graph */}
            <div className="bg-gray-900/30 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" /> 
                        Signal Frequency (7 Days)
                    </h3>
                    <div className="flex gap-1">
                        {[1,2,3].map(i => <div key={i} className={`w-1 h-1 rounded-full bg-cyan-500/50 animate-pulse`} style={{ animationDelay: `${i * 0.2}s`}} />)}
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.activityData}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis 
                                dataKey="_id" 
                                stroke="#64748b" 
                                fontSize={10} 
                                tickFormatter={(str) => str.slice(5)}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
                                itemStyle={{ color: '#22d3ee' }}
                                cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="count" 
                                stroke="#06b6d4" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorCount)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Side Terminal (Right) */}
        <div className="w-80 flex-none flex flex-col gap-4">
            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur flex flex-col">
                <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Terminal size={12} /> System Logs
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                </div>
                <div className="flex-1 p-4 font-mono text-[10px] space-y-2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none" />
                    {logs.map((log, i) => (
                        <div key={i} className={`opacity-${Math.max(20, 100 - i * 10)} text-cyan-100/80 border-l-2 border-cyan-900 pl-2`}>
                            {log}
                        </div>
                    ))}
                    <div className="flex items-center gap-2 text-cyan-500 animate-pulse">
                        <span>_</span>
                    </div>
                </div>
            </div>

            <div className="h-1/3 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                <Cpu className="w-12 h-12 text-indigo-400 mb-4 animate-[pulse_3s_ease-in-out_infinite]" />
                <h3 className="text-white font-bold text-sm tracking-widest uppercase mb-1">Server Load</h3>
                <div className="text-3xl font-mono text-indigo-300 font-bold mb-2">42%</div>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[42%] shadow-[0_0_10px_#6366f1]" />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Optimal Performance</p>
            </div>
        </div>

      </div>
    </div>
  );
};

// -- MICRO COMPONENT: METRIC CARD --
const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string; playSound: any }> = ({ label, value, icon, color, playSound }) => {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500/10 to-transparent border-blue-500/30 text-blue-400',
        green: 'from-green-500/10 to-transparent border-green-500/30 text-green-400',
        purple: 'from-purple-500/10 to-transparent border-purple-500/30 text-purple-400',
    };

    return (
        <div 
            onMouseEnter={() => playSound('hover')}
            className={`relative p-5 rounded-xl border bg-gradient-to-br ${colorClasses[color]} bg-gray-900/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:scale-105 group hover:shadow-2xl hover:shadow-${color}-500/10`}
        >
            <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                {icon}
            </div>
            <div className="relative z-10">
                <div className={`text-3xl font-bold text-white mb-1 font-mono tracking-tighter`}>{value}</div>
                <div className={`text-[10px] uppercase font-bold tracking-[0.2em] opacity-70 group-hover:opacity-100 transition-opacity text-${color}-300`}>
                    {label}
                </div>
            </div>
            
            {/* Animated Bottom Bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
        </div>
    );
};