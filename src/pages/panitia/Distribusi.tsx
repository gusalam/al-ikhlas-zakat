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
import { Plus } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useZakatStats } from '@/hooks/useZakatStats';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

const SUMBER_OPTIONS = ['Zakat Fitrah', 'Zakat Mal', 'Infaq', 'Fidyah'];
const JENIS_BANTUAN_OPTIONS = ['Uang', 'Beras'];

const emptyForm = {
  mustahik_id: '', jumlah: '', jumlah_beras: '', tanggal: new Date().toISOString().split('T')[0],
  sumber_zakat: 'Zakat Fitrah', jenis_bantuan: 'Uang',
};

export default function PanitiaDistribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [mustahikList, setMustahikList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const { stats, fetchStats } = useZakatStats();
  const pag = usePagination(50);

  const fetchData = async () => {
    const [{ data: dist, count }, { data: m }] = await Promise.all([
      supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))', { count: 'exact' }).order('tanggal', { ascending: false }).range(pag.from, pag.to),
      supabase.from('mustahik').select('id, nama'),
    ]);
    setData(dist || []);
    pag.setTotalCount(count || 0);
    setMustahikList(m || []);
    await fetchStats();
  };

  useEffect(() => { fetchData(); }, [pag.page]);

  const handleSubmit = async () => {
    if (!form.mustahik_id) { toast.error('Pilih mustahik terlebih dahulu'); return; }
    if (form.jenis_bantuan === 'Uang' && !Number(form.jumlah)) { toast.error('Jumlah uang wajib diisi'); return; }
    if (form.jenis_bantuan === 'Beras' && !Number(form.jumlah_beras)) { toast.error('Jumlah beras wajib diisi'); return; }

    const payload: any = {
      mustahik_id: form.mustahik_id,
      jumlah: form.jenis_bantuan === 'Uang' ? Number(form.jumlah) : 0,
      jumlah_beras: form.jenis_bantuan === 'Beras' ? Number(form.jumlah_beras) : 0,
      tanggal: form.tanggal,
      created_by: user?.id,
      sumber_zakat: form.sumber_zakat,
      jenis_bantuan: form.jenis_bantuan,
    };

    const { error } = await supabase.from('distribusi').insert(payload);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Distribusi zakat berhasil dicatat ✓');
    setOpen(false); setForm({ ...emptyForm }); fetchData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const fmtJumlah = (d: any) => {
    if (d.jenis_bantuan === 'Beras') return `${Number(d.jumlah_beras) || 0} Kg`;
    return fmt(Number(d.jumlah) || 0);
  };

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Distribusi Zakat</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Catat Distribusi</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Mustahik <span className="text-destructive">*</span></Label>
                <Select value={form.mustahik_id} onValueChange={v => setForm({ ...form, mustahik_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih Mustahik" /></SelectTrigger>
                  <SelectContent>{mustahikList.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sumber Zakat <span className="text-destructive">*</span></Label>
                <Select value={form.sumber_zakat} onValueChange={v => setForm({ ...form, sumber_zakat: v })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUMBER_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Jenis Bantuan <span className="text-destructive">*</span></Label>
                <Select value={form.jenis_bantuan} onValueChange={v => setForm({ ...form, jenis_bantuan: v, jumlah: '', jumlah_beras: '' })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_BANTUAN_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.jenis_bantuan === 'Uang' && (
                <div><Label>Jumlah Uang (Rp) <span className="text-destructive">*</span></Label><Input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} className="h-12 text-base" /></div>
              )}
              {form.jenis_bantuan === 'Beras' && (
                <div><Label>Jumlah Beras (Kg) <span className="text-destructive">*</span></Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} className="h-12 text-base" /></div>
              )}
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

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Sumber</TableHead><TableHead>Jenis</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.mustahik?.nama || '-'}</TableCell>
                  <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{d.sumber_zakat || '-'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{d.jenis_bantuan || 'Uang'}</Badge></TableCell>
                  <TableCell>{fmtJumlah(d)}</TableCell>
                  <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4">
            <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
          </div>
        </CardContent>
      </Card>

      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data distribusi</p>}
        {data.map(d => (
          <Card key={d.id}>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-base">{d.mustahik?.nama || '-'}</p>
              <div className="flex flex-wrap gap-2 mb-1">
                <Badge variant="outline">{d.sumber_zakat || '-'}</Badge>
                <Badge variant="secondary">{d.jenis_bantuan || 'Uang'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span><span className="text-muted-foreground">RT:</span> {d.mustahik?.rt?.nama_rt || '-'}</span>
                <span><span className="text-muted-foreground">Jumlah:</span> {fmtJumlah(d)}</span>
                <span><span className="text-muted-foreground">Tanggal:</span> {new Date(d.tanggal).toLocaleDateString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>
    </PanitiaLayout>
  );
}
