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
import { useCountUp } from '@/hooks/useAnimationLoop';

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
        supabase.from('distribusi').select('jumlah, jumlah_beras, jenis_bantuan, tanggal, mustahik_id, mustahik(nama)').order('tanggal', { ascending: false }).limit(5),
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

  // Animated stats for cards
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
  const aTotalZakat = useCountUp(stats.totalZakat, 1500, 30000);
  const aTotalDistribusiUang = useCountUp(stats.totalDistribusiUang, 1500, 30000);
  const aSisaUang = useCountUp(stats.sisaUang, 1500, 30000);
  const aTotalDistribusiBeras = useCountUp(stats.totalDistribusiBeras, 1500, 30000);
  const aSisaBeras = useCountUp(stats.sisaBeras, 1500, 30000);

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
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-6 sm:mb-8 leading-tight">Dashboard Admin</h1>


      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Zakat Fitrah', value: fmt(aTotalFitrah), icon: Banknote, color: 'text-emerald-600' },
          { label: 'Zakat Mal', value: fmt(aTotalMal), icon: Banknote, color: 'text-blue-600' },
          { label: 'Infaq', value: fmt(aTotalInfaq), icon: Banknote, color: 'text-amber-600' },
          { label: 'Fidyah', value: fmt(aTotalFidyah), icon: Banknote, color: 'text-purple-600' },
          { label: 'Total Muzakki', value: aTotalMuzakki.toString(), icon: Users, color: 'text-blue-600' },
          { label: 'Total Mustahik', value: `${aTotalMustahik} Orang`, icon: Users, color: 'text-purple-600' },
          { label: 'Jiwa Fitrah', value: `${aTotalJiwaFitrah} Orang`, icon: Users, color: 'text-emerald-600' },
          { label: 'Beras Fitrah', value: `${aTotalBerasFitrah} Kg`, icon: Wheat, color: 'text-emerald-600' },
          { label: 'Beras Fidyah', value: `${aTotalBerasFidyah} Kg`, icon: Wheat, color: 'text-purple-600' },
          { label: 'Total Beras', value: `${aTotalBeras} Kg`, icon: Wheat, color: 'text-amber-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}><CardContent className="p-4 sm:p-5"><div className="flex items-center gap-2 mb-2"><div className={`p-2 sm:p-2.5 rounded-lg bg-muted ${s.color}`}><Icon className="w-5 h-5 sm:w-6 sm:h-6" /></div></div><p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{s.label}</p><p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 leading-tight break-words">{s.value}</p></CardContent></Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-relaxed"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />Ringkasan Zakat Per RT</CardTitle></CardHeader>
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
          <CardHeader className="pb-3"><CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-relaxed"><Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />Kategori Mustahik</CardTitle></CardHeader>
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
          <CardHeader className="pb-3"><CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-relaxed"><Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />Zakat Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentZakat.map((t: any, i: number) => {
                const totalUang = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
                const totalBeras = (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);
                return (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                    <div><p className="font-semibold text-base leading-relaxed break-words">{t.nama_muzakki}</p><p className="text-sm text-muted-foreground leading-relaxed">{fmtDate(t.tanggal)} · {t.rt?.nama_rt || '-'}</p></div>
                    <div className="text-right">
                      {totalUang > 0 && <p className="text-base font-bold leading-tight break-words">{fmt(totalUang)}</p>}
                      {totalBeras > 0 && <p className="text-sm text-muted-foreground leading-relaxed">{totalBeras} Kg</p>}
                    </div>
                  </div>
                );
              })}
              {recentZakat.length === 0 && <p className="text-center text-muted-foreground text-sm">Belum ada data</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 leading-relaxed"><Truck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />Distribusi Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDistribusi.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div><p className="font-semibold text-base leading-relaxed break-words">{d.mustahik?.nama || '-'}</p><p className="text-sm text-muted-foreground leading-relaxed">{fmtDate(d.tanggal)}</p></div>
                  {d.jenis_bantuan === 'Beras'
                    ? <p className="text-base font-bold leading-tight break-words">{Number(d.jumlah_beras) || 0} Kg</p>
                    : <p className="text-base font-bold leading-tight break-words">{fmt(d.jumlah)}</p>
                  }
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
