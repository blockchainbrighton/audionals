// __tests__/presetManager.test.js
/**
 * Unit tests for presetManager.js
 * @file presetManager.test.js
 */

import { savePreset, loadPreset, listPresets } from '../presetManager.js';
import { getState } from '../stateManager.js';

describe('presetManager', () => {
  beforeEach(() => {
    localStorage.clear();
    window.__TEST_STATE__ = {
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {}
      }
    };
  });

  test('savePreset saves preset to localStorage', () => {
    const result = savePreset('Test Groove');

    expect(result).toBe(true);

    const stored = JSON.parse(localStorage.getItem('ordinal-sequencer-presets'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Test Groove');
    expect(typeof stored[0].timestamp).toBe('number');
    expect(Object.keys(stored[0].data)).toHaveLength(0); // empty pattern
  });

  test('savePreset overwrites existing preset with same name', () => {
    savePreset('My Pattern');
    savePreset('My Pattern'); // overwrite

    const stored = JSON.parse(localStorage.getItem('ordinal-sequencer-presets'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('My Pattern');
  });

  test('loadPreset returns null for non-existent preset', () => {
    const result = loadPreset('Nonexistent');

    expect(result).toBeNull();
  });

  test('loadPreset updates grid patternData', () => {
    // First save a preset
    const initialPattern = { '0-0': true, '1-1': false };
    window.__TEST_STATE__.grid.patternData = initialPattern;

    savePreset('Test Load');

    // Now load it
    const loaded = loadPreset('Test Load');

    expect(loaded).not.toBeNull();
    expect(loaded.name).toBe('Test Load');
    expect(loaded.data).toEqual(initialPattern);

    // Verify state was updated
    const state = getState();
    expect(state.grid.patternData).toEqual(initialPattern);
  });

  test('listPresets returns sorted array of presets', () => {
    const now = Date.now();

    // Save two presets with different timestamps
    localStorage.setItem('ordinal-sequencer-presets', JSON.stringify([
      { name: 'Old', timestamp: now - 10000 },
      { name: 'New', timestamp: now }
    ]));

    const presets = listPresets();

    expect(presets).toHaveLength(2);
    expect(presets[0].name).toBe('New');
    expect(presets[1].name).toBe('Old');
  });

  test('listPresets returns empty array when no presets exist', () => {
    const result = listPresets();

    expect(result).toEqual([]);
  });

  test('savePreset handles invalid input gracefully', () => {
    const result = savePreset('');

    expect(result).toBe(false);
  });

  test('loadPreset handles corrupted localStorage', () => {
    localStorage.setItem('ordinal-sequencer-presets', 'invalid-json');

    const result = loadPreset('Test');

    expect(result).toBeNull();
  });

  test('listPresets handles corrupted localStorage', () => {
    localStorage.setItem('ordinal-sequencer-presets', 'invalid-json');

    const result = listPresets();

    expect(result).toEqual([]);
  });

  test('savePreset uses correct key', () => {
    savePreset('Test');

    const stored = localStorage.getItem('ordinal-sequencer-presets');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored)[0].name).toBe('Test');
  });
});