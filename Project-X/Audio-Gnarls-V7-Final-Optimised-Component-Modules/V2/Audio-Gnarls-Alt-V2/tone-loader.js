// A minimal custom element responsible for loading Tone.js from an Ordinals
// inscription. On successful import the component dispatches a
// `tone-ready` event which bubbles and crosses shadow boundaries so that
// parents can initialise their audio graphs. No UI is rendered: all
// feedback to the user should be handled by the orchestrator or controls.
class ToneLoader extends HTMLElement {
  constructor() {
    super();
    // Nothing in the shadow – this component is purely functional.
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Avoid loading twice if reattached.
    if (this._loaded) return;
    this._loaded = true;
    // Determine the URL from an attribute or default to the Ordinals inscription.
    const urlAttr = this.getAttribute('tone-url');
    const toneUrl = urlAttr ||
      'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    import(toneUrl)
      .then(() => {
        // On success, dispatch a bubbling, composed event so that any
        // interested ancestor (including through ShadowDOM) can react.
        this.dispatchEvent(new CustomEvent('tone-ready', {
          bubbles: true,
          composed: true,
          detail: { Tone: window.Tone }
        }));
      })
      .catch(err => {
        // Dispatch an error event with details so upstream components can
        // display an appropriate message. Do not stop propagation to
        // allow multiple listeners.
        this.dispatchEvent(new CustomEvent('tone-error', {
          bubbles: true,
          composed: true,
          detail: err
        }));
      });
  }
}

customElements.define('tone-loader', ToneLoader);