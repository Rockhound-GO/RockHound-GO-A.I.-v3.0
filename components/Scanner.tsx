import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RotateCcw, X, ScanLine, Loader2, Zap, Sun, Ruler, Focus, Crosshair } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { identifyRock, generateReferenceImage } from '../services/geminiService';
import { Rock, RockType } from '../types';

interface ScannerProps {
  onRockDetected: (rock: Rock) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onRockDetected }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  // AR Simulation State
  const [lightingStatus, setLightingStatus] = useState<'LOW' | 'OPTIMAL' | 'HIGH'>('LOW');
  const [range, setRange] = useState(0.0);
  const [isFocused, setIsFocused] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  // -- SENSOR SIMULATION ENGINE --
  useEffect(() => {
    if (imgSrc) return; // Stop simulation if image captured

    // Simulate Range Finder (fluctuating distance)
    const rangeInterval = setInterval(() => {
      setRange(prev => {
        const drift = (Math.random() - 0.5) * 0.05;
        const newRange = Math.max(0.15, Math.min(0.8, 0.4 + drift)); // Hover around 0.4m
        return parseFloat(newRange.toFixed(2));
      });
    }, 200);

    // Simulate Lighting & Focus lock sequence
    const lockTimer = setTimeout(() => {
        setLightingStatus('OPTIMAL');
        // Slight delay for focus lock
        setTimeout(() => setIsFocused(true), 1500);
    }, 2000);

    return () => {
        clearInterval(rangeInterval);
        clearTimeout(lockTimer);
    };
  }, [imgSrc]);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!imgSrc) return;
    setIsScanning(true);
    try {
      const analysis = await identifyRock(imgSrc);
      
      const rockData: Rock = {
        ...analysis,
        id: crypto.randomUUID(),
        userId: 'temp', 
        dateFound: Date.now(),
        imageUrl: imgSrc,
        status: 'approved',
        comparisonImageUrl: await generateReferenceImage(imgSrc, analysis.name),
      };

      onRockDetected(rockData);
    } catch (error) {
      console.error(error);
      toast.error('Identification failed. Try a clearer image.');
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImgSrc(null);
    setIsScanning(false);
    setIsFocused(false);
    setLightingStatus('LOW');
  };

  // Dynamic Styles based on Lock Status
  const hudColor = isFocused ? 'text-emerald-400 border-emerald-400/50' : 'text-cyan-400 border-cyan-400/50';
  const hudShadow = isFocused ? 'shadow-[0_0_20px_#10b981]' : 'shadow-[0_0_20px_#22d3ee]';

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden font-mono">
      {/* Viewfinder Layer */}
      <div className="flex-1 relative overflow-hidden">
        {!imgSrc ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode }}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
        )}

        {/* --- AR HUD OVERLAY --- */}
        {!imgSrc && (
          <div className="absolute inset-0 pointer-events-none">
             
             {/* 1. Holographic Grid Floor */}
             <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.1)_50%)] bg-[size:100%_40px] [perspective:1000px] [transform:rotateX(60deg)_translateY(-100px)] opacity-30" />
             
             {/* 2. Top Status Bar */}
             <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                 <div className="space-y-1">
                     <div className={`flex items-center gap-2 text-[10px] font-bold tracking-widest ${isFocused ? 'text-emerald-400' : 'text-cyan-400'}`}>
                         <Focus size={12} className={isFocused ? '' : 'animate-spin-slow'} />
                         {isFocused ? 'TARGET_LOCKED' : 'ACQUIRING_TARGET...'}
                     </div>
                     <div className="flex gap-0.5">
                         {[1,2,3,4,5].map(i => (
                             <div key={i} className={`h-1 w-4 rounded-sm transition-colors ${i < 4 ? (isFocused ? 'bg-emerald-500' : 'bg-cyan-500') : 'bg-gray-700'}`} />
                         ))}
                     </div>
                 </div>
                 <div className="text-right">
                     <div className="text-[10px] text-gray-400 uppercase">SYS_TIME</div>
                     <div className="text-xs font-bold text-white">{new Date().toLocaleTimeString([], {hour12: false})}</div>
                 </div>
             </div>

             {/* 3. Central Reticle */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className={`relative w-64 h-64 border-2 rounded-2xl transition-all duration-500 ${hudColor} ${hudShadow} flex items-center justify-center`}>
                  
                  {/* Corner Brackets */}
                  <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 -mt-1 -ml-1 transition-colors ${hudColor}`} />
                  <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 -mt-1 -mr-1 transition-colors ${hudColor}`} />
                  <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 -mb-1 -ml-1 transition-colors ${hudColor}`} />
                  <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 -mb-1 -mr-1 transition-colors ${hudColor}`} />

                  {/* Center Crosshair */}
                  <div className={`absolute w-4 h-4 border border-current rounded-full flex items-center justify-center opacity-80`}>
                      <div className="w-0.5 h-full bg-current" />
                      <div className="h-0.5 w-full bg-current absolute" />
                  </div>

                  {/* Dynamic Scanning Line */}
                  <div className="absolute inset-0 border-t border-cyan-500/50 opacity-50 animate-[scan-vertical_2s_ease-in-out_infinite]" />
                  
                  {/* Framing Hint */}
                  {!isFocused && (
                      <div className="absolute -bottom-8 text-[10px] font-bold text-white bg-black/50 px-3 py-1 rounded backdrop-blur border border-white/10 animate-pulse">
                          ALIGN SPECIMEN IN CENTER
                      </div>
                  )}
               </div>
             </div>

             {/* 4. Side Metrics (Lighting & Range) */}
             <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-6">
                 
                 {/* Lighting Meter */}
                 <div className="bg-black/40 backdrop-blur p-2 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                     <Sun size={16} className={lightingStatus === 'OPTIMAL' ? 'text-yellow-400' : 'text-gray-500'} />
                     <div className="h-24 w-1.5 bg-gray-800 rounded-full relative overflow-hidden">
                         <div 
                            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${lightingStatus === 'OPTIMAL' ? 'bg-yellow-400 h-[80%]' : 'bg-red-500 h-[30%]'}`} 
                         />
                     </div>
                     <span className="text-[8px] text-gray-400 font-bold uppercase rotate-90 mt-2">LUMENS</span>
                 </div>

                 {/* Range Finder */}
                 <div className="bg-black/40 backdrop-blur p-2 rounded-lg border border-white/10 flex flex-col items-center gap-2">
                     <Ruler size={16} className="text-cyan-400" />
                     <div className="text-[9px] font-bold text-white font-mono vertical-rl">
                         {range.toFixed(2)}M
                     </div>
                 </div>
             </div>

             {/* 5. Bottom Instructions */}
             <div className="absolute bottom-32 left-0 right-0 text-center">
                 <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-black/60 backdrop-blur transition-colors ${lightingStatus === 'LOW' ? 'border-red-500/50 text-red-400' : 'border-emerald-500/50 text-emerald-400'}`}>
                     {lightingStatus === 'LOW' ? (
                         <>
                             <Zap size={14} /> <span>INCREASE LIGHTING</span>
                         </>
                     ) : (
                         <>
                             <ScanLine size={14} /> <span>CONDITIONS OPTIMAL</span>
                         </>
                     )}
                 </div>
             </div>

          </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="flex-none bg-[#050a10]/95 backdrop-blur border-t border-white/10 pb-safe z-20">
        {!imgSrc ? (
            <div className="flex justify-between items-center px-8 py-6 max-w-md mx-auto">
                <label className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all cursor-pointer group">
                    <Upload className="w-6 h-6 group-hover:text-cyan-400" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                {/* Shutter Button */}
                <button 
                    onClick={capture}
                    className="relative group"
                >
                    <div className={`absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity ${isFocused ? 'animate-pulse' : ''}`} />
                    <div className={`w-20 h-20 rounded-full border-4 ${isFocused ? 'border-emerald-400' : 'border-white/30'} flex items-center justify-center relative transition-colors duration-300`}>
                        <div className={`w-16 h-16 rounded-full transition-all duration-200 ${isFocused ? 'bg-white scale-90' : 'bg-white/90 scale-100 group-hover:scale-95'}`} />
                    </div>
                </button>

                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all group"
                >
                    <RotateCcw className="w-6 h-6 group-hover:text-cyan-400" />
                </button>
            </div>
        ) : (
            <div className="flex gap-4 px-6 py-6 max-w-md mx-auto">
                <button 
                    onClick={reset}
                    className="flex-1 py-4 bg-gray-800/80 rounded-xl text-white font-bold uppercase tracking-widest border border-white/10 hover:bg-gray-700 transition-colors"
                >
                    Retake
                </button>
                <button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Analyzing...
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-5 h-5" /> Identify
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      <style>{`
        @keyframes scan-vertical { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .vertical-rl { writing-mode: vertical-rl; text-orientation: mixed; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
      `}</style>
    </div>
  );
};
