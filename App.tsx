import React, { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Box, LogOut, Map as MapIcon, CloudSun, ScanLine, Cpu, Zap, Radio, Globe, Activity, Lock, Terminal, Shield } from 'lucide-react';
import { Rock } from './types';
import { api, User } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { SplashScreen } from './components/SplashScreen';
import { Auth } from './components/Auth';
import { CloverOverlay } from './components/CloverOverlay';
import { CloverButton } from './components/CloverButton';
import { SyncStatus } from './components/SyncStatus';
import { useVisitedViews } from './hooks/useVisitedViews';

// -- LAZY MODULES --
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

// -- TYPES --
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

// -- AUDIO ENGINE 2.0 (Ambient Drone + FX) --
const useSciFiAudio = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  const init = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
  };

  const startAmbient = () => {
    init();
    if (!ctxRef.current || droneOscRef.current) return;
    
    // Create a low throbbing drone
    const osc = ctxRef.current.createOscillator();
    const gain = ctxRef.current.createGain();
    const lfo = ctxRef.current.createOscillator();
    const lfoGain = ctxRef.current.createGain();

    // Base tone (Deep Sub-bass)
    osc.type = 'sawtooth';
    osc.frequency.value = 40; 
    
    // LFO for "throbbing" texture
    lfo.type = 'sine';
    lfo.frequency.value = 0.2; // Slow pulse
    lfoGain.gain.value = 1500; // Filter modulation depth

    // Filter to make it muffled and ambient
    const filter = ctxRef.current.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctxRef.current.destination);

    gain.gain.setValueAtTime(0, ctxRef.current.currentTime);
    gain.gain.linearRampToValueAtTime(0.03, ctxRef.current.currentTime + 2); // Fade in gently

    osc.start();
    lfo.start();
    
    droneOscRef.current = osc;
    droneGainRef.current = gain;
  };

  const playFX = useCallback((type: 'hover' | 'click' | 'success' | 'boot' | 'error') => {
    init();
    const ctx = ctxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'hover':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.linearRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'success':
        // Major chord arpeggio
        [440, 554, 659].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = freq;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.05, now + 0.1 + (i*0.05));
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            o.start(now + (i*0.05));
            o.stop(now + 1);
        });
        break;
      case 'boot':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  }, []);

  return { playFX, startAmbient };
};

// -- STYLES (Advanced) --
const GLOBAL_STYLES = `
  @keyframes scanline-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
  @keyframes hologram-flicker { 0% { opacity: 0.95; } 5% { opacity: 0.8; } 10% { opacity: 0.95; } 50% { opacity: 0.95; } 55% { opacity: 0.85; } 100% { opacity: 0.95; } }
  @keyframes text-decode { 0% { content: '...'; } 33% { content: '..'; } 66% { content: '.'; } }
  
  .perspective-container { perspective: 1000px; }
  .holographic-plane { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
  
  .crt-overlay {
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
    background-size: 100% 3px;
    pointer-events: none;
  }
  
  .hud-glass {
    background: rgba(13, 17, 23, 0.6);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(6, 182, 212, 0.05);
  }
  
  .neon-text { text-shadow: 0 0 10px rgba(6, 182, 212, 0.5); }
  .neon-border { box-shadow: 0 0 15px rgba(99, 102, 241, 0.3); }
  
  /* Scrollbar hide */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.SCANNER);
  const [collection, setCollection] = useState<Rock[]>([]);
  const [selectedRock, setSelectedRock] = useState<Rock | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bootState, setBootState] = useState<'SPLASH' | 'HEX_DUMP' | 'READY'>('SPLASH');
  const [hexLines, setHexLines] = useState<string[]>([]);
  const [showClover, setShowClover] = useState(false);
  const [cloverMode, setCloverMode] = useState<'INTRO' | 'MENU' | 'TOUR'>('INTRO');
  
  // Audio & Interaction Hooks
  const { playFX, startAmbient } = useSciFiAudio();
  const { visitedViews, markViewVisited } = useVisitedViews();
  
  // Refs for 3D Tilt Effect
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // -- 3D HOLOGRAPHIC TILT ENGINE --
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!contentRef.current) return;
      const { innerWidth, innerHeight } = window;
      // Normalize mouse position -1 to 1
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = (e.clientY / innerHeight) * 2 - 1;
      
      // Store for smooth interpolation if needed later
      mousePos.current = { x, y };

      // Apply Tilt
      contentRef.current.style.transform = `
        rotateY(${x * 1.5}deg) 
        rotateX(${-y * 1.5}deg) 
        translateZ(0px)
      `;
      
      // Move background slightly opposite for parallax depth
      document.documentElement.style.setProperty('--mouse-x', `${x}`);
      document.documentElement.style.setProperty('--mouse-y', `${y}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // -- BOOT SEQUENCE LOGIC --
  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser) setUser(currentUser);
    api.onSyncStatusChange = setIsSyncing;

    const onPopState = (e: PopStateEvent) => e.state?.view && setCurrentView(e.state.view);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (bootState === 'HEX_DUMP') {
      playFX('boot');
      // Generate random hex dump lines
      let lineCount = 0;
      const maxLines = 25;
      const interval = setInterval(() => {
        const addr = `0x${Math.floor(Math.random()*65535).toString(16).toUpperCase().padStart(4, '0')}`;
        const data = Array(4).fill(0).map(() => Math.floor(Math.random()*255).toString(16).toUpperCase().padStart(2,'0')).join(' ');
        setHexLines(prev => [...prev.slice(-15), `${addr} : ${data} ... OK`]); // Keep last 15 lines
        lineCount++;
        if (lineCount > maxLines) {
          clearInterval(interval);
          setBootState('READY');
          startAmbient(); // Start the engine hum
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [bootState, playFX, startAmbient]);

  useEffect(() => {
    if (user && bootState === 'READY') {
      collection();
      if (!localStorage.getItem