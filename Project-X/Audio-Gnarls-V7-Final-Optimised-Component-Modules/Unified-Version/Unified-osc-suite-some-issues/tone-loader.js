// Shared Tone.js loader.  This component loads Tone.js once from an
// Ordinals inscription and dispatches a `tone-ready` event when
// available.  Multiple instances of <tone-loader> will reuse the
// same underlying import promise, ensuring a single Tone instance.

class ToneLoader extends HTMLElement {
  constructor() {
    super();
    // No UI is rendered; the shadow root remains empty.
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Immediately kick off the loading routine if it hasn't started.
    if (!ToneLoader._loadPromise) {
      const attrUrl = this.getAttribute('tone-url');
      const url = attrUrl ||
        'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
      // Store the promise on the class so it can be reused by
      // subsequently connected instances.  Dynamic imports are
      // idempotent: repeated calls return the same module.
      ToneLoader._loadPromise = import(url).then(mod => {
        // Normalise to a global Tone.  Some ordinals export Tone as
        // default or named export; others attach it directly to
        // window.  Only set window.Tone if it doesn't already exist.
        if (!window.Tone && (mod?.default || mod?.Tone)) {
          window.Tone = mod.default ?? mod.Tone;
        }
        return window.Tone;
      });
    }
    // When the promise resolves dispatch tone-ready; on failure
    // dispatch tone-error.  The events bubble and cross shadow roots.
    ToneLoader._loadPromise.then(T => {
      this.dispatchEvent(new CustomEvent('tone-ready', {
        bubbles: true,
        composed: true,
        detail: { Tone: T }
      }));
    }).catch(err => {
      this.dispatchEvent(new CustomEvent('tone-error', {
        bubbles: true,
        composed: true,
        detail: err
      }));
    });
  }
}

// Keep a static property to hold the shared import promise.
ToneLoader._loadPromise = null;

customElements.define('tone-loader', ToneLoader);