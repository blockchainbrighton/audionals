// __tests__/transportController.test.js

/**
 * @file Unit tests for transportController.js
 */

import { attachControls } from '../transportController.js';
import { getState, dispatch, subscribe } from '../stateManager.js';
import { emit } from '../eventBus.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');

describe('transportController', () => {
  let playButton, stopButton, bpmInput;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup DOM elements
    playButton = document.createElement('button');
    stopButton = document.createElement('button');
    bpmInput = document.createElement('input');
    bpmInput.type = 'number';
    
    // Default mock state
    getState.mockReturnValue({
      transport: {
        isPlaying: false,
        bpm: 120
      }
    });
    
    // Mock subscribe to capture the callback
    subscribe.mockImplementation((callback) => {
      this.subscriber = callback;
      return jest.fn(); // unsubscribe function
    });
  });

  test('should attach to control elements and set initial state', () => {
    attachControls({ playButton, stopButton, bpmInput });

    expect(playButton.textContent).toBe('Play');
    expect(playButton.getAttribute('aria-pressed')).toBe('false');
    expect(bpmInput.value).toBe('120');
  });

  test('should throw error if control elements are missing', () => {
    expect(() => attachControls({})).toThrow('All control elements are required');
    expect(() => attachControls({ playButton, stopButton })).toThrow('All control elements are required');
  });

  test('should handle play button click when stopped', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    playButton.click();
    
    expect(emit).toHaveBeenCalledWith('TRANSPORT/PLAY', {
      startedAt: expect.any(Number)
    });
    
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  });

  test('should handle play button click when playing (pause)', () => {
    getState.mockReturnValue({
      transport: {
        isPlaying: true,
        bpm: 120
      }
    });
    
    attachControls({ playButton, stopButton, bpmInput });
    
    playButton.click();
    
    expect(emit).toHaveBeenCalledWith('TRANSPORT/PAUSE');
    
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  });

  test('should handle stop button click', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    stopButton.click();
    
    expect(emit).toHaveBeenCalledWith('TRANSPORT/STOP');
    
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/STOP'
    });
  });

  test('should handle BPM change with valid value', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    bpmInput.value = '100';
    bpmInput.dispatchEvent(new Event('change'));
    
    expect(emit).toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', { bpm: 100 });
    
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/SET_BPM',
      payload: { bpm: 100 }
    });
  });

  test('should reset BPM input for invalid values', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    bpmInput.value = 'invalid';
    bpmInput.dispatchEvent(new Event('change'));
    
    expect(bpmInput.value).toBe('120'); // Reset to original value
    expect(emit).not.toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', expect.anything());
    expect(dispatch).not.toHaveBeenCalledWith('TRANSPORT/SET_BPM', expect.anything());
  });

  test('should update UI when state changes', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    // Simulate state change
    getState.mockReturnValue({
      transport: {
        isPlaying: true,
        bpm: 100
      }
    });
    
    // Call the subscriber callback
    const subscriber = subscribe.mock.calls[0][0];
    subscriber({
      transport: {
        isPlaying: true,
        bpm: 100
      }
    });
    
    expect(playButton.textContent).toBe('Pause');
    expect(playButton.getAttribute('aria-pressed')).toBe('true');
    expect(bpmInput.value).toBe('100');
  });

  // Edge case: Test BPM boundaries
  test('should reject BPM values outside valid range', () => {
    attachControls({ playButton, stopButton, bpmInput });
    
    // Test too low
    bpmInput.value = '10';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmInput.value).toBe('120');
    
    // Test too high
    bpmInput.value = '400';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmInput.value).toBe('120');
  });
});