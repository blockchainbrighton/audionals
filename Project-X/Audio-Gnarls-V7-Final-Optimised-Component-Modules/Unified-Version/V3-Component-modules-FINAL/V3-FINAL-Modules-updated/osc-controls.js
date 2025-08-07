// <osc-controls> for the second application exposes basic audio
// controls and a button to reveal or hide the step sequencer.  It
// dispatches `start-request`, `mute-toggle`, `shape-change` and
// `toggle-sequencer` events.
class OscControls2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Build the UI elements
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
    this._seqBtn = document.createElement('button');
    this._seqBtn.id = 'seqBtn';
    this._seqBtn.textContent = 'Create Sequence';
    container.append(
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._seqBtn
    );
    // Styles resembling the original application
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      #controls {
        display: flex;
        gap: 1.1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.7rem 1.2rem;
        background: rgba(255, 255, 255, 0.07);
        border-radius: 9px;
        width: 95%;
        max-width: 880px;
      }
      button, select {
        padding: 0.53em 1.17em;
        border-radius: 6px;
        border: 1px solid #555;
        background: #242;
        color: #fff;
        font-size: 1rem;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: background 0.19s;
      }
      button:hover {
        background: #454;
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    this.shadowRoot.append(style, container);
    // Event forwarding
    this._startBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });
    this._muteBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
    });
    this._shapeSelect.addEventListener('change', () => {
      const value = this._shapeSelect.value;
      this.dispatchEvent(new CustomEvent('shape-change', { detail: { shapeKey: value }, bubbles: true, composed: true }));
    });
    this._seqBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('toggle-sequencer', { bubbles: true, composed: true }));
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
    [this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn].forEach(el => {
      el.disabled = disabled;
    });
  }
  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible }) {
    this._startBtn.disabled = !isAudioStarted;
    this._muteBtn.disabled = !isAudioStarted;
    this._startBtn.textContent = isPlaying ? 'Stop Audio + Draw' : 'Start Audio + Draw';
    this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if (shapeKey) this._shapeSelect.value = shapeKey;
    this._seqBtn.textContent = sequencerVisible ? 'Hide Sequencer' : 'Create Sequence';
  }
}
customElements.define('osc-controls', OscControls2);