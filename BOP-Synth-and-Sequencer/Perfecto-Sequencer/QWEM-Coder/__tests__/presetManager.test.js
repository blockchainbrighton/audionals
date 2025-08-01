// __tests__/presetManager.test.js

/**
 * @file Unit tests for presetManager.js
 */

import { savePreset, loadPreset, listPresets, deletePreset } from '../presetManager.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');

describe('presetManager', () => {
  const mockPresetData = {
    tracks: 4,
    stepsPerTrack: 16,
    patternData: {
      'track-0': { 0: true, 4: true, 8: true, 12: true },
      'track-1': { 4: true, 12: true }
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Default mock state
    getState.mockReturnValue({
      grid: mockPresetData
    });
  });

  test('should save preset to localStorage', () => {
    const result = savePreset('My Preset');
    
    expect(result).toBe(true);
    expect(localStorage.getItem('ordinal_sequencer_presets')).toBeTruthy();
    expect(emit).toHaveBeenCalledWith('PRESET/SAVED', { name: 'My Preset' });
  });

  test('should handle invalid preset name when saving', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result1 = savePreset('');
    const result2 = savePreset(null);
    const result3 = savePreset(undefined);
    
    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(result3).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Preset name is required');
    
    consoleSpy.mockRestore();
  });

  test('should load preset and update state', () => {
    savePreset('Test Preset');
    const result = loadPreset('Test Preset');
    
    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'GRID/LOAD_PATTERN',
      payload: mockPresetData
    });
    expect(emit).toHaveBeenCalledWith('PRESET/LOADED', { name: 'Test Preset' });
  });

  test('should handle loading non-existent preset', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result = loadPreset('Non-existent Preset');
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Preset "Non-existent Preset" not found');
    expect(dispatch).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should list all presets including factory presets', () => {
    savePreset('My Custom Preset');
    
    const presets = listPresets();
    
    expect(presets['My Custom Preset']).toBeDefined();
    expect(presets['Basic Beat']).toBeDefined();
    expect(presets['Empty Pattern']).toBeDefined();
  });

  test('should delete user preset', () => {
    savePreset('Delete Me');
    const result = deletePreset('Delete Me');
    
    expect(result).toBe(true);
    expect(emit).toHaveBeenCalledWith('PRESET/DELETED', { name: 'Delete Me' });
    
    // Verify it's gone
    const presets = listPresets();
    expect(presets['Delete Me']).toBeUndefined();
  });

  test('should not delete factory presets', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result = deletePreset('Basic Beat');
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Cannot delete factory preset "Basic Beat"');
    
    consoleSpy.mockRestore();
  });

  test('should handle deleting non-existent preset', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result = deletePreset('Does Not Exist');
    
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Preset "Does Not Exist" not found');
    
    consoleSpy.mockRestore();
  });

  test('should handle invalid preset name when deleting', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const result1 = deletePreset('');
    const result2 = deletePreset(null);
    
    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Preset name is required');
    
    consoleSpy.mockRestore();
  });

  // Edge case: Test handling localStorage errors
  test('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock localStorage.setItem to throw an error
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('Storage full');
    });
    
    const result = savePreset('Error Test');
    
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith('PRESET/SAVE_FAILED', {
      name: 'Error Test',
      error: 'Storage full'
    });
    
    consoleSpy.mockRestore();
    // Restore original setItem
    Storage.prototype.setItem = localStorage.__proto__.setItem;
  });
});