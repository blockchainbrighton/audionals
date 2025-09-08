// js/osc-hotkeys.js
class OscHotkeys extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:none}</style>';
    this._enabled = true;
    this._config = { humKey: 'hum', shapes: [] };
    this._downKeys = new Set();
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onPageHide = this._onPageHide.bind(this);
    this._listeners = [];
  }

  connectedCallback() { if (this._enabled) this._attach(); }
  disconnectedCallback() { this._detach(); }

  attributeChangedCallback(n) {
    if (n !== 'disabled') return;
    const en = !this.hasAttribute('disabled');
    en && !this._enabled ? (this._enabled = true, this._attach())
      : !en && this._enabled ? (this._enabled = false, this._detach())
      : 0;
  }

  setConfig({ humKey, shapes } = {}) {
    if (humKey) this._config.humKey = humKey;
    if (Array.isArray(shapes)) this._config.shapes = shapes;
  }

  simulatePressKey(k) { this._handlePress(k); }
  simulateReleaseKey(k) { this._handleRelease(k); }

  _addL(t, ty, fn, o) { t.addEventListener(ty, fn, o); this._listeners.push({ target: t, type: ty, fn, opts: o }); }

  _attach() {
    const a = { capture: false, passive: false }, p = { capture: false, passive: true };
    this._addL(window, 'keydown', this._onKeyDown, a);
    this._addL(window, 'keyup', this._onKeyUp, a);
    this._addL(window, 'blur', this._onBlur, p);
    this._addL(document, 'visibilitychange', this._onVisibility, p);
    this._addL(window, 'pagehide', this._onPageHide, p);
  }

  _detach() {
    for (const { target, type, fn, opts } of this._listeners) target.removeEventListener(type, fn, opts?.capture ?? false);
    this._listeners.length = 0;
    if (this._downKeys.size) this._releaseAll();
  }

  _onKeyDown(ev) {
    const t = ev.target?.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t)) return;

    const k = ev.key;

    // ---- Global control hotkeys (non-repeating) ----
    // Uppercase implies Shift is held
    if (k === 'o' || k === 'O') {             // o/O => Power On/Off
      this._emit('hk-toggle-power'); ev.preventDefault(); return;
    }
    if (k === 'L' && ev.shiftKey) {           // Shift+L => Latch
      this._emit('hk-toggle-latch'); ev.preventDefault(); return;
    }
    if (k === 'l' && !ev.shiftKey) {          // l => Loop
      this._emit('hk-toggle-loop'); ev.preventDefault(); return;
    }
    if (k === 'm' || k === 'M') {             // m/M => Mute
      this._emit('hk-toggle-mute'); ev.preventDefault(); return;
    }
    if (k === 'c' || k === 'C') {             // c/C => Create/Hide Sequence
      this._emit('hk-toggle-sequencer'); ev.preventDefault(); return;
    }
    if (k === 'S' && ev.shiftKey) {           // Shift+S => Signature Mode
      this._emit('hk-toggle-signature'); ev.preventDefault(); return;
    }
    if (k === 's' && !ev.shiftKey) {          // s => Audio Signature
      this._emit('hk-audio-signature'); ev.preventDefault(); return;
    }
    if (k === 'p' || k === 'P') {             // p/P => Play/Stop Sequence
      this._emit('hk-toggle-seq-play'); ev.preventDefault(); return;
    }

    // Shape stepper
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      ev.preventDefault();
      this._emit('hk-shape-step', { direction: k === 'ArrowDown' ? 1 : -1 });
      return;
    }

    // Prevent repeats for held keys
    if (this._downKeys.has(k)) { ev.preventDefault(); return; }
    this._downKeys.add(k);

    const m = this._mapKey(k);
    if (!m) return;
    this._emit('hk-press', m);
    ev.preventDefault();
  }


  _onKeyUp(ev) {
    const k = ev.key;
    if (!this._downKeys.has(k)) return;
    this._downKeys.delete(k);
    const m = this._mapKey(k);
    if (m) this._emit('hk-release', m);
  }

  _onBlur() { this._releaseAll(); }
  _onVisibility() { if (document.visibilityState === 'hidden') this._releaseAll(); }
  _onPageHide() { this._releaseAll(); }

  _releaseAll() {
    for (const k of Array.from(this._downKeys)) { const m = this._mapKey(k); if (m) this._emit('hk-release', m); }
    this._downKeys.clear();
  }

  _handlePress(k) { if (!this._downKeys.has(k)) { this._downKeys.add(k); const m = this._mapKey(k); if (m) this._emit('hk-press', m); } }
  _handleRelease(k) { if (this._downKeys.delete(k)) { const m = this._mapKey(k); if (m) this._emit('hk-release', m); } }

  _mapKey(k) {
    if (k === '0') return { key: k, idx: -1, shapeKey: this._config.humKey };
    const c = k?.charCodeAt?.(0) ?? 0, i = c - 49; // '1' => 0
    return i >= 0 && i < this._config.shapes.length ? { key: k, idx: i, shapeKey: this._config.shapes[i] } : null;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true })); }
}

customElements.define('osc-hotkeys', OscHotkeys);
export { OscHotkeys };
