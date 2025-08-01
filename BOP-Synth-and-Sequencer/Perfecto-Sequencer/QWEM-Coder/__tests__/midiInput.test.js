// __tests__/midiInput.test.js

/**
 * @file Unit tests for midiInput.js
 */

import { initMidi, disposeMidi, getMidiStatus } from '../midiInput.js';
import { emit } from '../eventBus.js';

// Mock dependencies
jest.mock('../eventBus.js');

describe('midiInput', () => {
  let mockMidiAccess, mockInputs;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock MIDI inputs
    mockInputs = new Map();
    
    // Setup mock MIDI access
    mockMidiAccess = {
      inputs: mockInputs,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Mock navigator.requestMIDIAccess
    navigator.requestMIDIAccess = jest.fn().mockResolvedValue(mockMidiAccess);
  });

  afterEach(() => {
    disposeMidi();
  });

  test('should initialize MIDI when supported', async () => {
    const result = await initMidi();
    
    expect(result).toBe(true);
    expect(navigator.requestMIDIAccess).toHaveBeenCalled();
    expect(mockMidiAccess.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
  });

  test('should return false when WebMIDI is not supported', async () => {
    delete navigator.requestMIDIAccess;
    
    const result = await initMidi();
    
    expect(result).toBe(false);
  });

  test('should handle MIDI note on events and emit grid events', async () => {
    // Setup mock input
    const mockInput = {
      id: 'test-input-1',
      name: 'Test MIDI Device',
      state: 'connected',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    mockInputs.set('test-input-1', mockInput);
    
    await initMidi();
    
    // Get the MIDI message handler
    const messageHandler = mockInput.addEventListener.mock.calls.find(call => call[0] === 'midimessage')[1];
    
    // Simulate a Note On event (C2 note 36, velocity 100)
    const midiEvent = {
      data: [0x90, 36, 100] // Note On, C2, velocity 100
    };
    
    messageHandler(midiEvent);
    
    expect(emit).toHaveBeenCalledWith('GRID/STEP_TOGGLED', {
      track: 0,
      step: 0,
      isActive: true
    });
  });

  test('should handle MIDI note off events', async () => {
    const mockInput = {
      id: 'test-input-2',
      name: 'Test MIDI Device 2',
      state: 'connected',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    mockInputs.set('test-input-2', mockInput);
    
    await initMidi();
    
    const messageHandler = mockInput.addEventListener.mock.calls.find(call => call[0] === 'midimessage')[1];
    
    // Simulate a Note Off event (C2 note 36)
    const midiEvent = {
      data: [0x80, 36, 0] // Note Off, C2
    };
    
    messageHandler(midiEvent);
    
    expect(emit).toHaveBeenCalledWith('GRID/STEP_TOGGLED', {
      track: 0,
      step: 0,
      isActive: false
    });
  });

  test('should ignore unmapped MIDI notes', async () => {
    const mockInput = {
      addEventListener: jest.fn()
    };
    
    mockInputs.set('test-input-3', mockInput);
    
    await initMidi();
    
    const messageHandler = mockInput.addEventListener.mock.calls.find(call => call[0] === 'midimessage')[1];
    
    // Simulate a note outside the mapped range
    const midiEvent = {
      data: [0x90, 12, 100] // Very low note
    };
    
    messageHandler(midiEvent);
    
    expect(emit).not.toHaveBeenCalled();
  });

  test('should handle device connection events', async () => {
    await initMidi();
    
    // Get the state change handler
    const stateChangeHandler = mockMidiAccess.addEventListener.mock.calls.find(call => call[0] === 'statechange')[1];
    
    // Setup new input device
    const newInput = {
      id: 'new-device',
      type: 'input',
      state: 'connected',
      addEventListener: jest.fn()
    };
    
    const event = {
      port: newInput
    };
    
    stateChangeHandler(event);
    
    expect(newInput.addEventListener).toHaveBeenCalledWith('midimessage', expect.any(Function));
  });

  test('should handle device disconnection events', async () => {
    await initMidi();
    
    const stateChangeHandler = mockMidiAccess.addEventListener.mock.calls.find(call => call[0] === 'statechange')[1];
    
    const disconnectedInput = {
      id: 'disconnected-device',
      type: 'input',
      state: 'disconnected',
      removeEventListener: jest.fn()
    };
    
    const event = {
      port: disconnectedInput
    };
    
    stateChangeHandler(event);
    
    expect(disconnectedInput.removeEventListener).toHaveBeenCalledWith('midimessage', expect.any(Function));
  });

  test('should clean up MIDI resources on dispose', async () => {
    const mockInput = {
      removeEventListener: jest.fn()
    };
    
    mockInputs.set('test-input-4', mockInput);
    mockMidiAccess.removeEventListener = jest.fn();
    
    await initMidi();
    disposeMidi();
    
    expect(mockMidiAccess.removeEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
    expect(mockInput.removeEventListener).toHaveBeenCalledWith('midimessage', expect.any(Function));
  });

  test('should return correct MIDI status', async () => {
    // Before init
    expect(getMidiStatus().enabled).toBe(false);
    expect(getMidiStatus().devices).toEqual([]);
    
    // After init with device
    const mockInput = {
      id: 'status-test-device',
      name: 'Status Test Device',
      state: 'connected'
    };
    
    mockInputs.set('status-test-device', mockInput);
    
    await initMidi();
    
    const status = getMidiStatus();
    expect(status.enabled).toBe(true);
    expect(status.devices).toEqual([
      {
        id: 'status-test-device',
        name: 'Status Test Device',
        state: 'connected'
      }
    ]);
  });

  // Edge case: Test handling of note on with zero velocity (equivalent to note off)
  test('should treat note on with zero velocity as note off', async () => {
    const mockInput = {
      addEventListener: jest.fn()
    };
    
    mockInputs.set('test-input-5', mockInput);
    
    await initMidi();
    
    const messageHandler = mockInput.addEventListener.mock.calls.find(call => call[0] === 'midimessage')[1];
    
    // Note On with zero velocity
    const midiEvent = {
      data: [0x90, 36, 0] // Note On, C2, zero velocity
    };
    
    messageHandler(midiEvent);
    
    expect(emit).toHaveBeenCalledWith('GRID/STEP_TOGGLED', {
      track: 0,
      step: 0,
      isActive: false // Should be false despite being "note on"
    });
  });
});