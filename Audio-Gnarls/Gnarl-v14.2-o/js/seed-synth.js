// seed-synth.js (streamlined wrapper)
// Depends on the modular components being loaded separately.
// This file intentionally defines ONLY <seed-synth> and imports the modules
// that register <osc-app>, <seq-app>, <scope-canvas>, and inlined <tone-loader>.

import './engine.js';        // registers tone-loader and exports Engine/Signatures (if needed by osc-app)
import './scope-canvas.js';  // registers <scope-canvas>
import './seq-app.js';       // registers <seq-app>
import './osc-app.js';       // registers <osc-app> (includes controls)

export class SeedSynthElement extends HTMLElement {
  static get observedAttributes() {
    return ['seed', 'show-sequencer'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._oscApp = null;
    this._initialized = false;
    this._defaultOptions = {
      seed: '5s567g67',
      showSequencer: false,
      audioContext: null,
    };
    this._options = { ...this._defaultOptions };
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

    const seedAttr = this.getAttribute('seed');
    const showSeq = this.hasAttribute('show-sequencer');
    this.setOptions({ seed: seedAttr || this._defaultOptions.seed, showSequencer: showSeq });

    this._render();
    // fire 'ready' shortly after mount for parity with previous version
    setTimeout(() => this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true })), 0);
  }

  disconnectedCallback() {
    // Let the inner app clean itself up if it exposes a dispose method
    this._oscApp?.dispose?.();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._initialized || oldVal === newVal) return;
    switch (name) {
      case 'seed':
        this.seed = newVal || this._defaultOptions.seed;
        break;
      case 'show-sequencer':
        this._updateSequencerVisibility();
        break;
    }
  }

  // ------------ Public API (same surface as before, backed by osc-app) -----------
  setOptions(opts = {}) {
    this._options = { ...this._options, ...opts };
    if (this._oscApp) this._applyOptionsToOscApp();
  }

  get seed() {
    return this._options.seed;
  }
  set seed(v) {
    this._options.seed = String(v || this._defaultOptions.seed);
    this.setAttribute('seed', this._options.seed);
    if (this._oscApp) {
      this._oscApp.resetToSeed?.(this._options.seed);
      const input = this._oscApp.shadowRoot?.getElementById('seedInput');
      if (input) input.value = this._options.seed;
    }
  }

  get options() {
    const e = this._oscApp;
    if (!e) return [];
    const shapes = e.shapes || [];
    const humKey = e.humKey || 'hum';
    const humLabel = e.humLabel || 'Power Hum';
    return [{ key: humKey, label: humLabel }, ...shapes.map(k => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))];
  }

  get currentKey() {
    return this._oscApp?.state?.current || this._oscApp?.humKey || 'hum';
  }

  setCurrent(key) {
    if (!this._oscApp) return;
    // Drive the same path osc-app uses for UI changes
    this._oscApp._onShapeChange?.({ detail: { shapeKey: key } });
  }

  async start() {
    if (!this._oscApp) throw new Error('Component not ready');
    // Delegate to internal handler (unlocks context, buffers, etc.)
    this._oscApp._onStartRequest?.();
  }

  stop() {
    if (!this._oscApp) return;
    // Toggling start/stop is handled inside osc-app
    if (this._oscApp.state?.isPlaying) this._oscApp._onStartRequest?.();
    if (this._oscApp.state?.sequencePlaying) this.stopSequence();
  }

  mute(forceBool) {
    if (!this._oscApp) return;
    if (typeof forceBool === 'boolean') {
      const muted = this._oscApp.state?.Tone?.Destination?.mute ?? false;
      if (muted !== forceBool) this._oscApp._onMuteToggle?.();
    } else {
      this._oscApp._onMuteToggle?.();
    }
  }

  get muted() {
    const e = this._oscApp;
    if (!e) return true;
    const dest = e.state?.Tone?.Destination;
    return !!dest?.mute;
  }

  recordStep(n) {
    const el = this._oscApp?._sequencerComponent;
    if (!el) return;
    const val = (typeof n === 'number' && n >= 1 && n <= 9) ? n : 1;
    el.recordStep?.(val);
  }

  playSequence() {
    this._oscApp?._sequencerComponent?.playSequence?.();
  }

  stopSequence() {
    this._oscApp?._sequencerComponent?.stopSequence?.();
  }

  setStepTime(ms) {
    if (this._oscApp) {
      this._oscApp.state.stepTime = ms;
      this._oscApp?._sequencerComponent?.setStepTime?.(ms);
    }
  }

  getAnalyser() {
    return this._oscApp?.state?.chains?.[this.currentKey]?.analyser || null;
  }

  getState() {
    const s = this._oscApp?.state;
    if (!s) return null;
    return {
      seed: s.seed,
      currentKey: s.current,
      sequence: [...s.sequence],
      stepTime: s.stepTime,
      muted: !!s.Tone?.Destination?.mute,
      isSequencerMode: s.isSequencerMode,
      sequencePlaying: s.sequencePlaying,
    };
  }

  setState(patch = {}) {
    if (!this._oscApp) return;
    if (patch.seed) this.seed = patch.seed;
    if (patch.currentKey) this.setCurrent(patch.currentKey);
    if (Array.isArray(patch.sequence)) this._oscApp.state.sequence = [...patch.sequence];
    if (typeof patch.stepTime === 'number') this.setStepTime(patch.stepTime);
    if (typeof patch.muted === 'boolean') this.mute(patch.muted);
    if (typeof patch.isSequencerMode === 'boolean') {
      this._oscApp.state.isSequencerMode = patch.isSequencerMode;
      this._updateSequencerVisibility();
    }
    if (patch.sequencePlaying) this.playSequence(); else this.stopSequence();
  }

  get audioContext() { return this._options.audioContext || null; }
  set audioContext(ctx) { this._options.audioContext = ctx; }

  get tone() { return window.Tone || null; }
  set tone(T) { window.Tone = T; }

  dispose() {
    this._oscApp?.disconnectedCallback?.();
    this._oscApp = null;
  }

  // ----------------------- private helpers -----------------------
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        osc-app { width:100%; height:100%; }
      </style>
      <osc-app></osc-app>
    `;
    this._oscApp = this.shadowRoot.querySelector('osc-app');
    this._applyOptionsToOscApp();
    this._updateSequencerVisibility();
  }

  _applyOptionsToOscApp() {
    if (!this._oscApp) return;
    if (this._oscApp.state) {
      this._oscApp.state.seed = this._options.seed;
      const input = this._oscApp.shadowRoot?.getElementById('seedInput');
      if (input) input.value = this._options.seed;
    }
  }

  _updateSequencerVisibility() {
    if (!this._oscApp) return;
    const seq = this._oscApp._sequencerComponent;
    if (seq) {
      const show = this.hasAttribute('show-sequencer') || !!this._options.showSequencer;
      seq.style.display = show ? '' : 'none';
      this._oscApp.state.isSequencerMode = !!show;
    }
  }
}

customElements.define('seed-synth', SeedSynthElement);
