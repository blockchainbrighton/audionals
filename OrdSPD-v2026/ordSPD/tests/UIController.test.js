import { describe, expect, it, vi } from 'vitest';

const { createIframesMock, clearAllIframesMock, selectionManagerCtorMock } = vi.hoisted(() => ({
  createIframesMock: vi.fn(),
  clearAllIframesMock: vi.fn(),
  selectionManagerCtorMock: vi.fn()
}));

vi.mock('../javaScript/IframeManager.js', () => ({
  createIframes: createIframesMock,
  clearAllIframes: clearAllIframesMock
}));

vi.mock('../javaScript/IframeSelectionManager.js', () => ({
  IframeSelectionManager: class {
    constructor() {
      selectionManagerCtorMock();
    }
  }
}));

function createIframeWithSpy(id) {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  if (!iframe.contentWindow) {
    const postMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true
    });
    return { iframe, postMessage };
  }
  return {
    iframe,
    postMessage: vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {})
  };
}

async function importUIController() {
  vi.resetModules();
  return import('../javaScript/UIController.js');
}

describe('UIController', () => {
  it('initializes controls on DOMContentLoaded and handles BPM/guide/clear actions', async () => {
    document.body.innerHTML = `
      <input id="globalBPM" value="128" />
      <button id="setBPM" type="button">Set</button>
      <button id="toggleGuide" type="button">Hide User Guide</button>
      <button id="clearAllButton" type="button">Clear</button>
      <div class="right-column"></div>
      <div id="guideContent"></div>
    `;
    window.requestAnimationFrame = (cb) => cb();

    const first = createIframeWithSpy('iframe-0');
    const second = createIframeWithSpy('iframe-1');
    document.body.appendChild(first.iframe);
    document.body.appendChild(second.iframe);

    await importUIController();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(selectionManagerCtorMock).toHaveBeenCalled();
    expect(createIframesMock).toHaveBeenCalledTimes(1);
    expect(document.getElementById('guideContent').style.display).toBe('block');

    document.getElementById('setBPM').click();
    expect(first.postMessage).toHaveBeenCalled();
    expect(second.postMessage).toHaveBeenCalled();
    expect(first.postMessage.mock.calls[0][0]).toEqual({
      type: 'updateBPM',
      data: { bpm: 128 }
    });
    expect(first.postMessage.mock.calls[0][1]).toBe('*');

    document.getElementById('clearAllButton').click();
    expect(clearAllIframesMock).toHaveBeenCalledTimes(1);

    document.getElementById('toggleGuide').click();
    expect(document.getElementById('guideContent').style.display).toBe('none');
    expect(document.getElementById('toggleGuide').textContent).toBe('Show User Guide');
    expect(document.querySelector('.right-column').classList.contains('right-column-hidden')).toBe(true);
  });
});
