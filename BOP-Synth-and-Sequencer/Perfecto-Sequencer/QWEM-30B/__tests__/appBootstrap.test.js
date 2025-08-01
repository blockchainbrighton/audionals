// __tests__/appBootstrap.test.js
/**
 * Unit tests for appBootstrap.js
 * @file appBootstrap.test.js
 */

import { bootstrap } from '../appBootstrap.js';
import { initAudio } from '../audioEngine.js';
import { startScheduler, stopScheduler } from '../playbackScheduler.js';
import { createGrid, destroyGrid } from '../sequencerGrid.js';
import { attachControls } from '../transportController.js';
import { initMidi, disposeMidi } from '../midiInput.js';
import { savePattern, loadPattern } from '../blockchainPersistence.js';
import { savePreset, loadPreset, listPresets } from '../presetManager.js';
import { getState, dispatch } from '../stateManager.js';
import { emit } from '../eventBus.js';

describe('appBootstrap', () => {
  beforeEach(() => {
    // Mock DOM environment
    document.body.innerHTML = `
      <div id="transport-controls"></div>
      <div id="sequencer-grid"></div>
    `;
    jest.clearAllMocks();
  });

  test('bootstrap initializes audio engine', () => {
    const spyInitAudio = jest.spyOn(window, 'initAudio').mockImplementation(() => {});
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    bootstrap();

    expect(spyInitAudio).toHaveBeenCalled();
    expect(spyEmit).toHaveBeenCalledWith('APP/BOOTED');

    spyInitAudio.mockRestore();
    spyEmit.mockRestore();
  });

  test('bootstrap attaches transport controls', () => {
    const spyAttachControls = jest.spyOn(window, 'attachControls').mockImplementation(() => ({ destroy: jest.fn() }));

    bootstrap();

    expect(spyAttachControls).toHaveBeenCalledWith(document.getElementById('transport-controls'));

    spyAttachControls.mockRestore();
  });

  test('bootstrap creates sequencer grid', () => {
    const spyCreateGrid = jest.spyOn(window, 'createGrid').mockImplementation(() => ({ destroy: jest.fn() }));

    bootstrap();

    expect(spyCreateGrid).toHaveBeenCalledWith(document.getElementById('sequencer-grid'));

    spyCreateGrid.mockRestore();
  });

  test('bootstrap initializes MIDI input', () => {
    const spyInitMidi = jest.spyOn(window, 'initMidi').mockImplementation(() => {});

    bootstrap();

    expect(spyInitMidi).toHaveBeenCalled();

    spyInitMidi.mockRestore();
  });

  test('bootstrap wires up playback scheduler to transport events', () => {
    const spyStartScheduler = jest.spyOn(window, 'startScheduler').mockImplementation(() => {});
    const spyStopScheduler = jest.spyOn(window, 'stopScheduler').mockImplementation(() => {});

    const mockSubscribe = jest.spyOn(window, 'subscribe').mockImplementation((callback) => {
      callback({ type: 'TRANSPORT/PLAY' });
      callback({ type: 'TRANSPORT/PAUSE' });
      return () => {};
    });

    bootstrap();

    expect(spyStartScheduler).toHaveBeenCalled();
    expect(spyStopScheduler).toHaveBeenCalled();

    mockSubscribe.mockRestore();
    spyStartScheduler.mockRestore();
    spyStopScheduler.mockRestore();
  });

  test('bootstrap listens to GRID/STEP_TOGGLED events', () => {
    const spySubscribe = jest.spyOn(window, 'subscribe').mockImplementation((callback) => {
      callback({ type: 'GRID/STEP_TOGGLED' });
      return () => {};
    });

    bootstrap();

    expect(spySubscribe).toHaveBeenCalled();

    spySubscribe.mockRestore();
  });

  test('bootstrap sets up cleanup on beforeunload', () => {
    const spyDisposeMidi = jest.spyOn(window, 'disposeMidi').mockImplementation(() => {});
    const spyStopScheduler = jest.spyOn(window, 'stopScheduler').mockImplementation(() => {});
    const spySubscribe = jest.spyOn(window, 'subscribe').mockImplementation(() => () => {});

    const spyAddEventListener = jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      handler();
    });

    bootstrap();

    expect(spyDisposeMidi).toHaveBeenCalled();
    expect(spyStopScheduler).toHaveBeenCalled();
    expect(spySubscribe).toHaveBeenCalled();

    spyAddEventListener.mockRestore();
    spyDisposeMidi.mockRestore();
    spyStopScheduler.mockRestore();
    spySubscribe.mockRestore();
  });

  test('bootstrap does not crash if containers are missing', () => {
    document.body.innerHTML = '<div id="no-container"></div>';

    const spyInitAudio = jest.spyOn(window, 'initAudio').mockImplementation(() => {});
    const spyAttachControls = jest.spyOn(window, 'attachControls').mockImplementation(() => ({ destroy: jest.fn() }));
    const spyCreateGrid = jest.spyOn(window, 'createGrid').mockImplementation(() => ({ destroy: jest.fn() }));
    const spyInitMidi = jest.spyOn(window, 'initMidi').mockImplementation(() => {});

    expect(() => bootstrap()).not.toThrow();

    spyInitAudio.mockRestore();
    spyAttachControls.mockRestore();
    spyCreateGrid.mockRestore();
    spyInitMidi.mockRestore();
  });

  test('bootstrap emits APP/BOOTED event', () => {
    const spyEmit = jest.spyOn(window, 'emit').mockImplementation(() => {});

    bootstrap();

    expect(spyEmit).toHaveBeenCalledWith('APP/BOOTED');

    spyEmit.mockRestore();
  });
});