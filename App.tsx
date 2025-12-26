
import React, { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Box, LogOut, Map as MapIcon, CloudSun, ScanLine, Cpu, Zap, Radio, Globe, Activity, Lock, Terminal, Shield, Home as HomeIcon } from 'lucide-react';
import { Rock } from './types';
import { api, User } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { Auth } from './components/Auth';
import { CloverOverlay } from './components/CloverOverlay';
import { CloverButton } from './components/CloverButton';
import { SyncStatus } from './components/SyncStatus';
import { useVisitedViews } from './hooks/useVisitedViews';
import { getScoutingReport } from './services/geminiService';

// -- LAZY MODULES --
const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const Scanner = lazy(() => import('./components/Scanner').then(m => ({ default: m.Scanner })));
const Collection = lazy(() => import('./components/Collection').then(m => ({ default: m.Collection })));
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })));
const RockDetails = lazy(() => import('./components/RockDetails').then(m => ({ default: m.RockDetails })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserMap = lazy(() => import('./components/UserMap').then(m => ({ default: m.UserMap })));
const WeatherDashboard = lazy(() => import('./components/WeatherDashboard').then(m => ({ default: m.WeatherDashboard })));
const Achievements = lazy(() => import('./components/Achievements').then(m => ({ default: m.Achievements })));
const Guide = lazy(() => import('./components/Guide').then(m => ({ default: m.Guide })));
const RockComparison = lazy(() => import('./components/RockComparison').then(m => ({ default: m.RockComparison })));

// -- TYPES --
enum View {
  HOME = 'HOME',
  SCANNER = 'SCANNER',
  COLLECTION = 'COLLECTION',
  STATS = 'STATS',
  DETAILS = 'DETAILS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  MAP = 'MAP',
  WEATHER = 'WEATHER',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  COMPARISON = 'COMPARISON'
}

// -- GUEST BYPASS CONFIG --
const GUEST_USER: User = {
  id: 'guest-bypass-active',
  username: 'FIELD_AGENT_01',
  email: 'scout@clover.ai',
  xp: 150,
  level: 2,
  rankTitle: 'Novice Scout',
  operatorStats: {
    totalScans: 5,
    distanceTraveled: 1.2,
    uniqueSpeciesFound: 3,
    legendaryFinds: 0,
    highestRarityFound: 65,
    scanStreak: 1
  }
};

const useSciFiAudio = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  const init = useCallback(() => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return; 
        if (!ctxRef.current) ctxRef.current = new AudioContextClass();
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
    } catch (e) {}
  }, []);

  const startAmbient = useCallback(() => {
    try {
        init();
        if (!ctxRef.current || droneOscRef.current) return;
        const osc = ctxRef.current.createOscillator();
        const gain = ctxRef.current.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 40; 
        const filter = ctxRef.current.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctxRef.current.destination);
        gain.gain.setValueAtTime(0, ctxRef.current.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, ctxRef.current.currentTime + 2); 
        osc.start();
        droneOscRef.current = osc;
        droneGainRef.current = gain;
    } catch (e) {}
  }, [init]);

  const playFX = useCallback((type: 'hover' | 'click' | 'success' | 'boot' | 'error' | 'clover') => {
    try {
        init();
        const ctx = ctxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        switch (type) {
        case 'hover':
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.02, now);
            osc.start(now); osc.stop(now + 0.05);
            break;
        case 'click':
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            osc.start(now); osc.stop(now + 0.1);
            break;
        case 'success':
            [440, 554, 659].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.frequency.value = f;
                o.connect(g).connect(ctx.destination);
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(0.05, now + 0.1 + (i*0.05));
                g.gain.linearRampToValueAtTime(0, now + 0.8);
                o.start(now + (i*0.05)); o.stop(now + 1);
            });
            break;
        case 'clover':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
            break;
        }
    } catch (e) {}
  }, [init]);

  return { playFX, startAmbient };
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(api.getCurrentUser() || GUEST_USER);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [collection, setCollection] = useState<Rock[]>([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bootState, setBootState] = useState<'SPLASH' | 'READY'>('SPLASH');
  
  const [showClover, setShowClover] = useState(false);
  const [cloverMode, setCloverMode] = useState<'INTRO' | 'MENU' | 'TOUR' | 'SCOUTING' | 'REWARD' | 'CHALLENGE'>('INTRO');
  const [scoutingReport, setScoutingReport] = useState<string | null>(null);
  
  const [selectedRocksForComparison, setSelectedRocksForComparison] = useState<Rock[]>([]);
  const [comparisonModeActiveFromDetails, setComparisonModeActiveFromDetails] = useState(false);

  const { playFX, startAmbient } = useSciFiAudio();
  const { visitedViews, markViewVisited } = useVisitedViews();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      // Provision mock token for Guest User to prevent "Authentication Required" errors
      localStorage.setItem('token', 'mock_token_guest_scout');
      localStorage.setItem('current_user_data', JSON.stringify(GUEST_USER));
      setUser(GUEST_USER);
    }
    
    api.onSyncStatusChange = setIsSyncing;
    const onPopState = (e: PopStateEvent) => e.state?.view && setCurrentView(e.state.view);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // --- CLOVER PERIODIC SCOUTING LOGIC ---
  const triggerScoutScan = useCallback(async () => {
    if (!user) return;
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const report = await getScoutingReport(pos.coords.latitude, pos.coords.longitude, user.level);
        setScoutingReport(report);
        setCloverMode('SCOUTING');
        setShowClover(true);
        playFX('clover');
      } catch (err) {
        console.warn("Scouting scan failed (likely quota or signal)");
      }
    }, (err) => {
      console.warn("Location unavailable for scout scan.");
    }, { enableHighAccuracy: true });
  }, [user, playFX]);

  useEffect(() => {
    if (user && bootState === 'READY') {
      // Initial scouting scan after 10 seconds
      const initialScout = setTimeout(triggerScoutScan, 10000);
      
      // Periodic scouting every 3 minutes
      const scoutInterval = setInterval(triggerScoutScan, 180000);
      
      return () => {
        clearTimeout(initialScout);
        clearInterval(scoutInterval);
      }
    }
  }, [user, bootState, triggerScoutScan]);

  useEffect(() => {
    if (user && bootState === 'READY') {
      startAmbient();
      loadCollection();
      
      // Refined Initial Introduction Sequence
      const hasSeenIntro = localStorage.getItem('intro_shown');
      if (!hasSeenIntro) {
        const introTimer = setTimeout(() => {
          setCloverMode('INTRO');
          setShowClover(true);
          localStorage.setItem('intro_shown', 'true');
          playFX('clover');
        }, 3500);
        return () => clearTimeout(introTimer);
      }
    }
  }, [user, bootState, startAmbient, playFX]);

  const loadCollection = async () => {
    setIsLoadingCollection(true);
    try {
      const rocks = await api.getRocks();
      setCollection(rocks);
    } catch (error) {
      toast.error('Vault link corrupted.');
    } finally {
      setIsLoadingCollection(false);
    }
  };

  const handleRockAdded = async (rockData: Rock) => {
    try {
      const { rock, userStats } = await api.addRock(rockData);
      setCollection(prev => [rock, ...prev]);
      
      const bonusTotal = (rock.bonusXP?.rarity || 0) + (rock.bonusXP?.expertEye || 0);
      
      if (user) {
        setUser({ ...user, xp: userStats.xp + bonusTotal, level: userStats.level });
        if (bonusTotal > 0) {
           setTimeout(() => {
              setCloverMode('REWARD');
              setShowClover(true);
              playFX('success');
           }, 2000);
        }
      }
      setSelectedRock(rock);
      setCurrentView(View.DETAILS);
    } catch (error) {
      toast.error('Sync failure.');
    }
  };

  const handleRockDeleted = async (id: string) => {
    try {
      await api.deleteRock(id);
      setCollection(prev => prev.filter(r => r.id !== id));
      setSelectedRock(null);
      setCurrentView(View.COLLECTION);
      toast.success('Asset Purged.');
    } catch (error) {
      toast.error('Purge Failed.');
    }
  };

  const handleViewChange = (view: View) => {
    playFX('click');
    setCurrentView(view);
    markViewVisited(view);
    if (view !== View.COLLECTION && view !== View.DETAILS && view !== View.COMPARISON) {
        setSelectedRocksForComparison([]);
        setComparisonModeActiveFromDetails(false);
    }
    try { window.history.pushState({ view }, '', `?view=${view.toLowerCase()}`); } catch (e) {}
  };

  const startComparisonMode = useCallback((initialRock?: Rock) => {
    setSelectedRocksForComparison(initialRock ? [initialRock] : []);
    setComparisonModeActiveFromDetails(true);
    handleViewChange(View.COLLECTION);
  }, [handleViewChange]);

  const finalizeComparison = useCallback((rocks: Rock[]) => {
    setSelectedRocksForComparison(rocks);
    setComparisonModeActiveFromDetails(false);
    handleViewChange(View.COMPARISON);
  }, [handleViewChange]);

  const renderView = () => {
    switch (currentView) {
      case View.HOME: return user ? <Home user={user} onNavigate={(v) => handleViewChange(v as View)} /> : null;
      case View.SCANNER: return <Scanner onRockDetected={handleRockAdded} />;
      case View.COLLECTION:
        return (
            <Collection 
                rocks={collection} 
                // Fix: Replace playSound with playFX as defined in App component
                onRockClick={(rock) => { playFX('click'); setSelectedRock(rock); setCurrentView(View.DETAILS); }}
                onStartComparisonMode={startComparisonMode}
                onFinalizeComparison={finalizeComparison}
                preSelectedRocks={comparisonModeActiveFromDetails ? selectedRocksForComparison : []}
                isComparisonModeActive={comparisonModeActiveFromDetails || selectedRocksForComparison.length > 0} 
                isLoading={isLoadingCollection}
            />
        );
      case View.STATS: return <Statistics rocks={collection} />;
      case View.DETAILS:
        return selectedRock ? (
            <RockDetails 
                rock={selectedRock} 
                onBack={() => handleViewChange(View.COLLECTION)} 
                onDelete={handleRockDeleted} 
                onStartComparisonMode={startComparisonMode}
            />
        ) : null;
      case View.PROFILE:
        return user ? <Profile user={user} onUpdateUser={setUser} onBack={() => handleViewChange(View.HOME)} onReplayIntro={() => { setCloverMode('INTRO'); setShowClover(true); }} /> : null;
      case View.MAP: return <UserMap rocks={collection} onRockClick={(rock) => { setSelectedRock(rock); setCurrentView(View.DETAILS); }} />;
      case View.WEATHER: return <WeatherDashboard onBack={() => handleViewChange(View.HOME)} />;
      case View.ACHIEVEMENTS: return <Achievements user={user!} rocks={collection} />;
      case View.COMPARISON: return <RockComparison rocksToCompare={selectedRocksForComparison} onBack={() => handleViewChange(View.COLLECTION)} />;
      default: return <Home user={user!} onNavigate={(v) => handleViewChange(v as View)} />;
    }
  };

  if (bootState === 'SPLASH') return <SplashScreen onFinish={() => { playFX('boot'); setBootState('READY'); }} />;
  if (!user) return <div className="flex flex-col h-screen w-screen bg-[#030712]"><Auth onLogin={setUser} /></div>;

  return (
    <div className="flex flex-col h-screen w-screen relative overflow-hidden bg-[#030712] text-gray-100 font-sans z-[50]">
      <Toaster position="top-center" toastOptions={{
        style: { background: 'rgba(5, 10, 16, 0.9)', color: '#22d3ee', border: '1px solid rgba(34, 211, 238, 0.3)', fontFamily: 'monospace', fontSize: '12px' },
      }} />

      <header className="flex-none bg-[#050a10]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-3" onClick={() => handleViewChange(View.PROFILE)}>
          <div className="relative cursor-pointer group">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 group-hover:border-cyan-500/50 transition-colors">
              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold">{user.username.slice(0, 2)}</div>}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050a10]" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-widest uppercase">{user.username}</h1>
            <div className="flex items-center gap-2 text-[9px] text-cyan-500/80 font-mono">
              <span>LVL {user.level}</span>
              <span className="w-px h-2 bg-gray-700" />
              <span>{user.xp} XP</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <SyncStatus isSyncing={isSyncing} />
            <button onClick={() => { setCloverMode('MENU'); setShowClover(true); playFX('clover'); }} className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all">
                <Cpu size={18} />
            </button>
        </div>
      </header>

      <main className="flex-1 relative perspective-container overflow-hidden z-30">
         <div ref={contentRef} className="w-full h-full holographic-plane relative bg-black">
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none" src="/video/rockhound-loading.mp4" />
            <div className="absolute inset-0 bg-[#030508]/80 z-0 pointer-events-none" />
            <div className="relative z-10 w-full h-full">
                <Suspense fallback={<div className="flex h-full items-center justify-center"><ScanLine className="animate-spin text-cyan-500" /></div>}>
                    {renderView()}
                </Suspense>
            </div>
         </div>
         {showClover && (
            <CloverOverlay 
                user={user} 
                onDismiss={() => setShowClover(false)} 
                currentView={currentView}
                initialMode={cloverMode} 
                scoutingContext={scoutingReport || undefined}
            />
         )}
         {!showClover && <CloverButton onClick={() => { setCloverMode('MENU'); setShowClover(true); playFX('clover'); }} />}
      </main>

      <nav className="flex-none bg-[#050a10]/90 backdrop-blur-xl border-t border-white/5 pb-safe z-40 relative">
        <div className="flex justify-around items-center px-2 py-2">
          <NavButton active={currentView === View.HOME} onClick={() => handleViewChange(View.HOME)} icon={HomeIcon} label="HQ" />
          <NavButton active={currentView === View.MAP} onClick={() => handleViewChange(View.MAP)} icon={MapIcon} label="GRID" />
          <div className="relative -top-5">
             <button onClick={() => handleViewChange(View.SCANNER)} className="w-16 h-16 rounded-full bg-gradient-to-b from-cyan-500 to-indigo-600 p-[1px] shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-[#050a10] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent" />
                    <ScanLine className="w-6 h-6 text-white relative z-10" />
                </div>
             </button>
          </div>
          <NavButton active={currentView === View.COLLECTION} onClick={() => handleViewChange(View.COLLECTION)} icon={Box} label="VAULT" />
          <NavButton active={currentView === View.STATS || currentView === View.ACHIEVEMENTS} onClick={() => handleViewChange(View.ACHIEVEMENTS)} icon={Activity} label="DATA" />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 group ${active ? 'bg-white/5' : 'hover:bg-white/5'}`}>
    <div className={`relative p-1.5 rounded-lg transition-all ${active ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        {active && <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full" />}
    </div>
    <span className={`text-[9px] font-bold tracking-wider mt-1 ${active ? 'text-cyan-400' : 'text-gray-600'}`}>{label}</span>
  </button>
);

export default App;
