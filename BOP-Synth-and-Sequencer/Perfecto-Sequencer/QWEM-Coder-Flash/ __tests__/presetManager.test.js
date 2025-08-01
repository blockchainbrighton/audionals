// __tests__/presetManager.test.js
import { presetManager } from '../presetManager';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

describe('presetManager', () => {
  let presetModule;
  let originalLocalStorage;

  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Backup and mock localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    // Setup default state
    mockGetState.mockReturnValue({
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {
          0: { 0: true, 4: true },
          1: { 1: true, 5: true }
        }
      },
      transport: {
        bpm: 120,
        isPlaying: false,
        position: 0
      }
    });
    
    presetModule = presetManager(mockGetState, mockDispatch, mockEmit);
  });

  afterEach(() => {
    // Restore localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('savePreset()', () => {
    it('should save preset to localStorage', async () => {
      const presetName = 'My Awesome Pattern';
      
      await presetModule.savePreset(presetName);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ordinal_sequencer_presets',
        expect.any(String)
      );
      
      expect(mockEmit).toHaveBeenCalledWith('PRESET/SAVED', {
        presetName,
        presetData: expect.objectContaining({
          name: presetName,
          bpm: 120,
          patternData: {
            0: { 0: true, 4: true },
            1: { 1: true, 5: true }
          }
        })
      });
    });

    it('should handle duplicate preset names by replacing', async () => {
      // First save
      await presetModule.savePreset('Test Pattern');
      
      // Mock existing presets in localStorage
      localStorage.getItem.mockReturnValue(JSON.stringify([
        { name: 'Test Pattern', bpm: 100, patternData: {} }
      ]));
      
      // Save with same name
      await presetModule.savePreset('Test Pattern');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ordinal_sequencer_presets',
        expect.any(String)
      );
    });

    it('should throw error for invalid preset names', async () => {
      await expect(presetModule.savePreset('')).rejects.toThrow('Preset name must be a non-empty string');
      await expect(presetModule.savePreset(null)).rejects.toThrow('Preset name must be a non-empty string');
      await expect(presetModule.savePreset(123)).rejects.toThrow('Preset name must be a non-empty string');
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage error
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await expect(presetModule.savePreset('Test')).rejects.toThrow('Storage error');
      expect(mockEmit).toHaveBeenCalledWith('PRESET/SAVE_ERROR', {
        error: 'Storage error',
        presetName: 'Test'
      });
    });
  });

  describe('loadPreset()', () => {
    it('should load preset and apply to sequencer', async () => {
      const mockPreset = {
        name: 'Test Pattern',
        bpm: 130,
        patternData: {
          0: { 0: true, 4: true },
          1: { 1: true, 5: true }
        }
      };
      
      localStorage.getItem.mockReturnValue(JSON.stringify([mockPreset]));
      
      const result = await presetModule.loadPreset('Test Pattern');
      
      // Should have dispatched reset and step toggles
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'GRID/RESET' });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 0, step: 0, isActive: true }
      });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 0, step: 4, isActive: true }
      });
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'TRANSPORT/SET_BPM',
        payload: { bpm: 130 }
      });
      
      expect(mockEmit).toHaveBeenCalledWith('PRESET/LOADED', {
        presetName: 'Test Pattern',
        preset: mockPreset
      });
      
      expect(result).toEqual(mockPreset);
    });

    it('should throw error for non-existent preset', async () => {
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      
      await expect(presetModule.loadPreset('Non-existent')).rejects.toThrow('Preset "Non-existent" not found');
      expect(mockEmit).toHaveBeenCalledWith('PRESET/LOAD_ERROR', {
        error: 'Preset "Non-existent" not found',
        presetName: 'Non-existent'
      });
    });

    it('should handle invalid preset names', async () => {
      await expect(presetModule.loadPreset('')).rejects.toThrow('Preset name must be a non-empty string');
      await expect(presetModule.loadPreset(null)).rejects.toThrow('Preset name must be a non-empty string');
    });
  });

  describe('listPresets()', () => {
    it('should return list of presets from localStorage', () => {
      const mockPresets = [
        { name: 'Pattern 1', bpm: 120 },
        { name: 'Pattern 2', bpm: 130 }
      ];
      
      localStorage.getItem.mockReturnValue(JSON.stringify(mockPresets));
      
      const result = presetModule.listPresets();
      
      expect(result).toEqual(mockPresets);
    });

    it('should return empty array when no presets exist', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = presetModule.listPresets();
      
      expect(result).toEqual([]);
    });

    it('should handle malformed localStorage data', () => {
      localStorage.getItem.mockReturnValue('invalid json');
      
      const result = presetModule.listPresets();
      
      expect(result).toEqual([]);
    });
  });
});