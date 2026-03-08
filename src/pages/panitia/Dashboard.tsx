import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Users, Wheat } from 'lucide-react';
import { useZakatStats } from '@/hooks/useZakatStats';

interface RtStat {
  nama_rt: string;
  total_muzakki: number;
  total_jiwa_fitrah: number;
  total_zakat: number;
}

export default function PanitiaDashboard() {
  const { stats, fetchStats } = useZakatStats();
  const [rtStats, setRtStats] = useState<RtStat[]>([]);

  const fetchData = useCallback(async () => {
    await fetchStats();
    const { data } = await supabase.rpc('get_zakat_per_rt');
    setRtStats((data as unknown as RtStat[]) || []);
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('panitia-dash-zakat').on('postgres_changes', { event: '*', schema: 'public', table: 'zakat' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('panitia-dash-distribusi').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Dashboard Panitia</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Zakat Fitrah', value: fmt(stats.totalFitrah), icon: Banknote },
          { label: 'Zakat Mal', value: fmt(stats.totalMal), icon: Banknote },
          { label: 'Infaq', value: fmt(stats.totalInfaq), icon: Banknote },
          { label: 'Fidyah', value: fmt(stats.totalFidyah), icon: Banknote },
          { label: 'Total Muzakki', value: stats.totalMuzakki.toString(), icon: Users },
          { label: 'Total Mustahik', value: `${stats.totalMustahik} Orang`, icon: Users },
          { label: 'Jiwa Fitrah', value: `${stats.totalJiwaFitrah} Orang`, icon: Users },
          { label: 'Beras Fitrah', value: `${stats.totalBerasFitrah} Kg`, icon: Wheat },
          { label: 'Beras Fidyah', value: `${stats.totalBerasFidyah} Kg`, icon: Wheat },
          { label: 'Total Beras', value: `${stats.totalBeras} Kg`, icon: Wheat },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Icon className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">{s.label}</span></div>
                <p className="text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistik per RT */}
      {rtStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-serif text-base sm:text-lg">Statistik Zakat per RT</CardTitle></CardHeader>
          {/* Desktop table */}
          <CardContent className="overflow-auto p-4 hidden md:block">
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
                    <TableCell className="text-right">{r.total_muzakki}</TableCell>
                    <TableCell className="text-right">{r.total_jiwa_fitrah}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.total_zakat))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {/* Mobile cards */}
          <CardContent className="p-3 md:hidden space-y-2">
            {rtStats.map(r => (
              <div key={r.nama_rt} className="border rounded-lg p-3">
                <p className="font-semibold text-sm mb-1">{r.nama_rt}</p>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div><span className="text-muted-foreground">Muzakki</span><p className="font-bold">{r.total_muzakki}</p></div>
                  <div><span className="text-muted-foreground">Jiwa</span><p className="font-bold">{r.total_jiwa_fitrah}</p></div>
                  <div><span className="text-muted-foreground">Zakat</span><p className="font-bold">{fmt(Number(r.total_zakat))}</p></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </PanitiaLayout>
  );
}
