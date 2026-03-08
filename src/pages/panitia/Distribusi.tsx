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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function PanitiaDistribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [mustahikList, setMustahikList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mustahik_id: '', jumlah: '', tanggal: new Date().toISOString().split('T')[0] });
  const [saldoZakat, setSaldoZakat] = useState(0);

  const fetchData = async () => {
    const [{ data: dist }, { data: m }, { data: zakat }] = await Promise.all([
      supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))').order('tanggal', { ascending: false }),
      supabase.from('mustahik').select('id, nama'),
      supabase.from('zakat').select('jumlah_uang'),
    ]);
    setData(dist || []);
    setMustahikList(m || []);
    const totalZakat = (zakat || []).reduce((s, z) => s + Number(z.jumlah_uang || 0), 0);
    const totalDist = (dist || []).reduce((s, d) => s + Number(d.jumlah || 0), 0);
    setSaldoZakat(totalZakat - totalDist);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    const jumlah = Number(form.jumlah);
    if (jumlah > saldoZakat) {
      toast.error('Distribusi tidak boleh melebihi saldo zakat yang tersedia.');
      return;
    }
    const { error } = await supabase.from('distribusi').insert({
      mustahik_id: form.mustahik_id, jumlah, tanggal: form.tanggal, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Distribusi dicatat');
    setOpen(false); setForm({ mustahik_id: '', jumlah: '', tanggal: new Date().toISOString().split('T')[0] }); fetchData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold">Distribusi Zakat</h1>
          <div className="flex items-center gap-2 mt-1">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Saldo Zakat:</span>
            <Badge variant={saldoZakat < 0 ? 'destructive' : 'secondary'} className="font-semibold">{fmt(saldoZakat)}</Badge>
          </div>
        </div>
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
                  <AlertDialogHeader><AlertDialogTitle>Konfirmasi Distribusi</AlertDialogTitle><AlertDialogDescription>Yakin ingin mencatat distribusi ini?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleSubmit}>Ya</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.mustahik?.nama || '-'}</TableCell>
                  <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{fmt(Number(d.jumlah))}</TableCell>
                  <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PanitiaLayout>
  );
}
