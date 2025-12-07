

import React, { useEffect, useRef, useState } from 'react';
import { Rock } from '../types';
import { Loader2, MapPin } from 'lucide-react';

interface UserMapProps {
  rocks: Rock[];
  onRockClick: (rock: Rock) => void;
}

export const UserMap: React.FC<UserMapProps> = ({ rocks, onRockClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const rockLayerRef = useRef<any>(null); // Dedicated layer for rocks
  const userMarkerRef = useRef<any>(null); // Reference to update user position
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // 1. Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Loc error', err)
      );
    }
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    // Only initialize if map doesn't exist and L is available
    if (mapContainerRef.current && !mapInstanceRef.current && (window as any).L) {
      const L = (window as any).L;

      const startLat = userLoc?.lat || 37.7749;
      const startLng = userLoc?.lng || -122.4194;
      const startZoom = userLoc ? 14 : 3; // Zoom in closer if we have user loc

      // Create Map
      const map = L.map(mapContainerRef.current).setView([startLat, startLng], startZoom);
      mapInstanceRef.current = map;

      // Add Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Create a LayerGroup specifically for rocks and add it to map
      rockLayerRef.current = L.layerGroup().addTo(map);
    }

    // Cleanup function to destroy map on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        rockLayerRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, []); // Run once on mount (dependency array empty intentionally to avoid re-init)

  // 3. Update User Marker & View
  useEffect(() => {
    if (mapInstanceRef.current && userLoc && (window as any).L) {
      const L = (window as any).L;

      // If marker exists, move it. If not, create it.
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'custom-user-marker',
          html: `<div style="background-color: #4f46e5; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 10px rgba(79, 70, 229, 0.2);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(
          mapInstanceRef.current
        );
        
        // Fly to user location smoothly
        mapInstanceRef.current.flyTo([userLoc.lat, userLoc.lng], 14);
      }
    }
  }, [userLoc]);

  // 4. Update Rock Markers
  useEffect(() => {
    if (mapInstanceRef.current && rockLayerRef.current && (window as any).L) {
      const L = (window as any).L;

      // Clear ONLY the rock layer, leaving the user marker and tiles alone
      rockLayerRef.current.clearLayers();

      rocks.forEach((rock) => {
        if (rock.location) {
          let color = '#3b82f6'; // blue
          if (rock.type === 'Igneous') color = '#ef4444';
          if (rock.type === 'Sedimentary') color = '#eab308';
          if (rock.type === 'Metamorphic') color = '#a855f7';

          const iconHtml = `
            <div style="
                background-color: ${color}; 
                width: 24px; height: 24px; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg);
                border: 2px solid white; 
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            ">
                <div style="width: 6px; height: 6px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
          `;

          const icon = L.divIcon({
            className: 'custom-pin',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -28],
          });

          const marker = L.marker([rock.location.lat, rock.location.lng], { icon });

          // Create Popup
          const popupContent = document.createElement('div');
          popupContent.className = 'text-center min-w-[150px]';
          popupContent.innerHTML = `
            <div class="w-full h-24 rounded-lg overflow-hidden mb-2 bg-gray-800">
                <img src="${rock.imageUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'"/>
            </div>
            <h3 class="font-bold text-gray-900 text-sm mb-0">${rock.name}</h3>
            <p class="text-[10px] text-gray-500 mb-2 capitalize">${rock.type}</p>
            <button id="btn-${rock.id}" class="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-indigo-700 w-full transition-colors">
                View Details
            </button>
          `;

          marker.bindPopup(popupContent);

          // Attach click listener for the button inside the popup
          marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-${rock.id}`);
            if (btn) {
              btn.onclick = (e) => {
                e.stopPropagation(); // Prevent map click
                onRockClick(rock);
              };
            }
          });

          // Add to the specific ROCK LAYER group, not directly to map
          rockLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [rocks, onRockClick]);

  return (
    <div className={`absolute inset-0 z-0 bg-gray-900`}>
      <div ref={mapContainerRef} className={`absolute inset-0 z-0`} />

      {/* Legend Overlay */}
      <div className={`absolute top-4 right-4 z-[400] bg-gray-900/90 backdrop-blur border border-gray-700 p-3 rounded-xl shadow-xl max-w-[150px]`}>
        <h4 className={`text-xs font-bold text-white mb-2 uppercase tracking-wide`}>Map Key</h4>
        <div className={`space-y-1.5`}>
          <div className={`flex items-center gap-2 text-[10px] text-gray-300`}>
            <div className={`w-2 h-2 rounded-full bg-[#ef4444]`} /> Igneous
          </div>
          <div className={`flex items-center gap-2 text-[10px] text-gray-300`}>
            <div className={`w-2 h-2 rounded-full bg-[#eab308]`} /> Sedimentary
          </div>
          <div className={`flex items-center gap-2 text-[10px] text-gray-300`}>
            <div className={`w-2 h-2 rounded-full bg-[#a855f7]`} /> Metamorphic
          </div>
          <div className={`flex items-center gap-2 text-[10px] text-gray-300`}>
            <div className={`w-2 h-2 rounded-full bg-[#3b82f6]`} /> Mineral/Other
          </div>
        </div>
      </div>

      {!rocks.length && (
        <div className={`absolute bottom-8 left-4 right-4 z-[400] pointer-events-none flex justify-center`}>
             <div className={`bg-gray-800/90 backdrop-blur px-4 py-2 rounded-full border border-gray-700 shadow-lg`}>
                <p className={`text-xs text-gray-300 flex items-center gap-2`}>
                    <Loader2 className={`w-3 h-3 animate-spin`} />
                    Scanning for local rocks...
                </p>
             </div>
        </div>
      )}
    </div>
  );
};