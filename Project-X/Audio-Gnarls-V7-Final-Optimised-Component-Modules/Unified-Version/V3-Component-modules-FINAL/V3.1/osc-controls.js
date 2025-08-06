// File: osc-controls.js
class OscControls extends HTMLElement {
  #shadow;
  #startBtn;
  #muteBtn;
  #shapeSelect;
  #seqBtn;

  #enabled = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#shadow = this.shadowRoot;
    this.#shadow.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          padding: 0.5rem;
          background: #fff1;
          border-radius: 8px;
          user-select: none;
        }
        button, select {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          min-width: 110px;
        }
        button:hover:not(:disabled), select:hover:not(:disabled) {
          background: #444;
        }
        button:disabled, select:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      </style>
      <button id="startBtn" disabled>Loading...</button>
      <button id="muteBtn" disabled>Mute</button>
      <select id="shapeSelect" disabled>
        <option value="circle">Circle</option>
        <option value="square">Square</option>
        <option value="butterfly">Butterfly</option>
        <option value="lissajous">Lissajous</option>
        <option value="spiro">Spirograph</option>
        <option value="harmonograph">Harmonograph</option>
      </select>
      <button id="seqBtn">Create Sequence</button>
    `;
    this.#startBtn = this.#shadow.getElementById('startBtn');
    this.#muteBtn = this.#shadow.getElementById('muteBtn');
    this.#shapeSelect = this.#shadow.getElementById('shapeSelect');
    this.#seqBtn = this.#shadow.getElementById('seqBtn');
  }

  connectedCallback() {
    this.#startBtn.addEventListener('click', () => {
      if (!this.#enabled) return;
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });
    this.#muteBtn.addEventListener('click', () => {
      if (!this.#enabled) return;
      this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
    });
    this.#shapeSelect.addEventListener('change', () => {
      if (!this.#enabled) return;
      this.dispatchEvent(new CustomEvent('mode-change', { detail: this.#shapeSelect.value, bubbles: true, composed: true }));
    });
    this.#seqBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('sequencer-toggle', { bubbles: true, composed: true }));
    });
  }

  set enabled(val) {
    this.#enabled = val;
    this.#startBtn.disabled = !val;
    this.#muteBtn.disabled = !val;
    this.#shapeSelect.disabled = !val;
    if(val) {
      this.#startBtn.textContent = 'Start Audio + Draw';
      this.#muteBtn.textContent = 'Mute';
    } else {
      this.#startBtn.textContent = 'Loading...';
      this.#muteBtn.textContent = 'Mute';
    }
  }

  set playing(isPlaying) {
    this.#startBtn.textContent = isPlaying ? 'Stop Audio + Draw' : 'Start Audio + Draw';
  }

  set muted(isMuted) {
    this.#muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
  }

  set shape(val) {
    if (this.#shapeSelect.value !== val) {
      this.#shapeSelect.value = val;
    }
  }
}

customElements.define('osc-controls', OscControls);
