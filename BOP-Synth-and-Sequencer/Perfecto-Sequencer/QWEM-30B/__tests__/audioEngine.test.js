// __tests__/audioEngine.test.js
/**
 * Unit tests for audioEngine.js
 * @file audioEngine.test.js
 */

import { initAudio, triggerNote, dispose } from '../audioEngine.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

// Mock global Tone object
window.Tone = {
  PolySynth: jest.fn(() => ({
    toDestination: jest.fn(),
    triggerAttackRelease: jest.fn(),
    on: jest.fn(),
    dispose: jest.fn()
  })),
  now: jest.fn(() => 1000),
  Master: { volume: { value: 0 } }
};

jest.useFakeTimers();

describe('audioEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.Tone.now.mockReturnValue(1000);
  });

  test('initAudio initializes synth and emits event', () => {
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    initAudio();

    expect(window.Tone.PolySynth).toHaveBeenCalledWith(expect.anything());
    expect(spyEmit).toHaveBeenCalledWith('AUDIO/INITIALIZED');

    spyEmit.mockRestore();
  });

  test('initAudio does nothing if already initialized', () => {
    initAudio();
    const initialCallCount = window.Tone.PolySynth.mock.calls.length;

    initAudio();

    expect(window.Tone.PolySynth.mock.calls.length).toBe(initialCallCount);
  });

  test('triggerNote plays correct note when active', () => {
    initAudio();

    const mockState = {
      transport: { bpm: 120, isPlaying: true, position: 0 },
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { '1-3': true }
      }
    };

    // Spy on Tone's triggerAttackRelease
    const triggerSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'triggerAttackRelease');

    // Patch getState to return mock state
    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    triggerNote(1, 3);

    expect(triggerSpy).toHaveBeenCalledWith('D4', '8n', expect.any(Number));

    // Cleanup
    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('triggerNote does nothing if inactive', () => {
    initAudio();

    const mockState = {
      transport: { bpm: 120, isPlaying: true, position: 0 },
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { '1-3': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const triggerSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'triggerAttackRelease');

    triggerNote(1, 3);

    expect(triggerSpy).not.toHaveBeenCalled();

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('triggerNote ignores invalid track/step indices', () => {
    initAudio();

    const mockState = {
      transport: { bpm: 120, isPlaying: true, position: 0 },
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {}
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const triggerSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'triggerAttackRelease');

    triggerNote(-1, 0);
    triggerNote(8, 0);
    triggerNote(0, 16);

    expect(triggerSpy).not.toHaveBeenCalled();

    Object.defineProperty(global, 'getState', { value: originalGetState });
  });

  test('triggerNote warns if audio engine not initialized', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    triggerNote(1, 3);

    expect(consoleWarnSpy).toHaveBeenCalledWith('Audio engine not initialized. Cannot trigger note.');

    consoleWarnSpy.mockRestore();
  });

  test('dispose cleans up synth and emits event', () => {
    initAudio();
    const disposeSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'dispose');

    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    dispose();

    expect(disposeSpy).toHaveBeenCalled();
    expect(spyEmit).toHaveBeenCalledWith('AUDIO/DISPOSED');

    spyEmit.mockRestore();
  });

  test('dispose does nothing if not initialized', () => {
    const disposeSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'dispose');

    dispose();

    expect(disposeSpy).not.toHaveBeenCalled();
  });

  test('triggerNote uses correct time calculation (120 BPM)', () => {
    initAudio();

    const mockState = {
      transport: { bpm: 120, isPlaying: true, position: 0 },
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { '0-0': true }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const triggerSpy = jest.spyOn(window.Tone.PolySynth.prototype, 'triggerAttackRelease');

    triggerNote(0, 0);

    const expectedTime = 1000 + (60 / 120) * (0 / 16); // 1000 + 0.25 * 0 = 1000
    expect(triggerSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect接近(expectedTime, 0.001));
  });
});