// This ToneLoader mirrors the implementation from the first application.  It
// dynamically imports Tone.js from an Ordinals inscription and dispatches
// a `tone-ready` event when available.  No UI is rendered by this
// component.
class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '';
    this._loaded = false;
    console.log('[ToneLoader] Constructed');
  }
  connectedCallback() {
    if (this._loaded) {
      console.log('[ToneLoader] Already loaded, skipping');
      return;
    }
    this._loaded = true;
    const toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    console.log('[ToneLoader] Loading Tone.js:', toneUrl);
    import(toneUrl).then(mod => {
      console.log('[ToneLoader] Tone.js module loaded', mod);
      if (!window.Tone && (mod?.default || mod?.Tone)) {
        window.Tone = mod.default ?? mod.Tone;
        console.log('[ToneLoader] window.Tone set:', window.Tone);
      }
      this.dispatchEvent(new CustomEvent('tone-ready', {
        bubbles: true,
        composed: true
      }));
      console.log('[ToneLoader] Dispatched tone-ready event');
    }).catch(err => {
      console.error('[ToneLoader] Failed to load Tone.js:', err);
    });
  }
}
customElements.define('tone-loader', ToneLoader);
