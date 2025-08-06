// Tone loader for the third application.  It mirrors the logic from the
// first two apps: dynamically import Tone.js from an Ordinals link and
// dispatch a `tone-ready` event when complete.
class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '';
    this._loaded = false;
  }
  connectedCallback() {
    if (this._loaded) return;
    this._loaded = true;
    const toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    import(toneUrl).then(mod => {
      if (!window.Tone && (mod?.default || mod?.Tone)) {
        window.Tone = mod.default ?? mod.Tone;
      }
      this.dispatchEvent(new CustomEvent('tone-ready', { bubbles: true, composed: true }));
    }).catch(err => {
      console.error('Failed to load Tone.js:', err);
    });
  }
}
customElements.define('tone-loader', ToneLoader);