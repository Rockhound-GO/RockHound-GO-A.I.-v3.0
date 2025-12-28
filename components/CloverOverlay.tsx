
import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { User } from '../services/api';
import { generateRockSpeech, generateCloverDialogue } from '../services/geminiService';
import { Flower, Trophy, Map, Sparkles, Loader2, X, Activity, Radio, Cpu, ShieldAlert, Zap, Compass } from 'lucide-react';
import { decode, decodeAudioData, getGlobalAudioContext, registerSource, setSpeechSource, stopAllSources } from '../services/audioUtils';
import toast from 'react-hot-toast';

const CloverAvatar = lazy(() => import('./Clover3DModel').then(module => ({ default: module.CloverAvatar })));

interface CloverOverlayProps {
  user: User;
  onDismiss: () => void;
  currentView: string;
  initialMode?: 'INTRO' | 'MENU' | 'TOUR' | 'CHALLENGE' | 'REWARD' | 'SCOUTING';
  scoutingContext?: string;
}

export const CloverOverlay: React.FC<CloverOverlayProps> = ({ user, onDismiss, currentView, initialMode = 'INTRO', scoutingContext }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [interactionState, setInteractionState] = useState<'SCRIPT' | 'MENU'>('SCRIPT');
  
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [activeMode, setActiveMode] = useState<'INTRO' | 'MENU' | 'TOUR' | 'CHALLENGE' | 'REWARD' | 'SCOUTING'>(initialMode);
  const currentScriptResolve = useRef<(() => void) | null>(null);
  
  const scriptExecutionId = useRef(0);
  const lastTypeSoundTime = useRef(0);

  const playFx = useCallback((type: 'open' | 'close' | 'type' | 'scout') => {
    const ctx = getGlobalAudioContext();
    if (!ctx) return;
    
    // Throttle type sounds to prevent oscillator stacking
    if (type === 'type') {
      const now = performance.now();
      if (now - lastTypeSoundTime.current < 40) return;
      lastTypeSoundTime.current = now;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'open') {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    } else if (type === 'scout') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    } else if (type === 'close') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.005, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    registerSource(osc);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const stopAudio = useCallback(() => {
    setSpeechSource(null);
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    setAudioAmplitude(0);
    setIsTalking(false);
    
    if (currentScriptResolve.current) {
        currentScriptResolve.current();
        currentScriptResolve.current = null;
    }
  }, []);

  const lastViewRef = useRef(currentView);

  useEffect(() => {
    // Increment execution ID to cancel any in-flight scripts from previous effects
    const currentId = ++scriptExecutionId.current;
    
    if (currentView !== lastViewRef.current && initialMode !== 'TOUR') {
        lastViewRef.current = currentView;
        return;
    }
    lastViewRef.current = currentView;

    playFx(activeMode === 'SCOUTING' ? 'scout' : 'open');
    const timer = setTimeout(() => setOpacity(1), 50);
    
    const init = async () => {
        if (currentId !== scriptExecutionId.current) return;
        if (initialMode === 'INTRO') await playIntroScript();
        else if (initialMode === 'TOUR') await playTourScript();
        else if (initialMode === 'CHALLENGE') await playChallengeScript();
        else if (initialMode === 'REWARD') await playRewardScript();
        else if (initialMode === 'SCOUTING') await playScoutingScript();
        else { 
            setInteractionState('MENU');
            setDisplayedText(`System Ready. Awaiting field data, Operator ${user.username}.`);
        }
    };
    init();

    return () => {
        scriptExecutionId.current++;
        clearTimeout(timer);
        stopAudio();
    };
  }, [initialMode, currentView, user, stopAudio, playFx, scoutingContext]);

  const playAudioWithLipSync = async (text: string, currentId: number) => {
      if (currentId !== scriptExecutionId.current) return;
      stopAudio();

      try {
          setIsTalking(true);
          const ctx = getGlobalAudioContext();
          if (!ctx) throw new Error("Audio unavailable");

          const { audioData } = await generateRockSpeech(text);
          if (currentId !== scriptExecutionId.current) return;

          const audioBytes = decode(audioData);
          const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 32;
          analyserRef.current = analyser;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          source.connect(analyser);
          analyser.connect(ctx.destination);

          const animate = () => {
            if (currentId !== scriptExecutionId.current || !analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const amplitude = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioAmplitude(amplitude);
            animationFrameRef.current = requestAnimationFrame(animate);
          };

          source.onended = () => {
              if (currentId === scriptExecutionId.current) stopAudio();
          };
          
          setSpeechSource(source);
          source.start();
          animate();

          return new Promise<void>((resolve) => {
              currentScriptResolve.current = resolve;
          });
      } catch (e: any) {
          setIsTalking(false);
          await typeLine(text, currentId);
      }
  };

  const playScript = async (lines: string[]) => {
      const currentId = scriptExecutionId.current;
      setInteractionState('SCRIPT');
      
      for (const line of lines) {
          if (currentId !== scriptExecutionId.current) return;
          setDisplayedText(line);
          await playAudioWithLipSync(line, currentId);
          await new Promise(r => setTimeout(r, 40));
      }
      
      if (currentId !== scriptExecutionId.current) return;

      if (['INTRO', 'TOUR', 'SCOUTING'].includes(activeMode)) {
          setTimeout(() => {
              if (currentId === scriptExecutionId.current) handleClose();
          }, 2000);
      } else {
          setInteractionState('MENU');
          setDisplayedText("Status: Green. Awaiting next directive.");
      }
  };

  const playIntroScript = async () => {
      setActiveMode('INTRO'); setIsThinking(true);
      const script = await generateCloverDialogue('INTRO', { username: user.username, level: user.level });
      setIsThinking(false); await playScript(script);
  };

  const playTourScript = async () => {
      setActiveMode('TOUR'); setIsThinking(true);
      const script = await generateCloverDialogue('TOUR', { view: currentView, username: user.username, level: user.level });
      setIsThinking(false); await playScript(script);
  };

  const playScoutingScript = async () => {
      setActiveMode('SCOUTING'); setIsThinking(true);
      const script = await generateCloverDialogue('SCOUTING', { 
        report: scoutingContext, 
        username: user.username, 
        level: user.level 
      });
      setIsThinking(false); await playScript(script);
  };

  const playChallengeScript = async () => {
      setActiveMode('CHALLENGE'); setIsThinking(true);
      const script = await generateCloverDialogue('CHALLENGE', { username: user.username, level: user.level });
      setIsThinking(false); await playScript(script);
  };

  const playRewardScript = async () => {
      setActiveMode('REWARD'); setIsThinking(true);
      const script = await generateCloverDialogue('REWARD', { username: user.username, level: user.level });
      setIsThinking(false); await playScript(script);
  };

  const typeLine = (line: string, currentId: number) => {
      return new Promise<void>((resolve) => {
          setIsTalking(true);
          let i = 0;
          const interval = setInterval(() => {
              if (currentId !== scriptExecutionId.current) {
                  clearInterval(interval);
                  resolve();
                  return;
              }
              setDisplayedText(line.substring(0, i + 1));
              playFx('type');
              i++;
              if (i >= line.length) {
                  clearInterval(interval);
                  setIsTalking(false);
                  resolve();
              }
          }, 15);
      });
  };

  const handleClose = () => {
      scriptExecutionId.current++;
      setOpacity(0);
      playFx('close');
      stopAudio();
      setTimeout(onDismiss, 500);
  };
  
  const isReward = activeMode === 'REWARD';
  const isTour = activeMode === 'TOUR';
  const isChallenge = activeMode === 'CHALLENGE';
  const isScouting = activeMode === 'SCOUTING';
  const isIntro = activeMode === 'INTRO';
  
  const accentColor = isReward ? 'text-yellow-400' : isTour ? 'text-cyan-400' : isChallenge ? 'text-purple-400' : isScouting ? 'text-emerald-400' : 'text-blue-400';
  const borderColor = isReward ? 'border-yellow-500/50' : isTour ? 'border-cyan-500/50' : isChallenge ? 'border-purple-500/50' : isScouting ? 'border-emerald-500/50' : 'border-blue-500/50';

  let cloverMood: 'IDLE' | 'LISTENING' | 'THINKING' = 'IDLE';
  if (isThinking) {
    cloverMood = 'THINKING';
  } else if (isTalking) {
    cloverMood = 'LISTENING';
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-500`} style={{ opacity }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-48">
             <div className="w-full max-w-lg aspect-square relative animate-[hologram-drift_6s_ease-in-out_infinite]">
                 <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-${accentColor.split('-')[1]}-500/40 to-transparent blur-xl`} />
                 <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className={`w-12 h-12 ${accentColor} animate-spin`} /></div>}>
                   <CloverAvatar 
                     mood={cloverMood}
                     listeningAmplitude={audioAmplitude}
                   />
                 </Suspense>
             </div>
        </div>

        <div className="relative w-full max-w-2xl px-6 pb-12 pointer-events-auto">
            <div className={`bg-[#050a10]/95 backdrop-blur-xl border-t-4 ${borderColor} rounded-t-3xl p-1 relative overflow-hidden shadow-2xl transition-all duration-500`}>
                <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-2">
                        {isScouting ? <Compass size={14} className="text-emerald-400 animate-spin-slow" /> : <Activity className={`w-4 h-4 ${accentColor} animate-pulse`} />}
                        <span className={`text-[10px] font-mono uppercase tracking-widest ${accentColor}`}>
                          {isScouting ? 'GEOLOGICAL_NAV_ACTIVE' : isReward ? 'BONUS_XP_AWARDED' : isIntro ? 'INITIALIZING_FIELD_ASSISTANT' : 'CLOVER_FIELD_ASSISTANT'}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-white animate-bounce' : 'bg-gray-700'}`} style={{ animationDelay: `${i * 0.1}s` }} />)}
                    </div>
                </div>

                <div className="p-6">
                    <div className="min-h-[100px] mb-8 flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded bg-opacity-20 border border-opacity-30 ${borderColor} bg-current`}>
                            {isScouting ? <Compass className="w-5 h-5" /> : isReward ? <Zap className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xs font-bold ${accentColor} mb-2 tracking-[0.2em] uppercase`}>Clover // MSc. Geologist</h3>
                            <p className="text-gray-100 text-lg font-medium leading-relaxed font-sans">
                                {displayedText}
                                {isTalking && <span className="inline-block w-2 h-5 ml-1 bg-current align-middle animate-pulse" />}
                            </p>
                        </div>
                    </div>

                    <div className={`h-8 flex items-center justify-center gap-1 mb-6 transition-opacity duration-300 ${isTalking ? 'opacity-50' : 'opacity-0'}`}>
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-1 bg-current rounded-full transition-all duration-75 ${accentColor}`}
                                style={{ height: `${Math.max(10, Math.min(100, audioAmplitude * (Math.random() + 0.5)))}%` }} 
                            />
                        ))}
                    </div>

                    {interactionState === 'MENU' && !isThinking && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-4">
                            <MenuButton icon={<Compass size={16} />} label="SCOUT AREA" sub="Geology Scan" onClick={playScoutingScript} color="emerald" />
                            <MenuButton icon={<Trophy size={16} />} label="DAILY BOUNTY" sub="MSc Challenge" onClick={playChallengeScript} color="purple" />
                            <MenuButton icon={<Radio size={16} />} label="FIELD STATUS" sub="Career Stats" onClick={() => {}} color="blue" />
                            <MenuButton icon={<X size={16} />} label="DISMISS" sub="Minimize HUD" onClick={handleClose} color="red" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const MenuButton: React.FC<{ icon: any, label: string, sub: string, onClick: () => void, color: string }> = ({ icon, label, sub, onClick, color }) => {
    const colorClasses: any = {
        cyan: 'hover:border-cyan-500/50 hover:bg-cyan-900/20 text-cyan-400',
        purple: 'hover:border-purple-500/50 hover:bg-purple-900/20 text-purple-400',
        emerald: 'hover:border-emerald-500/50 hover:bg-emerald-900/20 text-emerald-400',
        blue: 'hover:border-blue-500/50 hover:bg-blue-900/20 text-blue-400',
        red: 'hover:border-red-500/50 hover:bg-red-900/20 text-red-400'
    };

    return (
        <button onClick={onClick} className={`flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg text-left transition-all group ${colorClasses[color]}`}>
            <div className={`p-2 rounded bg-black/40 border border-white/5 group-hover:scale-110 transition-transform`}>{icon}</div>
            <div>
                <div className="text-[10px] font-bold tracking-widest text-gray-300 group-hover:text-white transition-colors">{label}</div>
                <div className="text-[9px] text-gray-500 font-mono">{sub}</div>
            </div>
        </button>
    );
};
