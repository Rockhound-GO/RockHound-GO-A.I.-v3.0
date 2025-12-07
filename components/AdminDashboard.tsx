
import React, { useEffect, useState, useRef } from 'react';
import { api, AdminStats } from '../services/api';
import { ArrowLeft, Users, Activity, Globe, Loader2, Database, ShieldAlert, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart } from 'recharts';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!loading && stats && mapRef.current && !leafletMap.current && (window as any).L) {
        const L = (window as any).L;
        
        leafletMap.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            opacity: 0.7
        }).addTo(leafletMap.current);

        stats.locations.forEach(loc => {
            L.circleMarker([loc.lat, loc.lng], {
                radius: 2,
                fillColor: "#00ffcc",
                color: "#00ffcc",
                weight: 0,
                opacity: 0.8,
                fillOpacity: 0.8
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
      <div className="h-full flex items-center justify-center bg-black font-mono">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            <p className="text-green-500 text-xs tracking-widest animate-pulse">ESTABLISHING ROOT ACCESS...</p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-center text-red-500 font-mono">CONNECTION TERMINATED.</div>;

  return (
    <div className="h-full bg-black flex flex-col overflow-y-auto no-scrollbar font-mono relative">
      <div className="fixed inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-900/50 bg-black/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 border border-green-900/50 rounded hover:bg-green-900/20 text-green-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-green-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Mainframe Control
            </h1>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-green-700 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            ONLINE
        </div>
      </div>

      <div className="p-6 space-y-6 pb-20 relative z-0">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-900/10 p-4 border border-green-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                    <Users className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-[10px] text-green-600 uppercase font-bold tracking-widest mb-1">Operatives</div>
                <div className="text-2xl font-black text-green-400 group-hover:text-green-300 transition-colors">{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className="bg-green-900/10 p-4 border border-green-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                    <Activity className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-[10px] text-green-600 uppercase font-bold tracking-widest mb-1">Active Sessions</div>
                <div className="text-2xl font-black text-green-400 group-hover:text-green-300 transition-colors">{stats.activeUsers.toLocaleString()}</div>
            </div>
            <div className="bg-green-900/10 p-4 border border-green-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                    <Database className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-[10px] text-green-600 uppercase font-bold tracking-widest mb-1">Data Shards</div>
                <div className="text-2xl font-black text-green-400 group-hover:text-green-300 transition-colors">{stats.totalRocks.toLocaleString()}</div>
            </div>
        </div>

        {/* Global Live Map */}
        <div className="border border-green-500/30 bg-black relative">
            <div className="absolute top-2 left-2 z-[400] bg-black/80 border border-green-500/50 px-2 py-1 text-[9px] text-green-400 uppercase tracking-widest">
                Global Threat Map
            </div>
            <div className="h-64 w-full grayscale contrast-125 brightness-75 invert">
                <div ref={mapRef} className="w-full h-full" />
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-[400]" />
            <div className="absolute inset-0 pointer-events-none scanline z-[400] opacity-20" />
        </div>

        {/* Activity Graph */}
        <div className="bg-green-900/5 p-4 border border-green-500/30">
            <h3 className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Traffic Analysis
            </h3>
            <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.activityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" vertical={false} />
                        <XAxis 
                            dataKey="_id" 
                            stroke="#065f46"
                            fontSize={9}
                            tickFormatter={(str) => str.slice(5)}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis stroke="#065f46" fontSize={9} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', borderColor: '#22c55e', color: '#22c55e', borderRadius: '0', fontSize: '10px' }}
                            itemStyle={{ color: '#4ade80' }}
                            cursor={{ stroke: '#22c55e', strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="count" fill="#22c55e" fillOpacity={0.1} stroke="none" />
                        <Line 
                            type="step"
                            dataKey="count" 
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={{ fill: '#000', stroke: '#22c55e', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, fill: '#fff' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* System Logs */}
        <div className="border-t border-green-900/50 pt-4 mt-4">
            <div className="text-[9px] text-green-800 font-mono space-y-1">
                <p>&gt; SYSTEM CHECK COMPLETE</p>
                <p>&gt; MEMORY INTEGRITY: 99.9%</p>
                <p>&gt; FIREWALL: ACTIVE</p>
                <p className="animate-pulse">&gt; AWAITING INPUT_</p>
            </div>
        </div>

      </div>
    </div>
  );
};
