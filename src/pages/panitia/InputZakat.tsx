import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PanitiaLayout from '@/components/layouts/PanitiaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Search, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import KwitansiZakat, { KwitansiData } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { downloadKwitansiPdf } from '@/lib/downloadKwitansi';

interface MuzakkiSuggestion {
  nama_muzakki: string;
  jumlah_jiwa: number;
  rt_id: string | null;
}

const emptyForm = () => ({
  nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '',
  rt_id: '', tanggal: new Date().toISOString().split('T')[0], jumlah_jiwa: '1',
  penerima: '', metode_fitrah: 'uang' as 'uang' | 'beras', alamat: '',
  status_muzakki: 'RT',
});

export default function InputZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const pag = usePagination(50);

  // Muzakki search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MuzakkiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [{ data: zakat, count }, { data: rt }] = await Promise.all([
      supabase.from('zakat').select('*, rt(nama_rt)', { count: 'exact' }).order('tanggal', { ascending: false }).range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(zakat || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page]);

  const searchMuzakki = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('zakat')
      .select('nama_muzakki, jumlah_jiwa, rt_id')
      .ilike('nama_muzakki', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    const seen = new Map<string, MuzakkiSuggestion>();
    (data || []).forEach(d => {
      if (!seen.has(d.nama_muzakki)) {
        seen.set(d.nama_muzakki, { nama_muzakki: d.nama_muzakki, jumlah_jiwa: d.jumlah_jiwa, rt_id: d.rt_id });
      }
    });
    setSuggestions(Array.from(seen.values()));
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setForm(f => ({ ...f, nama_muzakki: value }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchMuzakki(value);
      setShowSuggestions(true);
    }, 300);
  };

  const selectMuzakki = (m: MuzakkiSuggestion) => {
    setForm(f => ({
      ...f,
      nama_muzakki: m.nama_muzakki,
      jumlah_jiwa: String(Number(m.jumlah_jiwa) || 1),
      rt_id: m.rt_id || '',
    }));
    setSearchQuery(m.nama_muzakki);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.nama_muzakki.trim()) { toast.error('Nama muzakki wajib diisi'); return; }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase.from('zakat').insert({
        nama_muzakki: form.nama_muzakki.trim(), jenis_zakat: form.jenis_zakat,
        jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
        rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null, tanggal: form.tanggal, created_by: user?.id,
        jumlah_jiwa: Number(form.jumlah_jiwa) || 1, status_muzakki: form.status_muzakki,
      }).select('nomor_kwitansi').single();
      if (error) { toast.error(friendlyError(error)); return; }

      toast.success(`Zakat ${form.nama_muzakki} berhasil disimpan`);
      setKwitansiData({
        nomor: inserted?.nomor_kwitansi || 0, nama_muzakki: form.nama_muzakki,
        jumlah_jiwa: Number(form.jumlah_jiwa) || 1, jenis_zakat: form.jenis_zakat,
        jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
        tanggal: form.tanggal, penerima: form.penerima || form.nama_muzakki,
      });
      setKwitansiOpen(true);
      resetForm();
      setShowForm(false);
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      nama_muzakki: item.nama_muzakki,
      jenis_zakat: item.jenis_zakat,
      jumlah_uang: String(item.jumlah_uang || 0),
      jumlah_beras: String(item.jumlah_beras || 0),
      rt_id: item.rt_id || '',
      tanggal: item.tanggal,
      jumlah_jiwa: String(item.jumlah_jiwa || 1),
      penerima: '',
      metode_fitrah: Number(item.jumlah_beras) > 0 ? 'beras' : 'uang',
      alamat: '',
      status_muzakki: item.status_muzakki || 'RT',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const { error } = await supabase.from('zakat').update({
      nama_muzakki: form.nama_muzakki.trim(),
      jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0,
      jumlah_beras: Number(form.jumlah_beras) || 0,
      rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
      tanggal: form.tanggal,
      jumlah_jiwa: Number(form.jumlah_jiwa) || 1,
      status_muzakki: form.status_muzakki,
    }).eq('id', editItem.id);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Data zakat berhasil diperbarui ✓');
    setEditOpen(false);
    setEditItem(null);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('zakat').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data zakat berhasil dihapus ✓'); fetchData(); }
  };

  const toKwitansiData = (z: any) => ({
    nomor: z.nomor_kwitansi || 0, nama_muzakki: z.nama_muzakki, jumlah_jiwa: z.jumlah_jiwa || 1,
    jenis_zakat: z.jenis_zakat, jumlah_uang: Number(z.jumlah_uang) || 0, jumlah_beras: Number(z.jumlah_beras) || 0,
    tanggal: z.tanggal, penerima: z.nama_muzakki,
  });

  const showKwitansi = (z: any) => {
    setKwitansiData(toKwitansiData(z));
    setKwitansiOpen(true);
  };

  const handleDownloadKwitansi = (z: any) => {
    downloadKwitansiPdf(toKwitansiData(z));
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Hapus"><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus data zakat?</AlertDialogTitle>
          <AlertDialogDescription>Data ini akan dihapus permanen dan tidak dapat dikembalikan.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const EditFormFields = () => (
    <div className="space-y-4">
      <div><Label>Nama Muzakki</Label><Input value={form.nama_muzakki} onChange={e => setForm({ ...form, nama_muzakki: e.target.value })} /></div>
      <div>
        <Label>Status Muzakki</Label>
        <Select value={form.status_muzakki} onValueChange={v => setForm({ ...form, status_muzakki: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RT">RT</SelectItem>
            <SelectItem value="Jamaah">Jamaah</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {form.status_muzakki === 'RT' && (
          <div>
            <Label>RT</Label>
            <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
              <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div><Label>Jumlah Jiwa</Label><Input type="number" min="1" value={form.jumlah_jiwa} onChange={e => setForm({ ...form, jumlah_jiwa: e.target.value })} /></div>
      </div>
      <div>
        <Label>Jenis Zakat</Label>
        <Select value={form.jenis_zakat} onValueChange={v => setForm({ ...form, jenis_zakat: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Zakat Fitrah">Zakat Fitrah</SelectItem>
            <SelectItem value="Zakat Mal">Zakat Mal</SelectItem>
            <SelectItem value="Infaq">Infaq</SelectItem>
            <SelectItem value="Fidyah">Fidyah</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Metode Pembayaran</Label>
        <RadioGroup value={form.metode_fitrah} onValueChange={v => setForm({ ...form, metode_fitrah: v as 'uang' | 'beras' })} className="flex gap-4 mt-2">
          <div className="flex items-center space-x-2"><RadioGroupItem value="uang" id="edit-m-uang" /><Label htmlFor="edit-m-uang" className="cursor-pointer">Uang</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="beras" id="edit-m-beras" /><Label htmlFor="edit-m-beras" className="cursor-pointer">Beras</Label></div>
        </RadioGroup>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Jumlah Uang (Rp)</Label><Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} placeholder="0" /></div>
        <div><Label>Jumlah Beras (Kg)</Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} placeholder="0" /></div>
      </div>
      <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
    </div>
  );

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Input Zakat</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />{showForm ? 'Tutup Form' : 'Tambah Zakat'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Form Input Zakat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nama Muzakki with search */}
            <div className="relative" ref={suggestionsRef}>
              <Label>Nama Muzakki <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery || form.nama_muzakki}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Ketik nama untuk mencari..."
                  className="pl-9"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((m, i) => (
                    <button key={`${m.nama_muzakki}-${i}`} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors" onClick={() => selectMuzakki(m)}>
                      <span className="font-medium">{m.nama_muzakki}</span>
                      <span className="text-muted-foreground ml-2">({m.jumlah_jiwa} jiwa)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alamat */}
            <div>
              <Label>Alamat</Label>
              <Input value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat muzakki" />
            </div>

            {/* RT & Jumlah Jiwa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah Jiwa</Label>
                <Input type="number" min="1" value={form.jumlah_jiwa} onChange={e => setForm({ ...form, jumlah_jiwa: e.target.value })} />
              </div>
            </div>

            {/* Jenis Zakat */}
            <div>
              <Label>Jenis Zakat</Label>
              <Select value={form.jenis_zakat} onValueChange={v => setForm({ ...form, jenis_zakat: v, jumlah_uang: '', jumlah_beras: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zakat Fitrah">Zakat Fitrah</SelectItem>
                  <SelectItem value="Zakat Mal">Zakat Mal</SelectItem>
                  <SelectItem value="Infaq">Infaq</SelectItem>
                  <SelectItem value="Fidyah">Fidyah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metode Pembayaran */}
            <div>
              <Label>Metode Pembayaran</Label>
              <RadioGroup value={form.metode_fitrah} onValueChange={v => setForm({ ...form, metode_fitrah: v as 'uang' | 'beras' })} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="uang" id="m-uang" /><Label htmlFor="m-uang" className="cursor-pointer">Uang</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="beras" id="m-beras" /><Label htmlFor="m-beras" className="cursor-pointer">Beras</Label></div>
              </RadioGroup>
            </div>

            {/* Jumlah Uang / Beras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.metode_fitrah === 'uang' && (
                <div>
                  <Label>Jumlah Uang (Rp)</Label>
                  <Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} placeholder="0" />
                </div>
              )}
              {form.metode_fitrah === 'beras' && (
                <div>
                  <Label>Jumlah Beras (Kg)</Label>
                  <Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} placeholder="0" />
                </div>
              )}
            </div>

            {/* Tanggal */}
            <div>
              <Label>Tanggal Transaksi</Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} />
            </div>

            {/* Tombol Simpan */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                <Plus className="w-4 h-4 mr-1" />Simpan
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat Zakat - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(z => (
                <TableRow key={z.id}>
                  <TableCell>{z.nomor_kwitansi}</TableCell><TableCell>{z.nama_muzakki}</TableCell><TableCell>{z.jenis_zakat}</TableCell><TableCell>{fmt(Number(z.jumlah_uang))}</TableCell><TableCell>{z.jumlah_beras} Kg</TableCell><TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => showKwitansi(z)} title="Lihat Kwitansi"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadKwitansi(z)} title="Download Kwitansi"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(z)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={z.id} />
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

      {/* Riwayat Zakat - Mobile */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(z => (
          <Card key={z.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div><p className="font-semibold text-base">#{z.nomor_kwitansi} — {z.nama_muzakki}</p><span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">{z.jenis_zakat}</span></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showKwitansi(z)} title="Lihat"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadKwitansi(z)} title="Download"><Download className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(z)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  <DeleteButton id={z.id} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Uang:</span> <span className="font-medium">{fmt(Number(z.jumlah_uang))}</span></div>
                <div><span className="text-muted-foreground">Beras:</span> <span className="font-medium">{z.jumlah_beras} Kg</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(z.tanggal).toLocaleDateString('id-ID')}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { resetForm(); setEditItem(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Data Zakat</DialogTitle></DialogHeader>
          <EditFormFields />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full mt-4">Simpan Perubahan</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Simpan perubahan?</AlertDialogTitle>
                <AlertDialogDescription>Data zakat akan diperbarui dengan data yang baru.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdate}>Simpan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </PanitiaLayout>
  );
}
