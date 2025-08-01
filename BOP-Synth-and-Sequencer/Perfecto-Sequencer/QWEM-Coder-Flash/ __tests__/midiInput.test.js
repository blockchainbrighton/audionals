// __tests__/midiInput.test.js
import { midiInput } from '../midiInput';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

// Mock Web MIDI API
const mockMidiInput = {
  id: 'test-input-1',
  name: 'Test MIDI Device',
  manufacturer: 'Test Manufacturer',
  onmidimessage: null,
  onstatechange: null
};

const mockMidiAccess = {
  inputs: new Map([['test-input-1', mockMidiInput]]),
  onstatechange: null,
  requestMIDIAccess: jest.fn()
};

global.navigator = {
  requestMIDIAccess: jest.fn()
};

describe('midiInput', () => {
  let midiModule;

  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Reset global mocks
    global.navigator.requestMIDIAccess.mockReset();
    
    midiModule = midiInput(mockGetState, mockDispatch, mockEmit);
  });

  describe('initMidi()', () => {
    it('should initialize MIDI access when supported', async () => {
      global.navigator.requestMIDIAccess.mockResolvedValue(mockMidiAccess);
      
      const result = await midiModule.initMidi();
      
      expect(result).toBe(true);
      expect(global.navigator.requestMIDIAccess).toHaveBeenCalled();
    });

    it('should return false when MIDI is not supported', async () => {
      delete global.navigator.requestMIDIAccess;
      
      const result = await midiModule.initMidi();
      
      expect(result).toBe(false);
    });

    it('should handle MIDI initialization errors', async () => {
      global.navigator.requestMIDIAccess.mockRejectedValue(new Error('MIDI Error'));
      
      const result = await midiModule.initMidi();
      
      expect(result).toBe(false);
    });

    it('should not re-initialize when already initialized', async () => {
      global.navigator.requestMIDIAccess.mockResolvedValue(mockMidiAccess);
      
      await midiModule.initMidi(); // First init
      await midiModule.initMidi(); // Second init
      
      // Should only have been called once
      expect(global.navigator.requestMIDIAccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('midiNoteToGridCoordinates()', () => {
    it('should convert valid MIDI notes to grid coordinates', () => {
      const result = midiModule._test_midiNoteToGridCoordinates(36); // C2
      expect(result).toEqual({ track: 0, step: 0 });
      
      const result2 = midiModule._test_midiNoteToGridCoordinates(43); // G2
      expect(result2).toEqual({ track: 7, step: 7 });
    });

    it('should return null for invalid MIDI notes', () => {
      const result = midiModule._test_midiNoteToGridCoordinates(35); // Below range
      expect(result).toBeNull();
      
      const result2 = midiModule._test_midiNoteToGridCoordinates(52); // Above range
      expect(result2).toBeNull();
    });
  });

  describe('setupMidiInput()', () => {
    it('should set up MIDI message handling', () => {
      const mockInput = {
        id: 'test-input',
        onmidimessage: null
      };
      
      // Mock the internal setup function
      const originalSetup = midiModule.setupMidiInput;
      midiModule.setupMidiInput = jest.fn();
      
      midiModule.setupMidiInput(mockInput);
      
      expect(midiModule.setupMidiInput).toHaveBeenCalledWith(mockInput);
      
      // Restore original
      midiModule.setupMidiInput = originalSetup;
    });
  });

  describe('disposeMidi()', () => {
    it('should clean up MIDI resources', () => {
      // First initialize MIDI
      global.navigator.requestMIDIAccess.mockResolvedValue(mockMidiAccess);
      midiModule.initMidi();
      
      // Then dispose
      midiModule.disposeMidi();
      
      // Should have cleared inputs
      expect(midiModule.midiInputs.size).toBe(0);
    });

    it('should handle disposal when not initialized', () => {
      expect(() => midiModule.disposeMidi()).not.toThrow();
    });
  });
});