import { describe, it, expect } from 'vitest';

import * as sequencerSaveLoad from '../modules/sequencer/sequencer-save-load.js';

describe('project save/load entry points', () => {
  it('exposes sequencer save & load functions', () => {
    expect(typeof sequencerSaveLoad.saveProject).toBe('function');
    expect(typeof sequencerSaveLoad.loadProject).toBe('function');
  });

  it.todo('performs sequencer save/load round-trip without mutating source state');
  it.todo('serializes synth patches then restores them without diff');
});
