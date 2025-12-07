
import { useState, useEffect, useCallback } from 'react';

export const useVisitedViews = () => {
  const [visitedViews, setVisitedViews] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem('visited_views');
    if (stored) {
      try {
        setVisitedViews(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse visited views', e);
      }
    }
  }, []);

  const markViewVisited = useCallback((view: string) => {
    setVisitedViews(prev => {
      const next = new Set(prev);
      if (!next.has(view)) {
        next.add(view);
        localStorage.setItem('visited_views', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  }, []);

  return { visitedViews, markViewVisited };
};
