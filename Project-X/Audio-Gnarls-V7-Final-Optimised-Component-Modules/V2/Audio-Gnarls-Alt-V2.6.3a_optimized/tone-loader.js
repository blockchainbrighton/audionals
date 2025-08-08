// Loads Tone.js from an Ordinals inscription and dispatches a 'tone-ready' event.
// Idempotent: multiple instances only import once.
const ORDINALS_TONE_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

class ToneLoader extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({ mode:'open' });
    this.shadowRoot.innerHTML = `<span style="display:none"></span>`;
    this._loaded = false;
  }
  async connectedCallback(){
    if (window.Tone || this._loaded) { this._emit(); return; }
    this._loaded = true;
    try {
      const mod = await import(ORDINALS_TONE_URL);
      // Some inscriptions export a default; Tone also attaches globally.
      window.Tone = window.Tone || mod?.default || mod?.Tone || window.Tone;
      if (!window.Tone) throw new Error('Tone failed to attach');
      this._emit();
    } catch (err){
      console.error('[ToneLoader] Failed to load Tone:', err);
      this._loaded = false;
      this.dispatchEvent(new CustomEvent('tone-error', { detail:{ error: String(err) }, bubbles:true, composed:true }));
    }
  }
  _emit(){
    this.dispatchEvent(new CustomEvent('tone-ready', { detail:{ Tone: window.Tone }, bubbles:true, composed:true }));
  }
}
customElements.define('tone-loader', ToneLoader);
export {};