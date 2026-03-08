import { ReactNode, useState, useCallback } from 'react';

interface InfiniteTickerListProps {
  data: any[];
  visibleCount: number;
  renderRow: (item: any, index: number) => ReactNode;
  durationPerItem?: number;
  isPaused?: boolean;
  rowHeightEstimate?: number;
}

export default function InfiniteTickerList({
  data,
  visibleCount,
  renderRow,
  durationPerItem = 3,
  isPaused = false,
  rowHeightEstimate = 80,
}: InfiniteTickerListProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [firstCopyHeight, setFirstCopyHeight] = useState(0);

  const firstCopyCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Use rAF to ensure layout is complete
      requestAnimationFrame(() => {
        const h = node.scrollHeight;
        if (h > 0) setFirstCopyHeight(h);
      });
    }
  }, [data]);

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

  const containerHeight = visibleCount * rowHeightEstimate;
  const scrollDistance = firstCopyHeight || (data.length * rowHeightEstimate);

  return (
    <div
      className="overflow-hidden relative"
      style={{ height: containerHeight }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-3 z-10 bg-gradient-to-b from-card to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-card to-transparent" />

      <div
        className="ticker-scroll"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          '--ticker-distance': `-${scrollDistance}px`,
        } as React.CSSProperties}
      >
        <div ref={firstCopyCallback}>
          {data.map((item, i) => (
            <div key={`a-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
        <div aria-hidden="true">
          {data.map((item, i) => (
            <div key={`b-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
