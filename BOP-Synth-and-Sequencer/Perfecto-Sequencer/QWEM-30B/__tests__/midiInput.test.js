// __tests__/midiInput.test.js
/**
 * Unit tests for midiInput.js
 * @file midiInput.test.js
 */

import { initMidi, disposeMidi } from '../midiInput.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

describe('midiInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.navigator.requestMIDIAccess = jest.fn();
  });

  test('initMidi calls requestMIDIAccess and sets up listener', () => {
    const mockAccess = {
      inputs: jest.fn().mockReturnValue({
        next: jest.fn().mockReturnValue({ value: { id: 'test', onmidimessage: null } })
      })
    };

    window.navigator.requestMIDIAccess.mockResolvedValue(mockAccess);

    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    initMidi();

    expect(window.navigator.requestMIDIAccess).toHaveBeenCalled();
    expect(spyEmit).toHaveBeenCalledWith('MIDI/CONNECTED', { deviceId: 'test' });
    expect(spyDispatch).toHaveBeenCalledWith({ type: 'MIDI/DEVICE_CONNECTED', payload: { device: expect.any(Object) } });

    spyEmit.mockRestore();
    spyDispatch.mockRestore();
  });

  test('initMidi handles no input devices gracefully', () => {
    const mockAccess = {
      inputs: jest.fn().mockReturnValue({
        next: jest.fn().mockReturnValue({ done: true })
      })
    };

    window.navigator.requestMIDIAccess.mockResolvedValue(mockAccess);

    const spyWarn = jest.spyOn(console, 'warn').mockImplementation();

    initMidi();

    expect(spyWarn).toHaveBeenCalledWith('No MIDI input devices found.');
    spyWarn.mockRestore();
  });

  test('initMidi handles error during access', () => {
    const mockError = new Error('Permission denied');

    window.navigator.requestMIDIAccess.mockRejectedValue(mockError);

    const spyError = jest.spyOn(console, 'error').mockImplementation();

    initMidi();

    expect(spyError).toHaveBeenCalledWith('Failed to access MIDI devices:', mockError);
    spyError.mockRestore();
  });

  test('handleNoteOn maps C4 to track 0, step 0', () => {
    const mockState = {
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    handleNoteOn(60); // C4

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 0, step: 0, isActive: true }
    });

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('handleNoteOn maps F#5 to track 3, step 11', () => {
    const mockState = {
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    handleNoteOn(85); // F#5 = 85

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 3, step: 11, isActive: true }
    });

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('handleNoteOn ignores out-of-bounds notes', () => {
    const mockState = {
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    // Note below C4
    handleNoteOn(59);
    expect(spyDispatch).not.toHaveBeenCalled();

    // Note beyond max track/step
    handleNoteOn(60 + 8 * 16); // 188 → track 8, step 0 → invalid
    expect(spyDispatch).not.toHaveBeenCalled();

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('handleNoteOn does nothing if already active', () => {
    const mockState = {
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

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    handleNoteOn(60);

    expect(spyDispatch).not.toHaveBeenCalled();

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('handleNoteOff clears active step', () => {
    const mockState = {
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

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    handleNoteOff(60);

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 0, step: 0, isActive: false }
    });

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('handleNoteOff ignores inactive steps', () => {
    const mockState = {
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: { '0-0': false }
      }
    };

    const originalGetState = getState;
    Object.defineProperty(global, 'getState', {
      value: () => mockState,
      writable: true
    });

    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    handleNoteOff(60);

    expect(spyDispatch).not.toHaveBeenCalled();

    Object.defineProperty(global, 'getState', { value: originalGetState });
    spyDispatch.mockRestore();
  });

  test('disposeMidi removes listeners and emits disconnect event', () => {
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    // Simulate initialized state
    window.isInitialized = true;
    window.midiAccess = {
      inputs: jest.fn().mockReturnValue({
        next: jest.fn().mockReturnValue({ value: { onmidimessage: jest.fn() } })
      })
    };

    disposeMidi();

    expect(spyEmit).toHaveBeenCalledWith('MIDI/DISCONNECTED');
    expect(spyDispatch).toHaveBeenCalledWith({ type: 'MIDI/DEVICE_DISCONNECTED', payload: { deviceId: '' } });

    spyEmit.mockRestore();
    spyDispatch.mockRestore();
  });

  test('disposeMidi does nothing if not initialized', () => {
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});

    disposeMidi();

    expect(spyEmit).not.toHaveBeenCalled();
    expect(spyDispatch).not.toHaveBeenCalled();

    spyEmit.mockRestore();
    spyDispatch.mockRestore();
  });
});
