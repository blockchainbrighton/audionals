import { describe, it, expect } from 'vitest';

import { schedulerHost, TRANSPORT_START_DELAY } from '../modules/sequencer/sequencer-scheduler-host.js';

describe('sequencer scheduler host', () => {
  it('provides a scheduler singleton instance', () => {
    expect(schedulerHost).toBeDefined();
    expect(typeof schedulerHost.handleSequenceEnd).toBe('function');
  });

  it('exposes transport delay constant as a number', () => {
    expect(typeof TRANSPORT_START_DELAY).toBe('number');
  });

  it.todo('ticks propagate playhead cadence against FakeClock budgets');
  it.todo('queues sampler snapshots without mutating source channel data');
});
