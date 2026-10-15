import { json, type Env } from './env';
import { sha256 } from './meta';
import { isStatus, statusInfo, type AdminOrder } from '../src/shared/status';
import { orderNo } from '../src/shared/bn';
import { colorById } from '../src/shared/product';

const TOKEN_DAYS = 30;
const enc = new TextEncoder();

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verify(req: Request, env: Env) {
  if (!env.ADMIN_PASSWORD) return false;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, `admin:${exp}`));
}

// Asia/Dhaka (UTC+6) midnight, as unix ms
function dhakaDayStart(now = Date.now()) {
  const off = 6 * 3600_000;
  return Math.floor((now + off) / 86400_000) * 86400_000 - off;
}

type Row = {
  id: number;
  created_at: number;
  name: string;
  phone: string;
  address: string;
  qty: number;
  items: string;
  subtotal: number;
  delivery: number;
  total: number;
  status: AdminOrder['status'];
  note: string;
  capi: string | null;
};

const toOrder = (r: Row): AdminOrder => ({
  id: r.id,
  orderNo: orderNo(r.id),
  createdAt: r.created_at,
  name: r.name,
  phone: r.phone,
  address: r.address,
  qty: r.qty,
  items: JSON.parse(r.items),
  subtotal: r.subtotal,
  delivery: r.delivery,
  total: r.total,
  status: r.status,
  note: r.note,
  capi: r.capi,
});

const COLS = 'id, created_at, name, phone, address, qty, items, subtotal, delivery, total, status, note, capi';

function filters(url: URL) {
  const where: string[] = [];
  const args: unknown[] = [];
  const status = url.searchParams.get('status');
  if (status && isStatus(status)) {
    where.push('status = ?');
    args.push(status);
  }
  const q = (url.searchParams.get('q') || '').trim();
  if (q) {
    const id = Number(q.replace(/^TH/i, '')) - 1000;
    where.push('(phone LIKE ? OR name LIKE ? OR id = ?)');
    args.push(`%${q}%`, `%${q}%`, Number.isFinite(id) ? id : -1);
  }
  return { where, args };
}

export async function handleAdmin(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace('/api/admin', '');

  if (path === '/login' && req.method === 'POST') {
    if (!env.ADMIN_PASSWORD) return json({ ok: false, error: 'ADMIN_PASSWORD সেট করা হয়নি' }, 500);
    const { password } = (await req.json().catch(() => ({}))) as { password?: string };
    const ok = safeEqual(await sha256(String(password ?? '')), await sha256(env.ADMIN_PASSWORD));
    if (!ok) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return json({ ok: false, error: 'ভুল পাসওয়ার্ড' }, 401);
    }
    const exp = String(Date.now() + TOKEN_DAYS * 86400_000);
    return json({ ok: true, token: `${exp}.${await hmac(env.ADMIN_PASSWORD, `admin:${exp}`)}` });
  }

  if (!(await verify(req, env))) return json({ ok: false, error: 'unauthorized' }, 401);

  // GET /api/admin/orders?status=&q=&before=
  if (path === '/orders' && req.method === 'GET') {
    const { where, args } = filters(url);
    const before = Number(url.searchParams.get('before'));
    const pageWhere = [...where];
    const pageArgs = [...args];
    if (before > 0) {
      pageWhere.push('id < ?');
      pageArgs.push(before);
    }
    const limit = 50;
    const today = dhakaDayStart();
    const [list, counts, stats] = await env.DB.batch([
      env.DB.prepare(
        `SELECT ${COLS} FROM orders ${pageWhere.length ? 'WHERE ' + pageWhere.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit + 1}`,
      ).bind(...pageArgs),
      env.DB.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status'),
      env.DB.prepare(
        `SELECT
           SUM(CASE WHEN created_at >= ?1 THEN 1 ELSE 0 END) AS todayOrders,
           SUM(CASE WHEN created_at >= ?1 AND status != 'cancelled' THEN total ELSE 0 END) AS todaySales,
           SUM(CASE WHEN created_at >= ?1 AND status != 'cancelled' THEN qty ELSE 0 END) AS todayPieces,
           COUNT(*) AS allOrders,
           SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) AS deliveredSales
         FROM orders`,
      ).bind(today),
    ]);
    const rows = list.results as Row[];
    return json({
      ok: true,
      orders: rows.slice(0, limit).map(toOrder),
      hasMore: rows.length > limit,
      counts: Object.fromEntries((counts.results as { status: string; n: number }[]).map((r) => [r.status, r.n])),
      stats: stats.results[0],
    });
  }

  // CSV export with every detail. ?all=1 → every order (ignores the current filter/search).
  if (path === '/export' && req.method === 'GET') {
    const { where, args } = url.searchParams.get('all') === '1' ? { where: [], args: [] } : filters(url);
    const { results } = await env.DB.prepare(
      `SELECT ${COLS}, source_url, ip FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`,
    )
      .bind(...args)
      .all<Row & { source_url: string | null; ip: string | null }>();
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Order No', 'Date (Dhaka)', 'Name', 'Phone', 'Address', 'Pieces',
      'Item 1 Colour', 'Item 1 Size', 'Item 2 Colour', 'Item 2 Size', 'Item 3 Colour', 'Item 3 Size',
      'Items', 'Subtotal', 'Delivery Charge', 'Total (COD)', 'Status', 'Note', 'Meta CAPI', 'Page URL', 'IP',
    ];
    const lines = [header.map(esc).join(',')];
    for (const r of results) {
      const o = toOrder(r);
      const cname = (id: string) => colorById(id)?.name ?? id;
      const perItem = [0, 1, 2].flatMap((i) => (o.items[i] ? [cname(o.items[i].color), o.items[i].size] : ['', '']));
      const items = o.items.map((it) => `${cname(it.color)}-${it.size}`).join(' | ');
      const date = new Date(o.createdAt + 6 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');
      lines.push(
        [o.orderNo, date, o.name, o.phone, o.address, o.qty, ...perItem, items, o.subtotal, o.delivery, o.total,
          statusInfo(o.status).label, o.note, o.capi, r.source_url, r.ip].map(esc).join(','),
      );
    }
    return new Response('\uFEFF' + lines.join('\r\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="thread-house-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
        'cache-control': 'no-store',
      },
    });
  }

  const m = path.match(/^\/orders\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (req.method === 'PATCH') {
      const body = (await req.json().catch(() => ({}))) as { status?: string; note?: string };
      const sets: string[] = [];
      const args: unknown[] = [];
      if (body.status !== undefined) {
        if (!isStatus(body.status)) return json({ ok: false, error: 'bad status' }, 400);
        sets.push('status = ?');
        args.push(body.status);
      }
      if (body.note !== undefined) {
        sets.push('note = ?');
        args.push(String(body.note).slice(0, 1000));
      }
      if (!sets.length) return json({ ok: false, error: 'nothing to update' }, 400);
      const row = await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ? RETURNING ${COLS}`)
        .bind(...args, id)
        .first<Row>();
      return row ? json({ ok: true, order: toOrder(row) }) : json({ ok: false, error: 'not found' }, 404);
    }
    if (req.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: 'not found' }, 404);
}
