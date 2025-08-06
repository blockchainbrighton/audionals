// Unified control surface for the oscilloscope synthesiser.
//
// This component encapsulates the main UI controls: starting/stopping
// audio, muting, generating new presets, selecting shapes, toggling
// between random and deterministic (seed) modes, submitting a seed and
// showing or hiding the step sequencer.  Rather than tightly coupling
// behaviour to application logic it dispatches CustomEvents that
// bubble through the DOM.  The orchestration layer (osc-app) should
// listen for these events and respond accordingly.

class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isSeedMode = false;
    this._sequencerVisible = false;
    this._buildUI();
  }

  _buildUI() {
    const root = this.shadowRoot;
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      #controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        justify-content: center;
        align-items: center;
        padding: 0.6rem 0.4rem;
      }
      button, select, input {
        padding: 0.45rem 0.8rem;
        border-radius: 5px;
        border: 1px solid #555;
        background: #202020;
        color: #f0f0f0;
        font-size: 0.85rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      button:hover:not(:disabled), select:hover:not(:disabled), input:hover:not(:disabled) {
        background: #2e2e2e;
      }
      button:active:not(:disabled) {
        transform: translateY(1px);
      }
      button:disabled, select:disabled, input:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      #seedContainer {
        display: none;
        align-items: center;
        gap: 0.3rem;
      }
      #seedInput {
        width: 7rem;
      }
      #statusMsg {
        font-size: 0.75rem;
        padding: 0.2rem 0.4rem;
        color: #ccc;
        min-height: 1.2em;
      }
    `;
    root.appendChild(style);
    const container = document.createElement('div');
    container.id = 'controls';

    this._startBtn = document.createElement('button');
    this._startBtn.id = 'startBtn';
    this._startBtn.textContent = 'Start';
    this._startBtn.disabled = true;
    this._startBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });

    this._generateBtn = document.createElement('button');
    this._generateBtn.id = 'generateBtn';
    this._generateBtn.textContent = 'Generate';
    this._generateBtn.disabled = true;
    this._generateBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('randomize-request', { bubbles: true, composed: true }));
    });

    this._muteBtn = document.createElement('button');
    this._muteBtn.id = 'muteBtn';
    this._muteBtn.textContent = 'Mute';
    this._muteBtn.disabled = true;
    this._muteBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
    });

    this._shapeSelect = document.createElement('select');
    this._shapeSelect.id = 'shapeSelect';
    this._shapeSelect.disabled = true;
    this._shapeSelect.addEventListener('change', () => {
      const value = this._shapeSelect.value;
      this.dispatchEvent(new CustomEvent('shape-change', {
        bubbles: true,
        composed: true,
        detail: { shapeKey: value }
      }));
    });

    this._modeBtn = document.createElement('button');
    this._modeBtn.id = 'modeBtn';
    this._modeBtn.textContent = 'Mode: Random';
    this._modeBtn.disabled = true;
    this._modeBtn.addEventListener('click', () => {
      this._isSeedMode = !this._isSeedMode;
      this.updateModeDisplay();
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true,
        composed: true,
        detail: { isSeedMode: this._isSeedMode }
      }));
    });

    this._seedContainer = document.createElement('div');
    this._seedContainer.id = 'seedContainer';
    this._seedLabel = document.createElement('label');
    this._seedLabel.setAttribute('for', 'seedInput');
    this._seedLabel.textContent = 'Seed:';
    this._seedInput = document.createElement('input');
    this._seedInput.id = 'seedInput';
    this._seedInput.type = 'text';
    this._seedInput.maxLength = 64;
    this._seedBtn = document.createElement('button');
    this._seedBtn.id = 'seedBtn';
    this._seedBtn.textContent = 'Set';
    this._seedBtn.addEventListener('click', () => {
      const seed = this._seedInput.value.trim();
      if (!seed) {
        this._statusMessage('Seed cannot be empty.', 'error');
        return;
      }
      if (seed.length > 64) {
        this._statusMessage('Seed too long (max 64 chars).', 'error');
        return;
      }
      this.dispatchEvent(new CustomEvent('seed-submit', {
        bubbles: true,
        composed: true,
        detail: { seed }
      }));
      this._statusMessage(`Seed set to '${seed}'.`, 'success');
      setTimeout(() => this._statusMsg.textContent = '', 3000);
    });
    this._seedContainer.append(this._seedLabel, this._seedInput, this._seedBtn);

    this._seqBtn = document.createElement('button');
    this._seqBtn.id = 'seqBtn';
    this._seqBtn.textContent = 'Show Sequencer';
    this._seqBtn.disabled = true;
    this._seqBtn.addEventListener('click', () => {
      this._sequencerVisible = !this._sequencerVisible;
      this.updateSequencerDisplay();
      this.dispatchEvent(new CustomEvent('toggle-sequencer', {
        bubbles: true,
        composed: true,
        detail: { visible: this._sequencerVisible }
      }));
    });

    this._statusMsg = document.createElement('div');
    this._statusMsg.id = 'statusMsg';
    this._statusMsg.style.cssText = 'color: #ccc;';

    container.append(this._startBtn, this._generateBtn, this._muteBtn,
      this._shapeSelect, this._modeBtn, this._seedContainer, this._seqBtn, this._statusMsg);
    root.appendChild(container);
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

  updateModeDisplay() {
    if (this._isSeedMode) {
      this._modeBtn.textContent = 'Mode: Seed';
      this._seedContainer.style.display = 'flex';
    } else {
      this._modeBtn.textContent = 'Mode: Random';
      this._seedContainer.style.display = 'none';
    }
  }

  updateSequencerDisplay() {
    this._seqBtn.textContent = this._sequencerVisible ? 'Hide Sequencer' : 'Show Sequencer';
  }

  _statusMessage(text, type = 'info') {
    this._statusMsg.textContent = text;
    this._statusMsg.style.color = type === 'error' ? '#f88' : type === 'success' ? '#8f8' : '#ccc';
  }

  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, isSeedMode, sequencerVisible, isGenerating }) {
    if (typeof isAudioStarted === 'boolean') {
      this._startBtn.disabled = !isAudioStarted;
      this._generateBtn.disabled = !isAudioStarted || isGenerating;
      this._muteBtn.disabled = !isAudioStarted;
      this._shapeSelect.disabled = !isAudioStarted;
      this._modeBtn.disabled = !isAudioStarted;
      this._seqBtn.disabled = !isAudioStarted;
    }
    if (typeof isPlaying === 'boolean') {
      this._startBtn.textContent = isPlaying ? 'Stop' : 'Start';
    }
    if (typeof isMuted === 'boolean') {
      this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    }
    if (shapeKey) {
      this._shapeSelect.value = shapeKey;
    }
    if (typeof isSeedMode === 'boolean' && isSeedMode !== this._isSeedMode) {
      this._isSeedMode = isSeedMode;
      this.updateModeDisplay();
    }
    if (typeof sequencerVisible === 'boolean' && sequencerVisible !== this._sequencerVisible) {
      this._sequencerVisible = sequencerVisible;
      this.updateSequencerDisplay();
    }
    if (typeof isGenerating === 'boolean') {
      this._generateBtn.disabled = !isAudioStarted || isGenerating;
      this._generateBtn.textContent = isGenerating ? 'Generating...' : 'Generate';
    }
  }
}

customElements.define('osc-controls', OscControls);