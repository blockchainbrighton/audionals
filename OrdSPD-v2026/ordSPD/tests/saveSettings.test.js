import { describe, expect, it, vi } from 'vitest';

function setupDom() {
  document.body.innerHTML = `<button id="saveSettingsButton" type="button">Save</button>`;
}

async function importSaveSettingsModule() {
  vi.resetModules();
  return import('../javaScript/saveSettings.js');
}

describe('saveSettings', () => {
  it('cancels export when iframe settings are empty and user rejects confirmation', async () => {
    setupDom();
    window.iframeSettings = {};
    globalThis.confirm = vi.fn(() => false);
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const { exportIframeDetailsToJSON } = await importSaveSettingsModule();
    exportIframeDetailsToJSON();

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('exports only valid iframe settings and strips ordinals URL prefix', async () => {
    setupDom();
    window.iframeSettings = {
      'iframe-0': {
        url: 'https://ordinals.com/content/abc123i0',
        speed: 1.5,
        action: 'increaseScheduleMultiplier',
        times: 2
      },
      'iframe-1': {
        url: 'https://ordinals.com/content/invalidi0',
        speed: 0,
        action: '',
        times: -1
      }
    };

    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { exportIframeDetailsToJSON } = await importSaveSettingsModule();
    exportIframeDetailsToJSON();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);

    const anchor = appendSpy.mock.calls[0][0];
    const href = anchor.getAttribute('href');
    const encoded = href.split(',')[1];
    const payload = JSON.parse(decodeURIComponent(encoded));

    expect(payload).toHaveLength(1);
    expect(payload[0]).toEqual({
      id: 'iframe-0',
      url: 'abc123i0',
      speed: 1.5,
      action: 'increaseScheduleMultiplier',
      times: 2
    });
    expect(anchor.getAttribute('download')).toBe('iframeDetails.json');
  });

  it('uses the save button debounce handler to trigger export after 300ms', async () => {
    vi.useFakeTimers();
    setupDom();
    window.iframeSettings = {
      'iframe-0': {
        url: 'https://ordinals.com/content/abc123i0',
        speed: 1.25,
        action: 'decreaseScheduleMultiplier',
        times: 1
      }
    };

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await importSaveSettingsModule();
    document.getElementById('saveSettingsButton').click();

    expect(clickSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
