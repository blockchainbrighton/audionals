// __tests__/presetManager.test.js
import { savePreset, loadPreset, listPresets, removePreset, clearPresets } from '../presetManager.js';
import { emit, on } from '../eventBus.js';
import { getState } from '../stateManager.js';

// Mock stateManager
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: { 0: { 0: true, 4: true } },
    },
    transport: {
      bpm: 120,
      isPlaying: false,
    },
  })),
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = mockLocalStorage;

describe('presetManager', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('should save a preset and emit event', async () => {
    const callback = jest.fn();
    on('PRESET/SAVED', callback);

    await savePreset({ name: 'Test Beat', description: 'A simple pattern' });

    const presets = await listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Test Beat');
    expect(presets[0].description).toBe('A simple pattern');
    expect(presets[0].data.grid.tracks).toBe(8);
    expect(presets[0].data.transport.bpm).toBe(120);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PRESET/SAVED',
        payload: { name: 'Test Beat' }
      })
    );
  });

  test('should not allow empty preset name', async () => {
    await expect(savePreset({ name: '' })).rejects.toThrow('cannot be empty');
    await expect(savePreset({ name: null })).rejects.toThrow('required');
    await expect(savePreset({})).rejects.toThrow('required');
  });

  test('should overwrite existing preset with same name', async () => {
    await savePreset({ name: 'Duplicate', description: 'First' });
    await savePreset({ name: 'Duplicate', description: 'Second' });

    const presets = await listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].description).toBe('Second');
  });

  test('should load a saved preset and emit event', async () => {
    await savePreset({ name: 'Loaded Beat' });

    const callback = jest.fn();
    on('PRESET/LOADED', callback);

    await loadPreset({ name: 'Loaded Beat' });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PRESET/LOADED',
        payload: expect.objectContaining({
          name: 'Loaded Beat',
          preset: expect.objectContaining({
            grid: expect.any(Object),
            transport: expect.any(Object)
          })
        })
      })
    );
  });

  test('should throw error when loading non-existent preset', async () => {
    await expect(loadPreset({ name: 'Missing' })).rejects.toThrow('not found');
  });

  test('should list all saved presets', async () => {
    await savePreset({ name: 'Beat 1' });
    await savePreset({ name: 'Beat 2' });

    const presets = await listPresets();
    expect(presets).toHaveLength(2);
    expect(presets.map(p => p.name)).toEqual(['Beat 1', 'Beat 2']);
    expect(presets[0]).toHaveProperty('timestamp');
    expect(presets[0]).toHaveProperty('data');
  });

  test('should remove a preset', async () => {
    await savePreset({ name: 'To Remove' });
    const callback = jest.fn();
    on('PRESET/REMOVED', callback);

    await removePreset({ name: 'To Remove' });

    const presets = await listPresets();
    expect(presets).toHaveLength(0);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PRESET/REMOVED',
        payload: { name: 'To Remove' }
      })
    );
  });

  test('should throw when removing non-existent preset', async () => {
    await expect(removePreset({ name: 'Missing' })).rejects.toThrow('not found');
  });

  test('should clear all presets', async () => {
    await savePreset({ name: 'Beat 1' });
    const callback = jest.fn();
    on('PRESET/CLEARED', callback);

    await clearPresets();

    const presets = await listPresets();
    expect(presets).toHaveLength(0);
    expect(callback).toHaveBeenCalled();
  });

  test('should handle localStorage parse errors gracefully', () => {
    localStorage.setItem('ordinal-sequencer-presets', 'invalid json');
    expect(listPresets()).resolves.toEqual([]);
  });
});