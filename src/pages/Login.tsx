import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function Login() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  if (user && role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user && role === 'panitia') return <Navigate to="/panitia/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Login gagal: ' + error.message);
      setSubmitting(false);
    }
    // Redirect handled by AuthContext state change
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-full" />
          <CardTitle className="font-serif text-2xl">Login Sistem Zakat</CardTitle>
          <p className="text-muted-foreground text-base">Masjid Al-Ikhlas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@masjid.com" required className="text-base h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="text-base h-12" />
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
              {submitting ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
