import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMessageToSelectedIframesMock } = vi.hoisted(() => ({
  postMessageToSelectedIframesMock: vi.fn()
}));

vi.mock('../javaScript/IframeManager.js', () => ({
  postMessageToSelectedIframes: postMessageToSelectedIframesMock
}));

async function importIframeCommunication() {
  vi.resetModules();
  return import('../javaScript/iframeCommunication.js');
}

describe('iframeCommunication', () => {
  beforeEach(() => {
    window.iframeSettings = {};
    postMessageToSelectedIframesMock.mockClear();
  });

  it('updates scheduleMultiplier for "-" key and posts updated value', async () => {
    const { postKeyEventToIframes } = await importIframeCommunication();

    postKeyEventToIframes('-', 'iframe-1');

    expect(window.iframeSettings['iframe-1'].scheduleMultiplier).toBe(-0.1);
    expect(postMessageToSelectedIframesMock).toHaveBeenCalledWith('iframe-1', { scheduleMultiplier: -0.1 });
  });

  it('toggles mute setting between 1 and 0 across repeated "m" key events', async () => {
    const { postKeyEventToIframes } = await importIframeCommunication();

    postKeyEventToIframes('m', 'iframe-1');
    expect(window.iframeSettings['iframe-1'].mute).toBe(1);

    postKeyEventToIframes('m', 'iframe-1');
    expect(window.iframeSettings['iframe-1'].mute).toBe(0);
  });

  it('ignores unsupported keys without posting messages', async () => {
    const { postKeyEventToIframes } = await importIframeCommunication();

    postKeyEventToIframes('unsupported', 'iframe-1');

    expect(postMessageToSelectedIframesMock).not.toHaveBeenCalled();
    expect(window.iframeSettings['iframe-1']).toBeUndefined();
  });
});
