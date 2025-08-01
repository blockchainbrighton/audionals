// __tests__/stateManager.test.js
/**
 * Unit tests for stateManager.js
 * @file stateManager.test.js
 */

import { getState, dispatch, subscribe } from '../stateManager.js';

describe('stateManager', () => {
  beforeEach(() => {
    // Reset state before each test
    const resetState = () => {
      window.__TEST_STATE__ = {
        transport: { isPlaying: false, bpm: 120, position: 0 },
        grid: { tracks: 8, stepsPerTrack: 16, patternData: {} },
        midi: { enabled: false, devices: [] },
        blockchain: { lastTxId: null },
        config: { toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>' }
      };
    };
    resetState();
  });

  test('getState returns a deep copy of state', () => {
    const state1 = getState();
    expect(state1).toEqual({
      transport: { isPlaying: false, bpm: 120, position: 0 },
      grid: { tracks: 8, stepsPerTrack: 16, patternData: {} },
      midi: { enabled: false, devices: [] },
      blockchain: { lastTxId: null },
      config: { toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>' }
    });

    // Mutate original state
    window.__TEST_STATE__.transport.isPlaying = true;

    const state2 = getState();
    expect(state2.transport.isPlaying).toBe(false); // unchanged
  });

  test('dispatch updates state correctly for TRANSPORT/PLAY', () => {
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    const newState = getState();

    expect(newState.transport.isPlaying).toBe(true);
    expect(newState.transport.position).toBe(0);
  });

  test('dispatch updates state correctly for GRID/STEP_TOGGLED', () => {
    dispatch({ type: 'GRID/STEP_TOGGLED', payload: { track: 1, step: 3, isActive: true } });
    const newState = getState();

    expect(newState.grid.patternData['1-3']).toBe(true);

    dispatch({ type: 'GRID/STEP_TOGGLED', payload: { track: 1, step: 3, isActive: false } });
    const newState2 = getState();
    expect(newState2.grid.patternData['1-3']).toBe(false);
  });

  test('dispatch handles invalid action (missing type)', () => {
    expect(() => dispatch({})).toThrowError('Action must have a type');
  });

  test('dispatch does not mutate state when no change occurs', () => {
    const initial = getState();
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    const afterPlay = getState();

    // Try dispatching same action again
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    const afterSame = getState();

    expect(afterSame).toEqual(afterPlay);
  });

  test('subscribe notifies callback on state change', () => {
    const callback = jest.fn();
    const unsubscribe = subscribe(callback);

    dispatch({ type: 'TRANSPORT/PLAY' });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      transport: { isPlaying: true, bpm: 120, position: 0 }
    }));

    unsubscribe();
    dispatch({ type: 'TRANSPORT/PAUSE' });
    expect(callback).toHaveBeenCalledTimes(1); // still only one call
  });

  test('subscribe returns unsubscribe function', () => {
    const callback = jest.fn();
    const unsubscribe = subscribe(callback);
    unsubscribe();
    dispatch({ type: 'TRANSPORT/PLAY' });
    expect(callback).not.toHaveBeenCalled();
  });

  test('dispatch handles BPM bounds checking', () => {
    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 10 } });
    expect(getState().transport.bpm).toBe(20);

    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 300 } });
    expect(getState().transport.bpm).toBe(240);
  });

  test('dispatch handles unknown action types silently', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    dispatch({ type: 'UNKNOWN_ACTION' });
    expect(spy).toHaveBeenCalledWith('Unknown action type: UNKNOWN_ACTION');
    spy.mockRestore();
  });
});