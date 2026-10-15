// Generates simple placeholder sweatshirt images in public/products.
// Replace them with real product photos when ready (keep or update the paths in src/shared/product.ts).
import { writeFileSync } from 'node:fs';
const colors = { black: ['#232323', '#111'], white: ['#fbfbfb', '#e2e2e2'], orange: ['#f57c00', '#d86a00'], cream: ['#efe7da', '#d9cfbf'] };
for (const [id, [c, d]] of Object.entries(colors)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs><radialGradient id="bg" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#fff5f7"/><stop offset="1" stop-color="#f8c9d4"/></radialGradient></defs>
<rect width="800" height="800" fill="url(#bg)"/>
<ellipse cx="400" cy="705" rx="250" ry="22" fill="#000" opacity=".08"/>
<path d="M310 150c25 22 55 32 90 32s65-10 90-32l120 42c40 14 62 40 74 82l66 250c4 16-4 26-20 30l-46 12c-14 4-26-2-30-16l-50-180v262c0 18-10 28-28 28H258c-18 0-28-10-28-28V346l-50 180c-4 14-16 20-30 16l-46-12c-16-4-24-14-20-30l66-250c12-42 34-68 74-82z" fill="${c}" stroke="${d}" stroke-width="3"/>
<path d="M310 150c25 22 55 32 90 32s65-10 90-32l-14-6c-20 16-46 24-76 24s-56-8-76-24z" fill="${d}"/>
<rect x="230" y="642" width="340" height="28" rx="6" fill="${d}"/>
<path d="M70 512l76 20-6 24-76-20zM730 512l-76 20 6 24 76-20z" fill="${d}"/>
</svg>`;
  writeFileSync(new URL(`../public/products/${id}.svg`, import.meta.url), svg);
}
console.log('done');
