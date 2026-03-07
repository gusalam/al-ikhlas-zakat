import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

export default function KelolaPanitia() {
  const [panitiaList, setPanitiaList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id, role, profiles(name, email)').eq('role', 'panitia');
    setPanitiaList(roles || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Semua field harus diisi'); return; }
    if (form.password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke('create-panitia', {
        body: { name: form.name, email: form.email, password: form.password },
      });
      if (res.error) throw res.error;
      toast.success('Panitia berhasil ditambahkan');
      setOpen(false); setForm({ name: '', email: '', password: '' }); fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah panitia');
    }
    setSubmitting(false);
  };

  const handleDelete = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'panitia');
    if (error) toast.error(error.message);
    else { toast.success('Role panitia dihapus'); fetchData(); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Kelola Panitia</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Panitia</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Panitia Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-12 text-base" /></div>
              <div><Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="h-12 text-base pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full h-12" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Tambah Panitia'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="overflow-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {panitiaList.map((p: any) => (
                <TableRow key={p.user_id}>
                  <TableCell>{(p.profiles as any)?.name || '-'}</TableCell>
                  <TableCell>{(p.profiles as any)?.email || '-'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus panitia?</AlertDialogTitle><AlertDialogDescription>Role panitia akan dihapus dari user ini.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.user_id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
