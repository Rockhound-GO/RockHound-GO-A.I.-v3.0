

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { User } from '../services/api';
import { generateRockSpeech, generateCloverDialogue } from '../services/geminiService';
import { Flower, Trophy, Map, Sparkles, Loader2, X } from 'lucide-react';
import { decode, decodeAudioData } from '../services/audioUtils';
import toast from 'react-hot-toast';

// Lazy load the 3D model for performance
const Clover3DModel = lazy(() => import('./Clover3DModel').then(module => ({ default: module.Clover3DModel })));


interface CloverOverlayProps {
  user: User;
  onDismiss: () => void;
  currentView: string; // Passed from App to give context-aware tours
  initialMode?: 'INTRO' | 'MENU' | 'TOUR' | 'CHALLENGE' | 'REWARD';
}

// Create a single AudioContext instance for the component.
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

export const CloverOverlay: React.FC<CloverOverlayProps> = ({ user, onDismiss, currentView, initialMode = 'INTRO' }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [interactionState, setInteractionState] = useState<'SCRIPT' | 'MENU'>('SCRIPT');
  const [backgroundVideoError, setBackgroundVideoError] = useState(false); // For background video
  
  // Lip Sync State
  const [currentViseme, setCurrentViseme] = useState(0);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const visemeDataRef = useRef<{time: number, value: number}[]>([]);
  const audioPlaybackTimeRef = useRef(0);


  // Logic for what Clover is currently doing
  const [activeMode, setActiveMode] = useState<'INTRO' | 'TOUR' | 'CHALLENGE' | 'REWARD'>(initialMode);
  const currentScriptResolve = useRef<(() => void) | null>(null);


  useEffect(() => {
    // Fade in entrance
    const timer = setTimeout(() => setOpacity(1), 100);
    
    // Router Logic
    const init = async () => {
        if (initialMode === 'INTRO') {
            await playIntroScript();
        } else if (initialMode === 'TOUR') {
            await playTourScript();
        } else if (initialMode === 'CHALLENGE') {
            await playChallengeScript();
        } else if (initialMode === 'REWARD') {
            await playRewardScript();
        } else { // MENU mode
            setInteractionState('MENU');
            setDisplayedText(`Ready to assist, ${user.username}. What do you need?`);
        }
    };

    init();

    return () => {
        clearTimeout(timer);
        stopAudio();
    };
  }, [initialMode, currentView, user]); // Added user and currentView to dependencies for adaptive dialogue

  // --- AUDIO & LIP SYNC ENGINE ---
  const stopAudio = () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
      }
      setCurrentViseme(0);
      setIsTalking(false);
      audioPlaybackTimeRef.current = 0;
  };

  const playAudioWithLipSync = async (text: string) => {
      stopAudio(); // Ensure any previous audio is stopped
      try {
          setIsTalking(true);
          const { audioData, visemes } = await generateRockSpeech(text);
          visemeDataRef.current = visemes;
          
          const audioBytes = decode(audioData);
          const buffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);

          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);

          const startTime = audioContext.currentTime;

          const animateVisemes = () => {
            if (!audioSourceRef.current || audioSourceRef.current.buffer === null) {
                setCurrentViseme(0); // Ensure mouth closes if audio stops unexpectedly
                return;
            }
            audioPlaybackTimeRef.current = (audioContext.currentTime - startTime) * 1000; // current time in ms
            
            // Find the viseme that should be active at the current elapsed time
            let activeViseme = 0; // Default to closed mouth
            for (let i = visemeDataRef.current.length - 1; i >= 0; i--) {
                if (visemeDataRef.current[i].time <= audioPlaybackTimeRef.current) {
                    activeViseme = visemeDataRef.current[i].value;
                    break;
                }
            }
            setCurrentViseme(activeViseme);
            animationFrameRef.current = requestAnimationFrame(animateVisemes);
          };

          source.onended = () => {
              stopAudio(); // Resets talking state, viseme, and cancels animation frame
              if (currentScriptResolve.current) {
                currentScriptResolve.current();
                currentScriptResolve.current = null;
              }
          };
          
          source.start();
          audioSourceRef.current = source;
          animateVisemes();

          return new Promise<void>((resolve) => {
              currentScriptResolve.current = resolve;
          });

      } catch (e: any) {
          console.error("Lip sync failed, falling back to text", e);
          setIsTalking(false);
          if (e.isQuotaError) {
              toast.error(`AI busy (quota hit). Please try again in a minute or consider upgrading your plan.`, { duration: 5000 });
          }
          await typeLine(text); // Fallback to typewriter effect
          if (currentScriptResolve.current) {
            currentScriptResolve.current();
            currentScriptResolve.current = null;
          }
      }
  };

  // --- SCRIPT PLAYBACK ENGINE ---
  const playScript = async (lines: string[]) => {
      setInteractionState('SCRIPT');
      for (const line of lines) {
          setDisplayedText(line);
          try {
            await playAudioWithLipSync(line);
          } catch (e: any) {
            console.error("Failed to play audio with lip sync, showing text directly", e);
            // Error handling for playAudioWithLipSync already shows toast
            await typeLine(line); // Ensure text is displayed even if audio fails after retries
          }
          await new Promise(r => setTimeout(r, 500)); // Short pause between sentences
      }
      
      // Determine next state
      if (activeMode === 'INTRO' || activeMode === 'TOUR') {
          handleClose();
      } else { // For CHALLENGE, REWARD, or if invoked from menu
          setInteractionState('MENU');
          setDisplayedText("Anything else?");
      }
  };

  const playIntroScript = async () => {
      setActiveMode('INTRO');
      setIsThinking(true);
      try {
        const script = await generateCloverDialogue('INTRO', {
            username: user.username,
            level: user.level
        });
        setIsThinking(false);
        await playScript(script);
      } catch (e: any) {
        setIsThinking(false);
        toast.error(e.isQuotaError ? "AI busy (quota hit). Try again later." : "Failed to generate intro dialogue.");
        handleClose();
      }
  };

  const playTourScript = async () => {
      setActiveMode('TOUR');
      setIsThinking(true);
      setDisplayedText("Analyzing current view...");
      
      try {
        const script = await generateCloverDialogue('TOUR', {
            view: currentView,
            username: user.username,
            level: user.level
        });
        
        setIsThinking(false);
        await playScript(script);
      } catch (e: any) {
        setIsThinking(false);
        toast.error(e.isQuotaError ? "AI busy (quota hit). Try again later." : "Failed to generate tour dialogue.");
        handleClose();
      }
  };

  const playChallengeScript = async () => {
      setActiveMode('CHALLENGE');
      setIsThinking(true);
      setDisplayedText("Accessing Bounty Board...");

      try {
        const script = await generateCloverDialogue('CHALLENGE', {
            username: user.username,
            level: user.level
        });

        setIsThinking(false);
        await playScript(script);
      } catch (e: any) {
        setIsThinking(false);
        toast.error(e.isQuotaError ? "AI busy (quota hit). Try again later." : "Failed to generate challenge.");
        handleClose();
      }
  };

  const playRewardScript = async () => {
      setActiveMode('REWARD');
      setIsThinking(true);
      setDisplayedText("Validating submission...");
      
      try {
        const script = await generateCloverDialogue('REWARD', {
            username: user.username,
            level: user.level
        });
        
        setIsThinking(false);
        await playScript(script);
      } catch (e: any) {
        setIsThinking(false);
        toast.error(e.isQuotaError ? "AI busy (quota hit). Try again later." : "Failed to generate reward message.");
        handleClose();
      }
  };

  const playStatusScript = async () => {
      setInteractionState('SCRIPT'); // Switch to script mode for status update
      setIsThinking(true);
      setDisplayedText("Checking your geological records...");

      try {
        const script = await generateCloverDialogue('STATUS', {
            username: user.username,
            level: user.level,
            xp: user.xp
        });

        setIsThinking(false);
        await playScript(script);
      } catch (e: any) {
        setIsThinking(false);
        toast.error(e.isQuotaError ? "AI busy (quota hit). Try again later." : "Failed to get status update.");
        handleClose();
      }
  };

  const typeLine = (line: string) => {
      return new Promise<void>((resolve) => {
          setIsTalking(true);
          let i = 0;
          const interval = setInterval(() => {
              setDisplayedText(line.substring(0, i + 1));
              i++;
              if (i >= line.length) {
                  clearInterval(interval);
                  setIsTalking(false);
                  resolve();
              }
          }, 30);
      });
  };

  const handleClose = () => {
      setOpacity(0);
      stopAudio();
      setTimeout(onDismiss, 500);
  };
  
  const handleCompleteChallenge = () => {
    // In a real app, this would be triggered by a game event (e.g., finding the rock)
    // For demo, we simulate completion and transition to REWARD mode
    playRewardScript();
  };


  const isRewardMode = activeMode === 'REWARD';
  const isTourMode = activeMode === 'TOUR';
  
  const borderColor = isRewardMode ? 'border-yellow-500/50' : isTourMode ? 'border-blue-500/50' : 'border-emerald-800/50';
  const nameColor = isRewardMode ? 'text-yellow-400' : isTourMode ? 'text-blue-400' : 'text-emerald-500';
  const iconColor = isRewardMode ? 'text-yellow-400' : isTourMode ? 'text-blue-400' : 'text-emerald-500';

  // Advanced Viseme mapping for realistic mouth shapes (used by Clover3DModel)
  // This function is kept here as a reference, but the actual rendering is in Clover3DModel
  const getMouthStyle = (viseme: number) => {
      let clipPath = 'ellipse(50% 10% at 50% 50%)'; // Default Closed
      let opacity = 0.6;
      let background = 'radial-gradient(circle at center, #3e1c1c 0%, #1a0505 100%)';

      switch (viseme) {
          case 0: // Silence, P, B, M (Closed)
              clipPath = 'ellipse(40% 5% at 50% 50%)';
              opacity = 0.5;
              break;
          case 1: // EH, AH (Mid Open)
              clipPath = 'ellipse(45% 20% at 50% 50%)';
              opacity = 0.8;
              break;
          case 3: // O, U (Rounded)
              clipPath = 'circle(25% at 50% 50%)';
              opacity = 0.9;
              break;
          case 6: // S, Z, T (Teeth/Narrow)
              clipPath = 'inset(15% 10% 15% 10% round 20%)';
              opacity = 0.7;
              break;
          case 18: // F, V (Lip Tuck)
              clipPath = 'ellipse(40% 10% at 50% 60%)'; // Lower lip focus
              opacity = 0.7;
              break;
          default: // Generic Talk
              clipPath = 'ellipse(45% 15% at 50% 50%)';
              opacity = 0.7;
              break;
      }
      return { 
          clipPath, 
          opacity, 
          background,
          transition: 'clip-path 50ms ease-out, opacity 50ms ease-out' 
      };
  };

  const backgroundVideoSource = "https://videos.pexels.com/video-files/4782033/4782033-hd_1920_1080_25fps.mp4"; 
  const backgroundPoster = "https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";

  return (
    <div 
        className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-1000`}
        style={{ opacity }}
    >
        <div className={`absolute inset-0 -z-20 overflow-hidden pointer-events-none bg-black`}>
            {/* High-quality background video loop */}
            {backgroundVideoError ? (
              <img src={backgroundPoster} alt="Forest Background" className={`absolute inset-0 w-full h-full object-cover opacity-80`} />
            ) : (
              <video 
                  autoPlay loop muted playsInline
                  onError={() => setBackgroundVideoError(true)}
                  className={`absolute inset-0 w-full h-full object-cover opacity-80`}
                  src={backgroundVideoSource}
                  poster={backgroundPoster}
              >
                Your browser does not support the video tag.
              </video>
            )}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30`} />
            {isRewardMode && <div className={`absolute inset-0 bg-yellow-500/10 mix-blend-overlay animate-pulse`} />}
            {isTourMode && <div className={`absolute inset-0 bg-blue-500/10 mix-blend-overlay`} />}
        </div>

        <div className={`relative z-0 h-[90vh] w-full max-w-2xl flex items-end justify-center overflow-hidden pointer-events-none`}>
             <div className={`relative origin-bottom transition-all duration-500 ${!isTalking ? 'animate-idle' : 'animate-converse-nod'}`}>
                 {/* Clover 3D Model Integration */}
                 <Suspense fallback={<Loader2 className={`w-12 h-12 text-indigo-500 animate-spin`} />}>
                   <Clover3DModel 
                     isTalking={isTalking}
                     currentViseme={currentViseme}
                     audioPlaybackTime={audioPlaybackTimeRef.current}
                   />
                 </Suspense>
             </div>
        </div>

        <div className={`absolute bottom-12 left-6 right-6 max-w-xl mx-auto pointer-events-auto`}>
            <div className={`bg-gray-900/80 backdrop-blur-md p-6 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-500 border ${borderColor} ${isRewardMode ? 'shadow-yellow-500/20' : isTourMode ? 'shadow-blue-500/20' : ''}`}>
                <div className={`flex items-center gap-3 mb-3`}>
                    {isRewardMode ? <Trophy className={`w-5 h-5 ${iconColor} animate-bounce`} /> : isTourMode ? <Map className={`w-5 h-5 ${iconColor} animate-pulse`} /> : <Flower className={`w-5 h-5 ${iconColor}`} />}
                    <span className={`${nameColor} font-bold text-xs tracking-[0.2em] transition-colors`}>CLOVER COLE</span>
                    <div className={`ml-auto flex items-center gap-2`}>
                        {isThinking && (
                            <div className={`flex items-center gap-1 text-xs text-gray-400`}>
                                <Loader2 className={`w-3 h-3 animate-spin`} />
                                <span>Thinking...</span>
                            </div>
                        )}
                        {isTalking && (
                            <div className={`flex gap-1 items-end h-4`}>
                                <div className={`w-1 ${isRewardMode ? 'bg-yellow-500/80' : isTourMode ? 'bg-blue-500/80' : 'bg-emerald-500/80'} animate-[bounce_0.5s_infinite] h-full`} />
                                <div className={`w-1 ${isRewardMode ? 'bg-yellow-500/80' : isTourMode ? 'bg-blue-500/80' : 'bg-emerald-500/80'} animate-[bounce_0.7s_infinite] h-2/3`} />
                                <div className={`w-1 ${isRewardMode ? 'bg-yellow-500/80' : isTourMode ? 'bg-blue-500/80' : 'bg-emerald-500/80'} animate-[bounce_0.6s_infinite] h-full`} />
                            </div>
                        )}
                    </div>
                </div>
                <div className={`min-h-[3.5rem] mb-4`}>
                    <p className={`text-gray-200 text-lg leading-relaxed font-medium font-sans`}>
                        {displayedText}
                    </p>
                </div>
                {interactionState === 'MENU' && !isThinking && (
                    <div className={`grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                        <button onClick={playTourScript} className={`flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-emerald-900/30 border border-gray-700 hover:border-emerald-500/50 rounded-xl transition-all group`}>
                            <div className={`p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors`}> <Map className={`w-4 h-4`} /> </div>
                            <div className={`text-left`}>
                                <div className={`text-sm font-bold text-gray-200`}>Current View</div>
                                <div className={`text-[10px] text-gray-500`}>Walkthrough</div>
                            </div>
                        </button>
                        <button onClick={playChallengeScript} className={`flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-emerald-900/30 border border-gray-700 hover:border-emerald-500/50 rounded-xl transition-all group`}>
                            <div className={`p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors`}> <Trophy className={`w-4 h-4`} /> </div>
                            <div className={`text-left`}>
                                <div className={`text-sm font-bold text-gray-200`}>New Bounty</div>
                                <div className={`text-[10px] text-gray-500`}>Get Challenge</div>
                            </div>
                        </button>
                         <button onClick={playStatusScript} className={`flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-emerald-900/30 border border-gray-700 hover:border-emerald-500/50 rounded-xl transition-all group`}>
                            <div className={`p-2 bg-yellow-500/20 rounded-lg text-yellow-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors`}> <Sparkles className={`w-4 h-4`} />
                            </div>
                            <div className={`text-left`}>
                                <div className={`text-sm font-bold text-gray-200`}>Check Status</div>
                                <div className={`text-[10px] text-gray-500`}>My Progress</div>
                            </div>
                        </button>
                        <button onClick={handleClose} className={`flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-red-900/30 border border-gray-700 hover:border-red-500/50 rounded-xl transition-all group`}>
                             <div className={`p-2 bg-red-500/20 rounded-lg text-red-400 group-hover:text-red-300 group-hover:bg-red-500/20 transition-colors`}>
                                <X className={`w-4 h-4`} />
                            </div>
                            <div className={`text-left`}>
                                <div className={`text-sm font-bold text-gray-200`}>Dismiss</div>
                                <div className={`text-[10px] text-gray-500`}>Close Overlay</div>
                            </div>
                        </button>
                    </div>
                )}
                 {activeMode === 'CHALLENGE' && interactionState === 'SCRIPT' && !isThinking && (
                    <div className={`mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <button onClick={handleCompleteChallenge} className={`w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2`}>
                            <Trophy className={`w-5 h-5`} /> Mark Challenge Complete!
                        </button>
                        <p className={`text-xs text-gray-500 text-center mt-2`}>
                          (For demo purposes. In game, this triggers when you find the rock.)
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};