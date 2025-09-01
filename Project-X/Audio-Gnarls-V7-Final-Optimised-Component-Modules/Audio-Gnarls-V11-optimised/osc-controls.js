/**
 * ============================================================================
 * <osc-controls> Web Component (Refactor)
 * ============================================================================
 * Behavior, identifiers, and public API preserved.
 * - UI-only component that emits semantic events
 * - DOM & styles fully encapsulated in Shadow DOM
 * - Helpers reduce duplication; code is lint-clean and concise
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
      </style>

      <div id="controls">
        <button id="startBtn">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
      </div>
    `;

    // --- Element refs (keep identifiers) ------------------------------------
    this._startBtn    = byId('startBtn');
    this._muteBtn     = byId('muteBtn');
    this._shapeSelect = byId('shapeSelect');
    this._seqBtn      = byId('seqBtn');
    this._audioSigBtn = byId('audioSigBtn');
    this._loopBtn     = byId('loopBtn');
    this._sigModeBtn  = byId('sigModeBtn');

    // cache for bulk ops
    this._allControls = [
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._seqBtn,
      this._audioSigBtn,
      this._loopBtn,
      this._sigModeBtn
    ];

    // --- Events (semantic outward only) -------------------------------------
    on(this._startBtn, 'click', () => dispatch('start-request'));
    on(this._muteBtn, 'click', () => dispatch('mute-toggle'));
    on(this._shapeSelect, 'change', () =>
      dispatch('shape-change', { shapeKey: this._shapeSelect.value })
    );
    on(this._seqBtn, 'click', () => dispatch('toggle-sequencer'));
    on(this._audioSigBtn, 'click', () => dispatch('audio-signature'));
    on(this._loopBtn, 'click', () => dispatch('loop-toggle'));
    on(this._sigModeBtn, 'click', () => dispatch('signature-mode-toggle'));

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
   */
  updateState({
    isAudioStarted,
    isPlaying,
    isMuted,
    shapeKey,
    sequencerVisible,
    isLoopEnabled,
    isSequenceSignatureMode
  } = {}) {
    const { setPressed, setText } = this._helpers;

    if (typeof isAudioStarted === 'boolean') {
      const dis = !isAudioStarted;
      // start/mute/audioSig/loop/signatureMode follow audio init
      this._startBtn.disabled = dis;
      this._muteBtn.disabled = dis;
      this._audioSigBtn.disabled = dis;
      this._loopBtn.disabled = dis;
      this._sigModeBtn.disabled = dis;
    }

    if (typeof isPlaying === 'boolean') {
      setText(this._startBtn, isPlaying ? 'POWER OFF' : 'POWER ON');
      this._startBtn.classList.toggle('power-on', !!isPlaying);
      this._startBtn.classList.toggle('power-off', !isPlaying);
    }

    if (typeof isMuted === 'boolean') {
      setText(this._muteBtn, isMuted ? 'Unmute' : 'Mute');
      this._muteBtn.classList.toggle('muted', !!isMuted);
    }

    if (shapeKey) this._shapeSelect.value = shapeKey;

    if (typeof sequencerVisible === 'boolean') {
      setText(this._seqBtn, sequencerVisible ? 'Hide Sequencer' : 'Create Sequence');
    }

    if (typeof isLoopEnabled === 'boolean') {
      setPressed(this._loopBtn, isLoopEnabled);
      setText(this._loopBtn, isLoopEnabled ? 'Loop: On' : 'Loop: Off');
    }

    if (typeof isSequenceSignatureMode === 'boolean') {
      setPressed(this._sigModeBtn, isSequenceSignatureMode);
      setText(this._sigModeBtn, isSequenceSignatureMode ? 'Signature Mode: On' : 'Signature Mode: Off');
    }
  }
}

customElements.define('osc-controls', OscControls);
