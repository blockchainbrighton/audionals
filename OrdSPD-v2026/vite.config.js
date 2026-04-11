import { defineConfig } from 'vite';

export default defineConfig({
  root: 'ordSPD',
  base: './',
  optimizeDeps: {
    entries: ['index.html']
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  },
  build: {
    outDir: '../dist/ordSPD',
    emptyOutDir: true
  }
});
