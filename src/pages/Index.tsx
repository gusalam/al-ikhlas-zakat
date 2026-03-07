import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { DollarSign, Users, Package, Wheat, TrendingUp } from 'lucide-react';
import logo from '@/assets/logo.png';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];
const TARGET_ZAKAT = 50000000;

interface ZakatRow {
  id: string; nama_muzakki: string; jenis_zakat: string;
  jumlah_uang: number; jumlah_beras: number; tanggal: string;
  rt_id: string | null; rt: { nama_rt: string } | null;
}

interface DistribusiRow {
  id: string; jumlah: number; tanggal: string;
  mustahik: { nama: string; rt: { nama_rt: string } | null } | null;
}

export default function Index() {
  const [zakatData, setZakatData] = useState<ZakatRow[]>([]);
  const [distribusiData, setDistribusiData] = useState<DistribusiRow[]>([]);
  const [mustahikCount, setMustahikCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: zakat }, { data: distribusi }, { data: mustahik }] = await Promise.all([
      supabase.from('zakat').select('*, rt(nama_rt)').order('tanggal', { ascending: false }),
      supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))').order('tanggal', { ascending: false }),
      supabase.from('mustahik').select('id'),
    ]);
    setZakatData((zakat as any) || []);
    setDistribusiData((distribusi as any) || []);
    setMustahikCount(mustahik?.length || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const zakatSub = supabase.channel('zakat-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'zakat' }, fetchData).subscribe();
    const distSub = supabase.channel('distribusi-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, fetchData).subscribe();
    return () => { supabase.removeChannel(zakatSub); supabase.removeChannel(distSub); };
  }, []);

  const totalFitrah = zakatData.filter(z => z.jenis_zakat === 'Zakat Fitrah').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalMal = zakatData.filter(z => z.jenis_zakat === 'Zakat Mal').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalShodaqoh = zakatData.filter(z => z.jenis_zakat === 'Shodaqoh').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalZakat = totalFitrah + totalMal + totalShodaqoh;
  const totalBeras = zakatData.reduce((s, z) => s + Number(z.jumlah_beras), 0);
  const totalMuzakki = new Set(zakatData.map(z => z.nama_muzakki)).size;
  const totalDistribusi = distribusiData.reduce((s, d) => s + Number(d.jumlah), 0);
  const progressPercent = Math.min((totalZakat / TARGET_ZAKAT) * 100, 100);

  const pieData = [
    { name: 'Zakat Fitrah', value: totalFitrah },
    { name: 'Zakat Mal', value: totalMal },
    { name: 'Shodaqoh', value: totalShodaqoh },
  ].filter(d => d.value > 0);

  const rtMap: Record<string, number> = {};
  zakatData.forEach(z => {
    const rtName = z.rt?.nama_rt || 'Tidak ada RT';
    rtMap[rtName] = (rtMap[rtName] || 0) + Number(z.jumlah_uang);
  });
  const rtChartData = Object.entries(rtMap).map(([name, value]) => ({ name, value }));

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo Masjid Al-Ikhlas" className="w-14 h-14 rounded-full bg-primary-foreground/20 p-1" />
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Sistem Zakat Masjid Al-Ikhlas</h1>
              <p className="text-sm md:text-base opacity-90">Transparansi Zakat Online — Ramadhan 1447H</p>
            </div>
          </div>
          <Link to="/login" className="hidden md:inline-flex px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition">
            Login Panitia
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Zakat Fitrah', value: fmt(totalFitrah), icon: DollarSign, color: 'text-primary' },
            { label: 'Zakat Mal', value: fmt(totalMal), icon: DollarSign, color: 'text-secondary' },
            { label: 'Shodaqoh', value: fmt(totalShodaqoh), icon: DollarSign, color: 'text-info' },
            { label: 'Total Terkumpul', value: fmt(totalZakat), icon: TrendingUp, color: 'text-primary' },
            { label: 'Total Muzakki', value: totalMuzakki.toString(), icon: Users, color: 'text-primary' },
            { label: 'Total Mustahik', value: mustahikCount.toString(), icon: Users, color: 'text-secondary' },
            { label: 'KK Penerima', value: mustahikCount.toString(), icon: Package, color: 'text-info' },
            { label: 'Beras (Kg)', value: `${totalBeras} Kg`, icon: Wheat, color: 'text-warning' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-lg md:text-xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Progress */}
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Progress Pengumpulan Zakat</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span>Terkumpul: {fmt(totalZakat)}</span>
              <span>Target: {fmt(TARGET_ZAKAT)}</span>
            </div>
            <Progress value={progressPercent} className="h-4" />
            <p className="text-center text-sm text-muted-foreground mt-2">{progressPercent.toFixed(1)}% dari target</p>
          </CardContent>
        </Card>

        {/* Charts */}
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
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">Belum ada data zakat</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Zakat per RT</CardTitle></CardHeader>
            <CardContent>
              {rtChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rtChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">Belum ada data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Transparansi Zakat</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Muzakki</TableHead>
                  <TableHead>Jenis Zakat</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zakatData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : zakatData.slice(0, 50).map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.nama_muzakki}</TableCell>
                    <TableCell>{z.jenis_zakat}</TableCell>
                    <TableCell>{fmt(Number(z.jumlah_uang))}{Number(z.jumlah_beras) > 0 ? ` + ${z.jumlah_beras} Kg` : ''}</TableCell>
                    <TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-xl">Distribusi Zakat</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Mustahik</TableHead>
                  <TableHead>RT</TableHead>
                  <TableHead>Jumlah Bantuan</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distribusiData.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                ) : distribusiData.slice(0, 50).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.mustahik?.nama || '-'}</TableCell>
                    <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                    <TableCell>{fmt(Number(d.jumlah))}</TableCell>
                    <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
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
