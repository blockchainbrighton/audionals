// __tests__/appBootstrap.test.js
import { appBootstrap } from '../appBootstrap';

describe('appBootstrap', () => {
  let mockModules;
  let bootstrapModule;

  beforeEach(() => {
    // Mock modules
    mockModules = {
      getState: jest.fn(),
      dispatch: jest.fn(),
      emit: jest.fn(),
      subscribe: jest.fn(),
      audioEngine: {
        initAudio: jest.fn().mockResolvedValue(undefined)
      },
      midiInput: {
        initMidi: jest.fn().mockResolvedValue(true)
      },
      sequencerGrid: {
        createGrid: jest.fn(),
        updateGrid: jest.fn()
      },
      transportController: {
        attachControls: jest.fn(),
        updateDisplay: jest.fn()
      },
      playbackScheduler: {
        startScheduler: jest.fn()
      },
      blockchainPersistence: {},
      presetManager: {}
    };
    
    bootstrapModule = appBootstrap(mockModules);
  });

  describe('bootstrap()', () => {
    it('should initialize all modules and start the app', async () => {
      await bootstrapModule.bootstrap();
      
      // Should have initialized audio engine
      expect(mockModules.audioEngine.initAudio).toHaveBeenCalled();
      
      // Should have initialized MIDI input
      expect(mockModules.midiInput.initMidi).toHaveBeenCalled();
      
      // Should have started playback scheduler
      expect(mockModules.playbackScheduler.startScheduler).toHaveBeenCalled();
      
      // Should have subscribed to state changes
      expect(mockModules.subscribe).toHaveBeenCalled();
      
      // Should have emitted completion event
      expect(mockModules.emit).toHaveBeenCalledWith('APP/BOOTSTRAP_COMPLETED');
    });

    it('should handle errors during initialization', async () => {
      // Mock audio engine failure
      mockModules.audioEngine.initAudio.mockRejectedValue(new Error('Audio init failed'));
      
      await expect(bootstrapModule.bootstrap()).rejects.toThrow('Audio init failed');
      
      // Should have emitted error event
      expect(mockModules.emit).toHaveBeenCalledWith('APP/BOOTSTRAP_ERROR', {
        error: 'Audio init failed'
      });
    });

    it('should work even if some modules are missing', async () => {
      // Remove some modules to test graceful handling
      delete mockModules.midiInput;
      delete mockModules.sequencerGrid;
      
      await bootstrapModule.bootstrap();
      
      // Should still complete successfully
      expect(mockModules.emit).toHaveBeenCalledWith('APP/BOOTSTRAP_COMPLETED');
    });

    it('should handle missing required modules gracefully', async () => {
      // Create modules without required functions
      const incompleteModules = {
        getState: jest.fn(),
        dispatch: jest.fn(),
        emit: jest.fn(),
        subscribe: jest.fn()
      };
      
      const incompleteBootstrap = appBootstrap(incompleteModules);
      await incompleteBootstrap.bootstrap();
      
      // Should still complete without errors
      expect(incompleteModules.emit).toHaveBeenCalledWith('APP/BOOTSTRAP_COMPLETED');
    });
  });
});