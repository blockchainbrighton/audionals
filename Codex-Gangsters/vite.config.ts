import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@game': path.resolve(__dirname, 'src/game'),
      '@actors': path.resolve(__dirname, 'src/actors'),
      '@ai': path.resolve(__dirname, 'src/ai'),
      '@systems': path.resolve(__dirname, 'src/systems'),
      '@data': path.resolve(__dirname, 'src/data')
    }
  },
  server: {
    open: false
  }
});
