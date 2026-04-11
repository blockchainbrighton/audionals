import { beforeEach, vi } from 'vitest';

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn();
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.iframeSettings = {};

  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  globalThis.prompt = vi.fn(() => null);
});
