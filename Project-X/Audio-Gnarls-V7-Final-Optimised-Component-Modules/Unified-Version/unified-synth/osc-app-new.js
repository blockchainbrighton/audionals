// Optimized Unified oscilloscope synthesiser orchestrator

import './tone-loader.js';
import './osc-controls.js';
import './scope-canvas.js';

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      isPlaying: false,
      isAudioStarted: false,
      isMuted: true,
      Tone: null,
      chains: {},
      presets: {},
      currentShape: null,
      isSeedMode: false,
      seed: '',
      rng: null,
      sequence: Array(8).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null,
      sequenceStepIndex: 0,
      stepTime: 400,
      isRecording: false,
      currentRecordSlot: -1,
      isSequencerVisible: false,
      keyboardOsc: {}
    };
    this.shapes = ['circle','square','butterfly','lissajous','spiral','rose','radial','polygon','spiro','harmonograph'];
    this.shapeLabels = {
      circle: 'Circle', square: 'Square', butterfly: 'Butterfly', lissajous: 'Lissajous', spiral: 'Spiral',
      rose: 'Rose', radial: 'Radial Waves', polygon: 'Polygon', spiro: 'Spirograph', harmonograph: 'Harmonograph',
      layers: 'Layers', particles: 'Particles'
    };
    this.extraShapes = ['layers','particles'];
    this.noteKeyMap = {/* unchanged... */};
    // Bind methods
    this._onToneReady = this._onToneReady.bind(this);
    this._onToneError = this._onToneError.bind(this);
    this._onStartRequest = this._onStartRequest.bind(this);
    this._onMuteToggle = this._onMuteToggle.bind(this);
    this._onRandomize = this._onRandomize.bind(this);
    this._onShapeChange = this._onShapeChange.bind(this);
    this._onModeChange = this._onModeChange.bind(this);
    this._onSeedSubmit = this._onSeedSubmit.bind(this);
    this._onToggleSequencer = this._onToggleSequencer.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
  }

  connectedCallback() {
    this._buildUI();
    this.shadowRoot.querySelector('tone-loader')?.addEventListener('tone-ready', this._onToneReady);
    this.shadowRoot.querySelector('tone-loader')?.addEventListener('tone-error', this._onToneError);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('randomize-request', this._onRandomize);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('mode-change', this._onModeChange);
    this._controls.addEventListener('seed-submit', this._onSeedSubmit);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

    const shapeOptions = this.shapes.map(k => ({ value: k, label: this.shapeLabels[k] }));
    this.extraShapes.forEach(k => shapeOptions.push({ value: k, label: this.shapeLabels[k] }));
    this._controls.setShapes(shapeOptions);
    this._controls.updateState({ isAudioStarted: false, isPlaying: false, isMuted: true, shapeKey: this.shapes[0], isSeedMode: false, sequencerVisible: false });

    this._canvas.onIndicatorUpdate = (text, audioActive) => {
      this._statusDiv.textContent = text;
    };
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);
    this.disposeAllChains();
    this._canvas.analyser = null;
    this._canvas.isAudioStarted = false;
    this._canvas.isPlaying = false;
  }

  // ... UI construction logic unchanged ...

  _onToneReady(ev) {
    this.state.Tone = ev.detail?.Tone || window.Tone;
    this._statusDiv.textContent = 'Audio engine ready.';
    this.state.isAudioStarted = true;
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: true, shapeKey: this.shapes[0], isSeedMode: this.state.isSeedMode, sequencerVisible: this.state.isSequencerVisible });
    this.generateInitialPresets();
    const shapeKey = this.shapes[0];
    this.state.currentShape = shapeKey;
    this._canvas.shapeKey = shapeKey;
    this._canvas.preset = this.state.presets[shapeKey];
    this._controls.updateState({ shapeKey });
  }

  _onToneError(ev) {
    this._statusDiv.textContent = 'Failed to load Tone.js. App cannot start.';
    this.state.isAudioStarted = false;
  }

  // ---- Robust Audio Chain Handling ----

  // Always dispose chain before building/rebuilding
  setShape(shapeKey) {
    if (shapeKey === this.state.currentShape) return;
    this.disposeChain(this.state.currentShape);
    this.state.currentShape = shapeKey;
    const preset = this.state.presets[shapeKey];
    if (preset) {
      this._canvas.shapeKey = shapeKey;
      this._canvas.preset = preset;
      if (this.state.isAudioStarted && this.state.isPlaying) {
        const chain = this.buildChain(shapeKey);
        if (chain) {
          this._canvas.analyser = chain.analyser;
          this._canvas.isAudioStarted = true;
          this._canvas.isPlaying = true;
        }
      }
      this._controls.updateState({ shapeKey });
    }
  }

  // Always dispose before building new
  buildChain(shapeKey) {
    const { Tone } = this.state;
    if (!Tone) return null;
    this.disposeChain(shapeKey); // <- always dispose old one
    // ... rest unchanged, see your code ...
    // At end:
    this.state.chains[shapeKey] = chain;
    return chain;
  }

  disposeChain(shapeKey) {
    const ch = this.state.chains[shapeKey];
    if (!ch) return;
    try { ch.osc1.stop(); ch.osc1.dispose(); } catch {}
    if (ch.osc2) { try { ch.osc2.stop(); ch.osc2.dispose(); } catch {} }
    ch.lfos?.forEach(l => { try { l.stop(); l.dispose(); } catch {} });
    if (ch.modulatedGain) try { ch.modulatedGain.dispose(); } catch {}
    if (ch.phaser) try { ch.phaser.dispose(); } catch {}
    if (ch.reverb) try { ch.reverb.dispose(); } catch {}
    try { ch.volume.dispose(); ch.filter.dispose(); } catch {}
    delete this.state.chains[shapeKey];
  }

  disposeAllChains() {
    Object.keys(this.state.chains).forEach(k => this.disposeChain(k));
  }

  // ---- Audio Toggle ----

  async toggleAudio() {
    const state = this.state, Tone = state.Tone;
    if (!Tone) return;
    if (!state.isAudioStarted) {
      try {
        await Tone.start();
        state.isAudioStarted = true;
        const chain = this.buildChain(state.currentShape);
        if (chain) {
          this._canvas.analyser = chain.analyser;
          this._canvas.isAudioStarted = true;
        }
        state.isPlaying = true;
        Tone.Destination.mute = false;
        state.isMuted = false;
        this._canvas.isPlaying = true;
        this._statusDiv.textContent = 'Audio started.';
        this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: false, shapeKey: state.currentShape, isSeedMode: state.isSeedMode, sequencerVisible: state.isSequencerVisible });
      } catch (e) {
        this._statusDiv.textContent = 'Failed to start audio context.';
        state.isAudioStarted = false;
      }
      return;
    }
    // Toggle mute
    state.isPlaying = !state.isPlaying;
    Tone.Destination.mute = !state.isPlaying;
    state.isMuted = !state.isPlaying;
    this._canvas.isPlaying = state.isPlaying;
    this._statusDiv.textContent = state.isPlaying ? 'Audio unmuted.' : 'Audio muted.';
    this._controls.updateState({ isAudioStarted: true, isPlaying: state.isPlaying, isMuted: state.isMuted, shapeKey: state.currentShape, isSeedMode: state.isSeedMode, sequencerVisible: state.isSequencerVisible });
  }

  // ... other handlers and logic unchanged, just ensure disposeChain is always called before building new audio for a shape or after random/seed mode ...

  // All other methods as in your code, just referencing disposeChain where appropriate.
}

customElements.define('osc-app', OscApp);
