import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, FileText } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import KwitansiZakat, { KwitansiData } from '@/components/KwitansiZakat';

export default function InputZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], jumlah_jiwa: '1', penerima: '' });
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);

  const fetchData = async () => {
    const [{ data: zakat }, { data: rt }] = await Promise.all([
      supabase.from('zakat').select('*, rt(nama_rt)').order('tanggal', { ascending: false }).limit(50),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(zakat || []);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    const { data: inserted, error } = await supabase.from('zakat').insert({
      nama_muzakki: form.nama_muzakki, jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
      rt_id: form.rt_id || null, tanggal: form.tanggal, created_by: user?.id,
      jumlah_jiwa: Number(form.jumlah_jiwa) || 1,
    }).select('nomor_kwitansi').single();
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Data zakat berhasil disimpan ✓');
    setOpen(false);

    setKwitansiData({
      nomor: inserted?.nomor_kwitansi || 0,
      nama_muzakki: form.nama_muzakki,
      jumlah_jiwa: Number(form.jumlah_jiwa) || 1,
      jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0,
      jumlah_beras: Number(form.jumlah_beras) || 0,
      tanggal: form.tanggal,
      penerima: form.penerima || form.nama_muzakki,
    });
    setKwitansiOpen(true);

    setForm({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], jumlah_jiwa: '1', penerima: '' });
    fetchData();
  };

  const showKwitansi = (z: any) => {
    setKwitansiData({
      nomor: z.nomor_kwitansi || 0,
      nama_muzakki: z.nama_muzakki,
      jumlah_jiwa: z.jumlah_jiwa || 1,
      jenis_zakat: z.jenis_zakat,
      jumlah_uang: Number(z.jumlah_uang) || 0,
      jumlah_beras: Number(z.jumlah_beras) || 0,
      tanggal: z.tanggal,
      penerima: z.nama_muzakki,
    });
    setKwitansiOpen(true);
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Input Zakat</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Input Zakat Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama Muzakki</Label><Input value={form.nama_muzakki} onChange={e => setForm({ ...form, nama_muzakki: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Jumlah Jiwa</Label><Input type="number" min="1" value={form.jumlah_jiwa} onChange={e => setForm({ ...form, jumlah_jiwa: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Jenis Zakat</Label>
                <Select value={form.jenis_zakat} onValueChange={v => setForm({ ...form, jenis_zakat: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zakat Fitrah">Zakat Fitrah</SelectItem>
                    <SelectItem value="Zakat Mal">Zakat Mal</SelectItem>
                    <SelectItem value="Infaq">Infaq</SelectItem>
                    <SelectItem value="Fidyah">Fidyah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Jumlah Uang (Rp)</Label><Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Jumlah Beras (Liter)</Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Nama Penerima</Label><Input value={form.penerima} onChange={e => setForm({ ...form, penerima: e.target.value })} placeholder="Kosongkan jika sama dengan muzakki" className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">Simpan Zakat</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(z => (
                <TableRow key={z.id}>
                  <TableCell>{z.nomor_kwitansi}</TableCell>
                  <TableCell>{z.nama_muzakki}</TableCell>
                  <TableCell>{z.jenis_zakat}</TableCell>
                  <TableCell>{fmt(Number(z.jumlah_uang))}</TableCell>
                  <TableCell>{z.jumlah_beras} Kg</TableCell>
                  <TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => showKwitansi(z)}>
                      <FileText className="w-4 h-4 mr-1" />Kwitansi
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(z => (
          <Card key={z.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">#{z.nomor_kwitansi} — {z.nama_muzakki}</p>
                  <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">{z.jenis_zakat}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => showKwitansi(z)}>
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Uang:</span> <span className="font-medium">{fmt(Number(z.jumlah_uang))}</span></div>
                <div><span className="text-muted-foreground">Beras:</span> <span className="font-medium">{z.jumlah_beras} Kg</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(z.tanggal).toLocaleDateString('id-ID')}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </PanitiaLayout>
  );
}
