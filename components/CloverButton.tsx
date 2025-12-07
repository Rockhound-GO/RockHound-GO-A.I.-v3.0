

import React, { useState, useRef, useEffect } from 'react';

interface CloverButtonProps {
  onClick: () => void;
}

export const CloverButton: React.FC<CloverButtonProps> = ({ onClick }) => {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isDragging) setPosition({ x: clientX - dragStartRef.current.x, y: clientY - dragStartRef.current.y });
  };

  const handleEnd = () => setIsDragging(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{ position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none', zIndex: 60 }}
      className={`cursor-pointer group`}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onClick={() => !isDragging && onClick()}
    >
      <div className={`relative w-14 h-14`}>
        {/* Outer Glow */}
        <div className={`absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse group-hover:opacity-40 transition-opacity`} />
        
        {/* Core Orb */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/80 to-teal-800/80 backdrop-blur-md border border-white/20 shadow-lg shadow-emerald-500/20 overflow-hidden`}>
             <div className={`absolute inset-0 bg-emerald-300/20 blur-sm`} />
        </div>

        {/* Rotating Rings */}
        <div className={`absolute inset-0 flex items-center justify-center animate-[spin_10s_linear_infinite]`}>
             <div className={`w-16 h-16 border border-emerald-400/30 rounded-full border-t-transparent border-b-transparent transform scale-x-75`} />
        </div>
        <div className={`absolute inset-0 flex items-center justify-center animate-[spin_15s_linear_infinite_reverse]`}>
             <div className={`w-12 h-12 border border-white/40 rounded-full border-l-transparent border-r-transparent transform rotate-45`} />
        </div>

        {/* Central Pulse */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full blur-[2px] opacity-80 animate-pulse`} />
      </div>
    </div>
  );
};