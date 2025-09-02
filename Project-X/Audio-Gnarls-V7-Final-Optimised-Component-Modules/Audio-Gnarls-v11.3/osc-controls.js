/**
 * ============================================================================
 * <osc-controls> Web Component (Refactor + Volume Slider)
 * ============================================================================
 * Behavior, identifiers, and public API preserved.
 * - UI-only component that emits semantic events
 * - DOM & styles fully encapsulated in Shadow DOM
 * - Helpers reduce duplication; code is lint-clean and concise
 * - NEW: Master volume slider with live % readout
 * ============================================================================
 */

class OscControls extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    // --- Helpers (scoped to instance) ---------------------------------------
    const on = (el, type, handler, opts) => el.addEventListener(type, handler, opts);
    const dispatch = (type, detail) =>
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    const byId = id => root.getElementById(id);
    const setPressed = (btn, on) => btn.setAttribute('aria-pressed', String(!!on));
    const setText = (el, txt) => { el.textContent = txt; };

    // --- Markup + Styles -----------------------------------------------------
    root.innerHTML = /* html */ `
      <style>
        :host { display: block; }
        #controls {
          display: flex; gap: 1.1rem; align-items: center; flex-wrap: wrap; justify-content: center;
          padding: 0.7rem 1.2rem; background: rgba(255,255,255,0.07); border-radius: 9px;
          width: 95%; max-width: 880px; margin: 1.1rem auto 0; box-sizing: border-box;
        }
        .vol { display:flex; align-items:center; gap:.55rem; min-width: 190px; padding: .3rem .55rem; background:#23252b; border:1px solid #4e5668; border-radius:8px; }
        .vol label { font-size:.95rem; color:#cfe3ff; letter-spacing:.02em; }
        .vol input[type="range"] {
          -webkit-appearance: none; appearance: none; width: 140px; height: 4px;
          background: #3a3f4a; border-radius: 999px; outline: none;
        }
        .vol input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius:50%;
          background:#46ad6d; border:1px solid #2b6b44; box-shadow: 0 0 6px #46ad6d55; cursor:pointer;
        }
        .vol input[type="range"]::-moz-range-thumb {
          width:14px; height:14px; border-radius:50%; background:#46ad6d; border:1px solid #2b6b44; cursor:pointer;
        }
        .vol #volVal { font-size:.92rem; color:#9df5c2; min-width: 3.5ch; text-align: right; }

        button, select {
          padding: 0.53em 1.17em; border-radius: 6px; border: 1px solid #555; background: #242; color: #fff;
          font-size: 1rem; cursor: pointer; font-family: inherit; font-weight: 500;
          transition: background .19s, color .19s, box-shadow .19s, transform .06s ease;
          box-shadow: 0 0 0px #0000; will-change: transform;
        }
        button:active { transform: translateY(1px); }
        button:focus { outline: 2px solid #7af6ff; outline-offset: 1px; }
        button:hover { background: #454; }
        #startBtn.power-off {
          background: #451015; color: #e97c90; border-color: #89232a;
          box-shadow: 0 0 4px #ff505011, 0 0 0px #0000; text-shadow: none; filter: brightness(0.95);
        }
        #startBtn.power-on {
          background: #ff2a39; color: #fff; border-color: #ff4e6a;
          box-shadow: 0 0 18px 5px #ff2a3999, 0 0 4px #ff748499;
          text-shadow: 0 1px 3px #8d2025cc, 0 0 10px #fff7; filter: brightness(1.10) saturate(1.2);
        }
        #startBtn:not(.ready) {
          opacity: 0.7;
        }
        #muteBtn.muted {
          background: #a51427; color: #fff; border-color: #ff506e;
          box-shadow: 0 0 12px #ff506e66; text-shadow: 0 1px 2px #320a0b;
        }
        #audioSigBtn {
          background: #2a4d3a; color: #7af6ff; border-color: #4a7c59; box-shadow: 0 0 8px #7af6ff33;
        }
        #audioSigBtn:hover { background: #3a5d4a; box-shadow: 0 0 12px #7af6ff55; }
        #audioSigBtn:disabled { background: #1a2d2a; color: #4a6c59; box-shadow: none; }

        .toggle { position: relative; background: #23252b; border-color: #4e5668; color: #cfe3ff;
          box-shadow: inset 0 -1px 0 #00000044, 0 0 0px #0000; }
        .toggle:hover { background: #2b2f38; }
        .toggle[aria-pressed="true"] {
          background: #1f3a26; color: #9df5c2; border-color: #46ad6d;
          box-shadow: 0 0 10px #46ad6d55, inset 0 0 0 1px #46ad6d33; text-shadow: 0 1px 2px #0b1a10aa;
        }
        #loopBtn.toggle[aria-pressed="true"] {
          background: #173a2a; border-color: #35d08e; box-shadow: 0 0 12px #35d08e55, inset 0 0 0 1px #35d08e33;
        }
        #sigModeBtn.toggle[aria-pressed="true"] {
          background: #1f2a3f; border-color: #7aa2ff; color: #cfe0ff;
          box-shadow: 0 0 12px #7aa2ff55, inset 0 0 0 1px #7aa2ff33;
        }

        @media (max-width: 560px) {
          #controls { gap: 0.6rem; }
          button, select { padding: 0.48em 0.9em; font-size: 0.95rem; }
        }
        button:disabled, select:disabled { opacity: 0.5; pointer-events: none; }
        .vol:has(input:disabled) { opacity: 0.5; pointer-events: none; }
      </style>

      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <select id="stepsSelect" title="Step Count">
          <option value="8">8 Steps</option>
          <option value="16">16 Steps</option>
          <option value="32">32 Steps</option>
          <option value="64">64 Steps</option>
        </select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
        <div id="volWrap" class="vol" title="Master Volume">
          <label for="vol">Vol</label>
          <input id="vol" type="range" min="0" max="100" step="1" value="10" />
          <span id="volVal">10%</span>
        </div>
      </div>
    `;

    // --- Element refs (keep identifiers) ------------------------------------
    this._startBtn    = byId('startBtn');
    this._muteBtn     = byId('muteBtn');
    this._shapeSelect = byId('shapeSelect');
    this._stepsSelect = byId('stepsSelect');
    this._seqBtn      = byId('seqBtn');
    this._audioSigBtn = byId('audioSigBtn');
    this._loopBtn     = byId('loopBtn');
    this._sigModeBtn  = byId('sigModeBtn');
    this._vol         = byId('vol');
    this._volVal      = byId('volVal');

    // cache for bulk ops
    this._allControls = [
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._stepsSelect,
      this._seqBtn,
      this._audioSigBtn,
      this._loopBtn,
      this._sigModeBtn,
      this._vol
    ];

    // --- Events (semantic outward only) -------------------------------------
    on(this._startBtn, 'click', () => dispatch('start-request'));
    on(this._muteBtn, 'click', () => dispatch('mute-toggle'));
    on(this._shapeSelect, 'change', () =>
      dispatch('shape-change', { shapeKey: this._shapeSelect.value })
    );
    on(this._stepsSelect, 'change', () =>
      dispatch('steps-requested', { steps: Number(this._stepsSelect.value) })
    );
    on(this._seqBtn, 'click', () => dispatch('toggle-sequencer'));
    on(this._audioSigBtn, 'click', () => dispatch('audio-signature'));
    on(this._loopBtn, 'click', () => dispatch('loop-toggle'));
    on(this._sigModeBtn, 'click', () => dispatch('signature-mode-toggle'));
    on(this._vol, 'input', () =>
      dispatch('volume-change', { value: Number(this._vol.value) })
    );

    // expose helpers for use in updateState without re-alloc
    this._helpers = { setPressed, setText };
  }

  setShapes(shapes) {
    // Keep same API; efficient DOM updates
    const frag = document.createDocumentFragment();
    for (const { value, label } of shapes ?? []) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      frag.appendChild(opt);
    }
    this._shapeSelect.replaceChildren(frag);
  }

  disableAll(disabled) {
    for (const el of this._allControls) el.disabled = !!disabled;
  }

  /**
   * Accepts extra flags:
   * - isLoopEnabled (boolean)
   * - isSequenceSignatureMode (boolean)
   * - volume (number 0..1)
   * - steps (number)
   */
  updateState({
    isAudioStarted,
    isPlaying,
    isMuted,
    shapeKey,
    sequencerVisible,
    isLoopEnabled,
    isSequenceSignatureMode,
    volume,
    steps
  } = {}) {
    const { setPressed, setText } = this._helpers;

    // --- Always allow toggling power (don't disable startBtn) ---
    if (typeof isPlaying === 'boolean') {
      setText(this._startBtn, isPlaying ? 'POWER OFF' : 'POWER ON');
      this._startBtn.classList.toggle('power-on', isPlaying);
      this._startBtn.classList.toggle('power-off', !isPlaying);
    }

    // --- Visual feedback for audio initialization status ---
    if (typeof isAudioStarted === 'boolean') {
      this._startBtn.classList.toggle('ready', isAudioStarted);
    }

    // --- Enable/disable dependent controls only when audio is initialized ---
    if (typeof isAudioStarted === 'boolean') {
      const enable = isAudioStarted;
      this._muteBtn.disabled = !enable;
      this._audioSigBtn.disabled = !enable;
      this._loopBtn.disabled = !enable;
      this._sigModeBtn.disabled = !enable;
      this._vol.disabled = !enable;
    }

    // --- Update mute button text/class ---
    if (typeof isMuted === 'boolean') {
      setText(this._muteBtn, isMuted ? 'Unmute' : 'Mute');
      this._muteBtn.classList.toggle('muted', isMuted);
    }

    // --- Shape selector ---
    if (shapeKey) this._shapeSelect.value = shapeKey;

    // --- Sequencer button ---
    if (typeof sequencerVisible === 'boolean') {
      setText(this._seqBtn, sequencerVisible ? 'Hide Sequencer' : 'Create Sequence');
    }

    // --- Loop toggle ---
    if (typeof isLoopEnabled === 'boolean') {
      setPressed(this._loopBtn, isLoopEnabled);
      setText(this._loopBtn, isLoopEnabled ? 'Loop: On' : 'Loop: Off');
    }

    // --- Signature mode toggle ---
    if (typeof isSequenceSignatureMode === 'boolean') {
      setPressed(this._sigModeBtn, isSequenceSignatureMode);
      setText(this._sigModeBtn, isSequenceSignatureMode ? 'Signature Mode: On' : 'Signature Mode: Off');
    }

    // --- Volume slider ---
    if (typeof volume === 'number' && !Number.isNaN(volume)) {
      const pct = Math.round(Math.max(0, Math.min(1, volume)) * 100);
      if (this._vol) this._vol.value = String(pct);
      if (this._volVal) this._volVal.textContent = `${pct}%`;
    }

    // --- Steps selector ---
    if (typeof steps === 'number' && [8, 16, 32, 64].includes(steps)) {
      if (this._stepsSelect) this._stepsSelect.value = String(steps);
    }
  }
}

customElements.define('osc-controls', OscControls);