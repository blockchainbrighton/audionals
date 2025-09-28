// DnB Bass Toy - Web Audio API Implementation
export {};

// Constants
const SAMPLE_RATE = 44100;
const MAX_VOICES = 4;
const LFO_SHAPES = ['sine', 'triangle', 'sawtooth', 'square', 'random'];
const FILTER_TYPES = ['lowpass', 'bandpass', 'notch'];
const PATTERN_NAMES = [
  '1/1', '1/2', '1/4', '1/8', '1/16', '1/32',
  'dotted 1/8', 'dotted 1/16',
  'triplet 1/8', 'triplet 1/16',
  'wobble', 'amen'
];

// State management
let state = {
  bpm: 174,
  swing: 0,
  playing: false,
  presetId: 0,
  activePad: 1,
  knobs: {
    cutoff: 0.5,
    resonance: 0.5,
    lfoRate: 0.5,
    lfoDepth: 0.5,
    drive: 0.5,
    patternIntensity: 1.0
  },
  lfoSync: true,
  limiterEnabled: true
};

// Audio context
let audioContext;
let masterGain;
let limiter;
let compressor;
let meter;
let meterNode;
let lastMeterValue = 0;
let meterInterval;

// Synth components
let oscillators = [];
let filters = [];
let envelopes = [];
let lfos = [];
let noiseSources = [];
let subOscillators = [];
let currentPattern = [];
let patternStep = 0;
let nextStepTime = 0;
let scheduler = null;
let lookahead = 25; // ms
let scheduleAheadTime = 0.1; // seconds

// Presets
const presets = (() => {
  const categories = ['Reese', 'Wobble', 'Neuro', 'Sub', 'Notch', 'Formant', 'Hoover-ish', 'Metallic', 'Clean', 'Gritty'];
  const waveforms = ['sawtooth', 'square', 'triangle', 'sine'];
  const presets = [];
  
  for (let i = 0; i < 88; i++) {
    const category = categories[i % categories.length];
    const osc1Wave = waveforms[Math.floor(Math.random() * waveforms.length)];
    const osc2Wave = waveforms[Math.floor(Math.random() * waveforms.length)];
    const detune = category === 'Reese' ? (Math.random() * 40 - 20) : (Math.random() * 10 - 5);
    const spread = category === 'Reese' ? (0.2 + Math.random() * 0.3) : (Math.random() * 0.1);
    const subLevel = category === 'Sub' ? (0.5 + Math.random() * 0.5) : (Math.random() * 0.3);
    const noiseAmount = category === 'Gritty' ? (0.2 + Math.random() * 0.3) : (Math.random() * 0.1);
    const filterType = FILTER_TYPES[Math.floor(Math.random() * FILTER_TYPES.length)];
    const keyTrack = category === 'Formant' ? (0.3 + Math.random() * 0.4) : (Math.random() * 0.3);
    const lfoShape = LFO_SHAPES[Math.floor(Math.random() * LFO_SHAPES.length)];
    const lfoRate = 0.3 + Math.random() * 0.4;
    const lfoDepth = category === 'Wobble' || category === 'Neuro' ? (0.6 + Math.random() * 0.4) : (0.2 + Math.random() * 0.3);
    const drive = category === 'Gritty' ? (0.6 + Math.random() * 0.4) : (0.1 + Math.random() * 0.3);
    const chorusMix = category === 'Clean' ? (0.1 + Math.random() * 0.2) : (Math.random() * 0.3);
    const delayMix = category === 'Amen' ? (0.2 + Math.random() * 0.3) : (Math.random() * 0.2);
    const reverbMix = category === 'Hoover-ish' ? (0.3 + Math.random() * 0.4) : (Math.random() * 0.3);
    
    // Macro scenes for pads 1-8
    const padScenes = [];
    for (let pad = 1; pad <= 8; pad++) {
      padScenes.push({
        patternId: Math.floor(Math.random() * PATTERN_NAMES.length),
        patternIntensity: 0.7 + Math.random() * 0.3,
        lfoRateBias: -0.2 + Math.random() * 0.4,
        lfoDepthBias: -0.2 + Math.random() * 0.4,
        cutoffBias: -0.3 + Math.random() * 0.6,
        driveBump: Math.random() * 0.3,
        fxMixBias: -0.2 + Math.random() * 0.4
      });
    }
    
    presets.push({
      id: i,
      name: `${category} ${i + 1}`,
      category,
      osc1: { wave: osc1Wave, detune: detune * (1 - spread) },
      osc2: { wave: osc2Wave, detune: detune * (1 + spread) },
      sub: { level: subLevel },
      noise: { amount: noiseAmount },
      filter: { type: filterType, keyTrack },
      ampEnv: { attack: 0.001, decay: 0.1, sustain: 0.7, release: 0.2 },
      modEnv: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
      lfo: { shape: lfoShape, rate: lfoRate, depth: lfoDepth, sync: true },
      fx: { chorus: chorusMix, delay: delayMix, reverb: reverbMix },
      padScenes
    });
  }
  return presets;
})();

// Initialize audio context
function initAudio() {
  if (audioContext) return;
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  
  // Create limiter
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  limiter.connect(masterGain);
  
  // Create compressor
  compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(limiter);
  
  // Create meter
  meterNode = audioContext.createGain();
  meterNode.connect(compressor);
  meter = {
    node: meterNode,
    value: 0
  };
  
  // Start meter update
  if (meterInterval) clearInterval(meterInterval);
  meterInterval = setInterval(() => {
    const now = audioContext.currentTime;
    const nextTime = now + 0.1;
    const gain = meter.node.gain.value;
    meter.value = Math.max(meter.value * 0.9, gain);
    document.getElementById('meterBar').style.width = `${Math.min(100, meter.value * 100)}%`;
  }, 100);
}

// Create a single voice
function createVoice() {
  const voice = {};
  
  // Oscillators
  voice.osc1 = audioContext.createOscillator();
  voice.osc1.type = 'sawtooth';
  voice.osc1.detune.value = 0;
  
  voice.osc2 = audioContext.createOscillator();
  voice.osc2.type = 'square';
  voice.osc2.detune.value = 0;
  
  // Sub oscillator
  voice.subOsc = audioContext.createOscillator();
  voice.subOsc.type = 'sine';
  voice.subOsc.frequency.value = 55; // A1
  
  // Noise
  voice.noise = audioContext.createBufferSource();
  const bufferSize = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  voice.noise.buffer = buffer;
  voice.noise.loop = true;
  
  // Mixer
  voice.mixer = audioContext.createGain();
  
  // Filter
  voice.filter = audioContext.createBiquadFilter();
  voice.filter.type = 'lowpass';
  voice.filter.frequency.value = 200;
  voice.filter.Q.value = 1;
  
  // Drive
  voice.drive = audioContext.createWaveShaper();
  voice.drive.oversample = '4x';
  
  // Amp envelope
  voice.ampEnv = audioContext.createGain();
  
  // Mod envelope
  voice.modEnv = audioContext.createGain();
  
  // LFO
  voice.lfo = audioContext.createOscillator();
  voice.lfo.type = 'sine';
  voice.lfo.frequency.value = 5;
  
  // LFO gain
  voice.lfoGain = audioContext.createGain();
  
  // Connect voice
  voice.osc1.connect(voice.mixer);
  voice.osc2.connect(voice.mixer);
  voice.subOsc.connect(voice.mixer);
  voice.noise.connect(voice.mixer);
  voice.mixer.connect(voice.drive);
  voice.drive.connect(voice.filter);
  voice.filter.connect(voice.ampEnv);
  voice.ampEnv.connect(meter.node);
  
  // Modulation routing
  voice.modEnv.connect(voice.filter.frequency);
  voice.lfo.connect(voice.lfoGain);
  voice.lfoGain.connect(voice.filter.frequency);
  
  return voice;
}

// Update voice parameters
function updateVoice(voice, preset, knobs, padScene) {
  const { osc1, osc2, sub, noise, filter, lfo: lfoParams } = preset;
  
  // Oscillators
  voice.osc1.type = osc1.wave;
  voice.osc1.detune.value = osc1.detune;
  voice.osc2.type = osc2.wave;
  voice.osc2.detune.value = osc2.detune;
  
  // Sub
  voice.subOsc.frequency.value = 55; // Fixed sub frequency
  
  // Noise
  // Noise amount handled in mixer
  
  // Filter
  voice.filter.type = filter.type;
  const cutoffFreq = 20 + (knobs.cutoff + padScene.cutoffBias) * 10000;
  voice.filter.frequency.value = Math.min(20000, Math.max(20, cutoffFreq));
  voice.filter.Q.value = 0.1 + knobs.resonance * 10;
  
  // Drive
  const amount = knobs.drive + padScene.driveBump;
  const driveAmount = Math.min(1, Math.max(0, amount));
  const k = 2 * driveAmount / (1 - driveAmount);
  const deg = Math.PI / 180;
  const curve = new Float32Array(44100);
  for (let i = 0; i < 44100; i++) {
    const x = i * 2 / 44100 - 1;
    curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
  }
  voice.drive.curve = curve;
  
  // LFO
  voice.lfo.type = lfoParams.shape;
  let lfoRate = lfoParams.rate + padScene.lfoRateBias;
  lfoRate = Math.min(1, Math.max(0, lfoRate));
  
  if (state.lfoSync) {
    const stepDuration = 60 / state.bpm / 4; // 16th note
    const lfoFreq = 1 / (stepDuration * (1 - lfoRate * 0.9));
    voice.lfo.frequency.value = lfoFreq;
  } else {
    voice.lfo.frequency.value = 0.1 + lfoRate * 20;
  }
  
  const lfoDepth = lfoParams.depth + padScene.lfoDepthBias;
  voice.lfoGain.gain.value = Math.min(1, Math.max(0, lfoDepth)) * 5000;
  
  // Mixer levels
  const noiseGain = noise.amount;
  const subGain = sub.level;
  voice.mixer.gain.value = 1;
  voice.osc1.connect(voice.mixer);
  voice.osc2.connect(voice.mixer);
  voice.subOsc.connect(voice.mixer);
  voice.noise.connect(voice.mixer);
  
  // Disconnect and reconnect to adjust gains
  voice.osc1.disconnect();
  voice.osc2.disconnect();
  voice.subOsc.disconnect();
  voice.noise.disconnect();
  
  voice.osc1.connect(voice.mixer);
  voice.osc2.connect(voice.mixer);
  voice.subOsc.connect(voice.mixer);
  voice.noise.connect(voice.mixer);
}

// Pattern generation
function generatePattern(patternId, intensity) {
  const basePattern = PATTERN_NAMES[patternId];
  const steps = [];
  const numSteps = 16;
  
  for (let i = 0; i < numSteps; i++) {
    let gate = 0;
    let accent = 0;
    let mod = 0;
    
    // Basic pattern logic
    if (basePattern === '1/1') {
      gate = i === 0 ? 1 : 0;
    } else if (basePattern === '1/2') {
      gate = i % 8 === 0 ? 1 : 0;
    } else if (basePattern === '1/4') {
      gate = i % 4 === 0 ? 1 : 0;
    } else if (basePattern === '1/8') {
      gate = i % 2 === 0 ? 1 : 0;
    } else if (basePattern === '1/16') {
      gate = 1;
    } else if (basePattern === '1/32') {
      gate = 1;
      // Double speed
    } else if (basePattern === 'dotted 1/8') {
      gate = (i % 6 === 0) ? 1 : 0;
    } else if (basePattern === 'dotted 1/16') {
      gate = (i % 3 === 0) ? 1 : 0;
    } else if (basePattern === 'triplet 1/8') {
      gate = (i % 5 === 0) ? 1 : 0; // Approximate triplet
    } else if (basePattern === 'triplet 1/16') {
      gate = (i % 2 === 0) ? 1 : 0; // Simplified
    } else if (basePattern === 'wobble') {
      gate = 1;
      mod = Math.sin(i * Math.PI / 4) * 0.5 + 0.5;
    } else if (basePattern === 'amen') {
      // Classic amen break simplified
      const amenGates = [1,0,1,0,1,1,0,1,0,1,0,0,1,0,1,0];
      gate = amenGates[i] || 0;
      accent = i === 0 || i === 4 || i === 6 ? 1 : 0;
    }
    
    // Apply intensity
    if (Math.random() > intensity) {
      gate = 0;
      accent = 0;
      mod = 0;
    }
    
    steps.push({ gate, accent, mod });
  }
  
  return steps;
}

// Schedule next step
function scheduleStep(when) {
  if (!state.playing) return;
  
  const preset = presets[state.presetId];
  const padScene = preset.padScenes[state.activePad - 1];
  const pattern = generatePattern(padScene.patternId, padScene.patternIntensity * state.knobs.patternIntensity);
  
  // Apply swing
  const stepDuration = 60 / state.bpm / 4; // 16th note
  const swingAdjust = state.swing * 0.01 * stepDuration;
  
  // Get current step
  const step = pattern[patternStep];
  
  if (step.gate) {
    // Trigger voice
    const voice = createVoice();
    oscillators.push(voice.osc1);
    oscillators.push(voice.osc2);
    subOscillators.push(voice.subOsc);
    noiseSources.push(voice.noise);
    filters.push(voice.filter);
    envelopes.push(voice.ampEnv);
    lfos.push(voice.lfo);
    
    // Set voice parameters
    updateVoice(voice, preset, state.knobs, padScene);
    
    // Start oscillators
    voice.osc1.start(when);
    voice.osc2.start(when);
    voice.subOsc.start(when);
    voice.noise.start(when);
    voice.lfo.start(when);
    
    // Amp envelope
    const attack = preset.ampEnv.attack;
    const decay = preset.ampEnv.decay;
    const sustain = preset.ampEnv.sustain;
    const release = preset.ampEnv.release;
    
    voice.ampEnv.gain.setValueAtTime(0, when);
    voice.ampEnv.gain.linearRampToValueAtTime(1, when + attack);
    voice.ampEnv.gain.exponentialRampToValueAtTime(sustain, when + attack + decay);
    
    // Schedule release
    const releaseTime = when + stepDuration * 16; // Full bar
    voice.ampEnv.gain.setValueAtTime(sustain, releaseTime);
    voice.ampEnv.gain.exponentialRampToValueAtTime(0.001, releaseTime + release);
    
    // Stop voice after release
    setTimeout(() => {
      try {
        voice.osc1.stop();
        voice.osc2.stop();
        voice.subOsc.stop();
        voice.noise.stop();
        voice.lfo.stop();
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.subOsc.disconnect();
        voice.noise.disconnect();
        voice.filter.disconnect();
        voice.ampEnv.disconnect();
        voice.lfo.disconnect();
        voice.lfoGain.disconnect();
      } catch (e) {}
    }, (releaseTime + release - audioContext.currentTime) * 1000);
  }
  
  // Advance step
  patternStep = (patternStep + 1) % pattern.length;
  
  // Schedule next step
  let nextStepOffset = stepDuration;
  if (patternStep % 2 === 1 && state.swing > 0) {
    nextStepOffset += swingAdjust;
  }
  
  nextStepTime = when + nextStepOffset;
}

// Scheduler
function schedulerLoop() {
  if (!state.playing) return;
  
  const now = audioContext.currentTime;
  while (nextStepTime < now + scheduleAheadTime) {
    scheduleStep(nextStepTime);
  }
  
  scheduler = setTimeout(schedulerLoop, lookahead);
}

// Start/stop playback
function togglePlay() {
  if (state.playing) {
    state.playing = false;
    if (scheduler) clearTimeout(scheduler);
    document.getElementById('playBtn').textContent = '▶';
  } else {
    initAudio();
    state.playing = true;
    patternStep = 0;
    nextStepTime = audioContext.currentTime + 0.01;
    schedulerLoop();
    document.getElementById('playBtn').textContent = '⏸';
  }
}

// Update UI from state
function updateUI() {
  document.getElementById('bpmSlider').value = state.bpm;
  document.getElementById('bpmDisplay').textContent = `${state.bpm} BPM`;
  document.getElementById('swingSlider').value = state.swing;
  document.getElementById('swingDisplay').textContent = `Swing: ${state.swing}%`;
  document.getElementById('presetSelect').selectedIndex = state.presetId;
  document.getElementById('cutoff').value = state.knobs.cutoff;
  document.getElementById('resonance').value = state.knobs.resonance;
  document.getElementById('lfoRate').value = state.knobs.lfoRate;
  document.getElementById('lfoDepth').value = state.knobs.lfoDepth;
  document.getElementById('drive').value = state.knobs.drive;
  document.getElementById('patternIntensity').value = state.knobs.patternIntensity;
  document.getElementById('lfoSyncToggle').textContent = state.lfoSync ? 'Sync' : 'Hz';
  document.getElementById('limiterToggle').checked = state.limiterEnabled;
  
  // Update pattern select
  const patternSelect = document.getElementById('patternSelect');
  patternSelect.innerHTML = '';
  PATTERN_NAMES.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = name;
    patternSelect.appendChild(option);
  });
  
  // Highlight active pad
  document.querySelectorAll('.pad').forEach((pad, i) => {
    pad.style.background = (i + 1 === state.activePad) ? '#666' : '#444';
  });
}

// Apply state to synth
function applyState() {
  // Update limiter
  if (state.limiterEnabled) {
    compressor.disconnect();
    compressor.connect(limiter);
  } else {
    compressor.disconnect();
    compressor.connect(masterGain);
  }
  
  // Update all voices
  oscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  oscillators = [];
  filters = [];
  envelopes = [];
  lfos = [];
  noiseSources = [];
  subOscillators = [];
  
  if (state.playing) {
    patternStep = 0;
    nextStepTime = audioContext.currentTime + 0.01;
  }
}

// Randomize state (gentle)
function randomize() {
  const preset = presets[state.presetId];
  const padScene = preset.padScenes[state.activePad - 1];
  
  state.knobs.cutoff = Math.min(1, Math.max(0, padScene.cutoffBias + 0.5 + (Math.random() - 0.5) * 0.4));
  state.knobs.resonance = Math.min(1, Math.max(0, 0.5 + (Math.random() - 0.5) * 0.4));
  state.knobs.lfoRate = Math.min(1, Math.max(0, padScene.lfoRateBias + 0.5 + (Math.random() - 0.5) * 0.4));
  state.knobs.lfoDepth = Math.min(1, Math.max(0, padScene.lfoDepthBias + 0.5 + (Math.random() - 0.5) * 0.4));
  state.knobs.drive = Math.min(1, Math.max(0, padScene.driveBump + 0.5 + (Math.random() - 0.5) * 0.4));
  state.knobs.patternIntensity = Math.min(1, Math.max(0, padScene.patternIntensity + (Math.random() - 0.5) * 0.4));
  
  updateUI();
  applyState();
}

// Reset to preset defaults
function reset() {
  const preset = presets[state.presetId];
  const padScene = preset.padScenes[state.activePad - 1];
  
  state.knobs.cutoff = 0.5 + padScene.cutoffBias;
  state.knobs.resonance = 0.5;
  state.knobs.lfoRate = preset.lfo.rate + padScene.lfoRateBias;
  state.knobs.lfoDepth = preset.lfo.depth + padScene.lfoDepthBias;
  state.knobs.drive = preset.drive || 0.3 + padScene.driveBump;
  state.knobs.patternIntensity = padScene.patternIntensity;
  
  updateUI();
  applyState();
}

// Export state
function exportState() {
  const stateJson = JSON.stringify(state);
  document.getElementById('stateJson').value = stateJson;
}

// Import state
function importState() {
  try {
    const json = document.getElementById('stateJson').value;
    const imported = JSON.parse(json);
    Object.assign(state, imported);
    updateUI();
    applyState();
  } catch (e) {
    alert('Invalid JSON');
  }
}

// Tap tempo
let lastTap = 0;
function tapTempo() {
  const now = Date.now();
  if (lastTap && now - lastTap < 2000) {
    const bpm = 60000 / (now - lastTap);
    state.bpm = Math.min(220, Math.max(20, Math.round(bpm)));
    updateUI();
  }
  lastTap = now;
}

// Initialize UI
function initUI() {
  // Populate presets
  const presetSelect = document.getElementById('presetSelect');
  presets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  });
  
  // Update pattern select
  const patternSelect = document.getElementById('patternSelect');
  PATTERN_NAMES.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = name;
    patternSelect.appendChild(option);
  });
  
  // Event listeners
  document.getElementById('playBtn').addEventListener('click', togglePlay);
  document.getElementById('bpmSlider').addEventListener('input', (e) => {
    state.bpm = parseInt(e.target.value);
    updateUI();
  });
  document.getElementById('swingSlider').addEventListener('input', (e) => {
    state.swing = parseInt(e.target.value);
    updateUI();
  });
  document.getElementById('tapBtn').addEventListener('click', tapTempo);
  document.getElementById('prevPreset').addEventListener('click', () => {
    state.presetId = (state.presetId - 1 + presets.length) % presets.length;
    reset();
    updateUI();
  });
  document.getElementById('nextPreset').addEventListener('click', () => {
    state.presetId = (state.presetId + 1) % presets.length;
    reset();
    updateUI();
  });
  document.getElementById('presetSelect').addEventListener('change', (e) => {
    state.presetId = parseInt(e.target.value);
    reset();
    updateUI();
  });
  
  // Pad buttons
  document.querySelectorAll('.pad').forEach(pad => {
    pad.addEventListener('click', () => {
      state.activePad = parseInt(pad.dataset.pad);
      reset();
      updateUI();
    });
  });
  
  // Knobs
  document.getElementById('cutoff').addEventListener('input', (e) => {
    state.knobs.cutoff = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('resonance').addEventListener('input', (e) => {
    state.knobs.resonance = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('lfoRate').addEventListener('input', (e) => {
    state.knobs.lfoRate = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('lfoDepth').addEventListener('input', (e) => {
    state.knobs.lfoDepth = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('drive').addEventListener('input', (e) => {
    state.knobs.drive = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('patternIntensity').addEventListener('input', (e) => {
    state.knobs.patternIntensity = parseFloat(e.target.value);
    applyState();
  });
  document.getElementById('patternSelect').addEventListener('change', (e) => {
    // Pattern ID is handled by pad scenes, but intensity affects it
  });
  
  // LFO sync toggle
  document.getElementById('lfoSyncToggle').addEventListener('click', () => {
    state.lfoSync = !state.lfoSync;
    updateUI();
    applyState();
  });
  
  // Controls
  document.getElementById('randomize').addEventListener('click', randomize);
  document.getElementById('reset').addEventListener('click', reset);
  document.getElementById('limiterToggle').addEventListener('change', (e) => {
    state.limiterEnabled = e.target.checked;
    applyState();
  });
  document.getElementById('exportBtn').addEventListener('click', exportState);
  document.getElementById('importBtn').addEventListener('click', importState);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code >= 'Digit1' && e.code <= 'Digit8') {
      const pad = parseInt(e.code.replace('Digit', ''));
      state.activePad = pad;
      reset();
      updateUI();
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      state.bpm = Math.min(220, state.bpm + 1);
      updateUI();
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      state.bpm = Math.max(20, state.bpm - 1);
      updateUI();
    } else if (e.code === 'KeyR') {
      randomize();
    } else if (e.code === 'Digit0') {
      reset();
    }
  });
  
  // Initialize
  updateUI();
}

// Start when DOM loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}