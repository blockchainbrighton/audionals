/**
 * MOTHY G SYNTH ARCHITECTURE OVERVIEW
 * ------------------------------------
 * Files: single script entry-point for the whole instrument.
 *
 * 1. Boot Sequence
 *    - Document ready hook instantiates `UIController`, which manages layout, state persistence,
 *      and ties DOM events to the audio engine.
 *    - Audio graph is created lazily when the user presses the "Init Audio" button to comply with
 *      browser autoplay restrictions.
 *
 * 2. Core Engine (`MothyGSynth`)
 *    - Wraps a Web Audio `AudioContext`, master bus (soft clipper into limiter), analyser nodes,
 *      and a deterministic pseudo random generator (for seeded randomization).
 *    - Manages a polyphonic `VoicePool`. Each `Voice` contains: OSC A/B wavetable oscillators,
 *      sub oscillator (sine + square blend through soft saturation), single operator FM, dual filters
 *      (LP/BP with serial/parallel routing), per-voice transient shaper, and voice gain envelope.
 *    - Parameter smoothing utilities ensure clean automation and glide.
 *
 * 3. Modulation & Control
 *    - Three global LFOs (audio-rate oscillators in low frequency range) and MOD envelope feed an
 *      8-slot modulation matrix. Destinations cover oscillator morph, FM index, filter cutoff/res,
 *      drive, wavetable position, sub blend, panner, and FX sends.
 *    - Envelope follower derives a control signal from the internal drum bus or an external audio
 *      input; it can modulate sub gain or filter cutoff for groove-locked sidechain movement.
 *
 * 4. Performance Controls
 *    - Transport Play fires a sustain drone so users can tweak the patch without external MIDI.
 *      Internal rhythm bus and key selection still interact with modulation and sidechain systems.
 *    - MIDI input (notes, sustain, CC learn) and computer keyboard mapping allow quick audition.
 *
 * 5. Presets & Seeds
 *    - Complete patch state (oscillators, filters, envelopes, mod matrix, FX, performance, metadata)
 *      is serialised as JSON. Seed-based randomizer uses the deterministic PRNG to ensure identical
 *      outcomes for the same seed value. Autosave persists the last patch in `localStorage`.
 *
 * Adding New Wavetables
 * ---------------------
 * - Extend `WAVETABLE_LIBRARY` with a new entry (id + generator). The generator should return
 *   `{ real, imag }` Float32Arrays describing harmonic partials. The manager interpolates between
 *   precomputed tables based on the morph position.
 * - Reference your new table in `OSCILLATOR_CATALOG` so UI + engine can adopt it.
 */

const APP_VERSION = '0.1.0';
const STORAGE_KEY = 'mothy-g-state-v1';
const MAX_VOICES = 16;
const CONTROL_SMOOTH = 0.04;

const KEY_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_ALIASES = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

const NOTE_MAP = {
  KeyA: 'C4', KeyW: 'C#4', KeyS: 'D4', KeyE: 'D#4', KeyD: 'E4',
  KeyF: 'F4', KeyT: 'F#4', KeyG: 'G4', KeyY: 'G#4', KeyH: 'A4',
  KeyU: 'A#4', KeyJ: 'B4', KeyK: 'C5', KeyO: 'C#5', KeyL: 'D5',
  Semicolon: 'D#5', Quote: 'E5'
};

const LFO_SHAPES = ['sine', 'triangle', 'sawtooth', 'square', 'sample-hold', 'user'];

const TOOLTIP_COPY = {
  'global.bpm': 'Sets the master tempo in beats per minute. Drives tempo-synced FX and the internal rhythm bus.',
  'global.swing': 'Delays every second sixteenth note by this percentage to add shuffle. 0% keeps straight timing.',
  'global.masterVolume': 'Trims the overall instrument level before the limiter. Use to balance patches.',
  'global.limiterCeiling': 'Limiter threshold in dBFS. Lower values add headroom and more limiting.',
  'global.quality': 'Enable oversampling for cleaner highs. Uses more CPU at higher oversample factors.',
  'transport.play': 'Start a sustained drone so you can tweak the patch in real time.',
  'transport.stop': 'Stop the drone and release any active voices immediately.',
  'transport.rhythm': 'Toggle the internal drum bus that feeds the sidechain follower.',
  'transport.initAudio': 'Initialise the audio context. Browsers require a user gesture before sound.',
  'tooltips.toggle': 'Show or hide inline tips to learn what each control does.',
  'key.select': 'Transpose the instrument so the keyboard root (C) maps to this musical key.',
  'sub.level': 'Output level for the dedicated sub oscillator before the main bus.',
  'sub.squareBlend': 'Blend between sine and square for the sub oscillator tone.',
  'sub.saturation': 'Amount of soft saturation applied to the sub oscillator for extra harmonics.',
  'sub.legato': 'When enabled the bass lane plays legato for connected, sliding notes.',
  'osc.table': 'Choose the wavetable that defines this oscillator’s harmonic content.',
  'osc.morph': 'Scan through the selected wavetable to move between harmonic snapshots.',
  'osc.tune': 'Coarse pitch tuning in semitone steps.',
  'osc.fine': 'Fine tune the oscillator in cents for beating or detune effects.',
  'osc.level': 'Output gain for this oscillator prior to the mixer.',
  'osc.pan': 'Stereo placement of the oscillator signal.',
  'fm.ratio': 'Carrier-to-modulator frequency ratio. Alters the overtone relationship.',
  'fm.index': 'Modulation depth for FM. Higher values add more sidebands and brightness.',
  'fm.attack': 'Attack time for the FM index envelope in seconds.',
  'fm.decay': 'Decay time for the FM index envelope.',
  'fm.velocityToIndex': 'Scales FM depth by incoming note velocity for dynamic expression.',
  'filter.type': 'Select the filter response (low-pass, band-pass, high-pass, etc.).',
  'filter.cutoff': 'Cutoff frequency in Hz that the filter works around.',
  'filter.resonance': 'Boost around the cutoff frequency for emphasis.',
  'filter.drive': 'Filter input gain for extra warmth and harmonic saturation.',
  'filter.envAmount': 'Depth of the filter envelope modulation in Hz.',
  'filter.keytrack': 'How strongly the filter cutoff follows the played pitch.',
  'filter.serial': 'Route filter 1 into filter 2 when enabled; otherwise run them in parallel.',
  'filter.mix': 'Blend between filter 1 and filter 2 outputs.',
  'envelope.attack': 'Time taken to ramp from silence to full level.',
  'envelope.decay': 'Time to fall from peak level down to sustain.',
  'envelope.sustain': 'Level held while the note is sustained.',
  'envelope.release': 'Time to fade to silence after note release.',
  'envelope.curve': 'Exponent controlling the curve shape of each envelope segment.',
  'fx.chorus.depth': 'Depth of pitch modulation inside the chorus.',
  'fx.chorus.rate': 'Speed of the chorus modulation.',
  'fx.delay.time': 'Delay time in seconds. Syncs to tempo when using synced patterns.',
  'fx.delay.feedback': 'Amount of delayed signal that is fed back for repeats.',
  'fx.delay.mix': 'Wet/dry balance for the delay effect.',
  'fx.reverb.mix': 'Wet/dry balance for the reverb tail.',
  'sidechain.amount': 'How strongly the sidechain envelope ducks the synth.',
  'sidechain.attack': 'Time for the sidechain ducking to reach full depth.',
  'sidechain.release': 'Time for the ducking to recover after a hit.',
  'sidechain.source': 'Choose whether the sidechain listens to internal drums or the master bus.',
  'modMatrix.source': 'Pick a modulation source for this modulation slot.',
  'modMatrix.destination': 'Enter the parameter id to modulate (e.g. filter1.cutoff).',
  'modMatrix.amount': 'Modulation depth. Negative values invert the modulation.',
  'preset.factory': 'Load one of the built-in factory presets.',
  'preset.seed': 'Seed used for repeatable random patch generation.',
  'preset.randomize': 'Randomise the current patch using the seed above.',
  'preset.copy': 'Copy the current patch as JSON to the clipboard.',
  'preset.paste': 'Read patch JSON from the clipboard and load it.'
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteNameToMidi(note) {
  if (typeof note === 'number') return note;
  const match = /^([A-Ga-g])(#|b)?(-?\d)$/.exec(note.trim());
  if (!match) return 60;
  const [, letter, accidental, octaveStr] = match;
  const octave = Number(octaveStr);
  const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = map[letter.toUpperCase()] ?? 0;
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  return clamp(12 * (octave + 1) + semitone, 0, 127);
}

function midiToNoteName(midi, preferSharps = true) {
  if (!Number.isFinite(midi)) return 'C4';
  const clamped = clamp(Math.round(midi), 0, 127);
  const sharpNames = KEY_ROOTS;
  const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const names = preferSharps ? sharpNames : flatNames;
  const octave = Math.floor(clamped / 12) - 1;
  const name = names[clamped % 12] ?? 'C';
  return `${name}${octave}`;
}

function normalizeKeyName(key) {
  if (typeof key !== 'string') return 'C';
  const trimmed = key.trim();
  if (KEY_ROOTS.includes(trimmed)) return trimmed;
  const alias = KEY_ALIASES[trimmed];
  if (alias) return alias;
  const upper = trimmed.toUpperCase();
  if (KEY_ROOTS.includes(upper)) return upper;
  return 'C';
}

function dbToGain(db) {
  return Math.pow(10, db / 20);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function expCurve(t, k = 3) {
  return Math.pow(t, k);
}

let ACTIVE_AUDIO_CONTEXT = null;

function resolveContext(param) {
  if (!param) return ACTIVE_AUDIO_CONTEXT;
  return param.context || param.audioContext || ACTIVE_AUDIO_CONTEXT;
}

function setParam(param, value, time, glide = CONTROL_SMOOTH) {
  if (!param) return;
  const context = resolveContext(param);
  const now = context ? context.currentTime : 0;
  const start = time ?? now;
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(start);
  } else if (typeof param.cancelScheduledValues === 'function') {
    param.cancelScheduledValues(start);
  }
  if (typeof param.setValueAtTime === 'function') {
    const current = typeof param.value === 'number' ? param.value : param.defaultValue ?? value;
    param.setValueAtTime(current, start);
  }
  if (typeof param.linearRampToValueAtTime === 'function') {
    param.linearRampToValueAtTime(value, start + glide);
  } else if (typeof param.setValueAtTime === 'function') {
    param.setValueAtTime(value, start + glide);
  }
}

class PRNG {
  constructor(seed = 1234567) {
    this.setSeed(seed);
  }
  setSeed(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 0xffffffff;
  }
  nextRange(min, max) {
    return lerp(min, max, this.next());
  }
  pick(array) {
    return array[Math.floor(this.next() * array.length) % array.length];
  }
}

function buildHarmonics(partials, fn) {
  const real = new Float32Array(partials + 1);
  const imag = new Float32Array(partials + 1);
  for (let n = 1; n <= partials; n += 1) {
    const { real: r, imag: i } = fn(n);
    real[n] = r;
    imag[n] = i;
  }
  return { real, imag };
}

function mixHarmonics(a, b, t) {
  const real = new Float32Array(a.real.length);
  const imag = new Float32Array(a.imag.length);
  for (let i = 0; i < real.length; i += 1) {
    real[i] = lerp(a.real[i], b.real[i], t);
    imag[i] = lerp(a.imag[i], b.imag[i], t);
  }
  return { real, imag };
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function getNested(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setNested(obj, path, value) {
  if (!path) return;
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (acc[key] == null || typeof acc[key] !== 'object') {
      acc[key] = {};
    }
    return acc[key];
  }, obj);
  target[last] = value;
}

function defaultEventForType(type) {
  if (type === 'select' || type === 'checkbox' || type === 'text') return 'change';
  return 'input';
}

function parseInputValue(input, type) {
  switch (type) {
    case 'checkbox':
      return input.checked;
    case 'range':
    case 'number':
      return Number(input.value);
    default:
      return input.value;
  }
}

function defaultValueForType(type, options) {
  switch (type) {
    case 'checkbox':
      return false;
    case 'select': {
      const first = options?.[0];
      if (!first) return '';
      if (typeof first === 'string') return first;
      return first.value ?? first.id ?? '';
    }
    case 'range':
    case 'number':
      return 0;
    default:
      return '';
  }
}

const WAVETABLE_LIBRARY = {
  mellowTriangle(partials = 24) {
    return buildHarmonics(partials, (n) => {
      if (n % 2 === 0) return { real: 0, imag: 0 };
      const amp = 1 / (n * n);
      const sign = n % 4 === 1 ? 1 : -1;
      return { real: sign * amp, imag: 0 };
    });
  },
  smoothSaw(partials = 24) {
    return buildHarmonics(partials, (n) => {
      const amp = 1 / n;
      return { real: 0, imag: amp }; // saw = sine series, imag part
    });
  },
  grittySaw(partials = 32) {
    return buildHarmonics(partials, (n) => {
      const amp = (1 / n) * (1 + Math.log2(1 + n));
      const phase = (n % 2 === 0) ? Math.PI / 4 : Math.PI / 2;
      return { real: Math.cos(phase) * amp * 0.6, imag: Math.sin(phase) * amp };
    });
  },
  reeseBlend(partials = 24) {
    return buildHarmonics(partials, (n) => {
      const detuneA = Math.sin(n * 0.15) * 0.3;
      const detuneB = Math.cos(n * 0.12) * 0.3;
      const amp = 1 / n;
      return {
        real: amp * detuneA,
        imag: amp * (1 + detuneB)
      };
    });
  },
  hollowPulse(partials = 24) {
    return buildHarmonics(partials, (n) => {
      if (n % 2 === 0) return { real: 0, imag: 0 };
      const amp = 1 / n;
      return { real: amp * 0.5, imag: amp * 0.8 };
    });
  },
  airyBlend(partials = 20) {
    return buildHarmonics(partials, (n) => {
      const amp = (1 / n) * Math.exp(-0.05 * n);
      return { real: amp * 0.3, imag: amp };
    });
  },
  metallicFm(partials = 28) {
    return buildHarmonics(partials, (n) => {
      const amp = (1 / n) * (n % 2 === 0 ? 0.8 : 1.2);
      const phase = (n % 3) * (Math.PI / 3);
      return { real: Math.cos(phase) * amp, imag: Math.sin(phase) * amp };
    });
  }
};

const OSCILLATOR_CATALOG = {
  oscA: {
    name: 'OSC A',
    tables: [
      { id: 'mellowTriangle', label: 'Mellow Triangle' },
      { id: 'smoothSaw', label: 'Smooth Saw' },
      { id: 'reeseBlend', label: 'Reese Blend' },
      { id: 'grittySaw', label: 'Gritty Saw' }
    ]
  },
  oscB: {
    name: 'OSC B',
    tables: [
      { id: 'smoothSaw', label: 'Smooth Saw' },
      { id: 'airyBlend', label: 'Airy Blend' },
      { id: 'hollowPulse', label: 'Hollow Pulse' },
      { id: 'metallicFm', label: 'Metallic Overtones' }
    ]
  }
};

const MOD_TARGET_CONFIG = {
  'oscA.morph': {
    scale: 0.5,
    min: 0,
    max: 1,
    base: (state) => state.oscillators.oscA.morph,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ oscA: { morph: value } }))
  },
  'oscB.morph': {
    scale: 0.5,
    min: 0,
    max: 1,
    base: (state) => state.oscillators.oscB.morph,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ oscB: { morph: value } }))
  },
  'filter1.cutoff': {
    scale: 2000,
    min: 40,
    max: 14000,
    base: (state) => state.filters.filter1.cutoff,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ filter1: { cutoff: value } }))
  },
  'filter2.cutoff': {
    scale: 1500,
    min: 40,
    max: 14000,
    base: (state) => state.filters.filter2.cutoff,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ filter2: { cutoff: value } }))
  },
  'sub.level': {
    scale: 0.4,
    min: 0,
    max: 1,
    base: (state) => state.sub.level,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ sub: { level: value } }))
  },
  'drive': {
    scale: 0.4,
    min: 0.5,
    max: 2.5,
    base: (state) => state.filters.filter1.drive,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ drive: value }))
  },
  'delay.mix': {
    scale: 0.5,
    min: 0,
    max: 1,
    base: (state) => state.fx.delay.mix,
    apply: (synth, value) => synth.fx?.delayWet.gain ? setParam(synth.fx.delayWet.gain, value, synth.ctx.currentTime, 0.05) : null
  },
  'reverb.mix': {
    scale: 0.5,
    min: 0,
    max: 1,
    base: (state) => state.fx.reverb.mix,
    apply: (synth, value) => synth.fx?.reverbWet.gain ? setParam(synth.fx.reverbWet.gain, value, synth.ctx.currentTime, 0.05) : null
  },
  'master.volume': {
    scale: 0.8,
    min: 0,
    max: 1,
    base: (state) => state.global.masterVolume ?? 0.8,
    apply: (synth, value) => {
      if (!synth?.masterBus?.masterGain) return;
      setParam(synth.masterBus.masterGain.gain, value, synth.ctx.currentTime, 0.05);
    }
  },
  'chorus.depth': {
    scale: 0.3,
    min: 0,
    max: 1,
    base: (state) => state.fx.chorus.depth,
    apply: (synth, value) => {
      if (!synth.fx) return;
      setParam(synth.fx.chorusDepth.gain, value * 0.003, synth.ctx.currentTime, 0.05);
    }
  },
  'panner': {
    scale: 1,
    min: -1,
    max: 1,
    base: () => 0,
    apply: (synth, value) => synth.voices.forEach((voice) => voice.applyModulation({ panner: value }))
  }
};

const FILTER_TYPE_OPTIONS = [
  { value: 'lowpass', label: 'Low-pass' },
  { value: 'bandpass', label: 'Band-pass' },
  { value: 'highpass', label: 'High-pass' }
];

const MOD_SOURCE_OPTIONS = [
  'LFO1',
  'LFO2',
  'LFO3',
  'MODENV',
  'Keytrack',
  'Velocity',
  'Aftertouch',
  'EnvelopeFollower',
  'Random'
];

class WavetableManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.cache = new Map();
    this.precompute();
  }
  precompute() {
    const sets = Object.entries(OSCILLATOR_CATALOG);
    for (const [, def] of sets) {
      for (const table of def.tables) {
        const key = table.id;
        if (this.cache.has(key)) continue;
        const generator = WAVETABLE_LIBRARY[key];
        if (!generator) continue;
        const tables = [];
        const baseA = generator(24);
        const baseB = WAVETABLE_LIBRARY.grittySaw?.(24) ?? baseA;
        for (let i = 0; i < 32; i += 1) {
          const t = i / 31;
          const partials = mixHarmonics(baseA, baseB, t * 0.35);
          const wave = this.ctx.createPeriodicWave(partials.real, partials.imag, {
            disableNormalization: true
          });
          tables.push(wave);
        }
        this.cache.set(key, tables);
      }
    }
  }
  getPeriodicWave(id, morph = 0) {
    const tables = this.cache.get(id);
    if (!tables) return null;
    const index = Math.round(clamp(morph, 0, 1) * (tables.length - 1));
    return tables[index];
  }
}

class EnvelopeGenerator {
  constructor(ctx) {
    this.ctx = ctx;
    this.params = { attack: 0.01, decay: 0.12, sustain: 0.7, release: 0.3, curve: 1.0 };
  }
  set(params) {
    Object.assign(this.params, params);
  }
  trigger(param, velocity = 1, time = this.ctx.currentTime) {
    const { attack, decay, sustain, curve } = this.params;
    const depth = clamp(velocity, 0, 1);
    param.cancelScheduledValues(time);
    param.setValueAtTime(param.value, time);
    if (attack > 0) {
      param.linearRampToValueAtTime(depth, time + attack);
    } else {
      param.setValueAtTime(depth, time);
    }
    const decayEnd = time + attack + decay;
    const sustainLevel = Math.pow(sustain, curve);
    param.linearRampToValueAtTime(depth * sustainLevel, decayEnd);
    return decayEnd;
  }
  release(param, time = this.ctx.currentTime) {
    const { release } = this.params;
    param.cancelScheduledValues(time);
    param.setValueAtTime(param.value, time);
    param.linearRampToValueAtTime(0.0001, time + release);
  }
}

function createSoftClipper(ctx, drive = 1.2) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive);
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = '4x';
  return shaper;
}

function createTransientShaper(ctx, attack = 1.2, sustain = 0.8) {
  const input = ctx.createGain();
  const attackGain = ctx.createGain();
  const sustainGain = ctx.createGain();
  const merger = ctx.createGain();

  attackGain.gain.value = attack;
  sustainGain.gain.value = sustain;

  const detector = ctx.createBiquadFilter();
  detector.type = 'lowpass';
  detector.frequency.value = 600;

  const rectifier = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.abs(x);
  }
  rectifier.curve = curve;

  const follower = ctx.createGain();
  follower.gain.value = 0.6;

  input.connect(detector);
  detector.connect(rectifier);
  rectifier.connect(follower);

  input.connect(attackGain);
  input.connect(sustainGain);

  follower.connect(attackGain.gain);
  follower.connect(sustainGain.gain);

  attackGain.connect(merger);
  sustainGain.connect(merger);

  return { input, output: merger, setAttack(value) { attackGain.gain.value = value; }, setSustain(value) { sustainGain.gain.value = value; } };
}

class Voice {
  constructor(ctx, wavetableManager, globalState) {
    this.ctx = ctx;
    this.wt = wavetableManager;
    this.globalState = globalState;
    this.active = false;
    this.modCache = {};

    this.preFilter = ctx.createGain();
    this.preFilter.gain.value = 1;

    this.filter1 = ctx.createBiquadFilter();
    this.filter2 = ctx.createBiquadFilter();
    this.filter1.Q.value = 0.7;
    this.filter2.Q.value = 0.6;

    this.filter1ToVoice = ctx.createGain();
    this.filter2ToVoice = ctx.createGain();
    this.filter1ToVoice.gain.value = 0.6;
    this.filter2ToVoice.gain.value = 0.4;

    this.filter2SerialIn = ctx.createGain();
    this.filter2ParallelIn = ctx.createGain();
    this.filter2SerialIn.gain.value = 1;
    this.filter2ParallelIn.gain.value = 0;

    this.preFilter.connect(this.filter1);
    this.filter1.connect(this.filter1ToVoice);

    this.filter1.connect(this.filter2SerialIn);
    this.filter2SerialIn.connect(this.filter2);
    this.preFilter.connect(this.filter2ParallelIn);
    this.filter2ParallelIn.connect(this.filter2);
    this.filter2.connect(this.filter2ToVoice);

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0;

    this.filter1ToVoice.connect(this.voiceGain);
    this.filter2ToVoice.connect(this.voiceGain);

    this.preSat = createSoftClipper(ctx, 1.05);
    this.voiceGain.connect(this.preSat);

    this.transient = createTransientShaper(ctx, 1.1, 0.9);
    this.preSat.connect(this.transient.input);

    this.panner = ctx.createStereoPanner();
    this.transient.output.connect(this.panner);

    this.output = ctx.createGain();
    this.panner.connect(this.output);

    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.oscA.start();
    this.oscB.start();

    this.oscAGain = ctx.createGain();
    this.oscBGain = ctx.createGain();
    this.oscAGain.gain.value = 0;
    this.oscBGain.gain.value = 0;

    this.oscA.connect(this.oscAGain);
    this.oscB.connect(this.oscBGain);
    this.oscAGain.connect(this.preFilter);
    this.oscBGain.connect(this.preFilter);

    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.start();

    this.subSquare = ctx.createOscillator();
    this.subSquare.type = 'square';
    this.subSquare.start();

    this.subSquareGain = ctx.createGain();
    this.subSquareGain.gain.value = 0;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;

    this.subOsc.connect(this.subGain);
    this.subSquare.connect(this.subSquareGain).connect(this.subGain);

    this.subClipperDrive = 0.25;
    this.subClipper = createSoftClipper(ctx, 1.0 + this.subClipperDrive * 2);
    this.subGain.connect(this.subClipper);
    this.subClipper.connect(this.preFilter);

    this.fmOsc = ctx.createOscillator();
    this.fmOsc.type = 'sine';
    this.fmOsc.start();
    this.fmGain = ctx.createGain();
    this.fmGain.gain.value = 0;
    this.fmOsc.connect(this.fmGain);
    this.fmGain.connect(this.oscA.frequency);

    this.ampEnv = new EnvelopeGenerator(ctx);
    this.filtEnv = new EnvelopeGenerator(ctx);
    this.modEnv = new EnvelopeGenerator(ctx);
  }
  updateFromState(state) {
    this.currentState = state;
    const ctx = this.ctx;
    const { oscillators, sub, fm, filters, envelopes, transient } = state;
    const now = ctx.currentTime;

    const oscASettings = oscillators.oscA;
    const oscBSettings = oscillators.oscB;
    const waveA = this.wt.getPeriodicWave(oscASettings.table, oscASettings.morph);
    const waveB = this.wt.getPeriodicWave(oscBSettings.table, oscBSettings.morph);
    if (waveA) this.oscA.setPeriodicWave(waveA);
    if (waveB) this.oscB.setPeriodicWave(waveB);

    this.oscA.detune.setValueAtTime(oscASettings.fine * 100, now);
    this.oscB.detune.setValueAtTime(oscBSettings.fine * 100, now);
    setParam(this.oscAGain.gain, oscASettings.level, now);
    setParam(this.oscBGain.gain, oscBSettings.level, now);

    this.panner.pan.setValueAtTime(clamp(oscASettings.pan + oscBSettings.pan * 0.5, -1, 1), now);

    setParam(this.subGain.gain, sub.level, now);
    this.subSquareGain.gain.setValueAtTime(sub.squareBlend * 0.2, now);
    if (Math.abs(sub.saturation - this.subClipperDrive) > 0.01) {
      this.subGain.disconnect();
      this.subClipper.disconnect();
      this.subClipperDrive = sub.saturation;
      this.subClipper = createSoftClipper(ctx, 1 + sub.saturation * 2);
      this.subGain.connect(this.subClipper);
      this.subClipper.connect(this.preFilter);
    }

    this.fmSettings = { ...fm };

    this.filter1.type = filters.filter1.type;
    this.filter1.frequency.setValueAtTime(filters.filter1.cutoff, now);
    this.filter1.Q.setValueAtTime(filters.filter1.resonance, now);

    this.filter2.type = filters.filter2.type;
    this.filter2.frequency.setValueAtTime(filters.filter2.cutoff, now);
    this.filter2.Q.setValueAtTime(filters.filter2.resonance, now);

    const mix = clamp(filters.routing.mix, 0, 1);
    if (filters.routing.serial) {
      this.filter2SerialIn.gain.setValueAtTime(1, now);
      this.filter2ParallelIn.gain.setValueAtTime(0, now);
      this.filter1ToVoice.gain.setValueAtTime(0, now);
      this.filter2ToVoice.gain.setValueAtTime(1, now);
    } else {
      this.filter2SerialIn.gain.setValueAtTime(mix, now);
      this.filter2ParallelIn.gain.setValueAtTime(1 - mix * 0.5, now);
      this.filter1ToVoice.gain.setValueAtTime(1 - mix, now);
      this.filter2ToVoice.gain.setValueAtTime(mix, now);
    }

    this.preFilter.gain.setValueAtTime(filters.filter1.drive ?? 1, now);

    this.ampEnv.set(envelopes.amp);
    this.filtEnv.set(envelopes.filter);
    this.modEnv.set(envelopes.mod);

    this.transient.setAttack(transient.attack);
    this.transient.setSustain(transient.sustain);
  }
  trigger(note, velocity, time = this.ctx.currentTime) {
    if (!this.currentState) return;
    const midi = noteNameToMidi(note);
    const freq = midiToFreq(midi);
    this.active = true;
    this.note = midi;

    const { oscillators, sub, filters } = this.currentState;
    const fm = this.fmSettings;

    const oscAFreq = midiToFreq(midi + oscillators.oscA.tune);
    const oscBFreq = midiToFreq(midi + oscillators.oscB.tune);

    this.oscA.frequency.setValueAtTime(oscAFreq, time);
    this.oscB.frequency.setValueAtTime(oscBFreq, time);
    this.subOsc.frequency.setValueAtTime(freq, time);
    this.subSquare.frequency.setValueAtTime(freq, time);

    const ratioFreq = oscAFreq * (fm?.ratio ?? 1);
    this.fmOsc.frequency.setValueAtTime(ratioFreq, time);
    const baseDeviation = oscAFreq * (fm?.index ?? 0);
    const velocityDeviation = oscAFreq * (fm?.velocityToIndex ?? 0) * velocity;
    const maxDeviation = Math.max(baseDeviation + velocityDeviation, 0.0001);
    this.fmGain.gain.cancelScheduledValues(time);
    this.fmGain.gain.setValueAtTime(0, time);
    const fmAttack = Math.max(fm?.attack ?? 0.005, 0.001);
    const fmDecay = Math.max(fm?.decay ?? 0.08, 0.01);
    this.fmGain.gain.linearRampToValueAtTime(maxDeviation, time + fmAttack);
    this.fmGain.gain.exponentialRampToValueAtTime(Math.max(maxDeviation * 0.01, 0.0001), time + fmAttack + fmDecay);

    this.ampEnv.trigger(this.voiceGain.gain, velocity, time);

    const keytrack1 = filters.filter1.keytrack ?? 0;
    const baseCutoff1 = filters.filter1.cutoff * Math.pow(2, keytrack1 * (midi - 60) / 12);
    const depth1 = filters.filter1.envAmount ?? 0;
    const attack1 = this.filtEnv.params.attack;
    const decay1 = this.filtEnv.params.decay;
    const sustain1 = this.filtEnv.params.sustain;
    this.filter1.frequency.cancelScheduledValues(time);
    this.filter1.frequency.setValueAtTime(Math.max(baseCutoff1 * 0.5, 20), time);
    this.filter1.frequency.linearRampToValueAtTime(Math.max(baseCutoff1 + depth1 * velocity, 60), time + attack1);
    this.filter1.frequency.linearRampToValueAtTime(Math.max(baseCutoff1 + depth1 * sustain1, 40), time + attack1 + decay1);

    const keytrack2 = filters.filter2.keytrack ?? 0;
    const baseCutoff2 = filters.filter2.cutoff * Math.pow(2, keytrack2 * (midi - 60) / 12);
    const depth2 = filters.filter2.envAmount ?? 0;
    this.filter2.frequency.cancelScheduledValues(time);
    this.filter2.frequency.setValueAtTime(Math.max(baseCutoff2 * 0.6, 30), time);
    this.filter2.frequency.linearRampToValueAtTime(Math.max(baseCutoff2 + depth2 * velocity, 80), time + attack1);

    this.lastTriggerTime = time;
  }
  applyModulation(mod) {
    if (!mod) return;
    const now = this.ctx.currentTime;
    this.modCache = this.modCache || {};
    if (mod.oscA?.morph !== undefined && this.currentState) {
      const tableId = this.currentState.oscillators.oscA.table;
      const morph = clamp(mod.oscA.morph, 0, 1);
      const prev = this.modCache.oscAMorph ?? this.currentState.oscillators.oscA.morph;
      if (Math.abs(prev - morph) > 0.01) {
        const wave = this.wt.getPeriodicWave(tableId, morph);
        if (wave) this.oscA.setPeriodicWave(wave);
        this.modCache.oscAMorph = morph;
      }
    }
    if (mod.oscB?.morph !== undefined && this.currentState) {
      const tableId = this.currentState.oscillators.oscB.table;
      const morph = clamp(mod.oscB.morph, 0, 1);
      const prev = this.modCache.oscBMorph ?? this.currentState.oscillators.oscB.morph;
      if (Math.abs(prev - morph) > 0.01) {
        const wave = this.wt.getPeriodicWave(tableId, morph);
        if (wave) this.oscB.setPeriodicWave(wave);
        this.modCache.oscBMorph = morph;
      }
    }
    if (mod.filter1?.cutoff !== undefined) {
      const value = clamp(mod.filter1.cutoff, 20, 18000);
      if (this.filter1.frequency.setTargetAtTime) {
        this.filter1.frequency.setTargetAtTime(value, now, 0.05);
      } else {
        this.filter1.frequency.linearRampToValueAtTime(value, now + 0.05);
      }
    }
    if (mod.filter2?.cutoff !== undefined) {
      const value = clamp(mod.filter2.cutoff, 20, 18000);
      if (this.filter2.frequency.setTargetAtTime) {
        this.filter2.frequency.setTargetAtTime(value, now, 0.05);
      } else {
        this.filter2.frequency.linearRampToValueAtTime(value, now + 0.05);
      }
    }
    if (mod.sub?.level !== undefined) {
      const level = clamp(mod.sub.level, 0, 1);
      if (this.subGain.gain.setTargetAtTime) {
        this.subGain.gain.setTargetAtTime(level, now, 0.05);
      } else {
        setParam(this.subGain.gain, level, now);
      }
    }
    if (mod.drive !== undefined) {
      const drive = clamp(mod.drive, 0.5, 3);
      if (this.preFilter.gain.setTargetAtTime) {
        this.preFilter.gain.setTargetAtTime(drive, now, 0.05);
      } else {
        setParam(this.preFilter.gain, drive, now);
      }
      this.modCache.drive = drive;
    }
    if (mod.panner !== undefined) {
      const pan = clamp(mod.panner, -1, 1);
      this.panner.pan.setTargetAtTime?.(pan, now, 0.05) ?? this.panner.pan.linearRampToValueAtTime(pan, now + 0.05);
    }
  }

  release(time = this.ctx.currentTime) {
    if (!this.active) return;
    this.ampEnv.release(this.voiceGain.gain, time);
    this.filter1.frequency.cancelScheduledValues(time);
    this.filter1.frequency.linearRampToValueAtTime(Math.max(this.filter1.frequency.value * 0.5, 40), time + this.filtEnv.params.release);
    this.filter2.frequency.cancelScheduledValues(time);
    this.filter2.frequency.linearRampToValueAtTime(Math.max(this.filter2.frequency.value * 0.5, 60), time + this.filtEnv.params.release);
    this.active = false;
  }
  forceStop(time = this.ctx.currentTime) {
    const now = time ?? this.ctx.currentTime;
    this.voiceGain.gain.cancelScheduledValues(now);
    this.voiceGain.gain.setValueAtTime(0.0001, now);
    this.filter1.frequency.cancelScheduledValues(now);
    this.filter2.frequency.cancelScheduledValues(now);
    this.fmGain.gain.cancelScheduledValues(now);
    this.fmGain.gain.setValueAtTime(0, now);
    this.active = false;
  }
}
class SidechainFollower {
  constructor(ctx) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.output.gain.value = 0;
    this.detector = ctx.createAnalyser();
    this.detector.fftSize = 256;
    this.input.connect(this.detector);
    this.data = new Uint8Array(this.detector.fftSize);
    this.value = 0;
    this.target = 0;
    this.amount = 0.4;
    this.attack = 0.02;
    this.release = 0.18;
    this.isRunning = false;
  }
  setAmount(value) {
    this.amount = clamp(value, 0, 1);
  }
  setAttack(value) {
    this.attack = Math.max(value, 0.005);
  }
  setRelease(value) {
    this.release = Math.max(value, 0.02);
  }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const tick = () => {
      if (!this.isRunning) return;
      this.detector.getByteTimeDomainData(this.data);
      let sum = 0;
      for (let i = 0; i < this.data.length; i += 1) {
        const v = (this.data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.data.length);
      const target = clamp(rms * this.amount * 2, 0, 1);
      const coeff = target > this.value ? this.attack : this.release;
      this.value += (target - this.value) * coeff;
      this.output.gain.setValueAtTime(this.value, this.ctx.currentTime);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  stop() {
    this.isRunning = false;
  }
}

class MasterBus {
  constructor(ctx) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.preSaturation = createSoftClipper(ctx, 1.05);
    this.input.connect(this.preSaturation);

    this.masterGain = ctx.createGain();
    this.preSaturation.connect(this.masterGain);

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.05;
    this.masterGain.connect(this.limiter);

    this.output = ctx.createGain();
    this.limiter.connect(this.output);
  }
  connect(node) {
    this.output.connect(node);
  }
  setVolume(value) {
    setParam(this.masterGain.gain, clamp(value, 0, 1), this.ctx.currentTime);
  }
  setCeiling(db) {
    this.limiter.threshold.setValueAtTime(db, this.ctx.currentTime);
  }
}

class FXSection {
  constructor(ctx) {
    this.ctx = ctx;
    this.input = ctx.createGain();

    this.chorusDelay = ctx.createDelay();
    this.chorusDelay.delayTime.value = 0.018;
    this.chorusLFO = ctx.createOscillator();
    this.chorusLFO.frequency.value = 0.8;
    this.chorusDepth = ctx.createGain();
    this.chorusDepth.gain.value = 0.002;
    this.chorusLFO.connect(this.chorusDepth).connect(this.chorusDelay.delayTime);
    this.chorusLFO.start();
    this.chorusWet = ctx.createGain();
    this.chorusWet.gain.value = 0.25;

    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.3;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delayFilters = {
      hp: ctx.createBiquadFilter(),
      lp: ctx.createBiquadFilter()
    };
    this.delayFilters.hp.type = 'highpass';
    this.delayFilters.hp.frequency.value = 200;
    this.delayFilters.lp.type = 'lowpass';
    this.delayFilters.lp.frequency.value = 8000;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.25;

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.buildReverbBuffer();
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0.3;

    this.output = ctx.createGain();
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.7;

    // Routing
    this.input.connect(this.dry).connect(this.output);

    this.input.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusWet).connect(this.output);

    this.input.connect(this.delay);
    this.delay.connect(this.delayFilters.hp).connect(this.delayFilters.lp).connect(this.delayFeedback).connect(this.delay);
    this.delay.connect(this.delayWet).connect(this.output);

    this.input.connect(this.reverb);
    this.reverb.connect(this.reverbWet).connect(this.output);
  }
  buildReverbBuffer(size = 1) {
    const seconds = clamp(1.2 * size, 0.3, 6);
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const decay = Math.pow(1 - i / length, 6);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    return impulse;
  }
  setChorus({ depth, rate }) {
    this.chorusDepth.gain.setValueAtTime(depth * 0.003, this.ctx.currentTime);
    this.chorusLFO.frequency.setValueAtTime(rate, this.ctx.currentTime);
  }
  setDelay({ time, feedback, mix }) {
    this.delay.delayTime.setValueAtTime(time, this.ctx.currentTime);
    this.delayFeedback.gain.setValueAtTime(feedback, this.ctx.currentTime);
    this.delayWet.gain.setValueAtTime(mix, this.ctx.currentTime);
  }
  setDelayFilters({ hp, lp }) {
    this.delayFilters.hp.frequency.setValueAtTime(hp, this.ctx.currentTime);
    this.delayFilters.lp.frequency.setValueAtTime(lp, this.ctx.currentTime);
  }
  setReverb({ size, mix }) {
    this.reverbWet.gain.setValueAtTime(mix, this.ctx.currentTime);
    this.reverb.buffer = this.buildReverbBuffer(size);
  }
}

class ModulationEngine {
  constructor(synth) {
    this.synth = synth;
    this.ctx = synth.ctx;
    this.running = false;
    this.lfoState = [];
    this.lastValues = {};
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.refreshConfig();
    const update = () => {
      if (!this.running) return;
      this.update();
      this.raf = requestAnimationFrame(update);
    };
    update();
  }
  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }
  refreshConfig() {
    const count = this.synth.state?.lfo?.length ?? 0;
    this.lfoState = Array.from({ length: count }, () => ({ shValue: Math.random() * 2 - 1, lastPhase: 0 }));
  }
  shapeValue(shape, phase, state) {
    switch (shape) {
      case 'triangle':
        return 1 - 4 * Math.abs(phase - 0.5);
      case 'sawtooth':
        return 2 * (phase - 0.5);
      case 'square':
        return phase < 0.5 ? 1 : -1;
      case 'sample-hold':
        if (phase < state.lastPhase) {
          state.shValue = Math.random() * 2 - 1;
        }
        state.lastPhase = phase;
        return state.shValue;
      case 'sine':
      default:
        return Math.sin(phase * Math.PI * 2);
    }
  }
  computeLFOValue(index, now) {
    const lfo = this.synth.state.lfo?.[index];
    if (!lfo) return 0;
    const bpm = this.synth.state.global.bpm || 140;
    let rate = Math.max(lfo.rate || 0.1, 0.0001);
    if (lfo.sync) {
      rate = (bpm / 60) * rate;
    }
    const phaseOffset = (lfo.phase ?? 0) % 1;
    const phase = ((now * rate) + phaseOffset) % 1;
    const state = this.lfoState[index] ?? (this.lfoState[index] = { shValue: Math.random() * 2 - 1, lastPhase: 0 });
    let value = this.shapeValue(lfo.shape, phase, state);
    return value;
  }
  resolveSource(source, slot, now) {
    switch (source) {
      case 'LFO1':
        return this.computeLFOValue(0, now);
      case 'LFO2':
        return this.computeLFOValue(1, now);
      case 'LFO3':
        return this.computeLFOValue(2, now);
      case 'MODENV': {
        const value = this.synth.computeModEnvelopeValue?.(now) ?? 0;
        return value * 2 - 1;
      }
      case 'Keytrack': {
        const note = this.synth.lastNote ?? 60;
        return clamp((note - 60) / 24, -1, 1);
      }
      case 'Velocity':
        return clamp((this.synth.lastVelocity ?? 0.8) * 2 - 1, -1, 1);
      case 'Aftertouch':
        return clamp((this.synth.aftertouch ?? 0) * 2 - 1, -1, 1);
      case 'EnvelopeFollower':
        return clamp((this.synth.sidechainFollower?.value ?? 0) * 2 - 1, -1, 1);
      case 'Random':
        if (slot) {
          if (slot.randomValue === undefined) slot.randomValue = this.synth.prng.next() * 2 - 1;
          return slot.randomValue;
        }
        return this.synth.prng.next() * 2 - 1;
      default:
        return 0;
    }
  }
  update() {
    if (!this.synth.initialised) return;
    const state = this.synth.state;
    if (!state) return;
    const now = this.ctx.currentTime;
    const targets = {};
    (state.modMatrix || []).forEach((slot) => {
      if (!slot || slot.amount === 0) return;
      if (!slot.destination || !slot.source) return;
      const sourceValue = this.resolveSource(slot.source, slot, now);
      if (sourceValue === null || Number.isNaN(sourceValue)) return;
      const contribution = sourceValue * (slot.amount ?? 0);
      if (!targets[slot.destination]) targets[slot.destination] = 0;
      targets[slot.destination] += contribution;
    });
    this.applyTargets(targets);
  }
  applyTargets(targets) {
    const state = this.synth.state;
    Object.entries(targets).forEach(([dest, modValue]) => {
      const config = MOD_TARGET_CONFIG[dest];
      if (!config) return;
      const base = config.base(state);
      const scaled = base + modValue * (config.scale ?? 1);
      const value = clamp(scaled, config.min ?? -Infinity, config.max ?? Infinity);
      if (Number.isNaN(value)) return;
      if (Math.abs((this.lastValues[dest] ?? base) - value) < 1e-3) return;
      config.apply(this.synth, value);
      this.lastValues[dest] = value;
    });
  }
}

class DrumBus {
  constructor(ctx, tempoProvider) {
    this.ctx = ctx;
    this.tempoProvider = tempoProvider;
    this.output = ctx.createGain();
    this.output.gain.value = 0.08;
    this.lookahead = 0.1;
    this.scheduleAhead = 0.2;
    this.nextTime = 0;
    this.currentStep = 0;
    this.timer = null;
    this.isRunning = false;
    this.muted = false;
    this.noiseBuffer = this.buildNoiseBuffer();
  }
  buildNoiseBuffer() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.nextTime = this.ctx.currentTime;
    this.scheduler();
  }
  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
  }
  setMuted(muted) {
    this.muted = muted;
    const target = muted ? 0.0001 : 0.08;
    this.output.gain.setTargetAtTime?.(target, this.ctx.currentTime, 0.05) ?? this.output.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.05);
  }
  scheduler() {
    if (!this.isRunning) return;
    const now = this.ctx.currentTime;
    const bpm = this.tempoProvider();
    const beat = 60 / (bpm || 120);
    while (this.nextTime < now + this.scheduleAhead) {
      const step = this.currentStep % 8;
      if (step % 4 === 0) this.scheduleKick(this.nextTime);
      if (step % 4 === 2) this.scheduleSnare(this.nextTime);
      this.scheduleHat(this.nextTime);
      this.nextTime += beat / 2;
      this.currentStep += 1;
    }
    this.timer = setTimeout(() => this.scheduler(), this.lookahead * 1000);
  }
  scheduleKick(time) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.25);
    osc.connect(gain).connect(this.output);
    osc.start(time);
    osc.stop(time + 0.26);
  }
  scheduleSnare(time) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(filter).connect(gain).connect(this.output);
    noise.start(time);
    noise.stop(time + 0.2);
  }
  scheduleHat(time) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    noise.connect(hp).connect(gain).connect(this.output);
    noise.start(time);
    noise.stop(time + 0.1);
  }
}

class PresetManager {
  constructor() {
    this.presets = new Map();
    this.loadFactory();
  }
  loadFactory() {
    this.presets.set('Deep Liquid Bass', {
      meta: { author: 'Mothy G', genre: 'Liquid Roller' },
      global: { bpm: 140, swing: 8, key: 'C', masterVolume: 0.82, limiterCeiling: -0.8, quality: 1 },
      oscillators: {
        oscA: { table: 'smoothSaw', morph: 0.25, tune: -12, fine: -0.04, level: 0.72, pan: 0, phase: 0 },
        oscB: { table: 'reeseBlend', morph: 0.45, tune: 0, fine: 0.03, level: 0.42, pan: 0, phase: 0 }
      },
      sub: { level: 0.85, squareBlend: 0.18, saturation: 0.3, legato: true },
      fm: { ratio: 2, index: 0.12, attack: 0.01, decay: 0.18, velocityToIndex: 0.1 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 120, resonance: 0.6, envAmount: 160, drive: 1.1, keytrack: 0.4 },
        filter2: { type: 'bandpass', cutoff: 420, resonance: 0.8, envAmount: 60, drive: 1.05, keytrack: 0.25 },
        routing: { serial: true, mix: 0.75 }
      },
      envelopes: {
        amp: { attack: 0.01, decay: 0.18, sustain: 0.78, release: 0.33, curve: 1.2 },
        filter: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4, curve: 1.4 },
        mod: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.2, curve: 1 }
      },
      lfo: [
        { shape: 'sine', rate: 0.18, sync: true, amount: 0.35, destination: 'oscB.morph', phase: 0 },
        { shape: 'triangle', rate: 0.5, sync: true, amount: 0.18, destination: 'filter2.cutoff', phase: 0.25 },
        { shape: 'sample-hold', rate: 4, sync: false, amount: 0.12, destination: 'drive', phase: 0 }
      ],
      fx: {
        chorus: { depth: 0.18, rate: 0.7 },
        delay: { time: 0.34, feedback: 0.24, mix: 0.25, pingPong: false },
        reverb: { size: 1, mix: 0.28 }
      },
      sidechain: { source: 'internal', amount: 0.32, attack: 0.05, release: 0.28 },
      transient: { attack: 1.12, sustain: 0.9 },
      modMatrix: [
        { source: 'LFO1', amount: 0.4, destination: 'oscB.morph' },
        { source: 'EnvelopeFollower', amount: -0.22, destination: 'sub.level' }
      ]
    });

    this.presets.set('Dark Tech Roller', {
      meta: { author: 'Mothy G', vibe: 'Tech Roller' },
      global: { bpm: 140, swing: 12, key: 'C', masterVolume: 0.78, limiterCeiling: -1.2, quality: 1 },
      oscillators: {
        oscA: { table: 'reeseBlend', morph: 0.7, tune: 0, fine: 0.08, level: 0.74, pan: -0.1, phase: 0 },
        oscB: { table: 'grittySaw', morph: 0.62, tune: 0, fine: -0.08, level: 0.57, pan: 0.1, phase: 0 }
      },
      sub: { level: 0.6, squareBlend: 0.05, saturation: 0.45, legato: true },
      fm: { ratio: 1.5, index: 0.2, attack: 0.015, decay: 0.14, velocityToIndex: 0.08 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 180, resonance: 0.5, envAmount: 110, drive: 1.2, keytrack: 0.5 },
        filter2: { type: 'bandpass', cutoff: 620, resonance: 1.2, envAmount: 90, drive: 1.1, keytrack: 0.3 },
        routing: { serial: true, mix: 0.9 }
      },
      envelopes: {
        amp: { attack: 0.006, decay: 0.14, sustain: 0.55, release: 0.28, curve: 1.1 },
        filter: { attack: 0.01, decay: 0.22, sustain: 0.45, release: 0.32, curve: 1.35 },
        mod: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.18, curve: 1 }
      },
      lfo: [
        { shape: 'triangle', rate: 0.25, sync: true, amount: 0.5, destination: 'filter2.cutoff', phase: 0 },
        { shape: 'sine', rate: 0.5, sync: true, amount: 0.2, destination: 'oscA.morph', phase: 0.5 }
      ],
      fx: {
        chorus: { depth: 0.12, rate: 0.5 },
        delay: { time: 0.24, feedback: 0.2, mix: 0.18, pingPong: true },
        reverb: { size: 1, mix: 0.12 }
      },
      sidechain: { source: 'internal', amount: 0.22, attack: 0.04, release: 0.24 },
      transient: { attack: 1.05, sustain: 0.8 },
      modMatrix: [
        { source: 'LFO1', amount: 0.34, destination: 'filter2.cutoff' },
        { source: 'MODENV', amount: 0.4, destination: 'fm.index' }
      ]
    });

    this.presets.set('Rolling Pluck', {
      meta: { author: 'Mothy G', vibe: 'Rolling Pluck' },
      global: { bpm: 140, swing: 16, key: 'C', masterVolume: 0.76, limiterCeiling: -1, quality: 1 },
      oscillators: {
        oscA: { table: 'smoothSaw', morph: 0.3, tune: 0, fine: 0, level: 0.62, pan: 0, phase: 0 },
        oscB: { table: 'airyBlend', morph: 0.2, tune: 7, fine: 0.04, level: 0.45, pan: 0, phase: 0 }
      },
      sub: { level: 0.45, squareBlend: 0.05, saturation: 0.2, legato: false },
      fm: { ratio: 3, index: 0.45, attack: 0.004, decay: 0.09, velocityToIndex: 0.12 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 680, resonance: 0.6, envAmount: 340, drive: 1.05, keytrack: 0.35 },
        filter2: { type: 'bandpass', cutoff: 1400, resonance: 0.9, envAmount: 120, drive: 1.08, keytrack: 0.2 },
        routing: { serial: false, mix: 0.6 }
      },
      envelopes: {
        amp: { attack: 0.003, decay: 0.18, sustain: 0.32, release: 0.28, curve: 1.1 },
        filter: { attack: 0.004, decay: 0.22, sustain: 0.0, release: 0.18, curve: 1.3 },
        mod: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.18, curve: 1 }
      },
      lfo: [
        { shape: 'sine', rate: 2, sync: true, amount: 0.14, destination: 'delay.mix', phase: 0 },
        { shape: 'triangle', rate: 0.5, sync: true, amount: 0.18, destination: 'oscA.morph', phase: 0.25 }
      ],
      fx: {
        chorus: { depth: 0.25, rate: 0.8 },
        delay: { time: 0.5, feedback: 0.36, mix: 0.32, pingPong: true },
        reverb: { size: 1, mix: 0.22 }
      },
      sidechain: { source: 'internal', amount: 0.18, attack: 0.03, release: 0.22 },
      transient: { attack: 1.2, sustain: 0.7 },
      modMatrix: [
        { source: 'MODENV', amount: 0.6, destination: 'fm.index' }
      ]
    });

    this.presets.set('Air Pad', {
      meta: { author: 'Mothy G', vibe: 'Air Pad' },
      global: { bpm: 140, swing: 10, key: 'C', masterVolume: 0.8, limiterCeiling: -1.4, quality: 2 },
      oscillators: {
        oscA: { table: 'airyBlend', morph: 0.6, tune: -12, fine: 0.01, level: 0.58, pan: -0.2, phase: 0 },
        oscB: { table: 'hollowPulse', morph: 0.75, tune: 0, fine: -0.01, level: 0.6, pan: 0.2, phase: 0 }
      },
      sub: { level: 0.25, squareBlend: 0, saturation: 0.1, legato: true },
      fm: { ratio: 2, index: 0.08, attack: 0.2, decay: 0.9, velocityToIndex: 0.05 },
      filters: {
        filter1: { type: 'highpass', cutoff: 200, resonance: 0.4, envAmount: 80, drive: 1.02, keytrack: 0.2 },
        filter2: { type: 'lowpass', cutoff: 1600, resonance: 0.4, envAmount: 120, drive: 1.05, keytrack: 0.3 },
        routing: { serial: false, mix: 0.5 }
      },
      envelopes: {
        amp: { attack: 0.6, decay: 0.3, sustain: 0.9, release: 1.8, curve: 1.1 },
        filter: { attack: 0.48, decay: 0.4, sustain: 0.6, release: 1.2, curve: 1.2 },
        mod: { attack: 0.4, decay: 0.8, sustain: 0.5, release: 0.8, curve: 1 }
      },
      lfo: [
        { shape: 'sine', rate: 0.08, sync: true, amount: 0.4, destination: 'oscA.morph', phase: 0 },
        { shape: 'triangle', rate: 0.12, sync: true, amount: 0.28, destination: 'filter2.cutoff', phase: 0.1 }
      ],
      fx: {
        chorus: { depth: 0.35, rate: 0.4 },
        delay: { time: 0.4, feedback: 0.22, mix: 0.25, pingPong: true },
        reverb: { size: 1.2, mix: 0.45 }
      },
      sidechain: { source: 'internal', amount: 0.15, attack: 0.06, release: 0.4 },
      transient: { attack: 1.05, sustain: 1.1 },
      modMatrix: [
        { source: 'LFO1', amount: 0.28, destination: 'oscB.morph' },
        { source: 'Keytrack', amount: 0.4, destination: 'filter1.cutoff' }
      ]
    });

    this.presets.set('Nebula Drift', {
      meta: { author: 'Mothy G', vibe: 'Ethereal Drone' },
      global: { bpm: 120, swing: 4, key: 'C', masterVolume: 0.78, limiterCeiling: -1.5, quality: 2 },
      oscillators: {
        oscA: { table: 'mellowTriangle', morph: 0.54, tune: -12, fine: -0.02, level: 0.68, pan: -0.18, phase: 0 },
        oscB: { table: 'airyBlend', morph: 0.7, tune: 0, fine: 0.02, level: 0.6, pan: 0.18, phase: 0 }
      },
      sub: { level: 0.5, squareBlend: 0.2, saturation: 0.22, legato: true },
      fm: { ratio: 1.25, index: 0.14, attack: 0.35, decay: 1.1, velocityToIndex: 0.05 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 320, resonance: 0.7, envAmount: 160, drive: 1.05, keytrack: 0.25 },
        filter2: { type: 'bandpass', cutoff: 820, resonance: 0.6, envAmount: 90, drive: 1.02, keytrack: 0.35 },
        routing: { serial: false, mix: 0.52 }
      },
      envelopes: {
        amp: { attack: 0.5, decay: 0.6, sustain: 0.94, release: 2.8, curve: 1.05 },
        filter: { attack: 0.7, decay: 0.8, sustain: 0.6, release: 2.1, curve: 1.25 },
        mod: { attack: 0.4, decay: 1, sustain: 0.55, release: 1.6, curve: 1 }
      },
      lfo: [
        { shape: 'sine', rate: 0.06, sync: true, amount: 0.48, destination: 'oscA.morph', phase: 0 },
        { shape: 'triangle', rate: 0.08, sync: true, amount: 0.36, destination: 'filter2.cutoff', phase: 0.25 },
        { shape: 'sample-hold', rate: 0.35, sync: false, amount: 0.18, destination: 'delay.mix', phase: 0 }
      ],
      fx: {
        chorus: { depth: 0.34, rate: 0.25 },
        delay: { time: 0.58, feedback: 0.4, mix: 0.32, pingPong: true },
        reverb: { size: 1.5, mix: 0.52 }
      },
      sidechain: { source: 'internal', amount: 0.1, attack: 0.08, release: 0.5 },
      transient: { attack: 1.08, sustain: 1.25 },
      modMatrix: [
        { source: 'LFO1', amount: 0.32, destination: 'filter1.cutoff' },
        { source: 'LFO2', amount: 0.28, destination: 'oscB.morph' }
      ]
    });

    this.presets.set('Solar Bloom', {
      meta: { author: 'Mothy G', vibe: 'Radiant Drone' },
      global: { bpm: 128, swing: 6, key: 'E', masterVolume: 0.82, limiterCeiling: -1, quality: 1 },
      oscillators: {
        oscA: { table: 'smoothSaw', morph: 0.45, tune: 0, fine: 0.03, level: 0.74, pan: -0.1, phase: 0 },
        oscB: { table: 'metallicFm', morph: 0.58, tune: 7, fine: -0.02, level: 0.56, pan: 0.1, phase: 0 }
      },
      sub: { level: 0.38, squareBlend: 0.12, saturation: 0.28, legato: false },
      fm: { ratio: 2.5, index: 0.38, attack: 0.06, decay: 0.32, velocityToIndex: 0.15 },
      filters: {
        filter1: { type: 'bandpass', cutoff: 740, resonance: 0.9, envAmount: 260, drive: 1.18, keytrack: 0.4 },
        filter2: { type: 'highpass', cutoff: 220, resonance: 0.5, envAmount: 70, drive: 1.08, keytrack: 0.2 },
        routing: { serial: true, mix: 0.65 }
      },
      envelopes: {
        amp: { attack: 0.08, decay: 0.4, sustain: 0.78, release: 0.85, curve: 1.12 },
        filter: { attack: 0.12, decay: 0.6, sustain: 0.5, release: 0.9, curve: 1.2 },
        mod: { attack: 0.05, decay: 0.45, sustain: 0.2, release: 0.5, curve: 1.05 }
      },
      lfo: [
        { shape: 'sawtooth', rate: 0.18, sync: true, amount: 0.42, destination: 'oscB.morph', phase: 0 },
        { shape: 'square', rate: 0.12, sync: true, amount: 0.24, destination: 'reverb.mix', phase: 0.5 },
        { shape: 'triangle', rate: 0.3, sync: false, amount: 0.18, destination: 'delay.mix', phase: 0.15 }
      ],
      fx: {
        chorus: { depth: 0.22, rate: 0.65 },
        delay: { time: 0.38, feedback: 0.3, mix: 0.28, pingPong: true },
        reverb: { size: 1.1, mix: 0.36 }
      },
      sidechain: { source: 'internal', amount: 0.2, attack: 0.04, release: 0.26 },
      transient: { attack: 1.05, sustain: 0.88 },
      modMatrix: [
        { source: 'MODENV', amount: 0.4, destination: 'fm.index' },
        { source: 'LFO3', amount: 0.24, destination: 'panner' }
      ]
    });

    this.presets.set('Iron Glacier', {
      meta: { author: 'Mothy G', vibe: 'Frozen Drone' },
      global: { bpm: 110, swing: 2, key: 'D', masterVolume: 0.74, limiterCeiling: -1.8, quality: 2 },
      oscillators: {
        oscA: { table: 'grittySaw', morph: 0.68, tune: -12, fine: -0.06, level: 0.7, pan: -0.15, phase: 0 },
        oscB: { table: 'metallicFm', morph: 0.52, tune: 0, fine: 0.07, level: 0.58, pan: 0.15, phase: 0 }
      },
      sub: { level: 0.42, squareBlend: 0.08, saturation: 0.35, legato: true },
      fm: { ratio: 3.5, index: 0.28, attack: 0.12, decay: 0.5, velocityToIndex: 0.1 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 280, resonance: 0.85, envAmount: 200, drive: 1.25, keytrack: 0.3 },
        filter2: { type: 'bandpass', cutoff: 980, resonance: 1.1, envAmount: 120, drive: 1.15, keytrack: 0.4 },
        routing: { serial: true, mix: 0.8 }
      },
      envelopes: {
        amp: { attack: 0.18, decay: 0.5, sustain: 0.7, release: 1.4, curve: 1.15 },
        filter: { attack: 0.22, decay: 0.65, sustain: 0.45, release: 1.1, curve: 1.28 },
        mod: { attack: 0.15, decay: 0.58, sustain: 0.1, release: 0.6, curve: 1.1 }
      },
      lfo: [
        { shape: 'square', rate: 0.22, sync: true, amount: 0.3, destination: 'filter1.cutoff', phase: 0.5 },
        { shape: 'sine', rate: 0.04, sync: false, amount: 0.45, destination: 'oscA.morph', phase: 0 },
        { shape: 'sample-hold', rate: 0.6, sync: false, amount: 0.22, destination: 'drive', phase: 0.1 }
      ],
      fx: {
        chorus: { depth: 0.18, rate: 0.45 },
        delay: { time: 0.42, feedback: 0.34, mix: 0.22, pingPong: false },
        reverb: { size: 1.2, mix: 0.4 }
      },
      sidechain: { source: 'internal', amount: 0.18, attack: 0.05, release: 0.32 },
      transient: { attack: 1.18, sustain: 0.95 },
      modMatrix: [
        { source: 'LFO2', amount: 0.28, destination: 'oscB.morph' },
        { source: 'LFO3', amount: 0.24, destination: 'filter2.cutoff' }
      ]
    });

    this.presets.set('Deep Current', {
      meta: { author: 'Mothy G', vibe: 'Tidal Drone' },
      global: { bpm: 168, swing: 14, key: 'A', masterVolume: 0.8, limiterCeiling: -0.9, quality: 1 },
      oscillators: {
        oscA: { table: 'reeseBlend', morph: 0.62, tune: -12, fine: -0.03, level: 0.76, pan: -0.1, phase: 0 },
        oscB: { table: 'smoothSaw', morph: 0.38, tune: 0, fine: 0.04, level: 0.58, pan: 0.1, phase: 0 }
      },
      sub: { level: 0.88, squareBlend: 0.22, saturation: 0.4, legato: true },
      fm: { ratio: 1.75, index: 0.24, attack: 0.08, decay: 0.42, velocityToIndex: 0.12 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 220, resonance: 0.7, envAmount: 220, drive: 1.22, keytrack: 0.45 },
        filter2: { type: 'bandpass', cutoff: 520, resonance: 0.9, envAmount: 80, drive: 1.1, keytrack: 0.28 },
        routing: { serial: true, mix: 0.72 }
      },
      envelopes: {
        amp: { attack: 0.02, decay: 0.32, sustain: 0.65, release: 0.85, curve: 1.1 },
        filter: { attack: 0.04, decay: 0.5, sustain: 0.25, release: 0.65, curve: 1.25 },
        mod: { attack: 0.03, decay: 0.4, sustain: 0.12, release: 0.55, curve: 1.05 }
      },
      lfo: [
        { shape: 'sine', rate: 0.16, sync: true, amount: 0.42, destination: 'sub.level', phase: 0 },
        { shape: 'triangle', rate: 0.35, sync: false, amount: 0.3, destination: 'filter1.cutoff', phase: 0.2 },
        { shape: 'square', rate: 0.08, sync: true, amount: 0.24, destination: 'delay.mix', phase: 0.75 }
      ],
      fx: {
        chorus: { depth: 0.26, rate: 0.55 },
        delay: { time: 0.36, feedback: 0.38, mix: 0.28, pingPong: true },
        reverb: { size: 1, mix: 0.24 }
      },
      sidechain: { source: 'internal', amount: 0.3, attack: 0.03, release: 0.28 },
      transient: { attack: 1.25, sustain: 0.8 },
      modMatrix: [
        { source: 'LFO1', amount: 0.36, destination: 'sub.level' },
        { source: 'EnvelopeFollower', amount: -0.28, destination: 'filter2.cutoff' }
      ]
    });

    this.presets.set('Aurora Veil', {
      meta: { author: 'Mothy G', vibe: 'Shimmer Drone' },
      global: { bpm: 100, swing: 8, key: 'G', masterVolume: 0.77, limiterCeiling: -1.2, quality: 2 },
      oscillators: {
        oscA: { table: 'airyBlend', morph: 0.68, tune: -7, fine: 0.01, level: 0.6, pan: -0.25, phase: 0 },
        oscB: { table: 'hollowPulse', morph: 0.55, tune: 0, fine: -0.02, level: 0.57, pan: 0.25, phase: 0 }
      },
      sub: { level: 0.36, squareBlend: 0.08, saturation: 0.18, legato: true },
      fm: { ratio: 2.25, index: 0.1, attack: 0.4, decay: 1.5, velocityToIndex: 0.05 },
      filters: {
        filter1: { type: 'bandpass', cutoff: 520, resonance: 0.5, envAmount: 140, drive: 1.02, keytrack: 0.2 },
        filter2: { type: 'lowpass', cutoff: 1800, resonance: 0.5, envAmount: 180, drive: 1.04, keytrack: 0.35 },
        routing: { serial: false, mix: 0.48 }
      },
      envelopes: {
        amp: { attack: 0.75, decay: 0.6, sustain: 0.95, release: 3.4, curve: 1.05 },
        filter: { attack: 0.88, decay: 0.8, sustain: 0.65, release: 2.4, curve: 1.25 },
        mod: { attack: 0.5, decay: 1, sustain: 0.5, release: 1.8, curve: 1 }
      },
      lfo: [
        { shape: 'sine', rate: 0.04, sync: false, amount: 0.46, destination: 'oscB.morph', phase: 0 },
        { shape: 'triangle', rate: 0.06, sync: true, amount: 0.34, destination: 'filter2.cutoff', phase: 0.3 },
        { shape: 'square', rate: 0.1, sync: true, amount: 0.2, destination: 'reverb.mix', phase: 0.5 }
      ],
      fx: {
        chorus: { depth: 0.38, rate: 0.3 },
        delay: { time: 0.62, feedback: 0.4, mix: 0.35, pingPong: true },
        reverb: { size: 1.6, mix: 0.58 }
      },
      sidechain: { source: 'internal', amount: 0.12, attack: 0.07, release: 0.5 },
      transient: { attack: 1.07, sustain: 1.3 },
      modMatrix: [
        { source: 'LFO2', amount: 0.26, destination: 'oscA.morph' },
        { source: 'LFO3', amount: 0.22, destination: 'panner' }
      ]
    });

    this.presets.set('Voltage Shrine', {
      meta: { author: 'Mothy G', vibe: 'Edge Drone' },
      global: { bpm: 140, swing: 10, key: 'F', masterVolume: 0.79, limiterCeiling: -1.1, quality: 1 },
      oscillators: {
        oscA: { table: 'smoothSaw', morph: 0.58, tune: 0, fine: 0.05, level: 0.72, pan: -0.18, phase: 0 },
        oscB: { table: 'grittySaw', morph: 0.4, tune: 12, fine: -0.03, level: 0.52, pan: 0.18, phase: 0 }
      },
      sub: { level: 0.52, squareBlend: 0.18, saturation: 0.32, legato: false },
      fm: { ratio: 2.8, index: 0.34, attack: 0.03, decay: 0.28, velocityToIndex: 0.18 },
      filters: {
        filter1: { type: 'highpass', cutoff: 180, resonance: 0.6, envAmount: 130, drive: 1.2, keytrack: 0.3 },
        filter2: { type: 'bandpass', cutoff: 960, resonance: 1.05, envAmount: 150, drive: 1.18, keytrack: 0.4 },
        routing: { serial: true, mix: 0.68 }
      },
      envelopes: {
        amp: { attack: 0.06, decay: 0.48, sustain: 0.66, release: 0.9, curve: 1.15 },
        filter: { attack: 0.08, decay: 0.6, sustain: 0.35, release: 0.85, curve: 1.3 },
        mod: { attack: 0.04, decay: 0.5, sustain: 0.18, release: 0.55, curve: 1.1 }
      },
      lfo: [
        { shape: 'sawtooth', rate: 0.24, sync: true, amount: 0.36, destination: 'oscA.morph', phase: 0.25 },
        { shape: 'sine', rate: 0.14, sync: true, amount: 0.28, destination: 'filter2.cutoff', phase: 0.4 },
        { shape: 'sample-hold', rate: 0.8, sync: false, amount: 0.18, destination: 'drive', phase: 0 }
      ],
      fx: {
        chorus: { depth: 0.2, rate: 0.7 },
        delay: { time: 0.3, feedback: 0.36, mix: 0.26, pingPong: false },
        reverb: { size: 1.05, mix: 0.3 }
      },
      sidechain: { source: 'internal', amount: 0.25, attack: 0.03, release: 0.24 },
      transient: { attack: 1.2, sustain: 0.78 },
      modMatrix: [
        { source: 'LFO1', amount: 0.32, destination: 'filter1.cutoff' },
        { source: 'MODENV', amount: 0.42, destination: 'fm.index' }
      ]
    });

    this.presets.set('Pulse Gate Reese', {
      meta: { author: 'Mothy G', vibe: 'Gated Roller' },
      global: { bpm: 140, swing: 14, key: 'D', masterVolume: 0.78, limiterCeiling: -1, quality: 1 },
      oscillators: {
        oscA: { table: 'reeseBlend', morph: 0.68, tune: -12, fine: -0.06, level: 0.76, pan: -0.1, phase: 0 },
        oscB: { table: 'grittySaw', morph: 0.52, tune: 0, fine: 0.07, level: 0.58, pan: 0.1, phase: 0 }
      },
      sub: { level: 0.82, squareBlend: 0.15, saturation: 0.45, legato: true },
      fm: { ratio: 2.2, index: 0.2, attack: 0.015, decay: 0.22, velocityToIndex: 0.12 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 160, resonance: 0.6, envAmount: 200, drive: 1.25, keytrack: 0.5 },
        filter2: { type: 'bandpass', cutoff: 420, resonance: 1.05, envAmount: 110, drive: 1.12, keytrack: 0.32 },
        routing: { serial: true, mix: 0.85 }
      },
      envelopes: {
        amp: { attack: 0.008, decay: 0.22, sustain: 0.58, release: 0.34, curve: 1.18 },
        filter: { attack: 0.012, decay: 0.28, sustain: 0.4, release: 0.38, curve: 1.35 },
        mod: { attack: 0.01, decay: 0.18, sustain: 0.15, release: 0.22, curve: 1.12 }
      },
      lfo: [
        { shape: 'square', rate: 1, sync: true, amount: 1, destination: 'master.volume', phase: 0 },
        { shape: 'triangle', rate: 0.5, sync: true, amount: 0.32, destination: 'filter2.cutoff', phase: 0.25 },
        { shape: 'sine', rate: 0.12, sync: false, amount: 0.22, destination: 'reverb.mix', phase: 0.4 }
      ],
      fx: {
        chorus: { depth: 0.24, rate: 0.6 },
        delay: { time: 0.26, feedback: 0.36, mix: 0.28, pingPong: true },
        reverb: { size: 1.1, mix: 0.34 }
      },
      sidechain: { source: 'internal', amount: 0.2, attack: 0.03, release: 0.22 },
      transient: { attack: 1.22, sustain: 0.8 },
      modMatrix: [
        { source: 'LFO1', amount: 1, destination: 'master.volume' },
        { source: 'LFO2', amount: 0.36, destination: 'filter2.cutoff' },
        { source: 'MODENV', amount: 0.28, destination: 'drive' }
      ]
    });

    this.presets.set('Strobe Bloom', {
      meta: { author: 'Mothy G', vibe: 'Chopped Pad' },
      global: { bpm: 140, swing: 6, key: 'A', masterVolume: 0.72, limiterCeiling: -1.3, quality: 2 },
      oscillators: {
        oscA: { table: 'airyBlend', morph: 0.62, tune: -7, fine: -0.01, level: 0.58, pan: -0.2, phase: 0 },
        oscB: { table: 'hollowPulse', morph: 0.48, tune: 0, fine: 0.02, level: 0.55, pan: 0.2, phase: 0 }
      },
      sub: { level: 0.42, squareBlend: 0.08, saturation: 0.25, legato: true },
      fm: { ratio: 2.6, index: 0.12, attack: 0.05, decay: 0.6, velocityToIndex: 0.06 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 420, resonance: 0.4, envAmount: 160, drive: 1.04, keytrack: 0.25 },
        filter2: { type: 'bandpass', cutoff: 980, resonance: 0.8, envAmount: 120, drive: 1.02, keytrack: 0.22 },
        routing: { serial: false, mix: 0.52 }
      },
      envelopes: {
        amp: { attack: 0.38, decay: 0.5, sustain: 0.88, release: 1.8, curve: 1.05 },
        filter: { attack: 0.42, decay: 0.6, sustain: 0.6, release: 1.6, curve: 1.2 },
        mod: { attack: 0.24, decay: 0.5, sustain: 0.34, release: 0.9, curve: 1.1 }
      },
      lfo: [
        { shape: 'square', rate: 0.5, sync: true, amount: 1, destination: 'master.volume', phase: 0 },
        { shape: 'sine', rate: 0.08, sync: false, amount: 0.3, destination: 'filter1.cutoff', phase: 0.5 },
        { shape: 'triangle', rate: 0.15, sync: true, amount: 0.24, destination: 'reverb.mix', phase: 0.35 }
      ],
      fx: {
        chorus: { depth: 0.32, rate: 0.45 },
        delay: { time: 0.48, feedback: 0.42, mix: 0.3, pingPong: true },
        reverb: { size: 1.8, mix: 0.6 }
      },
      sidechain: { source: 'internal', amount: 0.16, attack: 0.04, release: 0.3 },
      transient: { attack: 1.05, sustain: 1.25 },
      modMatrix: [
        { source: 'LFO1', amount: 1, destination: 'master.volume' },
        { source: 'LFO2', amount: 0.32, destination: 'filter1.cutoff' },
        { source: 'EnvelopeFollower', amount: -0.18, destination: 'reverb.mix' }
      ]
    });

    this.presets.set('Stepper Pluck', {
      meta: { author: 'Mothy G', vibe: 'Rhythmic Pluck' },
      global: { bpm: 140, swing: 12, key: 'E', masterVolume: 0.76, limiterCeiling: -0.9, quality: 1 },
      oscillators: {
        oscA: { table: 'smoothSaw', morph: 0.35, tune: 0, fine: 0.02, level: 0.64, pan: -0.05, phase: 0 },
        oscB: { table: 'metallicFm', morph: 0.28, tune: 7, fine: -0.04, level: 0.48, pan: 0.05, phase: 0 }
      },
      sub: { level: 0.4, squareBlend: 0.12, saturation: 0.3, legato: false },
      fm: { ratio: 3.5, index: 0.38, attack: 0.005, decay: 0.12, velocityToIndex: 0.14 },
      filters: {
        filter1: { type: 'lowpass', cutoff: 640, resonance: 0.7, envAmount: 360, drive: 1.1, keytrack: 0.3 },
        filter2: { type: 'bandpass', cutoff: 1300, resonance: 0.92, envAmount: 160, drive: 1.06, keytrack: 0.22 },
        routing: { serial: true, mix: 0.68 }
      },
      envelopes: {
        amp: { attack: 0.003, decay: 0.18, sustain: 0.28, release: 0.24, curve: 1.12 },
        filter: { attack: 0.004, decay: 0.2, sustain: 0.18, release: 0.28, curve: 1.25 },
        mod: { attack: 0.004, decay: 0.18, sustain: 0.1, release: 0.24, curve: 1.1 }
      },
      lfo: [
        { shape: 'square', rate: 2, sync: true, amount: 1, destination: 'master.volume', phase: 0 },
        { shape: 'triangle', rate: 0.25, sync: true, amount: 0.3, destination: 'filter2.cutoff', phase: 0.2 },
        { shape: 'sawtooth', rate: 0.75, sync: true, amount: 0.18, destination: 'oscB.morph', phase: 0.1 }
      ],
      fx: {
        chorus: { depth: 0.18, rate: 0.7 },
        delay: { time: 0.22, feedback: 0.28, mix: 0.24, pingPong: false },
        reverb: { size: 1, mix: 0.18 }
      },
      sidechain: { source: 'internal', amount: 0.2, attack: 0.02, release: 0.2 },
      transient: { attack: 1.28, sustain: 0.74 },
      modMatrix: [
        { source: 'LFO1', amount: 1, destination: 'master.volume' },
        { source: 'LFO2', amount: 0.34, destination: 'filter2.cutoff' },
        { source: 'Velocity', amount: 0.22, destination: 'drive' }
      ]
    });
  }
  get(name) {
    return this.presets.get(name);
  }
  list() {
    return Array.from(this.presets.keys());
  }
}

function createDefaultState() {
  return {
    meta: { name: 'Init', author: 'You' },
    ui: { showTooltips: true },
    global: {
      bpm: 140,
      swing: 0,
      key: 'C',
      masterVolume: 0.8,
      limiterCeiling: -0.5,
      quality: 1
    },
    oscillators: {
      oscA: { table: 'smoothSaw', morph: 0.3, tune: 0, fine: 0, level: 0.7, pan: -0.05, phase: 0 },
      oscB: { table: 'airyBlend', morph: 0.2, tune: 0, fine: 0, level: 0.5, pan: 0.05, phase: 0 }
    },
    sub: { level: 0.8, squareBlend: 0.1, saturation: 0.25, legato: true },
    fm: { ratio: 2, index: 0.2, attack: 0.01, decay: 0.18, velocityToIndex: 0.1 },
    filters: {
      filter1: { type: 'lowpass', cutoff: 220, resonance: 0.7, envAmount: 180, drive: 1.08, keytrack: 0.4 },
      filter2: { type: 'bandpass', cutoff: 520, resonance: 0.6, envAmount: 70, drive: 1.05, keytrack: 0.25 },
      routing: { serial: true, mix: 0.7 }
    },
    envelopes: {
      amp: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4, curve: 1.1 },
      filter: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4, curve: 1.3 },
      mod: { attack: 0.01, decay: 0.22, sustain: 0.1, release: 0.3, curve: 1.1 }
    },
    lfo: [
      { shape: 'sine', rate: 0.3, sync: true, amount: 0.2, destination: 'filter1.cutoff', phase: 0 },
      { shape: 'triangle', rate: 0.5, sync: true, amount: 0.15, destination: 'oscA.morph', phase: 0.5 },
      { shape: 'sawtooth', rate: 0.75, sync: true, amount: 0.12, destination: 'delay.mix', phase: 0 }
    ],
    fx: {
      chorus: { depth: 0.2, rate: 0.6 },
      delay: { time: 0.32, feedback: 0.24, mix: 0.2, pingPong: false },
      reverb: { size: 1, mix: 0.25 }
    },
    sidechain: { source: 'internal', amount: 0.25, attack: 0.04, release: 0.24 },
    rhythm: { enabled: false },
    transient: { attack: 1.1, sustain: 0.85 },
    modMatrix: [],
    performance: { playing: false, droneNote: 'C2', droneVelocity: 0.65 },
    routing: {
      voiceBus: null
    }
  };
}

class MothyGSynth {
  constructor() {
    this.state = createDefaultState();
    this.presetManager = new PresetManager();
    this.prng = new PRNG(Date.now());
    this.voices = [];
    this.activeNotes = new Map();
    this.midi = null;
    this.initialised = false;
    this.modulationEngine = null;
    this.modEnvelope = { startTime: 0, velocity: 0, releaseTime: null, releaseLevel: 0 };
    this.lastNote = 60;
    this.lastVelocity = 0.8;
    this.aftertouch = 0;
    this.performanceNote = null;
  }
  ensureKey() {
    if (!this.state.global) this.state.global = {};
    this.state.global.key = normalizeKeyName(this.state.global.key ?? 'C');
  }
  getKeyOffset() {
    this.ensureKey();
    const index = KEY_ROOTS.indexOf(this.state.global.key);
    return index >= 0 ? index : 0;
  }
  transposeNote(note) {
    const offset = this.getKeyOffset();
    if (!offset) return note;
    const midiValue = typeof note === 'number' ? note : noteNameToMidi(note);
    const shifted = clamp(midiValue + offset, 0, 127);
    return typeof note === 'number' ? shifted : midiToNoteName(shifted);
  }
  async init() {
    if (this.initialised) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio API not supported in this browser');
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    ACTIVE_AUDIO_CONTEXT = this.ctx;
    this.masterBus = new MasterBus(this.ctx);
    this.fx = new FXSection(this.ctx);
    this.masterBus.output.connect(this.fx.input);
    this.fx.output.connect(this.ctx.destination);

    this.wavetableManager = new WavetableManager(this.ctx);

    this.voiceBus = this.ctx.createGain();
    this.voiceBus.connect(this.masterBus.input);
    this.state.routing.voiceBus = this.voiceBus;

    for (let i = 0; i < MAX_VOICES; i += 1) {
      const voice = new Voice(this.ctx, this.wavetableManager, this.state);
      voice.output.connect(this.voiceBus);
      this.voices.push(voice);
    }

    this.sidechainFollower = new SidechainFollower(this.ctx);
    this.sidechainFollower.start();
    this.masterBus.output.connect(this.sidechainFollower.input);

    this.drumBus = new DrumBus(this.ctx, () => this.state.global.bpm);
    this.drumBus.output.connect(this.sidechainFollower.input);
    this.drumBus.output.connect(this.masterBus.input);

    this.modulationEngine = new ModulationEngine(this);
    this.modulationEngine.start();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.levelAnalyser = this.ctx.createAnalyser();
    this.levelAnalyser.fftSize = 256;
    this.masterBus.output.connect(this.analyser);
    this.masterBus.output.connect(this.levelAnalyser);

    this.initMIDI();
    this.initialised = true;
  }
  updateState(partial) {
    Object.assign(this.state, partial);
    this.applyState();
  }
  applyState() {
    this.ensureKey();
    this.masterBus.setVolume(this.state.global.masterVolume);
    this.masterBus.setCeiling(this.state.global.limiterCeiling);
    for (const voice of this.voices) {
      voice.updateFromState(this.state);
    }
    this.fx.setChorus(this.state.fx.chorus);
    this.fx.setDelay(this.state.fx.delay);
    this.fx.setReverb(this.state.fx.reverb);
    this.modulationEngine?.refreshConfig();
    this.updateSidechainSettings();
  }
  computeModEnvelopeValue(time = this.ctx?.currentTime ?? 0) {
    const env = this.state.envelopes?.mod;
    if (!env) return 0;
    const start = this.modEnvelope.startTime ?? 0;
    const velocity = this.modEnvelope.velocity ?? 0;
    if (this.modEnvelope.releaseTime !== null && time >= this.modEnvelope.releaseTime) {
      const relElapsed = time - this.modEnvelope.releaseTime;
      const releaseDuration = Math.max(env.release ?? 0.01, 0.01);
      if (relElapsed >= releaseDuration) return 0;
      const startLevel = this.modEnvelope.releaseLevel ?? env.sustain * velocity;
      const factor = 1 - relElapsed / releaseDuration;
      return Math.max(startLevel * factor, 0);
    }
    if (time < start) return 0;
    const t = time - start;
    const attack = Math.max(env.attack ?? 0.001, 0.001);
    const decay = Math.max(env.decay ?? 0.001, 0.001);
    const sustainLevel = (env.sustain ?? 0.5) * velocity;
    if (t < attack) {
      return (t / attack) * velocity;
    }
    if (t < attack + decay) {
      const decayT = t - attack;
      return velocity + (sustainLevel - velocity) * (decayT / decay);
    }
    return sustainLevel;
  }

  updateSidechainSettings() {
    if (!this.sidechainFollower) return;
    const sidechain = this.state.sidechain ?? {};
    this.sidechainFollower.setAmount(sidechain.amount ?? 0.2);
    this.sidechainFollower.setAttack(sidechain.attack ?? 0.02);
    this.sidechainFollower.setRelease(sidechain.release ?? 0.18);
    this.updateRhythmState();
  }

  updateRhythmState() {
    if (!this.drumBus) return;
    if (!this.state.rhythm) this.state.rhythm = { enabled: false };
    const rhythmEnabled = !!this.state.rhythm.enabled;
    if (rhythmEnabled && !this.drumBus.isRunning) {
      this.drumBus.start();
    }
    if (!rhythmEnabled && this.drumBus.isRunning) {
      this.drumBus.stop();
    }
    const sidechain = this.state.sidechain ?? {};
    const shouldBeAudible = rhythmEnabled && sidechain.source === 'internal';
    this.drumBus.setMuted(!shouldBeAudible);
  }

  setRhythmEnabled(enabled) {
    if (!this.state.rhythm) this.state.rhythm = { enabled: false };
    this.state.rhythm.enabled = !!enabled;
    this.updateRhythmState();
  }

  stopAll() {
    if (!this.initialised) return;
    this.stopPerformance();
    const now = this.ctx.currentTime;
    this.voices.forEach((voice) => {
      voice.forceStop(now);
    });
    this.activeNotes.clear();
    this.modEnvelope.releaseTime = now;
    this.modEnvelope.releaseLevel = 0;
    if (this.drumBus) {
      this.drumBus.stop();
      this.drumBus.setMuted(true);
    }
  }

  findFreeVoice(note, laneId) {
    const legato = this.state.sub.legato;
    if (legato && laneId === 'bass') {
      const existing = this.activeNotes.get(note);
      if (existing) return existing;
    }
    const voice = this.voices.find((v) => !v.active);
    return voice ?? this.voices[0];
  }
  noteOn(note, velocity = 0.8, lane = 'manual') {
    const voice = this.findFreeVoice(note, lane);
    if (!voice) return;
    const now = this.ctx.currentTime;
    const playNote = this.transposeNote(note);
    const midi = typeof playNote === 'number' ? playNote : noteNameToMidi(playNote);
    this.lastNote = midi;
    this.lastVelocity = velocity;
    this.modEnvelope.startTime = now;
    this.modEnvelope.velocity = velocity;
    this.modEnvelope.releaseTime = null;
    voice.updateFromState(this.state);
    voice.trigger(playNote, velocity, now);
    this.activeNotes.set(note, voice);
  }
  noteOff(note) {
    const voice = this.activeNotes.get(note);
    if (!voice) return;
    const now = this.ctx.currentTime;
    this.modEnvelope.releaseTime = now;
    this.modEnvelope.releaseLevel = this.computeModEnvelopeValue(now);
    voice.release(now);
    this.activeNotes.delete(note);
  }
  startPerformance() {
    if (!this.initialised) return;
    this.ensureKey();
    if (!this.state.performance) {
      this.state.performance = { playing: false, droneNote: 'C2', droneVelocity: 0.65 };
    }
    const perf = this.state.performance;
    const noteCandidate = perf.droneNote ?? 'C2';
    const rawVelocity = Number(perf.droneVelocity ?? 0.65);
    const velocity = clamp(Number.isFinite(rawVelocity) ? rawVelocity : 0.65, 0, 1);
    const note = (typeof noteCandidate === 'string' || Number.isFinite(noteCandidate)) ? noteCandidate : 'C2';
    this.stopPerformance();
    this.noteOn(note, velocity, 'performance');
    this.performanceNote = note;
    if (this.state.performance) {
      this.state.performance.playing = true;
      this.state.performance.droneNote = note;
      this.state.performance.droneVelocity = velocity;
    }
  }
  stopPerformance() {
    if (this.performanceNote !== null) {
      if (this.initialised) {
        this.noteOff(this.performanceNote);
      }
      this.performanceNote = null;
    }
    if (this.state.performance) {
      this.state.performance.playing = false;
    }
  }
  initMIDI() {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then((access) => {
      this.midi = access;
      for (const input of access.inputs.values()) {
        input.onmidimessage = (msg) => this.handleMIDI(msg);
      }
    }).catch(() => {
      console.warn('MIDI access denied');
    });
  }
  handleMIDI(event) {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    switch (command) {
      case 0x90:
        if (data2 > 0) {
          this.noteOn(data1, data2 / 127);
        } else {
          this.noteOff(data1);
        }
        break;
      case 0x80:
        this.noteOff(data1);
        break;
      case 0xd0:
        this.aftertouch = data1 / 127;
        break;
      default:
        break;
    }
  }
  renderVisualisers(scopeCanvas, spectrumCanvas, meterBar) {
    if (!this.analyser) return;
    const scopeCtx = scopeCanvas.getContext('2d');
    const specCtx = spectrumCanvas.getContext('2d');
    const scopeData = new Uint8Array(this.analyser.fftSize);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    const levelData = new Uint8Array(this.levelAnalyser.fftSize);

    const draw = () => {
      if (!this.initialised) return;
      requestAnimationFrame(draw);
      this.analyser.getByteTimeDomainData(scopeData);
      this.analyser.getByteFrequencyData(freqData);
      this.levelAnalyser.getByteTimeDomainData(levelData);

      scopeCtx.fillStyle = 'rgba(0,0,0,0.6)';
      scopeCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);
      scopeCtx.lineWidth = 2;
      scopeCtx.strokeStyle = '#7bd1ff';
      scopeCtx.beginPath();
      const slice = scopeCanvas.width / scopeData.length;
      for (let i = 0; i < scopeData.length; i += 1) {
        const x = i * slice;
        const v = scopeData[i] / 128 - 1;
        const y = (v * scopeCanvas.height) / 2 + scopeCanvas.height / 2;
        if (i === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();

      specCtx.fillStyle = 'rgba(0,0,0,0.6)';
      specCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
      const barWidth = (spectrumCanvas.width / freqData.length) * 2.5;
      let x = 0;
      for (let i = 0; i < freqData.length; i += 1) {
        const magnitude = freqData[i] / 255;
        const barHeight = magnitude * spectrumCanvas.height;
        specCtx.fillStyle = `rgba(123,209,255,${clamp(magnitude + 0.1, 0.1, 1)})`;
        specCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      let peak = 0;
      for (let i = 0; i < levelData.length; i += 1) {
        const sample = (levelData[i] - 128) / 128;
        peak = Math.max(peak, Math.abs(sample));
      }
      const peakDb = 20 * Math.log10(peak || 0.0001);
      const meterNorm = clamp((peakDb + 60) / 60, 0, 1);
      meterBar.style.width = `${meterNorm * 100}%`;
      meterBar.parentElement.setAttribute('aria-valuenow', peakDb.toFixed(1));
    };
    draw();
  }
}

class UIController {
  constructor() {
    this.synth = new MothyGSynth();
    this.state = createDefaultState();
    this.ensureGlobalKey();
    this.ensureRhythmState();
    this.ensurePerformanceState();
    this.ensureUIState();
    this.keyButtons = new Map();
    this.collapsiblePanels = [];
    this.accordionInitialised = false;
    this.visualisersAttached = false;
    this.audioInitPromise = null;
    this.autoInitBound = null;
    this.transportControlsBound = false;
    this.scope = document.getElementById('oscilloscope');
    this.spectrum = document.getElementById('spectrum');
    this.meterBar = document.getElementById('master-meter');
    this.startButton = document.getElementById('start-audio');
    this.playButton = document.getElementById('transport-play');
    this.rhythmButton = document.getElementById('transport-rhythm');
    this.stopButton = document.getElementById('transport-stop');
    this.tooltipsToggleInput = document.getElementById('toggle-tooltips');
    this.tooltipItems = [];

    this.populatePanels();
    this.bindMasterControls();
    this.bindTransportControls();
    this.setupKeyControls();
    this.attachKeyboard();
    this.applyStateToUI();
    this.loadState();
    this.setupPanelAccordion();
    this.startButton?.addEventListener('click', () => {
      this.initAudio();
    });
    this.setupAutoInitHandlers();
    this.updateTooltipMode();
  }
  ensureGlobalKey() {
    if (!this.state.global) this.state.global = {};
    this.state.global.key = normalizeKeyName(this.state.global.key ?? 'C');
  }
  ensureRhythmState() {
    if (!this.state.rhythm) {
      this.state.rhythm = { enabled: false };
    } else if (typeof this.state.rhythm.enabled !== 'boolean') {
      this.state.rhythm.enabled = !!this.state.rhythm.enabled;
    }
  }
  ensurePerformanceState() {
    if (!this.state.performance) {
      this.state.performance = { playing: false, droneNote: 'C2', droneVelocity: 0.65 };
    } else {
      if (typeof this.state.performance.playing !== 'boolean') {
        this.state.performance.playing = !!this.state.performance.playing;
      }
      const note = this.state.performance.droneNote;
      if (typeof note !== 'string' && !Number.isFinite(note)) {
        this.state.performance.droneNote = 'C2';
      }
      if (!Number.isFinite(Number(this.state.performance.droneVelocity))) {
        this.state.performance.droneVelocity = 0.65;
      } else {
        this.state.performance.droneVelocity = clamp(Number(this.state.performance.droneVelocity), 0, 1);
      }
    }
  }
  ensureUIState() {
    if (!this.state.ui) {
      this.state.ui = { showTooltips: true };
    } else if (typeof this.state.ui.showTooltips !== 'boolean') {
      this.state.ui.showTooltips = !!this.state.ui.showTooltips;
    }
  }
  tip(key, fallback = '') {
    return TOOLTIP_COPY[key] ?? fallback ?? '';
  }
  applyTooltip(element, text) {
    if (!element || !text) return;
    if (!Array.isArray(this.tooltipItems)) {
      this.tooltipItems = [];
    }
    const existing = this.tooltipItems.find((item) => item.element === element);
    if (existing) {
      existing.text = text;
    } else {
      this.tooltipItems.push({ element, text });
    }
    element.classList.add('has-tooltip');
    element.setAttribute('data-tooltip', text);
  }
  pruneTooltipRegistry() {
    if (!Array.isArray(this.tooltipItems)) return;
    this.tooltipItems = this.tooltipItems.filter((item) => item.element && item.element.isConnected);
  }
  updateTooltipMode() {
    this.ensureUIState();
    const show = !!this.state.ui.showTooltips;
    if (document?.body) {
      document.body.dataset.tooltips = show ? 'on' : 'off';
    }
    this.pruneTooltipRegistry();
    if (Array.isArray(this.tooltipItems)) {
      this.tooltipItems.forEach(({ element, text }) => {
        if (!element || !text) return;
        element.setAttribute('data-tooltip', text);
      });
    }
    if (this.tooltipsToggleInput) {
      this.tooltipsToggleInput.checked = show;
    }
  }
  setupKeyControls() {
    const container = document.getElementById('key-controls');
    if (!container) return;
    container.innerHTML = '';
    if (!(this.keyButtons instanceof Map)) {
      this.keyButtons = new Map();
    } else {
      this.keyButtons.clear();
    }
    KEY_ROOTS.forEach((keyName) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'key-button';
      button.textContent = keyName;
      this.applyTooltip(button, `${this.tip('key.select')}\nRoot: ${keyName}`);
      button.addEventListener('click', () => {
        if (this.state.global.key === keyName) return;
        this.ensureRhythmState();
        this.ensurePerformanceState();
        const wasPlaying = !!this.state.performance?.playing;
        const rhythmWasEnabled = !!this.state.rhythm?.enabled;
        if (this.synth.initialised) {
          this.synth.stopAll();
        }
        this.state.global.key = keyName;
        this.updateKeySelectionUI();
        this.updateEngine();
        if (this.synth.initialised) {
          if (rhythmWasEnabled) {
            this.state.rhythm.enabled = true;
            this.synth.setRhythmEnabled(true);
          }
          if (wasPlaying) {
            this.state.performance.playing = true;
            this.persistState();
            this.synth.startPerformance();
          }
        }
        this.updateRhythmToggleUI?.();
      });
      container.appendChild(button);
      this.keyButtons.set(keyName, button);
    });
    this.updateKeySelectionUI();
  }
  updateKeySelectionUI() {
    this.ensureGlobalKey();
    if (!this.keyButtons) return;
    const active = this.state.global.key;
    this.keyButtons.forEach((button, keyName) => {
      button.classList.toggle('is-active', keyName === active);
    });
  }
  bindMasterControls() {
    const bpm = document.getElementById('bpm');
    this.applyTooltip(bpm?.closest('label') ?? bpm, this.tip('global.bpm'));
    bpm.addEventListener('input', () => {
      this.state.global.bpm = Number(bpm.value);
      this.persistState();
    });
    const swing = document.getElementById('swing');
    this.applyTooltip(swing?.closest('label') ?? swing, this.tip('global.swing'));
    swing.addEventListener('input', () => {
      this.state.global.swing = Number(swing.value);
      this.persistState();
    });
    const volume = document.getElementById('master-volume');
    this.applyTooltip(volume?.closest('label') ?? volume, this.tip('global.masterVolume'));
    volume.addEventListener('input', () => {
      this.state.global.masterVolume = Number(volume.value);
      if (this.synth.initialised) this.synth.masterBus.setVolume(this.state.global.masterVolume);
      this.persistState();
    });
    const ceiling = document.getElementById('ceiling');
    this.applyTooltip(ceiling?.closest('label') ?? ceiling, this.tip('global.limiterCeiling'));
    ceiling.addEventListener('input', () => {
      this.state.global.limiterCeiling = Number(ceiling.value);
      if (this.synth.initialised) this.synth.masterBus.setCeiling(this.state.global.limiterCeiling);
      this.persistState();
    });
    const quality = document.getElementById('quality');
    this.applyTooltip(quality?.closest('label') ?? quality, this.tip('global.quality'));
    quality.addEventListener('change', () => {
      this.state.global.quality = Number(quality.value);
      this.persistState();
    });
    if (this.tooltipsToggleInput) {
      const toggleLabel = this.tooltipsToggleInput.closest('label') ?? this.tooltipsToggleInput;
      this.applyTooltip(toggleLabel, this.tip('tooltips.toggle'));
      this.tooltipsToggleInput.addEventListener('change', () => {
        this.state.ui.showTooltips = !!this.tooltipsToggleInput.checked;
        this.updateTooltipMode();
        this.persistState();
      });
    }
  }
  bindTransportControls() {
    if (!this.transportControlsBound) {
      const playBtn = this.playButton;
      const rhythmBtn = this.rhythmButton;
      const stopBtn = this.stopButton;
      if (this.startButton) {
        this.applyTooltip(this.startButton, this.tip('transport.initAudio'));
      }
      if (playBtn) {
        this.applyTooltip(playBtn, this.tip('transport.play'));
        playBtn.addEventListener('click', async () => {
          await this.initAudio();
          if (!this.synth.initialised) return;
          this.ensurePerformanceState();
          this.state.performance.playing = true;
          this.persistState();
          this.ensureRhythmState();
          this.synth.setRhythmEnabled(!!this.state.rhythm?.enabled);
          this.synth.startPerformance();
        });
      }
      if (stopBtn) {
        this.applyTooltip(stopBtn, this.tip('transport.stop'));
        stopBtn.addEventListener('click', async () => {
          await this.initAudio();
          if (this.synth.initialised) {
            this.synth.stopAll();
          }
          this.ensureRhythmState();
          let stateDirty = false;
          if (this.state.rhythm.enabled) {
            this.state.rhythm.enabled = false;
            if (this.synth.initialised) {
              this.synth.setRhythmEnabled(false);
            }
            stateDirty = true;
          }
          if (this.state.performance.playing) {
            this.state.performance.playing = false;
            stateDirty = true;
          }
          if (stateDirty) this.persistState();
          this.updateRhythmToggleUI?.();
        });
      }
      if (rhythmBtn) {
        this.applyTooltip(rhythmBtn, this.tip('transport.rhythm'));
        const updateRhythmLabel = () => {
          this.ensureRhythmState();
          const enabled = !!this.state.rhythm?.enabled;
          rhythmBtn.textContent = enabled ? 'Rhythm: On' : 'Rhythm: Off';
          rhythmBtn.classList.toggle('is-active', enabled);
          rhythmBtn.setAttribute('aria-pressed', String(enabled));
        };
        this.updateRhythmToggleUI = updateRhythmLabel;
        rhythmBtn.addEventListener('click', () => {
          this.ensureRhythmState();
          this.state.rhythm.enabled = !this.state.rhythm.enabled;
          if (this.synth.initialised) {
            this.synth.setRhythmEnabled(this.state.rhythm.enabled);
          }
          this.persistState();
          updateRhythmLabel();
        });
        updateRhythmLabel();
      }
      this.transportControlsBound = true;
    } else {
      this.updateRhythmToggleUI?.();
    }
  }
  populatePanels() {
    this.ensureGlobalKey();
    this.ensureRhythmState();
    this.ensurePerformanceState();
    this.buildOscPanel();
    this.buildSubPanel();
    this.buildFMPanel();
    this.buildFilterPanel();
    this.buildEnvelopePanel();
    this.buildFXPanel();
    this.buildModMatrixPanel();
    this.buildPresetPanel();
    this.syncAccordionState();
  }
  setupPanelAccordion() {
    const panels = Array.from(document.querySelectorAll('main > .panel'));
    this.collapsiblePanels = panels.filter((panel) => !panel.classList.contains('meters'));
    this.collapsiblePanels.forEach((panel) => {
      panel.classList.add('collapsible');
      if (panel.dataset.accordionBound === 'true') return;
      const header = panel.querySelector('h2');
      if (!header) return;
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', 'false');
      header.addEventListener('click', () => this.handlePanelToggle(panel));
      header.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
          event.preventDefault();
          this.handlePanelToggle(panel);
        }
        if (event.key === 'Spacebar') {
          event.preventDefault();
          this.handlePanelToggle(panel);
        }
      });
      panel.dataset.accordionBound = 'true';
    });
    if (!this.accordionInitialised) {
      this.collapsiblePanels.forEach((panel) => this.collapsePanel(panel));
      this.accordionInitialised = true;
    } else {
      this.syncAccordionState();
    }
  }
  handlePanelToggle(panel) {
    if (panel.classList.contains('is-collapsed')) {
      this.openAccordionPanel(panel);
    } else {
      this.collapsePanel(panel);
    }
  }
  openAccordionPanel(panel) {
    this.collapsiblePanels.forEach((item) => {
      if (item !== panel) this.collapsePanel(item);
    });
    this.expandPanel(panel);
  }
  collapsePanel(panel) {
    if (!panel) return;
    panel.classList.add('is-collapsed');
    const header = panel.querySelector('h2');
    if (header) header.setAttribute('aria-expanded', 'false');
    const body = panel.querySelector('.panel-body');
    if (body) body.setAttribute('aria-hidden', 'true');
  }
  expandPanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-collapsed');
    const header = panel.querySelector('h2');
    if (header) header.setAttribute('aria-expanded', 'true');
    const body = panel.querySelector('.panel-body');
    if (body) body.setAttribute('aria-hidden', 'false');
  }
  syncAccordionState() {
    if (!Array.isArray(this.collapsiblePanels) || !this.collapsiblePanels.length) return;
    this.collapsiblePanels.forEach((panel) => {
      if (panel.classList.contains('is-collapsed')) {
        this.collapsePanel(panel);
      } else {
        this.expandPanel(panel);
      }
    });
  }
  setupAutoInitHandlers() {
    this.removeAutoInitListeners();
    const handler = () => {
      this.removeAutoInitListeners();
      this.initAudio();
    };
    this.autoInitBound = handler;
    document.addEventListener('pointerdown', handler, { passive: true });
    document.addEventListener('keydown', handler);
  }
  removeAutoInitListeners() {
    if (!this.autoInitBound) return;
    document.removeEventListener('pointerdown', this.autoInitBound, { passive: true });
    document.removeEventListener('keydown', this.autoInitBound);
    this.autoInitBound = null;
  }
  markAudioReady() {
    if (!this.startButton) return;
    this.startButton.disabled = true;
    this.startButton.textContent = 'Audio Ready';
  }
  async initAudio() {
    if (this.synth.initialised) {
      this.markAudioReady();
      return;
    }
    if (this.audioInitPromise) {
      return this.audioInitPromise;
    }
    this.removeAutoInitListeners();
    this.audioInitPromise = (async () => {
      try {
        await this.synth.init();
        if (!this.visualisersAttached) {
          this.synth.renderVisualisers(this.scope, this.spectrum, this.meterBar);
          this.visualisersAttached = true;
        }
        this.applyStateToEngine();
        this.markAudioReady();
      } catch (err) {
        alert(err.message);
        this.setupAutoInitHandlers();
      } finally {
        this.audioInitPromise = null;
      }
    })();
    return this.audioInitPromise;
  }
  createControls(panel, configs) {
    configs.filter(Boolean).forEach((config) => this.bindControl(panel, config));
  }
  bindControl(panel, config) {
    const {
      label,
      type = 'range',
      min,
      max,
      step,
      options,
      id,
      tooltip,
      path,
      event,
      parse,
      format,
      defaultValue,
      transform,
      set,
      get,
      onChange,
      afterUpdate,
      skipEngineUpdate
    } = config;
    const stateValue = (typeof get === 'function') ? get(this.state) : (path ? getNested(this.state, path) : config.value);
    const formattedValue = (typeof format === 'function') ? format(stateValue) : stateValue;
    const initialValue = (formattedValue ?? defaultValue ?? defaultValueForType(type, options));
    const control = this.controlElement({ label, type, min, max, step, options, value: initialValue, id, tooltip });
    panel.appendChild(control.wrap);
    const eventName = event || defaultEventForType(type);
    const parseFn = parse || ((input) => parseInputValue(input, type));
    const applyTransform = transform || ((value) => value);
    const handler = () => {
      let rawValue = parseFn(control.input);
      if (Number.isNaN(rawValue)) {
        const fallback = (typeof get === 'function') ? get(this.state) : (path ? getNested(this.state, path) : defaultValue);
        rawValue = fallback ?? defaultValueForType(type, options);
      }
      const valueToSet = applyTransform(rawValue);
      if (typeof set === 'function') {
        set(this.state, valueToSet);
      } else if (path) {
        setNested(this.state, path, valueToSet);
      }
      onChange?.(valueToSet, control.input);
      if (!skipEngineUpdate) this.updateEngine();
      afterUpdate?.(valueToSet, control.input);
    };
    control.input.addEventListener(eventName, handler);
  }
  controlElement({ label, type = 'range', min = 0, max = 1, step = 0.01, value = 0, options = [], id, tooltip }) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const span = document.createElement('span');
    span.textContent = label;
    wrap.appendChild(span);
    let input;
    if (type === 'select') {
      input = document.createElement('select');
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value ?? opt.id ?? opt;
        option.textContent = opt.label ?? opt.name ?? opt;
        input.appendChild(option);
      });
      input.value = value;
    } else if (type === 'checkbox') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
    } else {
      input = document.createElement('input');
      input.type = type;
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = value;
    }
    input.id = id;
    input.setAttribute('aria-label', label);
    wrap.appendChild(input);
    if (tooltip) {
      this.applyTooltip(wrap, tooltip);
    }
    return { wrap, input };
  }
  buildOscPanel() {
    const panel = document.getElementById('osc-panel');
    panel.innerHTML = '';
    ['oscA', 'oscB'].forEach((key) => {
      const catalog = OSCILLATOR_CATALOG[key];
      const basePath = `oscillators.${key}`;
      this.createControls(panel, [
        {
          label: `${catalog.name} Table`,
          type: 'select',
          options: catalog.tables,
          path: `${basePath}.table`,
          id: `${key}-table`,
          tooltip: this.tip('osc.table')
        },
        {
          label: 'Morph',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.01,
          path: `${basePath}.morph`,
          id: `${key}-morph`,
          tooltip: this.tip('osc.morph')
        },
        {
          label: 'Coarse Tune',
          type: 'number',
          min: -24,
          max: 24,
          step: 1,
          path: `${basePath}.tune`,
          id: `${key}-tune`,
          tooltip: this.tip('osc.tune')
        },
        {
          label: 'Fine',
          type: 'range',
          min: -1,
          max: 1,
          step: 0.001,
          path: `${basePath}.fine`,
          id: `${key}-fine`,
          tooltip: this.tip('osc.fine')
        },
        {
          label: 'Level',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.01,
          path: `${basePath}.level`,
          id: `${key}-level`,
          tooltip: this.tip('osc.level')
        },
        {
          label: 'Pan',
          type: 'range',
          min: -1,
          max: 1,
          step: 0.01,
          path: `${basePath}.pan`,
          id: `${key}-pan`,
          tooltip: this.tip('osc.pan')
        }
      ]);
    });
  }
  buildSubPanel() {
    const panel = document.getElementById('mixer-panel');
    panel.innerHTML = '';
    this.createControls(panel, [
      { label: 'Sub Level', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.level', id: 'sub-level', tooltip: this.tip('sub.level') },
      { label: 'Square Blend %', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.squareBlend', id: 'sub-square', tooltip: this.tip('sub.squareBlend') },
      { label: 'Saturation', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.saturation', id: 'sub-sat', tooltip: this.tip('sub.saturation') },
      { label: 'Mono/Legato', type: 'checkbox', path: 'sub.legato', id: 'sub-legato', tooltip: this.tip('sub.legato') }
    ]);
  }
  buildFMPanel() {
    const panel = document.getElementById('osc-panel');
    this.createControls(panel, [
      { label: 'FM Ratio', type: 'range', min: 0.25, max: 8, step: 0.01, path: 'fm.ratio', id: 'fm-ratio', tooltip: this.tip('fm.ratio') },
      { label: 'FM Index', type: 'range', min: 0, max: 2, step: 0.01, path: 'fm.index', id: 'fm-index', tooltip: this.tip('fm.index') },
      { label: 'Index Attack', type: 'range', min: 0, max: 1, step: 0.001, path: 'fm.attack', id: 'fm-attack', tooltip: this.tip('fm.attack') },
      { label: 'Index Decay', type: 'range', min: 0, max: 1.5, step: 0.001, path: 'fm.decay', id: 'fm-decay', tooltip: this.tip('fm.decay') },
      { label: 'Vel→Index', type: 'range', min: 0, max: 1, step: 0.01, path: 'fm.velocityToIndex', id: 'fm-vel', tooltip: this.tip('fm.velocityToIndex') }
    ]);
  }
  buildFilterPanel() {
    const panel = document.getElementById('filter-panel');
    panel.innerHTML = '';
    ['filter1', 'filter2'].forEach((key, index) => {
      const basePath = `filters.${key}`;
      this.createControls(panel, [
        { label: `Filter ${index + 1} Type`, type: 'select', options: FILTER_TYPE_OPTIONS, path: `${basePath}.type`, id: `${key}-type`, tooltip: this.tip('filter.type') },
        { label: 'Cutoff (Hz)', type: 'number', min: 20, max: 20000, step: 1, path: `${basePath}.cutoff`, id: `${key}-cutoff`, tooltip: this.tip('filter.cutoff') },
        { label: 'Resonance', type: 'range', min: 0.1, max: 2.5, step: 0.01, path: `${basePath}.resonance`, id: `${key}-res`, tooltip: this.tip('filter.resonance') },
        { label: 'Drive', type: 'range', min: 1, max: 2.5, step: 0.01, path: `${basePath}.drive`, id: `${key}-drive`, tooltip: this.tip('filter.drive') },
        { label: 'Env Amount', type: 'number', min: 0, max: 2000, step: 1, path: `${basePath}.envAmount`, id: `${key}-env`, tooltip: this.tip('filter.envAmount') },
        { label: 'Keytrack %', type: 'range', min: 0, max: 1, step: 0.01, path: `${basePath}.keytrack`, id: `${key}-keytrack`, tooltip: this.tip('filter.keytrack') }
      ]);
    });
    this.createControls(panel, [
      { label: 'Serial Routing', type: 'checkbox', path: 'filters.routing.serial', id: 'filters-serial', tooltip: this.tip('filter.serial') },
      { label: 'Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'filters.routing.mix', id: 'filters-mix', tooltip: this.tip('filter.mix') }
    ]);
  }
  buildEnvelopePanel() {
    const panel = document.getElementById('env-panel');
    panel.innerHTML = '';
    const envelopeKeys = ['amp', 'filter', 'mod'];
    const stageConfig = {
      attack: { min: 0, max: 2, step: 0.001 },
      decay: { min: 0, max: 2, step: 0.001 },
      sustain: { min: 0, max: 1, step: 0.001 },
      release: { min: 0, max: 2, step: 0.001 },
      curve: { min: 0.5, max: 3, step: 0.01 }
    };
    envelopeKeys.forEach((key) => {
      Object.entries(stageConfig).forEach(([stage, config]) => {
        this.bindControl(panel, {
          label: `${key.toUpperCase()} ${stage}`,
          type: 'range',
          min: config.min,
          max: config.max,
          step: config.step,
          path: `envelopes.${key}.${stage}`,
          id: `${key}-${stage}`,
          tooltip: this.tip(`envelope.${stage}`)
        });
      });
    });
  }
  buildFXPanel() {
    const panel = document.getElementById('fx-panel');
    panel.innerHTML = '';
    if (!this.state.sidechain) {
      this.state.sidechain = { source: 'internal', amount: 0.2, attack: 0.04, release: 0.24 };
    }
    this.createControls(panel, [
      { label: 'Chorus Depth', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.chorus.depth', id: 'chorus-depth', tooltip: this.tip('fx.chorus.depth') },
      { label: 'Chorus Rate', type: 'range', min: 0.05, max: 5, step: 0.01, path: 'fx.chorus.rate', id: 'chorus-rate', tooltip: this.tip('fx.chorus.rate') },
      { label: 'Delay Time', type: 'range', min: 0.05, max: 1.5, step: 0.01, path: 'fx.delay.time', id: 'delay-time', tooltip: this.tip('fx.delay.time') },
      { label: 'Delay Feedback', type: 'range', min: 0, max: 0.95, step: 0.01, path: 'fx.delay.feedback', id: 'delay-feedback', tooltip: this.tip('fx.delay.feedback') },
      { label: 'Delay Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.delay.mix', id: 'delay-mix', tooltip: this.tip('fx.delay.mix') },
      { label: 'Reverb Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.reverb.mix', id: 'reverb-mix', tooltip: this.tip('fx.reverb.mix') },
      { label: 'Sidechain Amt', type: 'range', min: 0, max: 1, step: 0.01, path: 'sidechain.amount', id: 'sidechain-amount', tooltip: this.tip('sidechain.amount') },
      { label: 'SC Attack', type: 'range', min: 0.005, max: 0.2, step: 0.001, path: 'sidechain.attack', id: 'sidechain-attack', tooltip: this.tip('sidechain.attack') },
      { label: 'SC Release', type: 'range', min: 0.05, max: 1.2, step: 0.01, path: 'sidechain.release', id: 'sidechain-release', tooltip: this.tip('sidechain.release') },
      {
        label: 'SC Source',
        type: 'select',
        options: [
          { value: 'internal', label: 'Internal Drums' },
          { value: 'external', label: 'Master Mix' }
        ],
        path: 'sidechain.source',
        id: 'sidechain-source',
        tooltip: this.tip('sidechain.source')
      }
    ]);
  }
  buildModMatrixPanel() {
    const panel = document.getElementById('mod-panel');
    panel.innerHTML = '';
    for (let i = 0; i < 8; i += 1) {
      if (!this.state.modMatrix[i]) {
        this.state.modMatrix[i] = { source: 'LFO1', destination: 'oscA.morph', amount: 0 };
      }
      const basePath = `modMatrix.${i}`;
      this.createControls(panel, [
        { label: `Source ${i + 1}`, type: 'select', options: MOD_SOURCE_OPTIONS, path: `${basePath}.source`, id: `mod-${i}-source`, tooltip: this.tip('modMatrix.source') },
        { label: `Destination ${i + 1}`, type: 'text', path: `${basePath}.destination`, id: `mod-${i}-dest`, event: 'change', tooltip: this.tip('modMatrix.destination') },
        { label: `Amount ${i + 1}`, type: 'range', min: -1, max: 1, step: 0.01, path: `${basePath}.amount`, id: `mod-${i}-amount`, tooltip: this.tip('modMatrix.amount') }
      ]);
    }
  }
  buildPresetPanel() {
    const panel = document.getElementById('preset-panel');
    panel.innerHTML = '';
    const presetNames = this.synth.presetManager.list();
    const presetSelect = this.controlElement({ label: 'Factory Preset', type: 'select', options: presetNames, id: 'preset-select', tooltip: this.tip('preset.factory') });
    const selectEl = presetSelect.input;
    const currentPresetName = this.state?.meta?.name;
    if (currentPresetName && presetNames.includes(currentPresetName)) {
      selectEl.value = currentPresetName;
    } else if (presetNames.length && !presetNames.includes(selectEl.value)) {
      selectEl.value = presetNames[0];
    }

    const loadPresetByName = (name) => {
      if (!name) return false;
      const preset = this.synth.presetManager.get(name);
      if (!preset) return false;
      const merged = deepClone({ ...createDefaultState(), ...preset });
      merged.meta = { ...(merged.meta ?? {}), name };
      this.state = merged;
      this.ensureGlobalKey();
      this.populatePanels();
      this.applyStateToUI();
      this.updateKeySelectionUI();
      this.updateEngine();
      return true;
    };

    selectEl.addEventListener('change', () => {
      const name = selectEl.value;
      if (!presetNames.includes(name)) return;
      loadPresetByName(name);
    });

    const navWrap = document.createElement('div');
    navWrap.className = 'preset-select-row';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'preset-arrow preset-arrow--prev';
    prevBtn.setAttribute('aria-label', 'Previous preset');
    prevBtn.textContent = '<';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'preset-arrow preset-arrow--next';
    nextBtn.setAttribute('aria-label', 'Next preset');
    nextBtn.textContent = '>';

    const stepPreset = (direction) => {
      if (!presetNames.length) return;
      const current = selectEl.value;
      let index = presetNames.indexOf(current);
      if (index === -1) {
        index = direction > 0 ? -1 : 0;
      }
      const nextIndex = (index + direction + presetNames.length) % presetNames.length;
      const target = presetNames[nextIndex];
      if (!target) return;
      selectEl.value = target;
      loadPresetByName(target);
    };

    prevBtn.addEventListener('click', (event) => {
      event.preventDefault();
      stepPreset(-1);
    });
    nextBtn.addEventListener('click', (event) => {
      event.preventDefault();
      stepPreset(1);
    });

    navWrap.appendChild(prevBtn);
    navWrap.appendChild(selectEl);
    navWrap.appendChild(nextBtn);
    presetSelect.wrap.appendChild(navWrap);
    this.applyTooltip(prevBtn, 'Load the previous factory preset');
    this.applyTooltip(nextBtn, 'Load the next factory preset');
    panel.appendChild(presetSelect.wrap);

    const seedLabel = document.createElement('div');
    seedLabel.className = 'control';
    const span = document.createElement('span');
    span.textContent = 'Random Seed';
    const seedValue = document.createElement('input');
    seedValue.type = 'number';
    seedValue.id = 'seed-value';
    seedValue.value = this.synth.prng.seed;
    seedLabel.appendChild(span);
    seedLabel.appendChild(seedValue);
    panel.appendChild(seedLabel);
    this.applyTooltip(seedLabel, this.tip('preset.seed'));

    const randomizeBtn = document.createElement('button');
    randomizeBtn.textContent = 'Randomize (Seed)';
    randomizeBtn.addEventListener('click', () => {
      const seed = Number(seedValue.value) || Math.floor(Math.random() * 1000000);
      this.synth.prng.setSeed(seed);
      seedValue.value = seed;
      this.randomizePatch(seed);
      this.updateEngine();
    });
    panel.appendChild(randomizeBtn);
    this.applyTooltip(randomizeBtn, this.tip('preset.randomize'));

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Copy JSON';
    exportBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(this.state, null, 2));
    });
    panel.appendChild(exportBtn);
    this.applyTooltip(exportBtn, this.tip('preset.copy'));

    const importBtn = document.createElement('button');
    importBtn.textContent = 'Paste JSON';
    importBtn.addEventListener('click', async () => {
      const text = await navigator.clipboard?.readText();
      if (!text) return;
      try {
        const json = JSON.parse(text);
        this.state = json;
        this.ensureGlobalKey();
        this.populatePanels();
        this.applyStateToUI();
        this.updateKeySelectionUI();
        this.updateEngine();
      } catch (err) {
        alert('Invalid preset JSON');
      }
    });
    panel.appendChild(importBtn);
    this.applyTooltip(importBtn, this.tip('preset.paste'));
  }
  applyStateToUI() {
    this.ensurePerformanceState();
    document.getElementById('bpm').value = this.state.global.bpm;
    document.getElementById('swing').value = this.state.global.swing;
    document.getElementById('master-volume').value = this.state.global.masterVolume;
    document.getElementById('ceiling').value = this.state.global.limiterCeiling;
    document.getElementById('quality').value = this.state.global.quality;
    if (this.tooltipsToggleInput) {
      this.tooltipsToggleInput.checked = !!this.state.ui?.showTooltips;
    }
    this.updateTooltipMode();
    this.updateKeySelectionUI();
  }
  loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.applyStateToUI();
      return;
    }
    try {
      this.state = JSON.parse(raw);
      this.ensureGlobalKey();
      this.ensureRhythmState();
      this.ensurePerformanceState();
      this.ensureUIState();
    } catch (err) {
      console.warn('Failed to load patch, using defaults');
      this.state = createDefaultState();
      this.ensureGlobalKey();
      this.ensureRhythmState();
      this.ensurePerformanceState();
      this.ensureUIState();
    }
    if (this.state.performance) {
      this.state.performance.playing = false;
    }
    this.populatePanels();
    this.applyStateToUI();
    this.updateEngine();
  }
  persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
  updateEngine() {
    this.ensureGlobalKey();
    this.ensureRhythmState();
    this.ensurePerformanceState();
    this.ensureUIState();
    this.updateRhythmToggleUI?.();
    this.updateTooltipMode();
    this.persistState();
    if (!this.synth.initialised) return;
    this.synth.state = this.state;
    this.synth.applyState();
  }
  applyStateToEngine() {
    if (!this.synth.initialised) return;
    this.synth.state = this.state;
    this.synth.applyState();
  }
  randomizePatch(seed) {
    const rng = new PRNG(seed);
    const { oscillators, sub, fm, filters, envelopes, fx, sidechain } = this.state;
    oscillators.oscA.morph = rng.next();
    oscillators.oscB.morph = rng.next();
    sub.level = rng.nextRange(0.5, 0.9);
    fm.index = rng.nextRange(0.05, 0.45);
    filters.filter1.cutoff = rng.nextRange(80, 260);
    filters.filter2.cutoff = rng.nextRange(400, 1200);
    envelopes.amp.attack = rng.nextRange(0.005, 0.05);
    fx.chorus.depth = rng.nextRange(0.1, 0.4);
    if (sidechain) {
      sidechain.amount = rng.nextRange(0.15, 0.35);
    }
  }
  attachKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const note = NOTE_MAP[event.code];
      if (!note) return;
      this.synth.noteOn(note, 0.8);
    });
    window.addEventListener('keyup', (event) => {
      const note = NOTE_MAP[event.code];
      if (!note) return;
      this.synth.noteOff(note);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.AudioContext && !window.webkitAudioContext) {
    alert('Web Audio API not supported. Please use the latest Chrome or Firefox.');
    return;
  }
  new UIController();
});
