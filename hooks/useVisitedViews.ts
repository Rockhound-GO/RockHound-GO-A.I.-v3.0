import { useState, useEffect, useCallback } from 'react';

// Define the core modules that count towards "100% Completion"
const CORE_MODULES = [
  'SCANNER', 'COLLECTION', 'STATS', 'DETAILS', 
  'PROFILE', 'ADMIN', 'MAP', 'WEATHER', 'ACHIEVEMENTS'
];

export const useVisitedViews = () => {
  const [visitedViews, setVisitedViews] = useState<Set<string>>(new Set());
  const [explorationProgress, setExplorationProgress] = useState(0);

  // Initialize & Decrypt
  useEffect(() => {
    try {
      // 1. Check for new "Secure" storage
      const encryptedLog = localStorage.getItem('ROCKHOUND_NEURAL_MAP');
      
      // 2. Check for legacy storage (migration path)
      const legacyLog = localStorage.getItem('visited_views');
      
      let data: string[] = [];

      if (encryptedLog) {
        try {
          // Decrypt the logs
          data = JSON.parse(atob(encryptedLog));
        } catch (e) {
          console.warn("Neural Map data corruption detected. Re-initializing sector scan.");
        }
      } else if (legacyLog) {
        // Auto-Migrate old users to new system
        console.log("Migrating legacy exploration data...");
        data = JSON.parse(legacyLog);
        localStorage.setItem('ROCKHOUND_NEURAL_MAP', btoa(JSON.stringify(data)));
        localStorage.removeItem('visited_views'); // Purge old data
      }

      const set = new Set(data);
      setVisitedViews(set);
      calculateProgress(set);

    } catch (e) {
      console.warn("Sector tracking offline", e);
    }
  }, []);

  const calculateProgress = (set: Set<string>) => {
    // Only count unique CORE modules towards the percentage
    const discoveredCount = CORE_MODULES.filter(module => set.has(module)).length;
    const percent = Math.round((discoveredCount / CORE_MODULES.length) * 100);
    setExplorationProgress(percent);
  };

  const markViewVisited = useCallback((view: string) => {
    setVisitedViews(prev => {
      if (!prev.has(view)) {
        const newSet = new Set(prev);
        newSet.add(view);
        
        // "Secure" Save - Encode to Base64 to look cool in Application tab
        try {
          const array = Array.from(newSet);
          localStorage.setItem('ROCKHOUND_NEURAL_MAP', btoa(JSON.stringify(array)));
        } catch (e) {
          console.error("Failed to archive sector data", e);
        }
        
        calculateProgress(newSet);
        return newSet;
      }
      return prev;
    });
  }, []);

  const resetExplorationData = useCallback(() => {
    localStorage.removeItem('ROCKHOUND_NEURAL_MAP');
    setVisitedViews(new Set());
    setExplorationProgress(0);
  }, []);

  return { 
    visitedViews, 
    markViewVisited, 
    explorationProgress, // New: Use this to show a "World Discovered %" on the profile!
    resetExplorationData 
  };
};