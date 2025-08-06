// The controls component provides UI for starting/stopping audio and
// visuals, muting/unmuting output, selecting the current visual shape, and
// toggling the sequencer view.  It emits semantic events instead of
// directly manipulating application state.  Consumers (e.g. the
// <osc-app> orchestrator) listen for these events and act accordingly.

class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Internal flags representing UI state.  These flags drive label
    // updates on the controls and are mirrored by <osc-app> when audio
    // starts/stops or mute toggles externally.
    this._isPlaying = false;
    this._isMuted = false;
    this._isSequencerVisible = false;
    // Create the UI markup and styling once.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        #controls {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
          padding: 0.5rem;
          background: #fff1;
          border-radius: 8px;
        }
        button, select {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
        }
        button:hover:not(:disabled) {
          background: #444;
        }
        button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        #loader {
          font-size: 0.9rem;
          color: #aaa;
          min-height: 1.4rem;
          text-align: center;
          font-style: italic;
          flex-basis: 100%;
        }
      </style>
      <div id="controls">
        <button id="startBtn">Start Audio + Draw</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect">
          <option value="circle">Circle</option>
          <option value="square">Square</option>
          <option value="butterfly">Butterfly</option>
          <option value="lissajous">Lissajous</option>
          <option value="spiro">Spirograph</option>
          <option value="harmonograph">Harmonograph</option>
        </select>
        <button id="seqBtn">Create Sequence</button>
        <div id="loader"></div>
      </div>
    `;
    // Grab references to interactive elements.
    this.startBtn = this.shadowRoot.getElementById('startBtn');
    this.muteBtn = this.shadowRoot.getElementById('muteBtn');
    this.shapeSelect = this.shadowRoot.getElementById('shapeSelect');
    this.seqBtn = this.shadowRoot.getElementById('seqBtn');
    this.loaderDiv = this.shadowRoot.getElementById('loader');
  }

  connectedCallback() {
    // Disable controls until Tone is ready.  The tone-ready event is
    // listened for at the host level; when triggered we enable the start
    // button.  Mute remains disabled until audio is playing.
    this.startBtn.disabled = true;
    this.muteBtn.disabled = true;
    // Event handlers on UI controls.
    this.startBtn.addEventListener('click', () => {
      // Toggle internal playing state and emit a start request.
      const willStart = !this._isPlaying;
      this._isPlaying = willStart;
      this._updateStartLabel();
      // Mute button only active when playing.
      this.muteBtn.disabled = !willStart;
      this.dispatchEvent(
        new CustomEvent('start-request', {
          detail: { start: willStart },
          bubbles: true,
          composed: true,
        })
      );
    });
    this.muteBtn.addEventListener('click', () => {
      this._isMuted = !this._isMuted;
      this._updateMuteLabel();
      this.dispatchEvent(
        new CustomEvent('mute-toggle', {
          detail: { muted: this._isMuted },
          bubbles: true,
          composed: true,
        })
      );
    });
    this.shapeSelect.addEventListener('change', () => {
      const shape = this.shapeSelect.value;
      this.dispatchEvent(
        new CustomEvent('mode-change', {
          detail: { shape },
          bubbles: true,
          composed: true,
        })
      );
    });
    this.seqBtn.addEventListener('click', () => {
      this._isSequencerVisible = !this._isSequencerVisible;
      this._updateSeqLabel();
      this.dispatchEvent(
        new CustomEvent('sequencer-toggle', {
          detail: { visible: this._isSequencerVisible },
          bubbles: true,
          composed: true,
        })
      );
    });
    // Enable start button once Tone is loaded.  Because tone-ready bubbles
    // through the component tree, attaching the listener on the host
    // captures it when dispatched from <tone-loader>.
    this.addEventListener('tone-ready', () => {
      this.enable();
      this.setLoader('Tone.js loaded. Click start to begin.');
    });
    this.addEventListener('tone-fail', (e) => {
      this.setLoader('Failed to load Tone.js');
      this.disable();
    });
  }

  /**
   * Update the start button label based on the playing flag.
   */
  _updateStartLabel() {
    this.startBtn.textContent = this._isPlaying
      ? 'Stop Audio + Draw'
      : 'Start Audio + Draw';
  }

  /**
   * Update the mute button label based on the muted flag.
   */
  _updateMuteLabel() {
    this.muteBtn.textContent = this._isMuted ? 'Unmute' : 'Mute';
  }

  /**
   * Update the sequence toggle button label based on visibility state.
   */
  _updateSeqLabel() {
    this.seqBtn.textContent = this._isSequencerVisible
      ? 'Hide Sequencer'
      : 'Create Sequence';
  }

  /**
   * Public method used by the orchestrator to reflect audio playing state.
   * @param {boolean} playing
   */
  setPlaying(playing) {
    this._isPlaying = playing;
    this._updateStartLabel();
    // Only allow muting when audio is playing.
    this.muteBtn.disabled = !playing;
  }

  /**
   * Public method used by the orchestrator to reflect mute state.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this._isMuted = muted;
    this._updateMuteLabel();
  }

  /**
   * Public method to set the currently selected shape.  It will update the
   * dropdown without emitting a change event.
   * @param {string} shape
   */
  setShape(shape) {
    this.shapeSelect.value = shape;
  }

  /**
   * Enable the start button.  Typically called when Tone has loaded.
   */
  enable() {
    this.startBtn.disabled = false;
  }

  /**
   * Disable both start and mute buttons, preventing user interaction.
   */
  disable() {
    this.startBtn.disabled = true;
    this.muteBtn.disabled = true;
  }

  /**
   * Update the loader area with a status message.  A blank string hides
   * the message.
   * @param {string} msg
   */
  setLoader(msg = '') {
    this.loaderDiv.textContent = msg;
  }
}

customElements.define('osc-controls', OscControls);