
import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Camera, Box, BarChart2, LogOut, Map as MapIcon, CloudSun, ScanLine, Hexagon, User as UserIcon, Settings, Terminal, Award } from 'lucide-react';
import { Rock } from './types';
import { api, User } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { Auth } from './components/Auth';
import { CloverOverlay } from './components/CloverOverlay';
import { CloverButton } from './components/CloverButton';
import { SyncStatus } from './components/SyncStatus';
import { useVisitedViews } from './hooks/useVisitedViews';

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
  const [collection, setCollection] = useState<Rock[]>([]);
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
        }, 800);
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
          setTimeout(() => toast('RANK INCREASED!', { icon: '🏆', className: 'glass-panel border-amber-500/50 text-amber-400' }), 1000);
        }
      }
    } catch (e) {
      console.error("Failed to save rock", e);
      toast.error("DATA SYNC FAILED");
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
      toast.error("PURGE FAILED");
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
    <div className={`flex flex-col h-screen w-screen relative bg-[#030712] text-gray-100 font-mono selection:bg-cyan-500/30 z-[50] overflow-hidden`}>
      <Toaster position="top-center" toastOptions={{ className: 'glass-panel !bg-black/90 !text-cyan-400 !border-cyan-500/30 !backdrop-blur-xl font-mono uppercase tracking-wider' }} />
      
      {/* Global Background Scanlines & CRT Effects */}
      <div className="scanline z-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none z-20" />

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
      <header className="fixed top-0 left-0 right-0 pt-safe px-6 pb-4 z-40 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
        <div className={`pointer-events-auto flex items-center gap-4 cursor-pointer group`} onClick={() => handleViewChange(View.PROFILE)}>
          <div className="relative">
             <div className={`w-12 h-12 rounded-lg bg-black/60 border border-cyan-500/30 backdrop-blur-md flex items-center justify-center overflow-hidden group-hover:border-cyan-400 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]`}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-cyan-900 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-cyan-400/50" />
                </div>
              )}
            </div>
            {/* Animated Status Ring */}
            <div className="absolute -inset-1 border border-cyan-500/20 rounded-xl animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-1 -right-2 bg-indigo-600 backdrop-blur text-[9px] text-white px-1.5 py-0.5 rounded-sm font-bold border border-indigo-400/50 shadow-lg">LVL {user.level}</div>
          </div>
          <div className="flex flex-col">
            <h1 className={`text-sm font-bold text-white leading-none tracking-[0.2em] group-hover:text-cyan-400 transition-colors text-glow`}>{user.username.toUpperCase()}</h1>
            <div className={`w-24 h-1.5 bg-gray-900/80 rounded-full mt-2 overflow-hidden border border-white/5`}>
              <div className={`h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]`} style={{ width: `${xpPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
            <SyncStatus isSyncing={isSyncing} />
            <button onClick={() => handleViewChange(View.WEATHER)} className={`p-2.5 bg-gray-900/60 hover:bg-cyan-900/20 rounded-lg border border-white/10 hover:border-cyan-500/50 backdrop-blur-md transition-all group`}>
                <CloudSun className={`w-4 h-4 text-cyan-500/70 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]`} />
            </button>
            <button onClick={() => handleViewChange(View.ADMIN)} className={`p-2.5 bg-gray-900/60 hover:bg-purple-900/20 rounded-lg border border-white/10 hover:border-purple-500/50 backdrop-blur-md transition-all group`}>
                <Terminal className={`w-4 h-4 text-purple-500/70 group-hover:text-purple-400`} />
            </button>
            <button onClick={handleLogout} className={`p-2.5 bg-gray-900/60 hover:bg-red-900/20 rounded-lg border border-white/10 hover:border-red-500/50 backdrop-blur-md transition-all group`}>
                <LogOut className={`w-4 h-4 text-gray-500 group-hover:text-red-400`} />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative z-10 pt-safe pb-safe overflow-hidden">
        <Suspense fallback={
            <div className="h-full flex flex-col items-center justify-center bg-black">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin" />
                    <div className="absolute inset-2 border-r-2 border-indigo-500 rounded-full animate-spin-reverse" />
                </div>
                <div className="mt-6 text-xs font-mono text-cyan-500 tracking-[0.3em] animate-pulse">LOADING MODULE...</div>
            </div>
        }>
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

      {/* Floating Holographic Dock */}
      {(currentView !== View.ADMIN && currentView !== View.PROFILE && currentView !== View.DETAILS) && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <nav className={`pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-end gap-8 transform hover:scale-105 transition-transform duration-300 relative`}>
             {/* Decor lines */}
             <div className="absolute -top-1 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

             {/* Collection Vault */}
             <button 
                onClick={() => handleViewChange(View.COLLECTION)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.COLLECTION ? '-translate-y-2' : 'opacity-60 hover:opacity-100 hover:-translate-y-1'}`}
             >
                <div className={`p-2.5 rounded-xl transition-all ${currentView === View.COLLECTION ? 'bg-cyan-900/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-transparent'}`}>
                    <Box className={`w-5 h-5 ${currentView === View.COLLECTION ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-200'}`} />
                </div>
                <span className={`text-[9px] font-bold tracking-widest uppercase ${currentView === View.COLLECTION ? 'text-cyan-400 scale-100' : 'text-gray-500 scale-0'} transition-all absolute -bottom-5`}>Vault</span>
             </button>
             
             {/* Central Scanner - The Eye */}
             <button onClick={() => handleViewChange(View.SCANNER)} className={`relative -top-6 group`}>
                <div className={`absolute inset-0 bg-indigo-600 rounded-full blur-xl opacity-30 group-hover:opacity-50 animate-pulse`} />
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-indigo-500/30 backdrop-blur-2xl transition-all duration-300 bg-black/80 group-hover:scale-105 group-hover:border-indigo-400 ${currentView === View.SCANNER ? 'shadow-[0_0_25px_rgba(99,102,241,0.4)] border-indigo-400' : ''}`}>
                  <ScanLine className={`w-7 h-7 text-white ${currentView === View.SCANNER ? 'animate-pulse' : ''}`} />
                  {/* Rotating rings inside button */}
                  <div className={`absolute inset-1 border border-indigo-500/20 rounded-full animate-[spin_4s_linear_infinite]`} />
                </div>
             </button>

             {/* Satellite Map */}
             <button 
                onClick={() => handleViewChange(View.MAP)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.MAP ? '-translate-y-2' : 'opacity-60 hover:opacity-100 hover:-translate-y-1'}`}
             >
                <div className={`p-2.5 rounded-xl transition-all ${currentView === View.MAP ? 'bg-purple-900/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-transparent'}`}>
                    <MapIcon className={`w-5 h-5 ${currentView === View.MAP ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-200'}`} />
                </div>
                <span className={`text-[9px] font-bold tracking-widest uppercase ${currentView === View.MAP ? 'text-purple-400 scale-100' : 'text-gray-500 scale-0'} transition-all absolute -bottom-5`}>Sat-Nav</span>
             </button>

             {/* Stats/Achievements Split */}
             <button 
                onClick={() => handleViewChange(View.STATS)} 
                className={`group relative flex flex-col items-center gap-1 transition-all duration-300 ${currentView === View.STATS ? '-translate-y-2' : 'opacity-60 hover:opacity-100 hover:-translate-y-1'}`}
             >
                <div className={`p-2.5 rounded-xl transition-all ${currentView === View.STATS ? 'bg-emerald-900/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'bg-transparent'}`}>
                    <BarChart2 className={`w-5 h-5 ${currentView === View.STATS ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-200'}`} />
                </div>
                <span className={`text-[9px] font-bold tracking-widest uppercase ${currentView === View.STATS ? 'text-emerald-400 scale-100' : 'text-gray-500 scale-0'} transition-all absolute -bottom-5`}>Data</span>
             </button>

          </nav>
        </div>
      )}
    </div>
  );
};
export default App;