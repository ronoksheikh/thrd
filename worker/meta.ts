// Meta Conversions API (server-side events).
import type { Env } from './env';

const GRAPH_VERSION = 'v24.0';

export type UserInput = {
  ip?: string | null;
  ua?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  phone?: string; // 01XXXXXXXXX
  name?: string;
};

export type CapiEvent = {
  event_name: string;
  event_id: string;
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
};

const enc = new TextEncoder();
export async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function capiEnabled(env: Env) {
  return Boolean(env.META_PIXEL_ID && env.META_CAPI_TOKEN);
}

async function userData(u: UserInput) {
  const d: Record<string, unknown> = { country: [await sha256('bd')] };
  if (u.ip) d.client_ip_address = u.ip;
  if (u.ua) d.client_user_agent = u.ua;
  if (u.fbp) d.fbp = u.fbp;
  if (u.fbc) d.fbc = u.fbc;
  if (u.phone) {
    const ph = `88${u.phone}`; // E.164 without "+": 8801XXXXXXXXX
    d.ph = [await sha256(ph)];
    d.external_id = [await sha256(ph)];
  }
  if (u.name) {
    const [fn, ...rest] = u.name.trim().toLowerCase().split(/\s+/);
    if (fn) d.fn = [await sha256(fn)];
    if (rest.length) d.ln = [await sha256(rest.join(' '))];
  }
  return d;
}

/** Sends one event. Returns "ok" or a short error string (stored on orders for debugging). */
export async function sendCapi(env: Env, event: CapiEvent, user: UserInput): Promise<string> {
  if (!capiEnabled(env)) return 'disabled';
  const body: Record<string, unknown> = {
    data: [
      {
        ...event,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: await userData(user),
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN!)}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
    );
    if (res.ok) return 'ok';
    return `err ${res.status}: ${(await res.text()).slice(0, 200)}`;
  } catch (e) {
    return `err: ${String(e).slice(0, 200)}`;
  }
}

export function getCookie(req: Request, name: string): string | null {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function userFromRequest(req: Request): UserInput {
  return {
    ip: req.headers.get('cf-connecting-ip'),
    ua: req.headers.get('user-agent'),
    fbp: getCookie(req, '_fbp'),
    fbc: getCookie(req, '_fbc'),
  };
}

export const isBot = (ua: string | null) =>
  !ua || /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview|curl|wget/i.test(ua);
