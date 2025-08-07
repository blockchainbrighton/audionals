// Custom element responsible for loading Tone.js from an Ordinals inscription.
// Once Tone.js has been successfully imported, a `tone-ready` event is
// dispatched. If loading fails, a `tone-fail` event is dispatched instead.

class ToneLoader extends HTMLElement {
  constructor() {
    super();
    // Keep this element hidden from view. It performs no visual function.
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>:host{display:none}</style>`;
  }

  connectedCallback() {
    this._loadTone();
  }

  async _loadTone() {
    // Ordinals URL hosting the Tone.js bundle. Dynamic import ensures no
    // external CDNs are used and that Tone attaches itself to the global
    // window object.
    const toneUrl =
      'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    try {
      await import(toneUrl);
      // When the module resolves, Tone.js should now be on the global object.
      this.dispatchEvent(
        new CustomEvent('tone-ready', { bubbles: true, composed: true })
      );
    } catch (err) {
      // Surface any loading errors to interested listeners on the document.
      this.dispatchEvent(
        new CustomEvent('tone-fail', {
          detail: err,
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

customElements.define('tone-loader', ToneLoader);