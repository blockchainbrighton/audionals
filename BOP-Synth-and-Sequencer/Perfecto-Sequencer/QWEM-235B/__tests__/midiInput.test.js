// __tests__/midiInput.test.js
import { initMidi, disposeMidi } from '../midiInput.js';
import { emit, on } from '../eventBus.js';
import { dispatch, getState } from '../stateManager.js';

// Mock WebMIDI
const mockMIDIAccess = {
  inputs: new Map(),
  onstatechange: null,
};

const mockMIDIInput = {
  id: 'test-midi-device',
  name: 'Test MIDI Keyboard',
  type: 'input',
  state: 'connected',
  connection: 'open',
  onmidimessage: null,
};

global.navigator.requestMIDIAccess = jest.fn(() => Promise.resolve(mockMIDIAccess));

// Mock stateManager
jest.mock('../stateManager.js', () => ({
  getState: jest.fn(() => ({
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: {
        0: { 0: true, 4: true },
        1: {},
      },
    },
  })),
  dispatch: jest.fn(),
}));

describe('midiInput', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
    global.navigator = { ...originalNavigator };

    // Reset mocks
    jest.clearAllMocks();
    mockMIDIAccess.inputs.clear();
    mockMIDIAccess.inputs.set('input-1', { ...mockMIDIInput, onmidimessage: null });
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should initialize MIDI and set up input listeners', async () => {
    const callback = jest.fn();
    on('MIDI/READY', callback);

    await initMidi();

    expect(navigator.requestMIDIAccess).toHaveBeenCalledWith({ type: 'input' });
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MIDI/READY',
        payload: { deviceCount: 1 }
      })
    );

    const input = mockMIDIAccess.inputs.values().next().value;
    expect(input.onmidimessage).toBeInstanceOf(Function);
  });

  test('should handle note on messages and emit GRID/STEP_TOGGLED', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    initMidi(); // Already mocked

    const input = mockMIDIAccess.inputs.values().next().value;
    const onMessage = input.onmidimessage;

    // Send MIDI note on: C3 (60), velocity 100
    onMessage({
      data: [0x90, 60, 100], // Note on, note 60, vel 100
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        track: 0, // findActiveTrack returns 0
        step: 0,  // C3 = step 0
        isActive: true
      })
    );
  });

  test('should handle note off messages (explicit and velocity 0)', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    initMidi();
    const input = mockMIDIAccess.inputs.values().next().value;
    const onMessage = input.onmidimessage;

    // Test explicit note off
    callback.mockClear();
    onMessage({
      data: [0x80, 62, 64], // Note off, D3, vel 64
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        track: 0,
        step: 2, // D3 = 62 → step 2
        isActive: false
      })
    );

    // Test note on with velocity 0
    callback.mockClear();
    onMessage({
      data: [0x90, 64, 0], // Note on, E3, vel 0 → treated as off
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        track: 0,
        step: 4,
        isActive: false
      })
    );
  });

  test('should ignore notes outside grid step range', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    initMidi();
    const input = mockMIDIAccess.inputs.values().next().value;
    const onMessage = input.onmidimessage;

    // B2 = 59 → step -1 (invalid)
    onMessage({ data: [0x90, 59, 100] });
    expect(callback).not.toHaveBeenCalled();

    // G3 = 67 → step 7 (valid)
    callback.mockClear();
    onMessage({ data: [0x90, 67, 100] });
    expect(callback).toHaveBeenCalled();

    // C4 = 72 → step 12 (valid if stepsPerTrack > 12)
    getState.mockReturnValue({ grid: { tracks: 8, stepsPerTrack: 16 } });
    callback.mockClear();
    onMessage({ data: [0x90, 72, 100] });
    expect(callback).toHaveBeenCalled();

    // C#4 = 73 → step 13 (invalid if stepsPerTrack=12)
    getState.mockReturnValue({ grid: { tracks: 8, stepsPerTrack: 12 } });
    callback.mockClear();
    onMessage({ data: [0x90, 73, 100] });
    expect(callback).not.toHaveBeenCalled();
  });

  test('should use first active track for MIDI input', () => {
    const callback = jest.fn();
    on('GRID/STEP_TOGGLED', callback);

    // Mock state: track 0 has steps, track 1 does not
    getState.mockReturnValue({
      grid: {
        tracks: 2,
        stepsPerTrack: 16,
        patternData: {
          0: { 0: true },
          1: {},
        },
      },
    });

    initMidi();
    const input = mockMIDIAccess.inputs.values().next().value;
    input.onmidimessage({ data: [0x90, 60, 100] });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ track: 0, step: 0, isActive: true })
    );

    // Mock: no tracks active
    getState.mockReturnValue({
      grid: {
        tracks: 2,
        stepsPerTrack: 16,
        patternData: { 0: {}, 1: {} },
      },
    });

    callback.mockClear();
    input.onmidimessage({ data: [0x90, 60, 100] });
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ track: 0, step: 0, isActive: true }) // defaults to 0
    );
  });

  test('should handle new MIDI devices connected after init', () => {
    initMidi();

    const newInput = { ...mockMIDIInput, id: 'new-device', onmidimessage: null };
    mockMIDIAccess.inputs.set('input-2', newInput);

    // Simulate connection
    mockMIDIAccess.onstatechange({
      port: newInput,
    });

    expect(newInput.onmidimessage).toBeInstanceOf(Function);
  });

  test('should gracefully handle unsupported browser', async () => {
    global.navigator.requestMIDIAccess = undefined;
    console.warn = jest.fn();

    await initMidi();

    expect(console.warn).toHaveBeenCalledWith('[midiInput] WebMIDI not supported in this browser');
  });

  test('disposeMidi should clean up event listeners', () => {
    initMidi();
    disposeMidi();

    const input = mockMIDIAccess.inputs.values().next().value;
    expect(input.onmidimessage).toBeNull();
  });
});