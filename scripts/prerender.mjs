// Prerenders the homepage into dist/index.html (HTML + critical CSS) so the
// first paint needs zero JavaScript, then React hydrates it.
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, 'dist-ssr');

const { render } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);
const { html, styles } = render();

// Preload the Bangla font files so text renders in Anek Bangla on first paint.
const fonts = readdirSync(resolve(dist, 'assets')).filter((f) => /anek-bangla-bengali-(400|700)-normal.*\.woff2$/.test(f));
const preload = fonts.map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`).join('');

const file = resolve(dist, 'index.html');
const out = readFileSync(file, 'utf8')
  .replace('<!--app-head-->', preload + styles)
  .replace('<!--app-html-->', html);
if (out.includes('<!--app-html-->') || !html) throw new Error('prerender failed');
writeFileSync(file, out);
rmSync(ssrDir, { recursive: true, force: true });
console.log(`✓ prerendered index.html (${(out.length / 1024).toFixed(1)} KB, ${fonts.length} fonts preloaded)`);
