// __tests__/playbackScheduler.test.js

/**
 * @file Unit tests for playbackScheduler.js
 */

import { startScheduler, stopScheduler } from '../playbackScheduler.js';
import { getState, subscribe } from '../stateManager.js';
import { on } from '../eventBus.js';
import { triggerNote } from '../audioEngine.js';

// Mock dependencies
jest.mock('../stateManager.js');
jest.mock('../eventBus.js');
jest.mock('../audioEngine.js');

// Mock ToneJS
const mockTransport = {
  bpm: { value: 120 },
  start: jest.fn(),
  stop: jest.fn(),
  cancel: jest.fn(),
  scheduleRepeat: jest.fn()
};

describe('playbackScheduler', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup window.Tone
    window.Tone = {
      Transport: mockTransport
    };

    // Default mock state
    getState.mockReturnValue({
      transport: {
        bpm: 120,
        position: 0
      },
      grid: {
        tracks: 4,
        stepsPerTrack: 16,
        patternData: {
          'track-0': { 0: true, 4: true },
          'track-1': { 2: true }
        }
      }
    });
  });

  afterEach(() => {
    delete window.Tone;
  });

  test('should start scheduler with correct BPM and setup transport', () => {
    startScheduler();

    expect(mockTransport.bpm.value).toBe(120);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledWith(
      expect.any(Function), // onTransportStep callback
      '16n'
    );
    expect(mockTransport.start).toHaveBeenCalled();
  });

  test('should not start scheduler if already active', () => {
    startScheduler();
    startScheduler(); // Second call

    expect(mockTransport.start).toHaveBeenCalledTimes(1);
  });

  test('should throw error if ToneJS is not available', () => {
    delete window.Tone;

    expect(() => startScheduler()).toThrow('ToneJS not available');
  });

  test('should stop scheduler and clean up', () => {
    startScheduler();
    stopScheduler();

    expect(mockTransport.stop).toHaveBeenCalled();
    expect(mockTransport.cancel).toHaveBeenCalled();
  });

  test('should not stop scheduler if not active', () => {
    stopScheduler();

    expect(mockTransport.stop).not.toHaveBeenCalled();
    expect(mockTransport.cancel).not.toHaveBeenCalled();
  });

  test('should subscribe to state changes when starting', () => {
    startScheduler();

    expect(subscribe).toHaveBeenCalled();
  });

  test('should update ToneJS BPM when state changes', () => {
    startScheduler();
    
    // Get the subscribe callback and call it with new state
    const subscribeCallback = subscribe.mock.calls[0][0];
    subscribeCallback({ transport: { bpm: 100 } }, { type: 'TRANSPORT/SET_BPM' });

    expect(mockTransport.bpm.value).toBe(100);
  });

  test('should not update BPM for non-BPM actions', () => {
    startScheduler();
    const initialBPM = mockTransport.bpm.value;
    
    const subscribeCallback = subscribe.mock.calls[0][0];
    subscribeCallback({ transport: { bpm: 100 } }, { type: 'OTHER_ACTION' });

    expect(mockTransport.bpm.value).toBe(initialBPM);
  });

  // Edge case: Test handling of empty pattern data
  test('should handle empty pattern data gracefully', () => {
    getState.mockReturnValue({
      transport: {
        bpm: 120,
        position: 0
      },
      grid: {
        tracks: 2,
        stepsPerTrack: 16,
        patternData: {} // No pattern data
      }
    });

    startScheduler();
    
    // Get the scheduled callback and execute it
    const scheduleCallback = mockTransport.scheduleRepeat.mock.calls[0][0];
    expect(() => scheduleCallback(0)).not.toThrow();
  });
});