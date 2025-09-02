// osc-app.js

/**
 * ============================================================================
 * osc-app.js — <osc-app> Component
 * ============================================================================
 *
 * PURPOSE
 * -------
 * Orchestration shell that renders the app, wires child components,
 * and maintains global state (audio, sequencer, seed, UI).
 *
 * NOTES
 * -----
 * - Seed ownership: the single source of truth is HTML
 *   • <html data-seed="..."> (global)
 *   • <osc-app seed="..."> (component attribute)
 *   The component prefers its own seed attribute, then falls back to
 *   <html data-seed>, else 'default'. Any user change via the seed form
 *   reflects back to BOTH the attribute and <html data-seed>.
 *
 * - Mixins: Utils, Presets, Audio, SignatureSequencer.
 * - Shapes: circle, square, butterfly, lissajous, spiro, harmonograph, rose,
 *   hypocycloid, epicycloid, plus hum ("Power Hum").
 * - defaultState(seed): tracks audio lifecycle, Tone context, chains, sequencer,
 *   loop toggle, signature mode, and presets keyed by seed.
 * - DOM: Left = instructions + seed form. Right = <scope-canvas>, <osc-controls>,
 *   <seq-app>, and loader.
 */

import { Utils } from './osc-utils.js';
import { Presets } from './osc-presets.js';
import { Audio } from './osc-audio.js';
import { SignatureSequencer } from './osc-signature-sequencer.js';

class OscApp extends HTMLElement {
  // Allow external updates like: <osc-app seed="foo">
  static get observedAttributes() { return ['seed']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Track currently-held keyboard keys for momentary play
    this._heldKeys = new Set();


    // --- Constants ---------------------------------------------------------
    this.humKey = 'hum';
    this.humLabel = 'Power Hum';
    this.shapes = [
      'circle','square','butterfly','lissajous','spiro',
      'harmonograph','rose','hypocycloid','epicycloid',
      'spiral','star','flower','wave','mandala','infinity','dna','tornado'
    ];
    this.shapeLabels = Object.fromEntries(
      this.shapes.map(k => [k, k[0].toUpperCase() + k.slice(1)])
    );

    // --- Mix in modules ----------------------------------------------------
    Object.assign(this, Utils(this), Presets(this), Audio(this), SignatureSequencer(this));

    // --- State -------------------------------------------------------------
    // Prefer <osc-app seed="…">, then <html data-seed="…">, else 'default'
    const attrSeed = (this.getAttribute('seed') || '').trim();
    const htmlSeed = (document.documentElement?.dataset?.seed || '').trim();
    const initialSeed = attrSeed || htmlSeed || 'default';
    this.state = this.defaultState(initialSeed);

    // --- Bind handlers once ------------------------------------------------
    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange',
      '_onToggleSequencer','_onAudioSignature','_handleSeedSubmit',
      '_handleKeyDown','_handleKeyUp','_handleBlur',
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded',
      '_onSeqPlayStarted','_onSeqPlayStopped','_onSeqStepAdvance','_onSeqStepTimeChanged',
      '_onSeqStepsChanged','_onLoopToggle','_onSignatureModeToggle','_onVolumeChange'
    ].forEach(fn => (this[fn] = this[fn].bind(this)));
  }

  // React to <osc-app seed="..."> changes from HTML/JS
  attributeChangedCallback(name, oldVal, newVal) {
    if (name !== 'seed') return;
    const next = (newVal || '').trim();
    if (!next || next === oldVal || next === this.state.seed) return;
    this.resetToSeed(next);
  }

  // Creates a fresh state object (used for construction and resets)
  defaultState(seed = 'default') {
    return {
      // UI / flow
      isPlaying: false,
      contextUnlocked: false,
      initialBufferingStarted: false,
      initialShapeBuffered: false,

      // Audio / synth graph
      Tone: null,
      chains: {},                  // keyed by shapeKey (and hum)
      current: null,               // current active shapeKey

      // Global loop toggle (applies to signatures and sequences)
      isLoopEnabled: false,

      // Master Volume (linear 0..1)
      volume: 0.2,

      // Sequencer - start with 8 steps, can be expanded
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(8).fill(null),
      velocities: Array(8).fill(1),
      sequencePlaying: false,
      sequenceIntervalId: null,    // (legacy, unused but kept for drop-in)
      sequenceStepIndex: 0,
      stepTime: 200,
      _seqFirstCycleStarted: false, // detect wrap for play-once
      sequenceSteps: 8,            // track current step count

      // Sequencer Signature Mode
      isSequenceSignatureMode: false,
      signatureSequencerRunning: false,

      // Audio Signature
      audioSignaturePlaying: false,
      audioSignatureTimer: null,
      audioSignatureStepIndex: 0,
      audioSignatureOnComplete: null,

      // Seed / presets
      seed,
      presets: {}
    };
  }

  // Lifecycle ---------------------------------------------------------------
  connectedCallback() {
    const $ = this._el.bind(this);

    // Layout: [aside | main]
    const wrapper = $('div', { id: 'appWrapper' });

    // LEFT: Instructions / seed
    const aside = $('aside', { id: 'instructions' });
    aside.innerHTML = `
      <div>
        <h2>How to Use</h2>
        <ol>
          <li><b>Numbers 1-9:</b><br/> Switch instantly between unique sound + visual shapes.</li>
          <li><b>Step Sequencer:</b>
            <ul style="margin:0 0 0 1em; padding:0; font-size:.98em;">
              <li>Click <b>Create Sequence</b> to open.</li>
              <li>Click a box to record steps (then press 1–9 or 0).</li>
              <li>Right-click a box to clear.</li>
              <li>Set <b>Step Time</b> for speed.</li>
              <li>Press <b>Play Sequence</b> to play (<i>L toggles Loop</i>).</li>
              <li><i>M toggles Sequencer Signature Mode.</i></li>
            </ul>
          </li>
          <li><b>Mix Sounds:</b> Change shapes while audio is on to layer effects.</li>
          <li><b>Toggle Audio:</b> Click the image or use <b>Start Audio</b>.</li>
        </ol>
      </div>
      <form id="seedForm" autocomplete="off" style="margin-top:auto;background:#1c1c1c;padding:1.1em 1em 0.9em 0.9em;border-radius:8px;border:1px solid #292929;">
        <label for="seedInput" style="font-size:0.97em;color:#ffecb3;margin-bottom:0.1em;font-weight:600;">Seed (deterministic):</label>
        <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"
          style="font-family:inherit;padding:0.35em 0.5em;border-radius:4px;border:1px solid #444;background:#232325;color:#ffecb3;font-size:1em;width:100%;margin-bottom:0.2em;letter-spacing:.05em;" />
        <button id="seedSetBtn" type="submit" style="padding:0.3em 1em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:0.97em;transition:background .18s;">Set Seed</button>
      </form>
    `;

    // RIGHT: Main interactive area
    const main = $('div', { id: 'main' });
    this._main = main;
    const canvasContainer = $('div', { id: 'canvasContainer' });
    this._canvasContainer = canvasContainer;
    this._canvas = $('scope-canvas');
    canvasContainer.appendChild(this._canvas);

    this._controls = $('osc-controls');

    // Sequencer component (hidden by default)
    this._sequencerComponent = $('seq-app');
    this._sequencerComponent.style.display = 'none';

    // Loader / status line
    this._loader = $('div', { id: 'loader', textContent: 'Initializing...' });

    // Compose DOM
    main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
    wrapper.append(aside, main);
    this.shadowRoot.append(
      $('style', { textContent: this._style() }),
      $('tone-loader'),
      wrapper
    );

    // Initial styles
    this._main.style.overflow = 'hidden';

    // --- Wire events -------------------------------------------------------
    this.shadowRoot.getElementById('seedInput').value = this.state.seed;
    this.shadowRoot.querySelector('tone-loader')
      .addEventListener('tone-ready', this._onToneReady);

    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._controls.addEventListener('audio-signature', this._onAudioSignature);
    this._controls.addEventListener('loop-toggle', this._onLoopToggle);
    this._controls.addEventListener('signature-mode-toggle', this._onSignatureModeToggle);
    this._controls.addEventListener('volume-change', this._onVolumeChange);

    this._canvas.onIndicatorUpdate = (text) => {
      this._loader.textContent = (!this.state.isPlaying && !this.state.contextUnlocked)
        ? 'Initializing...'
        : text;
    };

    this.shadowRoot.getElementById('seedForm')
      .addEventListener('submit', this._handleSeedSubmit);

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

    // Sequencer bridge events
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

    // Populate shape selector
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

  // Styles -----------------------------------------------------------------
  _style() {
    return `
      :host { display:block;width:100%;height:100%; }
      #appWrapper { display:grid;grid-template-columns:minmax(220px,340px) 1fr;grid-template-rows:100vh;gap:0;height:100%; }
      @media (max-width:900px){ #appWrapper{grid-template-columns:1fr;}}
      aside#instructions { background:linear-gradient(90deg,#181818 97%,#0000);color:#e1d9ce;font-size:1.07rem;min-width:210px;max-width:340px;height:100vh;border-right:2px solid #2229;line-height:1.65;box-sizing:border-box;display:flex;flex-direction:column;gap:1.4rem;padding:2.2rem 1.2rem 2.4rem 2.2rem;overflow-y:auto;}
      aside#instructions h2 { color:#f7c469;font-size:1.22rem;margin:0 0 0.95em 0;font-weight:bold;letter-spacing:.04em;}
      #main { width:100%;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:#000;}
      #canvasContainer { flex:1 1 0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;}
      #loader { font-size:.98rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin-top:.1em;}
    `;
  }

  // App control utilities ---------------------------------------------------
  _updateControls({
    isAudioStarted,
    isPlaying,
    isMuted,
    shapeKey, // NOTE: no default here — only update when explicitly provided
    sequencerVisible,
    isLoopEnabled,
    isSequenceSignatureMode,
    volume
  } = {}) {
    const payload = {};

    // Only include fields that were explicitly provided or we can safely derive.
    if (typeof isAudioStarted === 'boolean') payload.isAudioStarted = isAudioStarted;
    else payload.isAudioStarted = this.state.contextUnlocked;

    if (typeof isPlaying === 'boolean') payload.isPlaying = isPlaying;
    else payload.isPlaying = this.state.isPlaying;

    if (typeof isMuted === 'boolean') payload.isMuted = isMuted;
    else payload.isMuted = this.state.Tone?.Destination?.mute;

    // IMPORTANT: only pass shapeKey if caller explicitly set it
    if (typeof shapeKey === 'string') payload.shapeKey = shapeKey;

    if (typeof sequencerVisible === 'boolean') payload.sequencerVisible = sequencerVisible;
    else payload.sequencerVisible = this.state.isSequencerMode;

    if (typeof isLoopEnabled === 'boolean') payload.isLoopEnabled = isLoopEnabled;
    else payload.isLoopEnabled = this.state.isLoopEnabled;

    if (typeof isSequenceSignatureMode === 'boolean') payload.isSequenceSignatureMode = isSequenceSignatureMode;
    else payload.isSequenceSignatureMode = this.state.isSequenceSignatureMode;

    if (typeof volume === 'number') payload.volume = volume;
    else payload.volume = this.state.volume;

    this._controls.updateState?.(payload);
  }


  // Tone ready --------------------------------------------------------------
  _onToneReady() {
    this.state.Tone = window.Tone;
    this.loadPresets(this.state.seed);
    this.bufferHumChain();
    const initialShape =
      this.shapes[(this._rng(this.state.seed)() * this.shapes.length) | 0];
    this._setCanvas({ preset: this.state.presets[initialShape], shapeKey: initialShape, mode: 'seed' });
    this.state.current = this.humKey;
    this._controls.disableAll?.(false);

    // Apply initial master volume to Tone and sync UI
    if (this.state.Tone?.Destination?.volume) {
      this.state.Tone.Destination.volume.value = this._linToDb(this.state.volume);
    }

    this._updateControls({
      isAudioStarted: true, isPlaying: false, isMuted: false,
      shapeKey: this.humKey, sequencerVisible: false, volume: this.state.volume
    });
    this._loader.textContent = 'Tone.js loaded. Click “POWER ON” or the image to begin.';
  }

  // Seed / presets ----------------------------------------------------------
  _handleSeedSubmit(e) {
    e.preventDefault();
    const input = this.shadowRoot.getElementById('seedInput');
    const val = (input?.value?.trim()) || 'default';
    if (val === this.state.seed) return;
    this.resetToSeed(val);
  }

  // Single source of truth updates:
  // - update internal state
  // - mirror to <osc-app seed="...">
  // - mirror to <html data-seed="...">
  // - rebuild presets and reset UI
  resetToSeed(newSeed) {
    this.stopAudioAndDraw();

    // Update state
    this.state.seed = newSeed;

    // Reflect to HTML so other modules can read it directly
    this.setAttribute('seed', newSeed);
    if (document?.documentElement) {
      document.documentElement.dataset.seed = newSeed;
    }

    // Rebuild presets + reset UI
    this.loadPresets(newSeed);
    this.resetState();
    this._loader.textContent = 'Seed updated. Click POWER ON.';
  }

    // Keyboard ---------------------------------------------------------------
    _handleKeyDown(e) {
      if (!/INPUT|TEXTAREA/.test(e.target.tagName)) {
        if (e.key === 'l' || e.key === 'L') { this._onLoopToggle(); e.preventDefault(); return; }
        if (e.key === 'm' || e.key === 'M') {
          if (this.state.isSequencerMode) { this._onSignatureModeToggle(); e.preventDefault(); return; }
        }
      }
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;

      // Lazy init (drop-in safe)
      this._heldKeys = this._heldKeys || new Set();
      this._recordedThisHold = this._recordedThisHold || new Set();

      let shapeKey = null, idx = -1;
      if (e.key === '0') {
        shapeKey = this.humKey;
      } else {
        idx = e.key.charCodeAt(0) - 49; // '1' => 0
        if (idx >= 0 && idx < this.shapes.length) shapeKey = this.shapes[idx];
      }
      if (!shapeKey) return;

      const s = this.state;

      if (e.repeat) { e.preventDefault(); return; } // ignore auto-repeats
      this._heldKeys.add(e.key);

      // --- Sequencer mode: physical keys are momentary; recording is one-step-per-press ---
      if (s.isSequencerMode) {
        if (s.isRecording) {
          if (!this._recordedThisHold.has(e.key)) {
            const recordValue = (idx >= 0) ? (idx + 1) : 0;
            this.recordStep(recordValue);          // place once this press
            this._recordedThisHold.add(e.key);
          }
          // Live monitor while held (non-latched)
          if (s.contextUnlocked && s.initialShapeBuffered) {
            this.setActiveChain(shapeKey);
            if (idx >= 0)
              this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
            this._canvas.isPlaying = true;
            this._updateControls({ shapeKey });
          s.current = shapeKey;                    // NEW: reflect current selection for restore
          if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; // NEW: sticky UI target
        }
          e.preventDefault();
          return;
        }

        // Not recording: audition momentarily while key is down
        if (s.contextUnlocked && s.initialShapeBuffered) {
          this.setActiveChain(shapeKey);
          if (idx >= 0)
            this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
          this._canvas.isPlaying = true;
          this._updateControls({ shapeKey });
          s.current = shapeKey;                      // NEW
          if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; // NEW
        }
        e.preventDefault();
        return;
      }

      // --- Manual play (non-sequencer): momentary while key is held ---
      if (s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(shapeKey);
        if (idx >= 0) {
          this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
        }
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey });
        s.current = shapeKey;                        // NEW
        if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; // NEW
      }
      e.preventDefault();
    }

    _handleKeyUp(e) {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;

      this._heldKeys = this._heldKeys || new Set();
      this._recordedThisHold = this._recordedThisHold || new Set();

      this._heldKeys.delete(e.key);
      this._recordedThisHold.delete(e.key);

      const s = this.state;

      // Release audio, but KEEP the UI drop-down on the last selected shape
      if (this._heldKeys.size === 0 && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
        this._updateControls({}); // <= no shapeKey change; UI stays where user set it
      }
    }

    _handleBlur() {
      this._heldKeys = this._heldKeys || new Set();
      this._recordedThisHold = this._recordedThisHold || new Set();
      this._heldKeys.clear();
      this._recordedThisHold.clear();

      const s = this.state;
      if (s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
        this._updateControls({}); // <= don't flip UI to hum
      }
    }

    // Shape change (drop-down) ------------------------------------------------
    _onShapeChange(e) {
      const shapeKey = e?.detail?.shapeKey ?? this.humKey;
      const s = this.state;

      // Always reflect the selection in the UI/state
      this._updateControls({ shapeKey });
      // If you keep a selected shape in state, mirror it here:
      // s.selectedShapeKey = shapeKey;

      // Do NOT auto-start playback on drop-down changes.
      // Only update the active chain if something is already sounding:
      // - a key is currently held, or
      // - the sequencer is actively playing (fallback: canvas says it's playing).
      const keysHeld = (this._heldKeys && this._heldKeys.size > 0);
      const likelyPlaying = !!this._canvas?.isPlaying; // conservative fallback

      if ((keysHeld || likelyPlaying) && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(shapeKey);
        const idx = this.shapes.indexOf(shapeKey);
        if (idx >= 0) {
          this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
        }
        // Note: we don't toggle isPlaying here; we just adapt the timbre if already sounding.
      }
    }

    // Volume ------------------------------------------------------------------
    _onVolumeChange(e) {
      const pct = Math.max(0, Math.min(100, Number(e?.detail?.value ?? 10)));
      const lin = pct / 100;
      this.state.volume = lin;
      const Tone = this.state.Tone;
      if (Tone?.Destination?.volume) {
        Tone.Destination.volume.value = this._linToDb(lin);
      }
      // Do not auto-unmute; user controls mute separately
      this._updateControls({ volume: lin, isMuted: Tone?.Destination?.mute });
    }

    _linToDb(x) {
      if (x <= 0) return -96;
      const db = 20 * Math.log10(x);
      return Math.max(-96, Math.min(0, db));
    }
  }

  customElements.define('osc-app', OscApp);
