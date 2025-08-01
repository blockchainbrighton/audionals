// __tests__/playbackScheduler.test.js
import { startScheduler, stopScheduler } from '../playbackScheduler.js';
import { emit, on } from '../eventBus.js';
import { dispatch } from '../stateManager.js';
import { triggerNote } from '../audioEngine.js';

// Mock Tone
global.Tone = {
  Transport: {
    bpm: { value: 120 },
    start: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    schedule: jest.fn().mockImplementation((callback, time) => `event-${time}`),
    state: 'stopped',
  },
  now: () => 0,
};

// Mock dependencies
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    transport: { bpm: 120 },
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: {
        0: { 0: true, 4: true, 8: true, 12: true }, // Kick pattern
        1: { 2: true, 6: true, 10: true, 14: true }, // Snare
      },
    },
  })),
}));

jest.mock('../audioEngine.js', () => ({
  triggerNote: jest.fn(),
}));

describe('playbackScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Tone state
    global.Tone.Transport.state = 'stopped';
    global.Tone.Transport.cancel.mockClear();
    global.Tone.Transport.start.mockClear();
    global.Tone.Transport.stop.mockClear();
  });

  test('should start scheduler and schedule all active steps', () => {
    startScheduler();

    expect(Tone.Transport.bpm.value).toBe(120);
    expect(Tone.Transport.start).toHaveBeenCalled();
    expect(Tone.Transport.schedule).toHaveBeenCalledTimes(8); // 4 kick + 4 snare

    // Verify events are scheduled at correct times
    expect(Tone.Transport.schedule).toHaveBeenCalledWith(expect.any(Function), '0n');
    expect(Tone.Transport.schedule).toHaveBeenCalledWith(expect.any(Function), '4n');
    expect(Tone.Transport.schedule).toHaveBeenCalledWith(expect.any(Function), '2n');
    expect(Tone.Transport.schedule).toHaveBeenCalledWith(expect.any(Function), '6n');
  });

  test('should emit TRANSPORT/PLAY event when started', () => {
    const callback = jest.fn();
    on('TRANSPORT/PLAY', callback);

    startScheduler();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TRANSPORT/PLAY',
      })
    );
  });

  test('should stop scheduler and cancel all events', () => {
    startScheduler();
    stopScheduler();

    expect(Tone.Transport.stop).toHaveBeenCalled();
    expect(Tone.Transport.cancel).toHaveBeenCalled();
  });

  test('should emit TRANSPORT/STOP event when stopped', () => {
    const callback = jest.fn();
    on('TRANSPORT/STOP', callback);

    stopScheduler();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TRANSPORT/STOP',
      })
    );
  });

  test('should re-schedule steps when GRID/STEP_TOGGLED is emitted', () => {
    startScheduler();
    Tone.Transport.cancel.mockClear();

    // Toggle a step
    emit('GRID/STEP_TOGGLED', { track: 0, step: 1, isActive: true });

    expect(Tone.Transport.cancel).toHaveBeenCalled();
    expect(Tone.Transport.schedule).toHaveBeenCalledTimes(9); // 8 original + 1 new
  });

  test('should update BPM when TRANSPORT/SET_BPM is emitted', () => {
    emit('TRANSPORT/SET_BPM', { payload: 90 });

    expect(Tone.Transport.bpm.value).toBe(90);
  });

  test('should not re-schedule if transport is not running', () => {
    Tone.Transport.state = 'stopped';
    Tone.Transport.cancel.mockClear();

    emit('GRID/STEP_TOGGLED', { track: 0, step: 1, isActive: true });

    expect(Tone.Transport.cancel).not.toHaveBeenCalled();
  });

  test('AUDIO/TRIGGER_NOTE events should trigger audioEngine', () => {
    const mockCallback = jest.fn();
    Tone.Transport.schedule.mockImplementation((callback) => {
      mockCallback(callback);
      return 'event-0n';
    });

    startScheduler();

    // Simulate one scheduled event firing
    const scheduledCallback = mockCallback.mock.calls[0][0];
    scheduledCallback();

    expect(triggerNote).toHaveBeenCalledWith(
      expect.any(String), // note name
      0.25,
      0.8
    );
  });
});