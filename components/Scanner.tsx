

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, Zap, Aperture, Target, Scan, X, Focus, Lightbulb } from 'lucide-react'; // Added Focus, Lightbulb
import { identifyRock, generateReferenceImage } from '../services/geminiService';
import { Rock, RockAnalysis } from '../types';
import toast from 'react-hot-toast';

interface ScannerProps {
  onIdentify: (rock: Rock) => void;
}

const statusMessages = [
  "CALIBRATING OPTICAL SENSORS...",
  "ACQUIRING SPECIMEN BIOMETRICS...",
  "CROSS-REFERENCING GEOLOGICAL DATABASES...",
  "VALIDATING DATA INTEGRITY...",
  "SYNTHESIZING IDENTIFICATION...",
  "ANALYSIS IN PROGRESS..."
];

export const Scanner: React.FC<ScannerProps> = ({ onIdentify }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RockAnalysis | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'checking'>('checking');
  
  const [comparisonImageUrl, setComparisonImageUrl] = useState<string | null>(null);
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);

  const [previousGuesses, setPreviousGuesses] = useState<string[]>([]);
  const [showManualCorrection, setShowManualCorrection] = useState(false);
  const [manualName, setManualName] = useState('');

  // New state for simulated lighting feedback
  const [lightingOptimal, setLightingOptimal] = useState(false);
  const optimalPingAudioRef = useRef<HTMLAudioElement | null>(null);

  // State for cycling status messages during analysis
  const [currentStatusMessage, setCurrentStatusMessage] = useState(statusMessages[0]);
  const captureShutterAudioRef = useRef<HTMLAudioElement | null>(null);


  useEffect(() => {
    // Initialize audio refs
    optimalPingAudioRef.current = document.getElementById('optimal-ping') as HTMLAudioElement;
    captureShutterAudioRef.current = document.getElementById('capture-shutter') as HTMLAudioElement;
  }, []);

  useEffect(() => {
    // Replaced NodeJS.Timeout with `number` as `setTimeout` and `setInterval` in browser environments return a numeric ID.
    let messageInterval: number;
    if (isAnalyzing) {
        let currentIndex = 0;
        messageInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % statusMessages.length;
            setCurrentStatusMessage(statusMessages[currentIndex]);
        }, 1500); // Change message every 1.5 seconds
    } else {
        setCurrentStatusMessage(statusMessages[0]); // Reset when not analyzing
    }
    return () => clearInterval(messageInterval);
}, [isAnalyzing]);


  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (stream) return;
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionState('granted');
      // Simulate lighting detection with audio cue
      setTimeout(() => {
        setLightingOptimal(true);
        if (optimalPingAudioRef.current) optimalPingAudioRef.current.play();
      }, 1500); 
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Camera access required.");
      setLightingOptimal(false);
    }
  }, [stream]);

  useEffect(() => {
    const checkPermission = async () => {
      if (typeof navigator.permissions?.query !== 'function') {
        setPermissionState('prompt');
        return;
      }
      try {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      } catch (e) {
        setPermissionState('prompt');
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (capturedImage) {
      stopCamera();
      setLightingOptimal(false); // Reset lighting feedback
      return;
    }
    if (permissionState === 'denied') {
      setCameraError("ACCESS DENIED");
      stopCamera();
      setLightingOptimal(false);
    } else if (permissionState === 'granted' || permissionState === 'prompt') {
      startCamera();
    }
    return () => stopCamera();
  }, [capturedImage, permissionState, startCamera, stopCamera]);

  const capturePhoto = () => {
    // Haptic Feedback
    if (navigator.vibrate) navigator.vibrate(50);
    // Audio Cue
    if (captureShutterAudioRef.current) captureShutterAudioRef.current.play();

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        setPreviousGuesses([]); // Reset guesses for new photo
        stopCamera();
        setLightingOptimal(false); // Reset lighting feedback
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Haptic Feedback (simulated for upload)
      if (navigator.vibrate) navigator.vibrate(30);
      // Audio Cue
      if (captureShutterAudioRef.current) captureShutterAudioRef.current.play();

      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setPreviousGuesses([]); // Reset guesses for new photo
        stopCamera();
        setLightingOptimal(false); // Reset lighting feedback
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setComparisonImageUrl(null);
    setIsGeneratingComparison(false);
    setPreviousGuesses([]);
    setShowManualCorrection(false);
    setManualName('');
    setLightingOptimal(false); // Reset lighting feedback
  };

  const analyzeRock = async (guessesToExclude: string[] = []) => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setComparisonImageUrl(null);
    const message = guessesToExclude.length > 0 ? "RE-CALIBRATING..." : "INITIATING SCAN...";
    toast.loading(message, { id: 'scan-toast' });
    
    try {
      const result = await identifyRock(capturedImage, guessesToExclude);
      setAnalysis(result);
      toast.success("IDENTITY CONFIRMED", { id: 'scan-toast', icon: '🧬' });

      setIsGeneratingComparison(true);
      try {
        const referenceImg = await generateReferenceImage(capturedImage, result.name);
        setComparisonImageUrl(referenceImg);
      } catch (err) {
        console.error("Ref gen failed", err);
      } finally {
        setIsGeneratingComparison(false);
      }

    } catch (error) {
      console.error(error);
      toast.error("SCAN FAILED. RETRY.", { id: 'scan-toast' });
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    if (analysis) {
      const updatedGuesses = [...previousGuesses, analysis.name];
      setPreviousGuesses(updatedGuesses);
      analyzeRock(updatedGuesses);
    }
  };

  const saveRock = (rockData: RockAnalysis, status: 'approved' | 'pending') => {
    if (!capturedImage) return;

    const newRockBase: Omit<Rock, 'location'> = {
      ...rockData,
      id: crypto.randomUUID(),
      dateFound: Date.now(),
      imageUrl: capturedImage,
      comparisonImageUrl: comparisonImageUrl || undefined,
      status: status,
      manualCorrection: status === 'pending' ? rockData.name : undefined
    };

    const addRockWithLocation = (location?: { lat: number; lng: number }) => {
      onIdentify({ ...newRockBase, location });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => addRockWithLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => addRockWithLocation(),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      addRockWithLocation();
    }
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden font-mono">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20">
          {/* Top Corners */}
          <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-xl" />
          
          {/* Bottom Corners */}
          <div className="absolute bottom-24 left-6 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-xl" />
          <div className="absolute bottom-24 right-6 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-xl" />

          {/* Central Reticle & Lighting Feedback */}
          {!capturedImage && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-64 h-64 border border-cyan-500/20 rounded-full flex items-center justify-center animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                    <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-4 border border-indigo-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    {/* Dynamic Radial Gradient for Optimal Lighting */}
                    {lightingOptimal && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 opacity-70 animate-radial-pulse" />
                            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 animate-radial-pulse" />
                        </>
                    )}
                    <Focus className="w-8 h-8 text-cyan-400 opacity-80" /> {/* Central Focus Icon */}
                    <div className="absolute top-0 w-[1px] h-4 bg-cyan-500/50" />
                    <div className="absolute bottom-0 w-[1px] h-4 bg-cyan-500/50" />
                    <div className="absolute left-0 h-[1px] w-4 bg-cyan-500/50" />
                    <div className="absolute right-0 h-[1px] w-4 bg-cyan-500/50" />
                </div>
             </div>
          )}

          {/* Data Readouts */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
             <div className="text-[10px] text-cyan-500/70 tracking-[0.3em] font-bold">SYSTEM ACTIVE</div>
             <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </div>

          {/* Live Camera Instructions & Lighting Feedback */}
          {!capturedImage && !cameraError && (
             <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center gap-3 z-30">
                <p className="text-sm text-white/80 uppercase tracking-wider font-sans animate-in fade-in duration-500">
                    CENTER SPECIMEN FOR ANALYSIS
                </p>
                {lightingOptimal ? (
                    <div className="flex items-center gap-2 text-green-400 text-xs uppercase animate-in fade-in duration-500">
                        <Lightbulb className="w-4 h-4" /> OPTIMAL LIGHTING DETECTED
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-amber-400/80 text-xs uppercase animate-pulse">
                        <Lightbulb className="w-4 h-4 animate-bounce" /> ADJUST LIGHTING
                    </div>
                )}
             </div>
          )}
      </div>

      {!capturedImage ? (
        <div className="relative flex-1 flex flex-col justify-center">
           {cameraError ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 z-30">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 border border-red-500/20 animate-pulse">
                    <Camera className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase">Signal Lost</h2>
                <p className="text-gray-400 max-w-xs mx-auto text-xs">{cameraError}</p>
                <button onClick={startCamera} className="py-2 px-8 rounded-full bg-gray-800 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/20 transition-all text-sm uppercase tracking-wide">Reboot System</button>
            </div>
           ) : (
             <>
                <div className="absolute inset-0 z-0">
                  <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
                </div>
                
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-12 z-30">
                   <label className="group flex flex-col items-center gap-2 cursor-pointer">
                      <div className="p-4 rounded-full bg-black/40 backdrop-blur border border-white/10 group-hover:border-white/30 transition-all hover:bg-white/5">
                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-white" />
                      </div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Import</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                   </label>

                   <button onClick={capturePhoto} className="relative group">
                      <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                      <div className="w-20 h-20 rounded-full border border-cyan-500/50 flex items-center justify-center backdrop-blur-md bg-cyan-900/10 group-active:scale-95 transition-all">
                          <div className="w-16 h-16 bg-white/90 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] group-hover:scale-105 transition-transform" />
                      </div>
                   </button>

                   <div className="w-12" /> {/* Spacer */}
                </div>
             </>
           )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative bg-[#030712] overflow-hidden">
           {/* Scan Overlay Effect - now a holographic grid */}
           {isAnalyzing && (
              <div className="absolute inset-0 z-50 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.1)_0%,_transparent_70%)]">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] bg-repeat animate-scan-grid" />
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#22d3ee] animate-scan-line" />
              </div>
           )}

           {/* Top Image Comparison Area */}
          <div className="h-[40vh] w-full flex relative border-b border-gray-800">
             <div className="flex-1 relative border-r border-gray-800 overflow-hidden">
                <img src={capturedImage} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-2 py-1 rounded-md text-[9px] text-cyan-400 border border-cyan-500/20 tracking-wider">SOURCE_INPUT</div>
             </div>
             <div className="flex-1 relative bg-black/50 overflow-hidden flex items-center justify-center">
                {isGeneratingComparison ? (
                   <div className="flex flex-col items-center gap-3">
                      <Scan className="w-8 h-8 text-indigo-500 animate-spin" />
                      <span className="text-[9px] text-indigo-400 animate-pulse tracking-widest">SYNTHESIZING...</span>
                   </div>
                ) : comparisonImageUrl ? (
                   <>
                    <img src={comparisonImageUrl} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-2 py-1 rounded-md text-[9px] text-indigo-400 border border-indigo-500/20 tracking-wider">DB_MATCH</div>
                   </>
                ) : (
                   <span className="text-[9px] text-gray-600 tracking-widest">NO_REF_DATA</span>
                )}
             </div>
          </div>

          {/* Analysis Panel */}
          <div className="flex-1 bg-[#030712] relative z-10 flex flex-col overflow-y-auto">
            {!analysis && !isAnalyzing && (
              <div className="flex flex-col items-center justify-center flex-1 space-y-8 p-6">
                 <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-[0.2em] font-sans">SCAN COMPLETE</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Specimen locked. Awaiting command.</p>
                 </div>
                 <div className="flex gap-4 w-full max-w-sm">
                    <button onClick={handleReset} className="flex-1 py-4 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl text-xs uppercase hover:bg-gray-800 transition-all">Discard</button>
                    <button onClick={() => analyzeRock(previousGuesses)} className="flex-1 py-4 bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 rounded-xl text-xs uppercase hover:bg-indigo-600/30 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                       <Zap className="w-4 h-4" /> {previousGuesses.length > 0 ? 'Try Again' : 'Identify'}
                    </button>
                 </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center flex-1 space-y-6 p-6">
                 <div className="relative w-28 h-28"> {/* Larger container for more complex animation */}
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse" /> {/* Outer pulse */}
                    <div className="absolute inset-2 border-t-4 border-b-4 border-cyan-500/40 rounded-full animate-spin-slow" /> {/* Slower spin */}
                    <div className="absolute inset-4 border-r-4 border-l-4 border-indigo-500/80 rounded-full animate-spin-reverse" /> {/* Faster reverse spin */}
                    <Aperture className="absolute inset-0 m-auto w-10 h-10 text-cyan-400 animate-pulse-fast" /> {/* Central icon */}
                 </div>
                 <div className="text-center space-y-2">
                    <p className="text-indigo-400 text-xs animate-pulse tracking-[0.2em]">
                        {currentStatusMessage} {/* Dynamically cycle through status messages */}
                    </p>
                    {previousGuesses.length > 0 && (
                        <p className="text-red-400/70 text-[10px] uppercase tracking-widest">Excluding: {previousGuesses.join(', ')}</p>
                    )}
                 </div>
              </div>
            )}

            {analysis && !showManualCorrection && (
              <div className="p-6 space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500 pb-24">
                <div className="flex justify-between items-start">
                   <div>
                      <h2 className="text-3xl font-bold text-white tracking-tight font-sans mb-1">{analysis.name.toUpperCase()}</h2>
                      <div className="inline-block px-2 py-0.5 border border-indigo-500/30 bg-indigo-500/10 rounded text-[10px] text-indigo-300 uppercase tracking-wider">
                        {analysis.type} CLASS
                      </div>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[9px] text-gray-500 uppercase mb-1">Rarity</span>
                      <div className={`text-xl font-bold ${analysis.rarityScore > 80 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-cyan-400'}`}>
                         {analysis.rarityScore}<span className="text-sm text-gray-600">/100</span>
                      </div>
                   </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-indigo-500/30 pl-4 font-light">
                   {analysis.description}
                </p>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                      <div className="text-[9px] text-gray-500 uppercase mb-2">Hardness (Mohs)</div>
                      <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${analysis.hardness * 10}%`}} />
                      </div>
                      <div className="text-right text-xs text-white mt-1 font-bold">{analysis.hardness}/10</div>
                   </div>
                   <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex items-center justify-center">
                      <p className="text-[10px] text-gray-400 italic text-center leading-tight">"{analysis.funFact}"</p>
                   </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                   <button onClick={() => saveRock(analysis, 'approved')} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-sm uppercase rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all tracking-wider">
                      Log Specimen
                   </button>
                   <div className="flex gap-3">
                      <button onClick={handleReset} className="flex-1 py-3 text-[10px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors bg-gray-900 rounded-lg">Discard</button>
                      <button onClick={handleRetry} className="flex-1 py-3 text-[10px] text-amber-500/80 hover:text-amber-400 uppercase tracking-wider transition-colors bg-amber-900/10 rounded-lg">Incorrect? Retry</button>
                      <button onClick={() => setShowManualCorrection(true)} className="flex-1 py-3 text-[10px] text-indigo-400 hover:text-white uppercase tracking-wider transition-colors bg-indigo-900/10 rounded-lg">Edit</button>
                   </div>
                </div>
              </div>
            )}
            
            {showManualCorrection && (
               <div className="p-6 space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase border-b border-gray-800 pb-2">Manual Override</h3>
                  <input 
                    type="text" 
                    value={manualName} 
                    onChange={(e) => setManualName(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 text-white px-4 py-3 rounded-xl outline-none transition-colors"
                    placeholder="ENTER SPECIMEN ID" 
                  />
                  <div className="flex gap-4">
                     <button onClick={() => setShowManualCorrection(false)} className="flex-1 py-3 border border-gray-700 text-gray-400 text-xs uppercase hover:bg-gray-800 rounded-lg">Cancel</button>
                     <button onClick={() => saveRock({...analysis!, name: manualName}, 'pending')} disabled={!manualName.trim()} className="flex-1 py-3 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 text-xs uppercase hover:bg-cyan-600/30 disabled:opacity-50 rounded-lg">Submit</button>
                  </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};