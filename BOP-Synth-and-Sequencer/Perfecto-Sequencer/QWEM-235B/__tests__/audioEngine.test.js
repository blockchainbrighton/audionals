// __tests__/audioEngine.test.js
import { initAudio, triggerNote, dispose } from '../audioEngine.js';
import { emit } from '../eventBus.js';

// Mock ToneJS
global.Tone = {
  start: jest.fn(),
  now: () => 0,
  PolySynth: class {
    constructor() {
      this.toDestination = jest.fn();
      this.set = jest.fn();
      this.triggerAttack = jest.fn();
      this.triggerRelease = jest.fn();
    }
    dispose() {}
  },
  Synth: class {},
  Frequency: {
    prototype: { toNote: () => 'C4' },
    toNote: (val) => {
      // Simple mapping: 60 = C4, 61 = C#4, etc.
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(val / 12) - 1;
      const note = notes[val % 12];
      return `${note}${octave}`;
    },
  },
  Time: {
    prototype: { toSeconds: () => 0.5 },
    toSeconds: () => 0.5,
  },
};

// Mock document.body for event listeners
document.body.addEventListener = jest.fn();
document.body.removeEventListener = jest.fn();

describe('audioEngine', () => {
  beforeEach(() => {
    global.Tone.start.mockClear();
    // Reset module state
    require('../audioEngine.js').dispose();
  });

  test('should initialize audio engine and create synth', async () => {
    await initAudio();

    expect(Tone.start).toHaveBeenCalled();
    expect(document.body.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(document.body.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(global.Tone.PolySynth).toHaveBeenCalledTimes(1);
  });

  test('should be idempotent: second init does nothing', async () => {
    await initAudio();
    const synthBefore = globalThis.synth;
    await initAudio();
    const synthAfter = globalThis.synth;

    expect(Tone.PolySynth).toHaveBeenCalledTimes(1);
    expect(synthBefore).toBe(synthAfter);
  });

  test('should trigger a single note with default duration and velocity', () => {
    // Simulate already initialized
    globalThis.synth = {
      triggerAttack: jest.fn(),
      triggerRelease: jest.fn(),
    };

    triggerNote('C4');

    expect(globalThis.synth.triggerAttack).toHaveBeenCalledWith('C4', 0, 0.8);
    expect(globalThis.synth.triggerRelease).toHaveBeenCalledWith('C4', 0.5);
  });

  test('should trigger a chord with custom duration and velocity', () => {
    globalThis.synth = {
      triggerAttack: jest.fn(),
      triggerRelease: jest.fn(),
    };

    triggerNote(['C4', 'E4', 'G4'], 0.5, 0.9);

    expect(globalThis.synth.triggerAttack).toHaveBeenCalledWith(['C4', 'E4', 'G4'], 0, 0.9);
    expect(globalThis.synth.triggerRelease).toHaveBeenCalledWith(['C4', 'E4', 'G4'], 0.5);
  });

  test('should schedule note at specific time when "when" is provided', () => {
    globalThis.synth = {
      triggerAttack: jest.fn(),
      triggerRelease: jest.fn(),
    };

    triggerNote('C4', 0.25, 0.8, 1.0);

    expect(globalThis.synth.triggerAttack).toHaveBeenCalledWith('C4', 1.0, 0.8);
    expect(globalThis.synth.triggerRelease).toHaveBeenCalledWith('C4', 1.5);
  });

  test('should warn if triggerNote is called before init', () => {
    // Ensure no synth
    globalThis.synth = null;
    console.warn = jest.fn();

    triggerNote('C4');

    expect(console.warn).toHaveBeenCalledWith('[audioEngine] Audio not initialized. Call initAudio() first.');
  });

  test('stepToNote should convert step index to correct note', () => {
    // Mock Tone.Frequency.toNote to return predictable values
    const originalToNote = Tone.Frequency.toNote;
    Tone.Frequency.toNote = jest.fn().mockReturnValue('D4');

    const note = require('../audioEngine.js').stepToNote(62); // D4 = 62
    expect(note).toBe('D4');
    expect(Tone.Frequency.toNote).toHaveBeenCalledWith(62, "midi");

    // Restore
    Tone.Frequency.toNote = originalToNote;
  });

  test('dispose should clean up synth and reset state', () => {
    globalThis.synth = { dispose: jest.fn() };
    globalThis.initialized = true;

    dispose();

    expect(globalThis.synth.dispose).toHaveBeenCalled();
    expect(globalThis.synth).toBeNull();
    expect(globalThis.initialized).toBe(false);
  });

  test('should respond to AUDIO/TRIGGER_NOTE event', () => {
    const mockSynth = {
      triggerAttack: jest.fn(),
      triggerRelease: jest.fn(),
    };
    globalThis.synth = mockSynth;

    // Emit event
    emit('AUDIO/TRIGGER_NOTE', {
      track: 0,
      step: 4,
      velocity: 0.7,
      duration: 0.5,
    });

    // Allow event loop tick
    return Promise.resolve().then(() => {
      expect(mockSynth.triggerAttack).toHaveBeenCalledWith('E3', 0, 0.7);
      expect(mockSynth.triggerRelease).toHaveBeenCalledWith('E3', 0.5);
    });
  });
});