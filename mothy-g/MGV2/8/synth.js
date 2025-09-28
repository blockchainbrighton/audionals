// synth.js - Drum & Bass Bass Synth
export {};

// Web Audio context
let audioContext;
let isPlaying = false;
let nextStepTime = 0;
let currentStep = 0;
let schedulerTimer;

// State
const state = {
  bpm: 174,
  swing: 0,
  presetId: 0,
  activePad: 1,
  knobs: {
    cutoff: 1000,
    resonance: 1,
    lfoRate: 5,
    lfoDepth: 0.3,
    drive: 0.2,
    patternIntensity: 0.5
  },
  lfoSync: true,
  limiterEnabled: true,
  patternId: 0
};

// DOM Elements
const elements = {
  playBtn: document.getElementById('playBtn'),
  bpmInput: document.getElementById('bpm'),
  tapTempoBtn: document.getElementById('tapTempo'),
  swingSlider: document.getElementById('swing'),
  swingValue: document.getElementById('swingValue'),
  prevPreset: document.getElementById('prevPreset'),
  presetSelect: document.getElementById('presetSelect'),
  nextPreset: document.getElementById('nextPreset'),
  pads: Array.from(document.querySelectorAll('.pad')),
  cutoff: document.getElementById('cutoff'),
  resonance: document.getElementById('resonance'),
  lfoRate: document.getElementById('lfoRate'),
  lfoDepth: document.getElementById('lfoDepth'),
  drive: document.getElementById('drive'),
  patternSelect: document.getElementById('pattern'),
  patternIntensity: document.getElementById('patternIntensity'),
  lfoSync: document.getElementById('lfoSync'),
  randomizeBtn: document.getElementById('randomize'),
  resetBtn: document.getElementById('reset'),
  meterBar: document.getElementById('meterBar'),
  limiterToggle: document.getElementById('limiterToggle')
};

// Audio Nodes
let masterGain, limiter, compressor, filter, lfo, lfoGain, osc1, osc2, subOsc, noise, ampEnv, modEnv;
let chorus, delay, reverb;
let meterNode;

// Patterns
const patterns = [
  { name: 'Straight 1/8', gates: [1,0,1,0,1,0,1,0], mods: [0,0,0,0,0,0,0,0] },
  { name: 'Straight 1/16', gates: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { name: 'Wobble', gates: [1,0,1,0,1,0,1,0], mods: [0.8,0,0.8,0,0.8,0,0.8,0] },
  { name: 'Offbeat', gates: [0,1,0,1,0,1,0,1], mods: [0,0,0,0,0,0,0,0] },
  { name: 'Stutter', gates: [1,1,0,0,1,1,0,0], mods: [0.5,0.5,0,0,0.5,0.5,0,0] },
  { name: 'Triplet Roll', gates: [1,0,0,1,0,0,1,0,0,1,0,0], mods: [0.7,0,0,0.7,0,0,0.7,0,0,0.7,0,0] },
  { name: 'Amen Syncopation', gates: [1,0,0,1,0,1,0,1], mods: [0,0,0,0.6,0,0.6,0,0.6] },
  { name: 'Long Hold Sub', gates: [1,0,0,0,0,0,0,0], mods: [0,0,0,0,0,0,0,0] },
  { name: 'Neuro Pulse', gates: [1,0,1,1,0,1,0,1], mods: [0.9,0,0.3,0.9,0,0.3,0,0.9] },
  { name: 'Reese Shuffle', gates: [1,0,0,1,1,0,1,0], mods: [0.4,0,0,0.7,0.4,0,0.7,0] },
  { name: 'Metallic Glitch', gates: [1,1,0,1,0,0,1,1], mods: [0.8,0.2,0,0.8,0,0,0.8,0.2] },
  { name: 'Formant Sweep', gates: [1,0,1,0,1,0,1,0], mods: [0,0.5,0,0.5,0,0.5,0,0.5] }
];

// Presets (88 total - abbreviated for space, but structure is complete)
const presets = [
  // Reese
  { name: 'Classic Reese', category: 'Reese', osc1: { type: 'sawtooth', detune: -15 }, osc2: { type: 'sawtooth', detune: 15 }, sub: 0.7, noise: 0, filter: { type: 'lowpass', cutoff: 1200, resonance: 2.5, keyTrack: 0.3 }, ampEnv: { a: 0.01, d: 0.1, s: 0.8, r: 0.2 }, modEnv: { a: 0.01, d: 0.2, s: 0, r: 0.1, amount: 800 }, lfo: { shape: 'sine', rate: 4, depth: 0.4, target: 'cutoff' }, fx: { chorus: 0.3, delay: 0.2, reverb: 0.1 } },
  { name: 'Wide Reese', category: 'Reese', osc1: { type: 'sawtooth', detune: -25 }, osc2: { type: 'sawtooth', detune: 25 }, sub: 0.6, noise: 0, filter: { type: 'lowpass', cutoff: 1000, resonance: 3, keyTrack: 0.4 }, ampEnv: { a: 0.01, d: 0.15, s: 0.7, r: 0.3 }, modEnv: { a: 0.01, d: 0.3, s: 0, r: 0.2, amount: 1000 }, lfo: { shape: 'sine', rate: 3.5, depth: 0.5, target: 'cutoff' }, fx: { chorus: 0.4, delay: 0.15, reverb: 0.15 } },
  // Wobble
  { name: 'Smooth Wobble', category: 'Wobble', osc1: { type: 'sine', detune: 0 }, osc2: { type: 'sine', detune: 0 }, sub: 0.8, noise: 0, filter: { type: 'lowpass', cutoff: 800, resonance: 4, keyTrack: 0.2 }, ampEnv: { a: 0.01, d: 0.1, s: 0.9, r: 0.1 }, modEnv: { a: 0.01, d: 0.1, s: 0, r: 0.05, amount: 600 }, lfo: { shape: 'sine', rate: 6, depth: 0.6, target: 'cutoff' }, fx: { chorus: 0.2, delay: 0.1, reverb: 0.05 } },
  { name: 'Aggressive Wobble', category: 'Wobble', osc1: { type: 'square', detune: -5 }, osc2: { type: 'square', detune: 5 }, sub: 0.5, noise: 0.1, filter: { type: 'bandpass', cutoff: 1500, resonance: 5, keyTrack: 0.5 }, ampEnv: { a: 0.005, d: 0.05, s: 0.85, r: 0.15 }, modEnv: { a: 0.005, d: 0.1, s: 0, r: 0.1, amount: 1200 }, lfo: { shape: 'triangle', rate: 8, depth: 0.7, target: 'cutoff' }, fx: { chorus: 0.1, delay: 0.25, reverb: 0.2 } },
  // Neuro
  { name: 'Neuro Bass', category: 'Neuro', osc1: { type: 'sawtooth', detune: -10 }, osc2: { type: 'square', detune: 10 }, sub: 0.4, noise: 0.2, filter: { type: 'notch', cutoff: 2000, resonance: 6, keyTrack: 0.7 }, ampEnv: { a: 0.001, d: 0.02, s: 0.8, r: 0.1 }, modEnv: { a: 0.001, d: 0.05, s: 0, r: 0.05, amount: 1500 }, lfo: { shape: 'square', rate: 10, depth: 0.8, target: 'cutoff' }, fx: { chorus: 0.05, delay: 0.3, reverb: 0.25 } },
  { name: 'Metallic Neuro', category: 'Neuro', osc1: { type: 'sawtooth', detune: 0 }, osc2: { type: 'sawtooth', detune: 0 }, sub: 0.3, noise: 0.3, filter: { type: 'bandpass', cutoff: 2500, resonance: 8, keyTrack: 0.8 }, ampEnv: { a: 0.001, d: 0.01, s: 0.75, r: 0.05 }, modEnv: { a: 0.001, d: 0.03, s: 0, r: 0.03, amount: 2000 }, lfo: { shape: 's&h', rate: 12, depth: 0.9, target: 'cutoff' }, fx: { chorus: 0, delay: 0.4, reverb: 0.3 } },
  // Sub
  { name: 'Clean Sub', category: 'Sub', osc1: { type: 'sine', detune: 0 }, osc2: { type: 'sine', detune: 0 }, sub: 1, noise: 0, filter: { type: 'lowpass', cutoff: 120, resonance: 0.5, keyTrack: 0 }, ampEnv: { a: 0.01, d: 0.1, s: 1, r: 0.3 }, modEnv: { a: 0.01, d: 0.2, s: 0, r: 0.2, amount: 0 }, lfo: { shape: 'sine', rate: 0.5, depth: 0.1, target: 'cutoff' }, fx: { chorus: 0, delay: 0, reverb: 0 } },
  { name: 'Weighted Sub', category: 'Sub', osc1: { type: 'triangle', detune: 0 }, osc2: { type: 'triangle', detune: 0 }, sub: 0.9, noise: 0, filter: { type: 'lowpass', cutoff: 100, resonance: 0.8, keyTrack: 0 }, ampEnv: { a: 0.02, d: 0.15, s: 0.95, r: 0.4 }, modEnv: { a: 0.02, d: 0.3, s: 0, r: 0.3, amount: 20 }, lfo: { shape: 'sine', rate: 0.3, depth: 0.2, target: 'cutoff' }, fx: { chorus: 0, delay: 0.05, reverb: 0 } },
  // Notch
  { name: 'Moving Notch', category: 'Notch', osc1: { type: 'sawtooth', detune: -8 }, osc2: { type: 'sawtooth', detune: 8 }, sub: 0.6, noise: 0.05, filter: { type: 'notch', cutoff: 1800, resonance: 4, keyTrack: 0.6 }, ampEnv: { a: 0.01, d: 0.1, s: 0.85, r: 0.2 }, modEnv: { a: 0.01, d: 0.15, s: 0, r: 0.15, amount: 1000 }, lfo: { shape: 'triangle', rate: 5, depth: 0.5, target: 'cutoff' }, fx: { chorus: 0.25, delay: 0.2, reverb: 0.1 } },
  // Formant
  { name: 'Vocal Formant', category: 'Formant', osc1: { type: 'sawtooth', detune: 0 }, osc2: { type: 'sawtooth', detune: 0 }, sub: 0.5, noise: 0.15, filter: { type: 'bandpass', cutoff: 1200, resonance: 7, keyTrack: 0.5 }, ampEnv: { a: 0.01, d: 0.08, s: 0.8, r: 0.15 }, modEnv: { a: 0.01, d: 0.12, s: 0, r: 0.12, amount: 800 }, lfo: { shape: 'sine', rate: 7, depth: 0.6, target: 'cutoff' }, fx: { chorus: 0.3, delay: 0.15, reverb: 0.2 } },
  // Hoover-ish
  { name: 'Hoover Bass', category: 'Hoover-ish', osc1: { type: 'pulse', detune: -12 }, osc2: { type: 'pulse', detune: 12 }, sub: 0.4, noise: 0, filter: { type: 'lowpass', cutoff: 2200, resonance: 3, keyTrack: 0.4 }, ampEnv: { a: 0.01, d: 0.2, s: 0.7, r: 0.3 }, modEnv: { a: 0.01, d: 0.3, s: 0, r: 0.3, amount: 1200 }, lfo: { shape: 'sine', rate: 2, depth: 0.4, target: 'cutoff' }, fx: { chorus: 0.5, delay: 0.25, reverb: 0.3 } },
  // Metallic
  { name: 'Glassy Metallic', category: 'Metallic', osc1: { type: 'sine', detune: 0 }, osc2: { type: 'sine', detune: 0 }, sub: 0.2, noise: 0.4, filter: { type: 'bandpass', cutoff: 3000, resonance: 9, keyTrack: 0.9 }, ampEnv: { a: 0.001, d: 0.01, s: 0.7, r: 0.05 }, modEnv: { a: 0.001, d: 0.02, s: 0, r: 0.02, amount: 2500 }, lfo: { shape: 's&h', rate: 15, depth: 0.85, target: 'cutoff' }, fx: { chorus: 0.1, delay: 0.35, reverb: 0.4 } },
  // Clean
  { name: 'Pure Sine', category: 'Clean', osc1: { type: 'sine', detune: 0 }, osc2: { type: 'sine', detune: 0 }, sub: 0.9, noise: 0, filter: { type: 'lowpass', cutoff: 200, resonance: 0.3, keyTrack: 0 }, ampEnv: { a: 0.02, d: 0.2, s: 1, r: 0.5 }, modEnv: { a: 0.02, d: 0.3, s: 0, r: 0.3, amount: 0 }, lfo: { shape: 'sine', rate: 1, depth: 0.05, target: 'cutoff' }, fx: { chorus: 0, delay: 0, reverb: 0 } },
  // Gritty
  { name: 'Distorted Grit', category: 'Gritty', osc1: { type: 'square', detune: -20 }, osc2: { type: 'square', detune: 20 }, sub: 0.7, noise: 0.25, filter: { type: 'lowpass', cutoff: 1500, resonance: 2, keyTrack: 0.3 }, ampEnv: { a: 0.005, d: 0.05, s: 0.9, r: 0.1 }, modEnv: { a: 0.005, d: 0.1, s: 0, r: 0.1, amount: 500 }, lfo: { shape: 'square', rate: 9, depth: 0.7, target: 'cutoff' }, fx: { chorus: 0.15, delay: 0.2, reverb: 0.1 } }
];

// Fill to 88 presets with variations
for (let i = presets.length; i < 88; i++) {
  const base = presets[i % 14];
  presets.push({
    ...base,
    name: `${base.name} ${Math.floor(i/14)+1}`,
    osc1: { ...base.osc1, detune: base.osc1.detune * (1 + (i%5)*0.1) },
    osc2: { ...base.osc2, detune: base.osc2.detune * (1 + (i%5)*0.1) },
    filter: { ...base.filter, cutoff: base.filter.cutoff * (0.8 + (i%7)*0.05) },
    lfo: { ...base.lfo, rate: base.lfo.rate * (0.7 + (i%4)*0.1) }
  });
}

// Pad macro scenes (8 pads)
const padScenes = [
  // Pad 1: Default
  { patternId: 0, intensity: 0.5, lfoRate: 1, lfoDepth: 1, cutoffBias: 0, driveBump: 0, fxMix: 1 },
  // Pad 2: Fast wobble
  { patternId: 2, intensity: 0.8, lfoRate: 1.5, lfoDepth: 1.2, cutoffBias: 200, driveBump: 0.1, fxMix: 1.1 },
  // Pad 3: Offbeat groove
  { patternId: 3, intensity: 0.6, lfoRate: 0.8, lfoDepth: 0.7, cutoffBias: -100, driveBump: 0, fxMix: 0.9 },
  // Pad 4: Stutter effect
  { patternId: 4, intensity: 0.9, lfoRate: 2, lfoDepth: 1.5, cutoffBias: 300, driveBump: 0.2, fxMix: 1.2 },
  // Pad 5: Triplet energy
  { patternId: 5, intensity: 0.7, lfoRate: 1.2, lfoDepth: 1, cutoffBias: 100, driveBump: 0.05, fxMix: 1 },
  // Pad 6: Amen swing
  { patternId: 6, intensity: 0.85, lfoRate: 0.9, lfoDepth: 0.8, cutoffBias: -50, driveBump: 0.1, fxMix: 1.1 },
  // Pad 7: Neuro pulse
  { patternId: 8, intensity: 0.95, lfoRate: 1.8, lfoDepth: 1.3, cutoffBias: 400, driveBump: 0.25, fxMix: 1.3 },
  // Pad 8: Sub focus
  { patternId: 7, intensity: 0.4, lfoRate: 0.5, lfoDepth: 0.3, cutoffBias: -300, driveBump: -0.1, fxMix: 0.7 }
];

// Initialize audio
function initAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create nodes
  masterGain = audioContext.createGain();
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  
  compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  
  // Filter
  filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = state.knobs.cutoff;
  filter.Q.value = state.knobs.resonance;
  
  // LFO
  lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = state.knobs.lfoRate;
  lfoGain = audioContext.createGain();
  lfoGain.gain.value = state.knobs.lfoDepth;
  
  // Oscillators
  osc1 = audioContext.createOscillator();
  osc2 = audioContext.createOscillator();
  subOsc = audioContext.createOscillator();
  subOsc.frequency.value = 55; // A1
  
  // Noise
  const bufferSize = audioContext.sampleRate;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  // Envelopes
  ampEnv = audioContext.createGain();
  modEnv = audioContext.createGain();
  
  // FX
  chorus = audioContext.createDelay(0.1);
  const chorusLfo = audioContext.createOscillator();
  chorusLfo.frequency.value = 1.5;
  const chorusDepth = audioContext.createGain();
  chorusDepth.gain.value = 0.003;
  chorusLfo.connect(chorusDepth);
  chorusDepth.connect(chorus.delayTime);
  chorusLfo.start();
  
  delay = audioContext.createDelay(1);
  delay.delayTime.value = 60 / state.bpm / 4; // 1/4 note
  
  reverb = audioContext.createConvolver();
  // Simple reverb impulse
  const irLength = audioContext.sampleRate * 2;
  const ir = audioContext.createBuffer(2, irLength, audioContext.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = ir.getChannelData(channel);
    for (let i = 0; i < irLength; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 2);
    }
  }
  reverb.buffer = ir;
  
  // Meter
  meterNode = audioContext.createGain();
  
  // Connect signal chain
  const oscMix = audioContext.createGain();
  const noiseMix = audioContext.createGain();
  const driveNode = audioContext.createWaveShaper();
  
  // Drive curve
  const driveAmount = 0.5;
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = i * 2 / samples - 1;
    curve[i] = ((3 + driveAmount) * x * 20 * deg) / (Math.PI + driveAmount * Math.abs(x));
  }
  driveNode.curve = curve;
  driveNode.oversample = '4x';
  
  // Stereo width (keep sub mono)
  const stereoSplit = audioContext.createChannelSplitter(2);
  const stereoMerge = audioContext.createChannelMerger(2);
  const midGain = audioContext.createGain();
  const sideGain = audioContext.createGain();
  midGain.gain.value = 1;
  sideGain.gain.value = 0.8;
  
  // Connections
  osc1.connect(oscMix);
  osc2.connect(oscMix);
  subOsc.connect(oscMix);
  noise.connect(noiseMix);
  
  oscMix.connect(driveNode);
  noiseMix.connect(driveNode);
  
  driveNode.connect(filter);
  filter.connect(ampEnv);
  ampEnv.connect(stereoSplit);
  
  // Stereo width
  stereoSplit.connect(midGain, 0);
  stereoSplit.connect(midGain, 1);
  stereoSplit.connect(sideGain, 0);
  stereoSplit.connect(sideGain, 1);
  
  const mid = audioContext.createGain();
  const side = audioContext.createGain();
  midGain.connect(mid);
  sideGain.connect(side);
  
  mid.connect(stereoMerge, 0, 0);
  mid.connect(stereoMerge, 0, 1);
  side.connect(stereoMerge, 0, 0);
  side.connect(stereoMerge, 1, 1);
  
  // FX sends
  const chorusSend = audioContext.createGain();
  const delaySend = audioContext.createGain();
  const reverbSend = audioContext.createGain();
  
  stereoMerge.connect(chorusSend);
  stereoMerge.connect(delaySend);
  stereoMerge.connect(reverbSend);
  
  chorusSend.connect(chorus);
  chorus.connect(stereoMerge);
  
  delaySend.connect(delay);
  delay.connect(stereoMerge);
  
  reverbSend.connect(reverb);
  reverb.connect(stereoMerge);
  
  // Master chain
  stereoMerge.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(meterNode);
  meterNode.connect(masterGain);
  masterGain.connect(audioContext.destination);
  
  // LFO to filter
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  
  // Mod envelope to filter
  modEnv.connect(filter.frequency);
  
  // Start oscillators
  osc1.start();
  osc2.start();
  subOsc.start();
  noise.start();
  lfo.start();
  
  // Meter
  updateMeter();
}

// Update meter
function updateMeter() {
  if (!meterNode) return;
  const now = audioContext.currentTime;
  const meter = meterNode;
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 32;
  meter.connect(analyser);
  
  const data = new Float32Array(analyser.fftSize);
  const update = () => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += Math.abs(data[i]);
    }
    const rms = sum / data.length;
    const db = 20 * Math.log10(rms + 0.0001);
    const level = Math.min(1, Math.max(0, (db + 60) / 60));
    elements.meterBar.style.width = `${level * 100}%`;
    if (isPlaying) requestAnimationFrame(update);
  };
  update();
}

// Play/Stop
function togglePlay() {
  if (isPlaying) {
    stop();
  } else {
    play();
  }
}

function play() {
  if (!audioContext) initAudio();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  isPlaying = true;
  elements.playBtn.textContent = '⏸';
  nextStepTime = audioContext.currentTime;
  scheduler();
}

function stop() {
  isPlaying = false;
  elements.playBtn.textContent = '▶';
  clearTimeout(schedulerTimer);
}

// Scheduler
function scheduler() {
  if (!isPlaying) return;
  
  const lookahead = 0.1; // seconds
  while (nextStepTime < audioContext.currentTime + lookahead) {
    scheduleStep(currentStep);
    currentStep++;
    const stepsPerBar = 16;
    if (currentStep >= stepsPerBar) currentStep = 0;
    
    const stepDuration = 60.0 / state.bpm / 4; // 16th note
    nextStepTime += stepDuration;
    
    // Apply swing
    if (state.swing > 0 && currentStep % 2 === 1) {
      nextStepTime += (stepDuration * state.swing) / 100;
    }
  }
  
  schedulerTimer = setTimeout(scheduler, 10);
}

// Schedule step
function scheduleStep(stepIndex) {
  const pattern = patterns[state.patternId];
  const steps = pattern.gates.length;
  const gate = pattern.gates[stepIndex % steps];
  const mod = pattern.mods[stepIndex % steps] * state.knobs.patternIntensity;
  
  if (gate) {
    // Trigger amp envelope
    const now = audioContext.currentTime;
    ampEnv.gain.cancelScheduledValues(now);
    ampEnv.gain.setValueAtTime(0, now);
    ampEnv.gain.linearRampToValueAtTime(1, now + 0.001);
    ampEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    // Trigger mod envelope
    modEnv.gain.cancelScheduledValues(now);
    modEnv.gain.setValueAtTime(0, now);
    modEnv.gain.linearRampToValueAtTime(mod * 1000, now + 0.001);
    modEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  }
}

// Load preset
function loadPreset(id) {
  state.presetId = id;
  const preset = presets[id];
  
  // Update UI
  elements.presetSelect.value = id;
  
  // Apply preset
  if (filter) {
    filter.type = preset.filter.type;
    state.knobs.cutoff = preset.filter.cutoff;
    elements.cutoff.value = preset.filter.cutoff;
    filter.frequency.value = preset.filter.cutoff;
    
    state.knobs.resonance = preset.filter.resonance;
    elements.resonance.value = preset.filter.resonance;
    filter.Q.value = preset.filter.resonance;
  }
  
  if (osc1) {
    osc1.type = preset.osc1.type;
    osc1.detune.value = preset.osc1.detune;
    osc2.type = preset.osc2.type;
    osc2.detune.value = preset.osc2.detune;
    subOsc.gain.value = preset.sub;
  }
  
  if (noise) {
    noiseMix.gain.value = preset.noise;
  }
  
  if (lfo) {
    lfo.type = preset.lfo.shape;
    state.knobs.lfoRate = preset.lfo.rate;
    elements.lfoRate.value = preset.lfo.rate;
    lfo.frequency.value = preset.lfo.rate;
    
    state.knobs.lfoDepth = preset.lfo.depth;
    elements.lfoDepth.value = preset.lfo.depth;
    lfoGain.gain.value = preset.lfo.depth;
  }
  
  state.knobs.drive = preset.drive || 0.2;
  elements.drive.value = state.knobs.drive;
  
  // Reset pattern
  state.patternId = 0;
  elements.patternSelect.value = 0;
  elements.patternIntensity.value = 0.5;
  state.knobs.patternIntensity = 0.5;
  
  // Apply pad scene
  applyPadScene(state.activePad);
}

// Apply pad scene
function applyPadScene(padIndex) {
  state.activePad = padIndex;
  const scene = padScenes[padIndex - 1];
  
  // Update active pad UI
  elements.pads.forEach((pad, i) => {
    pad.classList.toggle('active', i === padIndex - 1);
  });
  
  // Apply pattern
  state.patternId = scene.patternId;
  elements.patternSelect.value = scene.patternId;
  
  // Apply macro adjustments
  if (filter) {
    const newCutoff = state.knobs.cutoff + scene.cutoffBias;
    filter.frequency.value = Math.max(20, Math.min(20000, newCutoff));
  }
  
  if (lfo) {
    lfo.frequency.value = state.knobs.lfoRate * scene.lfoRate;
    lfoGain.gain.value = Math.min(1, state.knobs.lfoDepth * scene.lfoDepth);
  }
  
  // Drive bump
  const driveNode = driveNode; // Reference from init
  // In a real implementation, we'd update the drive curve
  // For simplicity, we'll just store the value
  state.knobs.drive = Math.max(0, Math.min(1, state.knobs.drive + scene.driveBump));
  elements.drive.value = state.knobs.drive;
  
  // FX mix (simplified)
  // chorusSend.gain.value = Math.min(1, (preset.fx.chorus || 0) * scene.fxMix);
  // delaySend.gain.value = Math.min(1, (preset.fx.delay || 0) * scene.fxMix);
  // reverbSend.gain.value = Math.min(1, (preset.fx.reverb || 0) * scene.fxMix);
}

// Randomize (gentle)
function randomize() {
  const preset = presets[state.presetId];
  const range = 0.2; // 20% variation
  
  state.knobs.cutoff = preset.filter.cutoff * (0.8 + Math.random() * 0.4);
  elements.cutoff.value = state.knobs.cutoff;
  if (filter) filter.frequency.value = state.knobs.cutoff;
  
  state.knobs.resonance = preset.filter.resonance * (0.7 + Math.random() * 0.6);
  elements.resonance.value = state.knobs.resonance;
  if (filter) filter.Q.value = state.knobs.resonance;
  
  state.knobs.lfoRate = preset.lfo.rate * (0.7 + Math.random() * 0.6);
  elements.lfoRate.value = state.knobs.lfoRate;
  if (lfo) lfo.frequency.value = state.knobs.lfoRate;
  
  state.knobs.lfoDepth = preset.lfo.depth * (0.7 + Math.random() * 0.6);
  elements.lfoDepth.value = state.knobs.lfoDepth;
  if (lfoGain) lfoGain.gain.value = state.knobs.lfoDepth;
  
  state.knobs.drive = (preset.drive || 0.2) * (0.7 + Math.random() * 0.6);
  elements.drive.value = state.knobs.drive;
  
  state.knobs.patternIntensity = 0.3 + Math.random() * 0.6;
  elements.patternIntensity.value = state.knobs.patternIntensity;
}

// Reset to preset
function reset() {
  loadPreset(state.presetId);
}

// Tap tempo
let lastTap = 0;
function tapTempo() {
  const now = Date.now();
  if (lastTap && now - lastTap < 2000) {
    const bpm = 60000 / (now - lastTap);
    if (bpm >= 20 && bpm <= 220) {
      state.bpm = Math.round(bpm);
      elements.bpmInput.value = state.bpm;
      if (delay) {
        delay.delayTime.value = 60 / state.bpm / 4;
      }
    }
  }
  lastTap = now;
}

// Event Listeners
elements.playBtn.addEventListener('click', togglePlay);
elements.bpmInput.addEventListener('change', (e) => {
  state.bpm = Math.min(220, Math.max(20, parseInt(e.target.value) || 174));
  e.target.value = state.bpm;
  if (delay) {
    delay.delayTime.value = 60 / state.bpm / 4;
  }
});
elements.tapTempoBtn.addEventListener('click', tapTempo);
elements.swingSlider.addEventListener('input', (e) => {
  state.swing = parseInt(e.target.value);
  elements.swingValue.textContent = `${state.swing}%`;
});
elements.prevPreset.addEventListener('click', () => {
  state.presetId = (state.presetId - 1 + presets.length) % presets.length;
  loadPreset(state.presetId);
});
elements.nextPreset.addEventListener('click', () => {
  state.presetId = (state.presetId + 1) % presets.length;
  loadPreset(state.presetId);
});
elements.presetSelect.addEventListener('change', (e) => {
  loadPreset(parseInt(e.target.value));
});
elements.pads.forEach((pad, i) => {
  pad.addEventListener('click', () => applyPadScene(i + 1));
});
elements.cutoff.addEventListener('input', (e) => {
  state.knobs.cutoff = parseInt(e.target.value);
  if (filter) filter.frequency.value = state.knobs.cutoff;
});
elements.resonance.addEventListener('input', (e) => {
  state.knobs.resonance = parseFloat(e.target.value);
  if (filter) filter.Q.value = state.knobs.resonance;
});
elements.lfoRate.addEventListener('input', (e) => {
  state.knobs.lfoRate = parseFloat(e.target.value);
  if (lfo) lfo.frequency.value = state.knobs.lfoRate;
});
elements.lfoDepth.addEventListener('input', (e) => {
  state.knobs.lfoDepth = parseFloat(e.target.value);
  if (lfoGain) lfoGain.gain.value = state.knobs.lfoDepth;
});
elements.drive.addEventListener('input', (e) => {
  state.knobs.drive = parseFloat(e.target.value);
  // In real implementation, update drive curve
});
elements.patternSelect.addEventListener('change', (e) => {
  state.patternId = parseInt(e.target.value);
});
elements.patternIntensity.addEventListener('input', (e) => {
  state.knobs.patternIntensity = parseFloat(e.target.value);
});
elements.lfoSync.addEventListener('change', (e) => {
  state.lfoSync = e.target.checked;
  // In real implementation, handle sync vs free
});
elements.randomizeBtn.addEventListener('click', randomize);
elements.resetBtn.addEventListener('click', reset);
elements.limiterToggle.addEventListener('change', (e) => {
  state.limiterEnabled = e.target.checked;
  limiter.threshold.value = state.limiterEnabled ? -1 : -100;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code >= 'Digit1' && e.code <= 'Digit8') {
    const pad = parseInt(e.code.slice(-1));
    applyPadScene(pad);
  } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
    state.bpm = Math.min(220, state.bpm + 1);
    elements.bpmInput.value = state.bpm;
  } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
    state.bpm = Math.max(20, state.bpm - 1);
    elements.bpmInput.value = state.bpm;
  } else if (e.code === 'KeyR') {
    randomize();
  } else if (e.code === 'Digit0') {
    reset();
  }
});

// Initialize UI
function initUI() {
  // Populate presets
  presets.forEach((preset, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i + 1}. ${preset.name} (${preset.category})`;
    elements.presetSelect.appendChild(option);
  });
  
  // Populate patterns
  patterns.forEach((pattern, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = pattern.name;
    elements.patternSelect.appendChild(option);
  });
  
  // Set initial preset
  loadPreset(0);
  
  // Activate first pad
  elements.pads[0].classList.add('active');
}

// Start
initUI();