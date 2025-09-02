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
  // Allow external updates like: <osc-app seed="foo" steps="16">
  static get observedAttributes() { return ['seed', 'steps']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // --- Constants ---------------------------------------------------------
    this.humKey = 'hum';
    this.humLabel = 'Power Hum';
    this.shapes = [
      'circle','square','butterfly','lissajous','spiro',
      'harmonograph','rose','hypocycloid','epicycloid'
    ];
    this.shapeLabels = Object.fromEntries(
      this.shapes.map(k => [k, k[0].toUpperCase() + k.slice(1)])
    );

    // Step count management constants
    this.VALID_STEPS = [8, 16, 32, 64];
    this.DEFAULT_STEPS = 8;

    // --- Mix in modules ----------------------------------------------------
    Object.assign(this, Utils(this), Presets(this), Audio(this), SignatureSequencer(this));

    // --- State -------------------------------------------------------------
    // Prefer <osc-app seed="…">, then <html data-seed="…">, else 'default'
    const attrSeed = (this.getAttribute('seed') || '').trim();
    const htmlSeed = (document.documentElement?.dataset?.seed || '').trim();
    const initialSeed = attrSeed || htmlSeed || 'default';
    
    // Initialize steps property (default 8, validate against VALID_STEPS)
    const attrSteps = parseInt(this.getAttribute('steps')) || this.DEFAULT_STEPS;
    this._steps = this.VALID_STEPS.includes(attrSteps) ? attrSteps : this.DEFAULT_STEPS;
    
    this.state = this.defaultState(initialSeed);

    // --- Bind handlers once ------------------------------------------------
    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange',
      '_onToggleSequencer','_onAudioSignature','_handleSeedSubmit',
      '_handleKeyDown','_handleKeyUp','_handleBlur',
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded',
      '_onSeqPlayStarted','_onSeqPlayStopped','_onSeqStepAdvance','_onSeqStepTimeChanged',
      '_onLoopToggle','_onSignatureModeToggle','_onVolumeChange','_onStepsRequested'
    ].forEach(fn => (this[fn] = this[fn].bind(this)));
  }

  // React to <osc-app seed="..." steps="..."> changes from HTML/JS
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'seed') {
      const next = (newVal || '').trim();
      if (!next || next === oldVal || next === this.state.seed) return;
      this.resetToSeed(next);
    } else if (name === 'steps') {
      const nextSteps = parseInt(newVal) || this.DEFAULT_STEPS;
      const validSteps = this.VALID_STEPS.includes(nextSteps) ? nextSteps : this.DEFAULT_STEPS;
      if (validSteps !== this._steps) {
        this.steps = validSteps;
      }
    }
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

      // Sequencer
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(this._steps || this.DEFAULT_STEPS).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null,    // (legacy, unused but kept for drop-in)
      sequenceStepIndex: 0,
      stepTime: 200,
      _seqFirstCycleStarted: false, // detect wrap for play-once

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

  // Steps property management -----------------------------------------------
  get steps() {
    return this._steps;
  }

  set steps(value) {
    const newSteps = this.VALID_STEPS.includes(value) ? value : this.DEFAULT_STEPS;
    if (newSteps === this._steps) return;
    
    const oldSteps = this._steps;
    this._steps = newSteps;
    
    // Update attribute to reflect the change
    this.setAttribute('steps', String(newSteps));
    
    // Resize sequence arrays and clamp indices
    this._resizeSequenceArrays(oldSteps, newSteps);
    
    // Broadcast change to child components
    this._syncChildSteps();
    
    // Emit steps-changed event
    this.dispatchEvent(new CustomEvent('steps-changed', {
      detail: { steps: newSteps, oldSteps },
      bubbles: true,
      composed: true
    }));
  }

  _resizeSequenceArrays(oldSteps, newSteps) {
    const s = this.state;
    
    if (newSteps > oldSteps) {
      // Expanding: pad with defaults
      while (s.sequence.length < newSteps) {
        s.sequence.push(null);
      }
    } else if (newSteps < oldSteps) {
      // Shrinking: truncate and clamp indices
      s.sequence = s.sequence.slice(0, newSteps);
      
      // Clamp current indices
      if (s.sequenceStepIndex >= newSteps) {
        s.sequenceStepIndex = 0;
      }
      if (s.currentRecordSlot >= newSteps) {
        s.currentRecordSlot = 0;
      }
      
      // Stop playback if we're shrinking during play
      if (s.sequencePlaying) {
        this.stopSequence();
      }
    }
  }

  _syncChildSteps() {
    // Update seq-app component
    if (this._sequencerComponent && this._sequencerComponent.updateState) {
      this._sequencerComponent.updateState({ steps: this._steps });
    }
    
    // Update controls to reflect current step count
    if (this._controls && this._controls.updateState) {
      this._controls.updateState({ steps: this._steps });
    }
    
    // Update signature sequencer
    if (this.setSteps) {
      this.setSteps(this._steps);
    }
  }

  _onStepsRequested(e) {
    const requestedSteps = e.detail?.steps;
    if (requestedSteps && this.VALID_STEPS.includes(requestedSteps)) {
      this.steps = requestedSteps;
    }
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
    this._controls.addEventListener('steps-requested', this._onStepsRequested);

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
    ].forEach(([t, h]) => this._sequencerComponent.addEventListener(t, h));

    // Populate shape selector
    const shapeOptions = [{ value: this.humKey, label: this.humLabel }]
      .concat(this.shapes.map(key => ({ value: key, label: this.shapeLabels[key] })));
    this._controls.setShapes(shapeOptions);
    
    // Initialize child components with current step count
    this._syncChildSteps();
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
    ].forEach(([t, h]) => this._sequencerComponent.removeEventListener(t, h));
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
    isAudioStarted = this.state.contextUnlocked,
    isPlaying = this.state.isPlaying,
    isMuted = this.state.Tone?.Destination?.mute,
    shapeKey = this.state.current,
    sequencerVisible = this.state.isSequencerMode,
    isLoopEnabled = this.state.isLoopEnabled,
    isSequenceSignatureMode = this.state.isSequenceSignatureMode,
    volume = this.state.volume
  } = {}) {
    this._controls.updateState?.({
      isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible,
      isLoopEnabled, isSequenceSignatureMode, volume
    });
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

    let shapeKey = null, idx = -1;
    if (e.key === '0') {
      shapeKey = this.humKey;
    } else {
      idx = e.key.charCodeAt(0) - 49; // '1' => 0
      if (idx >= 0 && idx < this.shapes.length) shapeKey = this.shapes[idx];
    }

    if (!shapeKey) return;
    const s = this.state;

    if (s.isSequencerMode && s.isRecording) {
      const recordValue = (idx >= 0) ? (idx + 1) : 0;
      this.recordStep(recordValue);
      if (s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(shapeKey);
        if (idx >= 0)
          this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey });
      }
      e.preventDefault();
      return;
    }

    this._updateControls({ shapeKey });
    this._onShapeChange({ detail: { shapeKey } });
    e.preventDefault();
  }
  _handleKeyUp(_) {}
  _handleBlur() {}

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
    // Map 0..1 to dB with a sensible floor; Tone.js uses dB on Destination.volume
    if (x <= 0) return -96;
    const db = 20 * Math.log10(x);
    return Math.max(-96, Math.min(0, db));
  }
}

customElements.define('osc-app', OscApp);
