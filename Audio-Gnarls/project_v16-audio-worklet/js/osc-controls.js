/**
 * OscControls - Optimized Controls Component
 * 
 * Enhanced with:
 * - BaseComponent inheritance
 * - Shared styling utilities
 * - Improved event handling
 * - Better state management
 */

import { BaseComponent } from './shared/base-component.js';
import { createComponentStyles, createButtonStyle } from './shared/styles.js';
import { 
  clamp01, pct, setText, setPressed, toggleClass, byId, 
  isBool, isNum, setDisabledAll 
} from './shared/utils.js';

export class OscControls extends BaseComponent {
  constructor() {
    super();
    
    this.state = {
      isAudioStarted: false,
      isPlaying: false,
      isMuted: false,
      isAudioSignaturePlaying: false,
      isLoopEnabled: false,
      isSequenceSignatureMode: false,
      isLatchOn: false,
      sequencerVisible: false,
      volume: 10,
      shapeKey: '',
      seed: ''
    };
  }

  onConnected() {
    this._render();
    this._cacheRefs();
    this._attachEvents();
  }

  _render() {
    const styles = createComponentStyles('osc-controls', `
      #controls {
        display: flex;
        gap: 1.1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
        padding: 0.7rem 1.2rem;
        background: var(--bg-control);
        border-radius: var(--radius-lg);
        width: 95%;
        max-width: 980px;
        margin: 0.9rem auto 0;
        box-sizing: border-box;
      }

      .seed {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.3rem 0.55rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-lg);
      }

      .seed label {
        font-size: 0.95rem;
        color: var(--text-accent);
        letter-spacing: 0.02em;
      }

      .seed input {
        font-family: inherit;
        font-size: 0.98rem;
        color: #ffecb3;
        background: #1c1d22;
        border: 1px solid #3c3f48;
        border-radius: var(--radius-md);
        padding: 0.38rem 0.55rem;
        width: 15ch;
        letter-spacing: 0.04em;
      }

      .seed button {
        ${createButtonStyle('default')}
        padding: 0.42rem 0.8rem;
        color: var(--text-accent);
        background: #221;
        border-color: #665;
      }

      .seed button:hover {
        background: #2c1f1f;
      }

      .vol {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        min-width: 190px;
        padding: 0.3rem 0.55rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-lg);
      }

      .vol label {
        font-size: 0.95rem;
        color: var(--text-accent-alt);
        letter-spacing: 0.02em;
      }

      .vol input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 140px;
        height: 4px;
        background: #3a3f4a;
        border-radius: 999px;
        outline: none;
      }

      .vol input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--accent-secondary);
        border: 1px solid #2b6b44;
        box-shadow: 0 0 6px rgba(70, 173, 109, 0.33);
        cursor: pointer;
      }

      .vol input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--accent-secondary);
        border: 1px solid #2b6b44;
        cursor: pointer;
      }

      .vol #volVal {
        font-size: 0.92rem;
        color: var(--text-success);
        min-width: 3.5ch;
        text-align: right;
      }

      button, select {
        ${createButtonStyle('default')}
      }

      #startBtn.power-off {
        background: #451015;
        color: #e97c90;
        border-color: #89232a;
        box-shadow: 0 0 4px rgba(255, 80, 80, 0.067), 0 0 0 transparent;
        text-shadow: none;
        filter: brightness(0.95);
      }

      #startBtn.power-on {
        ${createButtonStyle('danger')}
        filter: brightness(1.1) saturate(1.2);
      }

      #startBtn:not(.ready) {
        opacity: 0.7;
      }

      #muteBtn.muted {
        background: #a51427;
        color: var(--text-primary);
        border-color: #ff506e;
        box-shadow: var(--shadow-glow) rgba(255, 80, 110, 0.4);
        text-shadow: 0 1px 2px #320a0b;
      }

      #audioSigBtn {
        background: #2a4d3a;
        color: var(--accent-primary);
        border-color: #4a7c59;
        box-shadow: var(--shadow-glow) rgba(122, 246, 255, 0.2);
      }

      #audioSigBtn:hover {
        background: #3a5d4a;
        box-shadow: var(--shadow-glow) rgba(122, 246, 255, 0.33);
      }

      #audioSigBtn:disabled {
        background: #1a2d2a;
        color: #4a6c59;
        box-shadow: none;
      }

      .toggle {
        ${createButtonStyle('toggle')}
      }

      #loopBtn.toggle[aria-pressed="true"] {
        background: #173a2a;
        border-color: #35d08e;
        box-shadow: var(--shadow-glow) rgba(53, 208, 142, 0.33), 
                    inset 0 0 0 1px rgba(53, 208, 142, 0.2);
      }

      #sigModeBtn.toggle[aria-pressed="true"] {
        background: #1f2a3f;
        border-color: #7aa2ff;
        color: #cfe0ff;
        box-shadow: var(--shadow-glow) rgba(122, 162, 255, 0.33), 
                    inset 0 0 0 1px rgba(122, 162, 255, 0.2);
      }

      .vol:has(input:disabled) {
        opacity: 0.5;
        pointer-events: none;
      }

      @media (max-width: 430px) {
        #controls {
          gap: 0.5rem;
          padding: 0.55rem 0.8rem;
        }
        
        button, select {
          padding: 0.42em 0.8em;
          font-size: 0.93rem;
        }
        
        .vol {
          min-width: 160px;
        }
        
        .vol input[type="range"] {
          width: 120px;
        }
        
        .seed input {
          width: 11ch;
        }
      }

      @media (max-width: 380px) {
        #controls {
          gap: 0.45rem;
          padding: 0.5rem 0.7rem;
        }
        
        button, select {
          padding: 0.4em 0.72em;
          font-size: 0.9rem;
        }
        
        .vol {
          min-width: 150px;
        }
        
        .vol input[type="range"] {
          width: 110px;
        }
        
        .seed label {
          display: none;
        }
      }
    `);

    this.setStyles(styles);

    this.shadowRoot.innerHTML = `
      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="latchBtn" class="toggle" aria-pressed="false">Latch: Off</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
        <div id="volWrap" class="vol" title="Master Volume">
          <label for="vol">Vol</label>
          <input id="vol" type="range" min="0" max="100" step="1" value="10" />
          <span id="volVal">10%</span>
        </div>
        <form id="seedForm" class="seed" autocomplete="off">
          <label for="seedInput">Seed</label>
          <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false" />
          <button id="seedSetBtn" type="submit">Set Seed</button>
        </form>
      </div>
    `;
  }

  _cacheRefs() {
    this._startBtn = this.$('#startBtn');
    this._muteBtn = this.$('#muteBtn');
    this._shapeSelect = this.$('#shapeSelect');
    this._seqBtn = this.$('#seqBtn');
    this._audioSigBtn = this.$('#audioSigBtn');
    this._latchBtn = this.$('#latchBtn');
    this._loopBtn = this.$('#loopBtn');
    this._sigModeBtn = this.$('#sigModeBtn');
    this._vol = this.$('#vol');
    this._volVal = this.$('#volVal');
    this._seedForm = this.$('#seedForm');
    this._seedInput = this.$('#seedInput');

    this._allControls = [
      this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn,
      this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol
    ];
  }

  _attachEvents() {
    // Button events
    this.addEventListeners(this._startBtn, [['click', () => this.emit('start-request')]]);
    this.addEventListeners(this._muteBtn, [['click', () => this.emit('mute-toggle')]]);
    this.addEventListeners(this._seqBtn, [['click', () => this.emit('toggle-sequencer')]]);
    this.addEventListeners(this._audioSigBtn, [['click', () => this.emit('audio-signature')]]);
    this.addEventListeners(this._latchBtn, [['click', () => this.emit('latch-toggle')]]);
    this.addEventListeners(this._loopBtn, [['click', () => this.emit('loop-toggle')]]);
    this.addEventListeners(this._sigModeBtn, [['click', () => this.emit('signature-mode-toggle')]]);

    // Select and input events
    this.addEventListeners(this._shapeSelect, [
      ['change', () => this.emit('shape-change', { shapeKey: this._shapeSelect.value })]
    ]);
    this.addEventListeners(this._vol, [
      ['input', () => this.emit('volume-change', { value: Number(this._vol.value) })]
    ]);
    this.addEventListeners(this._seedForm, [
      ['submit', (e) => {
        e.preventDefault();
        this.emit('seed-set', { value: (this._seedInput?.value || '').trim() });
      }]
    ]);
  }

  // === Public API ===

  setShapes(shapes) {
    if (!this._shapeSelect) return;
    
    const fragment = document.createDocumentFragment();
    for (const { value, label } of shapes ?? []) {
      const option = this.createElement('option', { value }, { textContent: label });
      fragment.appendChild(option);
    }
    this._shapeSelect.replaceChildren(fragment);
  }

  setSeed(seed) {
    if (this._seedInput) {
      this._seedInput.value = seed ?? '';
    }
  }

  disableAll(disabled) {
    setDisabledAll(this._allControls, disabled);
  }

  updateState(newState = {}) {
    super.updateState(newState, false); // Don't auto-render
    this._updateUI();
  }

  _updateUI() {
    const state = this.state;
    
    // Helper function for toggle buttons
    const setToggleText = (btn, on, onTxt, offTxt) => {
      setPressed(btn, on);
      setText(btn, on ? onTxt : offTxt);
    };

    // Audio signature button
    if (isBool(state.isAudioSignaturePlaying)) {
      setToggleText(
        this._audioSigBtn, 
        state.isAudioSignaturePlaying, 
        'Stop Signature', 
        'Audio Signature'
      );
    }

    // Power button
    if (isBool(state.isPlaying)) {
      setText(this._startBtn, state.isPlaying ? 'POWER OFF' : 'POWER ON');
      toggleClass(this._startBtn, 'power-on', state.isPlaying);
      toggleClass(this._startBtn, 'power-off', !state.isPlaying);
    }

    // Audio started state
    if (isBool(state.isAudioStarted)) {
      toggleClass(this._startBtn, 'ready', state.isAudioStarted);
      setDisabledAll([
        this._muteBtn, this._audioSigBtn, this._latchBtn, 
        this._loopBtn, this._sigModeBtn, this._vol
      ], !state.isAudioStarted);
    }

    // Mute button
    if (isBool(state.isMuted)) {
      setText(this._muteBtn, state.isMuted ? 'Unmute' : 'Mute');
      toggleClass(this._muteBtn, 'muted', state.isMuted);
    }

    // Shape selection
    if (state.shapeKey && this._shapeSelect) {
      this._shapeSelect.value = state.shapeKey;
    }

    // Sequencer button
    if (isBool(state.sequencerVisible)) {
      setText(this._seqBtn, state.sequencerVisible ? 'Hide Sequencer' : 'Create Sequence');
    }

    // Toggle buttons
    if (isBool(state.isLoopEnabled)) {
      setToggleText(this._loopBtn, state.isLoopEnabled, 'Loop: On', 'Loop: Off');
    }

    if (isBool(state.isSequenceSignatureMode)) {
      setToggleText(
        this._sigModeBtn, 
        state.isSequenceSignatureMode, 
        'Signature Mode: On', 
        'Signature Mode: Off'
      );
    }

    if (isBool(state.isLatchOn)) {
      setToggleText(this._latchBtn, state.isLatchOn, 'Latch: On', 'Latch: Off');
    }

    // Volume control
    if (isNum(state.volume)) {
      const percentage = pct(state.volume);
      if (this._vol) {
        this._vol.value = String(percentage);
      }
      if (this._volVal) {
        this._volVal.textContent = `${percentage}%`;
      }
    }

    // Emit resize event if sequencer visibility changed
    if (isBool(state.sequencerVisible)) {
      this.emit('controls-resize');
    }
  }
}

customElements.define('osc-controls', OscControls);

