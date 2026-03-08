import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ZakatStats {
  totalFitrah: number;
  totalMal: number;
  totalInfaq: number;
  totalFidyah: number;
  totalZakat: number;
  totalBeras: number;
  totalMuzakki: number;
  totalMustahik: number;
  totalZakatCount: number;
  totalMustahikCount: number;
}

const defaultStats: ZakatStats = {
  totalFitrah: 0, totalMal: 0, totalInfaq: 0, totalFidyah: 0,
  totalZakat: 0, totalBeras: 0, totalMuzakki: 0, totalMustahik: 0,
  totalZakatCount: 0, totalMustahikCount: 0,
};

export function useZakatStats() {
  const [stats, setStats] = useState<ZakatStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params._start_date = startDate;
    if (endDate) params._end_date = endDate;

    const hasFilter = startDate || endDate;
    const { data, error } = hasFilter
      ? await supabase.rpc('get_zakat_stats_filtered', params as any)
      : await supabase.rpc('get_zakat_stats');

    if (error || !data) {
      console.error('Failed to fetch stats:', error);
      return;
    }
    const d = data as any;
    setStats({
      totalFitrah: Number(d.total_fitrah) || 0,
      totalMal: Number(d.total_mal) || 0,
      totalInfaq: Number(d.total_infaq) || 0,
      totalFidyah: Number(d.total_fidyah) || 0,
      totalZakat: Number(d.total_zakat) || 0,
      totalBeras: Number(d.total_beras) || 0,
      totalMuzakki: Number(d.total_muzakki) || 0,
      totalMustahik: Number(d.total_mustahik) || 0,
      totalDistribusi: Number(d.total_distribusi) || 0,
      saldoZakat: Number(d.total_zakat) - Number(d.total_distribusi),
      totalZakatCount: Number(d.total_zakat_count) || 0,
      totalDistribusiCount: Number(d.total_distribusi_count) || 0,
      totalMustahikCount: Number(d.total_mustahik_count) || 0,
    });
    setLoading(false);
  }, []);

  return { stats, loading, fetchStats };
}
