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
 * 4. Sequencer & Performance
 *    - Step sequencer with four lanes (Bass, Stab, Pad, Automation) uses a lookahead scheduler for
 *      sample-tight triggering. Each step stores note, velocity, tie, slide, ratchet, probability,
 *      plus automation values routed to assignable destinations.
 *    - MIDI input (notes, sustain, CC learn) and computer keyboard mapping allow quick audition.
 *
 * 5. Presets & Seeds
 *    - Complete patch state (oscillators, filters, envelopes, mod matrix, FX, sequencer, metadata)
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
const LOOKAHEAD = 0.1; // seconds for sequencer scheduling
const SCHEDULE_INTERVAL = 0.025; // scheduler tick
const CONTROL_SMOOTH = 0.04;

const NOTE_MAP = {
  KeyA: 'C4', KeyW: 'C#4', KeyS: 'D4', KeyE: 'D#4', KeyD: 'E4',
  KeyF: 'F4', KeyT: 'F#4', KeyG: 'G4', KeyY: 'G#4', KeyH: 'A4',
  KeyU: 'A#4', KeyJ: 'B4', KeyK: 'C5', KeyO: 'C#5', KeyL: 'D5',
  Semicolon: 'D#5', Quote: 'E5'
};

const LFO_SHAPES = ['sine', 'triangle', 'sawtooth', 'square', 'sample-hold', 'user'];

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
    const bpm = this.synth.state.global.bpm || 174;
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

class LookaheadScheduler {
  constructor(ctx, tempoProvider) {
    this.ctx = ctx;
    this.tempoProvider = tempoProvider;
    this.nextNoteTime = 0;
    this.isRunning = false;
    this.scheduled = [];
  }
  start(callback) {
    this.isRunning = true;
    this.scheduled = [];
    const tick = () => {
      if (!this.isRunning) return;
      const now = this.ctx.currentTime;
      while (this.nextNoteTime < now + LOOKAHEAD) {
        callback(this.nextNoteTime);
        this.advanceStep();
      }
      this.timer = setTimeout(tick, SCHEDULE_INTERVAL * 1000);
    };
    this.nextNoteTime = this.ctx.currentTime;
    tick();
  }
  stop() {
    this.isRunning = false;
    clearTimeout(this.timer);
  }
  advanceStep() {
    const secondsPerBeat = 60 / this.tempoProvider();
    const swing = this.tempoProvider('swing');
    const baseInterval = secondsPerBeat / 4;
    const stepIndex = this.scheduled.length % 2;
    const swingOffset = stepIndex === 1 ? baseInterval * swing * 0.01 : 0;
    this.nextNoteTime += baseInterval + swingOffset;
    this.scheduled.push(this.nextNoteTime);
  }
}

class Sequencer {
  constructor(ctx, synth) {
    this.ctx = ctx;
    this.synth = synth;
    this.lanes = [];
    this.position = 0;
    this.scheduler = new LookaheadScheduler(ctx, (what) => {
      if (what === 'swing') return synth.state.global.swing;
      return synth.state.global.bpm;
    });
  }
  sync(sequencerState) {
    if (!sequencerState) return;
    this.lanes = sequencerState.lanes ?? [];
  }
  setSteps(laneIndex, steps) {
    if (!this.lanes[laneIndex]) return;
    this.lanes[laneIndex].steps = steps;
  }
  setPattern(laneIndex, pattern) {
    if (!this.lanes[laneIndex]) return;
    this.lanes[laneIndex].pattern = pattern;
  }
  start() {
    if (!this.lanes.length) {
      this.sync(this.synth.state.sequencer);
    }
    this.position = 0;
    this.scheduler.nextNoteTime = this.ctx.currentTime;
    this.scheduler.start((time) => {
      this.tick(time);
    });
  }
  stop() {
    this.scheduler.stop();
  }
  tick(time) {
    this.lanes.forEach((lane, idx) => {
      const stepCount = lane.steps;
      if (stepCount === 0) return;
      const stepIndex = this.position % stepCount;
      const step = lane.pattern[stepIndex];
      if (!step) return;
      const probability = step.probability ?? 1;
      if (Math.random() > probability) return;
      if (lane.id === 'automation') {
        this.synth.handleAutomation(step, time);
        return;
      }
      const note = step.note ?? 'C2';
      const velocity = step.velocity ?? 0.8;
      const ratchet = Math.max(1, step.ratchet ?? 1);
      for (let i = 0; i < ratchet; i += 1) {
        const offset = i * (0.25 / ratchet) * (60 / this.synth.state.global.bpm);
        this.synth.triggerLaneNote(lane.id, note, velocity, time + offset, step);
      }
    });
    this.position += 1;
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
      global: { bpm: 174, swing: 8, masterVolume: 0.82, limiterCeiling: -0.8, quality: 1 },
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
        { shape: 'triangle', rate: 0.5, sync: true, amount: 0.18, destination: 'filter2.frequency', phase: 0.25 },
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
      global: { bpm: 174, swing: 12, masterVolume: 0.78, limiterCeiling: -1.2, quality: 1 },
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
        { shape: 'triangle', rate: 0.25, sync: true, amount: 0.5, destination: 'filter2.frequency', phase: 0 },
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
      global: { bpm: 174, swing: 16, masterVolume: 0.76, limiterCeiling: -1, quality: 1 },
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
      global: { bpm: 174, swing: 10, masterVolume: 0.8, limiterCeiling: -1.4, quality: 2 },
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
  }
  get(name) {
    return this.presets.get(name);
  }
  list() {
    return Array.from(this.presets.keys());
  }
}

function createDefaultStep(note = 'C2') {
  return {
    note,
    velocity: 0.8,
    tie: false,
    slide: false,
    ratchet: 1,
    probability: 1,
    gate: 0.45
  };
}

function createLane(id, name, steps, defaultNote) {
  return {
    id,
    name,
    steps,
    defaultNote,
    pattern: Array.from({ length: steps }, () => createDefaultStep(defaultNote))
  };
}

function createDefaultState() {
  return {
    meta: { name: 'Init', author: 'You' },
    global: {
      bpm: 174,
      swing: 0,
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
    transient: { attack: 1.1, sustain: 0.85 },
    modMatrix: [],
    sequencer: {
      lanes: [
        createLane('bass', 'Bass', 16, 'C2'),
        createLane('stab', 'Stabs', 16, 'F3'),
        createLane('pad', 'Pads', 16, 'A3'),
        createLane('automation', 'Automation', 16, 'C4')
      ],
      playing: false
    },
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
    if (this.state.sidechain?.source === 'internal') {
      this.drumBus.start();
    }

    this.modulationEngine = new ModulationEngine(this);
    this.modulationEngine.start();

    this.sequencer = new Sequencer(this.ctx, this);

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
    this.masterBus.setVolume(this.state.global.masterVolume);
    this.masterBus.setCeiling(this.state.global.limiterCeiling);
    this.sequencer?.stop();
    this.sequencer?.sync(this.state.sequencer);
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
    if (this.drumBus) {
      if (sidechain.source === 'internal') {
        this.drumBus.setMuted(false);
        if (!this.drumBus.isRunning) this.drumBus.start();
      } else {
        this.drumBus.setMuted(true);
      }
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
  triggerLaneNote(laneId, note, velocity, time, step) {
    const voice = this.findFreeVoice(note, laneId);
    if (!voice) return;
    voice.updateFromState(this.state);
    voice.trigger(note, velocity, time);
    const midi = typeof note === 'number' ? note : noteNameToMidi(note);
    this.lastNote = midi;
    this.lastVelocity = velocity;
    this.modEnvelope.startTime = time;
    this.modEnvelope.velocity = velocity;
    this.modEnvelope.releaseTime = null;
    const key = `${laneId}-${note}`;
    this.activeNotes.set(key, voice);
    if (!step || !step.tie) {
      const releaseTime = time + (step?.gate ?? 0.4);
      setTimeout(() => {
        this.releaseNote(laneId, note, releaseTime);
      }, Math.max((releaseTime - this.ctx.currentTime) * 1000, 0));
    }
  }
  noteOn(note, velocity = 0.8, lane = 'manual') {
    const voice = this.findFreeVoice(note, lane);
    if (!voice) return;
    const now = this.ctx.currentTime;
    const midi = typeof note === 'number' ? note : noteNameToMidi(note);
    this.lastNote = midi;
    this.lastVelocity = velocity;
    this.modEnvelope.startTime = now;
    this.modEnvelope.velocity = velocity;
    this.modEnvelope.releaseTime = null;
    voice.updateFromState(this.state);
    voice.trigger(note, velocity, now);
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
  releaseNote(laneId, note, time) {
    const key = `${laneId}-${note}`;
    const voice = this.activeNotes.get(key);
    if (!voice) return;
    this.modEnvelope.releaseTime = time;
    this.modEnvelope.releaseLevel = this.computeModEnvelopeValue(time);
    voice.release(time);
    this.activeNotes.delete(key);
  }
  handleAutomation(step, time) {
    const { targets } = step;
    if (!targets) return;
    targets.forEach((target) => {
      const [group, param] = target.id.split('.');
      if (this.state[group] && this.state[group][param] !== undefined) {
        this.state[group][param] = target.value;
      }
    });
    this.applyState();
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
    this.scope = document.getElementById('oscilloscope');
    this.spectrum = document.getElementById('spectrum');
    this.meterBar = document.getElementById('master-meter');

    this.populatePanels();
    this.bindMasterControls();
    this.attachKeyboard();
    this.applyStateToUI();
    this.loadState();
    document.getElementById('start-audio').addEventListener('click', async () => {
      try {
        await this.synth.init();
        this.synth.renderVisualisers(this.scope, this.spectrum, this.meterBar);
        this.applyStateToEngine();
        document.getElementById('start-audio').disabled = true;
        document.getElementById('start-audio').textContent = 'Audio Ready';
      } catch (err) {
        alert(err.message);
      }
    });
  }
  bindMasterControls() {
    const bpm = document.getElementById('bpm');
    bpm.addEventListener('input', () => {
      this.state.global.bpm = Number(bpm.value);
      this.persistState();
    });
    const swing = document.getElementById('swing');
    swing.addEventListener('input', () => {
      this.state.global.swing = Number(swing.value);
      this.persistState();
    });
    const volume = document.getElementById('master-volume');
    volume.addEventListener('input', () => {
      this.state.global.masterVolume = Number(volume.value);
      if (this.synth.initialised) this.synth.masterBus.setVolume(this.state.global.masterVolume);
      this.persistState();
    });
    const ceiling = document.getElementById('ceiling');
    ceiling.addEventListener('input', () => {
      this.state.global.limiterCeiling = Number(ceiling.value);
      if (this.synth.initialised) this.synth.masterBus.setCeiling(this.state.global.limiterCeiling);
      this.persistState();
    });
    const quality = document.getElementById('quality');
    quality.addEventListener('change', () => {
      this.state.global.quality = Number(quality.value);
      this.persistState();
    });
  }
  populatePanels() {
    if (!this.state.sequencer) {
      this.state.sequencer = createDefaultState().sequencer;
    }
    this.buildOscPanel();
    this.buildSubPanel();
    this.buildFMPanel();
    this.buildFilterPanel();
    this.buildEnvelopePanel();
    this.buildFXPanel();
    this.buildModMatrixPanel();
    this.buildPresetPanel();
    this.buildSequencerPanel();
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
    const control = this.controlElement({ label, type, min, max, step, options, value: initialValue, id });
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
  controlElement({ label, type = 'range', min = 0, max = 1, step = 0.01, value = 0, options = [], id }) {
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
    wrap.appendChild(input);
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
          id: `${key}-table`
        },
        {
          label: 'Morph',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.01,
          path: `${basePath}.morph`,
          id: `${key}-morph`
        },
        {
          label: 'Coarse Tune',
          type: 'number',
          min: -24,
          max: 24,
          step: 1,
          path: `${basePath}.tune`,
          id: `${key}-tune`
        },
        {
          label: 'Fine',
          type: 'range',
          min: -1,
          max: 1,
          step: 0.001,
          path: `${basePath}.fine`,
          id: `${key}-fine`
        },
        {
          label: 'Level',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.01,
          path: `${basePath}.level`,
          id: `${key}-level`
        },
        {
          label: 'Pan',
          type: 'range',
          min: -1,
          max: 1,
          step: 0.01,
          path: `${basePath}.pan`,
          id: `${key}-pan`
        }
      ]);
    });
  }
  buildSubPanel() {
    const panel = document.getElementById('mixer-panel');
    panel.innerHTML = '';
    this.createControls(panel, [
      { label: 'Sub Level', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.level', id: 'sub-level' },
      { label: 'Square Blend %', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.squareBlend', id: 'sub-square' },
      { label: 'Saturation', type: 'range', min: 0, max: 1, step: 0.01, path: 'sub.saturation', id: 'sub-sat' },
      { label: 'Mono/Legato', type: 'checkbox', path: 'sub.legato', id: 'sub-legato' }
    ]);
  }
  buildFMPanel() {
    const panel = document.getElementById('osc-panel');
    this.createControls(panel, [
      { label: 'FM Ratio', type: 'range', min: 0.25, max: 8, step: 0.01, path: 'fm.ratio', id: 'fm-ratio' },
      { label: 'FM Index', type: 'range', min: 0, max: 2, step: 0.01, path: 'fm.index', id: 'fm-index' },
      { label: 'Index Attack', type: 'range', min: 0, max: 1, step: 0.001, path: 'fm.attack', id: 'fm-attack' },
      { label: 'Index Decay', type: 'range', min: 0, max: 1.5, step: 0.001, path: 'fm.decay', id: 'fm-decay' },
      { label: 'Vel→Index', type: 'range', min: 0, max: 1, step: 0.01, path: 'fm.velocityToIndex', id: 'fm-vel' }
    ]);
  }
  buildFilterPanel() {
    const panel = document.getElementById('filter-panel');
    panel.innerHTML = '';
    ['filter1', 'filter2'].forEach((key, index) => {
      const basePath = `filters.${key}`;
      this.createControls(panel, [
        { label: `Filter ${index + 1} Type`, type: 'select', options: FILTER_TYPE_OPTIONS, path: `${basePath}.type`, id: `${key}-type` },
        { label: 'Cutoff (Hz)', type: 'number', min: 20, max: 20000, step: 1, path: `${basePath}.cutoff`, id: `${key}-cutoff` },
        { label: 'Resonance', type: 'range', min: 0.1, max: 2.5, step: 0.01, path: `${basePath}.resonance`, id: `${key}-res` },
        { label: 'Drive', type: 'range', min: 1, max: 2.5, step: 0.01, path: `${basePath}.drive`, id: `${key}-drive` },
        { label: 'Env Amount', type: 'number', min: 0, max: 2000, step: 1, path: `${basePath}.envAmount`, id: `${key}-env` },
        { label: 'Keytrack %', type: 'range', min: 0, max: 1, step: 0.01, path: `${basePath}.keytrack`, id: `${key}-keytrack` }
      ]);
    });
    this.createControls(panel, [
      { label: 'Serial Routing', type: 'checkbox', path: 'filters.routing.serial', id: 'filters-serial' },
      { label: 'Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'filters.routing.mix', id: 'filters-mix' }
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
          id: `${key}-${stage}`
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
      { label: 'Chorus Depth', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.chorus.depth', id: 'chorus-depth' },
      { label: 'Chorus Rate', type: 'range', min: 0.05, max: 5, step: 0.01, path: 'fx.chorus.rate', id: 'chorus-rate' },
      { label: 'Delay Time', type: 'range', min: 0.05, max: 1.5, step: 0.01, path: 'fx.delay.time', id: 'delay-time' },
      { label: 'Delay Feedback', type: 'range', min: 0, max: 0.95, step: 0.01, path: 'fx.delay.feedback', id: 'delay-feedback' },
      { label: 'Delay Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.delay.mix', id: 'delay-mix' },
      { label: 'Reverb Mix', type: 'range', min: 0, max: 1, step: 0.01, path: 'fx.reverb.mix', id: 'reverb-mix' },
      { label: 'Sidechain Amt', type: 'range', min: 0, max: 1, step: 0.01, path: 'sidechain.amount', id: 'sidechain-amount' },
      { label: 'SC Attack', type: 'range', min: 0.005, max: 0.2, step: 0.001, path: 'sidechain.attack', id: 'sidechain-attack' },
      { label: 'SC Release', type: 'range', min: 0.05, max: 1.2, step: 0.01, path: 'sidechain.release', id: 'sidechain-release' },
      {
        label: 'SC Source',
        type: 'select',
        options: [
          { value: 'internal', label: 'Internal Drums' },
          { value: 'external', label: 'Master Mix' }
        ],
        path: 'sidechain.source',
        id: 'sidechain-source'
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
        { label: `Source ${i + 1}`, type: 'select', options: MOD_SOURCE_OPTIONS, path: `${basePath}.source`, id: `mod-${i}-source` },
        { label: `Destination ${i + 1}`, type: 'text', path: `${basePath}.destination`, id: `mod-${i}-dest`, event: 'change' },
        { label: `Amount ${i + 1}`, type: 'range', min: -1, max: 1, step: 0.01, path: `${basePath}.amount`, id: `mod-${i}-amount` }
      ]);
    }
  }
  buildPresetPanel() {
    const panel = document.getElementById('preset-panel');
    panel.innerHTML = '';
    const presetSelect = this.controlElement({ label: 'Factory Preset', type: 'select', options: this.synth.presetManager.list(), id: 'preset-select' });
    presetSelect.input.addEventListener('change', () => {
      const preset = this.synth.presetManager.get(presetSelect.input.value);
      if (preset) {
        this.state = deepClone({ ...createDefaultState(), ...preset });
        this.populatePanels();
        this.applyStateToUI();
        this.updateEngine();
      }
    });
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

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Copy JSON';
    exportBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(this.state, null, 2));
    });
    panel.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.textContent = 'Paste JSON';
    importBtn.addEventListener('click', async () => {
      const text = await navigator.clipboard?.readText();
      if (!text) return;
      try {
        const json = JSON.parse(text);
        this.state = json;
        this.populatePanels();
        this.applyStateToUI();
        this.updateEngine();
      } catch (err) {
        alert('Invalid preset JSON');
      }
    });
    panel.appendChild(importBtn);
  }
  buildSequencerPanel() {
    const panel = document.getElementById('seq-panel');
    panel.innerHTML = '';
    const controls = document.createElement('div');
    controls.className = 'seq-controls';

    const playBtn = document.createElement('button');
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => {
      if (!this.synth.initialised) return;
      this.synth.sequencer.start();
    });
    controls.appendChild(playBtn);

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', () => {
      this.synth.sequencer.stop();
    });
    controls.appendChild(stopBtn);

    panel.appendChild(controls);

    const template = document.getElementById('lane-step-template');
    this.state.sequencer.lanes.forEach((lane, laneIndex) => {
      const laneContainer = document.createElement('div');
      laneContainer.className = 'seq-lane';

      while (lane.pattern.length < lane.steps) {
        lane.pattern.push(createDefaultStep(lane.defaultNote || 'C2'));
      }
      if (lane.pattern.length > lane.steps) {
        lane.pattern.length = lane.steps;
      }

      const header = document.createElement('div');
      header.className = 'lane-header';
      const title = document.createElement('span');
      title.textContent = `${lane.name}`;
      header.appendChild(title);

      const lengthInput = document.createElement('input');
      lengthInput.type = 'number';
      lengthInput.min = 1;
      lengthInput.max = 64;
      lengthInput.value = lane.steps;
      lengthInput.addEventListener('change', () => {
        let steps = Number(lengthInput.value);
        if (!Number.isFinite(steps)) steps = lane.steps;
        steps = Math.round(clamp(steps, 1, 64));
        lane.steps = steps;
        while (lane.pattern.length < steps) {
          lane.pattern.push(createDefaultStep(lane.defaultNote || 'C2'));
        }
        if (lane.pattern.length > steps) lane.pattern.length = steps;
        this.updateEngine();
        this.buildSequencerPanel();
      });
      header.appendChild(lengthInput);
      laneContainer.appendChild(header);

      const stepsWrap = document.createElement('div');
      stepsWrap.className = 'lane-steps';

      for (let i = 0; i < lane.steps; i += 1) {
        const stepData = lane.pattern[i] ?? createDefaultStep(lane.defaultNote || 'C2');
        lane.pattern[i] = stepData;
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector('.step-index').textContent = i + 1;
        const noteInput = node.querySelector('.step-note');
        noteInput.value = stepData.note ?? lane.defaultNote ?? 'C2';
        noteInput.addEventListener('change', () => {
          stepData.note = noteInput.value || lane.defaultNote || 'C2';
          this.updateEngine();
        });

        const velocityInput = node.querySelector('.step-velocity');
        velocityInput.value = stepData.velocity ?? 0.8;
        velocityInput.addEventListener('input', () => {
          stepData.velocity = clamp(Number(velocityInput.value), 0, 1);
          this.updateEngine();
        });

        const tieInput = node.querySelector('.step-tie');
        tieInput.checked = !!stepData.tie;
        tieInput.addEventListener('change', () => {
          stepData.tie = tieInput.checked;
          this.updateEngine();
        });

        const slideInput = node.querySelector('.step-slide');
        slideInput.checked = !!stepData.slide;
        slideInput.addEventListener('change', () => {
          stepData.slide = slideInput.checked;
          this.updateEngine();
        });

        const ratchetInput = node.querySelector('.step-ratchet');
        ratchetInput.value = stepData.ratchet ?? 1;
        ratchetInput.addEventListener('change', () => {
          stepData.ratchet = Math.max(1, Number(ratchetInput.value) || 1);
          this.updateEngine();
        });

        const probInput = node.querySelector('.step-prob');
        probInput.value = stepData.probability ?? 1;
        probInput.addEventListener('input', () => {
          stepData.probability = clamp(Number(probInput.value), 0, 1);
          this.updateEngine();
        });

        stepsWrap.appendChild(node);
      }
      laneContainer.appendChild(stepsWrap);
      panel.appendChild(laneContainer);
    });
  }
  applyStateToUI() {
    document.getElementById('bpm').value = this.state.global.bpm;
    document.getElementById('swing').value = this.state.global.swing;
    document.getElementById('master-volume').value = this.state.global.masterVolume;
    document.getElementById('ceiling').value = this.state.global.limiterCeiling;
    document.getElementById('quality').value = this.state.global.quality;
  }
  loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.applyStateToUI();
      return;
    }
    try {
      this.state = JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to load patch, using defaults');
      this.state = createDefaultState();
    }
    this.populatePanels();
    this.applyStateToUI();
    this.updateEngine();
  }
  persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
  updateEngine() {
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
