import { beforeEach, describe, expect, it, vi } from 'vitest';

function setupDomWithRandomButton() {
  document.body.innerHTML = `<button class="random-mix-btn" type="button">Random Mix</button>`;
}

function createPadGrid(count, { withIframes = false } = {}) {
  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'iframe-wrapper';
    wrapper.dataset.iframeIndex = String(i);

    if (withIframes) {
      const iframe = document.createElement('iframe');
      iframe.id = `iframe-${i}`;
      wrapper.appendChild(iframe);
    }

    const button = document.createElement('button');
    button.className = 'load-button';
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
  }
}

async function importContentLoader() {
  vi.resetModules();
  return import('../javaScript/ContentLoader.js');
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ContentLoader performance', () => {
  beforeEach(() => {
    setupDomWithRandomButton();
    vi.useRealTimers();
    delete window.ORDSPD_ENABLE_DEFERRED_PRELOAD;
    delete window.ORDSPD_STARTUP_IMMEDIATE_PRELOAD_COUNT;
  });

  it('deduplicates repeated fetches for the same URL', async () => {
    const firstIframe = document.createElement('iframe');
    const firstButton = document.createElement('button');
    firstButton.className = 'load-button';
    const secondIframe = document.createElement('iframe');
    const secondButton = document.createElement('button');
    secondButton.className = 'load-button';

    document.body.appendChild(firstIframe);
    document.body.appendChild(firstButton);
    document.body.appendChild(secondIframe);
    document.body.appendChild(secondButton);

    globalThis.prompt = vi.fn(() => 'https://example.com/shared-page.html');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
    });

    const { loadContentFromURL, __resetContentLoaderCacheForTests } = await importContentLoader();
    __resetContentLoaderCacheForTests();

    loadContentFromURL(firstIframe, firstButton);
    loadContentFromURL(secondIframe, secondButton);
    await flushMicrotasks();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(firstButton.classList.contains('hidden')).toBe(true);
    expect(secondButton.classList.contains('hidden')).toBe(true);
  });

  it('caps startup preload fetch concurrency and postpones deferred work until immediate batch completes', async () => {
    vi.useFakeTimers();

    createPadGrid(36, { withIframes: false });

    const pendingResolvers = [];
    let inFlight = 0;
    let maxInFlight = 0;

    globalThis.fetch = vi.fn(() => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      return new Promise((resolve) => {
        pendingResolvers.push(() => {
          inFlight -= 1;
          resolve({
            ok: true,
            text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
          });
        });
      });
    });

    const {
      preloadContent,
      PRELOAD_BATCH_CONCURRENCY,
      PRELOAD_TASK_STAGGER_MS,
      STARTUP_DEFERRED_PRELOAD_DELAY_MS
    } = await importContentLoader();
    window.ORDSPD_ENABLE_DEFERRED_PRELOAD = true;
    window.ORDSPD_STARTUP_IMMEDIATE_PRELOAD_COUNT = PRELOAD_BATCH_CONCURRENCY;

    preloadContent();

    expect(globalThis.fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(globalThis.fetch.mock.calls.length).toBeLessThanOrEqual(PRELOAD_BATCH_CONCURRENCY);
    expect(maxInFlight).toBeLessThanOrEqual(PRELOAD_BATCH_CONCURRENCY);

    await vi.advanceTimersByTimeAsync(STARTUP_DEFERRED_PRELOAD_DELAY_MS + 1000);
    expect(globalThis.fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(globalThis.fetch.mock.calls.length).toBeLessThanOrEqual(PRELOAD_BATCH_CONCURRENCY);

    for (let i = 0; i < 80; i++) {
      while (pendingResolvers.length > 0) {
        const resolve = pendingResolvers.shift();
        resolve();
      }
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(PRELOAD_TASK_STAGGER_MS + 10);

      if (globalThis.fetch.mock.calls.length >= 10 && pendingResolvers.length === 0) {
        break;
      }
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(10);
    expect(maxInFlight).toBeLessThanOrEqual(PRELOAD_BATCH_CONCURRENCY);

    vi.useRealTimers();
  });
});
