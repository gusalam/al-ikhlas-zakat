import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { Banknote, Users, Wheat, TrendingUp, CalendarDays } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useZakatStats } from '@/hooks/useZakatStats';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

export default function Index() {
  const { stats, fetchStats } = useZakatStats();
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);
  const [rtChartData, setRtChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const zakatPag = usePagination(50);
  const distPag = usePagination(50);

  const fetchData = async () => {
    await fetchStats();

    const [zRes, dRes, rtRes] = await Promise.all([
      supabase.from('zakat').select('id, nama_muzakki, jenis_zakat, jumlah_uang, jumlah_beras, tanggal', { count: 'exact' }).order('tanggal', { ascending: false }).range(zakatPag.from, zakatPag.to),
      supabase.from('distribusi').select('id, jumlah, tanggal, mustahik(nama, rt(nama_rt))', { count: 'exact' }).order('tanggal', { ascending: false }).range(distPag.from, distPag.to),
      supabase.from('zakat').select('jumlah_uang, rt(nama_rt)'),
    ]);

    setZakatData(zRes.data || []);
    zakatPag.setTotalCount(zRes.count || 0);
    setDistribusiData(dRes.data || []);
    distPag.setTotalCount(dRes.count || 0);

    const rtMap: Record<string, number> = {};
    (rtRes.data || []).forEach((z: any) => {
      const rtName = z.rt?.nama_rt || 'Tidak ada RT';
      rtMap[rtName] = (rtMap[rtName] || 0) + Number(z.jumlah_uang || 0);
    });
    setRtChartData(Object.entries(rtMap).map(([name, value]) => ({ name, value })));

    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('zakat-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'zakat' }, fetchData).subscribe();
    const ch2 = supabase.channel('distribusi-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [zakatPag.page, distPag.page]);

  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah },
    { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq },
    { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo Masjid Al-Ikhlas" className="w-14 h-14 rounded-full bg-primary-foreground/20 p-1" />
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Sistem Zakat Masjid Al-Ikhlas</h1>
              <p className="text-sm md:text-base opacity-90">Transparansi Zakat Online — Ramadhan 1447H</p>
            </div>
          </div>
          <Link to="/login" className="hidden md:inline-flex px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition">Login Panitia</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" /><span>Data diperbarui: {fmtDate(lastUpdated)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Zakat Fitrah', value: fmt(stats.totalFitrah), icon: Banknote, color: 'text-primary' },
            { label: 'Zakat Mal', value: fmt(stats.totalMal), icon: Banknote, color: 'text-secondary' },
            { label: 'Infaq', value: fmt(stats.totalInfaq), icon: Banknote, color: 'text-primary' },
            { label: 'Fidyah', value: fmt(stats.totalFidyah), icon: Banknote, color: 'text-secondary' },
            { label: 'Total Muzakki', value: stats.totalMuzakki.toString(), icon: Users, color: 'text-primary' },
            { label: 'Total Mustahik', value: stats.totalMustahik.toString(), icon: Users, color: 'text-secondary' },
            { label: 'Beras (Kg)', value: `${stats.totalBeras} Kg`, icon: Wheat, color: 'text-secondary' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Icon className={`w-5 h-5 ${stat.color}`} /><span className="text-sm text-muted-foreground">{stat.label}</span></div>
                  <p className="text-lg md:text-xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Grafik Jenis Zakat</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">Belum ada data zakat</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Zakat per RT</CardTitle></CardHeader>
            <CardContent>
              {rtChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rtChartData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">Belum ada data</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Transparansi Zakat</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nama Muzakki</TableHead><TableHead>Jenis Zakat</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
              <TableBody>
                {zakatData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : zakatData.map((z: any) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.nama_muzakki}</TableCell>
                    <TableCell>{z.jenis_zakat}</TableCell>
                    <TableCell>{fmt(Number(z.jumlah_uang))}{Number(z.jumlah_beras) > 0 ? ` + ${z.jumlah_beras} Kg` : ''}</TableCell>
                    <TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls page={zakatPag.page} totalPages={zakatPag.totalPages} totalCount={zakatPag.totalCount} onNext={zakatPag.goNext} onPrev={zakatPag.goPrev} onGoTo={zakatPag.goTo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Distribusi Zakat</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nama Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Jumlah Bantuan</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
              <TableBody>
                {distribusiData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : distribusiData.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.mustahik?.nama || '-'}</TableCell>
                    <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                    <TableCell>{fmt(Number(d.jumlah))}</TableCell>
                    <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls page={distPag.page} totalPages={distPag.totalPages} totalCount={distPag.totalCount} onNext={distPag.goNext} onPrev={distPag.goPrev} onGoTo={distPag.goTo} />
          </CardContent>
        </Card>
      </main>

      <footer className="bg-primary text-primary-foreground py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-serif text-lg">Masjid Al-Ikhlas</p>
          <p className="text-sm opacity-75 mt-1">Sistem Transparansi Zakat — {new Date().getFullYear()}</p>
          <Link to="/login" className="text-sm underline opacity-75 mt-2 inline-block md:hidden">Login Panitia</Link>
        </div>
      </footer>
    </div>
  );
}
