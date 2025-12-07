


import React, { useState, useRef } from 'react';
import { User, api } from '../services/api';
import { Camera, Edit2, Save, X, User as UserIcon, Mail, Calendar, Upload, PlayCircle } from 'lucide-react';
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
      // Check size (limit to 2MB for base64 safety in localStorage/db)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large (max 2MB)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          // Immediately upload/save avatar
          const updated = await api.updateProfile({ avatarUrl: base64 });
          onUpdateUser(updated);
          toast.success("Avatar updated!");
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

  return (
    <div className={`h-full flex flex-col bg-gray-900 overflow-y-auto no-scrollbar`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10`}>
        <h2 className={`text-xl font-bold text-white`}>Profile</h2>
        <button onClick={onBack} className={`p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors`}>
          <X className={`w-5 h-5`} />
        </button>
      </div>

      <div className={`p-6 space-y-8 pb-20`}>
        
        {/* Avatar Section */}
        <div className={`flex flex-col items-center`}>
          <div className={`relative group cursor-pointer`} onClick={() => fileInputRef.current?.click()}>
            <div className={`w-28 h-28 rounded-full overflow-hidden border-4 border-gray-800 shadow-xl relative bg-gray-800`}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className={`w-full h-full object-cover`} />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600`}>
                  <span className={`text-3xl font-bold text-white`}>{user.username.charAt(0).toUpperCase()}</span>
                </div>
              )}
              {/* Overlay on hover */}
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                <Camera className={`w-8 h-8 text-white/80`} />
              </div>
            </div>
            <div className={`absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full border-4 border-gray-900 shadow-lg`}>
              <Upload className={`w-4 h-4 text-white`} />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className={`hidden`} 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          <p className={`mt-4 text-gray-400 text-sm`}>Tap photo to change</p>
        </div>

        {/* Stats Summary */}
        <div className={`grid grid-cols-3 gap-3`}>
          <div className={`bg-gray-800/50 border border-gray-700 p-3 rounded-xl text-center`}>
            <div className={`text-2xl font-bold text-indigo-400`}>{user.level}</div>
            <div className={`text-[10px] uppercase text-gray-500 font-bold tracking-wider`}>Level</div>
          </div>
          <div className={`bg-gray-800/50 border border-gray-700 p-3 rounded-xl text-center`}>
            <div className={`text-2xl font-bold text-purple-400`}>{user.xp}</div>
            <div className={`text-[10px] uppercase text-gray-500 font-bold tracking-wider`}>Total XP</div>
          </div>
          <div className={`bg-gray-800/50 border border-gray-700 p-3 rounded-xl text-center`}>
             <div className={`text-2xl font-bold text-green-400`}>
                {formatDate(user.createdAt).split(' ').slice(-1)[0]}
             </div>
             <div className={`text-[10px] uppercase text-gray-500 font-bold tracking-wider`}>Member Since</div>
          </div>
        </div>

        {/* Info Form */}
        <div className={`space-y-4 bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50`}>
          <div className={`flex items-center justify-between mb-2`}>
            <h3 className={`text-lg font-semibold text-white`}>Personal Info</h3>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className={`flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 transition-colors`}
              >
                <Edit2 className={`w-3 h-3`} /> Edit
              </button>
            )}
          </div>

          <div className={`space-y-4`}>
            <div className={`space-y-1`}>
              <label className={`text-xs font-semibold text-gray-500 uppercase tracking-wide`}>Username</label>
              <div className={`relative`}>
                <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4`} />
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-gray-900 border ${isEditing ? 'border-gray-600 focus:border-indigo-500' : 'border-transparent'} text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all disabled:text-gray-400 disabled:bg-gray-900/50`}
                />
              </div>
            </div>

            <div className={`space-y-1`}>
              <label className={`text-xs font-semibold text-gray-500 uppercase tracking-wide`}>Email Address</label>
              <div className={`relative`}>
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4`} />
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-gray-900 border ${isEditing ? 'border-gray-600 focus:border-indigo-500' : 'border-transparent'} text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all disabled:text-gray-400 disabled:bg-gray-900/50`}
                />
              </div>
            </div>

            <div className={`space-y-1 pt-1`}>
              <label className={`text-xs font-semibold text-gray-500 uppercase tracking-wide`}>Joined</label>
              <div className={`relative`}>
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4`} />
                <div className={`w-full bg-gray-900/50 border border-transparent text-gray-400 pl-10 pr-4 py-2.5 rounded-xl`}>
                  {formatDate(user.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className={`flex gap-3 pt-4 animate-in fade-in slide-in-from-top-2`}>
              <button 
                onClick={() => {
                  setFormData({ username: user.username, email: user.email });
                  setIsEditing(false);
                }}
                className={`flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 font-semibold hover:bg-gray-600 transition-colors`}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20`}
              >
                {isSaving ? 'Saving...' : <><Save className={`w-4 h-4`} /> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        {/* Debug / Replay Section */}
        {onReplayIntro && (
            <div className={`bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50`}>
                 <h3 className={`text-lg font-semibold text-white mb-4`}>App Settings</h3>
                 <button 
                    onClick={onReplayIntro}
                    className={`w-full py-3 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold transition-colors flex items-center justify-center gap-2`}
                  >
                    <PlayCircle className={`w-5 h-5`} /> Replay Intro Sequence
                  </button>
                  <p className={`text-center text-xs text-gray-500 mt-2`}>Triggers the Clover Cole introduction animation.</p>
            </div>
        )}
      </div>
    </div>
  );
};