
import React, { useState, useRef } from 'react';
import { User, api, Badge } from '../services/api';
import { Camera, Edit2, Save, X, User as UserIcon, Mail, Upload, PlayCircle, Shield, Award, Hexagon, Flame, Layers, Mountain, Diamond, Star, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onReplayIntro?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onBack, onReplayIntro }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error("Fields cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateProfile(formData);
      onUpdateUser(updated);
      setIsEditing(false);
      toast.success("Profile updated!", { className: 'glass-panel text-green-400 border-green-500/30' });
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile", { className: 'glass-panel text-red-400 border-red-500/30' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large (max 2MB)", { className: 'glass-panel text-amber-400 border-amber-500/30' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const updated = await api.updateProfile({ avatarUrl: base64 });
          onUpdateUser(updated);
          toast.success("Avatar updated!", { className: 'glass-panel text-green-400 border-green-500/30' });
        } catch (e: any) {
          toast.error("Failed to update avatar");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getBadgeIcon = (iconName: string) => {
      switch(iconName) {
          case 'Flag': return Flag;
          case 'Flame': return Flame;
          case 'Layers': return Layers;
          case 'Mountain': return Mountain;
          case 'Diamond': return Diamond;
          case 'Star': return Star;
          default: return Award;
      }
  };

  return (
    <div className={`h-full flex flex-col bg-[#030712] overflow-y-auto no-scrollbar`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-800/50 bg-[#030712]/80 backdrop-blur sticky top-0 z-10`}>
        <h2 className={`text-xl font-bold text-white uppercase tracking-widest text-glow`}>Operative Profile</h2>
        <button onClick={onBack} className={`p-2 rounded-full text-gray-400 hover:bg-white/5 transition-colors`}>
          <X className={`w-5 h-5`} />
        </button>
      </div>

      <div className={`p-6 space-y-8 pb-20`}>
        
        {/* Avatar Section */}
        <div className={`flex flex-col items-center`}>
          <div className={`relative group cursor-pointer`} onClick={() => fileInputRef.current?.click()}>
            <div className={`relative`}>
               {/* Animated Rings */}
               <div className={`absolute -inset-4 border border-cyan-500/20 rounded-full animate-spin-slow`} />
               <div className={`absolute -inset-2 border border-indigo-500/20 rounded-full animate-spin-reverse`} />

               <div className={`w-32 h-32 rounded-full overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] relative bg-gray-900 z-10`}>
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className={`w-full h-full object-cover`} />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-cyan-900`}>
                        <span className={`text-4xl font-bold text-white/50 font-mono`}>{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                )}
                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm`}>
                    <Camera className={`w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]`} />
                </div>
               </div>
            </div>
            <div className={`absolute bottom-0 right-0 p-2.5 bg-gray-900 rounded-full border border-cyan-500 text-cyan-400 shadow-lg z-20 group-hover:scale-110 transition-transform`}>
              <Upload className={`w-4 h-4`} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className={`hidden`} 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          <div className={`mt-6 text-center`}>
             <h1 className={`text-2xl font-bold text-white tracking-tight`}>{user.username}</h1>
             <p className={`text-xs text-cyan-500 uppercase tracking-[0.2em] font-medium`}>Level {user.level} Operative</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-3 gap-3`}>
          <div className={`glass-panel p-3 rounded-xl text-center border-t-2 border-t-indigo-500`}>
            <div className={`text-2xl font-bold text-white`}>{user.level}</div>
            <div className={`text-[9px] uppercase text-indigo-400 font-bold tracking-widest mt-1`}>Rank</div>
          </div>
          <div className={`glass-panel p-3 rounded-xl text-center border-t-2 border-t-purple-500`}>
            <div className={`text-2xl font-bold text-white`}>{user.xp}</div>
            <div className={`text-[9px] uppercase text-purple-400 font-bold tracking-widest mt-1`}>XP</div>
          </div>
          <div className={`glass-panel p-3 rounded-xl text-center border-t-2 border-t-emerald-500`}>
             <div className={`text-lg font-bold text-white pt-1`}>
                {formatDate(user.createdAt).split(' ').slice(-1)[0]}
             </div>
             <div className={`text-[9px] uppercase text-emerald-400 font-bold tracking-widest mt-1`}>Active Since</div>
          </div>
        </div>

        {/* Badges Section */}
        <div className={`space-y-3`}>
            <h3 className={`text-xs font-bold text-gray-500 uppercase tracking-widest pl-1`}>Service Badges</h3>
            <div className={`glass-panel p-4 rounded-xl grid grid-cols-4 gap-4`}>
                {(user.badges || []).length === 0 ? (
                    <div className="col-span-4 text-center text-[10px] text-gray-500 italic py-4">No badges earned yet.</div>
                ) : (
                    user.badges?.map((badge) => {
                        const Icon = getBadgeIcon(badge.icon);
                        return (
                            <div key={badge.id} className={`flex flex-col items-center gap-2 group`}>
                                <div className={`w-12 h-12 rounded-lg bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(99,102,241,0.2)]`}>
                                    <Icon className={`w-6 h-6 text-indigo-400`} />
                                </div>
                                <span className={`text-[8px] text-gray-400 uppercase text-center w-full truncate group-hover:text-white transition-colors`}>{badge.name}</span>
                            </div>
                        );
                    })
                )}

                {/* Empty slots placeholders if few badges */}
                {[...Array(Math.max(0, 4 - (user.badges?.length || 0)))].map((_, i) => (
                    <div key={`empty-${i}`} className={`flex flex-col items-center gap-2 opacity-20 grayscale`}>
                        <div className={`w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center`}>
                            <Hexagon className={`w-6 h-6 text-gray-600`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Info Form */}
        <div className={`glass-panel p-6 rounded-2xl relative overflow-hidden`}>
          <div className={`absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-10 -mt-10 pointer-events-none`} />

          <div className={`flex items-center justify-between mb-6 relative z-10`}>
            <h3 className={`text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2`}>
                <UserIcon className={`w-4 h-4 text-cyan-500`} /> Clearance Data
            </h3>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-1 text-[10px] text-cyan-400 hover:text-white font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-cyan-900/20 border border-cyan-500/30 hover:bg-cyan-900/40 transition-colors`}
              >
                <Edit2 className={`w-3 h-3`} /> Update
              </button>
            )}
          </div>

          <div className={`space-y-5 relative z-10`}>
            <div className={`space-y-1.5`}>
              <label className={`text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1`}>Codename</label>
              <div className={`relative group`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none`} />
                <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4`} />
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-black/40 border ${isEditing ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-white/5'} text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all disabled:text-gray-300 font-mono text-sm`}
                />
              </div>
            </div>

            <div className={`space-y-1.5`}>
              <label className={`text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1`}>Comm Link</label>
              <div className={`relative group`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none`} />
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4`} />
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-black/40 border ${isEditing ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-white/5'} text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all disabled:text-gray-300 font-mono text-sm`}
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className={`flex gap-3 pt-6 animate-in fade-in slide-in-from-top-2`}>
              <button 
                onClick={() => {
                  setFormData({ username: user.username, email: user.email });
                  setIsEditing(false);
                }}
                className={`flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-gray-700 transition-colors border border-gray-700`}
                disabled={isSaving}
              >
                Abort
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 py-3 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 text-xs font-bold uppercase tracking-wider hover:bg-cyan-600/30 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]`}
              >
                {isSaving ? 'Processing...' : <><Save className={`w-4 h-4`} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        {/* Debug / Replay Section */}
        {onReplayIntro && (
            <div className={`glass-panel p-6 rounded-2xl border border-emerald-500/20`}>
                 <h3 className={`text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2`}>
                    <Shield className={`w-4 h-4`} /> System Utilities
                 </h3>
                 <button 
                    onClick={onReplayIntro}
                    className={`w-full py-3 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2`}
                  >
                    <PlayCircle className={`w-5 h-5`} /> Reinitialize AI Intro
                  </button>
                  <p className={`text-center text-[10px] text-gray-600 mt-2 uppercase tracking-wide`}>Resets Clover Cole interaction sequence.</p>
            </div>
        )}
      </div>
    </div>
  );
};