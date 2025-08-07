// This module contains stateless helper functions for the synthesizer logic.
// All functions operate on state objects passed in rather than keeping
// any internal state. They mirror the original logic from osc-app.js
// but are extracted so that the osc-app can delegate work and remain
// the single source of truth for application state.

/**
 * Create a pseudo‑random number generator seeded by a given string.
 * The returned function generates values in [0,1).
 * @param {string} seedStr
 * @returns {function(): number}
 */
export function mulberry32(seedStr) {
  let a = 0x6d2b79f5 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; ++i) a = Math.imul(a ^ seedStr.charCodeAt(i), 2654435761);
  return () => {
    a = Math.imul(a ^ (a >>> 15), 1 | a);
    return ((a >>> 16) & 0xffff) / 0x10000;
  };
}

/**
 * Deterministically generate a preset configuration for a given
 * seed and shape. This function is pure and has no side effects.
 * @param {string} seed
 * @param {string} shape
 * @returns {object}
 */
export function deterministicPreset(seed, shape) {
  const rng = mulberry32(seed + '_' + shape);
  const types = ['sine','triangle','square','sawtooth'];
  const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
  const modeRoll = rng();
  let mode = modeRoll < 0.18 ? 0 : modeRoll < 0.56 ? 1 : modeRoll < 0.85 ? 2 : 3;
  let lfoRate;
  if (mode === 0) lfoRate = 0.07 + rng() * 0.3;
  else if (mode === 1) lfoRate = 0.25 + rng() * 8;
  else if (mode === 2) lfoRate = 6 + rng() * 20;
  else lfoRate = 24 + rng() * 36;
  let lfoMin, lfoMax;
  if (mode === 0) {
    lfoMin = 400 + rng() * 400;
    lfoMax = 900 + rng() * 600;
  } else if (mode === 1) {
    lfoMin = 120 + rng() * 700;
    lfoMax = 1200 + rng() * 1400;
  } else {
    lfoMin = 80 + rng() * 250;
    lfoMax = 1500 + rng() * 3500;
  }
  const oscCount = mode === 3 ? 2 + (rng() > 0.7 ? 1 : 0) : 1 + (rng() > 0.6 ? 1 : 0);
  const oscs = [];
  for (let i = 0; i < oscCount; ++i) oscs.push([types[(rng() * types.length) | 0], notes[(rng() * notes.length) | 0]]);
  const filterBase = mode === 0 ? 700 + rng() * 500 : 300 + rng() * 2400;
  const resonance = 0.6 + rng() * 0.7;
  let env = {};
  if (mode === 0) env = { attack: 0.005 + rng() * 0.03, decay: 0.04 + rng() * 0.08, sustain: 0.1 + rng() * 0.2, release: 0.03 + rng() * 0.1 };
  else if (mode === 3) env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: 0.7 + rng() * 0.2, release: 8 + rng() * 24 };
  else env = { attack: 0.03 + rng() * 0.4, decay: 0.1 + rng() * 0.7, sustain: 0.2 + rng() * 0.5, release: 0.2 + rng() * 3 };
  const reverbWet = mode === 3 ? 0.4 + rng() * 0.5 : 0.1 + rng() * 0.5;
  const reverbRoom = mode === 3 ? 0.85 + rng() * 0.12 : 0.6 + rng() * 0.38;
  const colorSpeed = 0.06 + rng() * 0.22;
  const shapeDrift = 0.0006 + rng() * 0.0032;
  return {
    osc1: oscs[0],
    osc2: oscs[1] || null,
    filter: filterBase,
    filterQ: resonance,
    lfo: [lfoRate, lfoMin, lfoMax],
    envelope: env,
    reverb: { wet: reverbWet, roomSize: reverbRoom },
    colorSpeed,
    shapeDrift,
    seed: seed
  };
}

/**
 * Generate deterministic presets for all shapes given a seed.
 * @param {string} seed
 * @param {string[]} shapes
 * @returns {object}
 */
export function loadPresets(seed, shapes) {
  const presets = {};
  for (const k of shapes) {
    presets[k] = deterministicPreset(seed, k);
  }
  return presets;
}

/**
 * Create or rebuild the synthesizer chain for a given shape. This
 * function disposes any existing chain stored on the state and
 * constructs a new one based on the provided deterministic preset.
 * @param {object} state
 * @param {string} shape
 */
export async function bufferShapeChain(state, shape) {
  const pr = state.presets[shape];
  const Tone = state.Tone;
  if (!pr || !Tone) return;
  // Dispose any existing chain for this shape
  if (state.chains[shape]) {
    Object.values(state.chains[shape]).forEach(n => {
      try { n.stop?.(); } catch (_) {}
      try { n.dispose?.(); } catch (_) {}
    });
    delete state.chains[shape];
  }
  try {
    const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
    const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
    const volume = new Tone.Volume(5);
    const filter = new Tone.Filter(pr.filter, 'lowpass');
    filter.Q.value = pr.filterQ;
    const lfo = new Tone.LFO(pr.lfo[0], pr.lfo[1], pr.lfo[2]).start();
    const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
    const analyser = Tone.context.createAnalyser();
    analyser.fftSize = 2048;
    lfo.connect(filter.frequency);
    if (osc2) lfo.connect(osc2.detune);
    osc1.connect(volume);
    if (osc2) osc2.connect(volume);
    volume.connect(filter);
    filter.connect(reverb);
    filter.connect(analyser);
    state.chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
  } catch (e) {
    console.error('Error buffering chain for shape', shape, e);
    delete state.chains[shape];
  }
}

/**
 * Activate a previously buffered chain. Disconnects all existing
 * reverb connections and connects the chosen chain to the destination.
 * Also updates the analyser reference on the canvas element.
 * @param {object} state
 * @param {string} shape
 * @param {HTMLElement} canvas
 */
export function setActiveChain(state, shape, canvas) {
  // Disconnect all reverb outputs
  for (const s in state.chains) {
    state.chains[s]?.reverb?.disconnect();
  }
  const chain = state.chains[shape];
  chain?.reverb?.toDestination();
  state.current = shape;
  // Provide analyser to the canvas
  if (chain?.analyser) {
    canvas.analyser = chain.analyser;
    canvas.isAudioStarted = true;
    canvas.isPlaying = state.isPlaying;
  }
}

/**
 * Dispose all buffered chains and reset the current selection.
 * @param {object} state
 */
export function disposeAllChains(state) {
  for (const shape in state.chains) {
    const chain = state.chains[shape];
    if (!chain) continue;
    Object.values(chain).forEach(n => {
      try { n.stop?.(); } catch (_) {}
      try { n.dispose?.(); } catch (_) {}
    });
  }
  state.chains = {};
  state.current = null;
}