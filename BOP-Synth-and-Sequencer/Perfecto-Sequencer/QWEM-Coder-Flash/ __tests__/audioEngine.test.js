// __tests__/audioEngine.test.js
import { AudioEngine } from '../audioEngine';

// Mock ToneJS
global.Tone = {
  PolySynth: class {
    constructor() {
      this.toDestination = jest.fn();
      this.volume = { value: 0 };
    }
    triggerAttackRelease() {}
    dispose() {}
  },
  Synth: class {},
  Transport: {
    position: '0:0:0'
  }
};

describe('audioEngine', () => {
  beforeEach(() => {
    // Reset the singleton state
    jest.clearAllMocks();
  });

  describe('initAudio()', () => {
    it('should initialize audio context and create synth', async () => {
      const result = await AudioEngine.initAudio();
      
      expect(result).toBeUndefined();
      // Check that synth was created
      expect(global.Tone.PolySynth).toHaveBeenCalled();
    });

    it('should not re-initialize if already initialized', async () => {
      await AudioEngine.initAudio();
      const spy = jest.spyOn(global.Tone.PolySynth.prototype, 'constructor');
      
      await AudioEngine.initAudio();
      
      expect(spy).not.toHaveBeenCalled();
    });

    it('should throw error when ToneJS is not available', async () => {
      const originalTone = global.Tone;
      delete global.Tone;
      
      await expect(AudioEngine.initAudio()).rejects.toThrow('ToneJS not loaded');
      
      // Restore
      global.Tone = originalTone;
    });
  });

  describe('triggerNote()', () => {
    beforeEach(async () => {
      await AudioEngine.initAudio();
    });

    it('should play a note with correct parameters', () => {
      const mockTrigger = jest.spyOn(global.Tone.PolySynth.prototype, 'triggerAttackRelease');
      
      AudioEngine.triggerNote('C4', 0.5, 0.2);
      
      expect(mockTrigger).toHaveBeenCalledWith('C4', 0.2, 0.5);
    });

    it('should use default duration when not provided', () => {
      const mockTrigger = jest.spyOn(global.Tone.PolySynth.prototype, 'triggerAttackRelease');
      
      AudioEngine.triggerNote('G5', 1.0);
      
      expect(mockTrigger).toHaveBeenCalledWith('G5', 0.1, 1.0);
    });

    it('should handle uninitialzed state gracefully', () => {
      const disposeSpy = jest.spyOn(global.Tone.PolySynth.prototype, 'dispose');
      const triggerSpy = jest.spyOn(global.Tone.PolySynth.prototype, 'triggerAttackRelease');
      
      // Dispose the engine to simulate uninitialized state
      AudioEngine.dispose();
      
      // This should not throw an error but warn in console
      expect(() => AudioEngine.triggerNote('C4', 0.5)).not.toThrow();
      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    beforeEach(async () => {
      await AudioEngine.initAudio();
    });

    it('should dispose of synth and reset state', () => {
      const mockDispose = jest.spyOn(global.Tone.PolySynth.prototype, 'dispose');
      
      AudioEngine.dispose();
      
      expect(mockDispose).toHaveBeenCalled();
      expect(AudioEngine).toHaveProperty('isInitialized', false);
    });

    it('should handle disposal when not initialized', () => {
      AudioEngine.dispose(); // Dispose first time
      
      // Second dispose should not cause errors
      expect(() => AudioEngine.dispose()).not.toThrow();
    });
  });
});