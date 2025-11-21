import { describe, it, expect, vi } from 'vitest';
import PianoRoll from '../modules/synth/synth-piano-roll.js';
import { withDom } from './helpers/dom-guard.js';

function createToneStub() {
  class Signal {}
  class Param {}

  return {
    Signal,
    Param,
    Transport: {
      seconds: 0,
      position: '0:0:0'
    },
    Frequency(value) {
      const midi = typeof value === 'number' ? value : 60;
      return {
        toMidi: () => midi,
        toNote: () => (typeof value === 'string' ? value : `MIDI-${midi}`)
      };
    },
    immediate: () => 0,
    context: { currentTime: 0 }
  };
}

describe('PianoRoll viewport lifecycle', () => {
  it('detaches global listeners when hidden', () => {
    withDom(() => {
      window.Tone = createToneStub();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const eventBus = new window.EventTarget();
      const state = { seq: [], seqMeta: { recordBpm: 120 } };
      const roll = new PianoRoll(host, eventBus, state);
      expect(roll._keyListenersAttached).toBe(true);
      roll.setViewportActive(false);
      expect(roll._keyListenersAttached).toBe(false);
      expect(roll._dragHandlersAttached).toBe(false);
      roll.setViewportActive(true);
      expect(roll._keyListenersAttached).toBe(true);
      expect(roll._dragHandlersAttached).toBe(true);
    });
  });

  it('defers draw work until viewport resumes', () => {
    withDom(() => {
      window.Tone = createToneStub();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const eventBus = new window.EventTarget();
      const state = { seq: [], seqMeta: { recordBpm: 120 } };
      const roll = new PianoRoll(host, eventBus, state);
      roll.setViewportActive(false);
      roll.state.seq = [{ note: 'C4', start: 0, dur: 0.5, vel: 1 }];
      roll.draw();
      expect(roll._pendingDrawWhileHidden).toBe(true);
      roll.setViewportActive(true);
      expect(roll._pendingDrawWhileHidden).toBe(false);
      expect(roll.innerContent?.children?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it('does not schedule playhead RAF while hidden but resumes later', () => {
    withDom(() => {
      window.Tone = createToneStub();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const eventBus = new window.EventTarget();
      const state = { seq: [], seqMeta: { recordBpm: 120 }, isPlaying: true };
      const roll = new PianoRoll(host, eventBus, state);
      const originalRaf = globalThis.requestAnimationFrame;
      const originalCaf = globalThis.cancelAnimationFrame;
      const rafSpy = vi.fn(() => 1);
      const cafSpy = vi.fn();
      globalThis.requestAnimationFrame = rafSpy;
      globalThis.cancelAnimationFrame = cafSpy;
      roll.setViewportActive(false);
      roll.startPlayheadAnimation();
      expect(rafSpy).not.toHaveBeenCalled();
      roll.setViewportActive(true);
      expect(rafSpy).toHaveBeenCalled();
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCaf;
    });
  });
});
