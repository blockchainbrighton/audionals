
// seed-synth.js (streamlined wrapper)

import './engine.js';        // registers tone-loader and exports Engine/Signatures (if needed by osc-app)
import './scope-canvas.js';  // registers <scope-canvas>
import './seq-app.js';       // registers <seq-app>
import './osc-app.js';       // registers <osc-app> (includes controls)

export class SeedSynthElement extends HTMLElement {
  static get observedAttributes() { return ['seed', 'show-sequencer']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._oscApp = null;
    this._initialized = false;
    this._defaultOptions = { seed: '5s567g67', showSequencer: false, audioContext: null };
    this._options = { ...this._defaultOptions };
  }

  // ---- lifecycle ----
  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

    const seed = this.getAttribute('seed') ?? this._defaultOptions.seed;
    const showSequencer = this.hasAttribute('show-sequencer');
    this.setOptions({ seed, showSequencer });

    this._render();

    // keep macrotask timing parity with previous version
    setTimeout(() => this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true })), 0);
  }

  disconnectedCallback() { this._osc()?.dispose?.(); }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._initialized || oldVal === newVal) return;
    if (name === 'seed') this.seed = newVal || this._defaultOptions.seed;
    if (name === 'show-sequencer') this._updateSequencerVisibility();
  }

  // ---- public API (unchanged surface) ----
  setOptions(opts = {}) {
    this._options = { ...this._options, ...opts };
    if (this._osc()) this._applyOptionsToOscApp();
  }

  get seed() { return this._options.seed; }
  set seed(v) {
    const seed = String(v || this._defaultOptions.seed);
    this._options.seed = seed;
    this.setAttribute('seed', seed);
    const osc = this._osc();
    if (!osc) return;
    osc.resetToSeed?.(seed);
    osc.shadowRoot?.getElementById('seedInput')?.value = seed;
  }

  get options() {
    const e = this._osc();
    if (!e) return [];
    const shapes = e.shapes ?? [];
    const humKey = e.humKey ?? 'hum';
    const humLabel = e.humLabel ?? 'Power Hum';
    return [{ key: humKey, label: humLabel }, ...shapes.map(k => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))];
  }

  get currentKey() { return this._osc()?.state?.current ?? this._osc()?.humKey ?? 'hum'; }

  setCurrent(key) { this._osc()?._onShapeChange?.({ detail: { shapeKey: key } }); }

  async start() {
    if (!this._osc()) throw new Error('Component not ready');
    this._osc()?._onStartRequest?.();
  }

  stop() {
    const s = this._state();
    if (!s) return;
    if (s.isPlaying) this._osc()?._onStartRequest?.();
    if (s.sequencePlaying) this.stopSequence();
  }

  mute(forceBool) {
    const osc = this._osc();
    if (!osc) return;
    const muted = this._dest()?.mute ?? false;
    if (typeof forceBool === 'boolean') {
      if (muted !== forceBool) osc._onMuteToggle?.();
      return;
    }
    osc._onMuteToggle?.();
  }

  get muted() { return !!this._dest()?.mute; }

  recordStep(n) {
    const el = this._seq();
    if (!el) return;
    const val = (typeof n === 'number' && n >= 1 && n <= 9) ? n : 1;
    el.recordStep?.(val);
  }

  playSequence() { this._seq()?.playSequence?.(); }
  stopSequence() { this._seq()?.stopSequence?.(); }

  setStepTime(ms) {
    const s = this._state();
    if (!s) return;
    s.stepTime = ms;
    this._seq()?.setStepTime?.(ms);
  }

  getAnalyser() { return this._state()?.chains?.[this.currentKey]?.analyser ?? null; }

  getState() {
    const s = this._state();
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
    const osc = this._osc();
    if (!osc) return;

    if (patch.seed) this.seed = patch.seed;
    if (patch.currentKey) this.setCurrent(patch.currentKey);
    if (Array.isArray(patch.sequence)) osc.state.sequence = [...patch.sequence];
    if (typeof patch.stepTime === 'number') this.setStepTime(patch.stepTime);
    if (typeof patch.muted === 'boolean') this.mute(patch.muted);

    if (typeof patch.isSequencerMode === 'boolean') {
      osc.state.isSequencerMode = patch.isSequencerMode;
      this._updateSequencerVisibility();
    }

    // Preserve previous behavior: falsy/omitted -> stop
    patch.sequencePlaying ? this.playSequence() : this.stopSequence();
  }

  get audioContext() { return this._options.audioContext ?? null; }
  set audioContext(ctx) { this._options.audioContext = ctx; }

  get tone() { return window.Tone ?? null; }
  set tone(T) { window.Tone = T; }

  dispose() {
    this._osc()?.disconnectedCallback?.();
    this._oscApp = null;
  }

  // ---- private helpers ----
  _osc() { return this._oscApp; }
  _state() { return this._osc()?.state ?? null; }
  _seq() { return this._osc()?._sequencerComponent ?? null; }
  _dest() { return this._state()?.Tone?.Destination ?? null; }

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
    const s = this._state();
    if (!s) return;
    s.seed = this._options.seed;
    this._osc()?.shadowRoot?.getElementById('seedInput')?.value = this._options.seed;
  }

  _updateSequencerVisibility() {
    const seq = this._seq();
    if (!seq) return;
    const show = this.hasAttribute('show-sequencer') || !!this._options.showSequencer;
    seq.style.display = show ? '' : 'none';
    const s = this._state();
    if (s) s.isSequencerMode = !!show;
  }
}

customElements.define('seed-synth', SeedSynthElement);