import { beforeEach, describe, expect, it, vi } from 'vitest';

function setupBaseDom() {
  document.body.innerHTML = `
    <button class="random-mix-btn" type="button">Random Mix</button>
    <div class="grid-container"></div>
  `;
}

async function importIframeManager() {
  vi.resetModules();
  return import('../javaScript/IframeManager.js');
}

function attachPostMessageSpy(iframe) {
  if (!iframe.contentWindow) {
    const postMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true
    });
    return postMessage;
  }
  return vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {});
}

describe('IframeManager', () => {
  beforeEach(() => {
    setupBaseDom();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<!DOCTYPE html><html><body>ok</body></html>'
    });
  });

  it('creates 36 wrappers, lazily creates iframe elements, and starts a small preload batch', async () => {
    const { createIframes, selectedIframeWrappers } = await importIframeManager();

    createIframes();

    const wrappers = document.querySelectorAll('.iframe-wrapper');
    const iframes = document.querySelectorAll('iframe');
    const loadButtons = document.querySelectorAll('.load-button');

    expect(wrappers).toHaveLength(36);
    expect(iframes).toHaveLength(1);
    expect(loadButtons).toHaveLength(36);
    expect(Object.keys(window.iframeSettings)).toHaveLength(36);
    expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(0);
    expect(globalThis.fetch.mock.calls.length).toBeLessThanOrEqual(1);
    expect(iframes[0].loading).toBe('lazy');

    wrappers[0].click();
    expect(selectedIframeWrappers.includes(wrappers[0])).toBe(true);
    expect(wrappers[0].classList.contains('selected-iframe')).toBe(true);

    wrappers[0].click();
    expect(selectedIframeWrappers.includes(wrappers[0])).toBe(false);
    expect(wrappers[0].classList.contains('selected-iframe')).toBe(false);
  });

  it('clears a single iframe and resets button state', async () => {
    const { clearIframe } = await importIframeManager();
    const iframe = document.createElement('iframe');
    iframe.src = 'https://ordinals.com/content/sample';
    const loadButton = document.createElement('button');
    loadButton.style.display = 'none';
    loadButton.textContent = 'Loading';

    clearIframe(iframe, loadButton);

    expect(iframe.src).toContain('about:blank');
    expect(loadButton.style.display).toBe('block');
    expect(loadButton.textContent).toBe('Load');
  });

  it('clears all iframes and deselects wrappers', async () => {
    const { clearAllIframes } = await importIframeManager();
    const container = document.querySelector('.grid-container');
    for (let i = 0; i < 3; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'iframe-wrapper selected-iframe';
      const iframe = document.createElement('iframe');
      iframe.src = `https://example.com/${i}`;
      const loadButton = document.createElement('button');
      loadButton.className = 'load-button';
      wrapper.appendChild(iframe);
      wrapper.appendChild(loadButton);
      container.appendChild(wrapper);
    }

    clearAllIframes();

    document.querySelectorAll('.iframe-wrapper').forEach((wrapper) => {
      const iframe = wrapper.querySelector('iframe');
      const button = wrapper.querySelector('.load-button');
      expect(wrapper.classList.contains('selected-iframe')).toBe(false);
      expect(iframe.src).toContain('about:blank');
      expect(button.textContent).toBe('Load');
    });
  });

  it('posts messages only to selected iframes', async () => {
    const { postMessageToSelectedIframes, selectedIframeWrappers } = await importIframeManager();
    selectedIframeWrappers.length = 0;

    const selectedWrapper = document.createElement('div');
    selectedWrapper.className = 'iframe-wrapper selected-iframe';
    const selectedIframe = document.createElement('iframe');
    selectedIframe.id = 'iframe-selected';
    selectedIframe.src = 'https://example.com/selected';
    const selectedSpy = attachPostMessageSpy(selectedIframe);
    selectedWrapper.appendChild(selectedIframe);

    const unselectedWrapper = document.createElement('div');
    unselectedWrapper.className = 'iframe-wrapper';
    const unselectedIframe = document.createElement('iframe');
    unselectedIframe.id = 'iframe-unselected';
    unselectedIframe.src = 'https://example.com/unselected';
    const unselectedSpy = attachPostMessageSpy(unselectedIframe);
    unselectedWrapper.appendChild(unselectedIframe);

    document.body.appendChild(selectedWrapper);
    document.body.appendChild(unselectedWrapper);
    selectedIframeWrappers.push(selectedWrapper);

    postMessageToSelectedIframes('updateVolume', { volume: 22 });

    expect(selectedSpy).toHaveBeenCalledWith(
      { type: 'updateVolume', data: { volume: 22 } },
      'https://example.com'
    );
    expect(unselectedSpy).not.toHaveBeenCalled();
  });
});
