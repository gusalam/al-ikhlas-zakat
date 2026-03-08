import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, Users, Wheat, TrendingUp, Truck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { useZakatStats } from '@/hooks/useZakatStats';

export default function AdminDashboard() {
  const { stats, fetchStats } = useZakatStats();
  const [recentZakat, setRecentZakat] = useState<any[]>([]);
  const [recentDistribusi, setRecentDistribusi] = useState<any[]>([]);
  const [mustahikData, setMustahikData] = useState<any[]>([]);
  const [zakatByRt, setZakatByRt] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [rz, rd, mk, zrt] = await Promise.all([
        supabase.from('transaksi_zakat').select('nama_muzakki, tanggal, rt(nama_rt), detail_zakat(jumlah_uang, jumlah_beras, jenis_zakat)').order('tanggal', { ascending: false }).limit(5),
        supabase.from('distribusi').select('jumlah, tanggal, mustahik_id, mustahik(nama)').order('tanggal', { ascending: false }).limit(5),
        supabase.from('mustahik').select('kategori'),
        supabase.from('transaksi_zakat').select('nama_muzakki, rt(nama_rt), detail_zakat(jumlah_uang, jumlah_beras)'),
      ]);
      setRecentZakat(rz.data || []);
      setRecentDistribusi(rd.data || []);
      setMustahikData(mk.data || []);
      setZakatByRt(zrt.data || []);
      await fetchStats();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
    const ch1 = supabase.channel('admin-dash-tz').on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, () => fetchData()).subscribe();
    const ch2 = supabase.channel('admin-dash-distribusi').on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, () => fetchData()).subscribe();
    const ch3 = supabase.channel('admin-dash-mustahik').on('postgres_changes', { event: '*', schema: 'public', table: 'mustahik' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [fetchData]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const kategoriSummary = mustahikData.reduce((acc: Record<string, number>, m: any) => {
    const k = m.kategori || 'Tidak Dikategorikan'; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});

  const rtZakatSummary = zakatByRt.reduce((acc: Record<string, { uang: number; beras: number; muzakki: Set<string> }>, t: any) => {
    const rtName = t.rt?.nama_rt || '-';
    if (!acc[rtName]) acc[rtName] = { uang: 0, beras: 0, muzakki: new Set() };
    (t.detail_zakat || []).forEach((d: any) => { acc[rtName].uang += Number(d.jumlah_uang || 0); acc[rtName].beras += Number(d.jumlah_beras || 0); });
    acc[rtName].muzakki.add(t.nama_muzakki);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Zakat Fitrah', value: fmt(stats.totalFitrah), icon: Banknote, color: 'text-emerald-600' },
          { label: 'Zakat Mal', value: fmt(stats.totalMal), icon: Banknote, color: 'text-blue-600' },
          { label: 'Infaq', value: fmt(stats.totalInfaq), icon: Banknote, color: 'text-amber-600' },
          { label: 'Fidyah', value: fmt(stats.totalFidyah), icon: Banknote, color: 'text-purple-600' },
          { label: 'Total Muzakki', value: stats.totalMuzakki.toString(), icon: Users, color: 'text-blue-600' },
          { label: 'Total Mustahik', value: `${stats.totalMustahik} Orang`, icon: Users, color: 'text-purple-600' },
          { label: 'Jiwa Fitrah', value: `${stats.totalJiwaFitrah} Orang`, icon: Users, color: 'text-emerald-600' },
          { label: 'Beras Fitrah', value: `${stats.totalBerasFitrah} Kg`, icon: Wheat, color: 'text-emerald-600' },
          { label: 'Beras Fidyah', value: `${stats.totalBerasFidyah} Kg`, icon: Wheat, color: 'text-purple-600' },
          { label: 'Total Beras', value: `${stats.totalBeras} Kg`, icon: Wheat, color: 'text-amber-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><div className={`p-2 rounded-lg bg-muted ${s.color}`}><Icon className="w-5 h-5" /></div></div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold mt-1">{s.value}</p></CardContent></Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Ringkasan Zakat Per RT</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>RT</TableHead><TableHead className="text-right">Muzakki</TableHead><TableHead className="text-right">Uang</TableHead><TableHead className="text-right">Beras (Kg)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(rtZakatSummary).map(([rt, d]: [string, any]) => (
                    <TableRow key={rt}><TableCell className="font-medium">{rt}</TableCell><TableCell className="text-right">{d.muzakki.size}</TableCell><TableCell className="text-right">{fmt(d.uang)}</TableCell><TableCell className="text-right">{d.beras}</TableCell></TableRow>
                  ))}
                  {Object.keys(rtZakatSummary).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Kategori Mustahik</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(kategoriSummary).map(([kategori, count]: [string, any]) => (
                <div key={kategori} className="flex items-center justify-between"><Badge variant="secondary">{kategori}</Badge><span className="font-semibold">{count} orang</span></div>
              ))}
              {Object.keys(kategoriSummary).length === 0 && <p className="text-center text-muted-foreground text-sm">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" />Zakat Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentZakat.map((t: any, i: number) => {
                const totalUang = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
                const totalBeras = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);
                return (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div><p className="font-medium text-sm">{t.nama_muzakki}</p><p className="text-xs text-muted-foreground">{fmtDate(t.tanggal)} · {t.rt?.nama_rt || '-'}</p></div>
                    <div className="text-right">
                      {totalUang > 0 && <p className="text-sm font-semibold">{fmt(totalUang)}</p>}
                      {totalBeras > 0 && <p className="text-sm text-muted-foreground">{totalBeras} Kg</p>}
                    </div>
                  </div>
                );
              })}
              {recentZakat.length === 0 && <p className="text-center text-muted-foreground text-sm">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-primary" />Distribusi Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDistribusi.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div><p className="font-medium text-sm">{d.mustahik?.nama || '-'}</p><p className="text-xs text-muted-foreground">{fmtDate(d.tanggal)}</p></div>
                  <p className="text-sm font-semibold">{fmt(d.jumlah)}</p>
                </div>
              ))}
              {recentDistribusi.length === 0 && <p className="text-center text-muted-foreground text-sm">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
