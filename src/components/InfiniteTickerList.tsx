import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';

interface InfiniteTickerListProps {
  data: any[];
  visibleCount: number;
  renderRow: (item: any, index: number) => ReactNode;
  rowHeight?: number;
  durationPerItem?: number; // seconds per item scroll
  isPaused?: boolean;
}

/**
 * Infinite vertical ticker: duplicates the list and uses CSS animation
 * to scroll continuously. When the first copy scrolls out, it loops seamlessly.
 */
export default function InfiniteTickerList({
  data,
  visibleCount,
  renderRow,
  rowHeight = 56,
  durationPerItem = 3,
  isPaused = false,
}: InfiniteTickerListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(rowHeight);

  // Measure actual row height
  useEffect(() => {
    if (containerRef.current) {
      const firstRow = containerRef.current.querySelector('[data-ticker-row]') as HTMLElement;
      if (firstRow) {
        setMeasuredRowHeight(firstRow.offsetHeight);
      }
    }
  }, [data]);

  const paused = isPaused || isHovered;
  const totalHeight = data.length * measuredRowHeight;
  const duration = data.length * durationPerItem;
  const containerHeight = visibleCount * measuredRowHeight;

  const handlePause = useCallback(() => setIsHovered(true), []);
  const handleResume = useCallback(() => setIsHovered(false), []);

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Belum ada data</p>;
  }

  // If data fits in visible area, no animation needed
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
      style={{ height: containerHeight }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      {/* Gradient fade top & bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-4 z-10 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 z-10 bg-gradient-to-t from-card to-transparent" />

      <div
        className="ticker-scroll"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          // We scroll by exactly totalHeight (one full copy)
          '--ticker-distance': `-${totalHeight}px`,
        } as React.CSSProperties}
      >
        {/* First copy */}
        {data.map((item, i) => (
          <div key={`a-${i}`} data-ticker-row>{renderRow(item, i)}</div>
        ))}
        {/* Second copy for seamless loop */}
        {data.map((item, i) => (
          <div key={`b-${i}`} data-ticker-row>{renderRow(item, i)}</div>
        ))}
      </div>
    </div>
  );
}
