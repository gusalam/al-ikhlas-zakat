import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Truck, Wheat, Wallet } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

export default function PanitiaDashboard() {
  const [stats, setStats] = useState({ totalZakat: 0, totalMuzakki: 0, totalMustahik: 0, totalDistribusi: 0, totalBeras: 0, saldoZakat: 0, totalFitrah: 0, totalMal: 0, totalInfaq: 0, totalFidyah: 0 });
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: zakat, error: ze }, { data: mustahik, error: me }, { data: distribusi, error: de }] = await Promise.all([
          supabase.from('zakat').select('nama_muzakki, jumlah_uang, jumlah_beras, jenis_zakat, rt_id, tanggal'),
          supabase.from('mustahik').select('id'),
          supabase.from('distribusi').select('jumlah, tanggal'),
        ]);
        if (ze) throw ze;
        if (me) throw me;
        if (de) throw de;

        const z = zakat || [];
        const d = distribusi || [];
        setZakatData(z);
        setDistribusiData(d);

        const totalZakat = z.reduce((s, item) => s + Number(item.jumlah_uang), 0);
        const totalDistribusi = d.reduce((s, item) => s + Number(item.jumlah), 0);
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
      } catch (err) {
        toast({ title: 'Gagal memuat data', description: friendlyError(err), variant: 'destructive' });
      }
    };
    fetchData();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // Pie chart data - jenis zakat
  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah },
    { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq },
    { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  // Bar chart - pemasukan vs distribusi per tanggal
  const dailyMap: Record<string, { pemasukan: number; distribusi: number }> = {};
  zakatData.forEach(z => {
    const d = z.tanggal;
    if (!dailyMap[d]) dailyMap[d] = { pemasukan: 0, distribusi: 0 };
    dailyMap[d].pemasukan += Number(z.jumlah_uang);
  });
  distribusiData.forEach(d => {
    const dt = d.tanggal;
    if (!dailyMap[dt]) dailyMap[dt] = { pemasukan: 0, distribusi: 0 };
    dailyMap[dt].distribusi += Number(d.jumlah);
  });
  const dailyChartData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      name: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      Pemasukan: vals.pemasukan,
      Distribusi: vals.distribusi,
    }));

  // Bar chart - pemasukan vs distribusi summary
  const summaryBarData = [
    { name: 'Pemasukan', value: stats.totalZakat },
    { name: 'Distribusi', value: stats.totalDistribusi },
    { name: 'Saldo', value: stats.saldoZakat },
  ];

  return (
    <PanitiaLayout>
      <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Dashboard Panitia</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Komposisi Jenis Zakat</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Ringkasan Keuangan</CardTitle></CardHeader>
          <CardContent>
            {stats.totalZakat > 0 || stats.totalDistribusi > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summaryBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {summaryBarData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? 'hsl(152, 55%, 28%)' : i === 1 ? 'hsl(0, 72%, 51%)' : 'hsl(200, 70%, 50%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
      </div>

      {dailyChartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Pemasukan & Distribusi Harian</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="Pemasukan" fill="hsl(152, 55%, 28%)" radius={[4,4,0,0]} />
                <Bar dataKey="Distribusi" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </PanitiaLayout>
  );
}
