import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root,
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'jabwemeat-local-images',
      apply: 'build',
      async closeBundle() {
        await mkdir(resolve(root, 'dist/assets'), { recursive: true });
        await cp(resolve(root, 'assets'), resolve(root, 'dist/assets'), { recursive: true });
      }
    }
  ],
  server: { host: '127.0.0.1', port: 3000, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        storefront: resolve(root, 'index.html'),
        faq: resolve(root, 'faq/index.html'),
        privacy: resolve(root, 'privacy-policy/index.html'),
        admin: resolve(root, 'admin-dashboard/index.html'),
        checkout: resolve(root, 'checkout/index.html')
      }
    }
  }
});
