import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    proxy: {
      // Fixes browser CORS for Hiro API calls by proxying through the Vite dev server.
      // The app can call `${location.origin}/hiro-testnet/...` and `${location.origin}/hiro-mainnet/...`.
      '/hiro-testnet': {
        target: 'https://api.testnet.hiro.so',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hiro-testnet/, ''),
      },
      '/hiro-mainnet': {
        target: 'https://api.hiro.so',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hiro-mainnet/, ''),
      },
    },
  },
  define: {
    // This solves the 'global is not defined' error in Stacks.js
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Some versions of stacks.js require explicit buffer mapping
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    // This forces Vite to pre-bundle these correctly
    include: [
      '@stacks/connect',
      '@stacks/transactions',
      '@stacks/network',
      '@stacks/common',
      'bs58'
    ],
  },
  build: {
    commonjsOptions: {
      // This is the specific fix for the bs58 / "default export" error
      transformMixedEsModules: true,
    },
  },
});
