import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, api } from '../services/api';
import { Camera, Edit2, Save, X, User as UserIcon, Mail, Calendar, Upload, PlayCircle, Shield, Award, Zap, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

// -- AUDIO ENGINE (Local) --
const useProfileSound = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'hover' | 'click' | 'success' | 'save') => {
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
        case 'hover':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'click':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'save':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.3);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'success':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
  }, []);

  return playSound;
};

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onReplayIntro?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onBack, onReplayIntro }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ username: user.username, email: user.email });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playSound = useProfileSound();
  
  // 3D Physics State
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Calculate rotation based on mouse position relative to center
    const rotateY = (x / rect.width) * 20; // Max 20deg
    const rotateX = -(y / rect.height) * 20;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error("Fields cannot be empty");
      return;
    }
    setIsSaving(true);
    playSound('save');
    try {
      const updated = await api.updateProfile(formData);
      onUpdateUser(updated);
      setIsEditing(false);
      playSound('success');
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error("Image too large (max 2MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const updated = await api.updateProfile({ avatarUrl: base64 });
          onUpdateUser(updated);
          playSound('success');
          toast.success("Avatar updated!");
        } catch { toast.error("Failed to update avatar"); }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-[#050a10] overflow-hidden relative font-sans perspective-1000">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .id-card { transform-style: preserve-3d; transition: transform 0.1s ease-out; }
        .bg-hex-grid { background-image: radial-gradient(rgba(99, 102, 241, 0.1) 2px, transparent 2px); background-size: 30px 30px; }
        @keyframes float-badge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>

      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-hex-grid pointer-events-none opacity-30" />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-6">
        <h2 className="text-2xl font-bold text-white tracking-widest font-mono flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-500" />
            OPERATOR_ID
        </h2>
        <button 
            onClick={() => { playSound('click'); onBack(); }}
            onMouseEnter={() => playSound('hover')} 
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        
        {/* 3D Holographic ID Card */}
        <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-sm bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl id-card group"
            style={{ transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` }}
        >
            <div className="bg-[#0a0f18] rounded-[1.3rem] overflow-hidden relative border border-white/5 h-full">
                {/* Holographic Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20" />
                
                {/* Lanyard Hole */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-800 rounded-full z-20 shadow-inner" />

                {/* Card Header */}
                <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0f18] to-transparent" />
                </div>

                {/* Avatar */}
                <div className="relative -mt-16 flex justify-center z-10">
                    <div 
                        onClick={() => { playSound('click'); fileInputRef.current?.click(); }}
                        className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-br from-cyan-400 to-indigo-600 cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-indigo-500/30"
                    >
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 relative border-4 border-[#0a0f18]">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-3xl">{user.username[0]}</div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-indigo-500 rounded-full p-2 border-4 border-[#0a0f18]">
                            <Upload className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                {/* User Details */}
                <div className="text-center mt-4 px-6 pb-8">
                    <h1 className="text-2xl font-bold text-white tracking-wide">{user.username}</h1>
                    <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-1">Class {Math.ceil(user.level / 5)} Operative</p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                            <Award className="w-5 h-5 text-yellow-400 mb-1" />
                            <span className="text-lg font-bold text-white">{user.level}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Rank</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                            <Zap className="w-5 h-5 text-cyan-400 mb-1" />
                            <span className="text-lg font-bold text-white">{user.xp}</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">XP</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                            <Activity className="w-5 h-5 text-emerald-400 mb-1" />
                            <span className="text-lg font-bold text-white">ACTIVE</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">Status</span>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="mt-8 space-y-4 text-left">
                        <div className="group/field relative">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Codename</label>
                            <div className="relative mt-1">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover/field:text-indigo-400 transition-colors" />
                                <input 
                                    type="text" 
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    disabled={!isEditing}
                                    className={`w-full bg-black/40 border ${isEditing ? 'border-indigo-500/50 focus:border-indigo-400' : 'border-white/5'} rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none transition-all`}
                                />
                            </div>
                        </div>

                        <div className="group/field relative">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Uplink Address</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover/field:text-indigo-400 transition-colors" />
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    disabled={!isEditing}
                                    className={`w-full bg-black/40 border ${isEditing ? 'border-indigo-500/50 focus:border-indigo-400' : 'border-white/5'} rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none transition-all`}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pl-1 mt-2">
                            <Calendar className="w-3 h-3 text-gray-600" />
                            <span className="text-[10px] text-gray-600 font-mono">ENLISTED: {formatDate(user.createdAt)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                        {!isEditing ? (
                            <button 
                                onClick={() => { playSound('click'); setIsEditing(true); }}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                <Edit2 className="w-4 h-4 text-gray-400 group-hover/btn:text-white" /> Modify Data
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => { playSound('click'); setIsEditing(false); setFormData({ username: user.username, email: user.email }); }}
                                    className="flex-1 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? 'Uploading...' : <><Save className="w-4 h-4" /> Save</>}
                                </button>
                            </>
                        )}
                    </div>
                    
                    {onReplayIntro && (
                        <button 
                            onClick={() => { playSound('click'); onReplayIntro(); }}
                            className="mt-4 w-full py-3 bg-transparent border border-dashed border-gray-700 hover:border-emerald-500/50 rounded-xl text-[10px] font-mono text-gray-500 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 group/replay"
                        >
                            <PlayCircle className="w-3 h-3 group-hover/replay:text-emerald-400 transition-colors" /> REBOOT_TUTORIAL_SEQ.EXE
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};