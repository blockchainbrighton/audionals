
// osc-app.js
// Single module containing both the <osc-app> shell and <osc-controls> UI.
// Imports Engine+Signatures from ./engine.js (Tone loader inlined there).


/**
 * ============================================================================
 * <osc-controls> Web Component  — with Latch toggle
 * ============================================================================
 * - UI-only component that emits semantic events
 * - DOM & styles fully encapsulated in Shadow DOM
 * - Master volume slider with live % readout
 * - Seed input + “Set Seed”
 * - NEW: Latch toggle that shows ON if (isLatchOn || isSequencerMode)
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
          width: 95%; max-width: 980px; margin: 1.1rem auto 0; box-sizing: border-box;
        }

        /* Seed group */
        .seed {
          display:flex; align-items:center; gap:.55rem; padding:.3rem .55rem;
          background:#23252b; border:1px solid #4e5668; border-radius:8px;
        }
        .seed label { font-size:.95rem; color:#ffe7b3; letter-spacing:.02em; }
        .seed input {
          font-family: inherit; font-size: .98rem; color:#ffecb3; background:#1c1d22;
          border:1px solid #3c3f48; border-radius:6px; padding:.38rem .55rem; width: 15ch;
          letter-spacing:.04em;
        }
        .seed button {
          padding: .42rem .8rem; border-radius: 6px; border: 1px solid #665; background: #221; color: #ffe0a3;
          cursor: pointer; font-family: inherit; font-size: .95rem; transition: background .18s;
        }
        .seed button:hover { background:#2c1f1f; }

        /* Volume */
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
        #startBtn:not(.ready) { opacity: 0.7; }
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
        /* Latch visual is same as .toggle true state */
        #latchBtn.toggle[aria-pressed="true"] {
          background: #1f3a26; border-color: #46ad6d; color: #9df5c2;
          box-shadow: 0 0 10px #46ad6d55, inset 0 0 0 1px #46ad6d33;
        }

        @media (max-width: 560px) {
          #controls { gap: 0.6rem; }
          button, select { padding: 0.48em 0.9em; font-size: 0.95rem; }
          .seed input { width: 12ch; }
        }
        button:disabled, select:disabled { opacity: 0.5; pointer-events: none; }
        .vol:has(input:disabled) { opacity: 0.5; pointer-events: none; }
      </style>

      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>

        <select id="shapeSelect"></select>

        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>

        <!-- NEW: Latch toggle -->
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

    // --- Element refs --------------------------------------------------------
    this._startBtn    = byId('startBtn');
    this._muteBtn     = byId('muteBtn');
    this._shapeSelect = byId('shapeSelect');
    this._seqBtn      = byId('seqBtn');
    this._audioSigBtn = byId('audioSigBtn');
    this._latchBtn    = byId('latchBtn');     // NEW
    this._loopBtn     = byId('loopBtn');
    this._sigModeBtn  = byId('sigModeBtn');
    this._vol         = byId('vol');
    this._volVal      = byId('volVal');
    this._seedForm    = byId('seedForm');
    this._seedInput   = byId('seedInput');

    // cache for bulk ops (seed stays editable)
    this._allControls = [
      this._startBtn,
      this._muteBtn,
      this._shapeSelect,
      this._seqBtn,
      this._audioSigBtn,
      this._latchBtn,     // NEW
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
    on(this._seqBtn, 'click', () => dispatch('toggle-sequencer'));
    on(this._audioSigBtn, 'click', () => dispatch('audio-signature'));
    on(this._latchBtn, 'click', () => dispatch('latch-toggle'));       // NEW
    on(this._loopBtn, 'click', () => dispatch('loop-toggle'));
    on(this._sigModeBtn, 'click', () => dispatch('signature-mode-toggle'));
    on(this._vol, 'input', () =>
      dispatch('volume-change', { value: Number(this._vol.value) })
    );
    on(this._seedForm, 'submit', (e) => {
      e.preventDefault();
      const value = (this._seedInput?.value || '').trim();
      dispatch('seed-set', { value });
    });

    this._helpers = { setPressed, setText };
  }

  setShapes(shapes) {
    const frag = document.createDocumentFragment();
    for (const { value, label } of shapes ?? []) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      frag.appendChild(opt);
    }
    this._shapeSelect.replaceChildren(frag);
  }

  setSeed(seed) {
    if (this._seedInput) this._seedInput.value = seed ?? '';
  }

  disableAll(disabled) {
    for (const el of this._allControls) el.disabled = !!disabled;
  }

  /**
   * Accepts extra flags:
   * - isLoopEnabled (boolean)
   * - isSequenceSignatureMode (boolean)
   * - isAudioSignaturePlaying (boolean)
   * - isSequencerMode (boolean)   // NEW (used to reflect latch)
   * - isLatchOn (boolean)         // NEW
   * - volume (number 0..1)
   */
  updateState({
    isAudioStarted,
    isPlaying,
    isMuted,
    shapeKey,
    sequencerVisible,
    isLoopEnabled,
    isSequenceSignatureMode,
    isAudioSignaturePlaying,
    isSequencerMode,     // NEW
    isLatchOn,           // NEW
    volume
  } = {}) {
    const { setPressed, setText } = this._helpers;

    // --- Audio Signature button pressed state/label ---
    if (typeof isAudioSignaturePlaying === 'boolean') {
      const pressed = isAudioSignaturePlaying;
      setPressed(this._audioSigBtn, pressed);
      setText(this._audioSigBtn, pressed ? 'Stop Signature' : 'Audio Signature');
    }

    // --- Power button label/state ---
    if (typeof isPlaying === 'boolean') {
      setText(this._startBtn, isPlaying ? 'POWER OFF' : 'POWER ON');
      this._startBtn.classList.toggle('power-on', isPlaying);
      this._startBtn.classList.toggle('power-off', !isPlaying);
    }

    // --- Audio initialized visual ---
    if (typeof isAudioStarted === 'boolean') {
      this._startBtn.classList.toggle('ready', isAudioStarted);
    }

    // --- Enable dependent controls only when audio is initialized ---
    if (typeof isAudioStarted === 'boolean') {
      const enable = isAudioStarted;
      this._muteBtn.disabled = !enable;
      this._audioSigBtn.disabled = !enable;
      this._latchBtn.disabled = !enable;   // NEW
      this._loopBtn.disabled = !enable;
      this._sigModeBtn.disabled = !enable;
      this._vol.disabled = !enable;
    }

    // --- Mute button ---
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

    // --- Latch toggle (reflects latch OR sequencer mode) ---
    if (typeof isSequencerMode === 'boolean' || typeof isLatchOn === 'boolean') {
      const latched = !!(isLatchOn || isSequencerMode);
      setPressed(this._latchBtn, latched);
      setText(this._latchBtn, latched ? 'Latch: On' : 'Latch: Off');
    }

    // --- Volume slider ---
    if (typeof volume === 'number' && !Number.isNaN(volume)) {
      const pct = Math.round(Math.max(0, Math.min(1, volume)) * 100);
      if (this._vol) this._vol.value = String(pct);
      if (this._volVal) this._volVal.textContent = `${pct}%`;
    }
  }
}

customElements.define('osc-controls', OscControls);


// osc-app.js
// <osc-app> shell – mixes in Engine + Signatures.
// Now includes a Latch switch that affects key-up behavior and stays in sync with Sequencer mode.

import { Engine } from './engine.js';
import { Signatures } from './engine.js';

class OscApp extends HTMLElement {
  static get observedAttributes() { return ['seed']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._heldKeys = new Set();
    this.humKey = 'hum'; this.humLabel = 'Power Hum';
    this.shapes = ['circle','square','butterfly','lissajous','spiro','harmonograph','rose','hypocycloid','epicycloid','spiral','star','flower','wave','mandala','infinity','dna','tornado'];
    this.shapeLabels = Object.fromEntries(this.shapes.map(k => [k, k[0].toUpperCase() + k.slice(1)]));

    Object.assign(this, Engine(this), Signatures(this));

    const attrSeed = (this.getAttribute('seed') || '').trim();
    const htmlSeed = (document.documentElement?.dataset?.seed || '').trim();
    const initialSeed = attrSeed || htmlSeed || 'default';
    this.state = this.defaultState(initialSeed);

    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange',
      '_onToggleSequencer','_onAudioSignature','_handleSeedSubmit',
      '_handleKeyDown','_handleKeyUp','_handleBlur',
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded',
      '_onSeqPlayStarted','_onSeqPlayStopped','_onSeqStepAdvance','_onSeqStepTimeChanged',
      '_onSeqStepsChanged','_onLoopToggle','_onSignatureModeToggle','_onVolumeChange',
      '_onLatchToggle' // NEW
    ].forEach(fn => (this[fn] = this[fn].bind(this)));
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name !== 'seed') return;
    const next = (newVal || '').trim();
    if (!next || next === this.state.seed) return;
    this.resetToSeed(next);
  }

  defaultState(seed = 'default') {
    return {
      isPlaying: false, contextUnlocked: false, initialBufferingStarted: false, initialShapeBuffered: false,
      Tone: null, chains: {}, current: null,
      isLoopEnabled: false, volume: 0.2,
      // Sequencer + recording
      isSequencerMode: false, isRecording: false, currentRecordSlot: -1,
      sequence: Array(8).fill(null), velocities: Array(8).fill(1), sequencePlaying: false, sequenceIntervalId: null,
      sequenceStepIndex: 0, stepTime: 200, _seqFirstCycleStarted: false, sequenceSteps: 8,
      // Signature modes
      isSequenceSignatureMode: false, signatureSequencerRunning: false,
      audioSignaturePlaying: false, audioSignatureTimer: null, audioSignatureStepIndex: 0, audioSignatureOnComplete: null,
      // NEW: Manual latch flag (key-up ignores when true)
      isLatchOn: false,
      // Misc
      seed, presets: {},
      uiHomeShapeKey: null,
      _transientOverride: false,
    };
  }

  connectedCallback() {
    const $ = this._el.bind(this);
    const wrapper = $('div', { id: 'appWrapper' });

    const main = $('div', { id: 'main' }); this._main = main;
    const canvasContainer = $('div', { id: 'canvasContainer' }); this._canvasContainer = canvasContainer;
    this._canvas = $('scope-canvas'); canvasContainer.appendChild(this._canvas);

    this._setupCanvasClickGrid();
    this._renderPowerOverlay();
    this._controls = $('osc-controls');
    this._sequencerComponent = $('seq-app'); this._sequencerComponent.style.display = 'none';
    this._loader = $('div', { id: 'loader', textContent: 'Initializing...' });

    main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
    wrapper.append(main);
    this.shadowRoot.append(
      $('style', { textContent: this._style() }), $('tone-loader'), wrapper
    );

    this._main.style.overflow = 'hidden';

    // Seed init
    this._controls.setSeed?.(this.state.seed);

    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);

    // Wire control events
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._controls.addEventListener('audio-signature', this._onAudioSignature);
    this._controls.addEventListener('latch-toggle', this._onLatchToggle); // NEW
    this._controls.addEventListener('loop-toggle', this._onLoopToggle);
    this._controls.addEventListener('signature-mode-toggle', this._onSignatureModeToggle);
    this._controls.addEventListener('volume-change', this._onVolumeChange);
    this._controls.addEventListener('seed-set', this._handleSeedSubmit);

    // Loader text source
    this._canvas.onIndicatorUpdate = (text) => {
      this._loader.textContent = (!this.state.isPlaying && !this.state.contextUnlocked) ? 'Initializing...' : text;
    };

    // Global key handlers
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

    // Sequencer events
    [
      ['seq-record-start', this._onSeqRecordStart],
      ['seq-step-cleared', this._onSeqStepCleared],
      ['seq-step-recorded', this._onSeqStepRecorded],
      ['seq-play-started', this._onSeqPlayStarted],
      ['seq-play-stopped', this._onSeqPlayStopped],
      ['seq-step-advance', this._onSeqStepAdvance],
      ['seq-step-time-changed', this._onSeqStepTimeChanged],
      ['seq-steps-changed', this._onSeqStepsChanged],
    ].forEach(([t, h]) => this._sequencerComponent.addEventListener(t, h));

    // Shapes list
    const shapeOptions = [{ value: this.humKey, label: this.humLabel }]
      .concat(this.shapes.map(key => ({ value: key, label: this.shapeLabels[key] })));
    this._controls.setShapes(shapeOptions);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);
    [
      ['seq-record-start', this._onSeqRecordStart],
      ['seq-step-cleared', this._onSeqStepCleared],
      ['seq-step-recorded', this._onSeqStepRecorded],
      ['seq-play-started', this._onSeqPlayStarted],
      ['seq-play-stopped', this._onSeqPlayStopped],
      ['seq-step-advance', this._onSeqStepAdvance],
      ['seq-step-time-changed', this._onSeqStepTimeChanged],
      ['seq-steps-changed', this._onSeqStepsChanged],
    ].forEach(([t, h]) => this._sequencerComponent?.removeEventListener(t, h));
  }

  // Central UI update proxy — now always injects latch + sequencer flags so UI stays in sync.
  _updateControls(patch = {}) {
    const c = this._controls;
    if (!c) return;
    const enriched = {
      isLatchOn: this.state?.isLatchOn,
      isSequencerMode: this.state?.isSequencerMode,
      ...patch
    };
    if (typeof c.updateState === 'function') return c.updateState(enriched);
    if (typeof c.setState === 'function') return c.setState(enriched);
    if (typeof c.update === 'function') return c.update(enriched);
    if ('shapeKey' in enriched) c.dataset.shape = String(enriched.shapeKey || '');
    if ('isAudioStarted' in enriched) c.dataset.ready = String(!!enriched.isAudioStarted);
    if ('isPlaying' in enriched) c.dataset.playing = String(!!enriched.isPlaying);
    if ('isMuted' in enriched) c.dataset.muted = String(!!enriched.isMuted);
    if ('sequencerVisible' in enriched) c.dataset.sequencer = String(!!enriched.sequencerVisible);
    if ('volume' in enriched) c.dataset.volume = String(enriched.volume);
  }

  _style() {
    return `
      :host { display:block;width:100%;height:100%; }
      #appWrapper { display:flex; flex-direction:column; height:100vh; }
      #main { width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:#000;}
      #canvasContainer { flex:1 1 0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;}
      #loader { font-size:.98rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin-top:.2em;margin-bottom:.8rem;}
    `;
  }

  _onToneReady() {
    this.state.Tone = window.Tone; this.loadPresets(this.state.seed); this.bufferHumChain();
    const initialShape = this.shapes[(this._rng(this.state.seed)() * this.shapes.length) | 0];
    this._setCanvas({ preset: this.state.presets[initialShape], shapeKey: initialShape, mode: 'seed' });
    this.state.current = this.humKey; this._controls.disableAll?.(false);
    if (this.state.Tone?.Destination?.volume) this.state.Tone.Destination.volume.value = this._linToDb(this.state.volume);
    this._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.humKey, sequencerVisible: false, volume: this.state.volume });
    this._loader.textContent = 'Tone.js loaded. Click “POWER ON” or the image to begin.';
  }

  _handleSeedSubmit(e) {
    const val =
      (e?.detail?.value && String(e.detail.value).trim()) ||
      (this.getAttribute('seed') || '').trim() ||
      (document.documentElement?.dataset?.seed || '').trim() ||
      'default';
    if (!val || val === this.state.seed) return;
    this.resetToSeed(val);
    this._controls.setSeed?.(val);
  }

  resetToSeed(newSeed) {
    this.stopAudioAndDraw(); this.state.seed = newSeed; this.setAttribute('seed', newSeed);
    if (document?.documentElement) document.documentElement.dataset.seed = newSeed;
    this.loadPresets(newSeed); this.resetState(); this._loader.textContent = 'Seed updated. Click POWER ON.';
  }

  // --- Canvas click-to-trigger (grid mapping 0–9) and overlay ---
  _renderPowerOverlay() {
    try {
      const s = this.state;
      const container = this._canvasContainer || this._main || this.shadowRoot?.host || document.body;
      if (!container) return;
      if (s?.contextUnlocked) { this._removePowerOverlay(); return; }
      if (this._powerOverlay) return;
      const overlay = document.createElement('div');
      overlay.id = 'powerOverlay';
      Object.assign(overlay.style, {
        position: 'absolute', inset: '0', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: '20', pointerEvents: 'auto',
        background: 'rgba(0,0,0,0.55)', userSelect: 'none', cursor: 'pointer',
        fontFamily: "'Courier New', monospace",
      });
      const inner = document.createElement('div');
      inner.textContent = 'Click to power on';
      Object.assign(inner.style, {
        padding: '14px 18px', border: '1px dashed rgba(255,255,255,0.65)',
        borderRadius: '8px', fontSize: '18px', letterSpacing: '0.06em',
        color: '#fff', background: 'rgba(0,0,0,0.25)',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      });
      overlay.appendChild(inner);
      const parent = this._canvasContainer || this._main;
      if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      (this._canvasContainer || this._main || container).appendChild(overlay);
      this._powerOverlay = overlay;
      const onClick = async (ev) => {
        ev?.preventDefault?.();
        try { await this.unlockAudioAndBufferInitial?.(); } catch (e) { console.error('Power-on unlock failed:', e); }
        finally {
          setTimeout(() => {
            if (this.state?.contextUnlocked) this._removePowerOverlay();
            else this._renderPowerOverlay();
          }, 0);
        }
      };
      overlay.addEventListener('click', onClick, { once: false });
    } catch (e) { console.error('overlay error', e); }
  }
  _removePowerOverlay() {
    if (this._powerOverlay?.parentNode) this._powerOverlay.parentNode.removeChild(this._powerOverlay);
    this._powerOverlay = null;
  }

  _setupCanvasClickGrid() {
    const el = this._canvas;
    if (!el || this._canvasClickGridSetup) return;
    this._canvasClickGridSetup = true;

    const gridKeyFromEvent = (ev) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, (ev.clientX ?? 0) - rect.left));
      const y = Math.max(0, Math.min(rect.height, (ev.clientY ?? 0) - rect.top));
      const cols = 5, rows = 2; // 10 cells total
      const col = Math.min(cols - 1, Math.max(0, Math.floor(x / (rect.width / cols))));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(y / (rect.height / rows))));
      const cell = row * cols + col; // 0..9
      return (cell === 9) ? '0' : String(cell + 1);
    };

    const fakeDown = (key) => {
      const e = { key, target: { tagName: 'DIV' }, preventDefault() {}, repeat: false };
      this._handleKeyDown(e);
    };
    const fakeUp = (key) => {
      const e = { key, target: { tagName: 'DIV' } };
      this._handleKeyUp(e);
    };

    this._onCanvasPointerDown = (ev) => {
      if (!this.state?.contextUnlocked) { try { this.unlockAudioAndBufferInitial?.(); } catch {} ev?.preventDefault?.(); return; }
      try {
        this._isCanvasPointerDown = true;
        try { ev.target?.setPointerCapture?.(ev.pointerId); } catch {}
        const key = gridKeyFromEvent(ev);
        if (key !== this._lastPointerDigitKey) {
          this._lastPointerDigitKey = key;
          fakeDown(key);
        }
      } catch (e) { console.error('canvas grid down error', e); }
    };

    this._onCanvasPointerMove = (ev) => {
      if (!this._isCanvasPointerDown) return;
      if (!this.state?.contextUnlocked) return;
      try {
        const key = gridKeyFromEvent(ev);
        if (key !== this._lastPointerDigitKey) {
          if (this._lastPointerDigitKey) fakeUp(this._lastPointerDigitKey);
          this._lastPointerDigitKey = key;
          fakeDown(key);
        }
      } catch (e) { console.error('canvas grid move error', e); }
    };

    this._onCanvasPointerUp = (ev) => {
      try {
        this._isCanvasPointerDown = false;
        try { ev?.target?.releasePointerCapture?.(ev.pointerId); } catch {}
      } catch {}
      if (!this._lastPointerDigitKey) return;
      const key = this._lastPointerDigitKey; this._lastPointerDigitKey = null;
      fakeUp(key);
    };

    this._onCanvasPointerCancel = () => {
      this._isCanvasPointerDown = false;
      if (this._lastPointerDigitKey) {
        const key = this._lastPointerDigitKey; this._lastPointerDigitKey = null;
        fakeUp(key);
      }
    };

    el.addEventListener('pointerdown', this._onCanvasPointerDown);
    el.addEventListener('pointermove', this._onCanvasPointerMove);
    el.addEventListener('pointercancel', this._onCanvasPointerCancel);
    el.addEventListener('pointerleave', this._onCanvasPointerUp);
    window.addEventListener('pointerup', this._onCanvasPointerUp);
  }

  // --- Latch toggle handler --------------------------------------------------
  _onLatchToggle() {
    this.state.isLatchOn = !this.state.isLatchOn;
    this._updateControls({}); // will inject isLatchOn + isSequencerMode
    // If turning latch OFF while not in sequencer and no keys held, drop to hum.
    const s = this.state;
    if (!s.isLatchOn && !s.isSequencerMode && !this._heldKeys?.size && s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
      this._canvas.isPlaying = false;
      this._updateControls({});
    }
  }

  // ---------------- Keyboard latch logic lives here -------------------------
  _handleKeyDown(e) {
    if (!/INPUT|TEXTAREA/.test(e.target.tagName)) {
      if (e.key === 'l' || e.key === 'L') { this._onLoopToggle(); e.preventDefault(); return; }
      if (e.key === 'm' || e.key === 'M') { if (this.state.isSequencerMode) { this._onSignatureModeToggle(); e.preventDefault(); return; } }
    }
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    this._heldKeys = this._heldKeys || new Set(); this._recordedThisHold = this._recordedThisHold || new Set();
    let shapeKey = null, idx = -1;
    if (e.key === '0') { shapeKey = this.humKey; }
    else { idx = e.key.charCodeAt(0) - 49; if (idx >= 0 && idx < this.shapes.length) shapeKey = this.shapes[idx]; }
    if (!shapeKey) return;
    if (this.state.isSequenceSignatureMode) { this._triggerSignatureFor(shapeKey, { loop: this.state.isLoopEnabled }); e.preventDefault(); return; }
    const s = this.state; if (e.repeat) { e.preventDefault(); return; } this._heldKeys.add(e.key);

    if (s.isSequencerMode) {
      if (s.isRecording) {
        if (!this._recordedThisHold.has(e.key)) { const recordValue = (idx >= 0) ? (idx + 1) : 0; this.recordStep(recordValue); this._recordedThisHold.add(e.key); }
        if (s.contextUnlocked && s.initialShapeBuffered) { this.setActiveChain(shapeKey); if (idx >= 0) this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' }); this._canvas.isPlaying = true; this._updateControls({ shapeKey }); s.current = shapeKey; if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; }
        e.preventDefault(); return;
      }
      if (s.contextUnlocked && s.initialShapeBuffered) { this.setActiveChain(shapeKey); if (idx >= 0) this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' }); this._canvas.isPlaying = true; this._updateControls({ shapeKey }); s.current = shapeKey; if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; }
      e.preventDefault(); return;
    }

    if (s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(shapeKey);
      if (idx >= 0) { this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' }); }
      this._canvas.isPlaying = true; this._updateControls({ shapeKey }); s.current = shapeKey;
      if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey;
    }
  }

  _handleKeyUp(e) {
    const s = this.state;
    if (this._heldKeys?.has(e.key)) {
      this._heldKeys.delete(e.key);
      this._recordedThisHold?.delete?.(e.key);
      // NOTE: now respect Latch OR Sequencer mode (either keeps sound on)
      if (!(s.isSequencerMode || s.isLatchOn) && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
        if (s._uiReturnShapeKey) this._updateControls({ shapeKey: s._uiReturnShapeKey }); else this._updateControls({});
      }
    }
  }
  _handleBlur() { this._heldKeys?.clear?.(); this._recordedThisHold?.clear?.(); }

  // Volume slider already wired via Engine._onVolumeChange
}

customElements.define('osc-app', OscApp);
export { OscApp };

