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
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function InputZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0] });

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
    const { error } = await supabase.from('zakat').insert({
      nama_muzakki: form.nama_muzakki, jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
      rt_id: form.rt_id || null, tanggal: form.tanggal, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Zakat berhasil dicatat');
    setOpen(false);
    setForm({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Input Zakat</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Input Zakat Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama Muzakki</Label><Input value={form.nama_muzakki} onChange={e => setForm({ ...form, nama_muzakki: e.target.value })} className="h-12 text-base" /></div>
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
                    <SelectItem value="Shodaqoh">Shodaqoh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Jumlah Uang (Rp)</Label><Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Jumlah Beras (Kg)</Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">Simpan Zakat</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(z => (
                <TableRow key={z.id}>
                  <TableCell>{z.nama_muzakki}</TableCell>
                  <TableCell>{z.jenis_zakat}</TableCell>
                  <TableCell>{fmt(Number(z.jumlah_uang))}</TableCell>
                  <TableCell>{z.jumlah_beras} Kg</TableCell>
                  <TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PanitiaLayout>
  );
}
