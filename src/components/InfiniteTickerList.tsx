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
  const [totalH, setTotalH] = useState(0);
  const [visibleH, setVisibleH] = useState(0);

  // Use ResizeObserver to measure the first copy
  useEffect(() => {
    const el = firstCopyRef.current;
    if (!el) return;

    const doMeasure = () => {
      const children = Array.from(el.children);
      if (children.length === 0) return;
      let total = 0;
      let visible = 0;
      children.forEach((child, i) => {
        const h = (child as HTMLElement).getBoundingClientRect().height;
        total += h;
        if (i < visibleCount) visible += h;
      });
      if (total > 0) {
        setTotalH(total);
        setVisibleH(visible);
      }
    };

    const observer = new ResizeObserver(doMeasure);
    observer.observe(el);
    doMeasure();

    return () => observer.disconnect();
  }, [data, visibleCount]);

  const paused = isPaused || isHovered;
  const duration = data.length * durationPerItem;
  const isReady = totalH > 0 && visibleH > 0 && data.length > visibleCount;

  const handlePause = useCallback(() => setIsHovered(true), []);
  const handleResume = useCallback(() => setIsHovered(false), []);

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Belum ada data</p>;
  }

  if (data.length <= visibleCount) {
    return (
      <div ref={firstCopyRef}>
        {data.map((item, i) => (
          <div key={i}>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden relative"
      style={isReady ? { height: visibleH } : undefined}
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
          '--ticker-distance': `-${totalH}px`,
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
