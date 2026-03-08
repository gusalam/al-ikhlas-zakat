import { ReactNode, useMemo } from 'react';

interface RunningListWrapperProps {
  data: any[];
  offset: number;
  visibleCount: number;
  onPause: () => void;
  onResume: () => void;
  renderRow: (item: any, index: number) => ReactNode;
}

/**
 * Displays `visibleCount` rows starting from `offset`, wrapping around.
 * Uses CSS transition for smooth slide effect.
 */
export default function AutoScrollTableWrapper({
  data,
  offset,
  visibleCount,
  onPause,
  onResume,
  renderRow,
}: RunningListWrapperProps) {
  // Build the visible window with wrap-around
  const visibleRows = useMemo(() => {
    if (data.length === 0) return [];
    const rows: { item: any; originalIndex: number }[] = [];
    for (let i = 0; i < Math.min(visibleCount, data.length); i++) {
      const idx = (offset + i) % data.length;
      rows.push({ item: data[idx], originalIndex: idx });
    }
    return rows;
  }, [data, offset, visibleCount]);

  return (
    <div
      onMouseDown={onPause}
      onMouseUp={onResume}
      onMouseLeave={onResume}
      onTouchStart={onPause}
      onTouchEnd={onResume}
      className="select-none"
    >
      {visibleRows.map(({ item, originalIndex }) => (
        <div
          key={`row-${originalIndex}`}
          className="animate-fade-in"
          style={{ animationDuration: '0.6s' }}
        >
          {renderRow(item, originalIndex)}
        </div>
      ))}
    </div>
  );
}
