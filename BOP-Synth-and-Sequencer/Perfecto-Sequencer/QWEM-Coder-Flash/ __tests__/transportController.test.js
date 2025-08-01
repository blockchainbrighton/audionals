// __tests__/transportController.test.js
import { transportController } from '../transportController';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

describe('transportController', () => {
  let controller;
  let elements;

  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Setup DOM elements
    elements = {
      playButton: document.createElement('button'),
      pauseButton: document.createElement('button'),
      stopButton: document.createElement('button'),
      bpmInput: document.createElement('input'),
      positionIndicator: document.createElement('div')
    };
    
    // Setup default state
    mockGetState.mockReturnValue({
      transport: {
        isPlaying: false,
        bpm: 120,
        position: 0
      }
    });
    
    controller = transportController(mockGetState, mockDispatch, mockEmit);
  });

  describe('attachControls()', () => {
    it('should attach event listeners to all provided elements', () => {
      controller.attachControls(elements);
      
      // Simulate click on play button
      elements.playButton.click();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/PLAY' });
      expect(mockEmit).toHaveBeenCalledWith('TRANSPORT/PLAY');
      
      // Simulate click on pause button
      elements.pauseButton.click();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/PAUSE' });
      expect(mockEmit).toHaveBeenCalledWith('TRANSPORT/PAUSE');
      
      // Simulate click on stop button
      elements.stopButton.click();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/STOP' });
      expect(mockEmit).toHaveBeenCalledWith('TRANSPORT/STOP');
    });

    it('should handle BPM input changes', () => {
      controller.attachControls(elements);
      
      // Set BPM input value
      elements.bpmInput.value = '130';
      
      // Simulate change event
      const event = new Event('change', { bubbles: true });
      elements.bpmInput.dispatchEvent(event);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'TRANSPORT/SET_BPM',
        payload: { bpm: 130 }
      });
      expect(mockEmit).toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', { bpm: 130 });
    });

    it('should handle invalid BPM input gracefully', () => {
      controller.attachControls(elements);
      
      // Set invalid BPM input value
      elements.bpmInput.value = 'invalid';
      
      // Simulate change event
      const event = new Event('change', { bubbles: true });
      elements.bpmInput.dispatchEvent(event);
      
      // Should not dispatch any action for invalid input
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should handle missing elements gracefully', () => {
      const partialElements = {
        playButton: elements.playButton,
        bpmInput: elements.bpmInput
        // Missing pauseButton, stopButton, positionIndicator
      };
      
      expect(() => controller.attachControls(partialElements)).not.toThrow();
      
      // Clicking play should still work
      partialElements.playButton.click();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/PLAY' });
    });
  });

  describe('updateDisplay()', () => {
    it('should update button states based on play state', () => {
      // Test when playing
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        }
      });
      
      controller.attachControls(elements);
      controller.updateDisplay();
      
      expect(elements.playButton.disabled).toBe(true);
      expect(elements.pauseButton.disabled).toBe(false);
      expect(elements.stopButton.disabled).toBe(false);
      
      // Test when not playing
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: false,
          bpm: 120,
          position: 0
        }
      });
      
      controller.updateDisplay();
      
      expect(elements.playButton.disabled).toBe(false);
      expect(elements.pauseButton.disabled).toBe(true);
      expect(elements.stopButton.disabled).toBe(true);
    });

    it('should update BPM input value', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: false,
          bpm: 140,
          position: 0
        }
      });
      
      controller.attachControls(elements);
      controller.updateDisplay();
      
      expect(elements.bpmInput.value).toBe('140');
    });

    it('should update position indicator', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: false,
          bpm: 120,
          position: 5.75
        }
      });
      
      controller.attachControls(elements);
      controller.updateDisplay();
      
      expect(elements.positionIndicator.textContent).toBe('Position: 5.75 quarter notes');
    });
  });

  describe('subscribeToStateChanges()', () => {
    it('should return an unsubscribe function', () => {
      const unsubscribe = controller.subscribeToStateChanges();
      expect(typeof unsubscribe).toBe('function');
      
      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});