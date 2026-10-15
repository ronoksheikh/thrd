import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
  ssr: { noExternal: [/^@mui\//, /^@emotion\//] },
  // `npm run dev` (Vite) + `npm run dev:api` (Wrangler) together for local development.
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
});
