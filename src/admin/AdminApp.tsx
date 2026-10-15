import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import Wordmark from '../Wordmark';
import { bnDigits, bnNumber, taka } from '../shared/bn';
import { colorById } from '../shared/product';
import { STATUSES, statusInfo, type AdminOrder, type StatusId } from '../shared/status';

const TOKEN_KEY = 'th_admin_token';
const icon = (d: string) => (p: SvgIconProps) => (
  <SvgIcon {...p}>
    <path d={d} />
  </SvgIcon>
);
const RefreshIcon = icon('M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z');
const CallIcon = icon('M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02z');
const CopyIcon = icon('M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z');
const DeleteIcon = icon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z');
const DownloadIcon = icon('M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z');
const LogoutIcon = icon('m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z');
const WhatsAppIcon = icon('M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-.47.36-2.96-.73-2.49-1.09-3.99-3.75-4.11-3.92-.12-.17-.96-1.38-.92-2.61.05-1.22.69-1.8.95-2.04.24-.26.51-.29.68-.26h.47c.15 0 .36-.06.55.45l.69 1.87c.06.13.1.28.01.44l-.27.41-.39.42c-.12.12-.26.25-.12.5.12.26.62 1.09 1.32 1.78.91.88 1.71 1.17 1.95 1.3.24.14.39.12.54-.04l.81-.94c.19-.25.35-.19.58-.11l1.67.88M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10c-1.97 0-3.8-.57-5.35-1.55L2 22l1.55-4.65A9.95 9.95 0 0 1 2 12 10 10 0 0 1 12 2');

type Stats = { todayOrders: number; todaySales: number; todayPieces: number; allOrders: number; deliveredSales: number };

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`, ...init.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  }
  const data = (await res.json()) as T & { ok: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || 'error');
  return data;
}

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  if (!token) return <Login onDone={(t) => (localStorage.setItem(TOKEN_KEY, t), setToken(t))} />;
  return <Orders onLogout={() => (localStorage.removeItem(TOKEN_KEY), setToken(null))} />;
}

function Login({ onDone }: { onDone: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Paper
        component="form"
        variant="outlined"
        sx={{ p: 3, width: '100%', maxWidth: 360, borderRadius: 4, textAlign: 'center' }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const res = await fetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }), headers: { 'content-type': 'application/json' } });
            const data = (await res.json()) as { ok: boolean; token?: string; error?: string };
            if (data.ok && data.token) onDone(data.token);
            else setError(data.error || 'লগইন হয়নি');
          } catch {
            setError('সংযোগ সমস্যা');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Wordmark size={20} />
        <Typography sx={{ mt: 2, mb: 2, fontWeight: 700 }}>অ্যাডমিন প্যানেল</Typography>
        <TextField fullWidth type="password" label="পাসওয়ার্ড" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" size="large" fullWidth disabled={busy || !password} sx={{ mt: 2 }}>
          {busy ? <CircularProgress size={24} color="inherit" /> : 'লগইন'}
        </Button>
      </Paper>
    </Box>
  );
}

function Orders({ onLogout }: { onLogout: () => void }) {
  const [status, setStatus] = useState<StatusId | 'all'>('all');
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const query = useRef('');

  const params = useCallback(
    (extra: Record<string, string> = {}) => {
      const p = new URLSearchParams(extra);
      if (status !== 'all') p.set('status', status);
      if (q.trim()) p.set('q', q.trim());
      return p.toString();
    },
    [status, q],
  );

  const load = useCallback(
    async (more = false) => {
      setLoading(true);
      const qs = params(more && orders.length ? { before: String(orders[orders.length - 1].id) } : {});
      query.current = qs;
      try {
        const data = await api<{ orders: AdminOrder[]; hasMore: boolean; counts: Record<string, number>; stats: Stats }>(`/orders?${qs}`);
        if (query.current !== qs) return; // a newer request is in flight
        setOrders((o) => (more ? [...o, ...data.orders] : data.orders));
        setHasMore(data.hasMore);
        setCounts(data.counts);
        setStats(data.stats);
      } catch (e) {
        setToast(String((e as Error).message));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  );

  useEffect(() => {
    const t = setTimeout(() => load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Auto-refresh every 60s while the tab is open (new orders show up by themselves).
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && window.scrollY < 200 && load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const update = async (id: number, patch: Partial<Pick<AdminOrder, 'status' | 'note'>>) => {
    try {
      const { order } = await api<{ order: AdminOrder }>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setOrders((list) => list.map((o) => (o.id === id ? order : o)));
      setToast('সেভ হয়েছে');
      if (patch.status) load();
    } catch (e) {
      setToast(String((e as Error).message));
    }
  };

  const remove = async (o: AdminOrder) => {
    if (!confirm(`${o.orderNo} অর্ডারটি স্থায়ীভাবে ডিলিট করবেন?`)) return;
    await api(`/orders/${o.id}`, { method: 'DELETE' });
    setOrders((list) => list.filter((x) => x.id !== o.id));
    setToast('ডিলিট হয়েছে');
  };

  const exportCsv = async () => {
    const res = await fetch(`/api/admin/export?${params()}`, { headers: { authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `thread-house-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Wordmark size={16} />
          <Typography sx={{ ml: 1, fontWeight: 700, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>অ্যাডমিন</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => load()} aria-label="রিফ্রেশ" disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={exportCsv} aria-label="CSV ডাউনলোড">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={onLogout} aria-label="লগআউট">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ pt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
          <Stat label="আজকের অর্ডার" value={bnNumber(stats?.todayOrders ?? 0)} />
          <Stat label="আজকের বিক্রি" value={taka(stats?.todaySales ?? 0)} />
          <Stat label="আজকের পিস" value={bnNumber(stats?.todayPieces ?? 0)} />
          <Stat label="মোট অর্ডার" value={bnNumber(stats?.allOrders ?? 0)} />
        </Box>

        <Tabs value={status} onChange={(_, v) => setStatus(v)} variant="scrollable" scrollButtons={false} sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="all" label={`সব (${bnDigits(total)})`} />
          {STATUSES.map((s) => (
            <Tab key={s.id} value={s.id} label={`${s.label} (${bnDigits(counts[s.id] ?? 0)})`} />
          ))}
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder="ফোন, নাম বা অর্ডার নাম্বার দিয়ে খুঁজুন"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mt: 2, bgcolor: 'background.paper' }}
        />

        <Box sx={{ display: 'grid', gap: 1.5, mt: 2 }}>
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} onUpdate={update} onDelete={remove} onToast={setToast} />
          ))}
          {!loading && orders.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
              কোনো অর্ডার নেই
            </Typography>
          )}
          {loading && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}
          {hasMore && !loading && (
            <Button variant="outlined" onClick={() => load(true)}>
              আরো দেখুন
            </Button>
          )}
        </Box>
      </Container>

      <Snackbar open={!!toast} autoHideDuration={2000} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 22, color: 'primary.main' }}>{value}</Typography>
    </Paper>
  );
}

const timeFmt = new Intl.DateTimeFormat('bn-BD', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function OrderCard({
  o,
  onUpdate,
  onDelete,
  onToast,
}: {
  o: AdminOrder;
  onUpdate: (id: number, patch: Partial<Pick<AdminOrder, 'status' | 'note'>>) => void;
  onDelete: (o: AdminOrder) => void;
  onToast: (s: string) => void;
}) {
  const [note, setNote] = useState(o.note);
  const st = statusInfo(o.status);
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => onToast('কপি হয়েছে'));

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: 4, borderLeftColor: st.color }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700 }}>{o.orderNo}</Typography>
          <Typography variant="body2" color="text.secondary">
            {timeFmt.format(o.createdAt)}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main' }}>{taka(o.total)}</Typography>
        </Box>

        <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 1 }}>{o.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 17, letterSpacing: 0.5, mr: 0.5 }}>{o.phone}</Typography>
          <IconButton size="small" color="primary" href={`tel:${o.phone}`} aria-label="কল">
            <CallIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ color: '#25D366' }} href={`https://wa.me/88${o.phone}`} target="_blank" rel="noopener" aria-label="WhatsApp">
            <WhatsAppIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => copy(o.phone)} aria-label="কপি">
            <CopyIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }} onClick={() => copy(o.address)}>
          {o.address}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.25 }}>
          {o.items.map((it, i) => {
            const c = colorById(it.color);
            return (
              <Chip
                key={i}
                variant="outlined"
                avatar={<Box component="span" sx={{ bgcolor: `${c?.hex ?? '#ccc'} !important`, border: '1px solid #ccc' }} />}
                label={`${c?.name ?? it.color} • ${it.size}`}
                sx={{ fontWeight: 700 }}
              />
            );
          })}
          <Chip label={o.delivery ? `ডেলিভারি ${taka(o.delivery)}` : 'ফ্রি ডেলিভারি'} size="small" sx={{ alignSelf: 'center' }} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr auto' }, gap: 1.25, mt: 2, alignItems: 'start' }}>
          <TextField
            select
            size="small"
            label="স্ট্যাটাস"
            value={o.status}
            onChange={(e) => onUpdate(o.id, { status: e.target.value as StatusId })}
            sx={{ '& .MuiSelect-select': { color: st.color, fontWeight: 700 } }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ color: s.color, fontWeight: 700 }}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="নোট"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== o.note && onUpdate(o.id, { note })}
          />
          <IconButton onClick={() => onDelete(o)} aria-label="ডিলিট" sx={{ justifySelf: { xs: 'end', sm: 'auto' } }}>
            <DeleteIcon />
          </IconButton>
        </Box>
        {o.capi && o.capi !== 'ok' && o.capi !== 'disabled' && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
            Meta CAPI: {o.capi}
          </Typography>
        )}
      </Box>
    </Card>
  );
}
