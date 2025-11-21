import { describe, it, expect } from 'vitest';

import * as scheduling from '../modules/sequencer/sequencer-audio-time-scheduling.js';
import { FakeClock } from './helpers/fake-clock.js';

describe('sequencer audio-time scheduling', () => {
  it('exposes scheduler control functions', () => {
    expect(typeof scheduling.requestSchedulerResync).toBe('function');
    expect(typeof scheduling.setBPM).toBe('function');
  });

  it.todo('computes lookahead windows using FakeClock.tick');
  it.todo('rebuilds schedule buckets when BPM changes mid-phrase');
  it.todo('flushes pending events when stopPlayback is invoked');

  it('provides a FakeClock helper for future cadence tests', () => {
    const clock = new FakeClock(10);
    clock.tick(5);
    expect(clock.nowMs()).toBe(15);
  });
});
