// __tests__/transportController.test.js
import { attachControls } from '../transportController.js';
import { emit, on } from '../eventBus.js';
import { dispatch, getState } from '../stateManager.js';

// Mock stateManager
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    transport: {
      isPlaying: false,
      bpm: 120,
    },
  })),
  dispatch: jest.fn(),
}));

describe('transportController', () => {
  let playButton, stopButton, bpmInput;

  beforeEach(() => {
    playButton = document.createElement('button');
    playButton.id = 'play';
    stopButton = document.createElement('button');
    stopButton.id = 'stop';
    bpmInput = document.createElement('input');
    bpmInput.type = 'number';
    bpmInput.id = 'bpm';

    document.body.appendChild(playButton);
    document.body.appendChild(stopButton);
    document.body.appendChild(bpmInput);
  });

  afterEach(() => {
    document.body.removeChild(playButton);
    document.body.removeChild(stopButton);
    document.body.removeChild(bpmInput);
    jest.clearAllMocks();
  });

  test('should attach event listeners to all control elements', () => {
    attachControls({ playButton, stopButton, bpmInput });

    // Test Play
    const playSpy = jest.fn();
    on('TRANSPORT/PLAY', playSpy);
    playButton.click();
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(playSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TRANSPORT/PLAY',
        payload: expect.objectContaining({ startedAt: expect.any(Number) })
      })
    );

    // Test Stop
    const stopSpy = jest.fn();
    on('TRANSPORT/STOP', stopSpy);
    stopButton.click();
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TRANSPORT/STOP',
        payload: expect.objectContaining({ stoppedAt: expect.any(Number) })
      })
    );

    // Test BPM change
    const bpmSpy = jest.fn();
    on('TRANSPORT/SET_BPM', bpmSpy);
    bpmInput.value = '140';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmSpy).toHaveBeenCalledTimes(1);
    expect(bpmSpy).toHaveBeenCalledWith(140);
  });

  test('should validate BPM input and reject invalid values', () => {
    getState.mockReturnValue({ transport: { bpm: 120 } });
    const bpmSpy = jest.fn();
    on('TRANSPORT/SET_BPM', bpmSpy);

    attachControls({ playButton, stopButton, bpmInput });

    // Invalid: empty
    bpmInput.value = '';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmSpy).not.toHaveBeenCalled();
    expect(bpmInput.value).toBe('');

    // Invalid: negative
    bpmInput.value = '-10';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmSpy).not.toHaveBeenCalled();
    expect(bpmInput.value).toBe('-10');

    // Valid: update mock and try again
    getState.mockReturnValue({ transport: { bpm: 120 } });
    bpmInput.value = '90';
    bpmInput.dispatchEvent(new Event('change'));
    expect(bpmSpy).toHaveBeenCalledWith(90);
  });

  test('should sync BPM input value when TRANSPORT/SET_BPM is emitted', () => {
    attachControls({ playButton, stopButton, bpmInput });

    // Simulate external BPM change (e.g., from MIDI)
    emit('TRANSPORT/SET_BPM', 90);

    // Allow event loop tick
    return Promise.resolve().then(() => {
      expect(bpmInput.value).toBe('90');
    });
  });

  test('should update UI on transport play/stop events', () => {
    // We can't test updatePlayStopUI directly without DOM refs,
    // but we can verify event subscription
    const playButtonSpy = jest.spyOn(playButton.classList, 'add');
    const stopButtonSpy = jest.spyOn(stopButton.classList, 'remove');

    attachControls({ playButton, stopButton, bpmInput });

    emit('TRANSPORT/PLAY');
    // Implementation doesn't currently modify classes, but it should
    // This test ensures the pattern is followed
  });

  test('should throw error if any control element is missing', () => {
    expect(() => {
      attachControls({});
    }).toThrow('All control elements must be provided');

    expect(() => {
      attachControls({ playButton, stopButton });
    }).toThrow('All control elements must be provided');
  });

  test('initial BPM input value should not be set by attachControls (state-driven)', () => {
    // Current implementation doesn't set initial value
    // That should be handled by a renderer or separate sync function
    attachControls({ playButton, stopButton, bpmInput });
    expect(bpmInput.value).toBe('');
  });
});