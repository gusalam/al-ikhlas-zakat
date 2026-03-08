import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, Truck, Wheat, Wallet } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';

export default function PanitiaDashboard() {
  const [stats, setStats] = useState({ totalZakat: 0, totalMuzakki: 0, totalMustahik: 0, totalDistribusi: 0, totalBeras: 0, saldoZakat: 0, totalFitrah: 0, totalMal: 0, totalInfaq: 0, totalFidyah: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: zakat }, { data: mustahik }, { data: distribusi }] = await Promise.all([
        supabase.from('zakat').select('nama_muzakki, jumlah_uang, jumlah_beras, jenis_zakat'),
        supabase.from('mustahik').select('id'),
        supabase.from('distribusi').select('jumlah'),
      ]);
      const z = zakat || [];
      const totalZakat = z.reduce((s, item) => s + Number(item.jumlah_uang), 0);
      const totalDistribusi = (distribusi || []).reduce((s, d) => s + Number(d.jumlah), 0);
      setStats({
        totalZakat,
        totalMuzakki: new Set(z.map(item => item.nama_muzakki)).size,
        totalMustahik: mustahik?.length || 0,
        totalDistribusi,
        totalBeras: z.reduce((s, item) => s + Number(item.jumlah_beras), 0),
        saldoZakat: totalZakat - totalDistribusi,
        totalFitrah: z.filter(item => item.jenis_zakat === 'Zakat Fitrah').reduce((s, item) => s + Number(item.jumlah_uang), 0),
        totalMal: z.filter(item => item.jenis_zakat === 'Zakat Mal').reduce((s, item) => s + Number(item.jumlah_uang), 0),
        totalInfaq: z.filter(item => item.jenis_zakat === 'Infaq' || item.jenis_zakat === 'Shodaqoh').reduce((s, item) => s + Number(item.jumlah_uang), 0),
        totalFidyah: z.filter(item => item.jenis_zakat === 'Fidyah').reduce((s, item) => s + Number(item.jumlah_uang), 0),
      });
    };
    fetch();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Dashboard Panitia</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Zakat Fitrah', value: fmt(stats.totalFitrah), icon: DollarSign },
          { label: 'Zakat Mal', value: fmt(stats.totalMal), icon: DollarSign },
          { label: 'Infaq', value: fmt(stats.totalInfaq), icon: DollarSign },
          { label: 'Fidyah', value: fmt(stats.totalFidyah), icon: DollarSign },
          { label: 'Total Terkumpul', value: fmt(stats.totalZakat), icon: DollarSign },
          { label: 'Total Muzakki', value: stats.totalMuzakki.toString(), icon: Users },
          { label: 'Total Mustahik', value: stats.totalMustahik.toString(), icon: Users },
          { label: 'Total Beras', value: `${stats.totalBeras} Kg`, icon: Wheat },
          { label: 'Total Distribusi', value: fmt(stats.totalDistribusi), icon: Truck },
          { label: 'Saldo Zakat', value: fmt(stats.saldoZakat), icon: Wallet },
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
