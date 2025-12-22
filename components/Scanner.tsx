import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RotateCcw, X, ScanLine, Loader2, Zap, Sun, Ruler, Focus, Crosshair, AlertTriangle, MapPin, Cpu, Database, Microscope, Search, Activity, FileDigit, ShieldCheck } from 'lucide-react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { identifyRock, generateReferenceImage } from '../services/geminiService';
import { Rock } from '../types';

interface ScannerProps {
  onRockDetected: (rock: Rock) => void;
}

const ANALYSIS_STAGES = [
  { text: "INITIALIZING NEURAL LINK...", icon: Cpu },
  { text: "DECOMPOSING TEXTURE MAPS...", icon: Microscope },
  { text: "SPECTRAL ANALYSIS ACTIVE...", icon: Activity },
  { text: "CROSS-REFERENCING GLOBAL DB...", icon: Database },
  { text: "FINALIZING SPECIMEN REPORT...", icon: Search },
];

export const Scanner: React.FC<ScannerProps> = ({ onRockDetected }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isShutterPressed, setIsShutterPressed] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  
  const [lightingStatus, setLightingStatus] = useState<'LOW' | 'OPTIMAL' | 'HIGH'>('LOW');
  const [range, setRange] = useState(0.0);
  const [isFocused, setIsFocused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false); 
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'acquiring' | 'locked' | 'denied' | 'unavailable'>('acquiring');

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- ANALYSIS PROGRESS ENGINE --
  useEffect(() => {
    let interval: number;
    if (isScanning) {
      setAnalysisProgress(0);
      setActiveStageIndex(0);
      interval = window.setInterval(() => {
        setAnalysisProgress(prev => {
          const increment = prev > 80 ? 0.4 : prev > 50 ? 1.5 : 4;
          const next = Math.min(prev + increment, 99);
          setActiveStageIndex(Math.floor((next / 100) * ANALYSIS_STAGES.length));
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // -- GEOLOCATION --
  useEffect(() => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus('locked'); },
        (err) => setLocationStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
        { enableHighAccuracy: true, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current || !isCameraReady) return;
    setIsShutterPressed(true);
    setIsFlashing(true);
    const audio = document.getElementById('capture-shutter') as HTMLAudioElement;
    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) setImgSrc(imageSrc);
      setIsShutterPressed(false);
      setTimeout(() => setIsFlashing(false), 200);
    }, 150);
  }, [isCameraReady]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        toast.error("INVALID DATA FORMAT. Images only.");
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImgSrc(reader.result as string);
      setCameraError(null);
      setIsCameraReady(true);
      toast.success("DATA LINK ESTABLISHED", { icon: '📡' });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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
        location: location || undefined,
      };
      onRockDetected(rockData);
    } catch (error) {
      toast.error('Neural Link Dropout. Retrying...');
      setIsScanning(false);
    }
  };

  const reset = () => {
    setImgSrc(null);
    setIsScanning(false);
    setIsCameraReady(false);
  };

  return (
    <div 
        className={`h-full flex flex-col bg-black relative overflow-hidden font-mono transition-colors duration-300 ${isDragActive ? 'bg-cyan-950/20' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
    >
      <style>{`
        @keyframes scan-v { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes grid-drift { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        .hud-scan { animation: scan-v 2.5s ease-in-out infinite; }
        .grid-bg { background-image: linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px); background-size: 40px 40px; animation: grid-drift 20s linear infinite; }
      `}</style>

      {/* Viewfinder Layer */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <div className={`absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-300 ${isFlashing ? 'opacity-80' : 'opacity-0'}`} />
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        {/* Drag Overlay */}
        <div className={`absolute inset-0 z-40 bg-cyan-500/10 backdrop-blur-md border-4 border-dashed border-cyan-500/50 flex flex-col items-center justify-center transition-all duration-300 pointer-events-none ${isDragActive ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
            <FileDigit className="w-20 h-20 text-cyan-400 animate-bounce" />
            <h2 className="text-2xl font-black text-cyan-400 tracking-[0.3em] mt-4">AWAITING SPECIMEN DATA</h2>
            <div className="text-[10px] text-cyan-500/70 font-bold uppercase mt-2">Release to initiate neural ingest</div>
        </div>

        {!imgSrc ? (
            cameraError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 relative z-10">
                     <div className="w-24 h-24 rounded-full bg-red-900/20 border-2 border-red-500/50 flex items-center justify-center relative">
                         <Camera className="w-10 h-10 text-red-500" />
                         <AlertTriangle className="absolute -top-2 -right-2 text-red-400" />
                     </div>
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-4 bg-gray-900 border border-white/10 hover:border-cyan-500/50 rounded-xl text-sm font-bold text-white uppercase tracking-widest transition-all"
                     >
                        Initiate Manual Data Link
                     </button>
                </div>
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode, width: 1280, height: 720 }}
                className="w-full h-full object-cover"
                onUserMedia={() => setIsCameraReady(true)}
                onUserMediaError={() => setCameraError("Hardware connection failure")}
              />
            )
        ) : (
          <div className="w-full h-full relative overflow-hidden">
              <img src={imgSrc} alt="Captured" className="w-full h-full object-cover animate-snap-zoom" />
              {isScanning && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8">
                      <div className="absolute inset-x-0 h-[2px] bg-cyan-500 shadow-[0_0_25px_#06b6d4] hud-scan" />
                      <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                          <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-spin-slow" />
                          <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-spin-reverse" />
                          <div className="text-center">
                              <div className="text-5xl font-black text-white tracking-tighter">{Math.round(analysisProgress)}%</div>
                              <div className="text-[10px] text-cyan-500 font-bold tracking-[0.2em]">ANALYZING...</div>
                          </div>
                      </div>
                      <div className="w-full max-w-xs space-y-4">
                          <div className="flex justify-between items-end">
                              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{ANALYSIS_STAGES[activeStageIndex]?.text}</span>
                              <span className="text-[8px] text-gray-500">ID: {crypto.randomUUID().slice(0, 8)}</span>
                          </div>
                          <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-white transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                          </div>
                      </div>
                  </div>
              )}
          </div>
        )}

        {/* HUD OVERLAY */}
        {!imgSrc && !cameraError && (
          <div className="absolute inset-0 pointer-events-none z-10">
             <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black to-transparent">
                 <div className="space-y-1">
                     <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-cyan-400">
                         <Activity size={12} className="animate-pulse" />
                         SENSOR_LINK: {isCameraReady ? 'ACTIVE' : 'READYING...'}
                     </div>
                     <div className="text-[8px] text-gray-500">LATENCY: 0.82MS // NEURAL_NET_V4.5</div>
                 </div>
                 <div className="text-right">
                     <div className="text-[10px] text-gray-400">SYS_CLOCK</div>
                     <div className="text-xs font-bold text-white font-mono">{new Date().toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit'})}</div>
                 </div>
             </div>

             <div className="absolute inset-0 flex items-center justify-center">
               <div className="relative w-72 h-72 border border-cyan-500/20 rounded-3xl flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />
                  <div className="absolute inset-x-0 h-[1px] bg-cyan-500/40 hud-scan" />
                  <Crosshair className="text-cyan-400/50 w-8 h-8" strokeWidth={1} />
               </div>
             </div>

             <div className="absolute bottom-10 left-6 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full">
                <MapPin size={14} className={locationStatus === 'locked' ? 'text-green-400' : 'text-yellow-400'} />
                <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                    GPS: {locationStatus === 'locked' ? `${location?.lat.toFixed(4)}, ${location?.lng.toFixed(4)}` : 'ACQUIRING...'}
                </span>
             </div>
          </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="flex-none bg-black/90 backdrop-blur-2xl border-t border-white/10 p-8 pb-safe z-20">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        {!imgSrc ? (
            <div className="flex justify-between items-center max-w-md mx-auto">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all group"
                    title="Neural Data Link"
                >
                    <FileDigit className="w-6 h-6 group-hover:text-cyan-400" />
                    <span className="block text-[8px] mt-1 font-bold tracking-tighter opacity-50">LINK_DATA</span>
                </button>
                
                <button 
                    onClick={handleCapture} 
                    disabled={!isCameraReady}
                    className="relative w-24 h-24 group disabled:opacity-30 transition-transform active:scale-95"
                >
                    <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="w-full h-full rounded-full border-4 border-cyan-400 flex items-center justify-center p-2">
                        <div className="w-full h-full bg-white rounded-full transition-transform duration-100 group-hover:scale-90" />
                    </div>
                </button>

                <button 
                    onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all group"
                    title="Toggle Lens"
                >
                    <RotateCcw className="w-6 h-6 group-hover:text-indigo-400" />
                    <span className="block text-[8px] mt-1 font-bold tracking-tighter opacity-50">CYCLE_OPTS</span>
                </button>
            </div>
        ) : (
            <div className="flex gap-4 max-w-md mx-auto">
                <button onClick={reset} disabled={isScanning} className="flex-1 py-5 bg-gray-900 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors disabled:opacity-50">
                    Purge
                </button>
                <button 
                    onClick={handleScan} 
                    disabled={isScanning} 
                    className="flex-[2] py-5 bg-cyan-600 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:bg-cyan-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {isScanning ? 'INGESTING...' : 'INITIATE_ANALYSIS'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};