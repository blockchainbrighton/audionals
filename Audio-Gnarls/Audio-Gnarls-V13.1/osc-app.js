// osc-app.js
// Same <osc-app> custom element, but imports just TWO modules:
// 1) Engine (Utils + Presets + Audio) and 2) Signatures (signature + sequencer)

import { Engine } from './osc-core.js';
import { Signatures } from './osc-signatures.js';

class OscApp extends HTMLElement {
  static get observedAttributes() { return ['seed']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._heldKeys = new Set();
    this.humKey = 'hum'; this.humLabel = 'Power Hum';
    this.shapes = ['circle','square','butterfly','lissajous','spiro','harmonograph','rose','hypocycloid','epicycloid','spiral','star','flower','wave','mandala','infinity','dna','tornado'];
    this.shapeLabels = Object.fromEntries(this.shapes.map(k => [k, k[0].toUpperCase() + k.slice(1)]));

    // Mix in just two cohesive modules now
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
      '_onSeqStepsChanged','_onLoopToggle','_onSignatureModeToggle','_onVolumeChange'
    ].forEach(fn => (this[fn] = this[fn].bind(this)));
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name !== 'seed') return; const next = (newVal || '').trim();
    if (!next || next === this.state.seed) return; this.resetToSeed(next);
  }

  defaultState(seed = 'default') {
    return {
      isPlaying: false, contextUnlocked: false, initialBufferingStarted: false, initialShapeBuffered: false,
      Tone: null, chains: {}, current: null,
      isLoopEnabled: false, volume: 0.2,
      isSequencerMode: false, isRecording: false, currentRecordSlot: -1,
      sequence: Array(8).fill(null), velocities: Array(8).fill(1), sequencePlaying: false, sequenceIntervalId: null,
      sequenceStepIndex: 0, stepTime: 200, _seqFirstCycleStarted: false, sequenceSteps: 8,
      isSequenceSignatureMode: false, signatureSequencerRunning: false,
      audioSignaturePlaying: false, audioSignatureTimer: null, audioSignatureStepIndex: 0, audioSignatureOnComplete: null,
      seed, presets: {}
    };
  }

  connectedCallback() {
    const $ = this._el.bind(this);
    const wrapper = $('div', { id: 'appWrapper' });
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

    const main = $('div', { id: 'main' }); this._main = main;
    const canvasContainer = $('div', { id: 'canvasContainer' }); this._canvasContainer = canvasContainer;
    this._canvas = $('scope-canvas'); canvasContainer.appendChild(this._canvas);
    this._controls = $('osc-controls');
    this._sequencerComponent = $('seq-app'); this._sequencerComponent.style.display = 'none';
    this._loader = $('div', { id: 'loader', textContent: 'Initializing...' });

    main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
    wrapper.append(aside, main);
    this.shadowRoot.append(
      $('style', { textContent: this._style() }), $('tone-loader'), wrapper
    );

    this._main.style.overflow = 'hidden';

    this.shadowRoot.getElementById('seedInput').value = this.state.seed;
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);

    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._controls.addEventListener('audio-signature', this._onAudioSignature);
    this._controls.addEventListener('loop-toggle', this._onLoopToggle);
    this._controls.addEventListener('signature-mode-toggle', this._onSignatureModeToggle);
    this._controls.addEventListener('volume-change', this._onVolumeChange);

    this._canvas.onIndicatorUpdate = (text) => {
      this._loader.textContent = (!this.state.isPlaying && !this.state.contextUnlocked) ? 'Initializing...' : text;
    };

    this.shadowRoot.getElementById('seedForm').addEventListener('submit', this._handleSeedSubmit);

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

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

  // NEW: central UI update proxy so Engine/Signatures can call app._updateControls(...)
  _updateControls(patch = {}) {
    const c = this._controls;
    if (!c) return;
    if (typeof c.updateState === 'function') return c.updateState(patch);
    if (typeof c.setState === 'function') return c.setState(patch);
    if (typeof c.update === 'function') return c.update(patch);
    if ('shapeKey' in patch) c.dataset.shape = String(patch.shapeKey || '');
    if ('isAudioStarted' in patch) c.dataset.ready = String(!!patch.isAudioStarted);
    if ('isPlaying' in patch) c.dataset.playing = String(!!patch.isPlaying);
    if ('isMuted' in patch) c.dataset.muted = String(!!patch.isMuted);
    if ('sequencerVisible' in patch) c.dataset.sequencer = String(!!patch.sequencerVisible);
    if ('volume' in patch) c.dataset.volume = String(patch.volume);
  }

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
    e.preventDefault(); const input = this.shadowRoot.getElementById('seedInput');
    const val = (input?.value?.trim()) || 'default'; if (val === this.state.seed) return; this.resetToSeed(val);
  }

  resetToSeed(newSeed) {
    this.stopAudioAndDraw(); this.state.seed = newSeed; this.setAttribute('seed', newSeed);
    if (document?.documentElement) document.documentElement.dataset.seed = newSeed;
    this.loadPresets(newSeed); this.resetState(); this._loader.textContent = 'Seed updated. Click POWER ON.';
  }

  // --- Keyboard (same behavior as before) ---
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
    if (s.contextUnlocked && s.initialShapeBuffered) { this.setActiveChain(shapeKey); if (idx >= 0) { this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' }); } this._canvas.isPlaying = true; this._updateControls({ shapeKey }); s.current = shapeKey; if (shapeKey !== this.humKey) s._uiReturnShapeKey = shapeKey; }
  }

  _handleKeyUp(e) {
    const s = this.state; if (this._heldKeys?.has(e.key)) { this._heldKeys.delete(e.key); this._recordedThisHold?.delete?.(e.key);
      if (!s.isSequencerMode && s.contextUnlocked && s.initialShapeBuffered) { this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false }); this._canvas.isPlaying = false; if (s._uiReturnShapeKey) this._updateControls({ shapeKey: s._uiReturnShapeKey }); else this._updateControls(); }
    }
  }
  _handleBlur() { this._heldKeys?.clear?.(); this._recordedThisHold?.clear?.(); }

  // Volume slider already wired via Engine._onVolumeChange
}

customElements.define('osc-app', OscApp);
export { OscApp };
