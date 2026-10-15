// Meta Pixel (browser) + Conversions API (server) with shared event IDs,
// so Meta de-duplicates the two copies of every event.
// The pixel base script itself lives inline in index.html (loaded after the page is interactive).

type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
    __TH?: { p?: string; e?: string };
  }
}

export const newEventId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Fire a browser pixel event and mirror it to CAPI via /api/track. */
export function track(event: 'ViewContent' | 'AddToCart' | 'InitiateCheckout', data: Record<string, unknown>) {
  if (!window.__TH?.p) return;
  const eventID = newEventId();
  window.fbq?.('track', event, data, { eventID });
  const body = JSON.stringify({ event, eventId: eventID, url: location.href, data });
  try {
    if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) throw 0;
  } catch {
    fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  }
}

/** Purchase: CAPI copy is sent by the server when the order is saved, using the same eventId. */
export function trackPurchase(eventId: string, data: Record<string, unknown>, user: { phone: string; name: string }) {
  const id = window.__TH?.p;
  if (!id || !window.fbq) return;
  // Advanced matching — the pixel hashes these in the browser before sending.
  const [fn, ...rest] = user.name.trim().toLowerCase().split(/\s+/);
  window.fbq('init', id, { ph: `88${user.phone}`, fn, ln: rest.join(' ') || undefined, country: 'bd', external_id: `88${user.phone}` });
  window.fbq('track', 'Purchase', data, { eventID: eventId });
}

/** Fire once per page view. */
const fired = new Set<string>();
export function trackOnce(key: string, fn: () => void) {
  if (fired.has(key)) return;
  fired.add(key);
  fn();
}
