/*
 * mothy-g.js
 *
 * Core engine for the Mothy G synthesizer. This file defines a modular
 * synthesizer built on top of the Web Audio API. Voices are created per
 * note and consist of two wavetable oscillators, a sub oscillator, a
 * simple FM operator, envelopes and two filters. A lightweight effects
 * section applies chorus, delay, reverb and transient shaping on the
 * master bus. A step sequencer triggers notes at tempo with swing and
 * polymetric support. A mod matrix allows sources such as LFOs and
 * envelopes to modulate various destinations.
 *
 * The synthesizer is intended to be extensible: adding new wavetables is
 * as simple as defining new PeriodicWave objects in the Wavetables
 * collection. See the Wavetables definition near the bottom of this file
 * for examples. To add a new wavetable, supply two arrays of sine and
 * cosine harmonics of equal length. See the Web Audio spec for details.
 */

// Immediately invoked async function to encapsulate all code and enable
// top‑level await if necessary.
(function() {
  'use strict';

  /**
   * Utility to clamp a value to a range.
   * @param {number} v
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /**
   * Linear interpolation.
   * @param {number} a
   * @param {number} b
   * @param {number} t
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Simple pseudo‑random generator for deterministic seed randomisation.
   * Uses a linear congruential generator with fixed parameters. See
   * https://en.wikipedia.org/wiki/Linear_congruential_generator
   */
  class PRNG {
    constructor(seed = 1) {
      this.m = 0x80000000; // 2^31
      this.a = 1103515245;
      this.c = 12345;
      this.state = seed >>> 0;
    }
    next() {
      this.state = (this.a * this.state + this.c) % this.m;
      return this.state / this.m;
    }
  }

  /**
   * Wavetable definitions. Each wavetable is defined as an object
   * containing arrays of real and imag components for a PeriodicWave.
   */
  const Wavetables = {
    sine: {
      real: [0, 0],
      imag: [0, 1]
    },
    triangle: {
      real: new Float32Array([0, 0, 0, 0, 0, 0]),
      imag: new Float32Array([0, 0, 1, 0, 1/9, 0])
    },
    saw: {
      real: new Float32Array([0, 0, 0, 0, 0, 0, 0]),
      imag: new Float32Array([0, 1, 1/2, 1/3, 1/4, 1/5, 1/6])
    },
    square: {
      real: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]),
      imag: new Float32Array([0, 1, 0, 1/3, 0, 1/5, 0, 1/7])
    }
  };

  /**
   * Create a PeriodicWave from a wavetable definition.
   * @param {BaseAudioContext} context
   * @param {Object} def
   */
  function createWave(context, def) {
    return context.createPeriodicWave(def.real, def.imag, { disableNormalization: false });
  }

  /**
   * Envelope generator. Uses exponential and linear ramps for Attack,
   * Decay, Sustain and Release. Times are given in milliseconds.
   */
  class Envelope {
    constructor(context) {
      this.context = context;
      this.attack = 5;
      this.decay = 200;
      this.sustain = 0.8;
      this.release = 400;
    }
    /**
     * Trigger envelope on given AudioParam at scheduled time.
     * @param {AudioParam} param
     * @param {number} time
     * @param {number} maxVal
     */
    trigger(param, time = this.context.currentTime, maxVal = 1) {
      const att = this.attack / 1000;
      const dec = this.decay / 1000;
      const rel = this.release / 1000;
      if (typeof param.cancelScheduledValues === 'function') {
        param.cancelScheduledValues(time);
      }
      if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(0, time);
      } else {
        param.value = 0;
      }
      if (att > 0 && typeof param.linearRampToValueAtTime === 'function') {
        param.linearRampToValueAtTime(maxVal, time + att);
      } else if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(maxVal, time);
      } else {
        param.value = maxVal;
      }
      // decay to sustain
      const sustainValue = maxVal * this.sustain;
      if (dec > 0 && typeof param.linearRampToValueAtTime === 'function') {
        param.linearRampToValueAtTime(sustainValue, time + att + dec);
      } else if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(sustainValue, time + att);
      } else {
        param.value = sustainValue;
      }
    }
    /**
     * Release envelope starting at given time.
     * @param {AudioParam} param
     * @param {number} time
     */
    releaseEnvelope(param, time = this.context.currentTime) {
      const rel = this.release / 1000;
      const current = typeof param.value === 'number' ? param.value : 0;
      if (typeof param.cancelScheduledValues === 'function') {
        param.cancelScheduledValues(time);
      }
      if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(current, time);
      } else {
        param.value = current;
      }
      if (rel > 0 && typeof param.linearRampToValueAtTime === 'function') {
        param.linearRampToValueAtTime(0, time + rel);
      } else if (typeof param.setValueAtTime === 'function') {
        param.setValueAtTime(0, time);
      } else {
        param.value = 0;
      }
    }
  }

  /**
   * Low frequency oscillator. Provides an output value in the range
   * [-1,1] and supports various wave shapes. The LFO is implemented
   * using a ScriptProcessor (via AudioWorklet? But we can't use worklets
   * here). For simplicity we use a regular OscillatorNode feeding a gain
   * node, and we scale its output via the mod matrix.
   */
  class LFO {
    constructor(context, rate = 1, type = 'sine') {
      this.context = context;
      this.osc = context.createOscillator();
      this.gain = context.createGain();
      this.osc.type = type;
      this.osc.frequency.value = rate;
      this.osc.connect(this.gain);
      this.osc.start();
    }
    connect(param) {
      this.gain.connect(param);
    }
    setRate(rate) {
      this.osc.frequency.setValueAtTime(rate, this.context.currentTime);
    }
    setType(type) {
      this.osc.type = type;
    }
    setDepth(depth) {
      this.gain.gain.setValueAtTime(depth, this.context.currentTime);
    }
  }

  /**
   * Voice represents a single playing note. Each voice creates its own
   * oscillators, filters, envelope and output gain. When a voice is
   * released it will disconnect itself after its envelope finishes.
   */
  class Voice {
    constructor(synth, note, velocity, time) {
      this.synth = synth;
      this.note = note;
      this.velocity = velocity;
      this.context = synth.context;
      this.output = this.context.createGain();
      this.output.gain.value = 0;

      // Oscillator A
      this.oscA = this.context.createOscillator();
      this.oscA.setPeriodicWave(synth.waves[synth.params.oscA.wave]);
      const freqA = synth.noteToFreq(note) * Math.pow(2, synth.params.oscA.tune / 12);
      this.oscA.frequency.value = freqA;
      // fine tune in cents
      this.oscA.detune.value = synth.params.oscA.fine;
      // gain
      this.oscAGain = this.context.createGain();
      this.oscAGain.gain.value = synth.params.oscA.level;
      // pan
      this.oscAPan = this.context.createStereoPanner();
      this.oscAPan.pan.value = synth.params.oscA.pan;
      // connect chain
      this.oscA.connect(this.oscAGain).connect(this.oscAPan).connect(this.output);

      // Oscillator B
      this.oscB = this.context.createOscillator();
      this.oscB.setPeriodicWave(synth.waves[synth.params.oscB.wave]);
      const freqB = synth.noteToFreq(note) * Math.pow(2, synth.params.oscB.tune / 12);
      this.oscB.frequency.value = freqB;
      this.oscB.detune.value = synth.params.oscB.fine;
      this.oscBGain = this.context.createGain();
      this.oscBGain.gain.value = synth.params.oscB.level;
      this.oscBPan = this.context.createStereoPanner();
      this.oscBPan.pan.value = synth.params.oscB.pan;
      this.oscB.connect(this.oscBGain).connect(this.oscBPan).connect(this.output);

      // Sub oscillator: sine and square blend
      this.subSine = this.context.createOscillator();
      this.subSine.type = 'sine';
      this.subSquare = this.context.createOscillator();
      this.subSquare.type = 'square';
      const subFreq = synth.noteToFreq(note);
      this.subSine.frequency.value = subFreq;
      this.subSquare.frequency.value = subFreq;
      this.subMixGain = this.context.createGain();
      // mix square blend
      this.subSquareGain = this.context.createGain();
      this.subSquareGain.gain.value = synth.params.sub.blend;
      this.subSineGain = this.context.createGain();
      this.subSineGain.gain.value = 1 - synth.params.sub.blend;
      // saturator before output (gentle waveshaper)
      this.subPreGain = this.context.createGain();
      this.subPreGain.gain.value = 1;
      this.subDrive = this.context.createWaveShaper();
      this.subDrive.curve = synth.makeSaturationCurve(synth.params.sub.saturation);
      this.subDrive.oversample = '4x';
      this.subGain = this.context.createGain();
      this.subGain.gain.value = synth.params.sub.level;
      // connections
      this.subSine.connect(this.subSineGain).connect(this.subPreGain);
      this.subSquare.connect(this.subSquareGain).connect(this.subPreGain);
      this.subPreGain.connect(this.subDrive).connect(this.subGain).connect(this.output);

      // FM operator: modulator oscillator controlling OscA frequency
      this.fmOsc = this.context.createOscillator();
      this.fmOsc.frequency.value = freqA * synth.params.fm.ratio;
      this.fmGain = this.context.createGain();
      this.fmGain.gain.value = synth.params.fm.index;
      this.fmOsc.connect(this.fmGain).connect(this.oscA.frequency);

      // Filters: two filters and mix
      this.filter1 = this.context.createBiquadFilter();
      this.filter2 = this.context.createBiquadFilter();
      this.filter1.type = synth.params.filter1.type;
      this.filter1.frequency.value = synth.params.filter1.cutoff;
      this.filter1.Q.value = synth.params.filter1.res;
      this.filter2.type = synth.params.filter2.type;
      this.filter2.frequency.value = synth.params.filter2.cutoff;
      this.filter2.Q.value = synth.params.filter2.res;
      this.baseFilter1Cutoff = synth.params.filter1.cutoff;
      this.baseFilter2Cutoff = synth.params.filter2.cutoff;
      // drive implemented as waveshaper after filter1
      this.filter1Drive = this.context.createWaveShaper();
      this.filter1Drive.curve = synth.makeSaturationCurve(synth.params.filter1.drive);
      this.filter1Drive.oversample = '4x';
      this.filter2Drive = this.context.createWaveShaper();
      this.filter2Drive.curve = synth.makeSaturationCurve(synth.params.filter2.drive);
      this.filter2Drive.oversample = '4x';

      // mixing: serial/parallel mix control
      this.filterMix = this.context.createGain();
      this.filterMix.gain.value = synth.params.filterMix;
      this.dryGain = this.context.createGain();
      this.dryGain.gain.value = 1 - synth.params.filterMix;
      // route output -> filter1 chain, filter2 chain, then crossfade
      this.output.connect(this.filter1).connect(this.filter1Drive);
      this.output.connect(this.filter2).connect(this.filter2Drive);
      this.filter1Drive.connect(this.filterMix);
      this.filter2Drive.connect(this.filterMix);
      this.output.connect(this.dryGain);
      // final voice gain after filters
      this.voiceGain = this.context.createGain();
      this.voiceGain.gain.value = 0;
      // combine filter mix & dry into voiceGain
      this.filterMix.connect(this.voiceGain);
      this.dryGain.connect(this.voiceGain);

      // connect to master pre‑bus
      this.voiceGain.connect(synth.preBus);

      // Envelope
      this.env = new Envelope(this.context);
      this.env.attack = synth.params.ampEnv.attack;
      this.env.decay = synth.params.ampEnv.decay;
      this.env.sustain = synth.params.ampEnv.sustain;
      this.env.release = synth.params.ampEnv.release;
      // filter envelope influences filter cutoff
      this.filterEnv = new Envelope(this.context);
      this.filterEnv.attack = synth.params.filterEnv.attack;
      this.filterEnv.decay = synth.params.filterEnv.decay;
      this.filterEnv.sustain = synth.params.filterEnv.sustain;
      this.filterEnv.release = synth.params.filterEnv.release;
      this.filterEnvAmount = synth.params.filterEnv.amount;
      // mod envelope
      this.modEnv = new Envelope(this.context);
      this.modEnv.attack = synth.params.modEnv.attack;
      this.modEnv.decay = synth.params.modEnv.decay;
      this.modEnv.sustain = synth.params.modEnv.sustain;
      this.modEnv.release = synth.params.modEnv.release;
      this.modEnvAmount = synth.params.modEnv.amount;

      // Start all oscillators now; envelopes and gain will handle amplitude
      this.oscA.start(time);
      this.oscB.start(time);
      this.subSine.start(time);
      this.subSquare.start(time);
      this.fmOsc.start(time);
      // Trigger envelopes
      this.trigger(time);
    }
    trigger(time) {
      const startTime = time ?? this.context.currentTime;
      this.env.trigger(this.voiceGain.gain, startTime, this.velocity);
      this.scheduleFilterEnvelope(startTime);
    }
    scheduleFilterEnvelope(time) {
      const env = this.filterEnv;
      const amount = this.filterEnvAmount;
      const attack = Math.max(0, env.attack) / 1000;
      const decay = Math.max(0, env.decay) / 1000;
      const sustainLevel = clamp(env.sustain, 0, 1);
      const nyquist = this.context.sampleRate / 2;
      const modDepthInOctaves = 2; // allow up to +/- 2 octaves of movement
      const factor = amount === 0 ? 1 : Math.pow(2, amount * modDepthInOctaves);
      const schedule = (filter, baseCutoff) => {
        const base = clamp(baseCutoff, 20, nyquist);
        const param = filter.frequency;
        if (typeof param.cancelScheduledValues === 'function') {
          param.cancelScheduledValues(time);
        }
        if (typeof param.setValueAtTime === 'function') {
          param.setValueAtTime(base, time);
        } else {
          param.value = base;
        }
        if (amount === 0) return;
        const peak = clamp(base * factor, 20, nyquist);
        if (attack > 0 && typeof param.linearRampToValueAtTime === 'function') {
          param.linearRampToValueAtTime(peak, time + attack);
        } else if (typeof param.setValueAtTime === 'function') {
          param.setValueAtTime(peak, time);
        } else {
          param.value = peak;
        }
        const sustainValue = clamp(lerp(base, peak, sustainLevel), 20, nyquist);
        if (decay > 0 && typeof param.linearRampToValueAtTime === 'function') {
          param.linearRampToValueAtTime(sustainValue, time + attack + decay);
        } else if (typeof param.setValueAtTime === 'function') {
          param.setValueAtTime(sustainValue, time + attack);
        } else {
          param.value = sustainValue;
        }
      };
      schedule(this.filter1, this.baseFilter1Cutoff);
      schedule(this.filter2, this.baseFilter2Cutoff);
    }
    release(time) {
      this.env.releaseEnvelope(this.voiceGain.gain, time);
      // After release time, stop oscillators and disconnect
      const cleanupDelay = this.env.release / 1000 + 0.1;
      const releaseSeconds = Math.max(0, this.filterEnv.release) / 1000;
      const nyquist = this.context.sampleRate / 2;
      const restoreFilter = (filter, base) => {
        const param = filter.frequency;
        const current = typeof param.value === 'number' ? param.value : clamp(base, 20, nyquist);
        if (typeof param.cancelScheduledValues === 'function') {
          param.cancelScheduledValues(time);
        }
        if (typeof param.setValueAtTime === 'function') {
          param.setValueAtTime(current, time);
        } else {
          param.value = current;
        }
        const target = clamp(base, 20, nyquist);
        if (releaseSeconds > 0 && typeof param.linearRampToValueAtTime === 'function') {
          param.linearRampToValueAtTime(target, time + releaseSeconds);
        } else if (typeof param.setValueAtTime === 'function') {
          param.setValueAtTime(target, time + releaseSeconds);
        } else {
          param.value = target;
        }
      };
      restoreFilter(this.filter1, this.baseFilter1Cutoff);
      restoreFilter(this.filter2, this.baseFilter2Cutoff);
      const cleanup = () => {
        this.oscA.stop();
        this.oscB.stop();
        this.subSine.stop();
        this.subSquare.stop();
        this.fmOsc.stop();
        this.voiceGain.disconnect();
      };
      setTimeout(cleanup, cleanupDelay * 1000);
    }
  }

  /**
   * Step sequencer class. Maintains patterns for lanes and schedules note
   * events at the appropriate times. This implementation uses a
   * simple timer loop with lookahead to schedule notes. For accurate
   * timing the Web Audio Clock is used and events are scheduled on
   * oscillator nodes.
   */
  class StepSequencer {
    constructor(synth) {
      this.synth = synth;
      // do not cache the context here; it may not exist yet. Always
      // reference this.synth.context when scheduling notes.
      this.steps = 16;
      this.lanes = 2; // lane 0 = bass (mono), lane1 = pluck (poly)
      this.patterns = [];
      for (let lane = 0; lane < this.lanes; lane++) {
        this.patterns[lane] = new Array(this.steps).fill(null);
      }
      this.isPlaying = false;
      this.currentStep = 0;
      this.nextNoteTime = 0;
      this.lookahead = 0.1; // seconds to schedule ahead
      this.scheduleInterval = 25; // ms for scheduler
    }
    start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.currentStep = 0;
      // schedule slightly ahead using the synth's audio context
      this.nextNoteTime = this.synth.context.currentTime + 0.05;
      this.scheduler();
    }
    stop() {
      this.isPlaying = false;
    }
    scheduler() {
      if (!this.isPlaying) return;
      while (this.nextNoteTime < this.synth.context.currentTime + this.lookahead) {
        this.scheduleStep(this.currentStep, this.nextNoteTime);
        const secondsPerBeat = 60.0 / this.synth.params.bpm;
        const swing = this.synth.params.swing;
        // Each step is 16th note -> quarter note / 4
        let stepTime = secondsPerBeat / 4;
        // apply swing: odd steps delayed
        if (this.currentStep % 2 === 1) {
          stepTime += swing * stepTime;
        }
        this.nextNoteTime += stepTime;
        this.currentStep = (this.currentStep + 1) % this.steps;
      }
      setTimeout(this.scheduler.bind(this), this.scheduleInterval);
    }
    scheduleStep(stepIndex, time) {
      // highlight UI step
      const cells = document.querySelectorAll('.seq-step');
      cells.forEach((cell, idx) => {
        if (idx % this.steps === stepIndex) {
          cell.classList.add('playhead');
        } else {
          cell.classList.remove('playhead');
        }
      });
      // lane 0: bass lane (monophonic)
      const bassNote = this.patterns[0][stepIndex];
      if (bassNote) {
        this.synth.noteOn(bassNote.note, bassNote.velocity, time, 0);
      }
      // lane1: pluck lane (poly, but limited to 4 voices)
      const pluck = this.patterns[1][stepIndex];
      if (pluck) {
        this.synth.noteOn(pluck.note, pluck.velocity, time, 1);
      }
    }
    setSteps(n) {
      this.steps = n;
      for (let lane = 0; lane < this.lanes; lane++) {
        this.patterns[lane].length = n;
        this.patterns[lane].fill(null);
      }
    }
  }

  /**
   * The main synthesizer class tying together all modules: voices, mod
   * matrix, LFOs, envelopes, effects and UI integration.
   */
  class Synth {
    constructor() {
      this.context = null;
      this.started = false;
      // Parameter state
      this.params = {
        master: { volume: 0.8, limiterCeiling: 0.95 },
        bpm: 174,
        swing: 0.0,
        oscA: { wave: 'saw', morph: 0, tune: 0, fine: 0, level: 0.5, pan: 0 },
        oscB: { wave: 'sine', morph: 0, tune: 0, fine: 0, level: 0.3, pan: 0 },
        sub: { level: 0.5, blend: 0.0, saturation: 0.0 },
        fm: { ratio: 2, index: 0, attack: 10, decay: 100 },
        filter1: { type: 'lowpass', cutoff: 800, res: 1, drive: 0, keytrack: 0.5 },
        filter2: { type: 'bandpass', cutoff: 2000, res: 1, drive: 0 },
        filterMix: 0.5,
        ampEnv: { attack: 5, decay: 200, sustain: 0.8, release: 400 },
        filterEnv: { amount: 0.3, attack: 5, decay: 200, sustain: 0.8, release: 400 },
        modEnv: { amount: 0.5, attack: 10, decay: 300, sustain: 0.6, release: 500 },
        lfo1: { rate: 1, shape: 'sine', fade: 0 },
        lfo2: { rate: 0.25, shape: 'triangle', fade: 0 },
        lfo3: { rate: 0.125, shape: 'sine', fade: 0 },
        chorus: { depth: 0.2, rate: 0.5 },
        delay: { time: 0.25, feedback: 0.3, mix: 0.2 },
        reverb: { size: 0.5, decay: 2, preDelay: 0.05, mix: 0.3 },
        transient: { attack: 0.5, sustain: 0.5 },
        modMatrix: []
      };
      // voices: track active voices per lane
      this.activeVoices = [[], []];
      // dictionary of periodic waves per waveform label
      this.waves = {};
      // Pre‑bus for pre‑effects saturation
      this.preBus = null;
      this.masterGain = null;
      this.limiter = null;
      // FX nodes
      this.chorus = null;
      this.delay = null;
      this.reverbPreDelay = null;
      this.reverb = null;
      this.transient = null;
      // Sequencer
      this.sequencer = new StepSequencer(this);
      // LFOs
      this.lfos = {};
      // Visualizer analyser
      this.analyser = null;
      // State saving
      this.seed = 0;
    }
    initContext() {
      if (this.context) return;
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      // Create waves
      for (const name in Wavetables) {
        this.waves[name] = createWave(this.context, Wavetables[name]);
      }
      // Pre bus and master chain
      this.preBus = this.context.createGain();
      // Pre‑bus gentle tape saturation via waveshaper
      this.preDrive = this.context.createWaveShaper();
      this.preDrive.curve = this.makeSaturationCurve(0.1);
      this.preDrive.oversample = '4x';
      this.preBus.connect(this.preDrive);
      // Chorus effect: simple delay modulated by LFO
      const chorusParams = this.params.chorus;
      this.chorusDelay = this.context.createDelay(0.05);
      this.chorusLFO = this.context.createOscillator();
      this.chorusLFOGain = this.context.createGain();
      this.chorusLFO.frequency.value = chorusParams.rate;
      this.chorusLFO.type = 'sine';
      this.chorusLFOGain.gain.value = 0.002;
      this.chorusLFO.connect(this.chorusLFOGain).connect(this.chorusDelay.delayTime);
      this.chorusLFO.start();
      this.chorusDepth = this.context.createGain();
      this.chorusDepth.gain.value = chorusParams.depth;
      // Delay effect
      const delayParams = this.params.delay;
      this.delay = this.context.createDelay(2.0);
      this.delay.delayTime.value = delayParams.time;
      this.delayFeedback = this.context.createGain();
      this.delayFeedback.gain.value = delayParams.feedback;
      this.delay.connect(this.delayFeedback).connect(this.delay);
      // Delay mix
      this.delayMix = this.context.createGain();
      this.delayMix.gain.value = delayParams.mix;
      // Reverb: simple convolution with generated impulse
      const reverbParams = this.params.reverb;
      this.reverbPreDelay = this.context.createDelay(1.0);
      this.reverbPreDelay.delayTime.value = reverbParams.preDelay;
      this.reverb = this.context.createConvolver();
      this.reverb.buffer = this.createReverbImpulse(reverbParams.size * 3, reverbParams.decay);
      this.reverbMix = this.context.createGain();
      this.reverbMix.gain.value = reverbParams.mix;
      // Transient shaper approximated by a compressor
      const transientParams = this.params.transient;
      this.transient = this.context.createDynamicsCompressor();
      this.transient.attack.setValueAtTime(transientParams.attack * 0.1, this.context.currentTime);
      this.transient.release.setValueAtTime((1 - transientParams.sustain) * 0.5, this.context.currentTime);
      // Master gain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.params.master.volume;
      // Limiter: we approximate using DynamicsCompressor with high ratio
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-1 * (1 - this.params.master.limiterCeiling) * 20, this.context.currentTime);
      this.limiter.knee.setValueAtTime(0, this.context.currentTime);
      this.limiter.ratio.setValueAtTime(20, this.context.currentTime);
      this.limiter.attack.setValueAtTime(0.005, this.context.currentTime);
      this.limiter.release.setValueAtTime(0.05, this.context.currentTime);
      // analyser for visuals
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      // Connect chain: preBus -> preDrive -> chorus -> delay/reverb -> transient -> master -> limiter -> analyser -> destination
      // Dry path through preDrive and chorus depth
      this.preDrive.connect(this.chorusDelay);
      this.chorusDelay.connect(this.chorusDepth);
      this.preDrive.connect(this.chorusDepth);
      // Delay send/return
      this.chorusDepth.connect(this.delay);
      this.delay.connect(this.delayMix);
      // Reverb send/return with optional pre-delay
      this.chorusDepth.connect(this.reverbPreDelay);
      this.reverbPreDelay.connect(this.reverb);
      this.reverb.connect(this.reverbMix);
      // combine delay mix and reverb mix
      const fxSum = this.context.createGain();
      this.delayMix.connect(fxSum);
      this.reverbMix.connect(fxSum);
      // sum of dry (chorusDepth) and FX to transient shaper
      this.chorusDepth.connect(fxSum);
      fxSum.connect(this.transient);
      this.transient.connect(this.masterGain);
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      // LFOs (global)
      this.lfos.lfo1 = new LFO(this.context, this.params.lfo1.rate, this.params.lfo1.shape);
      this.lfos.lfo2 = new LFO(this.context, this.params.lfo2.rate, this.params.lfo2.shape);
      this.lfos.lfo3 = new LFO(this.context, this.params.lfo3.rate, this.params.lfo3.shape);
    }
    noteToFreq(note) {
      // note is MIDI note number
      return 440 * Math.pow(2, (note - 69) / 12);
    }
    makeSaturationCurve(amount) {
      // amount in [0,1]; 0 -> linear, 1 -> heavy
      const k = amount * 50 + 1;
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < samples; ++i) {
        const x = (i * 2) / samples - 1;
        curve[i] = Math.tanh(k * x);
      }
      return curve;
    }
    createReverbImpulse(seconds, decay) {
      const rate = this.context.sampleRate;
      const length = rate * seconds;
      const impulse = this.context.createBuffer(2, length, rate);
      for (let i = 0; i < impulse.numberOfChannels; i++) {
        const channelData = impulse.getChannelData(i);
        for (let j = 0; j < length; j++) {
          const rand = Math.random() * 2 - 1;
          channelData[j] = rand * Math.pow(1 - j / length, decay);
        }
      }
      return impulse;
    }
    /**
     * Trigger a note on a specific lane. Lane 0 is monophonic; lane 1 poly.
     */
    noteOn(note, velocity = 0.8, time = this.context.currentTime, lane = 0) {
      if (!this.started) return;
      if (lane === 0) {
        // kill previous voices on lane 0
        this.activeVoices[lane].forEach(v => v.release(time));
        this.activeVoices[lane] = [];
      }
      // create new voice
      const voice = new Voice(this, note, velocity, time);
      this.activeVoices[lane].push(voice);
      // limit polyphony to 4 voices
      if (this.activeVoices[lane].length > 4) {
        const old = this.activeVoices[lane].shift();
        old.release(time);
      }
    }
    noteOff(note, time = this.context.currentTime) {
      // release voices with matching note
      this.activeVoices.forEach(laneVoices => {
        for (let i = laneVoices.length - 1; i >= 0; i--) {
          if (laneVoices[i].note === note) {
            laneVoices[i].release(time);
            laneVoices.splice(i, 1);
          }
        }
      });
    }
    start() {
      // resume AudioContext on user gesture
      this.initContext();
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
      this.started = true;
      // start sequencer
      this.sequencer.start();
      // start visual update loop
      this.updateVisuals();
    }
    stop() {
      this.sequencer.stop();
      this.started = false;
    }
    updateVisuals() {
      if (!this.analyser) return;
      const scopeCanvas = document.getElementById('scope');
      const spectrumCanvas = document.getElementById('spectrum');
      if (!scopeCanvas || !spectrumCanvas) return;
      const scopeCtx = scopeCanvas.getContext('2d');
      const specCtx = spectrumCanvas.getContext('2d');
      const bufferLength = this.analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      const draw = () => {
        requestAnimationFrame(draw);
        this.analyser.getByteTimeDomainData(dataArray);
        scopeCtx.fillStyle = '#2e324c';
        scopeCtx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);
        scopeCtx.lineWidth = 2;
        scopeCtx.strokeStyle = '#66fcf1';
        scopeCtx.beginPath();
        const sliceWidth = scopeCanvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * scopeCanvas.height / 2;
          if (i === 0) {
            scopeCtx.moveTo(x, y);
          } else {
            scopeCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        scopeCtx.stroke();
        // Spectrum
        this.analyser.getByteFrequencyData(freqArray);
        specCtx.fillStyle = '#2e324c';
        specCtx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
        const barWidth = (spectrumCanvas.width / freqArray.length) * 2.5;
        let x2 = 0;
        for (let i = 0; i < freqArray.length; i++) {
          const barHeight = freqArray[i] / 2;
          specCtx.fillStyle = '#45a29e';
          specCtx.fillRect(x2, spectrumCanvas.height - barHeight, barWidth, barHeight);
          x2 += barWidth + 1;
        }
      };
      draw();
    }
    /**
     * Update parameter values from the UI. Takes the ID of the control and
     * the new value. The mapping from UI values to the synth engine is
     * handled here.
     */
    updateParam(id, value) {
      // handle by id prefix
      const hasContext = !!this.context;
      const currentTime = hasContext ? this.context.currentTime : 0;
      if (id.startsWith('master-volume')) {
        this.params.master.volume = parseFloat(value);
        if (this.masterGain && hasContext) this.masterGain.gain.setValueAtTime(this.params.master.volume, currentTime);
      } else if (id.startsWith('limiter-ceiling')) {
        this.params.master.limiterCeiling = parseFloat(value);
        if (this.limiter && hasContext) {
          const thr = -1 * (1 - this.params.master.limiterCeiling) * 20;
          this.limiter.threshold.setValueAtTime(thr, currentTime);
        }
      } else if (id === 'bpm') {
        this.params.bpm = parseFloat(value);
      } else if (id === 'swing') {
        this.params.swing = parseFloat(value);
      } else if (id.startsWith('oscA')) {
        const key = id.split('-')[1];
        if (key === 'wave') {
          this.params.oscA.wave = value;
        } else if (key === 'morph') {
          this.params.oscA.morph = parseFloat(value);
        } else if (key === 'tune') {
          this.params.oscA.tune = parseFloat(value);
        } else if (key === 'fine') {
          this.params.oscA.fine = parseFloat(value);
        } else if (key === 'level') {
          this.params.oscA.level = parseFloat(value);
        } else if (key === 'pan') {
          this.params.oscA.pan = parseFloat(value);
        }
      } else if (id.startsWith('oscB')) {
        const key = id.split('-')[1];
        if (key === 'wave') {
          this.params.oscB.wave = value;
        } else if (key === 'morph') {
          this.params.oscB.morph = parseFloat(value);
        } else if (key === 'tune') {
          this.params.oscB.tune = parseFloat(value);
        } else if (key === 'fine') {
          this.params.oscB.fine = parseFloat(value);
        } else if (key === 'level') {
          this.params.oscB.level = parseFloat(value);
        } else if (key === 'pan') {
          this.params.oscB.pan = parseFloat(value);
        }
      } else if (id.startsWith('sub')) {
        const key = id.split('-')[1];
        if (key === 'level') {
          this.params.sub.level = parseFloat(value);
        } else if (key === 'blend') {
          this.params.sub.blend = parseFloat(value);
        } else if (key === 'saturation') {
          this.params.sub.saturation = parseFloat(value);
        }
      } else if (id.startsWith('fm')) {
        const key = id.split('-')[1];
        if (key === 'ratio') {
          this.params.fm.ratio = parseFloat(value);
        } else if (key === 'index') {
          this.params.fm.index = parseFloat(value);
        } else if (key === 'attack') {
          this.params.fm.attack = parseFloat(value);
        } else if (key === 'decay') {
          this.params.fm.decay = parseFloat(value);
        }
      } else if (id.startsWith('filter1')) {
        const key = id.split('-')[1];
        if (key === 'type') {
          this.params.filter1.type = value;
        } else if (key === 'cutoff') {
          this.params.filter1.cutoff = parseFloat(value);
        } else if (key === 'res') {
          this.params.filter1.res = parseFloat(value);
        } else if (key === 'drive') {
          this.params.filter1.drive = parseFloat(value);
        } else if (key === 'keytrack') {
          this.params.filter1.keytrack = parseFloat(value);
        }
      } else if (id.startsWith('filter2')) {
        const key = id.split('-')[1];
        if (key === 'type') {
          this.params.filter2.type = value;
        } else if (key === 'cutoff') {
          this.params.filter2.cutoff = parseFloat(value);
        } else if (key === 'res') {
          this.params.filter2.res = parseFloat(value);
        } else if (key === 'drive') {
          this.params.filter2.drive = parseFloat(value);
        }
      } else if (id === 'filter-mix') {
        this.params.filterMix = parseFloat(value);
      } else if (id.startsWith('amp')) {
        const key = id.split('-')[1];
        this.params.ampEnv[key] = parseFloat(value);
      } else if (id.startsWith('filter-env')) {
        const parts = id.split('-');
        const paramName = parts[2];
        this.params.filterEnv[paramName] = parseFloat(value);
      } else if (id.startsWith('mod-env')) {
        const parts = id.split('-');
        const paramName = parts[2];
        this.params.modEnv[paramName] = parseFloat(value);
      } else if (id.startsWith('lfo1')) {
        const key = id.split('-')[1];
        if (key === 'rate') {
          const rate = parseFloat(value);
          this.params.lfo1.rate = rate;
          if (this.lfos.lfo1) this.lfos.lfo1.setRate(rate);
        } else if (key === 'shape') {
          this.params.lfo1.shape = value;
          if (this.lfos.lfo1) this.lfos.lfo1.setType(value);
        } else if (key === 'fade') {
          this.params.lfo1.fade = parseFloat(value);
        }
      } else if (id.startsWith('lfo2')) {
        const key = id.split('-')[1];
        if (key === 'rate') {
          const rate = parseFloat(value);
          this.params.lfo2.rate = rate;
          if (this.lfos.lfo2) this.lfos.lfo2.setRate(rate);
        } else if (key === 'shape') {
          this.params.lfo2.shape = value;
          if (this.lfos.lfo2) this.lfos.lfo2.setType(value);
        } else if (key === 'fade') {
          this.params.lfo2.fade = parseFloat(value);
        }
      } else if (id.startsWith('lfo3')) {
        const key = id.split('-')[1];
        if (key === 'rate') {
          const rate = parseFloat(value);
          this.params.lfo3.rate = rate;
          if (this.lfos.lfo3) this.lfos.lfo3.setRate(rate);
        } else if (key === 'shape') {
          this.params.lfo3.shape = value;
          if (this.lfos.lfo3) this.lfos.lfo3.setType(value);
        } else if (key === 'fade') {
          this.params.lfo3.fade = parseFloat(value);
        }
      } else if (id.startsWith('chorus')) {
        const key = id.split('-')[1];
        if (key === 'depth') {
          const depth = parseFloat(value);
          this.params.chorus.depth = depth;
          if (this.chorusDepth && hasContext) {
            this.chorusDepth.gain.setValueAtTime(depth, currentTime);
          }
        } else if (key === 'rate') {
          const rate = parseFloat(value);
          this.params.chorus.rate = rate;
          if (this.chorusLFO && hasContext) {
            this.chorusLFO.frequency.setValueAtTime(rate, currentTime);
          }
        }
      } else if (id.startsWith('delay')) {
        const key = id.split('-')[1];
        if (key === 'time') {
          const timeSeconds = parseFloat(value) / 1000;
          this.params.delay.time = timeSeconds;
          if (this.delay && hasContext) this.delay.delayTime.setValueAtTime(timeSeconds, currentTime);
        } else if (key === 'feedback') {
          const feedback = parseFloat(value);
          this.params.delay.feedback = feedback;
          if (this.delayFeedback && hasContext) this.delayFeedback.gain.setValueAtTime(feedback, currentTime);
        } else if (key === 'mix') {
          const mix = parseFloat(value);
          this.params.delay.mix = mix;
          if (this.delayMix && hasContext) this.delayMix.gain.setValueAtTime(mix, currentTime);
        }
      } else if (id.startsWith('reverb')) {
        const key = id.split('-')[1];
        if (key === 'size') {
          const size = parseFloat(value);
          this.params.reverb.size = size;
          if (this.reverb && hasContext) {
            this.reverb.buffer = this.createReverbImpulse(size * 3, this.params.reverb.decay);
          }
        } else if (key === 'decay') {
          const decay = parseFloat(value);
          this.params.reverb.decay = decay;
          if (this.reverb && hasContext) {
            this.reverb.buffer = this.createReverbImpulse(this.params.reverb.size * 3, decay);
          }
        } else if (key === 'pre') {
          const preDelay = parseFloat(value) / 1000;
          this.params.reverb.preDelay = preDelay;
          if (this.reverbPreDelay && hasContext) {
            this.reverbPreDelay.delayTime.setValueAtTime(preDelay, currentTime);
          }
        } else if (key === 'mix') {
          const mix = parseFloat(value);
          this.params.reverb.mix = mix;
          if (this.reverbMix && hasContext) {
            this.reverbMix.gain.setValueAtTime(mix, currentTime);
          }
        }
      } else if (id.startsWith('transient')) {
        const key = id.split('-')[1];
        if (key === 'attack') {
          const attack = parseFloat(value);
          this.params.transient.attack = attack;
          if (this.transient && hasContext) {
            this.transient.attack.setValueAtTime(attack * 0.1, currentTime);
          }
        } else if (key === 'sustain') {
          const sustain = parseFloat(value);
          this.params.transient.sustain = sustain;
          if (this.transient && hasContext) {
            this.transient.release.setValueAtTime((1 - sustain) * 0.5, currentTime);
          }
        }
      } else if (id === 'sequence-length') {
        this.sequencer.setSteps(parseInt(value));
        // update grid layout variable
        document.getElementById('sequencer-grid').style.setProperty('--seq-cols', value);
        // rebuild grid
        buildSequencerGrid(parseInt(value));
      }
    }
    /**
     * Save the current state to JSON.
     */
    saveState() {
      return JSON.stringify({ params: this.params, seed: this.seed });
    }
    /**
     * Load state from JSON.
     */
    loadState(json) {
      try {
        const obj = JSON.parse(json);
        if (obj.params) {
          const defaults = this.params;
          const incoming = obj.params;
          this.params = {
            ...defaults,
            ...incoming,
            oscA: { ...defaults.oscA, ...(incoming.oscA || {}) },
            oscB: { ...defaults.oscB, ...(incoming.oscB || {}) },
            sub: { ...defaults.sub, ...(incoming.sub || {}) },
            fm: { ...defaults.fm, ...(incoming.fm || {}) },
            filter1: { ...defaults.filter1, ...(incoming.filter1 || {}) },
            filter2: { ...defaults.filter2, ...(incoming.filter2 || {}) },
            ampEnv: { ...defaults.ampEnv, ...(incoming.ampEnv || {}) },
            filterEnv: { ...defaults.filterEnv, ...(incoming.filterEnv || {}) },
            modEnv: { ...defaults.modEnv, ...(incoming.modEnv || {}) },
            lfo1: { ...defaults.lfo1, ...(incoming.lfo1 || {}) },
            lfo2: { ...defaults.lfo2, ...(incoming.lfo2 || {}) },
            lfo3: { ...defaults.lfo3, ...(incoming.lfo3 || {}) },
            chorus: { ...defaults.chorus, ...(incoming.chorus || {}) },
            delay: { ...defaults.delay, ...(incoming.delay || {}) },
            reverb: { ...defaults.reverb, ...(incoming.reverb || {}) },
            transient: { ...defaults.transient, ...(incoming.transient || {}) },
            modMatrix: incoming.modMatrix || defaults.modMatrix
          };
        }
        if (obj.seed) {
          this.seed = obj.seed;
          document.getElementById('seed-value').value = this.seed;
        }
      } catch (e) {
        console.error('Failed to load preset', e);
      }
    }
    /**
     * Randomise parameters with a deterministic seed. This fills the
     * sequencer patterns with random notes within a range and sets
     * oscillator morphs etc. The same seed yields the same pattern.
     */
    randomize(seed) {
      this.seed = seed;
      document.getElementById('seed-value').value = seed;
      const rng = new PRNG(seed);
      // Random notes for sequencer
      const notes = [36, 38, 41, 43, 45, 48];
      for (let lane = 0; lane < this.sequencer.lanes; lane++) {
        for (let step = 0; step < this.sequencer.steps; step++) {
          if (rng.next() < 0.2) {
            const note = notes[Math.floor(rng.next() * notes.length)];
            const vel = 0.5 + rng.next() * 0.5;
            this.sequencer.patterns[lane][step] = { note, velocity: vel };
            const cell = document.querySelector(`#sequencer-grid div[data-step='${step}'][data-lane='${lane}']`);
            if (cell) cell.classList.add('active');
          } else {
            this.sequencer.patterns[lane][step] = null;
            const cell = document.querySelector(`#sequencer-grid div[data-step='${step}'][data-lane='${lane}']`);
            if (cell) cell.classList.remove('active');
          }
        }
      }
      // Randomise oscillator morph values
      this.params.oscA.morph = rng.next();
      this.params.oscB.morph = rng.next();
      this.params.fm.index = rng.next() * 500;
      // update UI controls accordingly
      document.getElementById('oscA-morph').value = this.params.oscA.morph;
      document.getElementById('oscB-morph').value = this.params.oscB.morph;
      document.getElementById('fm-index').value = this.params.fm.index;
    }
  }

  // Global synth instance
  const synth = new Synth();

  /**
   * Build the sequencer grid in the DOM. Accepts number of steps and
   * creates 2 lanes of clickable cells. Updates step patterns on click.
   */
  function buildSequencerGrid(steps) {
    const grid = document.getElementById('sequencer-grid');
    grid.innerHTML = '';
    // set CSS variable for grid columns
    grid.style.setProperty('--seq-cols', steps);
    for (let lane = 0; lane < synth.sequencer.lanes; lane++) {
      for (let i = 0; i < steps; i++) {
        const cell = document.createElement('div');
        cell.className = 'seq-step';
        cell.dataset.step = i;
        cell.dataset.lane = lane;
        cell.addEventListener('click', () => {
          const current = synth.sequencer.patterns[lane][i];
          if (current) {
            // remove note
            synth.sequencer.patterns[lane][i] = null;
            cell.classList.remove('active');
          } else {
            // assign a note based on lane (bass vs pluck)
            const note = lane === 0 ? 36 : 60;
            synth.sequencer.patterns[lane][i] = { note, velocity: 0.8 };
            cell.classList.add('active');
          }
        });
        grid.appendChild(cell);
      }
    }
  }
  // Initialise grid with default steps
  document.addEventListener('DOMContentLoaded', () => {
    buildSequencerGrid(synth.sequencer.steps);
    // Create 7 additional mod matrix rows by cloning
    const tbody = document.querySelector('#mod-matrix-panel tbody');
    const firstRow = tbody.querySelector('tr');
    for (let i = 1; i < 8; i++) {
      const clone = firstRow.cloneNode(true);
      clone.dataset.modRow = i;
      tbody.appendChild(clone);
    }
    // Attach event listeners to all controls
    document.querySelectorAll('input, select').forEach(ctrl => {
      ctrl.addEventListener('input', ev => {
        synth.updateParam(ev.target.id || ev.target.className, ev.target.value);
      });
    });
    // Play toggle
    document.getElementById('play-toggle').addEventListener('click', () => {
      if (!synth.started) {
        synth.start();
        document.getElementById('play-toggle').textContent = 'Stop';
      } else {
        synth.stop();
        document.getElementById('play-toggle').textContent = 'Play';
      }
    });
    // Preset save/load
    document.getElementById('save-preset').addEventListener('click', () => {
      const data = synth.saveState();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data)
          .then(() => alert('Preset copied to clipboard.'))
          .catch(err => {
            console.warn('Clipboard write failed', err);
            prompt('Copy preset JSON:', data);
          });
      } else {
        prompt('Copy preset JSON:', data);
      }
    });
    document.getElementById('load-preset').addEventListener('click', () => {
      const json = prompt('Paste preset JSON here:');
      if (json) {
        synth.loadState(json);
      }
    });
    document.getElementById('copy-preset').addEventListener('click', () => {
      const data = synth.saveState();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data)
          .then(() => alert('Preset copied to clipboard.'))
          .catch(err => {
            console.warn('Clipboard write failed', err);
            prompt('Copy preset JSON:', data);
          });
      } else {
        prompt('Copy preset JSON:', data);
      }
    });
    document.getElementById('paste-preset').addEventListener('click', async () => {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const json = await navigator.clipboard.readText();
          if (json) {
            synth.loadState(json);
          }
        } catch (err) {
          console.warn('Clipboard read failed', err);
          const json = prompt('Paste preset JSON here:');
          if (json) synth.loadState(json);
        }
      } else {
        const json = prompt('Paste preset JSON here:');
        if (json) synth.loadState(json);
      }
    });
    document.getElementById('randomize-seed').addEventListener('click', () => {
      const seed = Math.floor(Math.random() * 1000000);
      synth.randomize(seed);
    });
    // Factory presets
    document.querySelectorAll('#factory-presets .factory').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetName = btn.dataset.preset;
        loadFactoryPreset(presetName);
      });
    });
  });

  /**
   * Load one of the four factory presets.
   * Each preset configures parameters and sequencer patterns.
   */
  function loadFactoryPreset(name) {
    // Reset patterns
    synth.sequencer.patterns.forEach(laneArr => laneArr.fill(null));
    document.querySelectorAll('.seq-step').forEach(cell => cell.classList.remove('active'));
    switch (name) {
      case 'deepLiquid':
        synth.params.oscA.wave = 'sine';
        synth.params.oscA.level = 0.4;
        synth.params.oscB.wave = 'triangle';
        synth.params.oscB.level = 0.2;
        synth.params.sub.level = 0.8;
        synth.params.sub.blend = 0.05;
        synth.params.fm.index = 0;
        synth.params.filter1.cutoff = 600;
        synth.params.filter1.res = 1.2;
        synth.params.filter1.drive = 0.1;
        synth.params.filterMix = 0.3;
        synth.params.reverb.mix = 0.2;
        // simple bass line
        synth.sequencer.patterns[0][0] = { note: 36, velocity: 0.9 };
        synth.sequencer.patterns[0][8] = { note: 43, velocity: 0.8 };
        break;
      case 'darkTech':
        synth.params.oscA.wave = 'saw';
        synth.params.oscA.level = 0.5;
        synth.params.oscB.wave = 'square';
        synth.params.oscB.level = 0.4;
        synth.params.sub.level = 0.7;
        synth.params.fm.index = 150;
        synth.params.filter1.cutoff = 400;
        synth.params.filter1.res = 2;
        synth.params.filter2.cutoff = 1000;
        synth.params.filterMix = 0.7;
        // pattern
        synth.sequencer.patterns[0][0] = { note: 36, velocity: 0.8 };
        synth.sequencer.patterns[0][4] = { note: 38, velocity: 0.8 };
        synth.sequencer.patterns[0][8] = { note: 41, velocity: 0.8 };
        synth.sequencer.patterns[0][12] = { note: 38, velocity: 0.8 };
        break;
      case 'rollingPluck':
        synth.params.oscA.wave = 'triangle';
        synth.params.oscB.wave = 'sine';
        synth.params.sub.level = 0.3;
        synth.params.fm.index = 300;
        synth.params.fm.attack = 10;
        synth.params.fm.decay = 100;
        synth.params.filter1.cutoff = 1200;
        synth.params.filter1.res = 1;
        synth.params.filterMix = 0.5;
        // pluck pattern
        for (let i = 0; i < 16; i += 4) {
          synth.sequencer.patterns[1][i] = { note: 72, velocity: 0.7 };
          const cell = document.querySelector(`#sequencer-grid div[data-step='${i}'][data-lane='1']`);
          if (cell) cell.classList.add('active');
        }
        break;
      case 'airPad':
        synth.params.oscA.wave = 'saw';
        synth.params.oscB.wave = 'sine';
        synth.params.sub.level = 0.2;
        synth.params.fm.index = 0;
        synth.params.filter1.cutoff = 2000;
        synth.params.filter1.res = 0.5;
        synth.params.filterMix = 0.3;
        synth.params.chorus.depth = 0.6;
        synth.params.reverb.mix = 0.6;
        // long pad note
        synth.sequencer.patterns[1][0] = { note: 60, velocity: 0.6 };
        break;
    }
    // Update UI to reflect preset values
    for (const key in synth.params.oscA) {
      const el = document.getElementById(`oscA-${key}`);
      if (el) el.value = synth.params.oscA[key];
    }
    for (const key in synth.params.oscB) {
      const el = document.getElementById(`oscB-${key}`);
      if (el) el.value = synth.params.oscB[key];
    }
    document.getElementById('sub-level').value = synth.params.sub.level;
    document.getElementById('sub-blend').value = synth.params.sub.blend;
    document.getElementById('fm-index').value = synth.params.fm.index;
    document.getElementById('filter1-cutoff').value = synth.params.filter1.cutoff;
    document.getElementById('filter1-res').value = synth.params.filter1.res;
    document.getElementById('filter2-cutoff').value = synth.params.filter2.cutoff;
    document.getElementById('filter-mix').value = synth.params.filterMix;
    document.getElementById('chorus-depth').value = synth.params.chorus.depth;
    document.getElementById('reverb-mix').value = synth.params.reverb.mix;
    if (synth.reverbMix && synth.context) {
      synth.reverbMix.gain.setValueAtTime(synth.params.reverb.mix, synth.context.currentTime);
    }
    if (synth.chorusDepth && synth.context) {
      synth.chorusDepth.gain.setValueAtTime(synth.params.chorus.depth, synth.context.currentTime);
    }
    // highlight pattern cells
    synth.sequencer.patterns.forEach((lanePattern, lane) => {
      lanePattern.forEach((val, step) => {
        const cell = document.querySelector(`#sequencer-grid div[data-step='${step}'][data-lane='${lane}']`);
        if (cell) {
          cell.classList.toggle('active', !!val);
        }
      });
    });
  }

})();
