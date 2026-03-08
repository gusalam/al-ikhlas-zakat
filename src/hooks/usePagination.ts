import { useState, useCallback } from 'react';

const PAGE_SIZE = 50;

export function usePagination(initialPageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = initialPageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const goNext = useCallback(() => setPage(p => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);
  const goTo = useCallback((p: number) => setPage(p), []);
  const reset = useCallback(() => setPage(0), []);

  return { page, totalCount, setTotalCount, totalPages, from, to, pageSize, goNext, goPrev, goTo, reset };
}
