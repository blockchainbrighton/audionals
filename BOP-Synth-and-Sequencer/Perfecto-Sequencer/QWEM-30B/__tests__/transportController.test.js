// __tests__/transportController.test.js
/**
 * Unit tests for transportController.js
 * @file transportController.test.js
 */

import { attachControls } from '../transportController.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

describe('transportController', () => {
  beforeEach(() => {
    // Mock DOM environment
    document.body.innerHTML = '<div id="container"></div>';
  });

  test('attachControls renders play/pause and stop buttons', () => {
    const container = document.getElementById('container');
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container);

    expect(container.querySelector('button[title="Play / Pause"]')).toBeTruthy();
    expect(container.querySelector('button[title="Stop"]')).toBeTruthy();
    expect(spyEmit).not.toHaveBeenCalled();

    spyEmit.mockRestore();
  });

  test('attachControls shows BPM input when enabled', () => {
    const container = document.getElementById('container');
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container, { showBpmInput: true });

    expect(container.querySelector('input[type="number"]').value).toBe('120');
    expect(spyEmit).not.toHaveBeenCalled();

    spyEmit.mockRestore();
  });

  test('attachControls hides BPM input when disabled', () => {
    const container = document.getElementById('container');
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container, { showBpmInput: false });

    expect(container.querySelector('input[type="number"]')).toBeNull();
    expect(spyEmit).not.toHaveBeenCalled();

    spyEmit.mockRestore();
  });

  test('playPauseBtn toggles PLAY/PAUSE based on state', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container);

    const playPauseBtn = container.querySelector('button[title="Play / Pause"]');
    const stopBtn = container.querySelector('button[title="Stop"]');

    // Initially playing
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    expect(playPauseBtn.textContent).toBe('⏸️');
    expect(stopBtn.disabled).toBe(false);

    // Click play/pause → pause
    playPauseBtn.click();
    expect(spyDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/PAUSE' });
    expect(spyEmit).toHaveBeenCalledWith('TRANSPORT/PAUSED');

    // Click again → play
    playPauseBtn.click();
    expect(spyDispatch).toHaveBeenCalledWith({ type: 'TRANSPORT/PLAY', payload: expect.any(Object) });
    expect(spyEmit).toHaveBeenCalledWith('TRANSPORT/PLAYED');

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('stopBtn disables when not playing', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container);

    const stopBtn = container.querySelector('button[title="Stop"]');

    // Not playing initially
    expect(stopBtn.disabled).toBe(true);

    // Start playing
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    expect(stopBtn.disabled).toBe(false);

    // Stop
    stopBtn.click();
    expect(stopBtn.disabled).toBe(true);

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('BPM input updates state and emits event', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container, { showBpmInput: true });

    const bpmInput = container.querySelector('input[type="number"]');

    // Change value
    bpmInput.value = '140';
    bpmInput.dispatchEvent(new Event('change'));

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/SET_BPM',
      payload: { bpm: 140 }
    });
    expect(spyEmit).toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', { bpm: 140 });

    // Invalid input
    bpmInput.value = 'abc';
    bpmInput.dispatchEvent(new Event('change'));
    expect(spyDispatch).toHaveBeenCalledTimes(1); // no dispatch

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('BPM input handles keyboard Enter', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container, { showBpmInput: true });

    const bpmInput = container.querySelector('input[type="number"]');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    bpmInput.value = '150';
    bpmInput.dispatchEvent(event);

    expect(spyDispatch).toHaveBeenCalledWith({
      type: 'TRANSPORT/SET_BPM',
      payload: { bpm: 150 }
    });
    expect(spyEmit).toHaveBeenCalledWith('TRANSPORT/BPM_CHANGED', { bpm: 150 });

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('destroy removes all event listeners and clears content', () => {
    const container = document.getElementById('container');
    const spyDispatch = jest.spyOn(window, 'dispatch').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    const ctrl = attachControls(container);
    expect(container.innerHTML).not.toBe('');

    ctrl.destroy();
    expect(container.innerHTML).toBe('');

    // Ensure no more events are dispatched
    const playPauseBtn = container.querySelector('button[title="Play / Pause"]');
    if (playPauseBtn) playPauseBtn.click();

    expect(spyDispatch).not.toHaveBeenCalled();

    spyDispatch.mockRestore();
    spyEmit.mockRestore();
  });

  test('initial button state reflects current transport state', () => {
    const container = document.getElementById('container');
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    attachControls(container);

    const playPauseBtn = container.querySelector('button[title="Play / Pause"]');
    const stopBtn = container.querySelector('button[title="Stop"]');

    // Initially not playing
    expect(playPauseBtn.textContent).toBe('▶️');
    expect(stopBtn.disabled).toBe(true);

    // After playing
    dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } });
    expect(playPauseBtn.textContent).toBe('⏸️');
    expect(stopBtn.disabled).toBe(false);

    spyEmit.mockRestore();
  });
});