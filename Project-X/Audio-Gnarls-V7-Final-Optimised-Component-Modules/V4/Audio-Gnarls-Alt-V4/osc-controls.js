// Control panel for the third application.  Provides buttons for
// starting/stopping audio and drawing, muting/unmuting and selecting
// between available shapes.  Dispatches `start-request`, `mute-toggle`
// and `shape-change` events.
class OscControls3 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    container.id = 'controls';
    this._startBtn = document.createElement('button');
    this._startBtn.id = 'startBtn';
    this._startBtn.textContent = 'Start Audio + Draw';
    this._muteBtn = document.createElement('button');
    this._muteBtn.id = 'muteBtn';
    this._muteBtn.textContent = 'Mute';
    this._shapeSelect = document.createElement('select');
    this._shapeSelect.id = 'shapeSelect';
    container.append(this._startBtn, this._muteBtn, this._shapeSelect);
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      #controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
      }
      button, select {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: #222;
        color: #fff;
        cursor: pointer;
        transition: background 0.2s;
      }
      button:hover, select:hover {
        background: #333;
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    this.shadowRoot.append(style, container);
    // Event wiring
    this._startBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });
    this._muteBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
    });
    this._shapeSelect.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('shape-change', { detail: { shapeKey: this._shapeSelect.value }, bubbles: true, composed: true }));
    });
  }
  setShapes(shapes) {
    this._shapeSelect.innerHTML = '';
    shapes.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this._shapeSelect.appendChild(opt);
    });
  }
  disableAll(disabled) {
    [this._startBtn, this._muteBtn, this._shapeSelect].forEach(el => el.disabled = disabled);
  }
  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey }) {
    this._startBtn.disabled = !isAudioStarted;
    this._muteBtn.disabled = !isAudioStarted;
    this._startBtn.textContent = isPlaying ? 'Stop Audio + Draw' : 'Start Audio + Draw';
    this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if (shapeKey) this._shapeSelect.value = shapeKey;
  }
}
customElements.define('osc-controls', OscControls3);