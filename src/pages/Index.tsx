import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { Banknote, Users, Wheat, CalendarDays } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import logo from '@/assets/logo-masjid.webp';
import { useZakatStats } from '@/hooks/useZakatStats';
import SplashScreen from '@/components/SplashScreen';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import { useAnimationLoop } from '@/hooks/useAnimationLoop';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import AutoScrollTableWrapper from '@/components/AutoScrollTableWrapper';

const SPLASH_KEY = 'zakat-splash-shown';

const COLORS = ['hsl(152, 55%, 28%)', 'hsl(42, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];
const PAGE_SIZE = 100; // fetch more for auto-scroll
const VISIBLE_ROWS = 5;

export default function Index() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_KEY));
  const { stats, fetchStats } = useZakatStats();
  const [zakatData, setZakatData] = useState<any[]>([]);
  const [distribusiData, setDistribusiData] = useState<any[]>([]);
  const [rtChartData, setRtChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Search state
  const [zakatSearch, setZakatSearch] = useState('');
  const [distSearch, setDistSearch] = useState('');

  // Refs for latest values (avoid stale closures in realtime callbacks)
  const zakatSearchRef = useRef('');
  const distSearchRef = useRef('');

  // Sync refs
  zakatSearchRef.current = zakatSearch;
  distSearchRef.current = distSearch;

  // Auto-scroll hooks
  const zakatScroll = useAutoScroll({ totalItems: zakatData.length, intervalMs: 3000, isPaused: !!zakatSearch });
  const distScroll = useAutoScroll({ totalItems: distribusiData.length, intervalMs: 3000, isPaused: !!distSearch });

  // Debounce timer refs
  const zakatDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const distDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ---- Fetch zakat data (all matching, no pagination) ----
  const fetchZakat = useCallback(async (search: string) => {
    let query = supabase
      .from('transaksi_zakat')
      .select('id, nama_muzakki, alamat_muzakki, tanggal, rt(nama_rt), detail_zakat(jenis_zakat, jumlah_uang, jumlah_beras, jumlah_jiwa)')
      .order('tanggal', { ascending: false })
      .limit(PAGE_SIZE);

    if (search.trim()) {
      query = query.ilike('nama_muzakki', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error) setZakatData(data || []);
  }, []);

  // ---- Fetch distribusi data (all matching, no pagination) ----
  const fetchDistribusi = useCallback(async (search: string) => {
    const { data, error } = await supabase
      .from('distribusi')
      .select('id, jumlah, jumlah_beras, jenis_bantuan, sumber_zakat, tanggal, mustahik!inner(nama, alamat, rt(nama_rt))')
      .order('tanggal', { ascending: false })
      .ilike('mustahik.nama', search.trim() ? `%${search.trim()}%` : '%')
      .limit(PAGE_SIZE);

    if (!error) setDistribusiData(data || []);
  }, []);

  // ---- Fetch chart data ----
  const fetchChartData = useCallback(async () => {
    const { data } = await supabase.rpc('get_zakat_per_rt');
    if (data && Array.isArray(data)) {
      setRtChartData(data.map((r: any) => ({ name: r.nama_rt, value: Number(r.total_zakat) })));
    }
  }, []);

  // ---- Initial load ----
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchStats(),
        fetchZakat(''),
        fetchDistribusi(''),
        fetchChartData(),
      ]);
      setLastUpdated(new Date());
      setLoading(false);
    };
    init();
  }, []);

  // ---- Realtime channels ----
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      fetchStats();
      fetchZakat(zakatSearchRef.current);
      fetchDistribusi(distSearchRef.current);
      fetchChartData();
      setLastUpdated(new Date());
    };

    const ch1 = supabase.channel('pub-zakat-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_zakat' }, handleRealtimeUpdate)
      .subscribe();
    const ch2 = supabase.channel('pub-dist-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distribusi' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchStats, fetchZakat, fetchDistribusi, fetchChartData]);

  // ---- Search handlers with debounce ----
  const handleZakatSearch = (value: string) => {
    setZakatSearch(value);
    clearTimeout(zakatDebounceRef.current);
    zakatDebounceRef.current = setTimeout(() => {
      fetchZakat(value);
    }, 400);
  };

  const handleDistSearch = (value: string) => {
    setDistSearch(value);
    clearTimeout(distDebounceRef.current);
    distDebounceRef.current = setTimeout(() => {
      fetchDistribusi(value);
    }, 400);
  };

  const pieKey = useAnimationLoop(20000);
  const barKey = useAnimationLoop(25000);

  const pieData = [
    { name: 'Zakat Fitrah', value: stats.totalFitrah },
    { name: 'Zakat Mal', value: stats.totalMal },
    { name: 'Infaq', value: stats.totalInfaq },
    { name: 'Fidyah', value: stats.totalFidyah },
  ].filter(d => d.value > 0);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (showSplash) return <SplashScreen onComplete={() => { sessionStorage.setItem(SPLASH_KEY, '1'); setShowSplash(false); }} />;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo Masjid Al-Ikhlas" className="w-14 h-14 rounded-full bg-primary-foreground/20 p-1" />
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">Sistem Zakat Masjid Al-Ikhlas</h1>
              <p className="text-sm md:text-base opacity-90">Transparansi Zakat Online — Ramadhan 1447H</p>
            </div>
          </div>
          <Link to="/login" className="hidden md:inline-flex px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition">Login Panitia</Link>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" /><span>Data diperbarui: {fmtDate(lastUpdated)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Zakat Fitrah', value: stats.totalFitrah, icon: Banknote, color: 'text-primary', isCurrency: true },
            { label: 'Zakat Mal', value: stats.totalMal, icon: Banknote, color: 'text-secondary', isCurrency: true },
            { label: 'Infaq', value: stats.totalInfaq, icon: Banknote, color: 'text-primary', isCurrency: true },
            { label: 'Fidyah', value: stats.totalFidyah, icon: Banknote, color: 'text-secondary', isCurrency: true },
            { label: 'Total Muzakki', value: stats.totalMuzakki, icon: Users, color: 'text-primary' },
            { label: 'Total Mustahik', value: stats.totalMustahik, icon: Users, color: 'text-secondary', suffix: ' Orang' },
            { label: 'Jiwa Fitrah', value: stats.totalJiwaFitrah, icon: Users, color: 'text-primary', suffix: ' Orang' },
            { label: 'Beras Fitrah', value: stats.totalBerasFitrah, icon: Wheat, color: 'text-primary', suffix: ' Kg' },
            { label: 'Beras Fidyah', value: stats.totalBerasFidyah, icon: Wheat, color: 'text-secondary', suffix: ' Kg' },
            { label: 'Total Beras', value: stats.totalBeras, icon: Wheat, color: 'text-primary', suffix: ' Kg' },
          ].map((stat) => (
            <AnimatedStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} isCurrency={stat.isCurrency} suffix={stat.suffix} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2"><CardTitle className="font-serif text-base sm:text-xl">Grafik Jenis Zakat</CardTitle></CardHeader>
            <CardContent className="p-2 sm:p-6">
              {pieData.length > 0 ? (
                <ResponsiveContainer key={`pie-${pieKey}`} width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" isAnimationActive animationBegin={0} animationDuration={1200} animationEasing="ease-out" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">Belum ada data zakat</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-2"><CardTitle className="font-serif text-base sm:text-xl">Zakat per RT</CardTitle></CardHeader>
            <CardContent className="p-2 sm:p-6">
              {rtChartData.length > 0 ? (
                <ResponsiveContainer key={`bar-${barKey}`} width="100%" height={300}>
                  <BarChart data={rtChartData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationBegin={0} animationDuration={1500} animationEasing="ease-out">
                      {rtChartData.map((_, index) => (
                        <Cell key={index} fill={['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#6366F1', '#D946EF', '#22C55E', '#EAB308', '#0EA5E9'][index % 15]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">Belum ada data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Transparansi Zakat */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Transparansi Zakat</CardTitle>
            <div className="mt-2">
              <SearchInput placeholder="Cari nama muzakki..." value={zakatSearch} onChange={handleZakatSearch} />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3 sm:gap-4 px-3 py-2 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div>Nama Muzakki</div><div>Jenis Zakat</div><div>Jumlah</div><div>Tanggal</div>
            </div>
            <AutoScrollTableWrapper
              data={zakatData}
              offset={zakatScroll.offset}
              visibleCount={VISIBLE_ROWS}
              onPause={zakatScroll.pause}
              onResume={zakatScroll.resume}
              renderRow={(z: any, idx: number) => {
                const details = z.detail_zakat || [];
                const jenisList = details.map((d: any) => d.jenis_zakat).join(', ');
                const totalUang = details.reduce((s: number, d: any) => s + Number(d.jumlah_uang || 0), 0);
                const totalBeras = details.reduce((s: number, d: any) => s + (Number(d.jumlah_jiwa || 0) * 2.5) + Number(d.jumlah_beras || 0), 0);
                return (
                  <div key={`z-${idx}`} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3 sm:gap-4 px-3 py-2.5 border-b border-border text-sm leading-relaxed">
                    <div className="font-medium">
                      {z.nama_muzakki}
                      {(z.rt?.nama_rt || z.alamat_muzakki) && (
                        <span className="block text-xs text-muted-foreground">
                          {[z.rt?.nama_rt, z.alamat_muzakki].filter(Boolean).join(' — ')}
                        </span>
                      )}
                    </div>
                    <div>{jenisList || '-'}</div>
                    <div>{totalUang > 0 ? fmt(totalUang) : ''}{totalUang > 0 && totalBeras > 0 ? ' + ' : ''}{totalBeras > 0 ? `${totalBeras} Kg` : ''}</div>
                    <div>{new Date(z.tanggal).toLocaleDateString('id-ID')}</div>
                  </div>
                );
              }}
            />
            {zakatData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Belum ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Distribusi Zakat */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Distribusi Zakat</CardTitle>
            <div className="mt-2">
              <SearchInput placeholder="Cari nama mustahik..." value={distSearch} onChange={handleDistSearch} />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] gap-3 sm:gap-4 px-3 py-2 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div>Nama Mustahik</div><div>Sumber Zakat</div><div>Jumlah Bantuan</div><div>Tanggal</div>
            </div>
            <AutoScrollTableWrapper
              data={distribusiData}
              offset={distScroll.offset}
              visibleCount={VISIBLE_ROWS}
              onPause={distScroll.pause}
              onResume={distScroll.resume}
              renderRow={(d: any, idx: number) => (
                <div key={`d-${idx}`} className="grid grid-cols-4 gap-2 px-3 py-2.5 border-b border-border text-sm animate-fade-in">
                  <div className="font-medium">
                    {d.mustahik?.nama || '-'}
                    {(d.mustahik?.rt?.nama_rt || d.mustahik?.alamat) && (
                      <span className="block text-xs text-muted-foreground">
                        {[d.mustahik?.rt?.nama_rt, d.mustahik?.alamat].filter(Boolean).join(' — ')}
                      </span>
                    )}
                  </div>
                  <div>{d.sumber_zakat || '-'}</div>
                  <div>{d.jenis_bantuan === 'Beras' ? `${Number(d.jumlah_beras) || 0} Kg Beras` : fmt(Number(d.jumlah))}</div>
                  <div>{new Date(d.tanggal).toLocaleDateString('id-ID')}</div>
                </div>
              )}
            />
            {distribusiData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="bg-primary text-primary-foreground py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-serif text-lg">Masjid Al-Ikhlas</p>
          <p className="text-sm opacity-75 mt-1">Sistem Transparansi Zakat — {new Date().getFullYear()}</p>
          <Link to="/login" className="text-sm underline opacity-75 mt-2 inline-block md:hidden">Login Panitia</Link>
        </div>
      </footer>
    </div>
  );
}
