import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import Wordmark from '../Wordmark';
import Gallery, { type GalleryHandle } from './Gallery';
import Field from './Field';
import { CashIcon, CheckCircleIcon, CheckIcon, ShieldIcon, TruckIcon } from './icons';
import { trackOnce, track, trackPurchase } from './pixel';
import { bnDigits, taka } from '../shared/bn';
import {
  COLORS,
  COMBOS,
  CURRENCY,
  DELIVERY_CHARGE,
  PRODUCT,
  SIZES,
  colorById,
  priceFor,
  validateOrder,
  type Size,
} from '../shared/product';

type Pick = { color: string; size: Size | '' };
type Placed = { orderNo: string; total: number; qty: number; items: Pick[]; name: string };

const DEFAULT_PICKS: Pick[] = [
  { color: COLORS[0].id, size: '' },
  { color: COLORS[1 % COLORS.length].id, size: '' },
  { color: COLORS[2 % COLORS.length].id, size: '' },
];
const BN_ORDINAL = ['প্রথম', 'দ্বিতীয়', 'তৃতীয়'];

export default function App() {
  const [qty, setQty] = useState(3);
  const [picks, setPicks] = useState<Pick[]>(DEFAULT_PICKS);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [showBar, setShowBar] = useState(false);
  const gallery = useRef<GalleryHandle>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const price = priceFor(qty)!;
  const contentData = (q = qty) => ({
    content_ids: [PRODUCT.id],
    content_type: 'product',
    content_name: PRODUCT.name,
    num_items: q,
    value: priceFor(q)!.total,
    currency: CURRENCY,
  });

  useEffect(() => {
    trackOnce('vc', () => track('ViewContent', contentData()));
    // Sticky "order" bar: visible only while the real submit button is off-screen.
    const el = submitRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  const chooseQty = (q: number) => {
    setQty(q);
    track('AddToCart', contentData(q));
  };

  const setPick = (i: number, patch: Partial<Pick>) => {
    setPicks((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setErrors((e) => {
      const n = { ...e };
      delete n[`${patch.color ? 'color' : 'size'}${i}`];
      return n;
    });
    if (patch.color) gallery.current?.showColor(patch.color);
  };

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
  };

  const onFocusForm = () => trackOnce('ic', () => track('InitiateCheckout', contentData()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setServerError('');
    const items = picks.slice(0, qty);
    const v = validateOrder({ ...form, qty, items });
    if (!v.ok) {
      setErrors(v.errors);
      const first = Object.keys(v.errors)[0];
      document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...v.data, url: location.href }),
      });
      const out = (await res.json()) as { ok: boolean; orderNo: string; total: number; eventId: string; errors?: Record<string, string>; error?: string };
      if (!res.ok || !out.ok) {
        if (out.errors) setErrors(out.errors);
        setServerError(out.error || 'অর্ডার করা যায়নি, আবার চেষ্টা করুন');
        return;
      }
      trackPurchase(out.eventId, { ...contentData(), value: out.total, order_id: out.orderNo }, { phone: v.data.phone, name: v.data.name });
      setPlaced({ orderNo: out.orderNo, total: out.total, qty, items, name: v.data.name });
      window.scrollTo({ top: 0 });
    } catch {
      setServerError('ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: showBar ? 10 : 2 }}>
      <Header />
      <Container maxWidth="sm" sx={{ px: 2 }}>
        {placed ? (
          <Success
            placed={placed}
            onAgain={() => {
              setPlaced(null);
              setPicks(DEFAULT_PICKS);
            }}
          />
        ) : (
          <>
            <Box sx={{ pt: 2 }}>
              <Gallery ref={gallery} />
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25 }}>
                {PRODUCT.name}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {PRODUCT.tagline}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                <Badge icon={<TruckIcon fontSize="small" />} text="২/৩টিতে ফ্রি ডেলিভারি" />
                <Badge icon={<CashIcon fontSize="small" />} text="ক্যাশ অন ডেলিভারি" />
                <Badge icon={<ShieldIcon fontSize="small" />} text="প্রিমিয়াম কোয়ালিটি" />
              </Box>
            </Box>

            <Box component="form" noValidate onSubmit={submit} onFocus={onFocusForm}>
              <Section n="১" title="প্যাকেজ বেছে নিন">
                <Box sx={{ display: 'grid', gap: 1.25 }} id="f-qty">
                  {COMBOS.map((c) => {
                    const p = priceFor(c.qty)!;
                    const on = qty === c.qty;
                    return (
                      <ButtonBase
                        key={c.qty}
                        onClick={() => chooseQty(c.qty)}
                        aria-pressed={on}
                        sx={(t) => ({
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.75,
                          borderRadius: 3,
                          border: 2,
                          textAlign: 'left',
                          borderColor: on ? 'primary.main' : 'divider',
                          bgcolor: on ? alpha(t.palette.primary.main, 0.06) : 'background.paper',
                          transition: 'all .2s',
                        })}
                      >
                        <Radio on={on} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{c.label}</Typography>
                          <Typography variant="body2" sx={{ color: c.freeDelivery ? 'success.main' : 'text.secondary', fontWeight: c.freeDelivery ? 700 : 400 }}>
                            {c.freeDelivery ? 'ডেলিভারি চার্জ একদম ফ্রি' : `ডেলিভারি চার্জ ${taka(DELIVERY_CHARGE)}`}
                            {p.saved > 0 && ` • ${taka(p.saved)} সাশ্রয়`}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 22, color: 'primary.main' }}>{taka(c.price)}</Typography>
                        {c.badge && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -10,
                              right: 12,
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'primary.main',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {c.badge}
                          </Box>
                        )}
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Section>

              <Section n="২" title={qty > 1 ? 'প্রতিটির রং ও সাইজ বেছে নিন' : 'রং ও সাইজ বেছে নিন'}>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {picks.slice(0, qty).map((p, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.75, borderRadius: 3 }}>
                      {qty > 1 && (
                        <Typography sx={{ fontWeight: 700, mb: 1 }}>
                          {BN_ORDINAL[i]} সোয়েটশার্ট
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" id={`f-color${i}`}>
                        রং: <b style={{ color: '#000' }}>{colorById(p.color)?.name}</b>
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.25, mt: 1, flexWrap: 'wrap' }}>
                        {COLORS.map((c) => {
                          const on = p.color === c.id;
                          return (
                            <ButtonBase
                              key={c.id}
                              aria-label={c.name}
                              aria-pressed={on}
                              onClick={() => setPick(i, { color: c.id })}
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                bgcolor: c.hex,
                                border: c.border ? '1px solid #d0d0d0' : 'none',
                                outline: on ? '2px solid' : '2px solid transparent',
                                outlineColor: on ? 'primary.main' : 'transparent',
                                outlineOffset: 3,
                                color: ['white', 'cream'].includes(c.id) ? '#000' : '#fff',
                                transition: 'outline-color .2s',
                              }}
                            >
                              {on && <CheckIcon fontSize="small" />}
                            </ButtonBase>
                          );
                        })}
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75 }} id={`f-size${i}`}>
                        সাইজ:
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${SIZES.length}, 1fr)`, gap: 1, mt: 1 }}>
                        {SIZES.map((s) => {
                          const on = p.size === s;
                          return (
                            <ButtonBase
                              key={s}
                              aria-pressed={on}
                              onClick={() => setPick(i, { size: s })}
                              sx={{
                                height: 44,
                                borderRadius: 2,
                                border: 1.5,
                                fontWeight: 700,
                                fontSize: 16,
                                borderColor: on ? 'primary.main' : errors[`size${i}`] ? 'error.main' : 'divider',
                                bgcolor: on ? 'primary.main' : 'background.paper',
                                color: on ? '#fff' : 'text.primary',
                                transition: 'all .2s',
                              }}
                            >
                              {s}
                            </ButtonBase>
                          );
                        })}
                      </Box>
                      {errors[`size${i}`] && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
                          {errors[`size${i}`]}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Section>

              <Section n="৩" title="আপনার তথ্য দিন" id="order">
                <Box sx={{ display: 'grid', gap: 1.75 }}>
                  <Field
                    id="f-name"
                    label="আপনার নাম"
                    autoComplete="name"
                    value={form.name}
                    onChange={setField('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                  />
                  <Field
                    id="f-phone"
                    label="মোবাইল নাম্বার"
                    placeholder="01XXXXXXXXX"
                    type="tel"
                    autoComplete="tel"
                    inputProps={{ inputMode: 'tel', maxLength: 16 }}
                    value={form.phone}
                    onChange={setField('phone')}
                    error={!!errors.phone}
                    helperText={errors.phone}
                  />
                  <Field
                    id="f-address"
                    label="সম্পূর্ণ ঠিকানা"
                    placeholder="বাসা/রোড, এলাকা, থানা, জেলা"
                    autoComplete="street-address"
                    multiline
                    minRows={2}
                    value={form.address}
                    onChange={setField('address')}
                    error={!!errors.address}
                    helperText={errors.address}
                  />
                </Box>

                <Paper variant="outlined" sx={{ mt: 2, p: 1.75, borderRadius: 3 }}>
                  <Row label={`${COMBOS.find((c) => c.qty === qty)!.label}`} value={taka(price.subtotal)} />
                  <Row
                    label="ডেলিভারি চার্জ"
                    value={price.delivery ? taka(price.delivery) : 'ফ্রি'}
                    valueColor={price.delivery ? undefined : 'success.main'}
                  />
                  <Box sx={{ borderTop: 1, borderColor: 'divider', my: 1 }} />
                  <Row label="সর্বমোট" value={taka(price.total)} bold />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    পণ্য হাতে পেয়ে টাকা পরিশোধ করুন
                  </Typography>
                </Paper>

                {serverError && (
                  <Note sx={{ mt: 2, bgcolor: '#fdeded', color: '#5f2120' }} role="alert">
                    {serverError}
                  </Note>
                )}

                <Button
                  ref={submitRef}
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  sx={{ mt: 2, py: 1.6, fontSize: 20, borderRadius: 3 }}
                >
                  {submitting ? <CircularProgress size={26} color="inherit" /> : `অর্ডার কনফার্ম করুন — ${taka(price.total)}`}
                </Button>
              </Section>
            </Box>
            <Footer />
          </>
        )}
      </Container>

      {!placed && (
          <Paper
            aria-hidden={!showBar}
            elevation={8}
            square
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              p: 1.25,
              pb: 'calc(10px + env(safe-area-inset-bottom))',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              justifyContent: 'center',
              transform: showBar ? 'none' : 'translateY(110%)',
              transition: 'transform .25s ease',
            }}
          >
            <Box sx={{ maxWidth: 560, width: '100%', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
                  {bnDigits(qty)}টি • {price.delivery ? 'ডেলিভারিসহ' : 'ফ্রি ডেলিভারি'}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main', lineHeight: 1.2 }}>{taka(price.total)}</Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 3, py: 1.2 }}
                onClick={() => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' })}
              >
                এখনই অর্ডার করুন
              </Button>
            </Box>
          </Paper>
      )}
    </Box>
  );
}

function Header() {
  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 11, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ bgcolor: 'primary.main', color: '#fff', textAlign: 'center', py: 0.6, fontSize: 14, fontWeight: 700 }}>
        ২টি বা ৩টি নিলে ডেলিভারি চার্জ একদম ফ্রি!
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.4 }}>
        <Wordmark size={21} />
      </Box>
    </Box>
  );
}

function Section({ n, title, id, children }: { n: string; title: string; id?: string; children: React.ReactNode }) {
  return (
    <Box component="section" id={id} sx={{ mt: 3.5, scrollMarginTop: 110 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {n}
        </Box>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 20 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        flex: '0 0 22px',
        borderRadius: '50%',
        border: 2,
        borderColor: on ? 'primary.main' : 'grey.400',
        display: 'grid',
        placeItems: 'center',
        transition: 'border-color .2s',
      }}
    >
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', transform: on ? 'scale(1)' : 'scale(0)', transition: 'transform .2s' }} />
    </Box>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box
      sx={(t) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.5,
        borderRadius: 5,
        bgcolor: alpha(t.palette.primary.main, 0.08),
        color: 'primary.dark',
        fontSize: 14,
        fontWeight: 700,
      })}
    >
      {icon}
      {text}
    </Box>
  );
}

function Row({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
      <Typography sx={{ fontWeight: bold ? 700 : 400, fontSize: bold ? 18 : 16 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: bold ? 20 : 16, color: valueColor ?? (bold ? 'primary.main' : 'text.primary') }}>{value}</Typography>
    </Box>
  );
}

function Success({ placed, onAgain }: { placed: Placed; onAgain: () => void }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: 84, color: 'success.main' }} />
      <Typography component="h1" sx={{ fontSize: 26, fontWeight: 700, mt: 1 }}>
        ধন্যবাদ, {placed.name}!
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 17 }}>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</Typography>

      <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 3, textAlign: 'left' }}>
        <Row label="অর্ডার নাম্বার" value={placed.orderNo} />
        {placed.items.map((it, i) => (
          <Row key={i} label={`${BN_ORDINAL[i]} সোয়েটশার্ট`} value={`${colorById(it.color)?.name} • ${it.size}`} />
        ))}
        <Box sx={{ borderTop: 1, borderColor: 'divider', my: 1 }} />
        <Row label="সর্বমোট (ক্যাশ অন ডেলিভারি)" value={taka(placed.total)} bold />
      </Paper>

      <Note sx={{ mt: 2, bgcolor: '#e5f6fd', color: '#014361' }}>
        আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডারটি কনফার্ম করবেন। দয়া করে ফোনটি চালু রাখুন।
      </Note>

      <Button variant="outlined" size="large" sx={{ mt: 3, borderRadius: 3 }} onClick={onAgain}>
        আরেকটি অর্ডার করুন
      </Button>
    </Box>
  );
}

function Note({ sx, ...p }: React.ComponentProps<typeof Box>) {
  return <Box {...p} sx={{ p: 1.75, borderRadius: 2, fontSize: 16, textAlign: 'left', ...sx }} />;
}

function Footer() {
  return (
    <Box component="footer" sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
      <Wordmark size={15} color="#9e9e9e" />
      <Typography variant="body2" sx={{ mt: 1.5 }}>
        © {bnDigits(2026)} থ্রেড হাউস • সারা বাংলাদেশে হোম ডেলিভারি
      </Typography>
    </Box>
  );
}
