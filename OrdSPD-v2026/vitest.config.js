import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['ordSPD/tests/**/*.test.js'],
    setupFiles: ['ordSPD/tests/setup.js'],
    clearMocks: true,
    restoreMocks: true
  }
});
