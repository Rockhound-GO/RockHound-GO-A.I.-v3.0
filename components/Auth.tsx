
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, ShieldCheck, Fingerprint, ScanEye, KeyRound } from 'lucide-react';
import { api } from '../services/api';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = isLogin 
        ? await api.login(formData.email, formData.password)
        : await api.register(formData.username, formData.email, formData.password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "BIOMETRIC MISMATCH");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden font-mono">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-cyan-900/10 via-transparent to-black" />
          <div className="scanline" />
      </div>
      
      <div className="w-full max-w-sm z-10 relative">
        <div className="text-center mb-10">
          <div className="w-32 h-32 mx-auto mb-6 relative flex items-center justify-center">
             {/* Security Ring Animation */}
             <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-[spin_8s_linear_infinite]" />
             <div className="absolute inset-2 border-2 border-dashed border-indigo-500/30 rounded-full animate-[spin_12s_linear_infinite_reverse]" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <ShieldCheck className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
             </div>
             {/* Scanner Beam */}
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent w-full h-1 animate-[scan_2s_ease-in-out_infinite] opacity-50" />
          </div>

          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 tracking-[0.2em] mb-2 glitch" data-text="ROCKHOUND">
            ROCKHOUND
          </h1>
          <div className="inline-block px-3 py-1 border border-cyan-500/30 bg-cyan-900/10 rounded text-[10px] text-cyan-400 tracking-[0.3em] uppercase backdrop-blur-sm">
            Security Gate
          </div>
        </div>

        <div className="relative group perspective-1000">
          {/* Card Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition duration-500" />

          <div className="relative bg-black/80 border border-white/10 backdrop-blur-xl rounded-xl p-8 shadow-2xl">
            {/* Tabs */}
            <div className="flex mb-8 border-b border-white/5 pb-1">
                <button onClick={() => setIsLogin(true)} className={`flex-1 pb-2 text-[10px] uppercase tracking-[0.2em] transition-all relative ${isLogin ? 'text-cyan-400 font-bold' : 'text-gray-600 hover:text-gray-400'}`}>
                    Identity Verify
                    {isLogin && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
                </button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 pb-2 text-[10px] uppercase tracking-[0.2em] transition-all relative ${!isLogin ? 'text-cyan-400 font-bold' : 'text-gray-600 hover:text-gray-400'}`}>
                    New Operative
                    {!isLogin && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                        <User className="w-4 h-4" />
                    </div>
                    <input type="text" required placeholder="ASSIGNED CODENAME" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-800 focus:border-cyan-500/50 text-white pl-12 pr-4 py-4 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:bg-cyan-900/10" />
                </div>
                )}
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                        <Mail className="w-4 h-4" />
                    </div>
                    <input type="email" required placeholder="NEURAL LINK (EMAIL)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-800 focus:border-cyan-500/50 text-white pl-12 pr-4 py-4 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:bg-cyan-900/10" />
                </div>
                <div className="group relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                        <Lock className="w-4 h-4" />
                    </div>
                    <input type="password" required placeholder="ACCESS KEY" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-800 focus:border-cyan-500/50 text-white pl-12 pr-4 py-4 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:bg-cyan-900/10" />
                </div>

                {error && (
                <div className="flex items-center gap-3 text-red-400 text-[10px] bg-red-900/20 p-3 rounded border-l-2 border-red-500 uppercase tracking-wide animate-pulse">
                    <Fingerprint className="w-4 h-4 flex-none" />
                    {error}
                </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-cyan-700 to-indigo-700 hover:from-cyan-600 hover:to-indigo-600 text-white font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all flex items-center justify-center gap-3 mt-6 uppercase tracking-[0.15em] text-xs relative overflow-hidden group border border-white/10">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? <ScanEye className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />} <span className="relative z-10">{isLogin ? 'Authenticate' : 'Initialize Protocol'}</span> <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform relative z-10" /></>}
                </button>
            </form>
          </div>

          {/* Decorative Corner Markers */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-cyan-500/50 rounded-tl opacity-50" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-cyan-500/50 rounded-tr opacity-50" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-cyan-500/50 rounded-bl opacity-50" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-cyan-500/50 rounded-br opacity-50" />
        </div>

        <div className="mt-8 text-center opacity-40">
            <p className="text-[8px] text-cyan-500 font-mono tracking-widest uppercase">
                Biometric Encryption Active • Node {Math.floor(Math.random() * 9000) + 1000}
            </p>
        </div>
      </div>
    </div>
  );
};
