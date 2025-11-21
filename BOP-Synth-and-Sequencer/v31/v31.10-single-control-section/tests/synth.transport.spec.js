import { describe, it, expect } from 'vitest';

import { Transport } from '../modules/synth/synth-transport.js';

describe('synth transport', () => {
  it('exports a Transport class for UI wiring', () => {
    expect(typeof Transport).toBe('function');
  });

  it.todo('maintains tempo-phase continuity when tempo changes');
  it.todo('debounces rapid play/stop toggles using FakeClock');
  it.todo('updates status indicators without DOM side effects under test fakes');
});
