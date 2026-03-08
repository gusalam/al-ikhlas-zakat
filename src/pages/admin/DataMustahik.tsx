import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, FileText } from 'lucide-react';
import { exportPdf } from '@/lib/exportPdf';

export default function DataMustahik() {
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
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

  const resetForm = () => setForm({ nama: '', rt_id: '', kategori: '' });

  const handleSubmit = async () => {
    const payload = { nama: form.nama, rt_id: form.rt_id || null, kategori: form.kategori || null };
    if (editItem) {
      const { error } = await supabase.from('mustahik').update(payload).eq('id', editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Data diperbarui');
    } else {
      const { error } = await supabase.from('mustahik').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Data ditambahkan');
    }
    setOpen(false); resetForm(); setEditItem(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('mustahik').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Data dihapus'); fetchData(); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-serif font-bold">Data Mustahik</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportPdf({
            title: 'Data Mustahik — Masjid Al-Ikhlas',
            subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            headers: ['No', 'Nama', 'RT', 'Kategori'],
            rows: data.map((m, i) => [String(i + 1), m.nama, m.rt?.nama_rt || '-', m.kategori || '-']),
            filename: 'Data_Mustahik_Al_Ikhlas.pdf',
          })}><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { resetForm(); setEditItem(null); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} Mustahik</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Kategori</Label><Input value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} placeholder="Fakir, Miskin, dll" className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">{editItem ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nama</TableHead><TableHead>RT</TableHead><TableHead>Kategori</TableHead><TableHead>Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.nama}</TableCell>
                  <TableCell>{m.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{m.kategori || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(m); setForm({ nama: m.nama, rt_id: m.rt_id || '', kategori: m.kategori || '' }); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus mustahik?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(m.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
