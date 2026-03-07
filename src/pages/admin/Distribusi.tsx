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
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Distribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [mustahikList, setMustahikList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mustahik_id: '', jumlah: '', tanggal: new Date().toISOString().split('T')[0] });

  const fetchData = async () => {
    const [{ data: dist }, { data: mustahik }] = await Promise.all([
      supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))').order('tanggal', { ascending: false }),
      supabase.from('mustahik').select('id, nama'),
    ]);
    setData(dist || []);
    setMustahikList(mustahik || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('distribusi').insert({
      mustahik_id: form.mustahik_id, jumlah: Number(form.jumlah), tanggal: form.tanggal, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Distribusi berhasil dicatat');
    setOpen(false); setForm({ mustahik_id: '', jumlah: '', tanggal: new Date().toISOString().split('T')[0] }); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('distribusi').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Data dihapus'); fetchData(); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Distribusi Zakat</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Catat Distribusi</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Mustahik</Label>
                <Select value={form.mustahik_id} onValueChange={v => setForm({ ...form, mustahik_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih Mustahik" /></SelectTrigger>
                  <SelectContent>{mustahikList.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Jumlah (Rp)</Label><Input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="h-12 text-base" /></div>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button className="w-full h-12">Distribusikan</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Konfirmasi Distribusi</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin mencatat distribusi ini?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleSubmit}>Ya, Distribusikan</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.mustahik?.nama || '-'}</TableCell>
                  <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{fmt(Number(d.jumlah))}</TableCell>
                  <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus distribusi?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(d.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data distribusi</p>}
        {data.map(d => (
          <Card key={d.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{d.mustahik?.nama || '-'}</p>
                  <p className="text-sm text-muted-foreground">{d.mustahik?.rt?.nama_rt || '-'}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Hapus distribusi?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(d.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Jumlah:</span> <span className="font-medium">{fmt(Number(d.jumlah))}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(d.tanggal).toLocaleDateString('id-ID')}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
