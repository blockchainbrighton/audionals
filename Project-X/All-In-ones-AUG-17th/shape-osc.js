// shape-osc.js — Headless "Shape" synth inspired by your Tone.js app
// Drop-in Web Audio module compatible with your sequencer loader
// API: default export (ctx) => { noteOn(midi,t,dur,vel), setParams(obj), getParams(), paramsSchema, getShapes(), getPreset() }

export default function createShapeSynth(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // --- Common modulation & FX (global nodes reused across voices) ---
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1.0;
  lfo.start();

  const lfoAmtFilter = ctx.createGain();
  lfoAmtFilter.gain.value = 0; // mapped to Hz via AudioParam

  const lfoAmtDetune = ctx.createGain();
  lfoAmtDetune.gain.value = 0; // in cents to osc.detune

  // Simple stereo late-reflection network to mimic reverb-ish ambience
  const combL = mkComb(0.029, 0.65);
  const combR = mkComb(0.037, 0.62);
  const ap1L = mkAllpass(0.011);
  const ap1R = mkAllpass(0.013);

  const wet = ctx.createGain();
  wet.gain.value = 0.25;

  const dry = ctx.createGain();
  dry.gain.value = 0.75;

  const merger = ctx.createChannelMerger(2);
  combL.out.connect(ap1L).connect(merger, 0, 0);
  combR.out.connect(ap1R).connect(merger, 0, 1);

  const reverbIn = ctx.createGain();
  reverbIn.connect(combL.in);
  reverbIn.connect(combR.in);

  const reverbOut = ctx.createGain();
  merger.connect(reverbOut);
  reverbOut.connect(wet);

  dry.connect(master);
  wet.connect(master);

  // --- Params (mirrors app semantics) ---
  const TYPES = ['sine', 'triangle', 'square', 'sawtooth'];
  const SHAPES = [
    'circle',
    'square',
    'butterfly',
    'lissajous',
    'spiro',
    'harmonograph',
    'rose',
    'hypocycloid',
    'epicycloid'
  ];

  const P = {
    // mix/output
    level: 0.9,
    // oscillators
    osc1Type: 0,            // 0..3 index into TYPES
    osc2Type: 2,            // 0..3
    osc2Enable: 1,          // 0/1
    detuneCents: 4,         // detune spread for osc2
    // filter
    filterBase: 800,        // Hz base
    filterQ: 0.8,           // Q
    // LFO (to filter freq and osc2 detune)
    lfoRate: 0.5,           // Hz
    lfoMinHz: 200,          // filter min
    lfoMaxHz: 1500,         // filter max
    lfoToDetune: 0.4,       // 0..1 scale to osc2.detune
    // envelope
    attack: 0.02,
    decay: 0.25,
    sustain: 0.4,
    release: 0.35,
    // ambience
    reverbWet: 0.35,        // 0..1
    roomSize: 0.7,          // 0..1 (maps to comb feedback)
    // visuals-aligned (exposed for completeness)
    colorSpeed: 0.12,
    shapeDrift: 0.002,
    // preset system
    shapeIndex: 0,          // 0..8 corresponds to SHAPES
    seed: 'default',        // string
    seedHash: 0.42          // 0..1 numeric surrogate (UI editable)
  };

  // --- Helpers (comb/allpass, rng, midi) ---
  function mkComb(delaySec, fb) {
    const d = ctx.createDelay(1.0);
    d.delayTime.value = delaySec;
    const g = ctx.createGain();
    g.gain.value = fb;
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.connect(d);
    d.connect(g);
    g.connect(d);
    d.connect(output);
    return {
      in: input,
      out: output,
      setFeedback: v => { g.gain.value = v; },
      setDelay: v => { d.delayTime.value = v; }
    };
  }

  function mkAllpass(delaySec) {
    const d = ctx.createDelay(1.0);
    d.delayTime.value = delaySec;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const input = ctx.createGain();
    const sum = ctx.createGain();
    const inv = ctx.createGain();
    inv.gain.value = -1;

    input.connect(sum);
    input.connect(d);
    d.connect(g);
    g.connect(sum);
    d.connect(inv);
    inv.connect(input);

    return sum; // simple AP wrapper
  }

  function midiToHz(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function hash01(str) {
    let a = 0x6d2b79f5 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      a = Math.imul(a ^ str.charCodeAt(i), 2654435761);
    }
    a ^= a >>> 15;
    a ^= a >>> 7;
    return ((a >>> 0) % 1_000_000) / 1_000_000;
  }

  function rngFromSeed(s) {
    let x = Math.floor(hash01(s) * 1e9) >>> 0;
    return () => {
      x = (1664525 * x + 1013904223) >>> 0;
      return (x >>> 8) / 16777216;
    };
  }

  // NEW: map 0..1 slider to a reproducible seed string
  function seedFromHash01(x) {
    const n = Math.floor(clamp(x, 0, 1) * 1_000_000); // 1e6 buckets
    return `s-${n.toString(36)}`;
  }

  // --- Voice ---
  class Voice {
    constructor(freq, vel) {
      const now = ctx.currentTime;

      this.fund = ctx.createOscillator();
      this.fund.type = TYPES[P.osc1Type | 0];

      this.over = ctx.createOscillator();
      this.over.type = TYPES[P.osc2Type | 0];

      this.v = ctx.createGain();
      this.v.gain.value = 0;

      this.lp = ctx.createBiquadFilter();
      this.lp.type = 'lowpass';

      this.fund.frequency.setValueAtTime(freq, now);
      this.over.frequency.setValueAtTime(freq, now);
      if (this.over.detune) {
        this.over.detune.setValueAtTime(P.detuneCents, now);
      }

      // LFO routes
      lfo.connect(lfoAmtFilter);
      lfoAmtFilter.connect(this.lp.frequency);
      if (this.over.detune) {
        lfo.connect(lfoAmtDetune);
        lfoAmtDetune.connect(this.over.detune);
      }

      // Filter range mapping
      const minF = Math.max(40, P.lfoMinHz);
      const maxF = Math.max(minF + 1, P.lfoMaxHz);
      this.lp.frequency.setValueAtTime(P.filterBase, now);
      lfoAmtFilter.gain.setValueAtTime((maxF - minF) * 0.5, now);

      // center offset so LFO swings around midpoint
      const center = (maxF + minF) * 0.5;
      const bias = ctx.createConstantSource();
      bias.offset.value = center;
      bias.start();
      bias.connect(this.lp.frequency);

      // detune LFO depth in cents
      lfoAmtDetune.gain.setValueAtTime(100 * P.lfoToDetune, now);

      // Envelope
      const a = Math.max(0.001, P.attack);
      const d = Math.max(0.01, P.decay);
      const s = clamp(P.sustain, 0, 1);
      const r = Math.max(0.02, P.release);
      const peak = clamp(0.35 + vel * 0.8, 0.01, 1);

      this.v.gain.cancelScheduledValues(now);
      this.v.gain.setValueAtTime(0, now);
      this.v.gain.linearRampToValueAtTime(peak, now + a);
      this.v.gain.linearRampToValueAtTime(peak * s, now + a + d);

      // chain: osc -> filter -> split dry/wet -> master
      const pre = ctx.createGain();
      this.fund.connect(pre);
      this.over.connect(pre);
      pre.connect(this.lp).connect(this.v);

      // split
      const tap = ctx.createGain();
      this.v.connect(tap);
      tap.connect(dry);
      tap.connect(reverbIn);

      this.fund.start(now);
      this.over.start(now);

      this.stop = (at) => {
        const t = Math.max(ctx.currentTime, at);
        this.v.gain.cancelScheduledValues(t);
        this.v.gain.setValueAtTime(this.v.gain.value, t);
        this.v.gain.linearRampToValueAtTime(0.0003, t + r);
        this.fund.stop(t + r + 0.02);
        this.over.stop(t + r + 0.02);
      };
    }
  }

  const active = new Set();

  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const v = new Voice(midiToHz(midi), vel);
    active.add(v);
    const offAt = t + Math.max(dur, P.attack + P.decay * 0.6);
    v.stop(offAt);
    setTimeout(() => active.delete(v), (offAt - ctx.currentTime + P.release + 0.1) * 1000);
  }

  // --- Param plumbing ---
  function applyParams() {
    master.gain.setValueAtTime(clamp(P.level, 0, 1), ctx.currentTime);

    // Update global LFO & wet mix
    lfo.frequency.setTargetAtTime(Math.max(0.05, P.lfoRate), ctx.currentTime, 0.05);
    wet.gain.setTargetAtTime(clamp(P.reverbWet, 0, 1), ctx.currentTime, 0.1);
    dry.gain.setTargetAtTime(1 - clamp(P.reverbWet, 0, 1), ctx.currentTime, 0.1);

    // Room size maps to comb feedback & delay
    const fb = 0.4 + 0.5 * clamp(P.roomSize, 0, 1);
    combL.setFeedback(fb);
    combR.setFeedback(fb * 0.98);
    combL.setDelay(0.021 + 0.02 * P.roomSize);
    combR.setDelay(0.028 + 0.02 * P.roomSize);

    // Live updates for ringing voices
    active.forEach(vx => {
      vx.lp.Q.setTargetAtTime(clamp(P.filterQ, 0.1, 12), ctx.currentTime, 0.05);
      vx.over.type = TYPES[P.osc2Type | 0];
      vx.fund.type = TYPES[P.osc1Type | 0];
    });
  }

  function setParams(next) {
    if (!next) return;

    Object.assign(P, next);

    // If user passed a string seed, sync numeric hash
    if (typeof next.seed === 'string') {
      P.seedHash = hash01(next.seed);
    }

    // If user moved the seedHash slider, derive a seed string from it
    if (typeof next.seedHash === 'number') {
      P.seed = seedFromHash01(next.seedHash);
    }

    // If user passed shapeKey, map to index
    if (typeof next.shapeKey === 'string') {
      const idx = SHAPES.indexOf(next.shapeKey);
      if (idx >= 0) P.shapeIndex = idx;
    }

    // Regenerate preset if seed/shape changed or if seedHash slider was touched
    if (
      next.seed != null ||
      next.seedHash != null ||
      next.shapeIndex != null ||
      next.shapeKey != null
    ) {
      const out = deterministicPreset(
        P.seed ?? 'default',
        SHAPES[P.shapeIndex] ?? 'circle'
      );
      Object.assign(P, out);
      // keep UI echoes consistent
      P.seedHash = hash01(P.seed);
    }

    applyParams();
  }

  function getParams() {
    return { ...P, shapeKey: SHAPES[P.shapeIndex] };
  }

  // --- Preset system (mirrors your app logic) ---
  function deterministicPreset(seed, shape) {
    const rng = rngFromSeed(`${seed}_${shape}`);
    const pick = arr => arr[(rng() * arr.length) | 0];
    const types = TYPES;

    const modeRoll = rng();
    const mode = modeRoll < 0.18 ? 0 :
                 modeRoll < 0.56 ? 1 :
                 modeRoll < 0.85 ? 2 : 3;

    const oscCount = mode === 3 ?
      (2 + (rng() > 0.7 ? 1 : 0)) :
      (1 + (rng() > 0.6 ? 1 : 0));

    const o1 = pick(types);
    const o2 = oscCount > 1 ? pick(types) : pick(types);

    let lfoRate, lfoMin, lfoMax, filterBase, env;

    if (mode === 0) {
      lfoRate = 0.07 + rng() * 0.3;
      lfoMin = 400 + rng() * 400;
      lfoMax = 900 + rng() * 600;
      filterBase = 700 + rng() * 500;
      env = {
        attack: 0.005 + rng() * 0.03,
        decay: 0.04 + rng() * 0.08,
        sustain: 0.1 + rng() * 0.2,
        release: 0.03 + rng() * 0.1
      };
    } else if (mode === 1) {
      lfoRate = 0.25 + rng() * 8;
      lfoMin = 120 + rng() * 700;
      lfoMax = 1200 + rng() * 1400;
      filterBase = 300 + rng() * 2400;
      env = {
        attack: 0.03 + rng() * 0.4,
        decay: 0.1 + rng() * 0.7,
        sustain: 0.2 + rng() * 0.5,
        release: 0.2 + rng() * 3
      };
    } else if (mode === 2) {
      lfoRate = 6 + rng() * 20;
      lfoMin = 80 + rng() * 250;
      lfoMax = 1500 + rng() * 3500;
      filterBase = 300 + rng() * 2400;
      env = {
        attack: 0.03 + rng() * 0.4,
        decay: 0.1 + rng() * 0.7,
        sustain: 0.2 + rng() * 0.5,
        release: 0.2 + rng() * 3
      };
    } else {
      lfoRate = 24 + rng() * 36;
      lfoMin = 80 + rng() * 250;
      lfoMax = 1500 + rng() * 3500;
      filterBase = 300 + rng() * 2400;
      env = {
        attack: 2 + rng() * 8,
        decay: 4 + rng() * 20,
        sustain: 0.7 + rng() * 0.2,
        release: 8 + rng() * 24
      };
    }

    const reverbWet = mode === 3 ? (0.4 + rng() * 0.5) : (0.1 + rng() * 0.5);
    const roomSize = mode === 3 ? (0.85 + rng() * 0.12) : (0.6 + rng() * 0.38);

    return {
      seed,
      seedHash: hash01(seed),
      osc1Type: TYPES.indexOf(o1),
      osc2Type: TYPES.indexOf(o2),
      osc2Enable: 1,
      detuneCents: 4 + rng() * 6,
      lfoRate,
      lfoMinHz: lfoMin,
      lfoMaxHz: lfoMax,
      filterBase,
      filterQ: 0.6 + rng() * 0.7,
      attack: env.attack,
      decay: env.decay,
      sustain: env.sustain,
      release: env.release,
      reverbWet,
      roomSize,
      colorSpeed: 0.06 + rng() * 0.22,
      shapeDrift: 0.0006 + rng() * 0.0032
    };
  }

  // Initialize with default preset
  Object.assign(P, deterministicPreset(P.seed, SHAPES[P.shapeIndex]));
  applyParams();

  // Expose a UI schema for your dynamic controls
  const paramsSchema = [
    { key: 'level',       label: 'Level',            type: 'range', min: 0, max: 1, step: 0.01 },

    // --- NEW: Seed string text input (users can type any seed) ---
    { key: 'seed',        label: 'Seed',             type: 'text',  placeholder: 'e.g. neon-fox-42' },
    // --- UPDATED: Seed hash slider now *drives* the seed (0..1 -> seed string) ---
    { key: 'seedHash',    label: 'Seed (0–1)',       type: 'range', min: 0, max: 1, step: 0.001 },

    { key: 'shapeIndex',  label: 'Shape',            type: 'range', min: 0, max: 8, step: 1 },

    { key: 'osc1Type',    label: 'Osc1 Type',        type: 'range', min: 0, max: 3, step: 1 },
    { key: 'osc2Type',    label: 'Osc2 Type',        type: 'range', min: 0, max: 3, step: 1 },
    { key: 'osc2Enable',  label: 'Osc2 Enable',      type: 'range', min: 0, max: 1, step: 1 },
    { key: 'detuneCents', label: 'Detune ¢',         type: 'range', min: 0, max: 50, step: 0.1 },

    { key: 'filterBase',  label: 'Filter Base (Hz)', type: 'range', min: 80, max: 6000, step: 1 },
    { key: 'filterQ',     label: 'Filter Q',         type: 'range', min: 0.1, max: 12, step: 0.01 },

    { key: 'lfoRate',     label: 'LFO Rate (Hz)',    type: 'range', min: 0.05, max: 60, step: 0.01 },
    { key: 'lfoMinHz',    label: 'LFO Min (Hz)',     type: 'range', min: 40, max: 4000, step: 1 },
    { key: 'lfoMaxHz',    label: 'LFO Max (Hz)',     type: 'range', min: 80, max: 8000, step: 1 },
    { key: 'lfoToDetune', label: 'LFO→Detune',       type: 'range', min: 0, max: 1, step: 0.01 },

    { key: 'attack',      label: 'Attack (s)',       type: 'range', min: 0.001, max: 8, step: 0.001 },
    { key: 'decay',       label: 'Decay (s)',        type: 'range', min: 0.01, max: 20, step: 0.01 },
    { key: 'sustain',     label: 'Sustain',          type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release',     label: 'Release (s)',      type: 'range', min: 0.02, max: 24, step: 0.01 },

    { key: 'reverbWet',   label: 'Reverb Wet',       type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'roomSize',    label: 'Room Size',        type: 'range', min: 0, max: 1, step: 0.01 },

    { key: 'colorSpeed',  label: 'Color Speed',      type: 'range', min: 0, max: 1, step: 0.001 },
    { key: 'shapeDrift',  label: 'Shape Drift',      type: 'range', min: 0, max: 0.01, step: 0.0001 }
  ];

  return {
    noteOn,
    setParams,
    getParams,
    paramsSchema,
    getShapes: () => SHAPES.slice(),
    getPreset: () => deterministicPreset(P.seed, SHAPES[P.shapeIndex])
  };
}
