
import React, { useEffect, useRef, useState } from 'react';
import { Rock } from '../types';
import { Loader2, MapPin, Radar, Crosshair, Target } from 'lucide-react';

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Loc error', err)
      );
    }
  }, []);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && (window as any).L) {
      const L = (window as any).L;

      const startLat = userLoc?.lat || 37.7749;
      const startLng = userLoc?.lng || -122.4194;
      const startZoom = userLoc ? 14 : 3;

      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
      }).setView([startLat, startLng], startZoom);
      mapInstanceRef.current = map;

      // Dark Matter / Matrix Style Map Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        opacity: 0.8 // Slightly transparent to blend with background
      }).addTo(map);

      rockLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        rockLayerRef.current = null;
        userMarkerRef.current = null;
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
          className: 'custom-user-marker',
          html: `<div class="relative w-4 h-4">
                    <div class="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div>
                    <div class="relative w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_10px_#06b6d4]"></div>
                 </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(
          mapInstanceRef.current
        );
        
        mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 14, { duration: 2 });
      }
    }
  }, [userLoc]);

  useEffect(() => {
    if (mapInstanceRef.current && rockLayerRef.current && (window as any).L) {
      const L = (window as any).L;
      rockLayerRef.current.clearLayers();

      rocks.forEach((rock) => {
        if (rock.location) {
          let colorClass = 'bg-blue-500 shadow-blue-500/50';
          if (rock.type === 'Igneous') colorClass = 'bg-red-500 shadow-red-500/50';
          if (rock.type === 'Sedimentary') colorClass = 'bg-yellow-500 shadow-yellow-500/50';
          if (rock.type === 'Metamorphic') colorClass = 'bg-purple-500 shadow-purple-500/50';

          const iconHtml = `
            <div class="w-3 h-3 ${colorClass} rounded-full border border-white shadow-[0_0_10px_currentColor]"></div>
          `;

          const icon = L.divIcon({
            className: 'custom-pin',
            html: iconHtml,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const marker = L.marker([rock.location.lat, rock.location.lng], { icon });

          const popupContent = document.createElement('div');
          popupContent.className = 'text-center min-w-[160px] bg-black/90 p-2 rounded-lg border border-cyan-500/30';
          popupContent.innerHTML = `
            <div class="w-full h-20 rounded overflow-hidden mb-2 bg-gray-900 border border-white/10 relative">
                <img src="${rock.imageUrl}" class="w-full h-full object-cover opacity-80" onerror="this.style.display='none'"/>
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>
            <h3 class="font-bold text-white text-xs mb-0 uppercase tracking-wider">${rock.name}</h3>
            <p class="text-[9px] text-cyan-400 mb-2 uppercase tracking-widest">${rock.type}</p>
            <button id="btn-${rock.id}" class="bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold px-3 py-1.5 rounded hover:bg-cyan-500 hover:text-black w-full transition-all uppercase tracking-wider">
                Analyze
            </button>
          `;

          marker.bindPopup(popupContent, {
              className: 'custom-popup-cyberpunk',
              closeButton: false,
              offset: [0, -10]
          });

          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-${rock.id}`);
            if (btn) {
              btn.onclick = (e) => {
                e.stopPropagation();
                onRockClick(rock);
              };
            }
          });

          rockLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [rocks, onRockClick]);

  return (
    <div className="absolute inset-0 z-0 bg-black font-mono overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 grayscale-[0.8] brightness-75 contrast-125" />

      {/* Overlay Effects */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,#000_100%)] opacity-80 z-[400]" />
      <div className="absolute inset-0 pointer-events-none scanline z-[400] opacity-10" />

      {/* HUD Elements */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase">Live Sat Feed</span>
      </div>

      <div className="absolute top-4 right-4 z-[400] pointer-events-none">
          <Radar className="w-12 h-12 text-cyan-500/20 animate-[spin_4s_linear_infinite]" />
      </div>

      {/* Crosshairs */}
      <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center opacity-10">
          <Crosshair className="w-64 h-64 text-cyan-500" strokeWidth={0.5} />
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-24 right-4 z-[400] glass-panel p-3 rounded-none border-r-2 border-cyan-500 w-32">
        <h4 className="text-[9px] font-bold text-cyan-500 mb-2 uppercase tracking-widest border-b border-white/10 pb-1">Signatures</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-wide">
            <div className="w-1.5 h-1.5 bg-red-500 shadow-[0_0_5px_#ef4444]" /> Igneous
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-wide">
            <div className="w-1.5 h-1.5 bg-yellow-500 shadow-[0_0_5px_#eab308]" /> Sediment
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-wide">
            <div className="w-1.5 h-1.5 bg-purple-500 shadow-[0_0_5px_#a855f7]" /> Meta
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-wide">
            <div className="w-1.5 h-1.5 bg-blue-500 shadow-[0_0_5px_#3b82f6]" /> Mineral
          </div>
        </div>
      </div>

      {!rocks.length && (
        <div className="absolute bottom-32 left-0 right-0 z-[400] pointer-events-none flex justify-center">
             <div className="glass-panel px-6 py-2 rounded-full border border-cyan-500/30 flex items-center gap-3">
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Scanning Sector...</p>
             </div>
        </div>
      )}
    </div>
  );
};
