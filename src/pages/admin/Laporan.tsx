import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportPdf } from '@/lib/exportPdf';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)'];

export default function Laporan() {
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: z }, { data: d }] = await Promise.all([
        supabase.from('zakat').select('*, rt(nama_rt)'),
        supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))'),
      ]);
      setZakatData(z || []);
      setDistribusiData(d || []);
    };
    fetch();
  }, []);

  const totalFitrah = zakatData.filter(z => z.jenis_zakat === 'Zakat Fitrah').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalMal = zakatData.filter(z => z.jenis_zakat === 'Zakat Mal').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalShodaqoh = zakatData.filter(z => z.jenis_zakat === 'Shodaqoh').reduce((s, z) => s + Number(z.jumlah_uang), 0);
  const totalDistribusi = distribusiData.reduce((s, d) => s + Number(d.jumlah), 0);
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const pieData = [
    { name: 'Zakat Fitrah', value: totalFitrah },
    { name: 'Zakat Mal', value: totalMal },
    { name: 'Shodaqoh', value: totalShodaqoh },
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zakatSheet), 'Data Zakat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distSheet), 'Distribusi');
    XLSX.writeFile(wb, 'Laporan_Zakat_Al_Ikhlas.xlsx');
  };

  const exportCSV = () => {
    const rows = zakatData.map(z => `${z.nama_muzakki},${z.jenis_zakat},${z.jumlah_uang},${z.jumlah_beras},${z.rt?.nama_rt || '-'},${z.tanggal}`);
    const csv = 'Nama,Jenis,Uang,Beras,RT,Tanggal\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'laporan_zakat.csv'; a.click();
  };

  const exportPdfZakat = () => {
    exportPdf({
      title: 'Laporan Zakat — Masjid Al-Ikhlas',
      subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      headers: ['Nama Muzakki', 'Jenis', 'Jumlah Uang', 'Beras (Kg)', 'RT', 'Tanggal'],
      rows: zakatData.map(z => [
        z.nama_muzakki, z.jenis_zakat, fmt(Number(z.jumlah_uang)),
        `${z.jumlah_beras || 0}`, z.rt?.nama_rt || '-',
        new Date(z.tanggal).toLocaleDateString('id-ID'),
      ]),
      filename: 'Laporan_Zakat_Al_Ikhlas.pdf',
    });
  };

  const exportPdfDistribusi = () => {
    exportPdf({
      title: 'Laporan Distribusi Zakat — Masjid Al-Ikhlas',
      subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      headers: ['Nama Mustahik', 'RT', 'Jumlah', 'Tanggal'],
      rows: distribusiData.map(d => [
        d.mustahik?.nama || '-', d.mustahik?.rt?.nama_rt || '-',
        fmt(Number(d.jumlah)), new Date(d.tanggal).toLocaleDateString('id-ID'),
      ]),
      filename: 'Laporan_Distribusi_Al_Ikhlas.pdf',
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-serif font-bold">Laporan</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPdfZakat}><FileText className="w-4 h-4 mr-1" />PDF Zakat</Button>
          <Button size="sm" onClick={exportPdfDistribusi}><FileText className="w-4 h-4 mr-1" />PDF Distribusi</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Zakat Fitrah', value: fmt(totalFitrah) },
          { label: 'Zakat Mal', value: fmt(totalMal) },
          { label: 'Shodaqoh', value: fmt(totalShodaqoh) },
          { label: 'Total Distribusi', value: fmt(totalDistribusi) },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></CardContent></Card>
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
    </AdminLayout>
  );
}
