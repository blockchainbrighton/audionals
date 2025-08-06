// <osc-controls> for the application exposes basic audio
// controls and a button to reveal or hide the step sequencer.  It
// dispatches `start-request`, `mute-toggle`, `shape-change` and
// `toggle-sequencer` events.
// File: osc-controls.js

class OscControls2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Build the UI elements
    const container = document.createElement('div');
    container.id = 'controls';

    this._startBtn = document.createElement('button');
    this._startBtn.id = 'startBtn';
    this._startBtn.textContent = 'POWER ON';

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

    // Add modern/futuristic CSS with button state logic
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
        margin: 1.1rem auto 0 auto;
        box-sizing: border-box;
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
        transition: background 0.19s, color 0.19s, box-shadow 0.19s;
        box-shadow: 0 0 0px #0000;
      }
      button:focus {
        outline: 2px solid #7af6ff;
        outline-offset: 1px;
      }
      button:hover {
        background: #454;
      }
      /* POWER ON/OFF states */
      #startBtn.power-off {
        background: #451015;
        color: #e97c90;
        border-color: #89232a;
        box-shadow: 0 0 4px #ff505011, 0 0 0px #0000;
        text-shadow: none;
        filter: brightness(0.95);
      }
      #startBtn.power-on {
        background: #ff2a39;
        color: #fff;
        border-color: #ff4e6a;
        box-shadow: 0 0 18px 5px #ff2a3999, 0 0 4px #ff748499;
        text-shadow: 0 1px 3px #8d2025cc, 0 0 10px #fff7;
        filter: brightness(1.10) saturate(1.2);
      }
      /* MUTED state */
      #muteBtn.muted {
        background: #a51427;
        color: #fff;
        border-color: #ff506e;
        box-shadow: 0 0 12px #ff506e66;
        text-shadow: 0 1px 2px #320a0b;
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
    // Enable/disable
    this._startBtn.disabled = !isAudioStarted;
    this._muteBtn.disabled = !isAudioStarted;

    // Button text
    this._startBtn.textContent = isPlaying ? 'POWER OFF' : 'POWER ON';
    this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';

    // Visual state for power button
    this._startBtn.classList.toggle('power-on', !!isPlaying);
    this._startBtn.classList.toggle('power-off', !isPlaying);

    // Visual state for mute
    this._muteBtn.classList.toggle('muted', !!isMuted);

    if (shapeKey) this._shapeSelect.value = shapeKey;
    this._seqBtn.textContent = sequencerVisible ? 'Hide Sequencer' : 'Create Sequence';
  }
}

customElements.define('osc-controls', OscControls2);
