

import React, { useEffect, useState, useRef } from 'react';
import { api, AdminStats } from '../services/api';
import { ArrowLeft, Users, Activity, Globe, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
    // Initialize Leaflet Map once stats are loaded and div exists
    if (!loading && stats && mapRef.current && !leafletMap.current && (window as any).L) {
        // @ts-ignore - L is global from CDN
        const L = (window as any).L;
        
        leafletMap.current = L.map(mapRef.current).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(leafletMap.current);

        // Add heat/activity points
        stats.locations.forEach(loc => {
            L.circleMarker([loc.lat, loc.lng], {
                radius: 4,
                fillColor: "#00C853", // Emerald Green
                color: "#000",
                weight: 1,
                opacity: 0.6,
                fillOpacity: 0.6
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
      <div className={`h-full flex items-center justify-center bg-gray-900`}>
        <Loader2 className={`w-12 h-12 text-indigo-500 animate-spin`} />
      </div>
    );
  }

  if (!stats) return <div className={`p-8 text-center text-white`}>Failed to load stats.</div>;

  return (
    <div className={`h-full bg-gray-900 flex flex-col overflow-y-auto no-scrollbar`}>
      {/* Header */}
      <div className={`flex items-center gap-4 p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-10`}>
        <button onClick={onBack} className={`p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors`}>
          <ArrowLeft className={`w-5 h-5`} />
        </button>
        <h1 className={`text-xl font-bold text-white flex items-center gap-2`}>
            <Globe className={`w-5 h-5 text-indigo-500`} />
            Creator Dashboard
        </h1>
      </div>

      <div className={`p-6 space-y-6 pb-20`}>
        
        {/* Key Metrics */}
        <div className={`grid grid-cols-3 gap-4`}>
            <div className={`bg-gray-800/50 p-4 rounded-xl border border-gray-700`}>
                <div className={`flex items-center gap-2 mb-2`}>
                    <Users className={`w-4 h-4 text-blue-400`} />
                    <span className={`text-xs text-gray-400 uppercase font-bold`}>Total Users</span>
                </div>
                <div className={`text-2xl font-bold text-white`}>{stats.totalUsers.toLocaleString()}</div>
            </div>
            <div className={`bg-gray-800/50 p-4 rounded-xl border border-gray-700`}>
                <div className={`flex items-center gap-2 mb-2`}>
                    <Activity className={`w-4 h-4 text-green-400`} />
                    <span className={`text-xs text-gray-400 uppercase font-bold`}>Active (24h)</span>
                </div>
                <div className={`text-2xl font-bold text-white`}>{stats.activeUsers.toLocaleString()}</div>
            </div>
            <div className={`bg-gray-800/50 p-4 rounded-xl border border-gray-700`}>
                <div className={`flex items-center gap-2 mb-2`}>
                    <Globe className={`w-4 h-4 text-purple-400`} />
                    <span className={`text-xs text-gray-400 uppercase font-bold`}>Discoveries</span>
                </div>
                <div className={`text-2xl font-bold text-white`}>{stats.totalRocks.toLocaleString()}</div>
            </div>
        </div>

        {/* Global Live Map */}
        <div className={`space-y-2`}>
            <h3 className={`text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2`}>
                <span className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`} />
                Live Global Activity
            </h3>
            <div className={`h-64 w-full rounded-2xl overflow-hidden border border-gray-700 shadow-xl relative z-0`}>
                <div ref={mapRef} className={`w-full h-full bg-gray-800`} />
            </div>
            <p className={`text-xs text-gray-500`}>Real-time geolocation of recent rock discoveries.</p>
        </div>

        {/* Activity Graph */}
        <div className={`bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50`}>
            <h3 className={`text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4`}>Player Activity (7 Days)</h3>
            <div className={`h-52 w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.activityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                            dataKey="_id" 
                            stroke="#9ca3af" 
                            fontSize={10} 
                            tickFormatter={(str) => str.slice(5)} // Show MM-DD
                        />
                        <YAxis stroke="#9ca3af" fontSize={10} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                            itemStyle={{ color: '#818cf8' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#818cf8" 
                            strokeWidth={3} 
                            dot={{ fill: '#818cf8', strokeWidth: 2 }} 
                            activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};