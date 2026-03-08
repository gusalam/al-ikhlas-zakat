import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';

interface InfiniteTickerListProps {
  data: any[];
  visibleCount: number;
  renderRow: (item: any, index: number) => ReactNode;
  durationPerItem?: number;
  isPaused?: boolean;
}

export default function InfiniteTickerList({
  data,
  visibleCount,
  renderRow,
  durationPerItem = 3,
  isPaused = false,
}: InfiniteTickerListProps) {
  const firstCopyRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [heights, setHeights] = useState<{ total: number; visible: number } | null>(null);

  const measure = useCallback(() => {
    const el = firstCopyRef.current;
    if (!el) return false;
    const children = el.children;
    if (children.length === 0) return false;
    let total = 0;
    let visible = 0;
    for (let i = 0; i < children.length; i++) {
      const h = (children[i] as HTMLElement).offsetHeight;
      total += h;
      if (i < visibleCount) visible += h;
    }
    if (total > 0 && visible > 0) {
      setHeights(prev => {
        if (prev && prev.total === total && prev.visible === visible) return prev;
        return { total, visible };
      });
      return true;
    }
    return false;
  }, [visibleCount]);

  // Reset heights when data changes, then re-measure
  useEffect(() => {
    setHeights(null);
  }, [data.length]);

  // Poll for measurement until successful
  useEffect(() => {
    if (heights !== null) return;
    if (data.length <= visibleCount) return;

    let attempts = 0;
    const maxAttempts = 20;
    
    const tryMeasure = () => {
      attempts++;
      if (measure() || attempts >= maxAttempts) return;
      timerId = setTimeout(tryMeasure, 100);
    };
    
    let timerId = setTimeout(tryMeasure, 50);
    return () => clearTimeout(timerId);
  }, [heights, data.length, visibleCount, measure]);

  const paused = isPaused || isHovered;
  const duration = data.length * durationPerItem;

  const handlePause = useCallback(() => setIsHovered(true), []);
  const handleResume = useCallback(() => setIsHovered(false), []);

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Belum ada data</p>;
  }

  if (data.length <= visibleCount) {
    return (
      <div>
        {data.map((item, i) => (
          <div key={i}>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  const isReady = heights !== null;

  return (
    <div
      className="overflow-hidden relative"
      style={{ height: isReady ? heights.visible : 'auto' }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      {isReady && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 z-10 bg-gradient-to-b from-card to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-card to-transparent" />
        </>
      )}

      <div
        className={isReady ? 'ticker-scroll' : ''}
        style={isReady ? {
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          '--ticker-distance': `-${heights.total}px`,
        } as React.CSSProperties : undefined}
      >
        <div ref={firstCopyRef}>
          {data.map((item, i) => (
            <div key={`a-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
        {isReady && (
          <div aria-hidden="true">
            {data.map((item, i) => (
              <div key={`b-${i}`}>{renderRow(item, i)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
