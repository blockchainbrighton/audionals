import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withDom } from './helpers/dom-guard.js';

describe('app init contract', () => {
  beforeEach(() => {
    globalThis.__SEQUENCER_DISABLE_AUTO_START__ = true;
  });

  afterEach(() => {
    delete globalThis.__SEQUENCER_DISABLE_AUTO_START__;
  });

  it('exports startSequencerApp without touching global DOM', async () => {
    const appInit = await import('../modules/app-init.js');
    expect(typeof appInit.startSequencerApp).toBe('function');
    expect(globalThis.document).toBeUndefined();
    expect(globalThis.window).toBeUndefined();
  });

  it('exports initSequencerUI from sequencer-ui and keeps DOM opt-in', async () => {
    const { initSequencerUI } = await import('../modules/sequencer/sequencer-ui.js');
    expect(typeof initSequencerUI).toBe('function');
    expect(globalThis.document).toBeUndefined();
  });

  it('initSequencerUI boots with minimal DOM stubs via withDom', async () => {
    const { initSequencerUI } = await import('../modules/sequencer/sequencer-ui.js');

    await withDom(() => {
      const stubWindow = {
        addEventListener: () => {},
        removeEventListener: () => {},
        requestAnimationFrame: (cb) => setTimeout(cb, 0),
        cancelAnimationFrame: (id) => clearTimeout(id)
      };
      const stubDocument = {
        defaultView: stubWindow,
        readyState: 'complete',
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        getElementById: () => null
      };

      expect(() => initSequencerUI({ document: stubDocument })).not.toThrow();
    });
  });
});
