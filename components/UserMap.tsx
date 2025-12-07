import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Rock } from '../types';
import { Loader2, MapPin, Crosshair, Navigation, LocateFixed } from 'lucide-react';

// -- AUDIO ENGINE (Local) --
const useMapSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'ping' | 'lock' | 'scan') => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'ping') { // Radar blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'lock') { // Target acquisition
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        
        // Double beep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(400, now + 0.1);
        gain2.gain.setValueAtTime(0.05, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.15);
    }
  }, []);

  return playSound;
};

interface UserMapProps {
  rocks: Rock[];
  onRockClick: (rock: Rock) => void;
}

export const UserMap: React.FC<UserMapProps> = ({ rocks, onRockClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const rockLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const playSound = useMapSound();

  // 1. Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Loc error', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && (window as any).L) {
      const L = (window as any).L;

      const startLat = userLoc?.lat || 37.7749;
      const startLng = userLoc?.lng || -122.4194;
      const startZoom = userLoc ? 15 : 4;

      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
      }).setView([startLat, startLng], startZoom);
      
      mapInstanceRef.current = map;

      // Dark Matter Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(map);

      rockLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Update User Marker
  useEffect(() => {
    if (mapInstanceRef.current && userLoc && (window as any).L) {
      const L = (window as any).L;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
      } else {
        // Pulsing Radar Dot
        const userIcon = L.divIcon({
          className: 'user-radar-icon',
          html: `
            <div class="relative w-4 h-4">
                <div class="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div>
                <div class="relative w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_10px_#22d3ee]"></div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(mapInstanceRef.current);
        mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 15);
      }
    }
  }, [userLoc]);

  // 4. Update Rock Markers
  useEffect(() => {
    if (mapInstanceRef.current && rockLayerRef.current && (window as any).L) {
      const L = (window as any).L;
      rockLayerRef.current.clearLayers();

      rocks.forEach((rock) => {
        if (rock.location) {
          let colorClass = 'bg-blue-500';
          if (rock.type === 'Igneous') colorClass = 'bg-red-500';
          if (rock.type === 'Sedimentary') colorClass = 'bg-yellow-500';
          if (rock.type === 'Metamorphic') colorClass = 'bg-purple-500';

          const iconHtml = `
            <div class="group relative flex items-center justify-center w-8 h-8 cursor-pointer hover:scale-110 transition-transform">
                <div class="absolute inset-0 ${colorClass} opacity-20 blur-md rounded-full group-hover:opacity-60 transition-opacity"></div>
                <div class="w-3 h-3 ${colorClass} rotate-45 border border-white shadow-lg"></div>
                <div class="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-[8px] text-white font-mono whitespace-nowrap border border-white/10">
                    ${rock.name}
                </div>
            </div>
          `;

          const icon = L.divIcon({
            className: 'custom-pin',
            html: iconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([rock.location.lat, rock.location.lng], { icon });
          
          marker.on('click', () => {
              playSound('lock');
              onRockClick(rock);
          });

          rockLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [rocks, onRockClick, playSound]);

  const handleRecenter = () => {
      if (userLoc && mapInstanceRef.current) {
          playSound('scan');
          mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 16);
      }
  };

  return (
    <div className="absolute inset-0 z-0 bg-[#050a10] overflow-hidden">
      <style>{`
        .leaflet-container { background: #050a10 !important; }
        /* Tactical Grid Overlay */
        .grid-overlay {
            background-image: 
                linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px);
            background-size: 40px 40px;
        }
        @keyframes radar-sweep { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
      `}</style>

      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 opacity-80" />
      
      {/* Tactical Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 grid-overlay" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      {/* Compass HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 text-cyan-500/50 font-mono text-[10px] tracking-widest z-20 pointer-events-none">
          <span>090° N</span>
          <span>///</span>
          <span>180° S</span>
          <span>///</span>
          <span>270° W</span>
      </div>

      {/* Radar Sweep Effect (Centered on screen) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] rounded-full border border-cyan-500/10 pointer-events-none z-0">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(6,182,212,0.1)_360deg)] animate-[radar-sweep_4s_linear_infinite]" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-32 right-4 z-20 flex flex-col gap-2">
          <button 
            onClick={handleRecenter}
            className="p-3 bg-black/60 backdrop-blur border border-cyan-500/30 text-cyan-400 rounded-full shadow-lg hover:bg-cyan-900/30 transition-all active:scale-95"
          >
              <LocateFixed className="w-5 h-5" />
          </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur border border-white/10 p-3 rounded-xl shadow-xl max-w-[120px]">
        <h4 className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-widest flex items-center gap-2">
            <Crosshair className="w-3 h-3 text-cyan-500" /> Targets
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] text-gray-300 font-mono">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#ef4444] border border-white/50" /> IGNEOUS
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-300 font-mono">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#eab308] border border-white/50" /> SEDIMENTARY
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-300 font-mono">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#a855f7] border border-white/50" /> METAMORPHIC
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-300 font-mono">
            <div className="w-1.5 h-1.5 rotate-45 bg-[#3b82f6] border border-white/50" /> MINERAL
          </div>
        </div>
      </div>

      {/* Loading State */}
      {!rocks.length && (
        <div className="absolute bottom-8 left-0 right-0 z-20 pointer-events-none flex justify-center">
             <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-3">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Scanning Sector...
                </p>
             </div>
        </div>
      )}
    </div>
  );
};