// A reusable control panel used by the suite.  It presents
// start/stop, mute/unmute and shape selection controls.  Consumers can
// provide shape options via setShapes() and update the UI via
// updateState().  Events are dispatched on user interaction.

class SharedControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Build UI elements
    const container = document.createElement('div');
    container.id = 'controls';
    this._startBtn = document.createElement('button');
    this._startBtn.id = 'startBtn';
    this._startBtn.textContent = 'Start Audio';
    this._muteBtn = document.createElement('button');
    this._muteBtn.id = 'muteBtn';
    this._muteBtn.textContent = 'Mute';
    this._shapeSelect = document.createElement('select');
    this._shapeSelect.id = 'shapeSelect';
    container.append(this._startBtn, this._muteBtn, this._shapeSelect);
    // Styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      #controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.5rem 1rem;
      }
      button, select {
        padding: 0.5rem 1rem;
        border-radius: 5px;
        border: 1px solid #666;
        background: #222;
        color: #eee;
        font-size: 0.9rem;
        cursor: pointer;
      }
      button:hover {
        background: #333;
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    this.shadowRoot.append(style, container);
    // Bind events
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
  }
  /**
   * Populate the select element with shape options.  Accepts an array of
   * objects with `value` and `label` properties.
   */
  setShapes(shapes) {
    this._shapeSelect.innerHTML = '';
    shapes.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this._shapeSelect.appendChild(opt);
    });
  }
  /**
   * Enable or disable controls based on whether audio is ready.
   */
  disableAll(disabled) {
    [this._startBtn, this._muteBtn, this._shapeSelect].forEach(el => {
      el.disabled = disabled;
    });
  }
  /**
   * Update labels and selected values based on the state of the
   * application.
   */
  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey }) {
    this._startBtn.disabled = !isAudioStarted;
    this._muteBtn.disabled = !isAudioStarted;
    this._startBtn.textContent = isPlaying ? 'Stop Audio' : 'Start Audio';
    this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    if (shapeKey) {
      this._shapeSelect.value = shapeKey;
    }
  }
}

customElements.define('shared-controls', SharedControls);