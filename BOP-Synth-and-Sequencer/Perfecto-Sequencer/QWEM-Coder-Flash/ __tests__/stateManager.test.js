// __tests__/stateManager.test.js
import { getState, dispatch, subscribe } from '../stateManager';

describe('stateManager', () => {
  beforeEach(() => {
    // Reset to initial state before each test
    dispatch({ type: 'TRANSPORT/STOP' });
    dispatch({ type: 'GRID/RESET' });
  });

  describe('getState()', () => {
    it('should return a deep copy of the state', () => {
      const state1 = getState();
      const state2 = getState();
      
      expect(state1).toEqual(state2);
      expect(state1 === state2).toBe(false); // Should be different objects
      
      // Mutating returned state shouldn't affect internal state
      state1.transport.bpm = 150;
      expect(getState().transport.bpm).toBe(120);
    });
  });

  describe('dispatch()', () => {
    it('should update transport state correctly', () => {
      dispatch({
        type: 'TRANSPORT/PLAY',
        payload: { startedAt: 1000 }
      });
      
      expect(getState().transport.isPlaying).toBe(true);
      expect(getState().transport.position).toBe(1000);
    });

    it('should handle GRID/STEP_TOGGLED action', () => {
      dispatch({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 2, step: 5, isActive: true }
      });
      
      expect(getState().grid.patternData[2][5]).toBe(true);
      
      dispatch({
        type: 'GRID/STEP_TOGGLED',
        payload: { track: 2, step: 5, isActive: false }
      });
      
      expect(getState().grid.patternData[2][5]).toBe(false);
    });

    it('should handle unknown actions gracefully', () => {
      const originalState = getState();
      
      dispatch({ type: 'UNKNOWN/ACTION' });
      
      expect(getState()).toEqual(originalState);
    });
  });

  describe('subscribe()', () => {
    it('should notify subscribers when state changes', () => {
      const mockListener = jest.fn();
      const unsubscribe = subscribe(mockListener);
      
      // Initial notification
      expect(mockListener).toHaveBeenCalledTimes(1);
      
      dispatch({ type: 'TRANSPORT/PLAY' });
      
      expect(mockListener).toHaveBeenCalledTimes(2);
      expect(mockListener).toHaveBeenCalledWith(getState());
    });

    it('should remove listener when unsubscribe is called', () => {
      const mockListener = jest.fn();
      const unsubscribe = subscribe(mockListener);
      
      unsubscribe();
      
      dispatch({ type: 'TRANSPORT/PLAY' });
      
      expect(mockListener).toHaveBeenCalledTimes(1); // Only initial call
    });
  });
});