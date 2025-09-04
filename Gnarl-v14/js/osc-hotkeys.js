// js/osc-hotkeys.js
// Centralized keyboard shortcuts for Osc App.
// Emits semantic events so the shell doesn't care about raw DOM keys.

class OscHotkeys extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:none}</style>`;
    this._enabled = true;
    this._config = { humKey: 'hum', shapes: [] };
    this._downKeys = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  connectedCallback() {
    if (this._enabled) this._attach();
  }
  disconnectedCallback() { this._detach(); }

  attributeChangedCallback(name) {
    if (name === 'disabled') {
      const want = !this.hasAttribute('disabled');
      if (want && !this._enabled) { this._enabled = true; this._attach(); }
      if (!want && this._enabled) { this._enabled = false; this._detach(); }
    }
  }

  setConfig({ humKey, shapes } = {}) {
    if (humKey) this._config.humKey = humKey;
    if (Array.isArray(shapes)) this._config.shapes = shapes;
  }

  simulatePressKey(key) { this._handlePress(key, { isSim: true }); }
  simulateReleaseKey(key) { this._handleRelease(key, { isSim: true }); }

  // --- internals ------------------------------------------------------------
  _attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }
  _detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this._downKeys.clear();
  }

  _onKeyDown(ev) {
    // ignore when typing
    const t = ev.target?.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t)) return;

    const key = ev.key;
    // App-wide toggles we surface as dedicated events
    if (key === 'l' || key === 'L') { this._emit('hk-toggle-loop'); ev.preventDefault(); return; }
    if (key === 'm' || key === 'M') { this._emit('hk-toggle-signature'); ev.preventDefault(); return; }

    if (this._downKeys.has(key)) { ev.preventDefault(); return; } // avoid repeats
    this._downKeys.add(key);
    const mapped = this._mapKey(key);
    if (!mapped) return;
    this._emit('hk-press', mapped);
    ev.preventDefault();
  }

  _onKeyUp(ev) {
    const key = ev.key;
    if (!this._downKeys.has(key)) return;
    this._downKeys.delete(key);
    const mapped = this._mapKey(key);
    if (!mapped) return;
    this._emit('hk-release', mapped);
  }

  _onBlur() {
    // release all on blur
    for (const key of Array.from(this._downKeys)) {
      const mapped = this._mapKey(key);
      if (mapped) this._emit('hk-release', mapped);
    }
    this._downKeys.clear();
  }

  _handlePress(key) {
    if (this._downKeys.has(key)) return;
    this._downKeys.add(key);
    const mapped = this._mapKey(key);
    if (mapped) this._emit('hk-press', mapped);
  }
  _handleRelease(key) {
    if (!this._downKeys.has(key)) return;
    this._downKeys.delete(key);
    const mapped = this._mapKey(key);
    if (mapped) this._emit('hk-release', mapped);
  }

  _mapKey(key) {
    // numbers: 1..9 → shapes[0..8]; 0 → hum
    if (key === '0') return { key, idx: -1, shapeKey: this._config.humKey };
    const code = key?.charCodeAt?.(0) ?? 0;
    const idx = code - 49; // '1' = 49
    if (idx >= 0 && idx < this._config.shapes.length) {
      return { key, idx, shapeKey: this._config.shapes[idx] };
    }
    return null;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}
customElements.define('osc-hotkeys', OscHotkeys);
export { OscHotkeys };
