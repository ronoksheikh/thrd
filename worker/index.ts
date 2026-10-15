import { json, type Env } from './env';
import { handleAdmin } from './admin';
import { capiEnabled, getCookie, isBot, sendCapi, userFromRequest } from './meta';
import { CURRENCY, PRODUCT, priceFor, validateOrder } from '../src/shared/product';
import { orderNo } from '../src/shared/bn';

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
};

export default {
  async fetch(req, env, ctx): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    try {
      if (pathname === '/api/orders' && req.method === 'POST') return await createOrder(req, env, ctx);
      if (pathname === '/api/track' && req.method === 'POST') return await trackEvent(req, env, ctx);
      if (pathname.startsWith('/api/admin/')) return await handleAdmin(req, env, url);
      if (pathname.startsWith('/api/')) return json({ ok: false, error: 'not found' }, 404);
      if (pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) return await home(req, env, ctx, url);
    } catch (e) {
      console.error(e);
      return json({ ok: false, error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন' }, 500);
    }

    // Anything else that isn't a static file → homepage.
    return Response.redirect(new URL('/', url).toString(), 302);
  },
} satisfies ExportedHandler<Env>;

/** Serves the prerendered homepage, injecting the pixel config + a PageView event id shared with CAPI. */
async function home(req: Request, env: Env, ctx: ExecutionContext, url: URL) {
  const asset = await env.ASSETS.fetch(new Request(new URL('/', url)));
  const pixel = env.META_PIXEL_ID || '';
  const eventId = crypto.randomUUID();
  const headers = new Headers(asset.headers);
  headers.set('cache-control', 'no-cache');
  headers.delete('etag');
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);

  if (pixel) {
    // First-party _fbp / _fbc cookies (survive Safari ITP better than JS-set cookies).
    const user = userFromRequest(req);
    const cookie = (k: string, v: string) => `${k}=${v}; Path=/; Max-Age=7776000; SameSite=Lax; Secure`;
    if (!user.fbp) {
      user.fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
      headers.append('set-cookie', cookie('_fbp', user.fbp));
    }
    const fbclid = url.searchParams.get('fbclid');
    if (fbclid && !getCookie(req, '_fbc')?.endsWith(fbclid)) {
      user.fbc = `fb.1.${Date.now()}.${fbclid}`;
      headers.append('set-cookie', cookie('_fbc', user.fbc));
    }
    if (capiEnabled(env) && !isBot(user.ua ?? null) && req.method === 'GET') {
      ctx.waitUntil(sendCapi(env, { event_name: 'PageView', event_id: eventId, event_source_url: url.toString() }, user));
    }
  }

  const cfg = `<script>window.__TH=${JSON.stringify({ p: pixel, e: eventId })}</script>`;
  return new HTMLRewriter()
    .on('head', { element: (el) => void el.prepend(cfg, { html: true }) })
    .transform(new Response(asset.body, { status: asset.status, headers }));
}

async function createOrder(req: Request, env: Env, ctx: ExecutionContext) {
  if (Number(req.headers.get('content-length') || 0) > 10_000) return json({ ok: false, error: 'too large' }, 413);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, error: 'invalid request' }, 400);

  const v = validateOrder(body);
  if (!v.ok) return json({ ok: false, errors: v.errors, error: 'তথ্যগুলো ঠিকভাবে পূরণ করুন' }, 400);
  const { name, phone, address, qty, items } = v.data;
  const price = priceFor(qty)!; // prices always come from the server config
  const itemsJson = JSON.stringify(items);
  const user = userFromRequest(req);
  const sourceUrl = typeof body.url === 'string' ? body.url.slice(0, 500) : null;

  // Double-tap protection: identical order from the same phone in the last 10 minutes → return it.
  const dup = await env.DB.prepare('SELECT id, total, event_id FROM orders WHERE phone = ? AND items = ? AND created_at > ? ORDER BY id DESC LIMIT 1')
    .bind(phone, itemsJson, Date.now() - 10 * 60_000)
    .first<{ id: number; total: number; event_id: string }>();
  if (dup) return json({ ok: true, orderNo: orderNo(dup.id), total: dup.total, eventId: dup.event_id });

  const eventId = crypto.randomUUID();
  const row = await env.DB.prepare(
    `INSERT INTO orders (created_at, name, phone, address, qty, items, subtotal, delivery, total, event_id, ip, user_agent, fbp, fbc, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(
      Date.now(),
      name,
      phone,
      address,
      qty,
      itemsJson,
      price.subtotal,
      price.delivery,
      price.total,
      eventId,
      user.ip ?? null,
      user.ua?.slice(0, 300) ?? null,
      user.fbp ?? null,
      user.fbc ?? null,
      sourceUrl,
    )
    .first<{ id: number }>();
  const id = row!.id;

  // Server-side Purchase (deduplicated against the browser pixel by eventId).
  ctx.waitUntil(
    sendCapi(
      env,
      {
        event_name: 'Purchase',
        event_id: eventId,
        event_source_url: sourceUrl ?? undefined,
        custom_data: {
          value: price.total,
          currency: CURRENCY,
          content_ids: [PRODUCT.id],
          content_type: 'product',
          content_name: PRODUCT.name,
          num_items: qty,
          order_id: orderNo(id),
        },
      },
      { ...user, phone, name },
    ).then((r) => env.DB.prepare('UPDATE orders SET capi = ? WHERE id = ?').bind(r, id).run()),
  );

  return json({ ok: true, orderNo: orderNo(id), total: price.total, eventId });
}

const TRACKABLE = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout']);

async function trackEvent(req: Request, env: Env, ctx: ExecutionContext) {
  if (!capiEnabled(env)) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { event?: string; eventId?: string; url?: string; data?: Record<string, unknown> } | null;
  const user = userFromRequest(req);
  if (!body?.event || !TRACKABLE.has(body.event) || typeof body.eventId !== 'string' || isBot(user.ua ?? null)) {
    return new Response(null, { status: 204 });
  }
  const d = body.data || {};
  const custom_data = {
    value: Number(d.value) || undefined,
    currency: CURRENCY,
    content_ids: [PRODUCT.id],
    content_type: 'product',
    content_name: PRODUCT.name,
    num_items: Number(d.num_items) || undefined,
  };
  ctx.waitUntil(
    sendCapi(env, { event_name: body.event, event_id: body.eventId.slice(0, 64), event_source_url: body.url?.slice(0, 500), custom_data }, user),
  );
  return new Response(null, { status: 204 });
}
