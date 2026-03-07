import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Truck, Wheat, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ZakatRow {
  nama_muzakki: string;
  jumlah_uang: number | null;
  jumlah_beras: number | null;
  jenis_zakat: string;
  tanggal: string;
  rt_id: string | null;
}

interface MustahikRow {
  id: string;
  nama: string;
  kategori: string | null;
  rt_id: string | null;
}

interface DistribusiRow {
  jumlah: number;
  tanggal: string;
  mustahik_id: string;
}

interface RtRow {
  id: string;
  nama_rt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalZakat: 0, totalMuzakki: 0, totalMustahik: 0, totalDistribusi: 0, totalBeras: 0 });
  const [zakatData, setZakatData] = useState<ZakatRow[]>([]);
  const [mustahikData, setMustahikData] = useState<MustahikRow[]>([]);
  const [distribusiData, setDistribusiData] = useState<DistribusiRow[]>([]);
  const [rtData, setRtData] = useState<RtRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: zakat }, { data: mustahik }, { data: distribusi }, { data: rt }] = await Promise.all([
        supabase.from('zakat').select('nama_muzakki, jumlah_uang, jumlah_beras, jenis_zakat, tanggal, rt_id'),
        supabase.from('mustahik').select('id, nama, kategori, rt_id'),
        supabase.from('distribusi').select('jumlah, tanggal, mustahik_id'),
        supabase.from('rt').select('id, nama_rt'),
      ]);

      const z = zakat || [];
      const m = mustahik || [];
      const d = distribusi || [];
      const r = rt || [];

      setZakatData(z);
      setMustahikData(m);
      setDistribusiData(d);
      setRtData(r);

      setStats({
        totalZakat: z.reduce((s, item) => s + Number(item.jumlah_uang || 0), 0),
        totalMuzakki: new Set(z.map(item => item.nama_muzakki)).size,
        totalMustahik: m.length,
        totalDistribusi: d.reduce((s, item) => s + Number(item.jumlah), 0),
        totalBeras: z.reduce((s, item) => s + Number(item.jumlah_beras || 0), 0),
      });
    };
    fetchData();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const getRtName = (rtId: string | null) => rtData.find(r => r.id === rtId)?.nama_rt || '-';
  const getMustahikName = (id: string) => mustahikData.find(m => m.id === id)?.nama || '-';

  // Ringkasan per kategori mustahik
  const kategoriSummary = mustahikData.reduce((acc, m) => {
    const k = m.kategori || 'Tidak Dikategorikan';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Ringkasan per RT
  const rtZakatSummary = zakatData.reduce((acc, z) => {
    const rtName = getRtName(z.rt_id);
    if (!acc[rtName]) acc[rtName] = { uang: 0, beras: 0, muzakki: new Set<string>() };
    acc[rtName].uang += Number(z.jumlah_uang || 0);
    acc[rtName].beras += Number(z.jumlah_beras || 0);
    acc[rtName].muzakki.add(z.nama_muzakki);
    return acc;
  }, {} as Record<string, { uang: number; beras: number; muzakki: Set<string> }>);

  // 5 zakat terbaru
  const recentZakat = [...zakatData].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 5);
  // 5 distribusi terbaru
  const recentDistribusi = [...distribusiData].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 5);

  return (
    <AdminLayout>
      <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Dashboard Admin</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Zakat Uang', value: fmt(stats.totalZakat), icon: DollarSign, color: 'text-emerald-600' },
          { label: 'Total Beras', value: `${stats.totalBeras} Kg`, icon: Wheat, color: 'text-amber-600' },
          { label: 'Jumlah Muzakki', value: stats.totalMuzakki.toString(), icon: Users, color: 'text-blue-600' },
          { label: 'Jumlah Mustahik', value: stats.totalMustahik.toString(), icon: Users, color: 'text-purple-600' },
          { label: 'Total Distribusi', value: fmt(stats.totalDistribusi), icon: Truck, color: 'text-rose-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ringkasan Per RT */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Ringkasan Zakat Per RT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RT</TableHead>
                    <TableHead className="text-right">Muzakki</TableHead>
                    <TableHead className="text-right">Uang</TableHead>
                    <TableHead className="text-right">Beras (Kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(rtZakatSummary).map(([rt, data]) => (
                    <TableRow key={rt}>
                      <TableCell className="font-medium">{rt}</TableCell>
                      <TableCell className="text-right">{data.muzakki.size}</TableCell>
                      <TableCell className="text-right">{fmt(data.uang)}</TableCell>
                      <TableCell className="text-right">{data.beras}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(rtZakatSummary).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Kategori Mustahik */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Kategori Mustahik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(kategoriSummary).map(([kategori, count]) => (
                <div key={kategori} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{kategori}</Badge>
                  </div>
                  <span className="font-semibold">{count} orang</span>
                </div>
              ))}
              {Object.keys(kategoriSummary).length === 0 && (
                <p className="text-center text-muted-foreground text-sm">Belum ada data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zakat Terbaru */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Zakat Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentZakat.map((z, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{z.nama_muzakki}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(z.tanggal)} · {getRtName(z.rt_id)}</p>
                  </div>
                  <div className="text-right">
                    {Number(z.jumlah_uang) > 0 && <p className="text-sm font-semibold">{fmt(Number(z.jumlah_uang))}</p>}
                    {Number(z.jumlah_beras) > 0 && <p className="text-sm text-muted-foreground">{z.jumlah_beras} Kg</p>}
                  </div>
                </div>
              ))}
              {recentZakat.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">Belum ada data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribusi Terbaru */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Distribusi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDistribusi.map((d, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{getMustahikName(d.mustahik_id)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(d.tanggal)}</p>
                  </div>
                  <p className="text-sm font-semibold">{fmt(d.jumlah)}</p>
                </div>
              ))}
              {recentDistribusi.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">Belum ada data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
