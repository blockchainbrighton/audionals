// Stateless visual sequencer component.  It displays an array of eight
// sequence slots, allows the user to select a slot for recording,
// clear individual slots via context menu, control playback and adjust
// step timing.  All sequence state is external and passed in via
// properties.  The component emits events describing user intent and
// never stores persistent state internally.

class OscSequencer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Template markup defining the sequencer UI.  We avoid applying any
    // default display style here—visibility is controlled by the
    // orchestrator via setVisible().
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          text-align: center;
        }
        #stepSlots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .step-slot {
          width: 40px;
          height: 40px;
          border: 1px solid #555;
          border-radius: 6px;
          background: #222;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-weight: bold;
          user-select: none;
        }
        .step-slot.record-mode {
          background: #444;
          box-shadow: 0 0 8px #fff8;
        }
        .step-slot.record-mode.active {
          background: #666;
        }
        #sequenceControls {
          margin-top: 0.5rem;
        }
        #playBtn {
          display: none;
        }
        #playBtn.visible {
          display: inline-block;
        }
      </style>
      <div id="stepSlots"></div>
      <div id="sequenceControls">
        <button id="playBtn">Play Sequence</button>
        <label for="stepTimeInput">Step Time (ms):</label>
        <input type="number" id="stepTimeInput" min="50" max="2000" value="400" style="width: 60px;" />
      </div>
    `;
    this.stepSlotsDiv = this.shadowRoot.getElementById('stepSlots');
    this.playBtn = this.shadowRoot.getElementById('playBtn');
    this.stepTimeInput = this.shadowRoot.getElementById('stepTimeInput');
    // Internal mirrors of external properties.  They default to
    // reasonable values for a fresh component.
    this._sequence = new Array(8).fill(null);
    this._recording = false;
    this._currentRecordIndex = -1;
    this._playing = false;
    this._stepTime = 400;
    this._visible = false;
  }

  connectedCallback() {
    // Render slots and attach event listeners.  This is idempotent; the
    // update() call will replace text and classes as needed.
    this._renderSlots();
    this._update();
    this.playBtn.addEventListener('click', () => {
      if (this._playing) {
        this.dispatchEvent(
          new CustomEvent('stop-sequence-request', { bubbles: true, composed: true })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent('play-sequence-request', { bubbles: true, composed: true })
        );
      }
    });
    this.stepTimeInput.addEventListener('change', () => {
      const val = parseInt(this.stepTimeInput.value, 10);
      if (!isNaN(val) && val >= 50 && val <= 2000) {
        this._stepTime = val;
        this.dispatchEvent(
          new CustomEvent('step-time-change', {
            detail: { stepTime: val },
            bubbles: true,
            composed: true,
          })
        );
      } else {
        // Clamp invalid values back to the current setting.
        this.stepTimeInput.value = this._stepTime;
      }
    });
  }

  /**
   * Programmatically control visibility of the sequencer.  When hidden
   * nothing is rendered but the node remains in the DOM.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = visible;
    this.style.display = visible ? 'block' : 'none';
  }

  /**
   * Update the entire sequence.  The input array should have eight items
   * corresponding to step values (numbers or null).  Updating the sequence
   * will refresh slot labels and the state of the play button.
   * @param {Array<number|null>} seq
   */
  set sequence(seq) {
    this._sequence = Array.isArray(seq) ? seq.slice(0, 8) : new Array(8).fill(null);
    this._update();
  }

  /**
   * Indicate whether recording is active and which slot is currently being
   * recorded.  When recording is true but currentIndex is -1, all slots
   * after the last recorded one are highlighted.
   * @param {boolean} recording
   * @param {number} currentIndex
   */
  setRecording(recording, currentIndex = -1) {
    this._recording = recording;
    this._currentRecordIndex = currentIndex;
    this._update();
  }

  /**
   * Reflect whether a sequence is currently playing.  This toggles the
   * play button label and disables it while playing is active.
   * @param {boolean} playing
   */
  setPlaying(playing) {
    this._playing = playing;
    this._updatePlayButton();
  }

  /**
   * Set the current step time for display.  This does not emit an event.
   * @param {number} ms
   */
  setStepTime(ms) {
    this._stepTime = ms;
    this.stepTimeInput.value = ms;
  }

  /**
   * Render the slot elements if they have not already been created.  Each
   * slot listens for click and context menu events to trigger recording
   * selection or clearing respectively.
   */
  _renderSlots() {
    if (this.stepSlotsDiv.childElementCount) return;
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'step-slot';
      slot.dataset.index = i;
      slot.addEventListener('click', (e) => {
        // Only allow selecting a record slot when not currently playing.
        this.dispatchEvent(
          new CustomEvent('record-start-request', {
            detail: { index: i },
            bubbles: true,
            composed: true,
          })
        );
        e.preventDefault();
      });
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.dispatchEvent(
          new CustomEvent('clear-step-request', {
            detail: { index: i },
            bubbles: true,
            composed: true,
          })
        );
      });
      this.stepSlotsDiv.appendChild(slot);
    }
  }

  /**
   * Update slot labels, recording highlights and play button state based on
   * the current external state mirrors.  This runs whenever sequence or
   * recording/playing flags change.
   */
  _update() {
    const slots = this.stepSlotsDiv.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      slot.textContent = this._sequence[i] != null ? String(this._sequence[i]) : '';
      slot.classList.remove('record-mode', 'active');
      if (this._recording) {
        if (i === this._currentRecordIndex) {
          slot.classList.add('record-mode', 'active');
        } else if (i > this._currentRecordIndex) {
          slot.classList.add('record-mode');
        }
      }
    }
    this._updatePlayButton();
  }

  /**
   * Update the play button label and visibility.  The button only shows
   * when all eight steps have a non‑null value.  When playing, the label
   * changes to "Stop Sequence".
   */
  _updatePlayButton() {
    const allFilled = this._sequence.every((s) => s != null);
    if (allFilled) {
      this.playBtn.classList.add('visible');
    } else {
      this.playBtn.classList.remove('visible');
    }
    this.playBtn.textContent = this._playing ? 'Stop Sequence' : 'Play Sequence';
    // Disable during playback?  The orchestrator can ignore duplicate
    // events so we leave the button enabled to allow stopping at any time.
  }
}

customElements.define('osc-sequencer', OscSequencer);