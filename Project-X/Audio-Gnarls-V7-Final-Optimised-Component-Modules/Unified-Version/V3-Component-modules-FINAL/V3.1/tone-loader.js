// File: tone-loader.js
const TONE_JS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: monospace;
          font-size: 0.9rem;
          color: #aaa;
          min-height: 1.4rem;
          display: block;
          text-align: center;
          font-style: italic;
          user-select: none;
        }
      </style>
      <div id="status">Loading Audio Engine...</div>
    `;
    this.statusDiv = this.shadowRoot.getElementById('status');
  }

  connectedCallback() {
    this.loadTone();
  }

  async loadTone() {
    try {
      await import(TONE_JS_URL);
      if (!window.Tone) throw new Error("Tone.js not found after import");
      this.statusDiv.textContent = `Tone.js v${window.Tone.version ?? "?"} loaded. Click 'Start Audio + Draw' to begin.`;
      this.dispatchEvent(new CustomEvent('tone-ready', { bubbles: true, composed: true }));
    } catch (e) {
      this.statusDiv.textContent = 'Failed to load Tone.js.';
      console.error(e);
    }
  }
}

customElements.define('tone-loader', ToneLoader);
