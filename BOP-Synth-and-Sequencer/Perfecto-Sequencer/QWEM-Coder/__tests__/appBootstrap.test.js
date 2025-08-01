// __tests__/appBootstrap.test.js

/**
 * @file Unit tests for appBootstrap.js
 */

import { bootstrap, shutdown } from '../appBootstrap.js';
import { getState, dispatch, subscribe } from '../stateManager.js';
import { on } from '../eventBus.js';
import { initAudio, dispose } from '../audioEngine.js';
import { createGrid, destroyGrid } from '../sequencerGrid.js';
import { initMidi, disposeMidi } from '../midiInput.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');
jest.mock('../audioEngine.js');
jest.mock('../sequencerGrid.js');
jest.mock('../midiInput.js');

// Mock transportController
jest.mock('../transportController.js', () => ({
  attachControls: jest.fn()
}));

describe('appBootstrap', () => {
  let elements;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup DOM elements
    elements = {
      gridContainer: document.createElement('div'),
      playButton: document.createElement('button'),
      stopButton: document.createElement('button'),
      bpmInput: document.createElement('input')
    };
    
    elements.bpmInput.type = 'number';
    
    // Default mock state
    getState.mockReturnValue({
      grid: {
        tracks: 4,
        stepsPerTrack: 16,
        patternData: {}
      }
    });
    
    // Mock subscribe to capture the callback
    subscribe.mockImplementation((callback) => {
      this.stateSubscriber = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  test('should bootstrap application with all required elements', async () => {
    initMidi.mockResolvedValue(true);
    
    await bootstrap(elements);
    
    expect(initAudio).toHaveBeenCalledWith(4);
    expect(createGrid).toHaveBeenCalledWith(elements.gridContainer);
    expect(initMidi).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'MIDI/INITIALIZED',
      payload: { enabled: true }
    });
  });

  test('should throw error if required elements are missing', async () => {
    await expect(bootstrap({})).rejects.toThrow('Missing required DOM elements for bootstrap');
    await expect(bootstrap({ gridContainer: document.createElement('div') })).rejects.toThrow('Missing required DOM elements for bootstrap');
  });

  test('should handle MIDI initialization failure gracefully', async () => {
    initMidi.mockResolvedValue(false); // MIDI not supported
    
    await bootstrap(elements);
    
    expect(initMidi).toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith('MIDI/INITIALIZED', expect.anything());
  });

  test('should set up state change subscription', async () => {
    await bootstrap(elements);
    
    expect(subscribe).toHaveBeenCalled();
  });

  test('should handle GRID/LOAD_PATTERN state change', async () => {
    await bootstrap(elements);
    
    // Simulate state change
    const stateChangeHandler = subscribe.mock.calls[0][0];
    stateChangeHandler({}, { type: 'GRID/LOAD_PATTERN' });
    
    expect(destroyGrid).toHaveBeenCalled();
    expect(createGrid).toHaveBeenCalled();
  });

  test('should set up global event listeners', async () => {
    await bootstrap(elements);
    
    expect(on).toHaveBeenCalledWith('GRID/STEP_TOGGLED', expect.any(Function));
    expect(on).toHaveBeenCalledWith('TRANSPORT/PLAY', expect.any(Function));
    expect(on).toHaveBeenCalledWith('TRANSPORT/PAUSE', expect.any(Function));
    expect(on).toHaveBeenCalledWith('TRANSPORT/STOP', expect.any(Function));
    expect(on).toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', expect.any(Function));
  });

  test('should handle GRID/STEP_TOGGLED event', async () => {
    await bootstrap(elements);
    
    // Get the event listener
    const stepToggleListener = on.mock.calls.find(call => call[0] === 'GRID/STEP_TOGGLED')[1];
    
    // Simulate event
    stepToggleListener({
      detail: {
        track: 1,
        step: 5,
        isActive: true
      }
    });
    
    expect(dispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: {
        track: 1,
        step: 5,
        isActive: true
      }
    });
  });

  test('should shutdown application and clean up resources', async () => {
    await bootstrap(elements);
    shutdown();
    
    expect(stopScheduler).toHaveBeenCalled(); // From playbackScheduler
    expect(destroyGrid).toHaveBeenCalled();
    expect(dispose).toHaveBeenCalled();
    expect(disposeMidi).toHaveBeenCalled();
    expect(on).toHaveBeenCalledWith('APP/SHUTDOWN_COMPLETED', expect.any(Object));
  });

  // Edge case: Test bootstrap failure handling
  test('should handle bootstrap failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    initAudio.mockRejectedValue(new Error('Audio initialization failed'));
    
    await expect(bootstrap(elements)).rejects.toThrow('Audio initialization failed');
    expect(on).toHaveBeenCalledWith('APP/BOOTSTRAP_FAILED', {
      error: 'Audio initialization failed'
    });
    
    consoleSpy.mockRestore();
  });
});