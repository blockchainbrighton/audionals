// js/osc-hotkeys.js
// Centralized keyboard shortcuts for Osc App.
// Emits semantic events so the shell doesn't care about raw DOM keys.

class OscHotkeys extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:none}</style>`;

    // config + state
    this._enabled = true;
    this._config = { humKey: 'hum', shapes: [] };
    this._downKeys = new Set();

    // bound handlers (stable refs)
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onPageHide = this._onPageHide.bind(this);

    // internal listener registry to ensure exact removeEventListener options
    this._listeners = [];
  }

  connectedCallback() {
    if (this._enabled) this._attach();
  }

  disconnectedCallback() {
    this._detach();
  }

  attributeChangedCallback(name) {
    if (name === 'disabled') {
      const shouldEnable = !this.hasAttribute('disabled');
      if (shouldEnable && !this._enabled) {
        this._enabled = true;
        this._attach();
      } else if (!shouldEnable && this._enabled) {
        this._enabled = false;
        this._detach();
      }
    }
  }

  setConfig({ humKey, shapes } = {}) {
    if (humKey) this._config.humKey = humKey;
    if (Array.isArray(shapes)) this._config.shapes = shapes;
  }

  simulatePressKey(key)  { this._handlePress(key, true); }
  simulateReleaseKey(key){ this._handleRelease(key, true); }

  // --------------------------------------------------------------------------
  // Attach/detach with registry
  // --------------------------------------------------------------------------
  _addL(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push({ target, type, fn, opts });
  }

  _attach() {
    // Use explicit capture=false so we remove with the same option later.
    const o = { capture: false, passive: false };
    this._addL(window,   'keydown',          this._onKeyDown, o);
    this._addL(window,   'keyup',            this._onKeyUp,   o);
    this._addL(window,   'blur',             this._onBlur,    { capture: false, passive: true });
    this._addL(document, 'visibilitychange', this._onVisibility, { capture: false, passive: true });
    this._addL(window,   'pagehide',         this._onPageHide, { capture: false, passive: true });
  }

  _detach() {
    // Remove all registered listeners using the exact same options object shape
    for (const { target, type, fn, opts } of this._listeners) {
      target.removeEventListener(type, fn, opts?.capture ?? false);
    }
    this._listeners.length = 0;

    // Clear any stuck keys
    if (this._downKeys.size) this._releaseAll();
  }

  // --------------------------------------------------------------------------
  // Event handlers
  // --------------------------------------------------------------------------
  _onKeyDown(ev) {
    // ignore when typing in form controls
    const t = ev.target?.tagName || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t)) return;

    const key = ev.key;

    // app-wide toggles
    if (key === 'l' || key === 'L') { this._emit('hk-toggle-loop'); ev.preventDefault(); return; }
    if (key === 'm' || key === 'M') { this._emit('hk-toggle-signature'); ev.preventDefault(); return; }

    // --- START: MODIFIED SECTION FOR ARROW KEYS ---
    // Handle shape stepping with arrow keys
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      ev.preventDefault();
      // This is a momentary action, not a held key, so we don't add it to _downKeys.
      const direction = (key === 'ArrowDown') ? 1 : -1;
      this._emit('hk-shape-step', { direction });
      return; // Stop further processing for this key event
    }
    // --- END: MODIFIED SECTION ---

    // avoid auto-repeat spam
    if (this._downKeys.has(key)) { ev.preventDefault(); return; }
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
    this._releaseAll();
  }

  _onVisibility() {
    // When tab becomes hidden, release to avoid stuck notes in background.
    if (document.visibilityState === 'hidden') this._releaseAll();
  }

  _onPageHide() {
    // iOS/Safari sometimes skips keyup on SPA navigations/backgrounding.
    this._releaseAll();
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  _releaseAll() {
    for (const key of Array.from(this._downKeys)) {
      const mapped = this._mapKey(key);
      if (mapped) this._emit('hk-release', mapped);
    }
    this._downKeys.clear();
  }

  _handlePress(key /*, isSim */) {
    if (this._downKeys.has(key)) return;
    this._downKeys.add(key);
    const mapped = this._mapKey(key);
    if (mapped) this._emit('hk-press', mapped);
  }

  _handleRelease(key /*, isSim */) {
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