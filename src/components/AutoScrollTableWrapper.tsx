import { ReactNode } from 'react';

interface AutoScrollTableWrapperProps {
  children: ReactNode;
  onPause: () => void;
  onResume: () => void;
  isScrolling: boolean;
  totalItems: number;
  scrollIndex: number;
  visibleItems: number;
}

export default function AutoScrollTableWrapper({
  children,
  onPause,
  onResume,
  isScrolling,
  totalItems,
  scrollIndex,
  visibleItems,
}: AutoScrollTableWrapperProps) {
  const maxIndex = Math.max(0, totalItems - visibleItems);
  const progress = maxIndex > 0 ? (scrollIndex / maxIndex) * 100 : 0;

  return (
    <div className="relative">
      {/* Touch/mouse pause area */}
      <div
        onMouseDown={onPause}
        onMouseUp={onResume}
        onMouseLeave={onResume}
        onTouchStart={onPause}
        onTouchEnd={onResume}
        className="select-none"
      >
        <div className="transition-all duration-700 ease-in-out">
          {children}
        </div>
      </div>

      {/* Scroll indicator */}
      {totalItems > visibleItems && (
        <div className="flex items-center gap-2 mt-2 px-1">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full transition-all duration-700 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {isScrolling ? '▶ Auto' : '⏸ Pause'} · {scrollIndex + 1}–{Math.min(scrollIndex + visibleItems, totalItems)}/{totalItems}
          </span>
        </div>
      )}
    </div>
  );
}
