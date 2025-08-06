// <osc-controls> encapsulates all UI controls for the oscilloscope
// application.  It exposes a simple event interface: clicking the start
// button dispatches a `start-request` event, clicking the mute button
// dispatches a `mute-toggle` event, changing the shape selector dispatches
// `shape-change` with the selected value, clicking the randomize button
// dispatches `randomize-request` and clicking the mode toggle dispatches
// `mode-change` with a boolean indicating seed mode.  Consumers can call
// methods on the element to update UI state and to provide the list of
// available shapes.
class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Create the basic markup.  A single container wraps all controls.
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
    this._randomizeBtn = document.createElement('button');
    this._randomizeBtn.id = 'randomizeBtn';
    this._randomizeBtn.textContent = 'Randomize';
    this._modeToggle = document.createElement('button');
    this._modeToggle.id = 'modeToggle';
    this._modeToggle.className = 'random-mode';
    this._modeToggle.textContent = 'Mode: Random';
    container.append(
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._randomizeBtn,
      this._modeToggle
    );
    // Append styles and container to shadow root.
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      #controls {
        display: flex;
        gap: 0.8rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.5rem 1rem;
        /* Transparent background to allow underlying page styles to show */
      }
      button, select {
        padding: 0.5rem 1rem;
        border-radius: 5px;
        border: 1px solid #666;
        background: #2a2a2a;
        color: #eee;
        transition: background 0.2s, transform 0.1s;
        font-size: 0.9rem;
        font-family: inherit;
        cursor: pointer;
      }
      button:hover {
        background: #3a3a3a;
        transform: translateY(-1px);
      }
      button:active {
        transform: translateY(1px);
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      /* Mode button colour variants. */
      #modeToggle.seed-mode {
        background: #2c5a2c;
        border-color: #5cb85c;
        color: #dff0d8;
      }
      #modeToggle.random-mode {
        background: #5a3c2c;
        border-color: #b85c5c;
        color: #f0d8d8;
      }
    `;
    this.shadowRoot.append(style, container);
    // Bind event handlers
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
    this._randomizeBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('randomize-request', { bubbles: true, composed: true }));
    });
    this._modeToggle.addEventListener('click', () => {
      this._isSeedMode = !this._isSeedMode;
      this.dispatchEvent(new CustomEvent('mode-change', { detail: { isSeedMode: this._isSeedMode }, bubbles: true, composed: true }));
      this.setMode(this._isSeedMode);
    });
    // Initial state
    this._isSeedMode = false;
    this.disableAll(true);
  }

  // Populate the select element with shape options.  Accepts an array of
  // objects with `value` and `label` properties.
  setShapes(shapes) {
    this._shapeSelect.innerHTML = '';
    shapes.forEach(({ value, label }) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      this._shapeSelect.appendChild(o);
    });
  }

  // Enable or disable all controls.  Before Tone.js has loaded the
  // controls remain disabled to prevent user interaction.
  disableAll(disabled) {
    [this._startBtn, this._muteBtn, this._shapeSelect, this._randomizeBtn, this._modeToggle].forEach(el => {
      el.disabled = disabled;
    });
  }

  // Update the UI to reflect the current application state.  The
  // properties correspond to those in the orchestration layer:
  // isAudioStarted – whether Tone.js has started; isPlaying – whether
  // audio is currently audible; isMuted – whether destination is muted;
  // shapeKey – currently selected visual shape; isSeedMode – whether
  // deterministic seed mode is active.
  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, isSeedMode }) {
    // Enable or disable mute/start buttons according to audio availability.
    this._startBtn.disabled = !isAudioStarted;
    this._muteBtn.disabled = !isAudioStarted;
    // Update start button label
    this._startBtn.textContent = isPlaying ? 'Stop Audio' : 'Start Audio';
    // Update mute button label
    this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    // Update selected shape
    if (shapeKey) {
      this._shapeSelect.value = shapeKey;
    }
    // Update mode toggle state
    if (typeof isSeedMode === 'boolean' && isSeedMode !== this._isSeedMode) {
      this._isSeedMode = isSeedMode;
      this.setMode(this._isSeedMode);
    }
  }

  // Toggle the appearance and text of the mode button.
  setMode(isSeedMode) {
    if (isSeedMode) {
      this._modeToggle.classList.remove('random-mode');
      this._modeToggle.classList.add('seed-mode');
      this._modeToggle.textContent = 'Mode: Seed';
    } else {
      this._modeToggle.classList.remove('seed-mode');
      this._modeToggle.classList.add('random-mode');
      this._modeToggle.textContent = 'Mode: Random';
    }
  }
}

customElements.define('osc-controls', OscControls);