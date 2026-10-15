export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Meta Pixel ID (public, set in wrangler.jsonc "vars") */
  META_PIXEL_ID?: string;
  /** Conversions API access token — secret: `wrangler secret put META_CAPI_TOKEN` */
  META_CAPI_TOKEN?: string;
  /** Optional: Events Manager → Test events code, only while testing */
  META_TEST_EVENT_CODE?: string;
  /** Admin panel password — secret: `wrangler secret put ADMIN_PASSWORD` */
  ADMIN_PASSWORD?: string;
}

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
