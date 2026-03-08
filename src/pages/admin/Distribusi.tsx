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
import { Plus, Trash2, Pencil } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useZakatStats } from '@/hooks/useZakatStats';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

const SUMBER_OPTIONS = ['Zakat Fitrah', 'Zakat Mal', 'Infaq', 'Fidyah'];
const JENIS_BANTUAN_OPTIONS = ['Uang', 'Beras'];
const MAX_UANG = 999_999_999;
const MAX_BERAS = 99_999;

const emptyForm = {
  mustahik_id: '', jumlah: '', jumlah_beras: '', tanggal: new Date().toISOString().split('T')[0],
  sumber_zakat: 'Zakat Fitrah', jenis_bantuan: 'Uang',
};

function getAvailableFund(stats: any, sumber: string): number {
  const map: Record<string, number> = {
    'Zakat Fitrah': stats.totalFitrah,
    'Zakat Mal': stats.totalMal,
    'Infaq': stats.totalInfaq,
    'Fidyah': stats.totalFidyah,
  };
  return map[sumber] || 0;
}

function getAvailableBeras(stats: any): number {
  return stats.totalBeras || 0;
}

export default function Distribusi() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [mustahikList, setMustahikList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const { stats, fetchStats } = useZakatStats();
  const [distribusiPerSumber, setDistribusiPerSumber] = useState<Record<string, number>>({});
  const [distribusiBeras, setDistribusiBeras] = useState(0);
  const pag = usePagination(50);

  const fetchData = async () => {
    const [{ data: dist, count }, { data: mustahik }] = await Promise.all([
      supabase.from('distribusi').select('*, mustahik(nama, rt(nama_rt))', { count: 'exact' }).order('tanggal', { ascending: false }).range(pag.from, pag.to),
      supabase.from('mustahik').select('id, nama'),
    ]);
    setData(dist || []);
    pag.setTotalCount(count || 0);
    setMustahikList(mustahik || []);
    await fetchStats();

    const { data: allDist } = await supabase.from('distribusi').select('sumber_zakat, jumlah, jumlah_beras, jenis_bantuan');
    const totals: Record<string, number> = {};
    let totalBerasDist = 0;
    (allDist || []).forEach((d: any) => {
      const s = d.sumber_zakat || 'Zakat Fitrah';
      totals[s] = (totals[s] || 0) + Number(d.jumlah || 0);
      if (d.jenis_bantuan === 'Beras') totalBerasDist += Number(d.jumlah_beras || 0);
    });
    setDistribusiPerSumber(totals);
    setDistribusiBeras(totalBerasDist);
  };

  useEffect(() => { fetchData(); }, [pag.page]);

  const resetForm = () => { setForm({ ...emptyForm }); setEditItem(null); };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.mustahik_id) { toast.error('Pilih mustahik terlebih dahulu'); return; }
    if (form.jenis_bantuan === 'Uang' && !Number(form.jumlah)) { toast.error('Jumlah uang wajib diisi'); return; }
    if (form.jenis_bantuan === 'Beras' && !Number(form.jumlah_beras)) { toast.error('Jumlah beras wajib diisi'); return; }

    const jumlahUang = form.jenis_bantuan === 'Uang' ? Number(form.jumlah) : 0;

    if (!editItem && form.jenis_bantuan === 'Uang' && jumlahUang > 0) {
      const totalDana = getAvailableFund(stats, form.sumber_zakat);
      const sudahDisalurkan = distribusiPerSumber[form.sumber_zakat] || 0;
      const sisaDana = totalDana - sudahDisalurkan;
      if (jumlahUang > sisaDana) {
        toast.error(`Jumlah distribusi melebihi dana ${form.sumber_zakat} yang tersedia. Sisa dana: ${fmt(sisaDana)}`);
        return;
      }
    }
    if (!editItem && form.jenis_bantuan === 'Beras') {
      const sisaBeras = getAvailableBeras(stats) - distribusiBeras;
      if (Number(form.jumlah_beras) > sisaBeras) {
        toast.error(`Jumlah beras melebihi stok tersedia. Sisa beras: ${sisaBeras} Kg`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        mustahik_id: form.mustahik_id,
        jumlah: jumlahUang,
        jumlah_beras: form.jenis_bantuan === 'Beras' ? Number(form.jumlah_beras) : 0,
        tanggal: form.tanggal,
        created_by: user?.id,
        sumber_zakat: form.sumber_zakat,
        jenis_bantuan: form.jenis_bantuan,
      };

      if (editItem) {
        const { error } = await supabase.from('distribusi').update(payload).eq('id', editItem.id);
        if (error) { toast.error(friendlyError(error)); return; }
        toast.success('Data distribusi berhasil diperbarui ✓');
      } else {
        const { data: existing } = await supabase.from('distribusi')
          .select('id').eq('mustahik_id', form.mustahik_id).eq('sumber_zakat', form.sumber_zakat).eq('tanggal', form.tanggal).limit(1);
        if (existing && existing.length > 0) {
          toast.error('Distribusi untuk mustahik ini dengan jenis zakat yang sama pada tanggal ini sudah tercatat.');
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.from('distribusi').insert(payload);
        if (error) { toast.error(friendlyError(error)); return; }
        toast.success('Distribusi zakat berhasil dicatat ✓');
      }
      setOpen(false); resetForm(); fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('distribusi').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data distribusi berhasil dihapus ✓'); fetchData(); }
  };

  const openEdit = (d: any) => {
    setEditItem(d);
    setForm({
      mustahik_id: d.mustahik_id, jumlah: String(d.jumlah || 0), jumlah_beras: String(d.jumlah_beras || 0),
      tanggal: d.tanggal, sumber_zakat: d.sumber_zakat || 'Zakat Fitrah', jenis_bantuan: d.jenis_bantuan || 'Uang',
    });
    setOpen(true);
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const fmtJumlah = (d: any) => {
    if (d.jenis_bantuan === 'Beras') return `${Number(d.jumlah_beras) || 0} Kg`;
    return fmt(Number(d.jumlah) || 0);
  };

  const totalDana = getAvailableFund(stats, form.sumber_zakat);
  const sudahDisalurkan = distribusiPerSumber[form.sumber_zakat] || 0;
  const sisaDana = totalDana - sudahDisalurkan;

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus distribusi?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Distribusi Zakat</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Catat'} Distribusi</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Mustahik <span className="text-destructive">*</span></Label>
                <Select value={form.mustahik_id} onValueChange={v => setForm({ ...form, mustahik_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Mustahik" /></SelectTrigger>
                  <SelectContent>{mustahikList.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sumber Zakat <span className="text-destructive">*</span></Label>
                <Select value={form.sumber_zakat} onValueChange={v => setForm({ ...form, sumber_zakat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUMBER_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                {form.jenis_bantuan === 'Uang' && (
                  <p className="text-xs text-muted-foreground mt-1">Sisa dana {form.sumber_zakat}: <span className={sisaDana <= 0 ? 'text-destructive font-semibold' : 'font-semibold'}>{fmt(sisaDana)}</span></p>
                )}
              </div>
              <div><Label>Jenis Bantuan <span className="text-destructive">*</span></Label>
                <Select value={form.jenis_bantuan} onValueChange={v => setForm({ ...form, jenis_bantuan: v, jumlah: '', jumlah_beras: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_BANTUAN_OPTIONS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.jenis_bantuan === 'Uang' && (
                <div><Label>Jumlah Uang (Rp) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={0} max={MAX_UANG} value={form.jumlah} onChange={e => {
                    const v = Math.min(Number(e.target.value), MAX_UANG);
                    setForm({ ...form, jumlah: v > 0 ? String(v) : e.target.value });
                  }} placeholder="0" />
                </div>
              )}
              {form.jenis_bantuan === 'Beras' && (
                <div><Label>Jumlah Beras (Kg) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={0} max={MAX_BERAS} step="0.5" value={form.jumlah_beras} onChange={e => {
                    const v = Math.min(Number(e.target.value), MAX_BERAS);
                    setForm({ ...form, jumlah_beras: v > 0 ? String(v) : e.target.value });
                  }} placeholder="0" />
                </div>
              )}
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
              {editItem ? (
                <Button onClick={handleSubmit} className="w-full" disabled={submitting}>Simpan Perubahan</Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button className="w-full" disabled={submitting}>Distribusikan</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Konfirmasi Distribusi</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin mendistribusikan zakat ini?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleSubmit} disabled={submitting}>Ya, Distribusikan</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Mustahik</TableHead><TableHead>RT</TableHead><TableHead>Sumber</TableHead><TableHead>Jenis</TableHead><TableHead>Jumlah</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.mustahik?.nama || '-'}</TableCell>
                  <TableCell>{d.mustahik?.rt?.nama_rt || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{d.sumber_zakat || '-'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{d.jenis_bantuan || 'Uang'}</Badge></TableCell>
                  <TableCell>{fmtJumlah(d)}</TableCell>
                  <TableCell>{new Date(d.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={d.id} />
                    </div>
                  </TableCell>
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
              <div className="flex items-start justify-between">
                <div><p className="font-semibold text-base">{d.mustahik?.nama || '-'}</p><p className="text-sm text-muted-foreground">{d.mustahik?.rt?.nama_rt || '-'}</p></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <DeleteButton id={d.id} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-1">
                <Badge variant="outline">{d.sumber_zakat || '-'}</Badge>
                <Badge variant="secondary">{d.jenis_bantuan || 'Uang'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Jumlah:</span> <span className="font-medium">{fmtJumlah(d)}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(d.tanggal).toLocaleDateString('id-ID')}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>
    </AdminLayout>
  );
}
