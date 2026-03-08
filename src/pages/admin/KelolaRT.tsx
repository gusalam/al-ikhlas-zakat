import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';

export default function KelolaRT() {
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [namaRt, setNamaRt] = useState('');

  const fetchData = async () => {
    const { data } = await supabase.from('rt').select('*').order('nama_rt');
    setData(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (editItem) {
      const { error } = await supabase.from('rt').update({ nama_rt: namaRt }).eq('id', editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success('RT diperbarui');
    } else {
      const { error } = await supabase.from('rt').insert({ nama_rt: namaRt });
      if (error) { toast.error(error.message); return; }
      toast.success('RT ditambahkan');
    }
    setOpen(false); setNamaRt(''); setEditItem(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rt').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('RT dihapus'); fetchData(); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Kelola RT</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setNamaRt(''); setEditItem(null); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah RT</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} RT</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama RT</Label><Input value={namaRt} onChange={e => setNamaRt(e.target.value)} placeholder="RT 01" className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">{editItem ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama RT</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.nama_rt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setNamaRt(r.nama_rt); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus RT?</AlertDialogTitle><AlertDialogDescription>Semua data terkait RT ini mungkin terpengaruh.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(r.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
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
