import { describe, it, expect } from 'vitest';

import { PresetManager } from '../modules/synth/synth-preset-manager.js';
import * as presetCatalog from '../modules/synth/synth-presets.js';

describe('synth preset manager', () => {
  it('exports PresetManager constructor', () => {
    expect(typeof PresetManager).toBe('function');
  });

  it('exposes preset catalog helpers for serialization', () => {
    expect(Array.isArray(presetCatalog.PRESET_CATALOG)).toBe(true);
  });

  it.todo('applies preset values within defined parameter ranges');
  it.todo('serializes and deserializes presets idempotently');
});
