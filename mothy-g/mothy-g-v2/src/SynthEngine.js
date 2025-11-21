/**
 * SynthEngine.js
 * Core synthesis engine for Mothy G using Tone.js
 */

const TONE_JS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

export class SynthEngine {
  constructor() {
    this.Tone = null;
    this.synth = null;
    this.filter = null;
    this.reverb = null;
    this.delay = null;
    this.chorus = null;
    this.compressor = null;
    this.initialized = false;
    this.activeNotes = new Map();
    
    // Default parameters
    this.params = {
      // Oscillators
      osc1Type: 'sawtooth',
      osc1Detune: 0,
      osc1Volume: 0,
      osc2Type: 'square',
      osc2Detune: 7,
      osc2Volume: -12,
      oscMix: 0.5,
      
      // Filter
      filterType: 'lowpass',
      filterFreq: 2000,
      filterQ: 1,
      filterEnvAmount: 3000,
      
      // Envelopes
      ampAttack: 0.01,
      ampDecay: 0.2,
      ampSustain: 0.7,
      ampRelease: 0.5,
      
      filterAttack: 0.01,
      filterDecay: 0.3,
      filterSustain: 0.5,
      filterRelease: 0.8,
      
      // Effects
      reverbMix: 0.2,
      reverbDecay: 2.5,
      delayTime: 0.25,
      delayFeedback: 0.3,
      delayMix: 0.15,
      chorusDepth: 0.5,
      chorusRate: 2,
      chorusMix: 0.2,
      
      // Global
      masterVolume: -6
    };
  }
  
  async init() {
    if (this.initialized) return;
    
    try {
      // Dynamic import of Tone.js
      const module = await import(TONE_JS_URL);
      // The module exports as { default: Tone }
      this.Tone = module.default || module.Tone || module;
      
      // Create synthesis chain
      await this.createSynthChain();
      
      this.initialized = true;
      console.log('Mothy G SynthEngine initialized');
    } catch (error) {
      console.error('Failed to initialize SynthEngine:', error);
      throw error;
    }
  }
  
  async createSynthChain() {
    const T = this.Tone;
    
    // Create dual oscillator synth
    this.synth = new T.PolySynth(T.Synth, {
      oscillator: {
        type: this.params.osc1Type,
        detune: this.params.osc1Detune
      },
      envelope: {
        attack: this.params.ampAttack,
        decay: this.params.ampDecay,
        sustain: this.params.ampSustain,
        release: this.params.ampRelease
      },
      volume: this.params.osc1Volume
    }).set({
      maxPolyphony: 16
    });
    
    // Create filter with envelope
    this.filter = new T.Filter({
      type: this.params.filterType,
      frequency: this.params.filterFreq,
      Q: this.params.filterQ
    });
    
    this.filterEnvelope = new T.FrequencyEnvelope({
      attack: this.params.filterAttack,
      decay: this.params.filterDecay,
      sustain: this.params.filterSustain,
      release: this.params.filterRelease,
      baseFrequency: this.params.filterFreq,
      octaves: Math.log2(this.params.filterEnvAmount / this.params.filterFreq)
    });
    
    this.filterEnvelope.connect(this.filter.frequency);
    
    // Create effects
    this.chorus = new T.Chorus({
      frequency: this.params.chorusRate,
      delayTime: 3.5,
      depth: this.params.chorusDepth,
      wet: this.params.chorusMix
    }).start();
    
    this.delay = new T.FeedbackDelay({
      delayTime: this.params.delayTime,
      feedback: this.params.delayFeedback,
      wet: this.params.delayMix
    });
    
    this.reverb = new T.Reverb({
      decay: this.params.reverbDecay,
      wet: this.params.reverbMix
    });
    
    this.compressor = new T.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.1
    });
    
    // Connect the chain
    this.synth.connect(this.filter);
    this.filter.connect(this.chorus);
    this.chorus.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.compressor);
    this.compressor.toDestination();
    
    // Set master volume
    T.Destination.volume.value = this.params.masterVolume;
  }
  
  async start() {
    if (!this.initialized) {
      await this.init();
    }
    await this.Tone.start();
    console.log('Mothy G audio context started');
  }
  
  playNote(note, velocity = 0.8, duration = null) {
    if (!this.initialized) {
      console.warn('SynthEngine not initialized');
      return;
    }
    
    const freq = this.midiToFreq(note);
    const vel = velocity * 0.8; // Scale velocity
    
    if (duration) {
      // Triggered note with duration
      this.synth.triggerAttackRelease(freq, duration, undefined, vel);
      this.filterEnvelope.triggerAttackRelease(duration);
    } else {
      // Sustained note
      this.synth.triggerAttack(freq, undefined, vel);
      this.filterEnvelope.triggerAttack();
      this.activeNotes.set(note, freq);
    }
  }
  
  stopNote(note) {
    if (!this.initialized || !this.activeNotes.has(note)) return;
    
    const freq = this.activeNotes.get(note);
    this.synth.triggerRelease(freq);
    this.filterEnvelope.triggerRelease();
    this.activeNotes.delete(note);
  }
  
  stopAllNotes() {
    this.synth.releaseAll();
    this.activeNotes.clear();
  }
  
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  
  updateParam(param, value) {
    if (!this.initialized) return;
    
    this.params[param] = value;
    const T = this.Tone;
    
    try {
      switch (param) {
        // Oscillator parameters
        case 'osc1Type':
          this.synth.set({ oscillator: { type: value } });
          break;
        case 'osc1Detune':
          this.synth.set({ oscillator: { detune: value } });
          break;
        case 'osc1Volume':
          this.synth.volume.value = value;
          break;
          
        // Amp envelope
        case 'ampAttack':
          this.synth.set({ envelope: { attack: value } });
          break;
        case 'ampDecay':
          this.synth.set({ envelope: { decay: value } });
          break;
        case 'ampSustain':
          this.synth.set({ envelope: { sustain: value } });
          break;
        case 'ampRelease':
          this.synth.set({ envelope: { release: value } });
          break;
          
        // Filter parameters
        case 'filterType':
          this.filter.type = value;
          break;
        case 'filterFreq':
          this.filter.frequency.value = value;
          this.filterEnvelope.baseFrequency = value;
          break;
        case 'filterQ':
          this.filter.Q.value = value;
          break;
        case 'filterEnvAmount':
          this.filterEnvelope.octaves = Math.log2(value / this.params.filterFreq);
          break;
          
        // Filter envelope
        case 'filterAttack':
          this.filterEnvelope.attack = value;
          break;
        case 'filterDecay':
          this.filterEnvelope.decay = value;
          break;
        case 'filterSustain':
          this.filterEnvelope.sustain = value;
          break;
        case 'filterRelease':
          this.filterEnvelope.release = value;
          break;
          
        // Effects
        case 'reverbMix':
          this.reverb.wet.value = value;
          break;
        case 'reverbDecay':
          this.reverb.decay = value;
          break;
        case 'delayTime':
          this.delay.delayTime.value = value;
          break;
        case 'delayFeedback':
          this.delay.feedback.value = value;
          break;
        case 'delayMix':
          this.delay.wet.value = value;
          break;
        case 'chorusDepth':
          this.chorus.depth = value;
          break;
        case 'chorusRate':
          this.chorus.frequency.value = value;
          break;
        case 'chorusMix':
          this.chorus.wet.value = value;
          break;
          
        // Master
        case 'masterVolume':
          T.Destination.volume.value = value;
          break;
      }
    } catch (error) {
      console.error(`Error updating param ${param}:`, error);
    }
  }
  
  loadPreset(preset) {
    Object.keys(preset.params).forEach(param => {
      this.updateParam(param, preset.params[param]);
    });
  }
  
  getCurrentParams() {
    return { ...this.params };
  }
  
  dispose() {
    if (this.synth) this.synth.dispose();
    if (this.filter) this.filter.dispose();
    if (this.filterEnvelope) this.filterEnvelope.dispose();
    if (this.reverb) this.reverb.dispose();
    if (this.delay) this.delay.dispose();
    if (this.chorus) this.chorus.dispose();
    if (this.compressor) this.compressor.dispose();
    this.initialized = false;
  }
}
