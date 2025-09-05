// osc-app.js
// <osc-controls> + <osc-app> shell with iPhone layout fitter.
// Requires: engine.js (Engine + Signatures), scope-canvas.js, seq-app.js, osc-hotkeys.js

/**
 * ============================================================================
 * <osc-controls> Web Component  — with Latch toggle (responsive)
 * ============================================================================
 * - UI-only component that emits semantic events
 * - Master volume slider with live % readout
 * - Seed input + “Set Seed”
 * - Latch toggle reflects only isLatchOn (sequencer does not force latch)
 * - Compact CSS for small iPhones
 * ============================================================================
 */
class OscControls extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    // helpers
    const on = (el, type, handler, opts) => el.addEventListener(type, handler, opts);
    const dispatch = (type, detail) =>
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    const byId = id => root.getElementById(id);
    const setPressed = (btn, on) => btn.setAttribute('aria-pressed', String(!!on));
    const setText = (el, txt) => { el.textContent = txt; };

    root.innerHTML = /* html */ `
      <style>
        :host { display: block; }
        #controls {
          display: flex; gap: 1.1rem; align-items: center; flex-wrap: wrap; justify-content: center;
          padding: 0.7rem 1.2rem; background: rgba(255,255,255,0.07); border-radius: 9px;
          width: 95%; max-width: 980px; margin: 0.9rem auto 0; box-sizing: border-box;
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
        #latchBtn.toggle[aria-pressed="true"] {
          background: #1f3a26; border-color: #46ad6d; color: #9df5c2;
          box-shadow: 0 0 10px #46ad6d55, inset 0 0 0 1px #46ad6d33;
        }

        /* Compact controls on narrow phones so everything fits with the square canvas */
        @media (max-width: 430px) {
          #controls { gap: 0.5rem; padding: 0.55rem 0.8rem; }
          button, select { padding: 0.42em 0.8em; font-size: 0.93rem; }
          .vol { min-width: 160px; }
          .vol input[type="range"] { width: 120px; }
          .seed input { width: 11ch; }
        }
        @media (max-width: 380px) {
          #controls { gap: 0.45rem; padding: 0.5rem 0.7rem; }
          button, select { padding: 0.4em 0.72em; font-size: 0.9rem; }
          .vol { min-width: 150px; }
          .vol input[type="range"] { width: 110px; }
          .seed label { display:none; } /* optional width save */
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

    // element refs
    this._startBtn    = byId('startBtn');
    this._muteBtn     = byId('muteBtn');
    this._shapeSelect = byId('shapeSelect');
    this._seqBtn      = byId('seqBtn');
    this._audioSigBtn = byId('audioSigBtn');
    this._latchBtn    = byId('latchBtn');
    this._loopBtn     = byId('loopBtn');
    this._sigModeBtn  = byId('sigModeBtn');
    this._vol         = byId('vol');
    this._volVal      = byId('volVal');
    this._seedForm    = byId('seedForm');
    this._seedInput   = byId('seedInput');

    this._allControls = [
      this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn,
      this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol
    ];

    // events
    on(this._startBtn, 'click', () => dispatch('start-request'));
    on(this._muteBtn, 'click', () => dispatch('mute-toggle'));
    on(this._shapeSelect, 'change', () =>
      dispatch('shape-change', { shapeKey: this._shapeSelect.value })
    );
    on(this._seqBtn, 'click', () => dispatch('toggle-sequencer'));
    on(this._audioSigBtn, 'click', () => dispatch('audio-signature'));
    on(this._latchBtn, 'click', () => dispatch('latch-toggle'));
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

  setSeed(seed) { if (this._seedInput) this._seedInput.value = seed ?? ''; }

  disableAll(disabled) { for (const el of this._allControls) el.disabled = !!disabled; }

  /**
   * Accepts extra flags:
   * - isLoopEnabled, isSequenceSignatureMode, isAudioSignaturePlaying
   * - isSequencerMode (ref UI, but does NOT control latch)
   * - isLatchOn (the only thing that controls the Latch button)
   * - volume (0..1)
   */
  updateState({
    isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible,
    isLoopEnabled, isSequenceSignatureMode, isAudioSignaturePlaying,
    isSequencerMode, isLatchOn, volume
  } = {}) {
    const { setPressed, setText } = this._helpers;

    if (typeof isAudioSignaturePlaying === 'boolean') {
      const pressed = isAudioSignaturePlaying;
      setPressed(this._audioSigBtn, pressed);
      setText(this._audioSigBtn, pressed ? 'Stop Signature' : 'Audio Signature');
    }

    if (typeof isPlaying === 'boolean') {
      setText(this._startBtn, isPlaying ? 'POWER OFF' : 'POWER ON');
      this._startBtn.classList.toggle('power-on', isPlaying);
      this._startBtn.classList.toggle('power-off', !isPlaying);
    }

    if (typeof isAudioStarted === 'boolean') {
      this._startBtn.classList.toggle('ready', isAudioStarted);
      const enable = isAudioStarted;
      this._muteBtn.disabled = !enable;
      this._audioSigBtn.disabled = !enable;
      this._latchBtn.disabled = !enable;
      this._loopBtn.disabled = !enable;
      this._sigModeBtn.disabled = !enable;
      this._vol.disabled = !enable;
    }

    if (typeof isMuted === 'boolean') {
      setText(this._muteBtn, isMuted ? 'Unmute' : 'Mute');
      this._muteBtn.classList.toggle('muted', isMuted);
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

    // Latch reflects ONLY isLatchOn (sequencer mode does not force it)
    if (typeof isLatchOn === 'boolean') {
      const latched = !!isLatchOn;
      setPressed(this._latchBtn, latched);
      setText(this._latchBtn, latched ? 'Latch: On' : 'Latch: Off');
    }

    if (typeof volume === 'number' && !Number.isNaN(volume)) {
      const pct = Math.round(Math.max(0, Math.min(1, volume)) * 100);
      if (this._vol) this._vol.value = String(pct);
      if (this._volVal) this._volVal.textContent = `${pct}%`;
    }
  }
}

customElements.define('osc-controls', OscControls);

// ----------------------------------------------------------------------------

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
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded',
      '_onSeqPlayStarted','_onSeqPlayStopped','_onSeqStepAdvance','_onSeqStepTimeChanged',
      '_onSeqStepsChanged','_onLoopToggle','_onSignatureModeToggle','_onVolumeChange',
      '_onHotkeyPress','_onHotkeyRelease','_onHotkeyLoopToggle','_onHotkeySignatureToggle',
      '_onLatchToggle','_fitLayout','_onWindowResize'
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
      // Manual latch flag (keyup ignores when true)
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

    // Prepare the shape data for the dropdown
    const shapeOptions = this.shapes.map(shapeKey => ({
      value: shapeKey,
      label: this.shapeLabels[shapeKey] || shapeKey
    }));

    // *** ADD THIS: Prepend the "hum" option to the list ***
    shapeOptions.unshift({
      value: this.humKey,
      label: this.humLabel
    });

    // Populate the dropdown in the controls component
    this._controls.setShapes(shapeOptions);

    // Hotkeys (separate module osc-hotkeys.js)
    this._hotkeys = $('osc-hotkeys');
    this._hotkeys.setConfig({ humKey: this.humKey, shapes: this.shapes });
    main.appendChild(this._hotkeys);
    this._hotkeys.addEventListener('hk-press', this._onHotkeyPress);
    this._hotkeys.addEventListener('hk-release', this._onHotkeyRelease);
    this._hotkeys.addEventListener('hk-toggle-loop', this._onHotkeyLoopToggle);
    this._hotkeys.addEventListener('hk-toggle-signature', this._onHotkeySignatureToggle);

    this._sequencerComponent = $('seq-app'); this._sequencerComponent.style.display = 'none';
    this._loader = $('div', { id: 'loader', textContent: 'Initializing...' });

    main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
    wrapper.append(main);
    this.shadowRoot.append(
      $('style', { textContent: this._style() }), $('tone-loader'), wrapper
    );

    this._main.style.overflow = 'hidden';
    this._controls.setSeed?.(this.state.seed);

    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);

    // Control events
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._controls.addEventListener('audio-signature', this._onAudioSignature);
    this._controls.addEventListener('latch-toggle', this._onLatchToggle);
    this._controls.addEventListener('loop-toggle', this._onLoopToggle);
    this._controls.addEventListener('signature-mode-toggle', this._onSignatureModeToggle);
    this._controls.addEventListener('volume-change', this._onVolumeChange);
    this._controls.addEventListener('seed-set', this._handleSeedSubmit);

    // Loader text source (refit when it changes size)
    this._canvas.onIndicatorUpdate = (text) => {
      this._loader.textContent = (!this.state.isPlaying && !this.state.contextUnlocked) ? 'Initializing...' : text;
      this._fitLayout();
    };

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

    // Initial fits (custom elements render in stages)
    this._fitLayout();
    setTimeout(() => this._fitLayout(), 50);
    setTimeout(() => this._fitLayout(), 250);

    // Refit on viewport changes
    window.addEventListener('resize', this._onWindowResize, { passive: true });
    window.addEventListener('orientationchange', this._onWindowResize, { passive: true });

    // Watch controls/seq/loader for height changes and refit
    try {
      this._resizeObserver = new ResizeObserver(() => this._fitLayout());
      if (this._controls) this._resizeObserver.observe(this._controls);
      if (this._sequencerComponent) this._resizeObserver.observe(this._sequencerComponent);
      const loader = this.shadowRoot.getElementById('loader');
      if (loader) this._resizeObserver.observe(loader);
    } catch {}
  }

  disconnectedCallback() {
    // hotkeys
    this._hotkeys?.removeEventListener('hk-press', this._onHotkeyPress);
    this._hotkeys?.removeEventListener('hk-release', this._onHotkeyRelease);
    this._hotkeys?.removeEventListener('hk-toggle-loop', this._onHotkeyLoopToggle);
    this._hotkeys?.removeEventListener('hk-toggle-signature', this._onHotkeySignatureToggle);

    // sequencer events
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

    // observers + window listeners
    if (this._resizeObserver) { try { this._resizeObserver.disconnect(); } catch {} this._resizeObserver = null; }
    window.removeEventListener('resize', this._onWindowResize);
    window.removeEventListener('orientationchange', this._onWindowResize);
  }

  // Central UI update proxy — inject latch + sequencer flags so UI stays in sync.
  _updateControls(patch = {}) {
    const c = this._controls;
    if (!c) return;
    const enriched = {
      isLatchOn: this.state?.isLatchOn,
      isSequencerMode: this.state?.isSequencerMode,
      ...patch
    };
    if (typeof c.updateState === 'function') c.updateState(enriched);
    else if (typeof c.setState === 'function') c.setState(enriched);
    else if (typeof c.update === 'function') c.update(enriched);
    else {
      if ('shapeKey' in enriched) c.dataset.shape = String(enriched.shapeKey || '');
      if ('isAudioStarted' in enriched) c.dataset.ready = String(!!enriched.isAudioStarted);
      if ('isPlaying' in enriched) c.dataset.playing = String(!!enriched.isPlaying);
      if ('isMuted' in enriched) c.dataset.muted = String(!!enriched.isMuted);
      if ('sequencerVisible' in enriched) c.dataset.sequencer = String(!!enriched.sequencerVisible);
      if ('volume' in enriched) c.dataset.volume = String(enriched.volume);
    }
    // If sequencer visibility changed, refit to keep first 8 steps onscreen.
    if (Object.prototype.hasOwnProperty.call(patch, 'sequencerVisible')) this._fitLayout();
  }

  // --- Layout ----------------------------------------------------------------

  _style() {
    return `
      :host { display:block; width:100%; height:100%; }
      #appWrapper {
        display:flex; flex-direction:column; height:100dvh;
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      #main {
        width:100%; height:100%;
        display:flex; flex-direction:column;
        align-items:stretch;                 /* don’t let flex centering fight us */
        justify-content:flex-start;
        overflow:hidden; background:#000; gap:8px;
        padding-inline: env(safe-area-inset-left,0) env(safe-area-inset-right,0);
      }
      #canvasContainer{
        flex:0 0 auto;
        max-width:100%;
        position:relative;
        display:flex; flex-direction:column; justify-content:center; align-items:center;

        transform:none;
        margin-left:auto;
        margin-right:auto;

        aspect-ratio:1/1;
        box-sizing:border-box;
      }
      #loader{ font-size:.95rem; color:#aaa; min-height:1.3em; text-align:center; font-style:italic; margin:2px 0 8px; }
      @media (max-width:430px){ :host{font-size:15px;} }
      @media (max-width:380px){ :host{font-size:14px;} }
    `;
  }

  _safeInsetBottom() {
    try {
      const probe = document.createElement('div');
      probe.style.cssText = `
        position: fixed; bottom: 0; height: 0;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        visibility: hidden; pointer-events: none;`;
      document.documentElement.appendChild(probe);
      const pb = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
      probe.remove();
      return pb;
    } catch { return 0; }
  }

  _measureChromeHeights() {
    const sr = this.shadowRoot;
    if (!sr) return { controlsH: 0, loaderH: 0, seqH: 0 };
    const controls = sr.querySelector('osc-controls');
    const loader = sr.getElementById('loader');
    const seq = this._sequencerComponent;
    const controlsH = controls ? controls.getBoundingClientRect().height : 0;
    const loaderH = loader ? loader.getBoundingClientRect().height : 0;
    const seqVisible = seq && seq.style.display !== 'none';
    const seqH = (seq && seqVisible) ? seq.getBoundingClientRect().height : 0;
    return { controlsH, loaderH, seqH };
  }

  _fitLayout() {
    try {
      const cc = this._canvasContainer, sc = this._canvas, main = this._main;
      if (!cc || !sc || !main) return;

      const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth);
      const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight);

      const { controlsH, loaderH, seqH } = this._measureChromeHeights();
      const safeBottom = this._safeInsetBottom();
      const verticalPaddingAllowance = 10;

      const availableH = Math.max(1, vh - controlsH - loaderH - seqH - safeBottom - verticalPaddingAllowance);

      // ROUND to avoid 0.5px widths which make centering look off
      const side = Math.round(Math.max(1, Math.min(vw, availableH)));

      cc.style.width = side + 'px';
      cc.style.height = side + 'px';
      cc.style.maxWidth = '100%';
      cc.style.maxHeight = `calc(100dvh - ${controlsH + loaderH + seqH + safeBottom + verticalPaddingAllowance}px)`;
      cc.style.aspectRatio = '1 / 1';
      cc.style.boxSizing = 'border-box';

      // mirror the hard-centering in case inline styles ever override CSS
      cc.style.left = '';
      cc.style.transform = '';
      // cc.style.margin = '0';

      sc.style.width = '100%';
      sc.style.height = '100%';
      sc.style.aspectRatio = '1 / 1';
      sc.style.display = 'block';
      sc.style.touchAction = 'none';
    } catch (e) {
      console.warn('fitLayout failed', e);
    }
  }


  _onWindowResize() { this._fitLayout(); }

  // --- Tone ready ------------------------------------------------------------
  _onToneReady() {
    this.state.Tone = window.Tone;
    this.loadPresets(this.state.seed);
    this.bufferHumChain();
    const initialShape = this.shapes[(this._rng(this.state.seed)() * this.shapes.length) | 0];
    this._setCanvas({ preset: this.state.presets[initialShape], shapeKey: initialShape, mode: 'seed' });
    this.state.current = this.humKey;
    this._controls.disableAll?.(false);
    if (this.state.Tone?.Destination?.volume) {
      this.state.Tone.Destination.volume.value = this._linToDb(this.state.volume);
    }
    this._updateControls({
      isAudioStarted: true, isPlaying: false, isMuted: false,
      shapeKey: this.humKey, sequencerVisible: false, volume: this.state.volume
    });
    this._loader.textContent = 'Tone.js loaded. Click “POWER ON” or the image to begin.';
    this._fitLayout();
  }

  // --- Seed ------------------------------------------------------------------
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
    this.stopAudioAndDraw();
    this.state.seed = newSeed;
    this.setAttribute('seed', newSeed);
    if (document?.documentElement) document.documentElement.dataset.seed = newSeed;
    this.loadPresets(newSeed);
    this.resetState();
    this._loader.textContent = 'Seed updated. Click POWER ON.';
    this._fitLayout();
  }

  // --- Canvas click-to-trigger (grid mapping 0–9) and overlay ----------------
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

    const fakeDown = (key) => { if (this._hotkeys?.simulatePressKey) this._hotkeys.simulatePressKey(key); };
    const fakeUp   = (key) => { if (this._hotkeys?.simulateReleaseKey) this._hotkeys.simulateReleaseKey(key); };

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

  // --- Hotkey handlers -------------------------------------------------------
  _onHotkeyLoopToggle() { this._onLoopToggle(); }
  _onHotkeySignatureToggle() { if (this.state.isSequencerMode) this._onSignatureModeToggle(); }

  _onHotkeyPress({ detail }) {
    const s = this.state;
    const { key, idx, shapeKey } = detail || {};
    if (!shapeKey) return;

    if (s.isSequenceSignatureMode) {
      this._triggerSignatureFor(shapeKey, { loop: s.isLoopEnabled });
      return;
    }

    this._heldKeys.add(key);

    if (s.isSequencerMode) {
      if (s.isRecording) {
        this._recordedThisHold = this._recordedThisHold || new Set();
        if (!this._recordedThisHold.has(key)) {
          const recordValue = (idx >= 0) ? (idx + 1) : 0;
          this.recordStep(recordValue);
          this._recordedThisHold.add(key);
        }
      }
      if (s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(shapeKey);
        if (idx >= 0) this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey });
        s.current = shapeKey;
        if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey;
      }
      return; // latched via sequencer mode
    }

    // Live (non-sequencer) mode
    if (s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(shapeKey);
      if (idx >= 0) this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
      this._canvas.isPlaying = true;
      this._updateControls({ shapeKey });
      s.current = shapeKey;
      if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey;
    }
  }

  _onHotkeyRelease({ detail }) {
    const s = this.state;
    const { key } = detail || {};
    if (this._heldKeys?.has(key)) {
      this._heldKeys.delete(key);
      this._recordedThisHold?.delete?.(key);

      // Only manual latch sustains. Sequencer mode does NOT force sustain.
      if (!s.isLatchOn && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
        if (s._uiReturnShapeKey) this._updateControls({ shapeKey: s._uiReturnShapeKey });
        else this._updateControls();
      }
    }
  }


  // --- Latch toggle ----------------------------------------------------------
  _onLatchToggle() {
    this.state.isLatchOn = !this.state.isLatchOn;
    this._updateControls({});
    // If turning latch OFF while not in sequencer and no keys held, drop to hum.
    const s = this.state;
    if (!s.isLatchOn && !s.isSequencerMode && !this._heldKeys?.size && s.contextUnlocked && s.initialShapeBuffered) {
      this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
      this._canvas.isPlaying = false;
      this._updateControls({});
    }
  }

  // Volume slider already wired via Engine._onVolumeChange
}

customElements.define('osc-app', OscApp);
export { OscApp };
