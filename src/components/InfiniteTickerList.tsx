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
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [totalHeight, setTotalHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(300);

  // Measure the actual rendered height of the first copy
  useEffect(() => {
    if (!innerRef.current) return;
    const rows = innerRef.current.querySelectorAll('[data-ticker-row]');
    if (rows.length === 0) return;

    // First half of rows = original data
    const halfCount = Math.min(data.length, rows.length);
    let total = 0;
    let visibleH = 0;
    for (let i = 0; i < halfCount; i++) {
      const h = (rows[i] as HTMLElement).offsetHeight;
      total += h;
      if (i < visibleCount) visibleH += h;
    }
    setTotalHeight(total);
    setContainerHeight(visibleH);
  }, [data, visibleCount]);

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
          <div key={i} data-ticker-row>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden relative"
      style={{ height: containerHeight || 'auto' }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 z-10 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-card to-transparent" />

      <div
        ref={innerRef}
        className="ticker-scroll"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          '--ticker-distance': `-${totalHeight}px`,
        } as React.CSSProperties}
      >
        {data.map((item, i) => (
          <div key={`a-${i}`} data-ticker-row>{renderRow(item, i)}</div>
        ))}
        {data.map((item, i) => (
          <div key={`b-${i}`} data-ticker-row>{renderRow(item, i)}</div>
        ))}
      </div>
    </div>
  );
}
