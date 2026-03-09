import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Users, Wheat } from 'lucide-react';
import { useZakatStats } from '@/hooks/useZakatStats';
import { useCountUp } from '@/hooks/useAnimationLoop';
import ZakatTrendChart from '@/components/ZakatTrendChart';

interface RtStat { nama_rt: string; total_muzakki: number; total_jiwa_fitrah: number; total_zakat: number; }

export default function PanitiaDashboard() {
  const { stats, fetchStats } = useZakatStats();
  const [rtStats, setRtStats] = useState<RtStat[]>([]);
  const [zakatTrend, setZakatTrend] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    await fetchStats();
    const [rtRes, trendRes] = await Promise.all([
      supabase.rpc('get_zakat_per_rt'),
      supabase.from('transaksi_zakat').select('tanggal, detail_zakat(jumlah_uang, jenis_zakat)').order('tanggal', { ascending: true }),
    ]);
    setRtStats((rtRes.data as unknown as RtStat[]) || []);
    setZakatTrend(trendRes.data || []);
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('panitia-dash-tz').on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('panitia-dash-distribusi').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtNum = (n: number) => n.toLocaleString('id-ID');

  const aTotalFitrah = useCountUp(stats.totalFitrah, 1500, 30000);
  const aTotalMal = useCountUp(stats.totalMal, 1500, 30000);
  const aTotalInfaq = useCountUp(stats.totalInfaq, 1500, 30000);
  const aTotalFidyah = useCountUp(stats.totalFidyah, 1500, 30000);
  const aTotalMuzakki = useCountUp(stats.totalMuzakki, 1500, 30000);
  const aTotalMustahik = useCountUp(stats.totalMustahik, 1500, 30000);
  const aTotalJiwaFitrah = useCountUp(stats.totalJiwaFitrah, 1500, 30000);
  const aTotalBerasFitrah = useCountUp(stats.totalBerasFitrah, 1500, 30000);
  const aTotalBerasFidyah = useCountUp(stats.totalBerasFidyah, 1500, 30000);
  const aTotalBeras = useCountUp(stats.totalBeras, 1500, 30000);

  const statCards = [
    { label: 'Zakat Fitrah', value: fmt(aTotalFitrah), icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Zakat Mal', value: fmt(aTotalMal), icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Infaq', value: fmt(aTotalInfaq), icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Fidyah', value: fmt(aTotalFidyah), icon: Banknote, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Total Muzakki', value: fmtNum(aTotalMuzakki), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Total Mustahik', value: `${fmtNum(aTotalMustahik)} Orang`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Jiwa Fitrah', value: `${fmtNum(aTotalJiwaFitrah)} Orang`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Beras Fitrah', value: `${fmtNum(aTotalBerasFitrah)} Kg`, icon: Wheat, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Beras Fidyah', value: `${fmtNum(aTotalBerasFidyah)} Kg`, icon: Wheat, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Total Beras', value: `${fmtNum(aTotalBeras)} Kg`, icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <PanitiaLayout>
      <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-5 sm:mb-6 leading-tight">Dashboard Panitia</h1>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`p-1.5 rounded-md ${s.bg} ${s.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground leading-tight line-clamp-1">{s.label}</span>
                </div>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold tabular-nums leading-tight text-foreground">
                  {s.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="mb-5">
        <ZakatTrendChart data={zakatTrend} />
      </div>

      {/* RT Stats Table */}
      {rtStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base sm:text-lg">Statistik Zakat per RT</CardTitle>
          </CardHeader>

          {/* Desktop table */}
          <CardContent className="px-4 pb-4 hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RT</TableHead>
                    <TableHead className="text-right">Muzakki</TableHead>
                    <TableHead className="text-right">Jiwa Fitrah</TableHead>
                    <TableHead className="text-right">Total Zakat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtStats.map(r => (
                    <TableRow key={r.nama_rt}>
                      <TableCell className="font-medium">{r.nama_rt}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.total_muzakki)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.total_jiwa_fitrah)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(Number(r.total_zakat))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Mobile cards */}
          <CardContent className="px-3 pb-3 md:hidden space-y-2">
            {rtStats.map(r => (
              <div key={r.nama_rt} className="border border-border rounded-lg p-3">
                <p className="font-semibold text-sm mb-2">{r.nama_rt}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Muzakki</p>
                    <p className="font-bold tabular-nums">{fmtNum(r.total_muzakki)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Jiwa</p>
                    <p className="font-bold tabular-nums">{fmtNum(r.total_jiwa_fitrah)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Zakat</p>
                    <p className="font-bold tabular-nums">{fmt(Number(r.total_zakat))}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </PanitiaLayout>
  );
}
