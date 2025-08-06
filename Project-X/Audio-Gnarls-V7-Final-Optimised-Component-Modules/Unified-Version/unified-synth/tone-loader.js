// ToneLoader component
//
// This element is responsible for dynamically loading Tone.js from its
// Ordinals inscription.  When the script has finished importing the
// component dispatches a `tone-ready` event which bubbles through the
// DOM.  If the attribute `tone-url` is present its value will be used
// instead of the default URL.  When an error occurs a `tone-error`
// event is dispatched with the exception on the `detail` property.

class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // No visible UI is rendered – the loader only performs side effects.
  }

  connectedCallback() {
    // Avoid loading the library more than once when the element is
    // detached and reattached.
    if (this._loaded) return;
    this._loaded = true;
    const urlAttr = this.getAttribute('tone-url');
    const toneUrl = urlAttr ||
      'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    import(toneUrl)
      .then(mod => {
        // Some inscriptions attach Tone directly to window while others
        // export it as default – normalise to window.Tone.
        if (!window.Tone && (mod?.default || mod?.Tone)) {
          window.Tone = mod.default ?? mod.Tone;
        }
        this.dispatchEvent(new CustomEvent('tone-ready', {
          bubbles: true,
          composed: true,
          detail: { Tone: window.Tone }
        }));
      })
      .catch(err => {
        this.dispatchEvent(new CustomEvent('tone-error', {
          bubbles: true,
          composed: true,
          detail: err
        }));
      });
  }
}

customElements.define('tone-loader', ToneLoader);