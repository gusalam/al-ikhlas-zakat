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
import { friendlyError } from '@/lib/errorHandler';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

const KATEGORI_OPTIONS = ['Fakir', 'Miskin', 'Gharimin', 'Muallaf', 'Sabilillah', 'Amil', 'Riqab', 'Ibnu Sabil'];

const emptyForm = { nama: '', rt_id: '', kategori: '', alamat: '', status: 'RT' };

export default function PanitiaMustahik() {
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const pag = usePagination(50);

  const fetchData = async () => {
    const [{ data: m, count }, { data: rt }] = await Promise.all([
      supabase.from('mustahik').select('*, rt(nama_rt)', { count: 'exact' }).order('nama').range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(m || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page]);

  const handleSubmit = async () => {
    if (!form.nama.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!form.kategori) { toast.error('Kategori wajib dipilih'); return; }
    if (form.status === 'RT' && !form.rt_id) { toast.error('RT wajib dipilih jika status RT'); return; }

    const payload: any = {
      nama: form.nama.trim(),
      rt_id: form.rt_id || null,
      kategori: form.kategori || null,
      alamat: form.alamat.trim() || null,
      status: form.status,
    };

    const { error } = await supabase.from('mustahik').insert(payload);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Data mustahik berhasil ditambahkan ✓');
    setOpen(false); setForm({ ...emptyForm }); fetchData();
  };

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Data Mustahik</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Mustahik</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Alamat</Label><Input value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat mustahik" className="h-12 text-base" /></div>
              <div><Label>Status Penerima</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RT">RT</SelectItem>
                    <SelectItem value="Jamaah">Jamaah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === 'RT' && (
                <div><Label>RT <span className="text-destructive">*</span></Label>
                  <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                    <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.status === 'Jamaah' && (
                <div><Label>RT (opsional)</Label>
                  <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT (opsional)" /></SelectTrigger>
                    <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.kategori} onValueChange={v => setForm({ ...form, kategori: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full h-12">Tambah</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>RT</TableHead><TableHead>Kategori</TableHead><TableHead>Alamat</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.nama}</TableCell>
                  <TableCell>{m.status || '-'}</TableCell>
                  <TableCell>{m.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{m.kategori || '-'}</TableCell>
                  <TableCell>{m.alamat || '-'}</TableCell>
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
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data mustahik</p>}
        {data.map(m => (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-1">
              <p className="font-semibold text-base">{m.nama}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span><span className="text-muted-foreground">Status:</span> {m.status || '-'}</span>
                <span><span className="text-muted-foreground">RT:</span> {m.rt?.nama_rt || '-'}</span>
                <span><span className="text-muted-foreground">Kategori:</span> {m.kategori || '-'}</span>
              </div>
              {m.alamat && <p className="text-sm text-muted-foreground">{m.alamat}</p>}
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>
    </PanitiaLayout>
  );
}
