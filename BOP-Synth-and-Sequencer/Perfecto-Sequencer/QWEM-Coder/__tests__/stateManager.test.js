// __tests__/stateManager.test.js

/**
 * @file Unit tests for stateManager.js
 */

import { getState, dispatch, subscribe } from '../stateManager.js';

describe('stateManager', () => {
  beforeEach(() => {
    // Reset module state by re-importing or resetting manually if needed
    jest.resetModules();
  });

  test('should return initial state', () => {
    const state = getState();
    expect(state.transport.isPlaying).toBe(false);
    expect(state.transport.bpm).toBe(120);
    expect(state.grid.tracks).toBe(8);
  });

  test('should update bpm when SET_BPM is dispatched', () => {
    const initialState = getState();
    expect(initialState.transport.bpm).toBe(120);

    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 100 } });

    const newState = getState();
    expect(newState.transport.bpm).toBe(100);
    expect(newState.transport.isPlaying).toBe(initialState.transport.isPlaying); // unchanged
  });

  test('should toggle play state', () => {
    const initialState = getState();
    expect(initialState.transport.isPlaying).toBe(false);

    dispatch({ type: 'TRANSPORT/TOGGLE_PLAY' });

    const newState = getState();
    expect(newState.transport.isPlaying).toBe(true);

    dispatch({ type: 'TRANSPORT/TOGGLE_PLAY' });

    expect(getState().transport.isPlaying).toBe(false);
  });

  test('should update grid step when STEP_TOGGLED is dispatched', () => {
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track: 2, step: 11, isActive: true }
    });

    const state = getState();
    expect(state.grid.patternData['track-2'][11]).toBe(true);
  });

  test('should notify subscribers on state change', () => {
    const mockListener = jest.fn();
    const unsubscribe = subscribe(mockListener);

    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 90 } });

    expect(mockListener).toHaveBeenCalledWith(
      getState(),
      { type: 'TRANSPORT/SET_BPM', payload: { bpm: 90 } }
    );

    unsubscribe();
    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 80 } });

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test('should not mutate state directly', () => {
    const initialState = getState();
    const stateRef = getState();

    dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: 110 } });

    expect(getState()).not.toBe(initialState);
    expect(stateRef.bpm).toBeUndefined(); // original ref unchanged
  });
});