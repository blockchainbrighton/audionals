import { beforeEach, describe, expect, it, vi } from 'vitest';

function createIframeWithSpy(id, src) {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.setAttribute('src', src);

  if (!iframe.contentWindow) {
    const postMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true
    });
    return { iframe, postMessage };
  }

  const postMessage = vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {});
  return { iframe, postMessage };
}

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

describe('ContentLoader', () => {
  beforeEach(() => {
    setupDomWithRandomButton();
    vi.useRealTimers();
    delete window.ORDSPD_ENABLE_DEFERRED_PRELOAD;
    delete window.ORDSPD_STARTUP_IMMEDIATE_PRELOAD_COUNT;
  });

  it('preloads settings immediately and defers remaining startup fetches', async () => {
    vi.useFakeTimers();

    createPadGrid(36, { withIframes: false });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
    });
    window.ORDSPD_ENABLE_DEFERRED_PRELOAD = true;

    const {
      preloadContent,
      STARTUP_IMMEDIATE_PRELOAD_COUNT,
      STARTUP_DEFERRED_PRELOAD_DELAY_MS
    } = await importContentLoader();
    preloadContent();

    expect(Object.keys(window.iframeSettings)).toHaveLength(36);
    expect(window.iframeSettings['iframe-0'].volume).toBe(1);
    expect(window.iframeSettings['iframe-0'].playbackSpeed).toBe(1);
    expect(window.iframeSettings['iframe-0'].scheduleMultiplier).toBe(1);
    expect(window.iframeSettings['iframe-0'].url).toMatch(/^https:\/\/ordinals\.com\/content\//);
    expect(window.iframeSettings['iframe-20'].url).toMatch(/^https:\/\/ordinals\.com\/content\//);

    await vi.advanceTimersByTimeAsync(STARTUP_DEFERRED_PRELOAD_DELAY_MS - 1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(STARTUP_IMMEDIATE_PRELOAD_COUNT);

    await vi.advanceTimersByTimeAsync(5000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(10);

    vi.useRealTimers();
  });

  it('runs deferred startup preload by default', async () => {
    vi.useFakeTimers();

    createPadGrid(36, { withIframes: false });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
    });

    const { preloadContent, STARTUP_IMMEDIATE_PRELOAD_COUNT } = await importContentLoader();
    preloadContent();

    await vi.advanceTimersByTimeAsync(399);
    expect(globalThis.fetch).toHaveBeenCalledTimes(STARTUP_IMMEDIATE_PRELOAD_COUNT);

    await vi.advanceTimersByTimeAsync(5000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(10);

    vi.useRealTimers();
  });

  it('loads HTML content from prompt URL and keeps load button hidden', async () => {
    const iframe = document.createElement('iframe');
    const loadButton = document.createElement('button');
    loadButton.className = 'load-button';
    document.body.appendChild(iframe);
    document.body.appendChild(loadButton);

    globalThis.prompt = vi.fn(() => 'https://example.com/page.html');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
    });

    const { loadContentFromURL } = await importContentLoader();
    loadContentFromURL(iframe, loadButton);
    await flushMicrotasks();

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/page.html');
    expect(loadButton.classList.contains('hidden')).toBe(true);
  });

  it('shows alert and restores load button when JSON payload is invalid', async () => {
    const iframe = document.createElement('iframe');
    const loadButton = document.createElement('button');
    loadButton.className = 'load-button';
    document.body.appendChild(iframe);
    document.body.appendChild(loadButton);

    globalThis.prompt = vi.fn(() => 'https://example.com/payload.json');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ protocol: 'bad', operation: 'deploy' })
    });

    const { loadContentFromURL } = await importContentLoader();
    loadContentFromURL(iframe, loadButton);
    await flushMicrotasks();

    expect(globalThis.alert).toHaveBeenCalledWith('There was an issue loading the JSON content.');
    expect(loadButton.classList.contains('hidden')).toBe(false);
  });

  it('randomizes play speeds and posts playAtSpeed to each iframe', async () => {
    const first = createIframeWithSpy('iframe-0', 'https://example.com/a');
    const second = createIframeWithSpy('iframe-1', 'https://example.com/b');
    document.body.appendChild(first.iframe);
    document.body.appendChild(second.iframe);

    const { randomizePlaySpeeds } = await importContentLoader();
    randomizePlaySpeeds();

    [first, second].forEach(({ iframe, postMessage }) => {
      expect(postMessage).toHaveBeenCalledTimes(1);
      const [message, origin] = postMessage.mock.calls[0];
      expect(message.type).toBe('playAtSpeed');
      expect(Number.parseFloat(message.data.speed)).toBeGreaterThan(0);
      expect(origin).toBe('https://example.com');
      expect(window.iframeSettings[iframe.id].speed).toBeDefined();
    });
  });

  it('randomizes schedule multipliers with 1-3 repeated actions per iframe', async () => {
    const first = createIframeWithSpy('iframe-0', 'https://example.com/a');
    const second = createIframeWithSpy('iframe-1', 'https://example.com/b');
    document.body.appendChild(first.iframe);
    document.body.appendChild(second.iframe);

    const { randomizeScheduleMultipliers } = await importContentLoader();
    randomizeScheduleMultipliers();

    [first, second].forEach(({ iframe, postMessage }) => {
      const callCount = postMessage.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(callCount).toBeLessThanOrEqual(3);

      const [message, origin] = postMessage.mock.calls[0];
      expect(['increaseScheduleMultiplier', 'decreaseScheduleMultiplier']).toContain(message.type);
      expect(origin).toBe('https://example.com');
      expect(window.iframeSettings[iframe.id].action).toBeDefined();
      expect(window.iframeSettings[iframe.id].times).toBeGreaterThanOrEqual(1);
      expect(window.iframeSettings[iframe.id].times).toBeLessThanOrEqual(3);
    });
  });

  it('builds an ordered selection plan with deterministic 2/3 grouping and variation settings', async () => {
    const { __buildOrderedSelectionPlanForTests } = await importContentLoader();
    const plan = __buildOrderedSelectionPlanForTests(12);

    expect(plan).toHaveLength(12);
    expect(plan[0].url).toBe(plan[1].url);
    expect(plan[0].times).toBe(2);
    expect(plan[1].times).toBe(2);

    expect(plan[2].url).toBe(plan[3].url);
    expect(plan[3].url).toBe(plan[4].url);
    expect(plan[2].times).toBe(2);
    expect(plan[3].times).toBe(2);
    expect(plan[4].times).toBe(3);
  });
});
