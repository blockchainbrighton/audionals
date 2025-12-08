import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // 1. Force 'process' and 'global' to exist
  define: {
    'process.env': {}, 
    global: 'window',
  },
  resolve: {
    // 2. Alias these to browser-compatible versions
    alias: {
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util'
    },
  },
  // 3. Load the polyfill plugin
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
});