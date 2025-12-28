
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, X, ScanLine, Loader2, Crosshair, MapPin, Cpu, Microscope, Search, Activity, ShieldCheck, RefreshCw, Flashlight, FlashlightOff, Zap, BrainCircuit } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { identifyRock, generateReferenceImage } from '../services/geminiService';
import { Rock, RockAnalysis } from '../types';
import { DiscoveryReveal } from './DiscoveryReveal';
import { User } from '../services/api';

interface ScannerProps {
  user: User;
  onRockDetected: (rock: Rock) => void;
}

const ANALYSIS_STAGES = [
  { text: "CALIBRATING SPECTRAL SENSORS...", icon: Cpu },
  { text: "ISOLATING LATTICE STRUCTURE...", icon: Microscope },
  { text: "CROSS-REFERENCING GEOSPATIAL DB...", icon: Activity },
  { text: "FINALIZING MSc REPORT...", icon: Search },
];

export const Scanner: React.FC<ScannerProps> = ({ user, onRockDetected }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const [pendingRock, setPendingRock] = useState<Rock | null>(null);
  const [rejectionData, setRejectionData] = useState<RockAnalysis | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const deepScanTimer = useRef<number | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) setImgSrc(imageSrc);
  }, []);

  const startDeepScan = () => {
    setIsDeepScanning(true);
    deepScanTimer.current = window.setTimeout(handleCapture, 1200);
  };

  const cancelDeepScan = () => {
    setIsDeepScanning(false);
    if (deepScanTimer.current) {
        clearTimeout(deepScanTimer.current);
        deepScanTimer.current = null;
    }
  };

  const handleScan = async () => {
    if (!imgSrc) return;
    setIsScanning(true);
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
        setAnalysisProgress(p => {
            if (p >= 99) { clearInterval(interval); return 99; }
            const next = p + (p > 80 ? 0.8 : 8);
            setActiveStageIndex(Math.floor((next / 100) * ANALYSIS_STAGES.length));
            return next;
        });
    }, 60);

    try {
      const analysis = await identifyRock(imgSrc);
      clearInterval(interval);
      if (!analysis.isGeologicalSpecimen) {
          setRejectionData(analysis);
          setIsScanning(false);
          return;
      }
      const rockData: Rock = {
        ...analysis,
        id: crypto.randomUUID(),
        userId: user.id, 
        dateFound: Date.now(),
        imageUrl: imgSrc,
        status: 'approved',
        comparisonImageUrl: await generateReferenceImage(imgSrc, analysis.name),
        location: location || undefined,
      };
      setPendingRock(rockData);
      setShowReveal(true);
    } catch (error) {
      toast.error('Uplink Failed.');
      setIsScanning(false);
      clearInterval(interval);
    }
  };

  const reset = () => {
    setImgSrc(null);
    setIsScanning(false);
    setRejectionData(null);
    setPendingRock(null);
    setShowReveal(false);
  };

  if (showReveal && pendingRock) {
      return <DiscoveryReveal rock={pendingRock} onDismiss={() => onRockDetected(pendingRock)} />;
  }

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden font-mono selection:bg-cyan-500/30">
      <style>{`
        @keyframes spectral-shift { 
            0% { filter: contrast(1.2) brightness(1) saturate(1.5) hue-rotate(0deg); }
            100% { filter: contrast(1.8) brightness(1.5) saturate(3) hue-rotate(360deg); }
        }
        @keyframes heatmap-pulse {
            0% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.05); }
            100% { opacity: 0.1; transform: scale(1); }
        }
        .deep-scan-active { animation: spectral-shift 0.8s linear infinite; }
        .neural-heatmap { 
            position: absolute; inset: 0; pointer-events: none;
            background: radial-gradient(circle at center, rgba(239, 68, 68, 0.4), rgba(34, 211, 238, 0.1), transparent);
            mix-blend-mode: color-dodge; animation: heatmap-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${isDeepScanning ? 'deep-scan-active' : ''}`}>
        {isDeepScanning && <div className="neural-heatmap z-20" />}
        
        {rejectionData ? (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-900/20 mb-6 animate-pulse">
                    <X className="w-12 h-12 text-red-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Protocol B Active</h2>
                <div className="bg-red-500 text-black px-3 py-0.5 text-[10px] font-black uppercase mb-6 rounded-sm">Non-Geological Asset</div>
                <p className="text-gray-400 text-sm italic max-w-xs mb-8">"{rejectionData.expertExplanation}"</p>
                <button onClick={reset} className="px-8 py-3 bg-white/5 border border-white/10 text-cyan-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-cyan-500/10">Reset Optics</button>
            </div>
        ) : !imgSrc ? (
            <div className="w-full h-full relative">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode, width: 1280, height: 720 }} className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none border-[1px] border-cyan-500/20 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
            </div>
        ) : (
          <div className="w-full h-full relative">
              <img src={imgSrc} alt="Captured" className="w-full h-full object-cover grayscale brightness-75" />
              {isScanning && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-12">
                      <div className="relative w-48 h-48 mb-12">
                          <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full" />
                          <div className="absolute inset-0 border-t-2 border-indigo-400 rounded-full animate-spin" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{Math.round(analysisProgress)}%</span>
                              <span className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest">Inference</span>
                          </div>
                      </div>
                      <div className="w-full max-w-xs">
                          <div className="text-[9px] text-indigo-400 font-bold uppercase mb-2 flex items-center gap-2">
                            <BrainCircuit size={12} className="animate-pulse" />
                            {ANALYSIS_STAGES[activeStageIndex]?.text}
                          </div>
                          <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-75" style={{ width: `${analysisProgress}%` }} />
                          </div>
                      </div>
                  </div>
              )}
          </div>
        )}

        {/* HUD OVERLAY */}
        {!imgSrc && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
             <div className="flex justify-between items-start">
                 <div className="bg-black/60 backdrop-blur-lg p-4 rounded-2xl border border-white/5 shadow-2xl">
                     <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 tracking-widest uppercase">
                         <Activity size={14} className="animate-pulse" /> THRUPUT: 1.2 GB/S
                     </div>
                     <div className="text-[7px] text-gray-500 mt-1 uppercase font-mono">NEURAL_INF_READY // CLOVER_OS</div>
                 </div>
                 <div className="text-right p-4">
                    <div className="text-[10px] text-gray-400 uppercase font-black">Azimuth: 142.4°</div>
                    <div className="text-[8px] text-gray-600 font-mono">ALT: 42M // ACC: 99.8%</div>
                 </div>
             </div>

             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="relative w-64 h-64">
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                     <Crosshair className="absolute inset-0 m-auto text-cyan-400/20 w-12 h-12" strokeWidth={1} />
                     <div className="absolute inset-x-0 h-[1px] bg-cyan-400/40 top-1/2 animate-[scan-v_2s_linear_infinite]" />
                 </div>
             </div>

             <div className="flex justify-between items-end">
                <div className="flex gap-3">
                    <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="p-5 bg-black/80 rounded-3xl border border-white/10 text-white pointer-events-auto active:scale-90 transition-transform">
                        <RotateCcw size={24} />
                    </button>
                    <button onClick={() => setIsTorchOn(!isTorchOn)} className={`p-5 rounded-3xl border pointer-events-auto transition-all ${isTorchOn ? 'bg-yellow-400 border-yellow-400 text-black shadow-[0_0_20px_#facc15]' : 'bg-black/80 border-white/10 text-white'}`}>
                        {isTorchOn ? <Flashlight size={24} /> : <FlashlightOff size={24} />}
                    </button>
                </div>
                <div className="bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/5 flex items-center gap-3">
                    <MapPin size={12} className="text-cyan-400" />
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}</span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="flex-none bg-[#030508] border-t border-white/5 p-8 pb-safe z-20">
        {!imgSrc ? (
            <div className="flex flex-col items-center gap-8">
                <div className="flex items-center gap-4 text-[9px] text-gray-600 font-black tracking-[0.5em] uppercase">
                    <div className="w-12 h-[1px] bg-white/10" />
                    Neural Pulse Detection Active
                    <div className="w-12 h-[1px] bg-white/10" />
                </div>
                <button 
                    onMouseDown={startDeepScan} onMouseUp={cancelDeepScan} onTouchStart={startDeepScan} onTouchEnd={cancelDeepScan}
                    className="relative w-28 h-28 group"
                >
                    <div className={`absolute inset-[-15px] border border-cyan-500/20 rounded-full animate-spin-slow transition-opacity ${isDeepScanning ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`absolute inset-0 bg-cyan-400 rounded-full blur-3xl transition-all duration-300 ${isDeepScanning ? 'opacity-60 scale-125' : 'opacity-20 scale-100'}`} />
                    <div className="w-full h-full rounded-full border-4 border-cyan-400 p-2 flex items-center justify-center bg-black group-active:scale-95 transition-transform z-10 relative">
                        <div className={`w-full h-full rounded-full bg-white transition-all duration-700 ease-in-out ${isDeepScanning ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`} />
                        <BrainCircuit className={`absolute w-10 h-10 text-cyan-400 transition-opacity duration-300 ${isDeepScanning ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                </button>
            </div>
        ) : (
            <div className="flex gap-4 max-w-md mx-auto">
                {!rejectionData && (
                    <>
                        <button onClick={reset} disabled={isScanning} className="flex-1 py-5 bg-gray-950 border border-white/5 rounded-3xl text-gray-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors">Abort</button>
                        <button onClick={handleScan} disabled={isScanning} className="flex-[2.5] py-5 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-3xl text-white font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(34,211,238,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3">
                            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {isScanning ? 'INTEGRATING...' : 'EXECUTE_DEEP_ANALYSIS'}
                        </button>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
