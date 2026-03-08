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
import { Plus, Trash2, Pencil, FileText, Eye, Download } from 'lucide-react';
import { friendlyError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { exportPdf } from '@/lib/exportPdf';
import KwitansiZakat, { KwitansiData } from '@/components/KwitansiZakat';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { downloadKwitansiPdf } from '@/lib/downloadKwitansi';

export default function DataZakat() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [rtList, setRtList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], harga_beras: '15000', status_muzakki: 'RT', jumlah_jiwa: '1' });
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [kwitansiData, setKwitansiData] = useState<KwitansiData | null>(null);
  const pag = usePagination(50);

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

  const resetForm = () => setForm({ nama_muzakki: '', jenis_zakat: 'Zakat Fitrah', jumlah_uang: '', jumlah_beras: '', rt_id: '', tanggal: new Date().toISOString().split('T')[0], harga_beras: '15000', status_muzakki: 'RT', jumlah_jiwa: '1' });

  const handleSubmit = async () => {
    const payload = { nama_muzakki: form.nama_muzakki, jenis_zakat: form.jenis_zakat, jumlah_uang: Number(form.jumlah_uang) || 0, jumlah_beras: Number(form.jumlah_beras) || 0, rt_id: form.status_muzakki === 'RT' ? (form.rt_id || null) : null, tanggal: form.tanggal, created_by: user?.id, status_muzakki: form.status_muzakki, jumlah_jiwa: Number(form.jumlah_jiwa) || 1 };
    if (editItem) {
      const { error } = await supabase.from('zakat').update(payload).eq('id', editItem.id);
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data zakat berhasil diperbarui ✓');
    } else {
      const { error } = await supabase.from('zakat').insert(payload);
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Data zakat berhasil ditambahkan ✓');
    }
    setOpen(false); resetForm(); setEditItem(null); fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('zakat').delete().eq('id', id);
    if (error) toast.error(friendlyError(error));
    else { toast.success('Data zakat berhasil dihapus ✓'); fetchData(); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ nama_muzakki: item.nama_muzakki, jenis_zakat: item.jenis_zakat, jumlah_uang: String(item.jumlah_uang), jumlah_beras: String(item.jumlah_beras), rt_id: item.rt_id || '', tanggal: item.tanggal, harga_beras: '15000', status_muzakki: item.status_muzakki || 'RT', jumlah_jiwa: String(item.jumlah_jiwa || 1) });
    setOpen(true);
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
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Hapus data zakat?</AlertDialogTitle><AlertDialogDescription>Data ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(id)}>Hapus</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-bold">Data Zakat</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportPdf({
            title: 'Data Zakat — Masjid Al-Ikhlas',
            subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            headers: ['No', 'Nama Muzakki', 'Jenis', 'Jumlah Uang', 'Beras (Kg)', 'RT', 'Tanggal'],
            rows: data.map(z => [String(z.nomor_kwitansi || '-'), z.nama_muzakki, z.jenis_zakat, fmt(Number(z.jumlah_uang)), `${z.jumlah_beras || 0}`, z.rt?.nama_rt || '-', new Date(z.tanggal).toLocaleDateString('id-ID')]),
            filename: 'Data_Zakat_Al_Ikhlas.pdf',
          })}><FileText className="w-4 h-4 mr-1" />Export PDF</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { resetForm(); setEditItem(null); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Tambah</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'Tambah'} Data Zakat</DialogTitle></DialogHeader>
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
                {form.status_muzakki === 'RT' && (
                  <div><Label>RT</Label>
                    <Select value={form.rt_id} onValueChange={v => setForm({ ...form, rt_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih RT" /></SelectTrigger>
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
                    } else {
                      setForm({ ...form, jenis_zakat: v, jumlah_uang: '', jumlah_beras: '' });
                    }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zakat Fitrah">Zakat Fitrah</SelectItem>
                      <SelectItem value="Zakat Mal">Zakat Mal</SelectItem>
                      <SelectItem value="Infaq">Infaq</SelectItem>
                      <SelectItem value="Fidyah">Fidyah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.jenis_zakat === 'Zakat Fitrah' && (
                  <div>
                    <Label>Jumlah Jiwa <span className="text-destructive">*</span></Label>
                    <Input type="number" min="1" value={form.jumlah_jiwa} onChange={e => {
                      const jiwa = Number(e.target.value) || 1;
                      const beras = jiwa * 2.5;
                      const uang = beras * (Number(form.harga_beras) || 0);
                      setForm({ ...form, jumlah_jiwa: e.target.value, jumlah_beras: String(beras), jumlah_uang: String(uang) });
                    }} />
                  </div>
                )}
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
                      }} /></div>
                      <p className="text-xs text-muted-foreground">Rumus: {Number(form.jumlah_jiwa) || 1} jiwa × 2,5 Kg × Rp {new Intl.NumberFormat('id-ID').format(Number(form.harga_beras) || 0)} = <strong>Rp {new Intl.NumberFormat('id-ID').format((Number(form.jumlah_jiwa) || 1) * 2.5 * (Number(form.harga_beras) || 0))}</strong></p>
                    </CardContent>
                  </Card>
                )}
                <div><Label>Jumlah Uang (Rp)</Label><Input type="number" value={form.jumlah_uang} onChange={e => setForm({ ...form, jumlah_uang: e.target.value })} /></div>
                <div><Label>Jumlah Beras (Kg)</Label><Input type="number" value={form.jumlah_beras} onChange={e => setForm({ ...form, jumlah_beras: e.target.value })} /></div>
                <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
                <Button onClick={handleSubmit} className="w-full">{editItem ? 'Simpan Perubahan' : 'Tambah Zakat'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="hidden md:block">
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Jenis</TableHead><TableHead>Uang</TableHead><TableHead>Beras</TableHead><TableHead>RT</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map(z => (
                <TableRow key={z.id}>
                  <TableCell>{z.nomor_kwitansi}</TableCell><TableCell>{z.nama_muzakki}</TableCell><TableCell><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${z.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>{z.status_muzakki || 'RT'}</span></TableCell><TableCell>{z.jenis_zakat}</TableCell><TableCell>{fmt(Number(z.jumlah_uang))}</TableCell><TableCell>{z.jumlah_beras} Kg</TableCell><TableCell>{z.rt?.nama_rt || '-'}</TableCell><TableCell>{new Date(z.tanggal).toLocaleDateString('id-ID')}</TableCell>
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

      <div className="md:hidden space-y-3">
        {data.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data zakat</p>}
        {data.map(z => (
          <Card key={z.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">#{z.nomor_kwitansi} — {z.nama_muzakki}</p>
                  <div className="flex gap-1 mt-1">
                    <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{z.jenis_zakat}</span>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${z.status_muzakki === 'Jamaah' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{z.status_muzakki || 'RT'}</span>
                  </div>
                </div>
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
                <div><span className="text-muted-foreground">RT:</span> <span className="font-medium">{z.rt?.nama_rt || '-'}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{new Date(z.tanggal).toLocaleDateString('id-ID')}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <PaginationControls page={pag.page} totalPages={pag.totalPages} totalCount={pag.totalCount} onNext={pag.goNext} onPrev={pag.goPrev} onGoTo={pag.goTo} />
      </div>

      <KwitansiZakat open={kwitansiOpen} onOpenChange={setKwitansiOpen} data={kwitansiData} />
    </AdminLayout>
  );
}
