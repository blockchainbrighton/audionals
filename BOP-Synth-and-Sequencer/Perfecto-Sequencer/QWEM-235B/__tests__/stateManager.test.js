// __tests__/stateManager.test.js
import { getState, dispatch, subscribe } from '../stateManager.js';

describe('stateManager', () => {
  beforeEach(() => {
    // Reset state before each test if needed
    // Note: In real app, we'd avoid direct state mutation
  });

  test('should return current state via getState()', () => {
    const state = getState();
    expect(state.transport).toBeDefined();
    expect(state.grid).toBeDefined();
    expect(state.midi).toBeDefined();
    expect(state.blockchain).toBeDefined();
    expect(state.config).toBeDefined();
    expect(state.grid.patternData).toEqual({});
  });

  test('should update isPlaying on TRANSPORT/PLAY and TRANSPORT/STOP actions', () => {
    dispatch({ type: 'TRANSPORT/PLAY' });
    let state = getState();
    expect(state.transport.isPlaying).toBe(true);

    dispatch({ type: 'TRANSPORT/STOP' });
    state = getState();
    expect(state.transport.isPlaying).toBe(false);
  });

  test('should update BPM with valid value using TRANSPORT/SET_BPM', () => {
    dispatch({ type: 'TRANSPORT/SET_BPM', payload: 90 });
    const state = getState();
    expect(state.transport.bpm).toBe(90);
  });

  test('should ignore invalid BPM values', () => {
    const originalBpm = getState().transport.bpm;
    dispatch({ type: 'TRANSPORT/SET_BPM', payload: -10 });
    expect(getState().transport.bpm).toBe(originalBpm);

    dispatch({ type: 'TRANSPORT/SET_BPM', payload: 'invalid' });
    expect(getState().transport.bpm).toBe(originalBpm);
  });

  test('should toggle grid step state with GRID/STEP_TOGGLED', () => {
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 2, step: 5, isActive: true },
    });

    const state = getState();
    expect(state.grid.patternData[2][5]).toBe(true);

    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 2, step: 5, isActive: false },
    });

    expect(getState().grid.patternData[2][5]).toBe(false);
  });

  test('should persist patternData across updates', () => {
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 0, step: 0, isActive: true },
    });
    dispatch({
      type: 'TRANSPORT/SET_BPM',
      payload: 140,
    });

    const state = getState();
    expect(state.grid.patternData[0][0]).toBe(true);
    expect(state.transport.bpm).toBe(140);
  });

  test('should notify subscribers on state change', () => {
    const listener = jest.fn();
    subscribe(listener);

    dispatch({ type: 'TRANSPORT/PLAY' });
    expect(listener).toHaveBeenCalledTimes(1);

    dispatch({ type: 'TRANSPORT/STOP' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('subscriber should be able to unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    dispatch({ type: 'TRANSPORT/PLAY' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    dispatch({ type: 'TRANSPORT/STOP' });
    expect(listener).toHaveBeenCalledTimes(1); // No new call
  });

  test('should handle unknown action types gracefully', () => {
    const initialState = getState();
    dispatch({ type: 'UNKNOWN_ACTION' });
    expect(getState()).toEqual(initialState);
  });

  test('should maintain immutability: direct state mutation should not affect store', () => {
    const state = getState();
    state.transport.bpm = 999; // Mutation attempt
    dispatch({ type: 'TRANSPORT/SET_BPM', payload: 100 });
    expect(getState().transport.bpm).not.toBe(999); // Should not reflect mutation
    expect(getState().transport.bpm).toBe(100);
  });
});