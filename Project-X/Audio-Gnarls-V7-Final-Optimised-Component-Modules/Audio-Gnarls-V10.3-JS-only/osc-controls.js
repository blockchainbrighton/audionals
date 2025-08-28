class OscControls2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

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

    this._audioSigBtn = document.createElement('button');
    this._audioSigBtn.id = 'audioSigBtn';
    this._audioSigBtn.textContent = 'Audio Signature';

    // NEW: Loop toggle
    this._loopBtn = document.createElement('button');
    this._loopBtn.id = 'loopBtn';
    this._loopBtn.className = 'toggle';
    this._loopBtn.setAttribute('aria-pressed', 'false');
    this._loopBtn.textContent = 'Loop: Off';

    // NEW: Sequencer Signature Mode toggle
    this._sigModeBtn = document.createElement('button');
    this._sigModeBtn.id = 'sigModeBtn';
    this._sigModeBtn.className = 'toggle';
    this._sigModeBtn.setAttribute('aria-pressed', 'false');
    this._sigModeBtn.textContent = 'Signature Mode: Off';

    container.append(
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._seqBtn,
      this._audioSigBtn,
      this._loopBtn,
      this._sigModeBtn
    );

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
        transition: background 0.19s, color 0.19s, box-shadow 0.19s, transform 0.06s ease;
        box-shadow: 0 0 0px #0000;
        will-change: transform;
      }
      button:active { transform: translateY(1px); }
      button:focus {
        outline: 2px solid #7af6ff;
        outline-offset: 1px;
      }
      button:hover {
        background: #454;
      }
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
      #muteBtn.muted {
        background: #a51427;
        color: #fff;
        border-color: #ff506e;
        box-shadow: 0 0 12px #ff506e66;
        text-shadow: 0 1px 2px #320a0b;
      }
      #audioSigBtn {
        background: #2a4d3a;
        color: #7af6ff;
        border-color: #4a7c59;
        box-shadow: 0 0 8px #7af6ff33;
      }
      #audioSigBtn:hover {
        background: #3a5d4a;
        box-shadow: 0 0 12px #7af6ff55;
      }
      #audioSigBtn:disabled {
        background: #1a2d2a;
        color: #4a6c59;
        box-shadow: none;
      }

      /* NEW: Toggle button base */
      .toggle {
        position: relative;
        background: #23252b;
        border-color: #4e5668;
        color: #cfe3ff;
        box-shadow: inset 0 -1px 0 #00000044, 0 0 0px #0000;
      }
      .toggle:hover {
        background: #2b2f38;
      }
      /* ON state (aria-pressed=true) */
      .toggle[aria-pressed="true"] {
        background: #1f3a26;
        color: #9df5c2;
        border-color: #46ad6d;
        box-shadow: 0 0 10px #46ad6d55, inset 0 0 0 1px #46ad6d33;
        text-shadow: 0 1px 2px #0b1a10aa;
      }
      /* Specific accents per toggle */
      #loopBtn.toggle[aria-pressed="true"] {
        background: #173a2a;
        border-color: #35d08e;
        box-shadow: 0 0 12px #35d08e55, inset 0 0 0 1px #35d08e33;
      }
      #sigModeBtn.toggle[aria-pressed="true"] {
        background: #1f2a3f;
        border-color: #7aa2ff;
        color: #cfe0ff;
        box-shadow: 0 0 12px #7aa2ff55, inset 0 0 0 1px #7aa2ff33;
      }

      /* Compact on small screens */
      @media (max-width: 560px) {
        #controls { gap: 0.6rem; }
        button, select { padding: 0.48em 0.9em; font-size: 0.95rem; }
      }

      button:disabled, select:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    this.shadowRoot.append(style, container);

    // Events
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
    this._audioSigBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('audio-signature', { bubbles: true, composed: true }));
    });
    // NEW: Loop toggle click
    this._loopBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('loop-toggle', { bubbles: true, composed: true }));
    });
    // NEW: Signature Mode toggle click
    this._sigModeBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('signature-mode-toggle', { bubbles: true, composed: true }));
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
    [
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._seqBtn,
      this._audioSigBtn,
      this._loopBtn,
      this._sigModeBtn
    ].forEach(el => { el.disabled = disabled; });
  }

  /**
   * Accepts extra flags:
   * - isLoopEnabled (boolean)
   * - isSequenceSignatureMode (boolean)
   */
  updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible, isLoopEnabled, isSequenceSignatureMode } = {}) {
    if (typeof isAudioStarted === 'boolean') {
      this._startBtn.disabled = !isAudioStarted;
      this._muteBtn.disabled = !isAudioStarted;
      this._audioSigBtn.disabled = !isAudioStarted;
      this._loopBtn.disabled = !isAudioStarted;
      // Signature Mode toggle only useful when sequencer exists; follow isAudioStarted too
      this._sigModeBtn.disabled = !isAudioStarted;
    }

    if (typeof isPlaying === 'boolean') {
      this._startBtn.textContent = isPlaying ? 'POWER OFF' : 'POWER ON';
      this._startBtn.classList.toggle('power-on', !!isPlaying);
      this._startBtn.classList.toggle('power-off', !isPlaying);
    }

    if (typeof isMuted === 'boolean') {
      this._muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
      this._muteBtn.classList.toggle('muted', !!isMuted);
    }

    if (shapeKey) this._shapeSelect.value = shapeKey;

    if (typeof sequencerVisible === 'boolean') {
      this._seqBtn.textContent = sequencerVisible ? 'Hide Sequencer' : 'Create Sequence';
      // Signature Mode toggle should visually remain available; no auto-hide needed
    }

    // NEW: reflect Loop toggle state
    if (typeof isLoopEnabled === 'boolean') {
      this._loopBtn.setAttribute('aria-pressed', String(!!isLoopEnabled));
      this._loopBtn.textContent = isLoopEnabled ? 'Loop: On' : 'Loop: Off';
    }

    // NEW: reflect Sequencer Signature Mode state
    if (typeof isSequenceSignatureMode === 'boolean') {
      this._sigModeBtn.setAttribute('aria-pressed', String(!!isSequenceSignatureMode));
      this._sigModeBtn.textContent = isSequenceSignatureMode ? 'Signature Mode: On' : 'Signature Mode: Off';
    }
  }
}
customElements.define('osc-controls', OscControls2);
