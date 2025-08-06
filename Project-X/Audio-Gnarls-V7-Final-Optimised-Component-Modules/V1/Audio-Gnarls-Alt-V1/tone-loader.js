// Custom element responsible solely for loading Tone.js.  Once Tone.js has been
// loaded and attached to the global window object the component dispatches
// a `tone-ready` event.  No UI is rendered by this component.
class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // The component does not render any UI.  It exists only for side effects.
    this.shadowRoot.innerHTML = '';
    this._loaded = false;
  }

  connectedCallback() {
    // Guard against loading Tone.js multiple times.
    if (this._loaded) return;
    this._loaded = true;
    const toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    // Dynamically import the script.  Upon success the `Tone` global will
    // be available on the window.  If the import resolves with a module
    // containing a default export we fall back to that as well.
    import(toneUrl).then(mod => {
      // Some ordinals modules export Tone as default while others attach
      // directly to the window.  Normalize to window.Tone.
      if (!window.Tone && (mod?.default || mod?.Tone)) {
        window.Tone = mod.default ?? mod.Tone;
      }
      // Dispatch a bubbling event to signal Tone.js is ready.  Consumers
      // should listen for this event on their parent elements.
      this.dispatchEvent(new CustomEvent('tone-ready', {
        bubbles: true,
        composed: true
      }));
    }).catch(err => {
      console.error('Failed to load Tone.js:', err);
    });
  }
}

customElements.define('tone-loader', ToneLoader);