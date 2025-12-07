

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, ScanFace, AlertTriangle, ShieldCheck } from 'lucide-react';
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
      setError(err.message || "Access Denied");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-[#030712] relative overflow-hidden font-mono`}>
      {/* Moving Grid Background */}
      <div className={`absolute inset-0 z-0 bg-[linear-gradient(rgba(99,102,241,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 animate-[pulse_8s_ease-in-out_infinite]`} />
      
      <div className={`w-full max-w-sm z-10 relative`}>
        <div className={`text-center mb-12`}>
          <div className={`w-24 h-24 mx-auto mb-8 relative flex items-center justify-center group`}>
             <div className={`absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-20`} />
             <div className={`absolute inset-0 bg-indigo-500/5 rounded-full border border-indigo-500/30 backdrop-blur-sm`} />
             <div className={`absolute inset-0 rounded-full border-t border-indigo-400/50 animate-[spin_4s_linear_infinite]`} />
             <ShieldCheck className={`w-10 h-10 text-indigo-400 relative z-10 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]`} />
          </div>
          <h1 className={`text-3xl font-bold text-white tracking-[0.3em] mb-2 font-sans`}>ROCKHOUND</h1>
          <div className={`flex items-center justify-center gap-2`}>
            <div className={`h-[1px] w-8 bg-indigo-500/50`} />
            <p className={`text-indigo-400 text-[10px] tracking-[0.2em] uppercase`}>Secure Terminal Access</p>
            <div className={`h-[1px] w-8 bg-indigo-500/50`} />
          </div>
        </div>

        <div className={`glass-panel p-1 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl`}>
          <div className={`bg-[#030712]/80 rounded-xl p-8`}>
            <div className={`flex mb-8 border-b border-white/5`}>
                <button onClick={() => setIsLogin(true)} className={`flex-1 pb-3 text-[10px] uppercase tracking-[0.2em] transition-all relative ${isLogin ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}>
                    Access
                    {isLogin && <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-indigo-500 shadow-[0_0_10px_#6366f1]`} />}
                </button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 pb-3 text-[10px] uppercase tracking-[0.2em] transition-all relative ${!isLogin ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}>
                    Register
                    {!isLogin && <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-indigo-500 shadow-[0_0_10px_#6366f1]`} />}
                </button>
            </div>

            <form onSubmit={handleSubmit} className={`space-y-5`}>
                {!isLogin && (
                <div className={`group relative`}>
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors`} />
                    <input type="text" required placeholder="CODENAME" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                    className={`w-full bg-gray-900/50 border border-gray-700 focus:border-indigo-500 text-white pl-12 pr-4 py-3.5 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]`} />
                </div>
                )}
                <div className={`group relative`}>
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors`} />
                <input type="email" required placeholder="COMM_LINK (EMAIL)" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className={`w-full bg-gray-900/50 border border-gray-700 focus:border-indigo-500 text-white pl-12 pr-4 py-3.5 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]`} />
                </div>
                <div className={`group relative`}>
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-indigo-400 transition-colors`} />
                <input type="password" required placeholder="PASSCODE" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className={`w-full bg-gray-900/50 border border-gray-700 focus:border-indigo-500 text-white pl-12 pr-4 py-3.5 rounded-lg outline-none transition-all placeholder-gray-600 text-xs tracking-wider focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]`} />
                </div>

                {error && (
                <div className={`flex items-center gap-3 text-red-400 text-[10px] bg-red-900/10 p-3 rounded border border-red-500/20 uppercase tracking-wide`}>
                    <AlertTriangle className={`w-3 h-3 flex-none`} />
                    {error}
                </div>
                )}

                <button type="submit" disabled={isLoading} className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-2 mt-8 uppercase tracking-[0.15em] text-xs group`}>
                {isLoading ? <Loader2 className={`w-4 h-4 animate-spin`} /> : <>{isLogin ? 'Authenticate' : 'Initialize'} <ArrowRight className={`w-3 h-3 group-hover:translate-x-1 transition-transform`} /></>}
                </button>
            </form>
          </div>
        </div>
        <div className={`mt-8 text-center`}>
            <p className={`text-[9px] text-gray-600 font-mono`}>SECURE CONNECTION ESTABLISHED v4.0.2</p>
        </div>
      </div>
    </div>
  );
};