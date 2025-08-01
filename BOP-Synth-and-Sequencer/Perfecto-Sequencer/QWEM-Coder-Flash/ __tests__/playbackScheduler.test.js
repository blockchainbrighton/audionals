// __tests__/playbackScheduler.test.js
import { playbackScheduler } from '../playbackScheduler';

// Mock dependencies
const mockGetState = jest.fn();
const mockDispatch = jest.fn();
const mockEmit = jest.fn();

describe('playbackScheduler', () => {
  let scheduler;
  
  beforeEach(() => {
    // Reset mocks
    mockGetState.mockReset();
    mockDispatch.mockReset();
    mockEmit.mockReset();
    
    // Setup default state
    mockGetState.mockReturnValue({
      transport: {
        isPlaying: false,
        bpm: 120,
        position: 0
      },
      grid: {
        tracks: 8,
        stepsPerTrack: 16,
        patternData: {}
      }
    });
    
    scheduler = playbackScheduler(mockGetState, mockDispatch, mockEmit);
  });

  describe('startScheduler()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start the scheduler and schedule steps', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {}
        }
      });
      
      scheduler.startScheduler();
      
      // Should have scheduled first step
      expect(mockEmit).toHaveBeenCalledWith('PLAYBACK/NOTE_TRIGGERED', expect.any(Object));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'TRANSPORT/UPDATE_POSITION',
        payload: { position: 0.25 }
      });
      
      // Advance time
      jest.advanceTimersByTime(500);
      
      // Should have scheduled another step
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should not start if already running', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {}
        }
      });
      
      scheduler.startScheduler();
      scheduler.startScheduler(); // Call again
      
      // Should only have been called once
      expect(mockEmit).toHaveBeenCalledTimes(1);
    });

    it('should not schedule when not playing', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: false,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {}
        }
      });
      
      scheduler.startScheduler();
      
      // Should not have scheduled anything
      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('stopScheduler()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop the scheduler and clear interval', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {}
        }
      });
      
      scheduler.startScheduler();
      scheduler.stopScheduler();
      
      // Advance time to see if interval still runs
      jest.advanceTimersByTime(500);
      
      // Should not have scheduled anything after stopping
      expect(mockEmit).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('scheduleStep()', () => {
    it('should emit note triggered events for active steps', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {
            0: { 0: true }, // Track 0, step 0 is active
            1: { 1: true }  // Track 1, step 1 is active
          }
        }
      });
      
      // Call scheduler loop directly
      scheduler.startScheduler();
      
      // Should emit for active steps
      expect(mockEmit).toHaveBeenCalledWith('PLAYBACK/NOTE_TRIGGERED', {
        track: 0,
        step: 0,
        position: 0.25
      });
      
      expect(mockEmit).toHaveBeenCalledWith('PLAYBACK/NOTE_TRIGGERED', {
        track: 1,
        step: 1,
        position: 0.25
      });
    });

    it('should not emit for inactive steps', () => {
      mockGetState.mockReturnValue({
        transport: {
          isPlaying: true,
          bpm: 120,
          position: 0
        },
        grid: {
          tracks: 8,
          stepsPerTrack: 16,
          patternData: {
            0: { 0: false }, // Track 0, step 0 is inactive
            1: { 1: false }  // Track 1, step 1 is inactive
          }
        }
      });
      
      scheduler.startScheduler();
      
      // Should not emit for inactive steps
      expect(mockEmit).not.toHaveBeenCalledWith('PLAYBACK/NOTE_TRIGGERED', expect.anything());
    });
  });
});