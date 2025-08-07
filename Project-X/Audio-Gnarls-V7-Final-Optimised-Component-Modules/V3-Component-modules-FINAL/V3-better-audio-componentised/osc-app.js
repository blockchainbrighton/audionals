// Orchestrator component tying together all other parts of the
// oscilloscope/synth application.  It listens to events from child
// components, manages audio graph creation, handles sequencing logic and
// updates the visualiser.  State is maintained internally and exposed to
// children through property setters when necessary.

import './tone-loader.js';
import './scope-canvas.js';
import './osc-controls.js';
import './osc-sequencer.js';
import './osc-oscillator.js';

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Application state mirrored from the original page script.
    this.state = {
      seed: '5s567g67',
      Tone: null,
      contextUnlocked: false,
      isPlaying: false,
      isSequencerMode: false,
      sequence: new Array(8).fill(null),
      sequencePlaying: false,
      sequenceStepIndex: 0,
      stepTime: 400,
      currentRecordSlot: -1,
      isRecording: false,
      shapes: ['circle', 'square', 'butterfly', 'lissajous', 'spiro', 'harmonograph'],
      presets: {},
      chains: {},
      currentShape: 'circle',
      ready: false,
    };
    // Holder for the sequence playback timer.
    this._seqTimeout = null;
    // Define layout.  The host uses a grid to mimic the original layout and
    // centres its children.  Individual components manage their own styles.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          place-items: center;
          gap: 1rem;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          background: #000;
          color: #fff;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
      </style>
      <tone-loader></tone-loader>
      <osc-controls></osc-controls>
      <osc-oscillator></osc-oscillator>
      <osc-sequencer></osc-sequencer>
      <scope-canvas></scope-canvas>
    `;
    // References to child elements.  They will be set in connectedCallback.
    this.controls = null;
    this.oscillator = null;
    this.sequencer = null;
    this.scopeCanvas = null;
  }

  connectedCallback() {
    // Cache references to the instantiated children.
    this.controls = this.shadowRoot.querySelector('osc-controls');
    this.oscillator = this.shadowRoot.querySelector('osc-oscillator');
    this.sequencer = this.shadowRoot.querySelector('osc-sequencer');
    this.scopeCanvas = this.shadowRoot.querySelector('scope-canvas');
    // Set initial loader message.
    this.controls.setLoader('Initializing...');
    // Choose a deterministic starting shape using mulberry32.
    const rand = this.mulberry32(this.state.seed);
    const idx = (rand() * this.state.shapes.length) | 0;
    this.state.currentShape = this.state.shapes[idx];
    // Compute deterministic presets ahead of Tone loading.  The Tone
    // instance is not required for this step as it simply generates
    // constant parameters.
    for (const shape of this.state.shapes) {
      this.state.presets[shape] = this.deterministicPreset(this.state.seed, shape);
    }
    // Initialise the oscillator UI with the current preset.  This will
    // schedule an initial osc-params event; we listen for it later.
    this.oscillator.setParams(this.state.presets[this.state.currentShape]);
    // Update control UI to reflect the starting shape.
    this.controls.setShape(this.state.currentShape);
    // Configure the canvas with seed mode until audio is started.
    this.scopeCanvas.setParams({
      shape: this.state.currentShape,
      seed: this.state.seed,
      preset: this.state.presets[this.state.currentShape],
      analyser: null,
      mode: 'seed',
    });
    this.scopeCanvas.start();
    // Register event listeners.  Events bubble up through the shadow DOM.
    this.addEventListener('tone-ready', this.onToneReady.bind(this));
    this.addEventListener('tone-fail', this.onToneFail.bind(this));
    this.addEventListener('start-request', this.onStartRequest.bind(this));
    this.addEventListener('mute-toggle', this.onMuteToggle.bind(this));
    this.addEventListener('mode-change', this.onModeChange.bind(this));
    this.addEventListener('sequencer-toggle', this.onSequencerToggle.bind(this));
    this.addEventListener('record-start-request', this.onRecordStart.bind(this));
    this.addEventListener('clear-step-request', this.onClearStep.bind(this));
    this.addEventListener('play-sequence-request', this.onPlaySequence.bind(this));
    this.addEventListener('stop-sequence-request', this.onStopSequence.bind(this));
    this.addEventListener('step-time-change', this.onStepTimeChange.bind(this));
    this.addEventListener('osc-params', this.onOscParams.bind(this));
    // Handle numeric key presses for selecting shapes and recording steps.
    this._onKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    // Remove global event listeners when the component is detached.
    document.removeEventListener('keydown', this._onKeyDown);
  }

  /**
   * Mulberry32 PRNG adapted from the original implementation.  Returns a
   * function that yields deterministic pseudo‑random numbers in [0,1).
   * @param {string} seed
   */
  mulberry32(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) {
      a = Math.imul(a ^ seed.charCodeAt(i), 0x10001);
    }
    return () => {
      a = Math.imul(a ^ (a >>> 15), 1 | a);
      return ((a >>> 16) & 0xffff) / 0x10000;
    };
  }

  /**
   * Generate a deterministic preset for a given shape and seed.  This
   * mirrors the algorithm in the original script to yield repeatable
   * synthesiser parameters.  See the original file for detailed
   * commentary on these values.
   * @param {string} seed
   * @param {string} shape
   */
  deterministicPreset(seed, shape) {
    const rng = this.mulberry32(`${seed}_${shape}`);
    const types = ['sine', 'triangle', 'square', 'sawtooth'];
    const notes = ['C1', 'C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F#4', 'A4', 'C5'];
    const modeRoll = rng();
    let mode = 1;
    if (modeRoll < 0.18) mode = 0;
    else if (modeRoll < 0.56) mode = 1;
    else if (modeRoll < 0.85) mode = 2;
    else mode = 3;
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
    for (let i = 0; i < oscCount; ++i) {
      oscs.push([types[(rng() * types.length) | 0], notes[(rng() * notes.length) | 0]]);
    }
    const filterBase = mode === 0 ? 700 + rng() * 500 : 300 + rng() * 2400;
    const resonance = 0.6 + rng() * 0.7;
    let env = {};
    if (mode === 0) {
      env = {
        attack: 0.005 + rng() * 0.03,
        decay: 0.04 + rng() * 0.08,
        sustain: 0.1 + rng() * 0.2,
        release: 0.03 + rng() * 0.1,
      };
    } else if (mode === 3) {
      env = {
        attack: 2 + rng() * 8,
        decay: 4 + rng() * 20,
        sustain: 0.7 + rng() * 0.2,
        release: 8 + rng() * 24,
      };
    } else {
      env = {
        attack: 0.03 + rng() * 0.4,
        decay: 0.1 + rng() * 0.7,
        sustain: 0.2 + rng() * 0.5,
        release: 0.2 + rng() * 3,
      };
    }
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
    };
  }

  /**
   * Handle Tone.js successfully loading.  Initializes the Tone context,
   * updates presets and enables the UI.
   */
  onToneReady() {
    this.state.Tone = window.Tone;
    this.state.ready = true;
    // Update loader message.
    this.controls.setLoader('Tone.js loaded. Click start to begin.');
    // Enable start button on controls.
    this.controls.enable();
  }

  /**
   * Handle Tone.js failing to load.  Disables the UI and logs the error.
   */
  onToneFail(event) {
    // Set loader message to reflect failure.
    this.controls.setLoader('Failed to load Tone.js');
    // Disable controls entirely.
    this.controls.disable();
    console.error('Tone.js failed to load:', event.detail);
  }

  /**
   * Respond to the start/stop button.  When starting, unlock the audio
   * context and buffer synthesiser chains; when stopping, dispose of all
   * chains and revert to seed mode.
   */
  async onStartRequest(event) {
    if (!this.state.ready) return;
    const start = !!event.detail.start;
    if (start && !this.state.isPlaying) {
      await this.unlockAudioAndBufferInitial();
    } else if (!start && this.state.isPlaying) {
      this.stopAudioAndDraw();
    }
  }

  /**
   * Toggle the master mute on the Tone Destination.  The controls
   * component manages its own label, so the orchestrator simply applies
   * the mute state.
   */
  onMuteToggle(event) {
    if (!this.state.Tone) return;
    const muted = !!event.detail.muted;
    this.state.Tone.Destination.mute = muted;
  }

  /**
   * Handle changes to the currently selected visual shape.  When audio
   * is playing, switching shapes activates the corresponding audio chain.
   * Otherwise it simply updates the seed visual.
   */
  onModeChange(event) {
    const shape = event.detail.shape;
    if (!this.state.shapes.includes(shape)) return;
    this.state.currentShape = shape;
    // Update oscillator UI to reflect preset of the new shape.
    this.oscillator.setParams(this.state.presets[shape]);
    // Update visual.  Choose live or seed depending on playing state.
    if (this.state.isPlaying) {
      this.setActiveChain(shape);
      const chain = this.state.chains[shape];
      this.scopeCanvas.setParams({
        shape,
        seed: this.state.seed,
        preset: this.state.presets[shape],
        analyser: chain ? chain.analyser : null,
        mode: 'live',
      });
    } else {
      this.scopeCanvas.setParams({
        shape,
        seed: this.state.seed,
        preset: this.state.presets[shape],
        analyser: null,
        mode: 'seed',
      });
    }
  }

  /**
   * Show or hide the sequencer panel based on user toggling.  When hiding
   * the sequencer, any ongoing recording or playback is cancelled.
   */
  onSequencerToggle(event) {
    const visible = !!event.detail.visible;
    this.state.isSequencerMode = visible;
    this.sequencer.setVisible(visible);
    if (!visible) {
      // Cancel recording.
      this.state.isRecording = false;
      this.state.currentRecordSlot = -1;
      this.sequencer.setRecording(false, -1);
      // Cancel sequence playback.
      if (this.state.sequencePlaying) {
        this.stopSequence();
      }
    }
  }

  /**
   * Begin recording at the selected slot.  Only acts when not already
   * playing a sequence.
   */
  onRecordStart(event) {
    const index = event.detail.index;
    if (this.state.sequencePlaying) return;
    this.state.isRecording = true;
    this.state.currentRecordSlot = index;
    this.sequencer.setRecording(true, index);
  }

  /**
   * Clear a specific sequence slot.  Cancels recording if clearing the
   * currently recording slot or an earlier slot.
   */
  onClearStep(event) {
    const index = event.detail.index;
    if (this.state.sequencePlaying) return;
    this.state.sequence[index] = null;
    if (this.state.isRecording && index <= this.state.currentRecordSlot) {
      this.state.isRecording = false;
      this.state.currentRecordSlot = -1;
    }
    this.sequencer.sequence = this.state.sequence;
    this.sequencer.setRecording(this.state.isRecording, this.state.currentRecordSlot);
  }

  /**
   * Start sequence playback if all steps are filled.  During playback, the
   * play button label updates via the sequencer component.
   */
  onPlaySequence() {
    if (this.state.sequencePlaying) return;
    if (!this.state.sequence.every((s) => s != null)) return;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.sequencer.setPlaying(true);
    this.playSequence();
  }

  /**
   * Stop sequence playback.  Clears any pending timeouts and updates
   * sequencer UI accordingly.
   */
  onStopSequence() {
    if (!this.state.sequencePlaying) return;
    this.stopSequence();
  }

  /**
   * Respond to changes in the step time from the sequencer UI.  Updates
   * internal state and forwards the value back to the sequencer to keep
   * its input box in sync.
   */
  onStepTimeChange(event) {
    const val = event.detail.stepTime;
    this.state.stepTime = val;
    this.sequencer.setStepTime(val);
  }

  /**
   * Update synthesiser presets when oscillator parameters change.  Dispose
   * any existing audio chain for the current shape and rebuffer it using
   * the modified parameters.  Active audio playback and visuals are
   * updated to reflect the new chain.
   */
  async onOscParams(event) {
    const { osc1, osc2 } = event.detail;
    const shape = this.state.currentShape;
    // Update preset parameters for the current shape.
    this.state.presets[shape].osc1 = osc1;
    this.state.presets[shape].osc2 = osc2;
    // If an audio chain exists for this shape, dispose of it and remove
    // from the cache.  We'll recreate it below.
    if (this.state.chains[shape]) {
      const chain = this.state.chains[shape];
      for (const key in chain) {
        const node = chain[key];
        try {
          node.stop?.();
        } catch {}
        try {
          node.dispose?.();
        } catch {}
      }
      delete this.state.chains[shape];
    }
    // Rebuffer the chain for this shape if audio context has been
    // unlocked.
    if (this.state.contextUnlocked) {
      await this.bufferShapeChain(shape);
      if (this.state.isPlaying) {
        this.setActiveChain(shape);
        const chain = this.state.chains[shape];
        this.scopeCanvas.setParams({
          shape,
          seed: this.state.seed,
          preset: this.state.presets[shape],
          analyser: chain ? chain.analyser : null,
          mode: 'live',
        });
      }
    }
  }

  /**
   * Handle keyboard interactions.  Numeric keys 1–6 select shapes by
   * index, or record sequence steps when the sequencer is in record mode.
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    // Ignore if focus is inside an input/textarea (e.g. step time field).
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const code = e.key;
    // Only handle single digit keys 1–6.
    if (code.length === 1 && code >= '1' && code <= '6') {
      const idx = code.charCodeAt(0) - 49; // '1'->0, '2'->1...
      if (this.state.isSequencerMode && this.state.isRecording) {
        // Record the step as a 1‑based number.
        this.recordStep(idx + 1);
        e.preventDefault();
        return;
      }
      // Normal mode: update shape selection.
      const shape = this.state.shapes[idx];
      if (shape && shape !== this.state.currentShape) {
        this.controls.setShape(shape);
        // Fire a synthetic mode-change event to reuse logic.
        this.dispatchEvent(
          new CustomEvent('mode-change', {
            detail: { shape },
            bubbles: true,
            composed: true,
          })
        );
      }
      e.preventDefault();
    }
  }

  /**
   * Record a step value at the current recording position.  Increments the
   * record slot and ends recording when all slots are filled.  Sequence
   * values are stored as numbers 1–6 corresponding to visual shapes.
   * @param {number} keyNumber
   */
  recordStep(keyNumber) {
    const idx = this.state.currentRecordSlot;
    if (!this.state.isRecording || idx < 0 || idx >= this.state.sequence.length) return;
    this.state.sequence[idx] = keyNumber;
    this.state.currentRecordSlot++;
    if (this.state.currentRecordSlot >= this.state.sequence.length) {
      this.state.isRecording = false;
      this.state.currentRecordSlot = -1;
    }
    // Reflect updates to the sequencer component.
    this.sequencer.sequence = this.state.sequence;
    this.sequencer.setRecording(this.state.isRecording, this.state.currentRecordSlot);
  }

  /**
   * Trigger a shape change programmatically.  Used during sequence playback.
   * @param {number} shapeIndex
   */
  triggerStep(shapeIndex) {
    if (shapeIndex < 0 || shapeIndex >= this.state.shapes.length) return;
    const shape = this.state.shapes[shapeIndex];
    this.state.currentShape = shape;
    this.controls.setShape(shape);
    this.oscillator.setParams(this.state.presets[shape]);
    if (this.state.isPlaying) {
      this.setActiveChain(shape);
      const chain = this.state.chains[shape];
      this.scopeCanvas.setParams({
        shape,
        seed: this.state.seed,
        preset: this.state.presets[shape],
        analyser: chain ? chain.analyser : null,
        mode: 'live',
      });
    } else {
      this.scopeCanvas.setParams({
        shape,
        seed: this.state.seed,
        preset: this.state.presets[shape],
        analyser: null,
        mode: 'seed',
      });
    }
  }

  /**
   * Unlock the audio context on user interaction and buffer the initial
   * synthesiser chain.  Also schedules lazy buffering of the remaining
   * chains in the background.  Once unlocked, the audio context persists
   * until the tab is closed.
   */
  async unlockAudioAndBufferInitial() {
    if (this.state.contextUnlocked) return;
    if (!this.state.Tone) return;
    this.controls.setLoader('Unlocking AudioContext...');
    try {
      await this.state.Tone.context.resume();
      this.state.contextUnlocked = true;
      this.controls.setLoader('Buffering first synth chain...');
      const shape = this.state.currentShape;
      await this.bufferShapeChain(shape);
      this.setActiveChain(shape);
      this.state.isPlaying = true;
      this.controls.setPlaying(true);
      this.controls.setLoader('Ready. Shape: ' + shape);
      // Switch visualiser to live mode.
      const chain = this.state.chains[shape];
      this.scopeCanvas.setParams({
        shape,
        seed: this.state.seed,
        preset: this.state.presets[shape],
        analyser: chain ? chain.analyser : null,
        mode: 'live',
      });
      // Buffer remaining chains in the background after a short delay.
      setTimeout(async () => {
        for (const s of this.state.shapes) {
          if (s !== shape) {
            try {
              await this.bufferShapeChain(s);
            } catch (e) {
              console.warn('Failed to buffer chain for', s, e);
            }
          }
        }
      }, 100);
    } catch (e) {
      console.error('Error unlocking audio:', e);
      this.controls.setLoader('Failed to unlock AudioContext.');
    }
  }

  /**
   * Stop all audio output and revert to seed visualisation.  Disposes
   * synthesiser chains and cancels sequence playback.
   */
  stopAudioAndDraw() {
    if (!this.state.isPlaying) return;
    this.disposeAllChains();
    this.state.isPlaying = false;
    this.controls.setPlaying(false);
    this.state.contextUnlocked = false;
    // Unmute the destination when stopping to reset state.
    if (this.state.Tone) {
      this.state.Tone.Destination.mute = false;
    }
    this.scopeCanvas.setParams({
      shape: this.state.currentShape,
      seed: this.state.seed,
      preset: this.state.presets[this.state.currentShape],
      analyser: null,
      mode: 'seed',
    });
    // Stop any sequence playback.
    if (this.state.sequencePlaying) {
      this.stopSequence();
    }
  }

  /**
   * Dispose all synthesiser chains.  Each node in every chain has its
   * stop/dispose methods invoked if present.  After disposal, the chain
   * cache is cleared.
   */
  disposeAllChains() {
    for (const shape in this.state.chains) {
      const chain = this.state.chains[shape];
      // Disconnect reverb from destination.
      try {
        chain.reverb?.disconnect();
      } catch {}
      for (const key in chain) {
        const node = chain[key];
        try {
          node.stop?.();
        } catch {}
        try {
          node.dispose?.();
        } catch {}
      }
    }
    this.state.chains = {};
    this.state.current = null;
  }

  /**
   * Activate a particular chain by connecting its reverb node to the
   * destination and disconnecting all others.  This allows multiple
   * chains to be pre‑buffered without consuming CPU until selected.
   * @param {string} shape
   */
  setActiveChain(shape) {
    for (const s in this.state.chains) {
      try {
        this.state.chains[s].reverb?.disconnect();
      } catch {}
    }
    const chain = this.state.chains[shape];
    chain?.reverb?.toDestination();
    this.state.current = shape;
  }

  /**
   * Buffer an audio chain for the specified shape.  When the audio
   * context has not yet been resumed no work is performed.  Chains are
   * cached to avoid recreating them on every activation.
   * @param {string} shape
   */
  async bufferShapeChain(shape) {
    if (!this.state.contextUnlocked) return;
    if (this.state.chains[shape]) return;
    const pr = this.state.presets[shape];
    const T = this.state.Tone;
    if (!T) return;
    const osc1 = new T.Oscillator(pr.osc1[1], pr.osc1[0]).start();
    let osc2 = null;
    if (pr.osc2) {
      osc2 = new T.Oscillator(pr.osc2[1], pr.osc2[0]).start();
    }
    const volume = new T.Volume(5);
    const filter = new T.Filter(pr.filter, 'lowpass');
    const lfo = new T.LFO(pr.lfo[0] + 'n', pr.lfo[1], pr.lfo[2]).start();
    lfo.connect(filter.frequency);
    if (osc2) lfo.connect(osc2.detune);
    osc1.connect(volume);
    if (osc2) osc2.connect(volume);
    volume.connect(filter);
    const reverb = new T.Freeverb().set({
      wet: pr.reverb?.wet ?? 0.3,
      roomSize: pr.reverb?.roomSize ?? 0.8,
    });
    filter.connect(reverb);
    const analyser = T.context.createAnalyser();
    analyser.fftSize = 2048;
    filter.connect(analyser);
    this.state.chains[shape] = {
      osc1,
      osc2,
      volume,
      filter,
      lfo,
      reverb,
      analyser,
    };
  }

  /**
   * Start playback of the recorded sequence.  A timeout based loop
   * advances through each step at the configured step time until
   * manually stopped.
   */
  playSequence() {
    const stepFn = () => {
      if (!this.state.sequencePlaying) return;
      const stepValue = this.state.sequence[this.state.sequenceStepIndex];
      if (stepValue != null) {
        this.triggerStep(stepValue - 1);
      }
      this.state.sequenceStepIndex = (this.state.sequenceStepIndex + 1) % this.state.sequence.length;
      this._seqTimeout = setTimeout(stepFn, this.state.stepTime);
    };
    stepFn();
  }

  /**
   * Stop sequence playback and clear any pending timeout.
   */
  stopSequence() {
    this.state.sequencePlaying = false;
    if (this._seqTimeout) {
      clearTimeout(this._seqTimeout);
      this._seqTimeout = null;
    }
    this.sequencer.setPlaying(false);
  }
}

customElements.define('osc-app', OscApp);