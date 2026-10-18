import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({
  plugins: [react()],
  root: resolve('apps/chrome-extension'),
  base: './',
  publicDir: false,
  build: { outDir: resolve('dist-extension'), emptyOutDir: true },
});
