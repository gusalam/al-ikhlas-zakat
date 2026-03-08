import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Plus, FileText, Search } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import KwitansiZakat, { KwitansiData } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';

interface MuzakkiSuggestion {
  nama_muzakki: string;
  jumlah_jiwa: number;
  rt_id: string | null;
}

export default function InputZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], jumlah_jiwa: '1', penerima: '', harga_beras: '15000', kategori_muzakki: 'rt' as 'rt' | 'jamaah' });
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const pag = usePagination(50);

  // Muzakki search state
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

  // Live search muzakki
  const searchMuzakki = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    const { data } = await supabase
      .from('zakat')
      .select('nama_muzakki, jumlah_jiwa, rt_id')
      .ilike('nama_muzakki', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    // Deduplicate by nama_muzakki, keep latest
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
    const jiwa = String(m.jumlah_jiwa || 1);
    const beras = (Number(jiwa) || 1) * 2.5;
    const uang = beras * (Number(form.harga_beras) || 0);
    const isRt = !!m.rt_id;
    setForm(f => ({
      ...f,
      nama_muzakki: m.nama_muzakki,
      jumlah_jiwa: jiwa,
      rt_id: m.rt_id || '',
      kategori_muzakki: isRt ? 'rt' : 'jamaah',
      ...(f.jenis_zakat === 'Zakat Fitrah' ? { jumlah_beras: String(beras), jumlah_uang: String(uang) } : {}),
    }));
    setSearchQuery(m.nama_muzakki);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async () => {
    const { data: inserted, error } = await supabase.from('zakat').insert({
      nama_muzakki: form.nama_muzakki, jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
      rt_id: form.rt_id || null, tanggal: form.tanggal, created_by: user?.id,
      jumlah_jiwa: Number(form.jumlah_jiwa) || 1,
    }).select('nomor_kwitansi').single();
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success('Data zakat berhasil disimpan ✓');
    setOpen(false);

    setKwitansiData({
      nomor: inserted?.nomor_kwitansi || 0, nama_muzakki: form.nama_muzakki,
      jumlah_jiwa: Number(form.jumlah_jiwa) || 1, jenis_zakat: form.jenis_zakat,
      jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0,
      tanggal: form.tanggal, penerima: form.penerima || form.nama_muzakki,
    });
    setKwitansiOpen(true);

    setForm({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], jumlah_jiwa: '1', penerima: '', harga_beras: '15000', kategori_muzakki: 'rt' });
    setSearchQuery('');
    fetchData();
  };

  const showKwitansi = (z: any) => {
    setKwitansiData({ nomor: z.nomor_kwitansi || 0, nama_muzakki: z.nama_muzakki, jumlah_jiwa: z.jumlah_jiwa || 1, jenis_zakat: z.jenis_zakat, jumlah_uang: Number(z.jumlah_uang) || 0, jumlah_beras: Number(z.jumlah_beras) || 0, tanggal: z.tanggal, penerima: z.nama_muzakki });
    setKwitansiOpen(true);
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <PanitiaLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Input Zakat</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearchQuery(''); setShowSuggestions(false); } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Input Zakat Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Muzakki search with auto-fill */}
              <div className="relative" ref={suggestionsRef}>
                <Label>Nama Muzakki</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery || form.nama_muzakki}
                    onChange={e => handleSearchInput(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Ketik nama untuk mencari..."
                    className="h-12 text-base pl-9"
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((m, i) => (
                      <button
                        key={`${m.nama_muzakki}-${i}`}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                        onClick={() => selectMuzakki(m)}
                      >
                        <span className="font-medium">{m.nama_muzakki}</span>
                        <span className="text-muted-foreground ml-2">({m.jumlah_jiwa} jiwa)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div><Label>Jumlah Jiwa</Label><Input type="number" min="1" value={form.jumlah_jiwa} onChange={e => {
                const jiwa = e.target.value;
                if (form.jenis_zakat === 'Zakat Fitrah') {
                  const beras = (Number(jiwa) || 1) * 2.5;
                  const uang = beras * (Number(form.harga_beras) || 0);
                  setForm({ ...form, jumlah_jiwa: jiwa, jumlah_beras: String(beras), jumlah_uang: String(uang) });
                } else { setForm({ ...form, jumlah_jiwa: jiwa }); }
              }} className="h-12 text-base" /></div>
              <div><Label>Kategori</Label>
                <RadioGroup value={form.kategori_muzakki} onValueChange={v => setForm({ ...form, kategori_muzakki: v as 'rt' | 'jamaah', rt_id: v === 'jamaah' ? '' : form.rt_id })} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="rt" id="kat-rt" /><Label htmlFor="kat-rt" className="cursor-pointer">RT</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="jamaah" id="kat-jamaah" /><Label htmlFor="kat-jamaah" className="cursor-pointer">Jamaah</Label></div>
                </RadioGroup>
              </div>
              {form.kategori_muzakki === 'rt' && (
              <div><Label>RT</Label>
                <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rtList.map(r => <SelectItem key={r.id} value={r.id}>{r.nama_rt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              )}
              <div><Label>Jenis Zakat</Label>
                <Select value={form.jenis_zakat} onValueChange={v => {
                  if (v === 'Zakat Fitrah') {
                    const jiwa = Number(form.jumlah_jiwa) || 1;
                    const beras = jiwa * 2.5;
                    const uang = beras * (Number(form.harga_beras) || 0);
                    setForm({ ...form, jenis_zakat: v, jumlah_beras: String(beras), jumlah_uang: String(uang) });
                  } else { setForm({ ...form, jenis_zakat: v }); }
                }}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zakat Fitrah">Zakat Fitrah</SelectItem>
                    <SelectItem value="Zakat Mal">Zakat Mal</SelectItem>
                    <SelectItem value="Infaq">Infaq</SelectItem>
                    <SelectItem value="Fidyah">Fidyah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.jenis_zakat === 'Zakat Fitrah' && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-primary">Kalkulasi Zakat Fitrah</p>
                    <div><Label>Harga Beras per Kg (Rp)</Label><Input type="number" value={form.harga_beras} onChange={e => {
                      const harga = e.target.value;
                      const jiwa = Number(form.jumlah_jiwa) || 1;
                      const beras = jiwa * 2.5;
                      const uang = beras * (Number(harga) || 0);
                      setForm({ ...form, harga_beras: harga, jumlah_beras: String(beras), jumlah_uang: String(uang) });
                    }} className="h-12 text-base" /></div>
                    <p className="text-xs text-muted-foreground">Rumus: {form.jumlah_jiwa} jiwa × 2,5 Kg × Rp {new Intl.NumberFormat('id-ID').format(Number(form.harga_beras) || 0)} = <strong>Rp {new Intl.NumberFormat('id-ID').format((Number(form.jumlah_jiwa) || 1) * 2.5 * (Number(form.harga_beras) || 0))}</strong></p>
                  </CardContent>
                </Card>
              )}
              <div><Label>Jumlah Uang (Rp)</Label><Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Jumlah Beras (Kg)</Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Nama Penerima</Label><Input value={form.penerima} onChange={e => setForm({ ...form, penerima: e.target.value })} placeholder="Kosongkan jika sama dengan muzakki" className="h-12 text-base" /></div>
              <Button onClick={handleSubmit} className="w-full h-12">Simpan Zakat</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(z => (
                <TableRow key={z.id}>
                  <TableCell>{z.nomor_kwitansi}</TableCell><TableCell>{z.nama_muzakki}</TableCell><TableCell>{z.jenis_zakat}</TableCell><TableCell>{fmt(Number(z.jumlah_uang))}</TableCell><TableCell>{z.jumlah_beras} Kg</TableCell><TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => showKwitansi(z)}><FileText className="w-4 h-4 mr-1" />Kwitansi</Button></TableCell>
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
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(z => (
          <Card key={z.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div><p className="font-semibold text-base">#{z.nomor_kwitansi} — {z.nama_muzakki}</p><span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">{z.jenis_zakat}</span></div>
                <Button size="sm" variant="outline" onClick={() => showKwitansi(z)}><FileText className="w-4 h-4" /></Button>
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

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </PanitiaLayout>
  );
}
