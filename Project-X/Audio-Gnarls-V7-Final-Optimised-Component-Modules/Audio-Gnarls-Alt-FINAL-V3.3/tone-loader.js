// This ToneLoader mirrors the implementation from the first application.  It
// dynamically imports Tone.js from an Ordinals inscription and dispatches
// a `tone-ready` event when available.  No UI is rendered by this
// component.
// THIS IS A WEB3 APP - ALL COMPONENTS, MODULES AND LIBRARIES MUST BE ON-CHAIN - THIS INCLUDES FALLBACKS
// NO CDN FALLBACKS - THEY WILL NOT WORK IN WEB3
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
      if (!window.Tone) throw new Error('Tone module did not expose Tone');
      // Fire once
      if (!this._dispatched) {
        this._dispatched = true;
        this.dispatchEvent(new CustomEvent('tone-ready', {
          bubbles: true,
          composed: true
        }));
      }
    }).catch(err => {
      console.error('Failed to load Tone.js:', err);
      // Minimal inline message to inform user without external assets
      try {
        const msg = document.createElement('div');
        msg.style.cssText = 'color:#f99;font-size:12px;padding:4px 8px;';
        msg.textContent = 'Tone.js failed to load from on-chain source.';
        this.shadowRoot.appendChild(msg);
      } catch (_) {}
    });
  }
}
customElements.define('tone-loader', ToneLoader);