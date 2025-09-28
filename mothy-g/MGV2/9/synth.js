// DnB Bass Synth Toy
// Web Audio API implementation with 88 presets and 8 variation pads

class DnBSynth {
  constructor() {
    this.audioContext = null;
    this.isRunning = false;
    this.playbackTime = 0;
    this.nextStepTime = 0;
    this.stepInterval = 0;
    this.bpm = 174;
    this.swing = 0;
    this.currentPreset = 0;
    this.currentPad = 1;
    this.patternIndex = 0;
    this.patternIntensity = 0.5;
    this.lfoSync = true;
    this.limiterEnabled = true;
    
    // Parameters (0-1 range)
    this.params = {
      cutoff: 0.5,
      resonance: 0.5,
      lfoRate: 0.5,
      lfoDepth: 0.5,
      drive: 0.5
    };
    
    // Audio nodes
    this.osc1 = null;
    this.osc2 = null;
    this.subOsc = null;
    this.noise = null;
    this.filter = null;
    this.ampEnv = null;
    this.modEnv = null;
    this.lfo = null;
    this.lfoGain = null;
    this.driveNode = null;
    this.compressor = null;
    this.width = null;
    this.limiter = null;
    this.masterGain = null;
    this.output = null;
    
    // Pattern engine
    this.patterns = this.createPatterns();
    this.currentPattern = this.patterns[0];
    
    // Presets
    this.presets = this.createPresets();
    
    // UI Elements
    this.elements = {};
    
    this.init();
  }
  
  init() {
    // Create audio context on first user interaction
    this.setupUI();
    this.populatePresets();
    this.loadState();
    this.setupAudio();
    this.setupEventListeners();
    this.setupKeyboard();
  }
  
  setupAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createNodes();
      this.connectNodes();
      this.applyPreset(this.presets[this.currentPreset]);
    }
  }
  
  createNodes() {
    const ctx = this.audioContext;
    
    // Oscillators
    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.subOsc = ctx.createOscillator();
    this.subOsc.frequency.value = 55; // A1
    
    // Noise
    this.noise = ctx.createBufferSource();
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    this.noise.buffer = noiseBuffer;
    this.noise.loop = true;
    
    // Filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    
    // Envelopes
    this.ampEnv = ctx.createGain();
    this.modEnv = ctx.createGain();
    
    // LFO
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfoGain = ctx.createGain();
    
    // Drive (waveshaper)
    this.driveNode = ctx.createWaveShaper();
    this.updateDriveCurve();
    
    // Compressor
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    
    // Stereo width
    this.width = ctx.createStereoPanner();
    
    // Limiter
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;
    
    // Master gain and output
    this.masterGain = ctx.createGain();
    this.output = ctx.createGain();
  }
  
  connectNodes() {
    const ctx = this.audioContext;
    
    // Osc mix
    const oscMix = ctx.createGain();
    this.osc1.connect(oscMix);
    this.osc2.connect(oscMix);
    this.subOsc.connect(oscMix);
    this.noise.connect(oscMix);
    
    // Signal path
    oscMix.connect(this.driveNode);
    this.driveNode.connect(this.filter);
    this.filter.connect(this.ampEnv);
    this.ampEnv.connect(this.compressor);
    this.compressor.connect(this.width);
    
    // LFO to filter cutoff
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    
    // Mod envelope to filter cutoff
    this.modEnv.connect(this.filter.frequency);
    
    // Master chain
    this.width.connect(this.masterGain);
    if (this.limiterEnabled) {
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.output);
    } else {
      this.masterGain.connect(this.output);
    }
    
    this.output.connect(ctx.destination);
    
    // Start oscillators
    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
    this.noise.start();
    this.lfo.start();
  }
  
  createPatterns() {
    // Each pattern: [gates, modLane] where gates: [0, 1, 2] (0=off, 1=on, 2=accent), modLane: [0-1]
    return [
      // Straight 1/8
      [[1,0,1,0,1,0,1,0], [0.5,0,0.5,0,0.5,0,0.5,0]],
      // Straight 1/16
      [[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], [0.3,0,0.5,0,0.3,0,0.5,0,0.3,0,0.5,0,0.3,0,0.5,0]],
      // Wobble
      [[1,0,0,0,1,0,0,0], [0.8,0.2,0.1,0.9,0.8,0.2,0.1,0.9]],
      // Offbeat
      [[0,1,0,1,0,1,0,1], [0,0.7,0,0.7,0,0.7,0,0.7]],
      // Stutter
      [[1,1,1,0,1,1,1,0], [0.9,0.8,0.7,0,0.9,0.8,0.7,0]],
      // Triplet Roll
      [[1,0,0,1,0,0,1,0,0,1,0,0], [0.6,0.3,0.1,0.6,0.3,0.1,0.6,0.3,0.1,0.6,0.3,0.1]],
      // Amen Syncopation
      [[1,0,1,1,0,1,0,1], [0.4,0,0.7,0.6,0,0.5,0,0.8]],
      // Long Hold
      [[1,0,0,0,0,0,0,0], [0.9,0.1,0.1,0.1,0.1,0.1,0.1,0.1]],
      // Half-Time
      [[1,0,0,0,1,0,0,0], [0.5,0.1,0.1,0.1,0.5,0.1,0.1,0.1]],
      // Double-Time
      [[1,1,1,1,1,1,1,1], [0.4,0.6,0.4,0.6,0.4,0.6,0.4,0.6]],
      // Syncopated
      [[0,1,0,0,1,0,1,0], [0,0.8,0,0.2,0.7,0,0.6,0]],
      // Rolling
      [[1,0,1,1,0,1,1,0], [0.5,0.2,0.8,0.7,0.3,0.6,0.9,0.1]]
    ];
  }
  
  createPresets() {
    const presets = [];
    const categories = ['Reese', 'Wobble', 'Neuro', 'Sub', 'Notch', 'Formant', 'Hoover', 'Metallic', 'Clean', 'Gritty'];
    
    // Generate 88 presets with varied parameters
    for (let i = 0; i < 88; i++) {
      const category = categories[i % categories.length];
      const baseFreq = 55; // A1
      
      // Oscillator settings
      const osc1Type = ['sawtooth', 'square', 'triangle'][i % 3];
      const osc2Type = ['sawtooth', 'square', 'triangle'][(i + 1) % 3];
      const detune = (i % 2 === 0) ? (20 + (i % 10) * 5) : 0;
      const spread = (i % 3 === 0) ? 0.3 : 0;
      const subLevel = (category === 'Sub') ? 0.8 : (0.2 + (i % 5) * 0.1);
      const noiseAmount = (category === 'Gritty' || category === 'Metallic') ? 0.3 : 0.1;
      
      // Filter settings
      const filterType = (category === 'Notch') ? 'notch' : 
                         (category === 'Formant') ? 'bandpass' : 'lowpass';
      const baseCutoff = (category === 'Sub') ? 0.3 : 
                         (category === 'Neuro' || category === 'Metallic') ? 0.7 : 0.5;
      const resonance = (category === 'Reese' || category === 'Wobble') ? 0.7 : 0.4;
      const keyTrack = (category === 'Formant') ? 0.8 : 0.3;
      
      // Envelopes
      const ampAttack = 0.01;
      const ampDecay = (category === 'Staccato') ? 0.1 : 0.3;
      const ampSustain = (category === 'Long Hold') ? 0.9 : 0.7;
      const ampRelease = 0.2;
      
      const modAttack = 0.01;
      const modDecay = 0.2;
      const modSustain = 0;
      const modRelease = 0.1;
      const modAmount = (category === 'Wobble' || category === 'Neuro') ? 0.4 : 0.2;
      
      // LFO
      const lfoType = ['sine', 'triangle', 'square', 'sawtooth'][i % 4];
      const lfoRate = (category === 'Wobble') ? 0.3 : 
                      (category === 'Neuro') ? 0.6 : 0.4;
      const lfoDepth = (category === 'Wobble' || category === 'Neuro') ? 0.5 : 0.3;
      const lfoTarget = 'cutoff'; // Always cutoff for simplicity
      
      // FX
      const chorusMix = (category === 'Hoover') ? 0.4 : 0.2;
      const delayMix = (category === 'Amen') ? 0.3 : 0.1;
      const reverbMix = (category === 'Atmospheric') ? 0.3 : 0.1;
      
      // Macro scenes for pads 1-8
      const padScenes = [];
      for (let pad = 1; pad <= 8; pad++) {
        const patternId = (i + pad) % this.patterns.length;
        const intensity = 0.3 + (pad * 0.1);
        const cutoffBias = 0.1 * (pad - 4);
        const driveBump = (pad > 4) ? 0.2 : 0;
        const lfoRateAdjust = (pad % 2 === 0) ? 0.1 : -0.1;
        const lfoDepthAdjust = (pad > 5) ? 0.2 : 0;
        const fxMixAdjust = 0.1 * (pad - 4);
        
        padScenes.push({
          patternId,
          intensity,
          cutoffBias,
          driveBump,
          lfoRateAdjust,
          lfoDepthAdjust,
          fxMixAdjust
        });
      }
      
      presets.push({
        name: `${category} ${i + 1}`,
        category,
        osc1Type,
        osc2Type,
        detune,
        spread,
        subLevel,
        noiseAmount,
        filterType,
        baseCutoff,
        resonance,
        keyTrack,
        ampAttack,
        ampDecay,
        ampSustain,
        ampRelease,
        modAttack,
        modDecay,
        modSustain,
        modRelease,
        modAmount,
        lfoType,
        lfoRate,
        lfoDepth,
        lfoTarget,
        chorusMix,
        delayMix,
        reverbMix,
        padScenes
      });
    }
    
    return presets;
  }
  
  applyPreset(preset) {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    
    // Oscillators
    this.osc1.type = preset.osc1Type;
    this.osc2.type = preset.osc2Type;
    this.osc1.detune.value = preset.detune;
    this.osc2.detune.value = -preset.detune;
    this.subOsc.frequency.value = 55;
    
    // Filter
    this.filter.type = preset.filterType;
    this.updateCutoff(preset.baseCutoff);
    this.updateResonance(preset.resonance);
    
    // Envelopes (simplified - we'll use fixed ADSR for now)
    // In a full implementation, we'd create envelope generators
    
    // LFO
    this.lfo.type = preset.lfoType;
    this.updateLfoRate(preset.lfoRate);
    this.updateLfoDepth(preset.lfoDepth);
    
    // Drive
    this.updateDrive(preset.drive || 0.5);
    
    // Update UI
    this.elements.cutoff.value = preset.baseCutoff;
    this.elements.resonance.value = preset.resonance;
    this.elements.lfoRate.value = preset.lfoRate;
    this.elements.lfoDepth.value = preset.lfoDepth;
    this.elements.drive.value = preset.drive || 0.5;
    
    // Pattern
    this.patternIndex = 0;
    this.elements.pattern.value = '0';
    this.patternIntensity = 0.5;
    this.elements.patternIntensity.value = '0.5';
    
    // Pad scenes
    this.currentPad = 1;
    this.applyPadScene(preset.padScenes[0]);
  }
  
  applyPadScene(scene) {
    // Update pattern
    this.patternIndex = scene.patternId;
    this.currentPattern = this.patterns[scene.patternId];
    this.elements.pattern.value = scene.patternId.toString();
    
    // Update parameters with scene adjustments
    const preset = this.presets[this.currentPreset];
    const newCutoff = Math.max(0, Math.min(1, preset.baseCutoff + scene.cutoffBias));
    const newDrive = Math.max(0, Math.min(1, (preset.drive || 0.5) + scene.driveBump));
    const newLfoRate = Math.max(0, Math.min(1, preset.lfoRate + scene.lfoRateAdjust));
    const newLfoDepth = Math.max(0, Math.min(1, preset.lfoDepth + scene.lfoDepthAdjust));
    
    this.updateCutoff(newCutoff);
    this.updateDrive(newDrive);
    this.updateLfoRate(newLfoRate);
    this.updateLfoDepth(newLfoDepth);
    
    // Update UI
    this.elements.cutoff.value = newCutoff;
    this.elements.drive.value = newDrive;
    this.elements.lfoRate.value = newLfoRate;
    this.elements.lfoDepth.value = newLfoDepth;
    this.elements.patternIntensity.value = scene.intensity;
    this.patternIntensity = scene.intensity;
  }
  
  updateCutoff(value) {
    this.params.cutoff = value;
    if (!this.audioContext) return;
    
    // Map 0-1 to 20-20000 Hz (log scale)
    const freq = 20 * Math.pow(1000, value);
    this.filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
  }
  
  updateResonance(value) {
    this.params.resonance = value;
    if (!this.audioContext) return;
    
    // Map 0-1 to 0-20 (but cap at 10 for stability)
    const q = value * 10;
    this.filter.Q.setValueAtTime(q, this.audioContext.currentTime);
  }
  
  updateLfoRate(value) {
    this.params.lfoRate = value;
    if (!this.audioContext) return;
    
    if (this.lfoSync) {
      // Sync to tempo: 1/16 notes at current BPM
      const stepDuration = 60 / this.bpm / 4; // 1/16 note in seconds
      const rate = 1 / (stepDuration * (1 - value * 0.9)); // 0.1x to 10x speed
      this.lfo.frequency.setValueAtTime(rate, this.audioContext.currentTime);
    } else {
      // Free running: 0.1 Hz to 20 Hz
      const freq = 0.1 * Math.pow(200, value);
      this.lfo.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    }
  }
  
  updateLfoDepth(value) {
    this.params.lfoDepth = value;
    if (!this.audioContext) return;
    
    // Depth affects filter cutoff modulation amount
    const depth = value * 2000; // Up to 2000 Hz modulation
    this.lfoGain.gain.setValueAtTime(depth, this.audioContext.currentTime);
  }
  
  updateDrive(value) {
    this.params.drive = value;
    if (!this.audioContext) return;
    
    this.driveNode.curve = this.makeDriveCurve(value);
  }
  
  makeDriveCurve(amount) {
    const k = amount * 100;
    const n = 44100;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n; i++) {
      const x = i * 2 / n - 1;
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    
    return curve;
  }
  
  updateDriveCurve() {
    if (!this.audioContext) return;
    this.driveNode.curve = this.makeDriveCurve(this.params.drive);
  }
  
  setupUI() {
    this.elements = {
      playBtn: document.getElementById('playBtn'),
      bpm: document.getElementById('bpm'),
      tapTempo: document.getElementById('tapTempo'),
      swing: document.getElementById('swing'),
      swingValue: document.getElementById('swingValue'),
      prevPreset: document.getElementById('prevPreset'),
      presetSelect: document.getElementById('presetSelect'),
      nextPreset: document.getElementById('nextPreset'),
      pads: document.querySelectorAll('.pad'),
      cutoff: document.getElementById('cutoff'),
      resonance: document.getElementById('resonance'),
      lfoRate: document.getElementById('lfoRate'),
      lfoSyncToggle: document.getElementById('lfoSyncToggle'),
      lfoDepth: document.getElementById('lfoDepth'),
      drive: document.getElementById('drive'),
      pattern: document.getElementById('pattern'),
      patternIntensity: document.getElementById('patternIntensity'),
      randomize: document.getElementById('randomize'),
      reset: document.getElementById('reset'),
      meterBar: document.getElementById('meterBar'),
      limiterToggle: document.getElementById('limiterToggle')
    };
  }
  
  populatePresets() {
    this.presets.forEach((preset, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = preset.name;
      this.elements.presetSelect.appendChild(option);
    });
  }
  
  setupEventListeners() {
    // Transport
    this.elements.playBtn.addEventListener('click', () => this.togglePlay());
    this.elements.bpm.addEventListener('change', (e) => {
      this.bpm = parseInt(e.target.value);
      this.updateStepInterval();
    });
    this.elements.tapTempo.addEventListener('click', () => this.handleTapTempo());
    this.elements.swing.addEventListener('input', (e) => {
      this.swing = parseInt(e.target.value);
      this.elements.swingValue.textContent = `${this.swing}%`;
    });
    
    // Presets
    this.elements.prevPreset.addEventListener('click', () => {
      this.currentPreset = (this.currentPreset - 1 + this.presets.length) % this.presets.length;
      this.elements.presetSelect.value = this.currentPreset;
      this.applyPreset(this.presets[this.currentPreset]);
      this.saveState();
    });
    this.elements.nextPreset.addEventListener('click', () => {
      this.currentPreset = (this.currentPreset + 1) % this.presets.length;
      this.elements.presetSelect.value = this.currentPreset;
      this.applyPreset(this.presets[this.currentPreset]);
      this.saveState();
    });
    this.elements.presetSelect.addEventListener('change', (e) => {
      this.currentPreset = parseInt(e.target.value);
      this.applyPreset(this.presets[this.currentPreset]);
      this.saveState();
    });
    
    // Pads
    this.elements.pads.forEach(pad => {
      pad.addEventListener('click', () => {
        const padNum = parseInt(pad.dataset.pad);
        this.currentPad = padNum;
        this.applyPadScene(this.presets[this.currentPreset].padScenes[padNum - 1]);
        this.saveState();
      });
    });
    
    // Knobs
    this.elements.cutoff.addEventListener('input', (e) => {
      this.updateCutoff(parseFloat(e.target.value));
      this.saveState();
    });
    this.elements.resonance.addEventListener('input', (e) => {
      this.updateResonance(parseFloat(e.target.value));
      this.saveState();
    });
    this.elements.lfoRate.addEventListener('input', (e) => {
      this.updateLfoRate(parseFloat(e.target.value));
      this.saveState();
    });
    this.elements.lfoSyncToggle.addEventListener('click', () => {
      this.lfoSync = !this.lfoSync;
      this.elements.lfoSyncToggle.textContent = this.lfoSync ? 'Sync' : 'Free';
      this.updateLfoRate(this.params.lfoRate);
      this.saveState();
    });
    this.elements.lfoDepth.addEventListener('input', (e) => {
      this.updateLfoDepth(parseFloat(e.target.value));
      this.saveState();
    });
    this.elements.drive.addEventListener('input', (e) => {
      this.updateDrive(parseFloat(e.target.value));
      this.saveState();
    });
    this.elements.pattern.addEventListener('change', (e) => {
      this.patternIndex = parseInt(e.target.value);
      this.currentPattern = this.patterns[this.patternIndex];
      this.saveState();
    });
    this.elements.patternIntensity.addEventListener('input', (e) => {
      this.patternIntensity = parseFloat(e.target.value);
      this.saveState();
    });
    
    // Controls
    this.elements.randomize.addEventListener('click', () => this.randomize());
    this.elements.reset.addEventListener('click', () => this.reset());
    this.elements.limiterToggle.addEventListener('change', () => {
      this.limiterEnabled = this.elements.limiterToggle.checked;
      this.reconnectOutput();
      this.saveState();
    });
  }
  
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case ' ':
          e.preventDefault();
          this.togglePlay();
          break;
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8':
          const padNum = parseInt(e.key);
          this.currentPad = padNum;
          this.applyPadScene(this.presets[this.currentPreset].padScenes[padNum - 1]);
          this.saveState();
          break;
        case '+': case '=':
          this.bpm = Math.min(220, this.bpm + 1);
          this.elements.bpm.value = this.bpm;
          this.updateStepInterval();
          this.saveState();
          break;
        case '-': case '_':
          this.bpm = Math.max(20, this.bpm - 1);
          this.elements.bpm.value = this.bpm;
          this.updateStepInterval();
          this.saveState();
          break;
        case 'r': case 'R':
          this.randomize();
          break;
        case '0':
          this.reset();
          break;
      }
    });
  }
  
  togglePlay() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.play();
    }
  }
  
  play() {
    if (!this.audioContext) {
      this.setupAudio();
    }
    
    this.isRunning = true;
    this.playbackTime = this.audioContext.currentTime;
    this.nextStepTime = this.playbackTime;
    this.updateStepInterval();
    this.elements.playBtn.textContent = '■';
    this.scheduler();
  }
  
  stop() {
    this.isRunning = false;
    this.elements.playBtn.textContent = '▶';
  }
  
  updateStepInterval() {
    // 16th notes at current BPM
    this.stepInterval = 60 / this.bpm / 4;
  }
  
  lastTap = 0;
  handleTapTempo() {
    const now = Date.now();
    if (this.lastTap && now - this.lastTap < 2000) {
      const bpm = 60000 / (now - this.lastTap);
      this.bpm = Math.min(220, Math.max(20, Math.round(bpm)));
      this.elements.bpm.value = this.bpm;
      this.updateStepInterval();
      this.saveState();
    }
    this.lastTap = now;
  }
  
  scheduler() {
    if (!this.isRunning) return;
    
    const currentTime = this.audioContext.currentTime;
    const lookahead = 0.1; // seconds
    
    while (this.nextStepTime < currentTime + lookahead) {
      this.scheduleStep(this.nextStepTime);
      this.nextStepTime += this.stepInterval;
    }
    
    // Apply swing
    if (this.swing > 0) {
      const swingOffset = (this.swing / 100) * this.stepInterval * 0.5;
      // Even steps (0-indexed) are delayed
      if (Math.floor((this.nextStepTime - this.playbackTime) / this.stepInterval) % 2 === 1) {
        this.nextStepTime += swingOffset;
      }
    }
    
    requestAnimationFrame(() => this.scheduler());
  }
  
  scheduleStep(time) {
    if (!this.currentPattern) return;
    
    const stepIndex = Math.floor((time - this.playbackTime) / this.stepInterval) % this.currentPattern[0].length;
    const gate = this.currentPattern[0][stepIndex];
    const modValue = this.currentPattern[1][stepIndex] * this.patternIntensity;
    
    if (gate > 0) {
      // Trigger amp envelope
      const accent = (gate === 2) ? 1.2 : 1;
      this.ampEnv.gain.setValueAtTime(0, time);
      this.ampEnv.gain.linearRampToValueAtTime(accent, time + 0.001);
      this.ampEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      
      // Mod envelope for filter
      this.modEnv.gain.setValueAtTime(0, time);
      this.modEnv.gain.linearRampToValueAtTime(modValue * 2000, time + 0.01);
      this.modEnv.gain.exponentialRampToValueAtTime(1, time + 0.2);
    }
  }
  
  randomize() {
    // Gentle randomization within musical ranges
    const preset = this.presets[this.currentPreset];
    
    // Cutoff: ±20% of original
    const cutoffRange = 0.2;
    const newCutoff = Math.max(0, Math.min(1, preset.baseCutoff + (Math.random() * 2 - 1) * cutoffRange));
    
    // Resonance: ±30% of original
    const resonanceRange = 0.3;
    const newResonance = Math.max(0, Math.min(1, preset.resonance + (Math.random() * 2 - 1) * resonanceRange));
    
    // LFO Rate: ±25% of original
    const lfoRateRange = 0.25;
    const newLfoRate = Math.max(0, Math.min(1, preset.lfoRate + (Math.random() * 2 - 1) * lfoRateRange));
    
    // LFO Depth: ±30% of original
    const lfoDepthRange = 0.3;
    const newLfoDepth = Math.max(0, Math.min(1, preset.lfoDepth + (Math.random() * 2 - 1) * lfoDepthRange));
    
    // Drive: ±20% of original
    const driveBase = preset.drive || 0.5;
    const driveRange = 0.2;
    const newDrive = Math.max(0, Math.min(1, driveBase + (Math.random() * 2 - 1) * driveRange));
    
    // Apply
    this.updateCutoff(newCutoff);
    this.updateResonance(newResonance);
    this.updateLfoRate(newLfoRate);
    this.updateLfoDepth(newLfoDepth);
    this.updateDrive(newDrive);
    
    // Update UI
    this.elements.cutoff.value = newCutoff;
    this.elements.resonance.value = newResonance;
    this.elements.lfoRate.value = newLfoRate;
    this.elements.lfoDepth.value = newLfoDepth;
    this.elements.drive.value = newDrive;
    
    this.saveState();
  }
  
  reset() {
    const preset = this.presets[this.currentPreset];
    this.applyPreset(preset);
    this.saveState();
  }
  
  reconnectOutput() {
    // Disconnect and reconnect output chain
    this.masterGain.disconnect();
    if (this.limiterEnabled) {
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.output);
    } else {
      this.masterGain.connect(this.output);
    }
  }
  
  saveState() {
    const state = {
      preset: this.currentPreset,
      pad: this.currentPad,
      bpm: this.bpm,
      swing: this.swing,
      cutoff: this.params.cutoff,
      resonance: this.params.resonance,
      lfoRate: this.params.lfoRate,
      lfoDepth: this.params.lfoDepth,
      drive: this.params.drive,
      pattern: this.patternIndex,
      patternIntensity: this.patternIntensity,
      lfoSync: this.lfoSync,
      limiter: this.limiterEnabled
    };
    
    try {
      localStorage.setItem('dnbBassState', JSON.stringify(state));
      window.location.hash = btoa(JSON.stringify(state));
    } catch (e) {
      // Ignore if storage fails
    }
  }
  
  loadState() {
    let state = null;
    
    // Try URL hash first
    if (window.location.hash) {
      try {
        state = JSON.parse(atob(window.location.hash.substring(1)));
      } catch (e) {
        // Invalid hash, try localStorage
      }
    }
    
    // Fallback to localStorage
    if (!state) {
      try {
        const stored = localStorage.getItem('dnbBassState');
        if (stored) state = JSON.parse(stored);
      } catch (e) {
        // Ignore
      }
    }
    
    if (state) {
      this.currentPreset = Math.max(0, Math.min(this.presets.length - 1, state.preset || 0));
      this.currentPad = Math.max(1, Math.min(8, state.pad || 1));
      this.bpm = Math.max(20, Math.min(220, state.bpm || 174));
      this.swing = Math.max(0, Math.min(60, state.swing || 0));
      this.patternIndex = Math.max(0, Math.min(this.patterns.length - 1, state.pattern || 0));
      this.patternIntensity = Math.max(0, Math.min(1, state.patternIntensity || 0.5));
      this.lfoSync = state.lfoSync !== false;
      this.limiterEnabled = state.limiter !== false;
      
      // Restore parameters
      this.params.cutoff = Math.max(0, Math.min(1, state.cutoff || 0.5));
      this.params.resonance = Math.max(0, Math.min(1, state.resonance || 0.5));
      this.params.lfoRate = Math.max(0, Math.min(1, state.lfoRate || 0.5));
      this.params.lfoDepth = Math.max(0, Math.min(1, state.lfoDepth || 0.5));
      this.params.drive = Math.max(0, Math.min(1, state.drive || 0.5));
      
      // Update UI
      this.elements.bpm.value = this.bpm;
      this.elements.swing.value = this.swing;
      this.elements.swingValue.textContent = `${this.swing}%`;
      this.elements.presetSelect.value = this.currentPreset;
      this.elements.pattern.value = this.patternIndex.toString();
      this.elements.patternIntensity.value = this.patternIntensity;
      this.elements.lfoSyncToggle.textContent = this.lfoSync ? 'Sync' : 'Free';
      this.elements.limiterToggle.checked = this.limiterEnabled;
      
      // Apply preset and pad scene
      this.applyPreset(this.presets[this.currentPreset]);
      this.applyPadScene(this.presets[this.currentPreset].padScenes[this.currentPad - 1]);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.synth = new DnBSynth();
});