
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Rock, GeologicalZone } from '../types';
import { Loader2, MapPin, Crosshair, Navigation, LocateFixed, ShieldAlert, Trees, Waves, Mountain } from 'lucide-react';

// -- AUDIO ENGINE (Local) --
const useMapSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'ping' | 'lock' | 'scan') => {
    if (!audioCtx.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx.current = new AudioContextClass();
      }
    }
    const ctx = audioCtx.current;
    if (ctx && ctx.state === 'suspended') ctx.resume();

    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'ping') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'lock') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        
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
  const zoneLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<GeologicalZone | null>(null);
  const playSound = useMapSound();

  // Simulated predicted zones
  const predictedZones: GeologicalZone[] = useMemo(() => {
    if (!userLoc) return [];
    return [
      {
        id: 'zone-1',
        type: 'METAMORPHIC',
        name: 'Contact Metamorphic Zone',
        coordinates: [userLoc.lat + 0.005, userLoc.lng + 0.005],
        radius: 300,
        access: 'PUBLIC',
        description: 'Prime area for Garnet and Epidote formation due to heat from a nearby intrusion.',
        likelyMinerals: ['Garnet', 'Epidote', 'Chlorite']
      },
      {
        id: 'zone-2',
        type: 'ALLUVIAL',
        name: 'Bartonville Alluvial Plain',
        coordinates: [userLoc.lat - 0.008, userLoc.lng - 0.002],
        radius: 500,
        access: 'PRIVATE',
        description: 'River-deposited minerals. High probability of finding water-worn Agates or Jasper.',
        likelyMinerals: ['Agate', 'Jasper', 'Gold Placer']
      }
    ];
  }, [userLoc]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Loc error', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

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
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);

      rockLayerRef.current = L.layerGroup().addTo(map);
      zoneLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && userLoc && (window as any).L) {
      const L = (window as any).L;
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-radar-icon',
          html: `<div class="relative w-4 h-4"><div class="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div><div class="relative w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_10px_#22d3ee]"></div></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(mapInstanceRef.current);
        mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 15);
      }
    }
  }, [userLoc]);

  // Visualize Prediction Zones
  useEffect(() => {
    if (mapInstanceRef.current && zoneLayerRef.current && predictedZones.length && (window as any).L) {
      const L = (window as any).L;
      zoneLayerRef.current.clearLayers();

      predictedZones.forEach(zone => {
        const color = zone.type === 'METAMORPHIC' ? '#a855f7' : zone.type === 'ALLUVIAL' ? '#3b82f6' : '#ef4444';
        const circle = L.circle([zone.coordinates[0], zone.coordinates[1]], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 1,
          dashArray: '5, 10'
        }).addTo(zoneLayerRef.current);

        circle.on('click', () => {
          playSound('ping');
          setSelectedZone(zone);
        });

        // Add a small label icon
        const zoneIcon = L.divIcon({
           className: 'zone-label',
           html: `<div class="flex items-center gap-2 bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10 text-[8px] font-black text-white uppercase tracking-tighter"><div class="w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></div> ${zone.type}</div>`,
           iconSize: [80, 20],
           iconAnchor: [40, 10]
        });
        L.marker([zone.coordinates[0], zone.coordinates[1]], { icon: zoneIcon }).addTo(zoneLayerRef.current);
      });
    }
  }, [predictedZones, playSound]);

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

          const icon = L.divIcon({
            className: 'custom-pin',
            html: `<div class="group relative flex items-center justify-center w-8 h-8 cursor-pointer hover:scale-110 transition-transform"><div class="absolute inset-0 ${colorClass} opacity-20 blur-md rounded-full group-hover:opacity-60 transition-opacity"></div><div class="w-3 h-3 ${colorClass} rotate-45 border border-white shadow-lg"></div></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const marker = L.marker([rock.location.lat, rock.location.lng], { icon });
          marker.on('click', () => { playSound('lock'); onRockClick(rock); });
          rockLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [rocks, onRockClick, playSound]);

  return (
    <div className="absolute inset-0 z-0 bg-[#050a10] overflow-hidden">
      <style>{`
        .leaflet-container { background: #050a10 !important; }
        .grid-overlay { background-image: linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px); background-size: 40px 40px; }
        @keyframes radar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <div ref={mapContainerRef} className="absolute inset-0 z-0 opacity-80" />
      <div className="absolute inset-0 pointer-events-none z-10 grid-overlay" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4 text-cyan-500/50 font-mono text-[10px] tracking-widest z-20 pointer-events-none">
          <span>090° N</span> <span>///</span> <span>180° S</span> <span>///</span> <span>270° W</span>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] rounded-full border border-cyan-500/10 pointer-events-none z-0">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(6,182,212,0.1)_360deg)] animate-[radar-sweep_4s_linear_infinite]" />
      </div>

      {selectedZone && (
        <div className="absolute bottom-32 left-6 right-6 z-30 animate-in slide-in-from-bottom-10">
          <div className="bg-[#0a0f18]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setSelectedZone(null)} className="text-gray-500 hover:text-white"><Navigation size={16} className="rotate-180" /></button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-current bg-opacity-20 border border-opacity-30 ${selectedZone.type === 'METAMORPHIC' ? 'text-purple-400 border-purple-500' : 'text-blue-400 border-blue-500'}`}>
                      {selectedZone.type === 'METAMORPHIC' ? <Mountain size={20} /> : <Waves size={20} />}
                  </div>
                  <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">{selectedZone.name}</h3>
                      <div className={`flex items-center gap-2 text-[9px] font-black uppercase ${selectedZone.access === 'PUBLIC' ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                          {selectedZone.access === 'PUBLIC' ? <Trees size={10} /> : <ShieldAlert size={10} />}
                          {selectedZone.access} ACCESS {selectedZone.access === 'PRIVATE' && ':: PERMISSION REQUIRED'}
                      </div>
                  </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed italic mb-4">"{selectedZone.description}"</p>
              <div className="flex gap-2 flex-wrap">
                  {selectedZone.likelyMinerals.map(m => (
                    <span key={m} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-cyan-400">{m}</span>
                  ))}
              </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-32 right-4 z-20 flex flex-col gap-2">
          <button onClick={() => { if (userLoc && mapInstanceRef.current) mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 16); }} className="p-3 bg-black/60 backdrop-blur border border-cyan-500/30 text-cyan-400 rounded-full"><LocateFixed size={20} /></button>
      </div>
    </div>
  );
};
