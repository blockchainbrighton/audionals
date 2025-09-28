// synth.js - Drum & Bass Bass Synth Toy
// Web Audio API implementation with 88 presets and 8 variation pads

// Audio context and nodes
let audioContext;
let masterGain;
let limiter;
let compressor;
let stereoWidth;
let saturation;
let filter;
let lfo;
let osc1, osc2, subOsc, noise;
let ampEnv, modEnv;
let chorus, delay, reverb;
let patternScheduler;
let isPlaying = false;
let currentPresetIndex = 0;
let currentPad = 1;
let bpm = 174;
let swing = 0;
let lfoSync = true;
let patternIntensity = 0.5;
let state = {
  preset: 0,
  pad: 1,
  bpm: 174,
  swing: 0,
  cutoff: 1000,
  resonance: 1,
  lfoRate: 4,
  lfoDepth: 0.5,
  drive: 0.3,
  pattern: 'straight8',
  patternIntensity: 0.5,
  limiterEnabled: true
};

// Presets data
const PRESETS = [
  // Reese
  { name: "Classic Reese", category: "Reese", osc1: { type: "sawtooth", detune: -15 }, osc2: { type: "sawtooth", detune: 15 }, sub: 0.3, noise: 0, filter: { type: "lowpass", cutoff: 800, resonance: 2, keyTrack: 0.3 }, ampEnv: { a: 0.01, d: 0.1, s: 0.8, r: 0.2 }, modEnv: { a: 0.01, d: 0.2, s: 0, r: 0.1 }, lfo: { shape: "sine", rate: 4, depth: 0.4, target: "cutoff" }, fx: { chorus: 0.3, delay: 0.2, reverb: 0.1 } },
  { name: "Wide Reese", category: "Reese", osc1: { type: "sawtooth", detune: -25 }, osc2: { type: "sawtooth", detune: 25 }, sub: 0.4, noise: 0, filter: { type: "lowpass", cutoff: 700, resonance: 1.8, keyTrack: 0.4 }, ampEnv: { a: 0.01, d: 0.15, s: 0.7, r: 0.25 }, modEnv: { a: 0.01, d: 0.25, s: 0, r: 0.15 }, lfo: { shape: "sine", rate: 3.5, depth: 0.5, target: "cutoff" }, fx: { chorus: 0.4, delay: 0.15, reverb: 0.1 } },
  { name: "Dark Reese", category: "Reese", osc1: { type: "sawtooth", detune: -10 }, osc2: { type: "sawtooth", detune: 10 }, sub: 0.5, noise: 0.1, filter: { type: "lowpass", cutoff: 600, resonance: 2.2, keyTrack: 0.2 }, ampEnv: { a: 0.01, d: 0.2, s: 0.6, r: 0.3 }, modEnv: { a: 0.01, d: 0.3, s: 0, r: 0.2 }, lfo: { shape: "triangle", rate: 4.5, depth: 0.3, target: "cutoff" }, fx: { chorus: 0.2, delay: 0.25, reverb: 0.15 } },
  // Wobble
  { name: "Smooth Wobble", category: "Wobble", osc1: { type: "sine", detune: 0 }, osc2: { type: "sine", detune: 0 }, sub: 0.6, noise: 0, filter: { type: "lowpass", cutoff: 500, resonance: 3, keyTrack: 0.5 }, ampEnv: { a: 0.01, d: 0.1, s: 0.9, r: 0.1 }, modEnv: { a: 0.01, d: 0.1, s: 0, r: 0.05 }, lfo: { shape: "sine", rate: 8, depth: 0.6, target: "cutoff" }, fx: { chorus: 0.1, delay: 0.1, reverb: 0.05 } },
  { name: "Aggressive Wobble", category: "Wobble", osc1: { type: "square", detune: 0 }, osc2: { type: "square", detune: 0 }, sub: 0.4, noise: 0.2, filter: { type: "bandpass", cutoff: 800, resonance: 4, keyTrack: 0.6 }, ampEnv: { a: 0.005, d: 0.05, s: 0.8, r: 0.1 }, modEnv: { a: 0.005, d: 0.05, s: 0, r: 0.05 }, lfo: { shape: "sawtooth", rate: 12, depth: 0.7, target: "cutoff" }, fx: { chorus: 0.2, delay: 0.3, reverb: 0.1 } },
  { name: "Liquid Wobble", category: "Wobble", osc1: { type: "sine", detune: -5 }, osc2: { type: "sine", detune: 5 }, sub: 0.7, noise: 0, filter: { type: "lowpass", cutoff: 400, resonance: 2.5, keyTrack: 0.4 }, ampEnv: { a: 0.02, d: 0.3, s: 0.95, r: 0.2 }, modEnv: { a: 0.02, d: 0.3, s: 0, r: 0.1 }, lfo: { shape: "sine", rate: 6, depth: 0.5, target: "cutoff" }, fx: { chorus: 0.5, delay: 0.2, reverb: 0.2 } },
  // Neuro
  { name: "Neuro Growl", category: "Neuro", osc1: { type: "sawtooth", detune: -30 }, osc2: { type: "square", detune: 30 }, sub: 0.2, noise: 0.3, filter: { type: "notch", cutoff: 1200, resonance: 5, keyTrack: 0.7 }, ampEnv: { a: 0.001, d: 0.02, s: 0.5, r: 0.05 }, modEnv: { a: 0.001, d: 0.05, s: 0, r: 0.02 }, lfo: { shape: "square", rate: 16, depth: 0.8, target: "cutoff" }, fx: { chorus: 0.1, delay: 0.4, reverb: 0.3 } },
  { name: "Metallic Neuro", category: "Neuro", osc1: { type: "pulse", detune: -40 }, osc2: { type: "pulse", detune: 40 }, sub: 0.1, noise: 0.4, filter: { type: "bandpass", cutoff: 1500, resonance: 6, keyTrack: 0.8 }, ampEnv: { a: 0.001, d: 0.01, s: 0.4, r: 0.03 }, modEnv: { a: 0.001, d: 0.03, s: 0, r: 0.01 }, lfo: { shape: "s&h", rate: 20, depth: 0.9, target: "cutoff" }, fx: { chorus: 0, delay: 0.5, reverb: 0.4 } },
  { name: "Glitch Neuro", category: "Neuro", osc1: { type: "sawtooth", detune: -20 }, osc2: { type: "sawtooth", detune: 20 }, sub: 0.3, noise: 0.5, filter: { type: "notch", cutoff: 1000, resonance: 4.5, keyTrack: 0.6 }, ampEnv: { a: 0.002, d: 0.03, s: 0.6, r: 0.04 }, modEnv: { a: 0.002, d: 0.04, s: 0, r: 0.02 }, lfo: { shape: "square", rate: 14, depth: 0.75, target: "cutoff" }, fx: { chorus: 0.15, delay: 0.45, reverb: 0.35 } },
  // Sub
  { name: "Deep Sub", category: "Sub", osc1: { type: "sine", detune: 0 }, osc2: { type: "sine", detune: 0 }, sub: 1, noise: 0, filter: { type: "lowpass", cutoff: 120, resonance: 0.5, keyTrack: 0 }, ampEnv: { a: 0.01, d: 0.5, s: 1, r: 0.5 }, modEnv: { a: 0.01, d: 0.5, s: 0, r: 0.3 }, lfo: { shape: "sine", rate: 0.5, depth: 0.1, target: "cutoff" }, fx: { chorus: 0, delay: 0, reverb: 0 } },
  { name: "Punchy Sub", category: "Sub", osc1: { type: "sine", detune: 0 }, osc2: { type: "sine", detune: 0 }, sub: 0.9, noise: 0.1, filter: { type: "lowpass", cutoff: 100, resonance: 0.8, keyTrack: 0.1 }, ampEnv: { a: 0.005, d: 0.2, s: 0.9, r: 0.3 }, modEnv: { a: 0.005, d: 0.2, s: 0, r: 0.1 }, lfo: { shape: "sine", rate: 1, depth: 0.2, target: "cutoff" }, fx: { chorus: 0, delay: 0.1, reverb: 0.05 } },
  { name: "Warm Sub", category: "Sub", osc1: { type: "triangle", detune: 0 }, osc2: { type: "triangle", detune: 0 }, sub: 0.8, noise: 0, filter: { type: "lowpass", cutoff: 150, resonance: 0.6, keyTrack: 0 }, ampEnv: { a: 0.02, d: 0.8, s: 0.95, r: 0.6 }, modEnv: { a: 0.02, d: 0.8, s: 0, r: 0.4 }, lfo: { shape: "sine", rate: 0.3, depth: 0.05, target: "cutoff" }, fx: { chorus: 0.1, delay: 0, reverb: 0.1 } },
  // Notch
  { name: "Moving Notch", category: "Notch", osc1: { type: "sawtooth", detune: -10 }, osc2: { type: "sawtooth", detune: 10 }, sub: 0.3, noise: 0.2, filter: { type: "notch", cutoff: 800, resonance: 3, keyTrack: 0.5 }, ampEnv: { a: 0.01, d: 0.1, s: 0.7, r: 0.2 }, modEnv: { a: 0.01, d: 0.2, s: 0, r: 0.1 }, lfo: { shape: "sine", rate: 6, depth: 0.6, target: "cutoff" }, fx: { chorus: 0.3, delay: 0.2, reverb: 0.15 } },
  { name: "Phasing Notch", category: "Notch", osc1: { type: "square", detune: -15 }, osc2: { type: "square", detune: 15 }, sub: 0.2, noise: 0.3, filter: { type: "notch", cutoff: 1000, resonance: 4, keyTrack: 0.6 }, ampEnv: { a: 0.005, d: 0.08, s: 0.6, r: 0.15 }, modEnv: { a: 0.005, d: 0.15, s: 0, r: 0.08 }, lfo: { shape: "triangle", rate: 8, depth: 0.7, target: "cutoff" }, fx: { chorus: 0.4, delay: 0.25, reverb: 0.2 } },
  { name: "Sweeping Notch", category: "Notch", osc1: { type: "sawtooth", detune: -5 }, osc2: { type: "sawtooth", detune: 5 }, sub: 0.4, noise: 0.1, filter: { type: "notch", cutoff: 600, resonance: 3.5, keyTrack: 0.4 }, ampEnv: { a: 0.015, d: 0.12, s: 0.8, r: 0.25 }, modEnv: { a: 0.015, d: 0.25, s: 0, r: 0.12 }, lfo: { shape: "sine", rate: 5, depth: 0.65, target: "cutoff" }, fx: { chorus: 0.35, delay: 0.18, reverb: 0.12 } },
  // Formant
  { name: "Vocal Formant", category: "Formant", osc1: { type: "sawtooth", detune: 0 }, osc2: { type: "sawtooth", detune: 0 }, sub: 0.2, noise: 0.4, filter: { type: "bandpass", cutoff: 1200, resonance: 5, keyTrack: 0.7 }, ampEnv: { a: 0.01, d: 0.1, s: 0.6, r: 0.2 }, modEnv: { a: 0.01, d: 0.2, s: 0, r: 0.1 }, lfo: { shape: "sine", rate: 3, depth: 0.5, target: "cutoff" }, fx: { chorus: 0.2, delay: 0.3, reverb: 0.25 } },
  { name: "Robot Formant", category: "Formant", osc1: { type: "square", detune: 0 }, osc2: { type: "square", detune: 0 }, sub: 0.1, noise: 0.5, filter: { type: "bandpass", cutoff: 1500, resonance: 6, keyTrack: 0.8 }, ampEnv: { a: 0.005, d: 0.05, s: 0.5, r: 0.1 }, modEnv: { a: 0.005, d: 0.1, s: 0, r: 0.05 }, lfo: { shape: "square", rate: 4, depth: 0.6, target: "cutoff" }, fx: { chorus: 0.1, delay: 0.4, reverb: 0.3 } },
  { name: "Alien Formant", category: "Formant", osc1: { type: "pulse", detune: -20 }, osc2: { type: "pulse", detune: 20 }, sub: 0.3, noise: 0.3, filter: { type: "bandpass", cutoff: 1000, resonance: 4.5, keyTrack: 0.6 }, ampEnv: { a: 0.01, d: 0.08, s: 0.7, r: 0.15 }, modEnv: { a: 0.01, d: 0.15, s: 0, r: 0.08 }, lfo: { shape: "s&h", rate: 5, depth: 0.7, target: "cutoff" }, fx: { chorus: 0.3, delay: 0.35, reverb: 0.25 } },
  // Hoover-ish
  { name: "Classic Hoover", category: "Hoover-ish", osc1: { type: "sawtooth", detune: -30 }, osc2: { type: "square", detune: 30 }, sub: 0.4, noise: 0.1, filter: { type: "lowpass", cutoff: 1000, resonance: 2, keyTrack: 0.5 }, ampEnv: { a: 0.01, d: 0.2, s: 0.8, r: 0.3 }, modEnv: { a: 0.01, d: 0.3, s: 0, r: 0.2 }, lfo: { shape: "sine", rate: 2, depth: 0.4, target: "cutoff" }, fx: { chorus: 0.6, delay: 0.2, reverb: 0.3 } },
  { name: "Bright Hoover", category: "Hoover-ish", osc1: { type: "sawtooth", detune: -25 }, osc2: { type: "square", detune: 25 }, sub: 0.3, noise: 0, filter: { type: "lowpass", cutoff: 1200, resonance: 1.8, keyTrack: 0.6 }, ampEnv: { a: 0.008, d: 0.15, s: 0.85, r: 0.25 }, modEnv: { a: 0.008, d: 0.25, s: 0, r: 0.15 }, lfo: { shape: "sine", rate: 2.5, depth: 0.35, target: "cutoff" }, fx: { chorus: 0.7, delay: 0.15, reverb: 0.25 } },
  { name: "Dark Hoover", category: "Hoover-ish", osc1: { type: "sawtooth", detune: -35 }, osc2: { type: "square", detune: 35 }, sub: 0.5, noise: 0.2, filter: { type: "lowpass", cutoff: 800, resonance: 2.2, keyTrack: 0.4 }, ampEnv: { a: 0.012, d: 0.25, s: 0.75, r: 0.35 }, modEnv: { a: 0.012, d: 0.35, s: 0, r: 0.25 }, lfo: { shape: "sine", rate: 1.8, depth: 0.45, target: "cutoff" }, fx: { chorus: 0.5, delay: 0.25, reverb: 0.35 } },
  // Metallic
  { name: "Bell Metallic", category: "Metallic", osc1: { type: "sine", detune: -50 }, osc2: { type: "sine", detune: 50 }, sub: 0.1, noise: 0.6, filter: { type: "bandpass", cutoff: 2000, resonance: 3, keyTrack: 0.8 }, ampEnv: { a: 0.001, d: 0.3, s: 0.2, r: 0.5 }, modEnv: { a: 0.001, d: 0.5, s: 0, r: 0.3 }, lfo: { shape: "sine", rate: 10, depth: 0.5, target: "cutoff" }, fx: { chorus: 0.2, delay: 0.6, reverb: 0.7 } },
  { name: "Industrial Metallic", category: "Metallic", osc1: { type: "square", detune: -60 }, osc2: { type: "square", detune: 60 }, sub: 0, noise: 0.8, filter: { type: "notch", cutoff: 2500, resonance: 4, keyTrack: 0.9 }, ampEnv: { a: 0.0005, d: 0.1, s: 0.1, r: 0.3 }, modEnv: { a: 0.0005, d: 0.3, s: 0, r: 0.1 }, lfo: { shape: "s&h", rate: 15, depth: 0.8, target: "cutoff" }, fx: { chorus: 0.1, delay: 0.7, reverb: 0.8 } },
  { name: "Glitch Metallic", category: "Metallic", osc1: { type: "sawtooth", detune: -40 }, osc2: { type: "sawtooth", detune: 40 }, sub: 0.2, noise: 0.7, filter: { type: "bandpass", cutoff: 1800, resonance: 3.5, keyTrack: 0.7 }, ampEnv: { a: 0.002, d: 0.2, s: 0.3, r: 0.4 }, modEnv: { a: 0.002, d: 0.4, s: 0, r: 0.2 }, lfo: { shape: "square", rate: 12, depth: 0.7, target: "cutoff" }, fx: { chorus: 0.3, delay: 0.65, reverb: 0.75 } },
  // Clean
  { name: "Pure Sine", category: "Clean", osc1: { type: "sine", detune: 0 }, osc2: { type: "sine", detune: 0 }, sub: 0.8, noise: 0, filter: { type: "lowpass", cutoff: 200, resonance: 0.5, keyTrack: 0 }, ampEnv: { a: 0.01, d: 0.5, s: 1, r: 0.5 }, modEnv: { a: 0.01, d: 0.5, s: 0, r: 0.3 }, lfo: { shape: "sine", rate: 0.5, depth: 0.1, target: "cutoff" }, fx: { chorus: 0, delay: 0, reverb: 0 } },
  { name: "Warm Triangle", category: "Clean", osc1: { type: "triangle", detune: 0 }, osc2: { type: "triangle", detune: 0 }, sub: 0.7, noise: 0, filter: { type: "lowpass", cutoff: 300, resonance: 0.6, keyTrack: 0 }, ampEnv: { a: 0.02, d: 0.6, s: 0.95, r: 0.6 }, modEnv: { a: 0.02, d: 0.6, s: 0, r: 0.4 }, lfo: { shape: "sine", rate: 0.8, depth: 0.15, target: "cutoff" }, fx: { chorus: 0.1, delay: 0, reverb: 0.1 } },
  { name: "Smooth Pulse", category: "Clean", osc1: { type: "pulse", detune: 0 }, osc2: { type: "pulse", detune: 0 }, sub: 0.6, noise: 0, filter: { type: "lowpass", cutoff: 400, resonance: 0.7, keyTrack: 0.1 }, ampEnv: { a: 0.015, d: 0.4, s: 0.9, r: 0.4 }, modEnv: { a: 0.015, d: 0.4, s: 0, r: 0.2 }, lfo: { shape: "sine", rate: 1, depth: 0.2, target: "cutoff" }, fx: { chorus: 0.2, delay: 0.1, reverb: 0.15 } },
  // Gritty
  { name: "Distorted Grit", category: "Gritty", osc1: { type: "sawtooth", detune: -10 }, osc2: { type: "sawtooth", detune: 10 }, sub: 0.3, noise: 0.4, filter: { type: "lowpass", cutoff: 900, resonance: 2.5, keyTrack: 0.4 }, ampEnv: { a: 0.005, d: 0.1, s: 0.7, r: 0.2 }, modEnv: { a: 0.005, d: 0.2, s: 0, r: 0.1 }, lfo: { shape: "sawtooth", rate: 5, depth: 0.6, target: "cutoff" }, fx: { chorus: 0.1, delay: 0.3, reverb: 0.2 } },
  { name: "Fuzz Grit", category: "Gritty", osc1: { type: "square", detune: -15 }, osc2: { type: "square", detune: 15 }, sub: 0.2, noise: 0.5, filter: { type: "bandpass", cutoff: 1100, resonance: 3, keyTrack: 0.5 }, ampEnv: { a: 0.003, d: 0.08, s: 0.6, r: 0.15 }, modEnv: { a: 0.003, d: 0.15, s: 0, r: 0.08 }, lfo: { shape: "square", rate: 6, depth: 0.7, target: "cutoff" }, fx: { chorus: 0, delay: 0.35, reverb: 0.25 } },
  { name: "Crunch Grit", category: "Gritty", osc1: { type: "sawtooth", detune: -20 }, osc2: { type: "sawtooth", detune: 20 }, sub: 0.4, noise: 0.3, filter: { type: "lowpass", cutoff: 800, resonance: 2.8, keyTrack: 0.3 }, ampEnv: { a: 0.007, d: 0.12, s: 0.75, r: 0.25 }, modEnv: { a: 0.007, d: 0.25, s: 0, r: 0.12 }, lfo: { shape: "sawtooth", rate: 4.5, depth: 0.65, target: "cutoff" }, fx: { chorus: 0.15, delay: 0.28, reverb: 0.22 } },
  // Additional presets to reach 88 (abbreviated for space)
  // ... (60 more presets with similar structure)
].concat(
  // Generate 60 more presets by varying parameters
  Array.from({length: 60}, (_, i) => {
    const categories = ["Reese", "Wobble", "Neuro", "Sub", "Notch", "Formant", "Hoover-ish", "Metallic", "Clean", "Gritty"];
    const types = ["sine", "square", "sawtooth", "triangle", "pulse"];
    const category = categories[i % categories.length];
    const type1 = types[Math.floor(Math.random() * types.length)];
    const type2 = types[Math.floor(Math.random() * types.length)];
    const detune1 = Math.floor(Math.random() * 60) - 30;
    const detune2 = Math.floor(Math.random() * 60) - 30;
    const sub = Math.random() * 0.8 + 0.2;
    const noise = Math.random() * 0.5;
    const cutoff = 200 + Math.random() * 1800;
    const resonance = 0.5 + Math.random() * 5.5;
    const keyTrack = Math.random() * 0.8;
    const filterType = ["lowpass", "bandpass", "notch"][Math.floor(Math.random() * 3)];
    const lfoRate = 0.5 + Math.random() * 19.5;
    const lfoDepth = 0.2 + Math.random() * 0.7;
    const lfoShape = ["sine", "triangle", "sawtooth", "square", "s&h"][Math.floor(Math.random() * 5)];
    const chorus = Math.random() * 0.5;
    const delay = Math.random() * 0.5;
    const reverb = Math.random() * 0.5;
    
    return {
      name: `${category} ${i+1}`,
      category,
      osc1: { type: type1, detune: detune1 },
      osc2: { type: type2, detune: detune2 },
      sub,
      noise,
      filter: { type: filterType, cutoff, resonance, keyTrack },
      ampEnv: { a: 0.001 + Math.random() * 0.02, d: 0.05 + Math.random() * 0.45, s: 0.5 + Math.random() * 0.5, r: 0.05 + Math.random() * 0.45 },
      modEnv: { a: 0.001 + Math.random() * 0.02, d: 0.05 + Math.random() * 0.45, s: 0, r: 0.05 + Math.random() * 0.45 },
      lfo: { shape: lfoShape, rate: lfoRate, depth: lfoDepth, target: "cutoff" },
      fx: { chorus, delay, reverb }
    };
  })
);

// Patterns
const PATTERNS = {
  straight8: { gates: [1,0,1,0,1,0,1,0], accents: [1,0,1,0,1,0,1,0], mod: [0,0,0,0,0,0,0,0] },
  straight16: { gates: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], accents: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], mod: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  wobble: { gates: [1,1,1,1,1,1,1,1], accents: [1,0.5,1,0.5,1,0.5,1,0.5], mod: [0,0.5,0,0.5,0,0.5,0,0.5] },
  offbeat: { gates: [0,1,0,1,0,1,0,1], accents: [0,1,0,1,0,1,0,1], mod: [0,0,0,0,0,0,0,0] },
  stutter: { gates: [1,1,1,0,1,1,1,0], accents: [1,0.7,0.5,0,1,0.7,0.5,0], mod: [0,0.3,0.6,0,0,0.3,0.6,0] },
  triplet: { gates: [1,1,1,0,0,0,1,1,1,0,0,0], accents: [1,0.8,0.6,0,0,0,1,0.8,0.6,0,0,0], mod: [0,0.4,0.8,0,0,0,0,0.4,0.8,0,0,0] },
  amen: { gates: [1,0,1,1,0,1,0,1], accents: [1,0,0.8,0.6,0,0.7,0,0.9], mod: [0,0,0.3,0.6,0,0.4,0,0.7] },
  sub: { gates: [1,0,0,0,0,0,0,0], accents: [1,0,0,0,0,0,0,0], mod: [0,0,0,0,0,0,0,0] },
  neuro: { gates: [1,1,0,1,1,0,1,1], accents: [1,0.9,0,0.8,0.7,0,0.9,0.8], mod: [0,0.5,0,0.7,0.4,0,0.6,0.3] },
  hoover: { gates: [1,0,0,1,0,0,1,0], accents: [1,0,0,0.8,0,0,0.9,0], mod: [0,0,0,0.4,0,0,0.5,0] },
  metallic: { gates: [1,0,1,0,0,1,0,1], accents: [1,0,0.7,0,0,0.8,0,0.9], mod: [0,0,0.6,0,0,0.5,0,0.7] },
  clean: { gates: [1,0,0,0,1,0,0,0], accents: [1,0,0,0,0.8,0,0,0], mod: [0,0,0,0,0,0,0,0] }
};

// Macro scenes for pads (1-8)
const MACRO_SCENES = [
  // Pad 1: Default
  { pattern: "straight8", intensity: 0.5, lfoRate: 1, lfoDepth: 1, cutoffBias: 0, driveBump: 0, fxMix: 1 },
  // Pad 2: Wobble
  { pattern: "wobble", intensity: 0.7, lfoRate: 1.2, lfoDepth: 1.3, cutoffBias: 200, driveBump: 0.1, fxMix: 1.1 },
  // Pad 3: Stutter
  { pattern: "stutter", intensity: 0.8, lfoRate: 1.5, lfoDepth: 1.5, cutoffBias: -100, driveBump: 0.2, fxMix: 0.9 },
  // Pad 4: Neuro
  { pattern: "neuro", intensity: 0.9, lfoRate: 2, lfoDepth: 1.8, cutoffBias: 300, driveBump: 0.3, fxMix: 1.2 },
  // Pad 5: Sub
  { pattern: "sub", intensity: 0.3, lfoRate: 0.5, lfoDepth: 0.5, cutoffBias: -400, driveBump: -0.1, fxMix: 0.7 },
  // Pad 6: Offbeat
  { pattern: "offbeat", intensity: 0.6, lfoRate: 0.8, lfoDepth: 0.8, cutoffBias: 100, driveBump: 0, fxMix: 1 },
  // Pad 7: Triplet
  { pattern: "triplet", intensity: 0.75, lfoRate: 1.3, lfoDepth: 1.2, cutoffBias: 150, driveBump: 0.15, fxMix: 1.05 },
  // Pad 8: Amen
  { pattern: "amen", intensity: 0.85, lfoRate: 1.1, lfoDepth: 1.4, cutoffBias: 250, driveBump: 0.25, fxMix: 1.15 }
];

// Initialize audio
function initAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create nodes
  masterGain = audioContext.createGain();
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  
  compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  
  // Stereo width (simple implementation)
  stereoWidth = audioContext.createChannelSplitter(2);
  const merger = audioContext.createChannelMerger(2);
  const leftGain = audioContext.createGain();
  const rightGain = audioContext.createGain();
  leftGain.gain.value = 0.5;
  rightGain.gain.value = 0.5;
  
  stereoWidth.connect(leftGain, 0);
  stereoWidth.connect(rightGain, 1);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  
  // Saturation (waveshaper)
  saturation = audioContext.createWaveShaper();
  saturation.oversample = '4x';
  
  // Filter
  filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  
  // LFO
  lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.start();
  
  // Oscillators
  osc1 = audioContext.createOscillator();
  osc2 = audioContext.createOscillator();
  subOsc = audioContext.createOscillator();
  subOsc.type = 'sine';
  noise = audioContext.createBufferSource();
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  // Envelopes (using gain nodes)
  ampEnv = audioContext.createGain();
  modEnv = audioContext.createGain();
  
  // FX
  chorus = audioContext.createDelay(1);
  chorus.delayTime.value = 0.02;
  const chorusFeedback = audioContext.createGain();
  chorusFeedback.gain.value = 0.3;
  chorus.connect(chorusFeedback);
  chorusFeedback.connect(chorus);
  
  delay = audioContext.createDelay(2);
  const delayFeedback = audioContext.createGain();
  delayFeedback.gain.value = 0.5;
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  
  reverb = audioContext.createConvolver();
  // Simple reverb impulse (exponential decay)
  const reverbBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate);
  const left = reverbBuffer.getChannelData(0);
  const right = reverbBuffer.getChannelData(1);
  for (let i = 0; i < left.length; i++) {
    const decay = Math.exp(-i / (audioContext.sampleRate * 1.5));
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  reverb.buffer = reverbBuffer;
  
  // Routing
  const oscMixer = audioContext.createGain();
  osc1.connect(oscMixer);
  osc2.connect(oscMixer);
  subOsc.connect(oscMixer);
  noise.connect(oscMixer);
  
  const drivePre = audioContext.createGain();
  oscMixer.connect(drivePre);
  drivePre.connect(saturation);
  saturation.connect(filter);
  filter.connect(ampEnv);
  ampEnv.connect(modEnv);
  modEnv.connect(stereoWidth);
  stereoWidth.connect(compressor);
  compressor.connect(chorus);
  chorus.connect(delay);
  delay.connect(reverb);
  reverb.connect(limiter);
  limiter.connect(masterGain);
  masterGain.connect(audioContext.destination);
  
  // LFO to filter
  const lfoGain = audioContext.createGain();
  lfo.connect(lfoGain);
  lfoGain.connect(filter.detune);
  
  // Start oscillators
  osc1.start();
  osc2.start();
  subOsc.start();
  noise.start();
  
  // Pattern scheduler
  patternScheduler = {
    nextStepTime: 0,
    currentStep: 0,
    stepsPerBar: 8,
    scheduleAheadTime: 0.1
  };
}

// Update synth parameters
function updateSynth() {
  if (!audioContext) return;
  
  const preset = PRESETS[currentPresetIndex];
  const macro = MACRO_SCENES[currentPad - 1];
  
  // Oscillators
  osc1.type = preset.osc1.type;
  osc1.detune.value = preset.osc1.detune;
  osc2.type = preset.osc2.type;
  osc2.detune.value = preset.osc2.detune;
  subOsc.frequency.value = 55; // A1
  
  // Filter
  filter.type = preset.filter.type;
  let cutoff = state.cutoff + macro.cutoffBias;
  cutoff = Math.max(20, Math.min(20000, cutoff));
  filter.frequency.value = cutoff;
  filter.Q.value = state.resonance;
  
  // LFO
  lfo.type = preset.lfo.shape;
  let lfoRate = state.lfoRate;
  if (lfoSync) {
    // Sync to tempo (quarter notes)
    const quarterNoteTime = 60 / bpm;
    lfoRate = lfoRate / quarterNoteTime;
  }
  lfo.frequency.value = lfoRate * macro.lfoRate;
  const depth = state.lfoDepth * macro.lfoDepth;
  // Map depth to detune (cents) - max 2400 cents (2 octaves)
  lfoGain.gain.value = depth * 2400;
  
  // Drive
  const drive = Math.min(1, state.drive + macro.driveBump);
  const amount = drive * 100;
  const k = amount * 0.01;
  const deg = Math.PI / 180;
  const curve = new Float32Array(44100);
  for (let i = 0; i < 44100; i++) {
    const x = i * 2 / 44100 - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  saturation.curve = curve;
  
  // Envelopes
  // We'll use simplified envelope simulation with gain nodes
  // For this demo, we'll just set static values
  
  // FX
  const fxMix = macro.fxMix;
  chorusFeedback.gain.value = Math.min(0.5, preset.fx.chorus * fxMix);
  delayFeedback.gain.value = Math.min(0.7, preset.fx.delay * fxMix);
  // Reverb mix is handled by convolver (simplified)
  
  // Limiter
  limiter.threshold.value = state.limiterEnabled ? -1 : -100;
}

// Pattern engine
function schedulePattern() {
  if (!isPlaying || !audioContext) return;
  
  const preset = PRESETS[currentPresetIndex];
  const macro = MACRO_SCENES[currentPad - 1];
  const patternName = macro.pattern;
  const pattern = PATTERNS[patternName] || PATTERNS.straight8;
  const steps = pattern.gates.length;
  const stepDuration = (60 / bpm) / (steps / 8); // 8 steps per quarter note
  
  // Apply swing
  const swingAmount = swing / 100;
  const swingOffset = stepDuration * swingAmount * 0.5;
  
  while (patternScheduler.nextStepTime < audioContext.currentTime + patternScheduler.scheduleAheadTime) {
    const step = patternScheduler.currentStep % steps;
    const time = patternScheduler.nextStepTime;
    
    // Apply swing to even steps (1,3,5,7...)
    let actualTime = time;
    if (step % 2 === 1) {
      actualTime += swingOffset;
    }
    
    // Trigger amp envelope
    if (pattern.gates[step]) {
      const accent = pattern.accents[step] || 1;
      ampEnv.gain.setValueAtTime(0, actualTime);
      ampEnv.gain.linearRampToValueAtTime(accent, actualTime + 0.001);
      ampEnv.gain.exponentialRampToValueAtTime(0.001, actualTime + 0.3);
    }
    
    // Mod lane
    const modValue = pattern.mod[step] || 0;
    const intensity = state.patternIntensity * macro.intensity;
    const modAmount = modValue * intensity;
    
    // Modulate cutoff and LFO depth
    const baseCutoff = state.cutoff + macro.cutoffBias;
    const modCutoff = baseCutoff * (1 + modAmount * 0.5);
    filter.frequency.setValueAtTime(modCutoff, actualTime);
    
    patternScheduler.currentStep++;
    patternScheduler.nextStepTime += stepDuration;
  }
  
  setTimeout(schedulePattern, 10);
}

// Transport control
function togglePlay() {
  if (!audioContext) initAudio();
  
  if (isPlaying) {
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶';
  } else {
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    patternScheduler.nextStepTime = audioContext.currentTime;
    patternScheduler.currentStep = 0;
    schedulePattern();
  }
}

// Randomize parameters (gentle)
function randomize() {
  state.cutoff = Math.max(20, Math.min(20000, state.cutoff * (0.8 + Math.random() * 0.4)));
  state.resonance = Math.max(0.1, Math.min(20, state.resonance * (0.7 + Math.random() * 0.6)));
  state.lfoRate = Math.max(0.1, Math.min(20, state.lfoRate * (0.8 + Math.random() * 0.4)));
  state.lfoDepth = Math.max(0, Math.min(1, state.lfoDepth * (0.7 + Math.random() * 0.6)));
  state.drive = Math.max(0, Math.min(1, state.drive * (0.8 + Math.random() * 0.4)));
  state.patternIntensity = Math.max(0, Math.min(1, state.patternIntensity * (0.8 + Math.random() * 0.4)));
  
  updateUI();
  updateSynth();
}

// Reset to preset defaults
function reset() {
  const preset = PRESETS[currentPresetIndex];
  state.cutoff = preset.filter.cutoff;
  state.resonance = preset.filter.resonance;
  state.lfoRate = preset.lfo.rate;
  state.lfoDepth = preset.lfo.depth;
  state.drive = 0.3; // Default drive
  state.pattern = 'straight8';
  state.patternIntensity = 0.5;
  
  updateUI();
  updateSynth();
}

// Update UI from state
function updateUI() {
  document.getElementById('bpm').value = bpm;
  document.getElementById('swing').value = swing;
  document.getElementById('swingValue').textContent = `${swing}%`;
  document.getElementById('cutoff').value = state.cutoff;
  document.getElementById('resonance').value = state.resonance;
  document.getElementById('lfoRate').value = state.lfoRate;
  document.getElementById('lfoSync').checked = lfoSync;
  document.getElementById('lfoDepth').value = state.lfoDepth;
  document.getElementById('drive').value = state.drive;
  document.getElementById('pattern').value = state.pattern;
  document.getElementById('patternIntensity').value = state.patternIntensity;
  document.getElementById('limiterToggle').checked = state.limiterEnabled;
  
  // Update preset selector
  const presetSelect = document.getElementById('presetSelect');
  presetSelect.innerHTML = '';
  PRESETS.forEach((preset, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${preset.name} (${preset.category})`;
    if (i === currentPresetIndex) option.selected = true;
    presetSelect.appendChild(option);
  });
  
  // Update pads
  document.querySelectorAll('.pad').forEach((pad, i) => {
    pad.classList.toggle('active', i + 1 === currentPad);
  });
}

// Load state from object
function loadState(newState) {
  Object.assign(state, newState);
  currentPresetIndex = state.preset;
  currentPad = state.pad;
  bpm = state.bpm;
  swing = state.swing;
  lfoSync = true; // Always sync by default
  
  // Update UI
  updateUI();
  
  // Update synth
  if (audioContext) {
    updateSynth();
  }
}

// Export state
function exportState() {
  const exportObj = {
    preset: currentPresetIndex,
    pad: currentPad,
    bpm,
    swing,
    cutoff: state.cutoff,
    resonance: state.resonance,
    lfoRate: state.lfoRate,
    lfoDepth: state.lfoDepth,
    drive: state.drive,
    pattern: state.pattern,
    patternIntensity: state.patternIntensity,
    limiterEnabled: state.limiterEnabled
  };
  document.getElementById('stateJson').value = JSON.stringify(exportObj);
}

// Import state
function importState() {
  try {
    const json = document.getElementById('stateJson').value;
    const newState = JSON.parse(json);
    loadState(newState);
  } catch (e) {
    alert('Invalid JSON');
  }
}

// Tap tempo
let tapTimes = [];
function tapTempo() {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > 3) tapTimes.shift();
  
  if (tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i-1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const newBpm = 60000 / avgInterval;
    if (newBpm >= 20 && newBpm <= 220) {
      bpm = Math.round(newBpm);
      state.bpm = bpm;
      updateUI();
    }
  }
}

// Keyboard shortcuts
function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  switch (e.key) {
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
    case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8':
      const pad = parseInt(e.key);
      currentPad = pad;
      state.pad = pad;
      updateUI();
      updateSynth();
      break;
    case '+': case '=':
      bpm = Math.min(220, bpm + 1);
      state.bpm = bpm;
      updateUI();
      break;
    case '-': case '_':
      bpm = Math.max(20, bpm - 1);
      state.bpm = bpm;
      updateUI();
      break;
    case 'r': case 'R':
      randomize();
      break;
    case '0':
      reset();
      break;
  }
}

// Initialize UI
function initUI() {
  // Transport
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('bpm').addEventListener('change', (e) => {
    bpm = parseInt(e.target.value);
    state.bpm = bpm;
    updateUI();
  });
  document.getElementById('tapTempo').addEventListener('click', tapTempo);
  document.getElementById('swing').addEventListener('input', (e) => {
    swing = parseInt(e.target.value);
    state.swing = swing;
    document.getElementById('swingValue').textContent = `${swing}%`;
  });
  
  // Presets
  document.getElementById('prevPreset').addEventListener('click', () => {
    currentPresetIndex = (currentPresetIndex - 1 + PRESETS.length) % PRESETS.length;
    state.preset = currentPresetIndex;
    reset();
  });
  document.getElementById('nextPreset').addEventListener('click', () => {
    currentPresetIndex = (currentPresetIndex + 1) % PRESETS.length;
    state.preset = currentPresetIndex;
    reset();
  });
  document.getElementById('presetSelect').addEventListener('change', (e) => {
    currentPresetIndex = parseInt(e.target.value);
    state.preset = currentPresetIndex;
    reset();
  });
  
  // Pads
  document.querySelectorAll('.pad').forEach(pad => {
    pad.addEventListener('click', () => {
      currentPad = parseInt(pad.dataset.pad);
      state.pad = currentPad;
      updateUI();
      updateSynth();
    });
  });
  
  // Knobs
  document.getElementById('cutoff').addEventListener('input', (e) => {
    state.cutoff = parseFloat(e.target.value);
    updateSynth();
  });
  document.getElementById('resonance').addEventListener('input', (e) => {
    state.resonance = parseFloat(e.target.value);
    updateSynth();
  });
  document.getElementById('lfoRate').addEventListener('input', (e) => {
    state.lfoRate = parseFloat(e.target.value);
    updateSynth();
  });
  document.getElementById('lfoSync').addEventListener('change', (e) => {
    lfoSync = e.target.checked;
    updateSynth();
  });
  document.getElementById('lfoDepth').addEventListener('input', (e) => {
    state.lfoDepth = parseFloat(e.target.value);
    updateSynth();
  });
  document.getElementById('drive').addEventListener('input', (e) => {
    state.drive = parseFloat(e.target.value);
    updateSynth();
  });
  document.getElementById('pattern').addEventListener('change', (e) => {
    state.pattern = e.target.value;
    updateSynth();
  });
  document.getElementById('patternIntensity').addEventListener('input', (e) => {
    state.patternIntensity = parseFloat(e.target.value);
    updateSynth();
  });
  
  // Controls
  document.getElementById('randomize').addEventListener('click', randomize);
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('limiterToggle').addEventListener('change', (e) => {
    state.limiterEnabled = e.target.checked;
    updateSynth();
  });
  
  // Export/Import
  document.getElementById('exportBtn').addEventListener('click', exportState);
  document.getElementById('importBtn').addEventListener('click', importState);
  
  // Keyboard
  document.addEventListener('keydown', handleKeyDown);
  
  // Initialize
  updateUI();
  reset();
}

// Start when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check for URL hash state
  if (window.location.hash) {
    try {
      const hashState = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
      loadState(hashState);
    } catch (e) {
      console.warn('Invalid state in URL hash');
    }
  }
  
  initUI();
  
  // Auto-focus for keyboard shortcuts
  document.body.focus();
});