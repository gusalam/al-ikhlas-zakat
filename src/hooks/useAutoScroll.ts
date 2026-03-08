import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoScrollOptions {
  totalItems: number;
  visibleItems?: number;
  intervalMs?: number;
  isPaused?: boolean;
}

export function useAutoScroll({
  totalItems,
  visibleItems = 10,
  intervalMs = 3000,
  isPaused = false,
}: UseAutoScrollOptions) {
  const [scrollIndex, setScrollIndex] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();

  const maxIndex = Math.max(0, totalItems - visibleItems);
  const paused = isPaused || isUserPaused;

  // Reset scroll when items change significantly
  useEffect(() => {
    setScrollIndex(0);
  }, [totalItems]);

  useEffect(() => {
    if (paused || totalItems <= visibleItems) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setScrollIndex((prev) => {
        if (prev >= maxIndex) return 0; // loop
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(intervalRef.current);
  }, [paused, totalItems, visibleItems, intervalMs, maxIndex]);

  const pause = useCallback(() => setIsUserPaused(true), []);
  const resume = useCallback(() => setIsUserPaused(false), []);

  const visibleData = <T,>(data: T[]): T[] => {
    return data.slice(scrollIndex, scrollIndex + visibleItems);
  };

  return {
    scrollIndex,
    isUserPaused,
    pause,
    resume,
    visibleData,
    isScrolling: !paused && totalItems > visibleItems,
  };
}
