

import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Camera, Box, BarChart2, LogOut, Map as MapIcon, CloudSun, ScanLine, Hexagon, User as UserIcon } from 'lucide-react';
import { Rock } from './types';
import { api, User } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { Auth } from './components/Auth';
import { CloverOverlay } from './components/CloverOverlay';
import { CloverButton } from './components/CloverButton';
import { SyncStatus } from './components/SyncStatus';
import { useVisitedViews } from './hooks/useVisitedViews'; // Corrected import path for local module

const Scanner = lazy(() => import('./components/Scanner').then(module => ({ default: module.Scanner })));
const Collection = lazy(() => import('./components/Collection').then(module => ({ default: module.Collection })));
const Statistics = lazy(() => import('./components/Statistics').then(module => ({ default: module.Statistics })));
const RockDetails = lazy(() => import('./components/RockDetails').then(module => ({ default: module.RockDetails })));
const Profile = lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UserMap = lazy(() => import('./components/UserMap').then(module => ({ default: module.UserMap })));
const WeatherDashboard = lazy(() => import('./components/WeatherDashboard').then(module => ({ default: module.WeatherDashboard })));
const Achievements = lazy(() => import('./components/Achievements').then(module => ({ default: module.Achievements })));
const Guide = lazy(() => import('./components/Guide').then(module => ({ default: module.Guide })));

// The stated goal of "0.8 milliseconds load time" is extremely ambitious for a full-featured
// modern web application, especially for an initial load. This typically refers to 
// API response times or UI render times after the initial bundle has loaded.
//
// To achieve the *perceived* speed and fluidity for a 2030-2040s feel, the application
// already employs many advanced techniques:
// - Lazy loading components (Suspense, React.lazy) to minimize initial bundle size.
// - Service Worker caching for instant subsequent loads of static assets.
// - Highly optimized CSS animations (transform, opacity) run on the GPU.
// - Memoization (useMemo, useCallback) to prevent unnecessary re-renders.
// - Efficient image handling (resizing, object-cover).
// - Direct DOM manipulation with refs for performance-critical effects (parallax, audio).
// - Async operations with loading states and optimistic UI updates (where applicable).
// - Global audio elements preloaded for instant playback.
//
// These strategies aim for an *ultra-responsive user experience*, where interactions
// feel instantaneous and visual transitions are seamless, even if the absolute
// "load time" of the entire application bundle might be slightly higher than 0.8ms.
// Continuous monitoring and optimization of asset delivery and runtime performance
// will be key to approaching this ideal.

enum View {
  SCANNER = 'SCANNER',
  COLLECTION = 'COLLECTION',
  STATS = 'STATS',
  DETAILS = 'DETAILS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  MAP = 'MAP',
  WEATHER = 'WEATHER',
  ACHIEVEMENTS = 'ACHIEVEMENTS'
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.SCANNER);
  const [collection, setCollection] = useState<Rock[]>([]);// Global App component for full bleed and positioning
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showClover, setShowClover] = useState(false);
  const [cloverMode, setCloverMode] = useState<'INTRO' | 'MENU' | 'TOUR'>('INTRO');
  
  const { visitedViews, markViewVisited } = useVisitedViews();

  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser) setUser(currentUser);
    api.onSyncStatusChange = setIsSyncing;
  }, []);

  useEffect(() => {
    if (user) {
      loadCollection();
      const hasMetClover = localStorage.getItem('has_met_clover_v1');
      if (!hasMetClover && !showSplash) {
        setTimeout(() => {
            setCloverMode('INTRO');
            setShowClover(true);
        }, 500);
      }
    }
  }, [user, showSplash]);

  const loadCollection = async () => {
    setIsLoadingData(true);
    try {
      const rocks = await api.getRocks();
      setCollection(rocks);
    } catch (e) {
      console.error("Failed to load collection", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(View.SCANNER);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCollection([]);
  };

  const handleViewChange = useCallback((newView: View) => {
      setCurrentView(newView);
      const tourableViews = [View.MAP, View.COLLECTION, View.STATS, View.WEATHER, View.ACHIEVEMENTS, View.SCANNER, View.PROFILE];
      if (user && tourableViews.includes(newView) && !visitedViews.has(newView)) {
          markViewVisited(newView);
          setTimeout(() => {
              setCloverMode('TOUR');
              setShowClover(true);
          }, 300); 
      }
  }, [user, visitedViews, markViewVisited]);

  const addToCollection = async (rock: Rock) => {
    setCollection(prev => [rock, ...prev]);
    handleViewChange(View.COLLECTION);
    try {
      const { userStats } = await api.addRock(rock);
      if (userStats) {
        setUser(prev => prev ? ({ ...prev, xp: userStats.xp, level: userStats.level }) : null);
        if (userStats.leveledUp) {
          setTimeout(() => toast('LEVEL UP!', { icon: '🏆', style: { background: '#4f46e5', color: '#fff' } }), 1000);
        }
      }
    } catch (e) {
      console.error("Failed to save rock", e);
      toast.error("Sync failed");
      setCollection(prev => prev.filter(r => r.id !== rock.id));
    }
  };

  const handleDeleteRock = async (id: string) => {
    try {
      setCollection(prev => prev.filter(r => r.id !== id));
      setSelectedRock(null);
      handleViewChange(View.COLLECTION);
      await api.deleteRock(id);
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleRockClick = (rock: Rock) => {
    setSelectedRock(rock);
    setCurrentView(View.DETAILS);
  };

  const handleCloverSummon = useCallback(() => {
      setCloverMode('MENU');
      setShowClover(true);
  }, []);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (!user) return <><Toaster position="top-center" /><Auth onLogin={handleLogin} /></>;

  const xpForNextLevel = 1000;
  const currentLevelXp = user.xp % xpForNextLevel;
  const xpPercentage = (currentLevelXp / xpForNextLevel) * 100;

  return (
    <div className={`flex flex-col h-screen w-screen relative bg-[#030712] text-gray-100 font-sans selection:bg-indigo-500/30 z-[50] overflow-hidden`}>
      <Toaster position="top-center" toastOptions={{ className: 'glass-panel !bg-gray-900/80 !text-white !border-white/10 !backdrop-blur-md' }} />
      
      {/* Global Background Scanlines - now explicitly positioned above fluid-bg but within app content */}
      <div className="scanline z-20" /> {/* Added explicit z-index to position it above the global fluid-bg */}

      {showGuide && <Suspense fallback={null}><Guide onClose={() => setShowGuide(false)} /></Suspense>}
      
      {showClover && (
        <CloverOverlay 
          user={user} 
          currentView={currentView}
          initialMode={cloverMode}
          onDismiss={() => {
            setShowClover(false);
            if (cloverMode === 'INTRO') localStorage.setItem('has_met_clover_v1', 'true');
          }} 
        />
      )}
      
      {!showClover && <CloverButton onClick={handleCloverSummon} />}

      {/* Holographic Header */}
      <header className="fixed top-0 left-0 right-0 pt-safe px-4 pb-4 z-40 flex items-center justify-between pointer-events-none">
        <div className={`pointer-events-auto flex items-center gap-3 cursor-pointer group`} onClick={() => handleViewChange(View.PROFILE)}>
          <div className="relative">
             <div className={`w-10 h-10 rounded-lg bg-gray-900/40 border border-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden group-hover:border-cyan-400/50 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /> : <span className="font-bold font-mono">{user.level}</span>}
            </div>
            <div className="absolute -bottom-1 -right-2 bg-indigo-600/90 backdrop-blur text-[8px] text-white px-1.5 py-0.5 rounded-sm font-bold font-mono border border-indigo-400/30">LVL {user.level}</div>
          </div>
          <div className="flex flex-col">
            <h1 className={`text-xs font-bold text-white leading-none tracking-[0.2em] group-hover:text-cyan-400 transition-colors`}>{user.username.toUpperCase()}</h1>
            <div className={`w-20 h-1 bg-gray-800/50 rounded-full mt-1.5 overflow-hidden backdrop-blur-sm`}>
              <div className={`h-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]`} style={{ width: `${xpPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
            <SyncStatus isSyncing={isSyncing} />
            <button onClick={() => handleViewChange(View.WEATHER)} className={`p-2 bg-gray-900/30 hover:bg-gray-800/50 rounded-lg border border-white/5 backdrop-blur-md transition-all group`}>
                <CloudSun className={`w-4 h-4 text-cyan-500/70 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]`} />
            </button>
            <button onClick={handleLogout} className={`p-2 bg-gray-900/30 hover:bg-red-900/20 rounded-lg border border-white/5 backdrop-blur-md transition-all group`}>
                <LogOut className={`w-4 h-4 text-gray-500 group-hover:text-red-400`} />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative z-10 pt-safe pb-safe overflow-hidden">
        <Suspense fallback={<div className="h-full flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"><div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><div className="mt-4 text-xs font-mono text-indigo-400 tracking-widest animate-pulse">LOADING MODULE...</div></div>}>
          {(() => {
            switch (currentView) {
              case View.SCANNER: return <Scanner onIdentify={addToCollection} />;
              case View.COLLECTION: return <Collection rocks={collection} onRockClick={handleRockClick} isLoading={isLoadingData} />;
              case View.STATS: return <Statistics rocks={collection} />;
              case View.DETAILS: return selectedRock ? <RockDetails rock={selectedRock} onBack={() => handleViewChange(View.COLLECTION)} onDelete={handleDeleteRock} /> : <Collection rocks={collection} onRockClick={handleRockClick} />;
              case View.PROFILE: return <Profile user={user} onUpdateUser={handleUpdateUser} onBack={() => handleViewChange(View.SCANNER)} onReplayIntro={() => { setCloverMode('INTRO'); setShowClover(true); }} />;
              case View.ADMIN: return <AdminDashboard onBack={() => handleViewChange(View.SCANNER)} />;
              case View.MAP: return <UserMap rocks={collection} onRockClick={handleRockClick} />;
              case View.WEATHER: return <WeatherDashboard onBack={() => handleViewChange(View.SCANNER)} />;
              case View.ACHIEVEMENTS: return <Achievements user={user} rocks={collection} />;
              default: return <Scanner onIdentify={addToCollection} />;
            }
          })()}
        </Suspense>
      </main>

      {/* Floating Glass Dock */}
      {(currentView !== View.ADMIN && currentView !== View.PROFILE && currentView !== View.DETAILS) && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <nav className={`pointer-events-auto bg-[#030712]/60 backdrop-blur-2xl border border-white/10 px-8 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-10 transform hover:scale-105 transition-transform duration-300`}>
             
             <button 
                onClick={() => handleViewChange(View.COLLECTION)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.COLLECTION ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
             >
                <div className={`p-2 rounded-lg transition-colors ${currentView === View.COLLECTION ? 'bg-cyan-500/20' : 'bg-transparent group-hover:bg-white/5'}`}>
                    <Box className={`w-5 h-5 ${currentView === View.COLLECTION ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'text-gray-300'}`} />
                </div>
                {currentView === View.COLLECTION && <div className={`absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_#06b6d4]`} />}
             </button>
             
             <button onClick={() => handleViewChange(View.SCANNER)} className={`relative -top-5 group`}>
                <div className={`absolute inset-0 bg-indigo-600 rounded-full blur-lg opacity-40 group-hover:opacity-60 animate-pulse`} />
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-indigo-400/30 backdrop-blur-xl transition-all duration-300 ${currentView === View.SCANNER ? 'bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110 border-white/20' : 'bg-gray-900/90 group-hover:bg-indigo-900/80'}`}>
                  <ScanLine className={`w-6 h-6 text-white ${currentView === View.SCANNER ? 'animate-pulse' : ''}`} />
                </div>
             </button>

             <button 
                onClick={() => handleViewChange(View.MAP)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.MAP ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
             >
                <div className={`p-2 rounded-lg transition-colors ${currentView === View.MAP ? 'bg-purple-500/20' : 'bg-transparent group-hover:bg-white/5'}`}>
                    <MapIcon className={`w-5 h-5 ${currentView === View.MAP ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-gray-300'}`} />
                </div>
                {currentView === View.MAP && <div className={`absolute -bottom-1 w-1 h-1 bg-purple-400 rounded-full shadow-[0_0_5px_#a855f7]`} />}
             </button>

             <button 
                onClick={() => handleViewChange(View.STATS)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.STATS ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
             >
                <div className={`p-2 rounded-lg transition-colors ${currentView === View.STATS ? 'bg-emerald-500/20' : 'bg-transparent group-hover:bg-white/5'}`}>
                    <BarChart2 className={`w-5 h-5 ${currentView === View.STATS ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-gray-300'}`} />
                </div>
                {currentView === View.STATS && <div className={`absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_5px_#34d399]`} />}
             </button>

          </nav>
        </div>
      )}
    </div>
  );
};
export default App;