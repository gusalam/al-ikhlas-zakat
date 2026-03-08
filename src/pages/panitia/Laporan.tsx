import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportPdf } from '@/lib/exportPdf';
import { friendlyError } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';
import { useZakatStats } from '@/hooks/useZakatStats';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [{ value: 'all', label: 'Semua Tahun' }];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

function getDateRange(month: string, year: string): { startDate?: string; endDate?: string } {
  if (year === 'all') return {};
  const y = parseInt(year);
  if (month === 'all') {
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
  }
  const m = parseInt(month);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // last day of month
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function PanitiaLaporan() {
  const { stats, fetchStats } = useZakatStats();
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const zakatPag = usePagination(50);
  const distPag = usePagination(50);
  const yearOptions = useMemo(getYearOptions, []);

  const { startDate, endDate } = useMemo(() => getDateRange(filterMonth, filterYear), [filterMonth, filterYear]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchStats(startDate, endDate);

        let zakatQuery = supabase.from('zakat').select('*, rt(nama_rt)', { count: 'exact' }).order('tanggal', { ascending: false });
        let distQuery = supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))', { count: 'exact' }).order('tanggal', { ascending: false });

        if (startDate) {
          zakatQuery = zakatQuery.gte('tanggal', startDate);
          distQuery = distQuery.gte('tanggal', startDate);
        }
        if (endDate) {
          zakatQuery = zakatQuery.lte('tanggal', endDate);
          distQuery = distQuery.lte('tanggal', endDate);
        }

        const [{ data: z, count: zc, error: ze }, { data: d, count: dc, error: de }] = await Promise.all([
          zakatQuery.range(zakatPag.from, zakatPag.to),
          distQuery.range(distPag.from, distPag.to),
        ]);
        if (ze) throw ze;
        if (de) throw de;
        setZakatData(z || []);
        zakatPag.setTotalCount(zc || 0);
        setDistribusiData(d || []);
        distPag.setTotalCount(dc || 0);
      } catch (err) {
        toast({ title: 'Gagal memuat data', description: friendlyError(err), variant: 'destructive' });
      }
    };
    fetchData();
  }, [zakatPag.page, distPag.page, startDate, endDate]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const filterLabel = filterYear === 'all' ? 'Semua Periode' :
    filterMonth === 'all' ? `Tahun ${filterYear}` :
    `${MONTHS.find(m => m.value === filterMonth)?.label} ${filterYear}`;

  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah },
    { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq },
    { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  const rtMap: Record<string, number> = {};
  zakatData.forEach(z => { const rt = z.rt?.nama_rt || 'Lainnya'; rtMap[rt] = (rtMap[rt] || 0) + Number(z.jumlah_uang); });
  const rtChartData = Object.entries(rtMap).map(([name, value]) => ({ name, value }));

  const exportExcel = () => {
    const zakatSheet = zakatData.map(z => ({ 'Nama Muzakki': z.nama_muzakki, 'Jenis': z.jenis_zakat, 'Jumlah Uang': z.jumlah_uang, 'Jumlah Beras': z.jumlah_beras, 'RT': z.rt?.nama_rt || '-', 'Tanggal': z.tanggal }));
    const distSheet = distribusiData.map(d => ({ 'Nama Mustahik': d.mustahik?.nama || '-', 'RT': d.mustahik?.rt?.nama_rt || '-', 'Jumlah': d.jumlah, 'Tanggal': d.tanggal }));
    const summarySheet = [
      { Keterangan: 'Periode', Jumlah: filterLabel },
      { Keterangan: 'Zakat Fitrah', Jumlah: stats.totalFitrah },
      { Keterangan: 'Zakat Mal', Jumlah: stats.totalMal },
      { Keterangan: 'Infaq', Jumlah: stats.totalInfaq },
      { Keterangan: 'Fidyah', Jumlah: stats.totalFidyah },
      
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(zakatSheet), 'Data Zakat');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(distSheet), 'Distribusi');
    XLSX.writeFile(wb, `Laporan_Zakat_${filterLabel.replace(/\s/g, '_')}.xlsx`);
  };

  const exportPdfLaporan = () => {
    exportPdf({
      title: 'Laporan Keuangan Zakat — Masjid Al-Ikhlas',
      subtitle: `Periode: ${filterLabel} | Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      headers: ['Keterangan', 'Jumlah'],
      rows: [
        ['Zakat Fitrah', fmt(stats.totalFitrah)], ['Zakat Mal', fmt(stats.totalMal)],
        ['Infaq', fmt(stats.totalInfaq)], ['Fidyah', fmt(stats.totalFidyah)],
        ['Total Terkumpul', fmt(stats.totalZakat)],
      ],
      filename: `Laporan_Keuangan_${filterLabel.replace(/\s/g, '_')}.pdf`,
    });
  };

  return (
    <PanitiaLayout>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-serif font-bold">Laporan Keuangan</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); zakatPag.goTo(1); distPag.goTo(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); if (v === 'all') setFilterMonth('all'); zakatPag.goTo(1); distPag.goTo(1); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Excel</Button>
          <Button size="sm" onClick={exportPdfLaporan}><FileText className="w-4 h-4 mr-1" />PDF Laporan</Button>
        </div>
      </div>

      {filterYear !== 'all' && (
        <p className="text-sm text-muted-foreground mb-4">Menampilkan data periode: <span className="font-medium text-foreground">{filterLabel}</span></p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Zakat Fitrah', value: fmt(stats.totalFitrah) },
          { label: 'Zakat Mal', value: fmt(stats.totalMal) },
          { label: 'Infaq', value: fmt(stats.totalInfaq) },
          { label: 'Fidyah', value: fmt(stats.totalFidyah) },
          { label: 'Total Terkumpul', value: fmt(stats.totalZakat), highlight: true },
          { label: 'Total Muzakki', value: stats.totalMuzakki.toString() },
          { label: 'Total Beras', value: `${stats.totalBeras} Kg` },
        ].map(s => (
          <Card key={s.label} className={(s as any).highlight ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
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

      <Card className="mb-6">
        <CardHeader><CardTitle className="font-serif">Data Zakat</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>
              {zakatData.map(z => (
                <TableRow key={z.id}><TableCell>{z.nama_muzakki}</TableCell><TableCell>{z.jenis_zakat}</TableCell><TableCell>{fmt(Number(z.jumlah_uang))}</TableCell><TableCell>{z.jumlah_beras} Kg</TableCell><TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={zakatPag.page} totalPages={zakatPag.totalPages} totalCount={zakatPag.totalCount} onNext={zakatPag.goNext} onPrev={zakatPag.goPrev} onGoTo={zakatPag.goTo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif">Data Distribusi</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>
              {distribusiData.map(d => (
                <TableRow key={d.id}><TableCell>{d.mustahik?.nama || '-'}</TableCell><TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell><TableCell>{fmt(Number(d.jumlah))}</TableCell><TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={distPag.page} totalPages={distPag.totalPages} totalCount={distPag.totalCount} onNext={distPag.goNext} onPrev={distPag.goPrev} onGoTo={distPag.goTo} />
        </CardContent>
      </Card>
    </PanitiaLayout>
  );
}
