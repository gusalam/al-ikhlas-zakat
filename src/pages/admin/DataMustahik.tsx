import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
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
import { Plus, Trash2, Pencil, FileText, Search } from 'lucide-react';
import { exportPdf } from '@/lib/exportPdf';
import { friendlyError } from '@/lib/errorHandler';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

const KATEGORI_OPTIONS = ['Fakir', 'Miskin', 'Gharimin', 'Muallaf', 'Sabilillah', 'Amil', 'Riqab', 'Ibnu Sabil'];

const emptyForm = { nama: '', rt_id: '', kategori: '', alamat: '', status: 'RT' };

export default function DataMustahik() {
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const pag = usePagination(50);
  const [search, setSearch] = useState('');
  const [filterRt, setFilterRt] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const debouncedSearch = useDebounce(search, 400);

  const fetchData = async () => {
    let query = supabase.from('mustahik').select('*, rt(nama_rt)', { count: 'exact' }).order('nama');
    if (debouncedSearch.trim()) query = query.ilike('nama', `%${debouncedSearch.trim()}%`);
    if (filterRt !== 'all') query = query.eq('rt_id', filterRt);
    if (filterKategori !== 'all') query = query.eq('kategori', filterKategori);
    const [{ data: m, count }, { data: rt }] = await Promise.all([
      query.range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(m || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page, debouncedSearch, filterRt, filterKategori]);

  const resetForm = () => { setForm({ ...emptyForm }); setEditItem(null); };

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

    if (editItem) {
      const { error } = await supabase.from('mustahik').update(payload).eq('id', editItem.id);
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data mustahik berhasil diperbarui ✓');
    } else {
      const { error } = await supabase.from('mustahik').insert(payload);
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data mustahik berhasil ditambahkan ✓');
    }
    setOpen(false); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('mustahik').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data mustahik berhasil dihapus ✓'); fetchData(); }
  };

  const openEdit = (m: any) => {
    setEditItem(m);
    setForm({ nama: m.nama, rt_id: m.rt_id || '', kategori: m.kategori || '', alamat: m.alamat || '', status: m.status || 'RT' });
    setOpen(true);
  };

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus mustahik?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Data Mustahik</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama mustahik..." value={search} onChange={e => { setSearch(e.target.value); pag.goTo(1); }} className="pl-9 h-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => exportPdf({
            title: 'Data Mustahik — Masjid Al-Ikhlas',
            subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            headers: ['No', 'Nama', 'Status', 'RT', 'Kategori', 'Alamat'],
            rows: data.map((m, i) => [String(i + 1), m.nama, m.status || '-', m.rt?.nama_rt || '-', m.kategori || '-', m.alamat || '-']),
            filename: 'Data_Mustahik_Al_Ikhlas.pdf',
          })}><FileText className="w-4 h-4 mr-1" />Export PDF</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Tambah</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} Mustahik</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
                <div><Label>Alamat</Label><Input value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat mustahik" /></div>
                <div><Label>Status Penerima</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RT">RT</SelectItem>
                      <SelectItem value="Jamaah">Jamaah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.status === 'RT' && (
                  <div><Label>RT <span className="text-destructive">*</span></Label>
                    <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                      <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {form.status === 'Jamaah' && (
                  <div><Label>RT (opsional)</Label>
                    <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih RT (opsional)" /></SelectTrigger>
                      <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Kategori <span className="text-destructive">*</span></Label>
                  <Select value={form.kategori} onValueChange={v => setForm({ ...form, kategori: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>{KATEGORI_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">{editItem ? 'Simpan' : 'Tambah'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>RT</TableHead><TableHead>Kategori</TableHead><TableHead>Alamat</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.nama}</TableCell>
                  <TableCell>{m.status || '-'}</TableCell>
                  <TableCell>{m.rt?.nama_rt || '-'}</TableCell>
                  <TableCell>{m.kategori || '-'}</TableCell>
                  <TableCell>{m.alamat || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={m.id} />
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
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data mustahik</p>}
        {data.map(m => (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{m.nama}</p>
                  <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">{m.kategori || '-'}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  <DeleteButton id={m.id} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{m.status || '-'}</span></div>
                <div><span className="text-muted-foreground">RT:</span> <span className="font-medium">{m.rt?.nama_rt || '-'}</span></div>
              </div>
              {m.alamat && <p className="text-sm text-muted-foreground">{m.alamat}</p>}
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>
    </AdminLayout>
  );
}
