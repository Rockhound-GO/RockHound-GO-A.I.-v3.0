

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Cloud } from 'lucide-react';

interface SyncStatusProps {
  isSyncing: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ isSyncing }) => {
  const [showSaved, setShowSaved] = useState(false);
  const prevIsSyncing = usePrevious(isSyncing);

  useEffect(() => {
    // If we just finished syncing (went from true to false)
    if (prevIsSyncing && !isSyncing) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000); // Show "Saved" message for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isSyncing, prevIsSyncing]);

  const getStatusContent = () => {
    if (isSyncing) {
      return {
        icon: <Loader2 className={`w-4 h-4 text-indigo-400 animate-spin`} />,
        text: 'Syncing...',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-900/30'
      };
    }
    if (showSaved) {
      return {
        icon: <CheckCircle className={`w-4 h-4 text-green-400`} />,
        text: 'Saved',
        color: 'text-green-400',
        bgColor: 'bg-green-900/30'
      };
    }
    return {
      icon: <Cloud className={`w-4 h-4 text-gray-500`} />,
      text: 'Synced',
      color: 'text-gray-500',
      bgColor: 'bg-gray-800'
    };
  };

  const { icon, text, color, bgColor } = getStatusContent();

  return (
    <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-full border border-gray-700 transition-all duration-300 ${color} ${bgColor}`}>
      {icon}
      <span className={`hidden sm:inline`}>{text}</span>
    </div>
  );
};

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}