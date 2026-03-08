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
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import KwitansiZakat, { KwitansiData, DetailZakatItem } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { downloadKwitansiPdf } from '@/lib/downloadKwitansi';
import ZakatDetailFields, { DetailForm, emptyDetail } from '@/components/ZakatDetailFields';

interface MuzakkiSuggestion {
  nama_muzakki: string;
  jumlah_jiwa: number;
  rt_id: string | null;
}

const emptyForm = () => ({
  nama_muzakki: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0],
  penerima: '', alamat: '', status_muzakki: 'RT',
});

export default function InputZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [detail, setDetail] = useState<DetailForm>(emptyDetail());
  const [showForm, setShowForm] = useState(false);
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const pag = usePagination(50);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MuzakkiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [{ data: transaksi, count }, { data: rt }] = await Promise.all([
      supabase.from('transaksi_zakat').select('*, rt(nama_rt), detail_zakat(*)', { count: 'exact' }).order('tanggal', { ascending: false }).range(pag.from, pag.to),
      supabase.from('rt').select('*').order('nama_rt'),
    ]);
    setData(transaksi || []);
    pag.setTotalCount(count || 0);
    setRtList(rt || []);
  };

  useEffect(() => { fetchData(); }, [pag.page]);

  const searchMuzakki = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('transaksi_zakat')
      .select('nama_muzakki, rt_id')
      .ilike('nama_muzakki', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    const seen = new Map<string, MuzakkiSuggestion>();
    (data || []).forEach(d => {
      if (!seen.has(d.nama_muzakki)) {
        seen.set(d.nama_muzakki, { nama_muzakki: d.nama_muzakki, jumlah_jiwa: 1, rt_id: d.rt_id });
      }
    });
    setSuggestions(Array.from(seen.values()));
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setForm(f => ({ ...f, nama_muzakki: value }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { searchMuzakki(value); setShowSuggestions(true); }, 300);
  };

  const selectMuzakki = (m: MuzakkiSuggestion) => {
    setForm(f => ({ ...f, nama_muzakki: m.nama_muzakki, rt_id: m.rt_id || '' }));
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

  const resetForm = () => { setForm(emptyForm()); setDetail(emptyDetail()); setSearchQuery(''); setShowSuggestions(false); };

  const buildDetails = (): DetailZakatItem[] => {
    const items: DetailZakatItem[] = [];
    if (detail.fitrah.enabled) items.push({ jenis_zakat: 'Zakat Fitrah', jumlah_uang: Number(detail.fitrah.jumlah_uang) || 0, jumlah_beras: Number(detail.fitrah.jumlah_beras) || 0, jumlah_jiwa: Number(detail.fitrah.jumlah_jiwa) || 1 });
    if (detail.mal.enabled) items.push({ jenis_zakat: 'Zakat Mal', jumlah_uang: Number(detail.mal.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.infaq.enabled) items.push({ jenis_zakat: 'Infaq', jumlah_uang: Number(detail.infaq.jumlah_uang) || 0, jumlah_beras: 0, jumlah_jiwa: 0 });
    if (detail.fidyah.enabled) items.push({ jenis_zakat: 'Fidyah', jumlah_uang: Number(detail.fidyah.jumlah_uang) || 0, jumlah_beras: Number(detail.fidyah.jumlah_beras) || 0, jumlah_jiwa: 0 });
    return items;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.nama_muzakki.trim()) { toast.error('Nama muzakki wajib diisi'); return; }
    const items = buildDetails();
    if (items.length === 0) { toast.error('Pilih minimal satu jenis zakat'); return; }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase.from('transaksi_zakat').insert({
        nama_muzakki: form.nama_muzakki.trim(),
        rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
        tanggal: form.tanggal, created_by: user?.id, status_muzakki: form.status_muzakki,
      }).select('id, nomor_kwitansi').single();
      if (error) { toast.error(friendlyError(error)); return; }

      const detailRows = items.map(d => ({ transaksi_id: inserted.id, ...d }));
      const { error: detailError } = await supabase.from('detail_zakat').insert(detailRows);
      if (detailError) { toast.error(friendlyError(detailError)); return; }

      toast.success(`Zakat ${form.nama_muzakki} berhasil disimpan`);
      setKwitansiData({ nomor: inserted.nomor_kwitansi, nama_muzakki: form.nama_muzakki, details: items, tanggal: form.tanggal, penerima: form.penerima || form.nama_muzakki });
      setKwitansiOpen(true);
      resetForm();
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const details = item.detail_zakat || [];
    setForm({ nama_muzakki: item.nama_muzakki, rt_id: item.rt_id || '', tanggal: item.tanggal, penerima: '', alamat: '', status_muzakki: item.status_muzakki || 'RT' });
    const d = emptyDetail();
    details.forEach((det: any) => {
      if (det.jenis_zakat === 'Zakat Fitrah') { d.fitrah = { enabled: true, jumlah_jiwa: String(det.jumlah_jiwa || 1), harga_beras: '15000', jumlah_uang: String(det.jumlah_uang || 0), jumlah_beras: String(det.jumlah_beras || 0) }; }
      if (det.jenis_zakat === 'Zakat Mal') { d.mal = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0) }; }
      if (det.jenis_zakat === 'Infaq' || det.jenis_zakat === 'Shodaqoh') { d.infaq = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0) }; }
      if (det.jenis_zakat === 'Fidyah') { d.fidyah = { enabled: true, jumlah_uang: String(det.jumlah_uang || 0), jumlah_beras: String(det.jumlah_beras || 0) }; }
    });
    setDetail(d);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const items = buildDetails();
    if (items.length === 0) { toast.error('Pilih minimal satu jenis zakat'); return; }

    const { error } = await supabase.from('transaksi_zakat').update({
      nama_muzakki: form.nama_muzakki.trim(),
      rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null,
      tanggal: form.tanggal, status_muzakki: form.status_muzakki,
    }).eq('id', editItem.id);
    if (error) { toast.error(friendlyError(error)); return; }

    // Delete old details, insert new
    await supabase.from('detail_zakat').delete().eq('transaksi_id', editItem.id);
    const detailRows = items.map(d => ({ transaksi_id: editItem.id, ...d }));
    const { error: detailError } = await supabase.from('detail_zakat').insert(detailRows);
    if (detailError) { toast.error(friendlyError(detailError)); return; }

    toast.success('Data zakat berhasil diperbarui ✓');
    setEditOpen(false); setEditItem(null); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transaksi_zakat').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data zakat berhasil dihapus ✓'); fetchData(); }
  };

  const toKwitansiData = (t: any): KwitansiData => ({
    nomor: t.nomor_kwitansi || 0, nama_muzakki: t.nama_muzakki,
    details: (t.detail_zakat || []).map((d: any) => ({ jenis_zakat: d.jenis_zakat, jumlah_uang: Number(d.jumlah_uang) || 0, jumlah_beras: Number(d.jumlah_beras) || 0, jumlah_jiwa: Number(d.jumlah_jiwa) || 0 })),
    tanggal: t.tanggal, penerima: t.nama_muzakki,
  });

  const showKwitansi = (t: any) => { setKwitansiData(toKwitansiData(t)); setKwitansiOpen(true); };
  const handleDownloadKwitansi = (t: any) => { downloadKwitansiPdf(toKwitansiData(t)); };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const getJenisLabels = (t: any) => (t.detail_zakat || []).map((d: any) => d.jenis_zakat).join(', ');
  const getTotalUang = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_uang) || 0), 0);
  const getTotalBeras = (t: any) => (t.detail_zakat || []).reduce((s: number, d: any) => s + (Number(d.jumlah_beras) || 0), 0);

  const handleDetailChange = useCallback((updater: (prev: DetailForm) => DetailForm) => {
    setDetail(updater);
  }, []);

  const DeleteButton = ({ id }: { id: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" title="Hapus"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus data zakat?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen dan tidak dapat dikembalikan.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          <CardHeader><CardTitle className="text-lg">Form Input Zakat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Nama Muzakki with search */}
            <div className="relative" ref={suggestionsRef}>
              <Label>Nama Muzakki <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery || form.nama_muzakki} onChange={e => handleSearchInput(e.target.value)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} placeholder="Ketik nama untuk mencari..." className="pl-9" />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((m, i) => (
                    <button key={`${m.nama_muzakki}-${i}`} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors" onClick={() => selectMuzakki(m)}>
                      <span className="font-medium">{m.nama_muzakki}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Muzakki */}
            <div>
              <Label>Status Muzakki</Label>
              <Select value={form.status_muzakki} onValueChange={v => setForm({ ...form, status_muzakki: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="RT">RT</SelectItem><SelectItem value="Jamaah">Jamaah</SelectItem></SelectContent>
              </Select>
            </div>

            {form.status_muzakki === 'RT' && (
              <div>
                <Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <ZakatDetailFields detail={detail} onChange={handleDetailChange} idPrefix="panitia" />

            <div><Label>Tanggal Transaksi</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting}><Plus className="w-4 h-4 mr-1" />Simpan</Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Jenis</TableHead><TableHead>Total Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.nomor_kwitansi}</TableCell>
                  <TableCell>{t.nama_muzakki}</TableCell>
                  <TableCell><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>{t.status_muzakki || 'RT'}</span></TableCell>
                  <TableCell>{getJenisLabels(t)}</TableCell>
                  <TableCell>{fmt(getTotalUang(t))}</TableCell>
                  <TableCell>{getTotalBeras(t)} Kg</TableCell>
                  <TableCell>{new Date(t.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => showKwitansi(t)} title="Lihat Kwitansi"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadKwitansi(t)} title="Download Kwitansi"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <DeleteButton id={t.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4"><PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} /></div>
        </CardContent>
      </Card>

      {/* Riwayat - Mobile */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">#{t.nomor_kwitansi} — {t.nama_muzakki}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(t.detail_zakat || []).map((d: any, i: number) => (
                      <span key={i} className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d.jenis_zakat}</span>
                    ))}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${t.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{t.status_muzakki || 'RT'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => showKwitansi(t)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadKwitansi(t)}><Download className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <DeleteButton id={t.id} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Uang:</span> <span className="font-medium">{fmt(getTotalUang(t))}</span></div>
                <div><span className="text-muted-foreground">Beras:</span> <span className="font-medium">{getTotalBeras(t)} Kg</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(t.tanggal).toLocaleDateString('id-ID')}</span></div>
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
          <div className="space-y-4">
            <div><Label>Nama Muzakki</Label><Input value={form.nama_muzakki} onChange={e => setForm({ ...form, nama_muzakki: e.target.value })} /></div>
            <div>
              <Label>Status Muzakki</Label>
              <Select value={form.status_muzakki} onValueChange={v => setForm({ ...form, status_muzakki: v, rt_id: v === 'Jamaah' ? '' : form.rt_id })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="RT">RT</SelectItem><SelectItem value="Jamaah">Jamaah</SelectItem></SelectContent>
              </Select>
            </div>
            {form.status_muzakki === 'RT' && (
              <div><Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <ZakatDetailFields detail={detail} onChange={handleDetailChange} idPrefix="panitia-edit" />
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button className="w-full mt-4">Simpan Perubahan</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Simpan perubahan?</AlertDialogTitle><AlertDialogDescription>Data zakat akan diperbarui.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleUpdate}>Simpan</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </PanitiaLayout>
  );
}
