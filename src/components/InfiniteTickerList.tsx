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
  const firstCopyRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [measured, setMeasured] = useState<{ totalH: number; visibleH: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!firstCopyRef.current) return;
      const rows = firstCopyRef.current.children;
      if (rows.length === 0) return;

      let totalH = 0;
      let visibleH = 0;
      for (let i = 0; i < rows.length; i++) {
        const h = (rows[i] as HTMLElement).getBoundingClientRect().height;
        totalH += h;
        if (i < visibleCount) visibleH += h;
      }
      setMeasured({ totalH, visibleH });
    };

    // Measure after a frame to ensure layout is complete
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(raf);
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
          <div key={i}>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  const containerHeight = measured?.visibleH;
  const totalHeight = measured?.totalH || 0;

  return (
    <div
      ref={containerRef}
      className="overflow-hidden relative"
      style={{ height: containerHeight ? containerHeight : 'auto' }}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      {measured && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-3 z-10 bg-gradient-to-b from-card to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 z-10 bg-gradient-to-t from-card to-transparent" />
        </>
      )}

      <div
        className={measured ? 'ticker-scroll' : ''}
        style={measured ? {
          animationDuration: `${duration}s`,
          animationPlayState: paused ? 'paused' : 'running',
          '--ticker-distance': `-${totalHeight}px`,
        } as React.CSSProperties : undefined}
      >
        <div ref={firstCopyRef}>
          {data.map((item, i) => (
            <div key={`a-${i}`}>{renderRow(item, i)}</div>
          ))}
        </div>
        {measured && (
          <div>
            {data.map((item, i) => (
              <div key={`b-${i}`}>{renderRow(item, i)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
