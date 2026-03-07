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

export default function PanitiaMustahik() {
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama: '', rt_id: '', kategori: '' });

  const fetchData = async () => {
    const [{ data: m }, { data: rt }] = await Promise.all([
      supabase.from('mustahik').select('*, rt(nama_rt)').order('nama'),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(m || []);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('mustahik').insert({ nama: form.nama, rt_id: form.rt_id || null, kategori: form.kategori || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Mustahik ditambahkan');
    setOpen(false); setForm({ nama: '', rt_id: '', kategori: '' }); fetchData();
  };

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Data Mustahik</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Mustahik</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Kategori</Label><Input value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} placeholder="Fakir, Miskin, dll" className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">Tambah</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>RT</TableHead><TableHead>Kategori</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.nama}</TableCell>
                  <TableCell>{m.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{m.kategori || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PanitiaLayout>
  );
}
