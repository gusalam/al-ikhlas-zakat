import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Users, Wheat } from 'lucide-react';
import { useZakatStats } from '@/hooks/useZakatStats';

export default function PanitiaDashboard() {
  const { stats, fetchStats } = useZakatStats();

  const fetchData = useCallback(async () => {
    await fetchStats();
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
          { label: 'Total Mustahik', value: stats.totalMustahik.toString(), icon: Users },
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
    </PanitiaLayout>
  );
}
