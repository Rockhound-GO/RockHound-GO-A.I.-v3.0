import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertTriangle, ShieldCheck, Fingerprint, Scan, Cpu } from 'lucide-react';
import { api } from '../services/api';

// -- AUDIO ENGINE (Local) --
const useAuthSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'type' | 'hover' | 'click' | 'success' | 'error') => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case 'type': // Mechanical keyboard / blip sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'hover':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'click':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
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
        case 'success':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.4);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
  }, []);

  return playSound;
};

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  
  // 3D Tilt Logic
  const cardRef = useRef<HTMLDivElement>(null);
  const playSound = useAuthSound();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25; // Sensitivity
    const y = (e.clientY - top - height / 2) / 25;
    cardRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    playSound('type');
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    playSound('click');
    
    try {
      const user = isLogin 
        ? await api.login(formData.email, formData.password)
        : await api.register(formData.username, formData.email, formData.password);
      
      playSound('success');
      onLogin(user);
    } catch (err: any) {
      playSound('error');
      setError(err.message || "Access Denied");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#030508] relative overflow-hidden font-sans perspective-1000">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .auth-card { transition: transform 0.1s ease-out; transform-style: preserve-3d; }
        .neon-input:focus ~ .neon-border { width: 100%; opacity: 1; }
        @keyframes scan-line { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
      `}</style>

      {/* DYNAMIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid Floor */}
        <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-[linear-gradient(rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)_scale(2)] origin-bottom opacity-20" />
        
        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Rotating Globe Wireframe Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full opacity-20 animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full opacity-30 animate-[spin_40s_linear_infinite_reverse]" />
      </div>

      {/* 3D AUTH CARD */}
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full max-w-sm z-10 auth-card"
      >
        <div className="text-center mb-8 relative">
          <div className="relative w-24 h-24 mx-auto mb-6 group cursor-pointer">
             <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-20" />
             <div className="absolute inset-0 bg-black/50 rounded-full border border-indigo-500/30 backdrop-blur-md" />
             <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-[spin_3s_linear_infinite]" />
             <div className="absolute inset-2 rounded-full border-b-2 border-cyan-400 animate-[spin_5s_linear_infinite_reverse]" />
             
             <div className="absolute inset-0 flex items-center justify-center text-indigo-400 group-hover:text-white transition-colors duration-500">
                <ShieldCheck className="w-10 h-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
             </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white tracking-[0.2em] mb-1 font-sans">ROCKHOUND</h1>
          <div className="flex items-center justify-center gap-3 text-[10px] text-cyan-500/70 font-mono tracking-widest uppercase">
            <span className="animate-pulse">●</span>
            <span>Secure Terminal</span>
            <span className="animate-pulse">●</span>
          </div>
        </div>

        {/* Glass Panel */}
        <div className="relative bg-[#0a0f18]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Holographic Scanline */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/50 shadow-[0_0_20px_#06b6d4] animate-[scan-line_3s_linear_infinite] pointer-events-none opacity-50" />
          
          {/* Tabs */}
          <div className="flex mb-8 bg-black/40 rounded-lg p-1 border border-white/5">
            <button 
                onClick={() => { playSound('click'); setIsLogin(true); setError(null); }} 
                className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded transition-all duration-300 ${isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Login
            </button>
            <button 
                onClick={() => { playSound('click'); setIsLogin(false); setError(null); }} 
                className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded transition-all duration-300 ${!isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                    type="text" 
                    required 
                    placeholder="OPERATOR ID" 
                    value={formData.username} 
                    onChange={e => handleChange(e, 'username')}
                    className="w-full bg-black/40 border border-gray-700/50 focus:border-indigo-500/50 text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all placeholder-gray-600 text-xs tracking-wider neon-input" 
                />
              </div>
            )}
            
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="email" 
                required 
                placeholder="UPLINK ADDRESS (EMAIL)" 
                value={formData.email} 
                onChange={e => handleChange(e, 'email')}
                className="w-full bg-black/40 border border-gray-700/50 focus:border-indigo-500/50 text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all placeholder-gray-600 text-xs tracking-wider neon-input" 
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="password" 
                required 
                placeholder="SECURITY KEY" 
                value={formData.password} 
                onChange={e => handleChange(e, 'password')}
                className="w-full bg-black/40 border border-gray-700/50 focus:border-indigo-500/50 text-white pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all placeholder-gray-600 text-xs tracking-wider neon-input" 
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 text-red-400 text-[10px] bg-red-900/10 p-3 rounded border border-red-500/20 uppercase tracking-wide animate-pulse">
                <AlertTriangle className="w-3 h-3 flex-none" />
                {error}
              </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading} 
                onMouseEnter={() => playSound('hover')}
                className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-3 mt-8 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Scan className="w-4 h-4 animate-spin text-cyan-200" />
                        <span className="text-xs uppercase tracking-[0.2em] text-cyan-100 animate-pulse">Scanning Bio-Data...</span>
                    </>
                ) : (
                    <>
                        {isLogin ? (
                            <>
                                <Fingerprint className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                                <span className="text-xs uppercase tracking-[0.2em]">Biometric Login</span>
                            </>
                        ) : (
                            <>
                                <Cpu className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                                <span className="text-xs uppercase tracking-[0.2em]">Initialize System</span>
                            </>
                        )}
                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </>
                )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center space-y-2">
            <p className="text-[9px] text-gray-600 font-mono flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" />
                ENCRYPTED CONNECTION ESTABLISHED
            </p>
            <p className="text-[8px] text-gray-700 font-mono">v4.5.0 // ROCKHOUND_CORP</p>
        </div>
      </div>
    </div>
  );
};