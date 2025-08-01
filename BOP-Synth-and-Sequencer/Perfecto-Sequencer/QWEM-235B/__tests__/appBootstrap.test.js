// __tests__/appBootstrap.test.js
import { bootstrap } from '../appBootstrap.js';
import { emit, on } from '../eventBus.js';
import { getState } from '../stateManager.js';
import { initAudio } from '../audioEngine.js';
import { createGrid } from '../sequencerGrid.js';
import { attachControls } from '../transportController.js';
import { initMidi } from '../midiInput.js';
import { savePattern, loadPattern } from '../blockchainPersistence.js';
import { savePreset, loadPreset } from '../presetManager.js';

// Mock all dependencies
jest.mock('../audioEngine.js', () => ({
  initAudio: jest.fn(),
}));
jest.mock('../playbackScheduler.js', () => ({
  startScheduler: jest.fn(),
  stopScheduler: jest.fn(),
}));
jest.mock('../sequencerGrid.js', () => ({
  createGrid: jest.fn(),
}));
jest.mock('../transportController.js', () => ({
  attachControls: jest.fn(),
}));
jest.mock('../midiInput.js', () => ({
  initMidi: jest.fn(() => Promise.resolve()),
}));
jest.mock('../blockchainPersistence.js', () => ({
  savePattern: jest.fn(() => Promise.resolve()),
  loadPattern: jest.fn(() => Promise.resolve()),
}));
jest.mock('../presetManager.js', () => ({
  savePreset: jest.fn(() => Promise.resolve()),
  loadPreset: jest.fn(() => Promise.resolve()),
  listPresets: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({})),
  dispatch: jest.fn(),
}));

describe('appBootstrap', () => {
  let gridContainer, playButton, stopButton, bpmInput, transportControls;

  beforeEach(() => {
    // Setup DOM
    gridContainer = document.createElement('div');
    gridContainer.id = 'grid';
    playButton = document.createElement('button');
    playButton.id = 'play';
    stopButton = document.createElement('button');
    stopButton.id = 'stop';
    bpmInput = document.createElement('input');
    bpmInput.type = 'number';
    bpmInput.id = 'bpm';

    document.body.appendChild(gridContainer);
    document.body.appendChild(playButton);
    document.body.appendChild(stopButton);
    document.body.appendChild(bpmInput);

    transportControls = { playButton, stopButton, bpmInput };

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(gridContainer);
    document.body.removeChild(playButton);
    document.body.removeChild(stopButton);
    document.body.removeChild(bpmInput);
  });

  test('should initialize all core systems with valid config', () => {
    bootstrap({ gridContainer, transportControls });

    expect(initAudio).toHaveBeenCalled();
    expect(createGrid).toHaveBeenCalledWith(gridContainer);
    expect(attachControls).toHaveBeenCalledWith(transportControls);
    expect(initMidi).toHaveBeenCalled();
  });

  test('should throw error if gridContainer is missing', () => {
    expect(() => {
      bootstrap({ transportControls });
    }).toThrow('gridContainer is required');
  });

  test('should throw error if transportControls is missing', () => {
    expect(() => {
      bootstrap({ gridContainer });
    }).toThrow('transportControls are required');
  });

  test('should start scheduler when TRANSPORT/PLAY is emitted', () => {
    bootstrap({ gridContainer, transportControls });
    const { startScheduler } = require('../playbackScheduler.js');

    emit('TRANSPORT/PLAY');
    expect(startScheduler).toHaveBeenCalled();
  });

  test('should stop scheduler when TRANSPORT/STOP is emitted', () => {
    bootstrap({ gridContainer, transportControls });
    const { stopScheduler } = require('../playbackScheduler.js');

    emit('TRANSPORT/STOP');
    expect(stopScheduler).toHaveBeenCalled();
  });

  test('should handle APP/SAVE_PATTERN event', async () => {
    bootstrap({ gridContainer, transportControls });

    await emit('APP/SAVE_PATTERN');
    await Promise.resolve(); // wait for async

    expect(savePattern).toHaveBeenCalled();
  });

  test('should handle APP/LOAD_PATTERN event', async () => {
    bootstrap({ gridContainer, transportControls });

    await emit('APP/LOAD_PATTERN', { txId: 'abc123' });
    await Promise.resolve();

    expect(loadPattern).toHaveBeenCalledWith({ txId: 'abc123' });
  });

  test('should handle APP/SAVE_PRESET event', async () => {
    bootstrap({ gridContainer, transportControls });

    await emit('APP/SAVE_PRESET', { name: 'My Beat' });
    await Promise.resolve();

    expect(savePreset).toHaveBeenCalledWith({ name: 'My Beat' });
  });

  test('should handle APP/LOAD_PRESET event', async () => {
    bootstrap({ gridContainer, transportControls });

    await emit('APP/LOAD_PRESET', { name: 'My Beat' });
    await Promise.resolve();

    expect(loadPreset).toHaveBeenCalledWith({ name: 'My Beat' });
  });

  test('should emit APP/READY event after bootstrap', () => {
    const callback = jest.fn();
    on('APP/READY', callback);

    bootstrap({ gridContainer, transportControls });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APP/READY',
        payload: expect.objectContaining({
          timestamp: expect.any(Number),
          state: expect.any(Object)
        })
      })
    );
  });

  test('should return an API object with getState and event methods', () => {
    const api = bootstrap({ gridContainer, transportControls });
    expect(api).toHaveProperty('getState');
    expect(api).toHaveProperty('emit');
    expect(api).toHaveProperty('on');
    expect(typeof api.getState).toBe('function');
    expect(typeof api.emit).toBe('function');
    expect(typeof api.on).toBe('function');
  });
});