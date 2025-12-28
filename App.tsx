
import React, { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Box, Map as MapIcon, ScanLine, Cpu, Activity, Home as HomeIcon, Radio, Beaker } from 'lucide-react';
import { Rock, RockAnalysis, User } from './types';
import { api } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { Auth } from './components/Auth';
import { CloverOverlay } from './components/CloverOverlay';
import { CloverButton } from './components/CloverButton';
import { SyncStatus } from './components/SyncStatus';
import { useVisitedViews } from './hooks/useVisitedViews';

const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const Scanner = lazy(() => import('./components/Scanner').then(m => ({ default: m.Scanner })));
const Collection = lazy(() => import('./components/Collection').then(m => ({ default: m.Collection })));
const RockDetails = lazy(() => import('./components/RockDetails').then(m => ({ default: m.RockDetails })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const UserMap = lazy(() => import('./components/UserMap').then(m => ({ default: m.UserMap })));
const Achievements = lazy(() => import('./components/Achievements').then(m => ({ default: m.Achievements })));
const FusionLab = lazy(() => import('./components/FusionLab').then(m => ({ default: m.FusionLab })));

// --- MOCK USER FOR FRONTEND DEVELOPMENT ---
// This user is used to bypass the login screen.
// To re-enable login, change the useState for 'user' back to api.getCurrentUser()
// and uncomment the auth error handling in the main useEffect.
const MOCK_USER: User = {
  id: 'mock-user-01',
  username: 'Cody',
  email: 'cody@rockhound.dev',
  xp: 1250,
  level: 13,
  rankTitle: 'Lead Geologist',
  credits: 8400,
  operatorStats: {
    totalScans: 42,
    distanceTraveled: 12.5,
    uniqueSpeciesFound: 18,
    legendaryFinds: 2,
    highestRarityFound: 92,
    scanStreak: 7,
  }
};

enum View {
  HOME = 'HOME',
  SCANNER = 'SCANNER',
  COLLECTION = 'COLLECTION',
  DETAILS = 'DETAILS',
  PROFILE = 'PROFILE',
  MAP = 'MAP',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  FUSION = 'FUSION'
}

const App: React.FC = () => {
  // LOGIN SUSPENDED: Using mock user for frontend dev.
  const [user, setUser] = useState<User | null>(MOCK_USER);
  // Original line: const [user, setUser] = useState<User | null>(api.getCurrentUser());
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [collection, setCollection] = useState<Rock[]>([]);
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bootState, setBootState] = useState<'SPLASH' | 'READY'>('SPLASH');
  const [showClover, setShowClover] = useState(false);
  const [broadcast, setBroadcast] = useState<string | null>(null);
  
  // Parallax HUD State
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const { markViewVisited } = useVisitedViews();

  // Effect for fetching data when user logs in/out
  useEffect(() => {
    // This effect now ALSO handles syncing the mock user to localStorage
    // to ensure the API service can function correctly in dev mode.
    const isLoginSuspended = true; // Based on existing setup
    if (isLoginSuspended && user && !api.getCurrentUser()) {
      localStorage.setItem('token', 'mock_token_bypass');
      localStorage.setItem('current_user_data', JSON.stringify(user));
    }

    api.onSyncStatusChange = setIsSyncing;
    if (user) {
        api.getRocks().then(setCollection).catch(err => {
            console.error("Failed to get rocks:", err.message);
            // LOGIN SUSPENDED: Auth error handling is temporarily disabled.
            /*
            if (err.message.includes("ACCESS DENIED") || err.message.includes("Authentication required")) {
                toast.error("Session expired. Please log in again.");
                api.logout();
                setUser(null);
            }
            */
        });
    } else {
        // Clear data on logout
        setCollection([]);
    }
  }, [user]);

  // Effect for global UI stuff that runs once
  useEffect(() => {
    const handleMotion = (e: DeviceOrientationEvent) => {
        const x = (e.beta || 0) / 45; // -2 to 2
        const y = (e.gamma || 0) / 45;
        setParallax({ x, y });
    };
    window.addEventListener('deviceorientation', handleMotion);
    
    const interval = setInterval(() => {
        const agents = ["X-RAY", "ALPHA", "ZETA", "PHANTOM"];
        const minerals = ["AMETHYST", "QUARTZ", "PYRITE", "GARNET"];
        setBroadcast(`AGENT_${agents[Math.floor(Math.random()*4)]} DISCOVERED RARE_${minerals[Math.floor(Math.random()*4)]}`);
        setTimeout(() => setBroadcast(null), 5000);
    }, 15000);
    
    return () => { 
        clearInterval(interval); 
        window.removeEventListener('deviceorientation', handleMotion); 
    };
  }, []);

  const handleUpdateRock = (updatedRock: Rock) => {
      setCollection(prev => prev.map(r => r.id === updatedRock.id ? updatedRock : r));
      setSelectedRock(updatedRock);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    markViewVisited(view);
  };

  const handleRockDetected = (rock: Rock) => {
    // Optimistic UI update for snappy UX
    setCollection(prev => [rock, ...prev]);
    setSelectedRock(rock);
    handleViewChange(View.DETAILS);

    // Persist to backend/mock asynchronously
    api.addRock(rock).then(({ rock: savedRock, userStats }) => {
        console.log('Rock saved, user stats updated:', userStats);
        // Replace optimistic rock with server response if needed (e.g., if server adds a DB ID)
        setCollection(prev => prev.map(r => r.id === rock.id ? savedRock : r));
        
        // Re-sync user state from the source of truth (localStorage, which was updated by the api call)
        const updatedUser = api.getCurrentUser();
        if (updatedUser) {
            setUser(updatedUser);
        }
    }).catch(err => {
        toast.error("Failed to save to Vault. Specimen will be lost on refresh.");
        console.error("Save rock failed:", err);
    });
  }

  const renderView = () => {
    switch (currentView) {
      case View.HOME: return <Home user={user!} onNavigate={(v) => handleViewChange(v as View)} />;
      case View.SCANNER: return <Scanner user={user!} onRockDetected={handleRockDetected} />;
      case View.COLLECTION: return <Collection rocks={collection} onRockClick={(r) => { setSelectedRock(r); handleViewChange(View.DETAILS); }} onStartComparisonMode={() => {}} onFinalizeComparison={() => {}} preSelectedRocks={[]} isComparisonModeActive={false} />;
      case View.DETAILS: return selectedRock ? <RockDetails rock={selectedRock} onBack={() => handleViewChange(View.COLLECTION)} onDelete={(id) => { setCollection(p => p.filter(r => r.id !== id)); handleViewChange(View.COLLECTION); }} onUpdateRock={handleUpdateRock} /> : null;
      case View.PROFILE: return <Profile user={user!} onUpdateUser={setUser} onBack={() => handleViewChange(View.HOME)} />;
      case View.MAP: return <UserMap rocks={collection} onRockClick={(r) => { setSelectedRock(r); handleViewChange(View.DETAILS); }} />;
      case View.ACHIEVEMENTS: return <Achievements user={user!} rocks={collection} />;
      case View.FUSION: return <FusionLab rocks={collection} onBack={() => handleViewChange(View.COLLECTION)} onFused={(r) => { setCollection(p => [r, ...p]); setSelectedRock(r); handleViewChange(View.DETAILS); }} />;
      default: return null;
    }
  };

  if (bootState === 'SPLASH') return <SplashScreen onFinish={() => setBootState('READY')} />;
  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div className="flex flex-col h-screen w-screen relative overflow-hidden bg-[#030508] text-gray-100 font-sans">
      <Toaster position="top-center" />
      
      {/* PARALLAX HUD OVERLAY */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] opacity-30 transition-transform duration-200"
        style={{ transform: `translate(${parallax.y * 10}px, ${parallax.x * 10}px)` }}
      >
          <div className="absolute top-1/2 left-6 w-px h-32 bg-cyan-500/20" />
          <div className="absolute top-1/2 right-6 w-px h-32 bg-cyan-500/20" />
          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-1">
             {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 bg-cyan-500/10 rounded-full" />)}
          </div>
      </div>

      {broadcast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 bg-indigo-600/90 backdrop-blur-xl px-5 py-2 rounded-full border border-indigo-400/50 shadow-2xl">
                  <Radio size={14} className="text-white animate-pulse" />
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">{broadcast}</span>
              </div>
          </div>
      )}

      <header className="flex-none bg-[#050a10]/60 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex items-center justify-between z-40">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleViewChange(View.PROFILE)}>
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-lg">
            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-900 flex items-center justify-center font-bold">{user.username[0]}</div>}
          </div>
          <div>
            <h1 className="text-xs font-black text-white uppercase tracking-widest">{user.username}</h1>
            <div className="flex items-center gap-2 text-[8px] text-cyan-400 font-mono tracking-tighter">
                <span>LVL_{user.level}</span>
                <span className="opacity-20">//</span>
                <span>{user.credits} CR</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
            <SyncStatus isSyncing={isSyncing} />
            <button onClick={() => handleViewChange(View.FUSION)} className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all"><Beaker size={20} /></button>
            <button onClick={() => setShowClover(true)} className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all"><Cpu size={20} /></button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-black z-30">
         <div key={currentView} className="w-full h-full animate-in fade-in zoom-in-95 duration-500">
            <Suspense fallback={null}>
                {renderView()}
            </Suspense>
         </div>
         {showClover && <CloverOverlay user={user} onDismiss={() => setShowClover(false)} currentView={currentView} initialMode="MENU" />}
         {!showClover && <CloverButton onClick={() => setShowClover(true)} />}
      </main>

      <nav className="flex-none bg-[#050a10]/90 backdrop-blur-3xl border-t border-white/5 pb-safe z-40 relative px-6">
        <div className="flex justify-between items-center h-24">
          <NavButton active={currentView === View.HOME} onClick={() => handleViewChange(View.HOME)} icon={HomeIcon} label="Command" />
          <NavButton active={currentView === View.MAP} onClick={() => handleViewChange(View.MAP)} icon={MapIcon} label="Telemetry" />
          <div className="relative -top-10">
             <button onClick={() => handleViewChange(View.SCANNER)} className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-600 to-purple-600 p-[3px] shadow-[0_0_50px_rgba(79,70,229,0.5)] active:scale-90 transition-transform">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
                    <ScanLine className="w-10 h-10 text-white" />
                </div>
             </button>
          </div>
          <NavButton active={currentView === View.COLLECTION} onClick={() => handleViewChange(View.COLLECTION)} icon={Box} label="The Vault" />
          <NavButton active={currentView === View.ACHIEVEMENTS} onClick={() => handleViewChange(View.ACHIEVEMENTS)} icon={Activity} label="Registry" />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 group transition-all ${active ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}>
    <Icon size={24} className={active ? 'text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.8)]' : 'text-white'} />
    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${active ? 'text-indigo-400' : 'text-white'}`}>{label}</span>
  </button>
);

export default App;