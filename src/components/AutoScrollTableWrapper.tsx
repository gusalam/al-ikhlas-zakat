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
 * Running list: shows `visibleCount` rows starting from `offset`, wrapping around.
 * Each row fades in smoothly when it appears.
 */
export default function AutoScrollTableWrapper({
  data,
  offset,
  visibleCount,
  onPause,
  onResume,
  renderRow,
}: RunningListWrapperProps) {
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
      {visibleRows.map(({ item, originalIndex }) => renderRow(item, originalIndex))}
    </div>
  );
}
