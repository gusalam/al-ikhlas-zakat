import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportPdf } from '@/lib/exportPdf';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

export default function PanitiaLaporan() {
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: z, error: ze }, { data: d, error: de }] = await Promise.all([
          supabase.from('zakat').select('*, rt(nama_rt)'),
          supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))'),
        ]);
        if (ze) throw ze;
        if (de) throw de;
        setZakatData(z || []);
        setDistribusiData(d || []);
      } catch (err) {
        toast({ title: 'Gagal memuat data', description: friendlyError(err), variant: 'destructive' });
      }
    };
    fetchData();
  }, []);

  const totalFitrah = zakatData.filter(z => z.jenis_zakat === 'Zakat Fitrah').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalMal = zakatData.filter(z => z.jenis_zakat === 'Zakat Mal').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalInfaq = zakatData.filter(z => z.jenis_zakat === 'Infaq' || z.jenis_zakat === 'Shodaqoh').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalFidyah = zakatData.filter(z => z.jenis_zakat === 'Fidyah').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalDistribusi = distribusiData.reduce((s, d) => s + Number(d.jumlah), 0);
  const totalPemasukan = totalFitrah + totalMal + totalInfaq + totalFidyah;
  const saldoZakat = totalPemasukan - totalDistribusi;
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const pieData = [
    { name: 'Zakat Fitrah', value: totalFitrah },
    { name: 'Zakat Mal', value: totalMal },
    { name: 'Infaq', value: totalInfaq },
    { name: 'Fidyah', value: totalFidyah },
  ].filter(d => d.value > 0);

  const rtMap: Record<string, number> = {};
  zakatData.forEach(z => { const rt = z.rt?.nama_rt || 'Lainnya'; rtMap[rt] = (rtMap[rt] || 0) + Number(z.jumlah_uang); });
  const rtChartData = Object.entries(rtMap).map(([name, value]) => ({ name, value }));

  const exportExcel = () => {
    const zakatSheet = zakatData.map(z => ({
      'Nama Muzakki': z.nama_muzakki, 'Jenis': z.jenis_zakat, 'Jumlah Uang': z.jumlah_uang,
      'Jumlah Beras': z.jumlah_beras, 'RT': z.rt?.nama_rt || '-', 'Tanggal': z.tanggal,
    }));
    const distSheet = distribusiData.map(d => ({
      'Nama Mustahik': d.mustahik?.nama || '-', 'RT': d.mustahik?.rt?.nama_rt || '-',
      'Jumlah': d.jumlah, 'Tanggal': d.tanggal,
    }));
    const summarySheet = [
      { Keterangan: 'Zakat Fitrah', Jumlah: totalFitrah },
      { Keterangan: 'Zakat Mal', Jumlah: totalMal },
      { Keterangan: 'Infaq', Jumlah: totalInfaq },
      { Keterangan: 'Fidyah', Jumlah: totalFidyah },
      { Keterangan: 'Total Pemasukan', Jumlah: totalPemasukan },
      { Keterangan: 'Total Distribusi', Jumlah: totalDistribusi },
      { Keterangan: 'Saldo Zakat', Jumlah: saldoZakat },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zakatSheet), 'Data Zakat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distSheet), 'Distribusi');
    XLSX.writeFile(wb, 'Laporan_Zakat_Al_Ikhlas.xlsx');
  };

  const exportPdfLaporan = () => {
    exportPdf({
      title: 'Laporan Keuangan Zakat — Masjid Al-Ikhlas',
      subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      headers: ['Keterangan', 'Jumlah'],
      rows: [
        ['Zakat Fitrah', fmt(totalFitrah)],
        ['Zakat Mal', fmt(totalMal)],
        ['Infaq', fmt(totalInfaq)],
        ['Fidyah', fmt(totalFidyah)],
        ['Total Pemasukan', fmt(totalPemasukan)],
        ['Total Distribusi', fmt(totalDistribusi)],
        ['Saldo Zakat', fmt(saldoZakat)],
      ],
      filename: 'Laporan_Keuangan_Zakat_Al_Ikhlas.pdf',
    });
  };

  return (
    <PanitiaLayout>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-serif font-bold">Laporan Keuangan</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Excel</Button>
          <Button size="sm" onClick={exportPdfLaporan}><FileText className="w-4 h-4 mr-1" />PDF Laporan</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Zakat Fitrah', value: fmt(totalFitrah) },
          { label: 'Zakat Mal', value: fmt(totalMal) },
          { label: 'Infaq', value: fmt(totalInfaq) },
          { label: 'Fidyah', value: fmt(totalFidyah) },
          { label: 'Total Pemasukan', value: fmt(totalPemasukan), highlight: true },
          { label: 'Total Distribusi', value: fmt(totalDistribusi) },
          { label: 'Saldo Zakat', value: fmt(saldoZakat), highlight: true, isSaldo: true },
        ].map(s => (
          <Card key={s.label} className={(s as any).highlight ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${(s as any).isSaldo ? (saldoZakat >= 0 ? 'text-emerald-600' : 'text-destructive') : ''}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-serif">Grafik Jenis Zakat</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v: number) => fmt(v)} /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif">Zakat per RT</CardTitle></CardHeader>
          <CardContent>
            {rtChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rtChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="hsl(152, 55%, 28%)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-12 text-muted-foreground">Belum ada data</p>}
          </CardContent>
        </Card>
      </div>
    </PanitiaLayout>
  );
}
