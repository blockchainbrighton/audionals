// The oscilloscope application has a rich user interface and
// features.  It supports deterministic presets
// keyed off of a user‑supplied seed, real time audio synthesis with
// extensive modulation, and an optional step sequencer.  This class
// composes the tone loader, the canvas, a control panel and the
// sequencer UI.  It manages the asynchronous unlocking of the
// AudioContext and lazy initialization of individual synth chains for
// each visual shape.

import {
  mulberry32 as synthMulberry32,
  deterministicPreset as synthDeterministicPreset,
  loadPresets as synthLoadPresets,
  bufferShapeChain as synthBufferShapeChain,
  setActiveChain as synthSetActiveChain,
  disposeAllChains as synthDisposeAllChains
} from './synth.js';
import {
  recordStep as seqRecordStep,
  createSequenceUI as seqCreateSequenceUI,
  updateSequenceUI as seqUpdateSequenceUI,
  playSequence as seqPlaySequence,
  stopSequence as seqStopSequence
} from './sequencer.js';

class OscApp2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Application state (mirrors the original script where possible).
    this.state = {
      isPlaying: false,
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(8).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null,
      sequenceStepIndex: 0,
      stepTime: 400,
      Tone: null,
      chains: {},
      current: null,
      seed: '5s567g67',
      presets: {},
      contextUnlocked: false,
      initialBufferingStarted: false,
      initialShapeBuffered: false,
      // New: generation token increments on each (re)start to cancel stale tasks
      bufferGeneration: 0
    };
    // Bind handlers
    this._onToneReady = this._onToneReady.bind(this);
    this._onStartRequest = this._onStartRequest.bind(this);
    this._onMuteToggle = this._onMuteToggle.bind(this);
    this._onShapeChange = this._onShapeChange.bind(this);
    this._onToggleSequencer = this._onToggleSequencer.bind(this);
    this._handleSeedSubmit = this._handleSeedSubmit.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    // Define shapes order and mapping for sequencer keys (1–6)
    this.shapes = ['circle','square','butterfly','lissajous','spiro','harmonograph'];
    this.shapeLabels = {
      circle: 'Circle',
      square: 'Square',
      butterfly: 'Butterfly',
      lissajous: 'Lissajous',
      spiro: 'Spirograph',
      harmonograph: 'Harmonograph'
    };
  }

  connectedCallback() {
    // Build the UI structure within the shadow DOM.  A two‑column layout
    // separates the instructions/seed form from the main interactive area.
    const wrapper = document.createElement('div');
    wrapper.id = 'appWrapper';
    // Left side: instructions and seed input
    const aside = document.createElement('aside');
    aside.id = 'instructions';
    const howToDiv = document.createElement('div');
    howToDiv.innerHTML = `<h2>How to Use</h2>
<ol>
  <li><b>Numbers 1-6:</b><br> Instantly switch between unique sound+visual shapes.</li>
  <li><b>Step Sequencer:</b>
    <ul style="margin:0 0 0 1em; padding:0; font-size:.98em;">
      <li>Click <b>Create Sequence</b> to open.</li>
      <li>Click a box to record steps (use 1-6 keys).</li>
      <li>Right-click a box to clear.</li>
      <li>Set <b>Step Time</b> for sequence speed.</li>
      <li>Press <b>Play Sequence</b> to loop.</li>
    </ul>
  </li>
  <li><b>Mix Sounds:</b> Change shapes while audio is on to layer and blend rich effects.</li>
  <li><b>Toggle Audio:</b> Click the image or use <b>POWER ON</b> to start/stop.</li>
</ol>`;
    const seedForm = document.createElement('form');
    seedForm.id = 'seedForm';
    seedForm.autocomplete = 'off';
    seedForm.innerHTML = `
      <label for="seedInput">Seed (deterministic):</label>
      <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false" />
      <button id="seedSetBtn" type="submit">Set Seed</button>
    `;
    aside.append(howToDiv, seedForm);
    // Right side: main interactive area
    const main = document.createElement('div');
    main.id = 'main';
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvasContainer';
    this._canvas = document.createElement('scope-canvas');
    canvasContainer.appendChild(this._canvas);
    // Control panel
    this._controls = document.createElement('osc-controls');
    // Sequencer container (initially hidden)
    this._sequencerDiv = document.createElement('div');
    this._sequencerDiv.id = 'sequencer';
    this._sequencerDiv.style.display = 'none';
    // Container for step slots
    this._stepSlotsDiv = document.createElement('div');
    this._stepSlotsDiv.id = 'stepSlots';
    this._sequencerDiv.appendChild(this._stepSlotsDiv);
    // Sequence controls
    const seqControlsDiv = document.createElement('div');
    seqControlsDiv.id = 'sequenceControls';
    this._playBtn = document.createElement('button');
    this._playBtn.id = 'playBtn';
    this._playBtn.textContent = 'Play Sequence';
    this._playBtn.style.display = 'block';
    const stepTimeLabel = document.createElement('label');
    stepTimeLabel.setAttribute('for', 'stepTimeInput');
    stepTimeLabel.style.marginLeft = '1.2em';
    stepTimeLabel.textContent = 'Step Time (ms):';
    this._stepTimeInput = document.createElement('input');
    this._stepTimeInput.type = 'number';
    this._stepTimeInput.id = 'stepTimeInput';
    this._stepTimeInput.min = '50';
    this._stepTimeInput.max = '2000';
    this._stepTimeInput.value = '400';
    this._stepTimeInput.style.width = '60px';
    seqControlsDiv.append(this._playBtn, stepTimeLabel, this._stepTimeInput);
    this._sequencerDiv.appendChild(seqControlsDiv);
    // Loader message
    this._loader = document.createElement('div');
    this._loader.id = 'loader';
    this._loader.textContent = 'Initializing...';
    // Append elements into main container
    main.append(canvasContainer, this._controls, this._sequencerDiv, this._loader);
    // Compose wrapper
    wrapper.append(aside, main);
    // Attach style
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      #appWrapper {
        display: grid;
        grid-template-columns: minmax(220px, 340px) 1fr;
        grid-template-rows: 100vh;
        gap: 0;
        box-sizing: border-box;
        height: 100%;
      }
      @media (max-width:900px) {
        #appWrapper {
          grid-template-columns: 1fr;
        }
      }
      aside#instructions {
        background: linear-gradient(90deg, #181818 97%, #0000);
        color: #e1d9ce;
        font-size: 1.07rem;
        width: 100%;
        min-width: 210px;
        max-width: 340px;
        height: 100vh;
        border-right: 2px solid #2229;
        line-height: 1.65;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 1.4rem;
        padding: 2.2rem 1.2rem 2.4rem 2.2rem;
        overflow-y: auto;
      }
      aside#instructions h2 {
        color: #f7c469;
        font-size: 1.22rem;
        margin: 0 0 0.95em 0;
        font-weight: bold;
        letter-spacing: .04em;
      }
      #seedForm {
        margin-top: auto;
        background: #1c1c1c;
        padding: 1.1em 1em 0.9em 0.9em;
        border-radius: 8px;
        border: 1px solid #292929;
        color: #fff;
        font-size: 1rem;
        box-shadow: 0 0 9px #0006;
        display: flex;
        flex-direction: column;
        gap: 0.5em;
      }
      #seedForm label {
        font-size: 0.97em;
        color: #ffecb3;
        margin-bottom: 0.1em;
        font-weight: 600;
      }
      #seedForm input {
        font-family: inherit;
        padding: 0.35em 0.5em;
        border-radius: 4px;
        border: 1px solid #444;
        background: #232325;
        color: #ffecb3;
        font-size: 1em;
        width: 100%;
        margin-bottom: 0.2em;
        letter-spacing: .05em;
      }
      #seedForm button {
        padding: 0.3em 1em;
        border-radius: 4px;
        border: 1px solid #666;
        background: #212;
        color: #ffe0a3;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.97em;
        transition: background .18s;
      }
      #seedForm button:hover {
        background: #383023;
        color: #ffeab8;
      }
      #main {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
        box-sizing: border-box;
        background: #000;
      }
      #canvasContainer {
        flex: 1 1 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      #loader {
        font-size: .98rem;
        color: #aaa;
        min-height: 1.3em;
        text-align: center;
        font-style: italic;
        margin-top: .1em;
      }
      /* Step sequencer styling */
      #sequencer {
        text-align: center;
        width: 95%;
        margin: .8em auto 0 auto;
      }
      #stepSlots {
        display: flex;
        justify-content: center;
        gap: .55em;
        margin: .6em 0 .7em 0;
      }
      .step-slot {
        width: 37px;
        height: 37px;
        border: 1px solid #555;
        border-radius: 6px;
        background: #232325;
        display: grid;
        place-items: center;
        cursor: pointer;
        font-weight: bold;
        font-size: 1.12rem;
        user-select: none;
        transition: background .15s, box-shadow .16s;
      }
      .step-slot.record-mode {
        background: #343;
        box-shadow: 0 0 7px #f7c46988;
      }
      .step-slot.record-mode.active {
        background: #575;
        box-shadow: 0 0 12px #f7c469d6;
      }
      #sequenceControls {
        margin-top: .5em;
      }
      #playBtn {
        display: inline-block;
      }
    `;
    // Append all top‑level elements
    this.shadowRoot.append(style, document.createElement('tone-loader'), wrapper);
    // Seed default value into input
    seedForm.querySelector('#seedInput').value = this.state.seed;
    // Hook up event listeners
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._canvas.onIndicatorUpdate = (text, audioActive) => {
      // For app2 we reuse the loader as the status indicator instead of a separate visual indicator
      if (!this.state.isPlaying && !this.state.contextUnlocked) {
        // Before audio unlock show generic messages
        this._loader.textContent = 'Initializing...';
      } else {
        this._loader.textContent = text;
      }
    };
    // Add seed form handler
    seedForm.addEventListener('submit', this._handleSeedSubmit);
    // Keyboard handlers for shape switching and sequencer recording
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);
    // Initialize the control panel with shape options
    const shapeOptions = this.shapes.map(key => ({ value: key, label: this.shapeLabels[key] }));
    this._controls.setShapes(shapeOptions);
  }

  // Seed PRNG used by deterministic preset generator
  mulberry32(seedStr) {
    // Delegate to the stateless helper in synth.js.  This wrapper
    // ensures existing calls continue to work while centralising the
    // actual implementation in a separate module.
    return synthMulberry32(seedStr);
  }

  // deterministicPreset is ported from the original.  It produces a
  // repeatable audio/visual configuration for a given seed and shape.
  deterministicPreset(seed, shape) {
    // Delegate to the stateless helper.  Keeping the wrapper avoids
    // breaking existing calls from other methods while concentrating
    // the preset logic in one module.
    return synthDeterministicPreset(seed, shape);
  }

  // Load deterministic presets for all shapes from a seed
  loadPresets(seed) {
    // Delegate to the stateless helper.  The presets are computed
    // externally and assigned back onto this.state.
    this.state.presets = synthLoadPresets(seed, this.shapes);
  }

  // Buffer audio chain for a specific shape.  This creates oscillators,
  // filters, LFOs and reverb according to the deterministic preset and
  // stores them in state.chains.  If a chain already exists for the
  // shape it will be disposed first.
  async bufferShapeChain(shape) {
    // Delegate to the stateless synth helper.  Buffering is handled
    // externally, mutating this.state.chains as needed.
    return synthBufferShapeChain(this.state, shape);
  }

  // Activate a pre‑buffered chain.  Only one chain should be connected
  // to the destination at a time.  When switching shapes we disconnect
  // the reverb of all chains and connect the selected one.
  setActiveChain(shape) {
    // Delegate to the stateless synth helper.  It will handle
    // disconnecting other chains, connecting the selected one and
    // updating the canvas analyser reference.
    synthSetActiveChain(this.state, shape, this._canvas);
  }

  // Dispose all chains and reset state
  disposeAllChains() {
    // Delegate to the stateless synth helper.  All chain disposal
    // logic resides there.
    synthDisposeAllChains(this.state);
  }

  // Unlock the audio context and buffer the initial shape.  On first
  // invocation this resumes the AudioContext and buffers the initial
  // shape.  Subsequent calls either resume or stop playback depending
  // on current state.
  async unlockAudioAndBufferInitial() {
    const state = this.state;
    // If buffering is already in progress and initial shape is not yet
    // ready, notify the user and bail.
    if (state.initialBufferingStarted && !state.initialShapeBuffered) {
      this._loader.textContent = 'Still preparing initial synth, please wait...';
      return;
    }
    // If already playing then stop instead
    if (state.isPlaying) {
      this.stopAudioAndDraw();
      return;
    }
    // If context is already unlocked and the initial shape was buffered
    // we simply activate the selected shape and resume playback
    if (state.contextUnlocked) {
      if (state.initialShapeBuffered) {
        try {
          this.setActiveChain(this._controls.shadowRoot.querySelector('#shapeSelect').value);
          state.isPlaying = true;
          this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
          this._loader.textContent = 'Audio resumed.';
          this._canvas.isPlaying = true;
          return;
        } catch (activationError) {
          console.error('Error re‑activating chain:', activationError);
          this._loader.textContent = 'Error resuming audio.';
        }
      } else {
        this._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.';
        return;
      }
    }
    // Otherwise we must fully unlock and buffer
    this._loader.textContent = 'Unlocking AudioContext...';
    try {
      // Resume the AudioContext via Tone.js.  Use whichever method is available.
      const Tone = state.Tone;
      if (!Tone) throw new Error('Tone.js not available');
      let contextResumed = false;
      const contextToResume = Tone.getContext?.() || Tone.context;
      if (contextToResume && typeof contextToResume.resume === 'function') {
        await contextToResume.resume();
        contextResumed = true;
      } else if (Tone.start) {
        await Tone.start();
        contextResumed = true;
      }
      if (!contextResumed) throw new Error('Could not resume AudioContext');
      state.contextUnlocked = true;
      state.initialBufferingStarted = true;
      // Increment generation to cancel any prior background tasks
      const myGen = ++state.bufferGeneration;
      const initialShape = this._controls.shadowRoot.querySelector('#shapeSelect').value;
      this._loader.textContent = `Preparing ${initialShape} synth...`;
      await this.bufferShapeChain(initialShape);
      // If generation changed while awaiting, abort
      if (myGen !== state.bufferGeneration) return;
      // Activate initial chain and mark buffered
      this.setActiveChain(initialShape);
      state.initialShapeBuffered = true;
      state.isPlaying = true;
      this._canvas.isPlaying = true;
      this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: initialShape, sequencerVisible: state.isSequencerMode });
      this._loader.textContent = 'Ready. Shape: ' + initialShape;
      // Background buffer remaining shapes with generation guard
      (async (gen) => {
        for (const shape of this.shapes) {
          if (shape !== initialShape && state.contextUnlocked && gen === state.bufferGeneration) {
            try {
              await this.bufferShapeChain(shape);
            } catch (e) {
              console.error('Error background buffering chain for', shape, e);
            }
            // Yield to UI thread; re-check generation after await
            if (gen !== state.bufferGeneration) return;
            await new Promise(r => setTimeout(r, 0));
          }
        }
      })(myGen);
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
      this._loader.textContent = 'Failed to unlock AudioContext.';
      state.contextUnlocked = false;
      state.initialBufferingStarted = false;
      state.initialShapeBuffered = false;
    }
  }

  // Stop all audio and reset flags.  Audio chains are disposed but the
  // context remains unlocked so that subsequent calls do not need to
  // resume the context again.
  stopAudioAndDraw() {
    const state = this.state;
    if (!state.isPlaying && !state.initialBufferingStarted) return;
    // Invalidate any background buffering
    state.bufferGeneration++;
    this.disposeAllChains();
    state.isPlaying = false;
    state.initialBufferingStarted = false;
    state.initialShapeBuffered = false;
    this._canvas.isPlaying = false;
    // Reset controls and loader text
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: state.Tone?.Destination?.mute, shapeKey: this._controls.shadowRoot.querySelector('#shapeSelect').value, sequencerVisible: state.isSequencerMode });
    this._loader.textContent = 'Audio stopped.';
    // Stop sequence if playing
    if (state.sequencePlaying) this.stopSequence();
  }

  // Tone.js is ready: initialize presets and UI state
  _onToneReady() {
    this.state.Tone = window.Tone;
    // Load presets from initial seed
    this.loadPresets(this.state.seed);
    // Update canvas preset for initial shape
    const initialShape = this.shapes[Math.floor(this.mulberry32(this.state.seed)() * this.shapes.length)];
    this.state.current = initialShape;
    // Pass deterministic preset to canvas for colour animation
    this._canvas.preset = this.state.presets[initialShape];
    this._canvas.shapeKey = initialShape;
    this._canvas.mode = 'seed';
    // Populate control state
    this._controls.disableAll(false);
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: true, shapeKey: initialShape, sequencerVisible: false });
    this._loader.textContent = 'Tone.js loaded. Click ‘POWER ON’ to begin.';
  }

  // Start button handler.  Delegates to unlockAudioAndBufferInitial().
  _onStartRequest() {
    this.unlockAudioAndBufferInitial();
  }

  // Mute button handler toggles master mute but leaves isPlaying unchanged
  _onMuteToggle() {
    const state = this.state;
    if (!state.Tone || !state.contextUnlocked) return;
    const mute = state.Tone.Destination.mute = !state.Tone.Destination.mute;
    this._controls.updateState({ isAudioStarted: true, isPlaying: state.isPlaying, isMuted: mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
    this._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
    this._canvas.isPlaying = state.isPlaying && !mute;
  }

  // Handle shape selection changes.  When playing we switch active chain; when
  // stopped we merely update the canvas preset.  The preset is picked
  // from the deterministic presets.
  _onShapeChange(e) {
    const shapeKey = e.detail.shapeKey;
    if (!shapeKey) return;
    const state = this.state;
    state.current = shapeKey;
    // Update canvas parameters
    this._canvas.shapeKey = shapeKey;
    this._canvas.preset = state.presets[shapeKey];
    // If the context is unlocked and audio is playing/buffered, switch chains
    if (state.contextUnlocked && state.initialShapeBuffered) {
      this.setActiveChain(shapeKey);
    }
    // Keep mode consistent
    this._canvas.mode = state.contextUnlocked && state.initialShapeBuffered ? (state.isPlaying ? 'live' : 'seed') : 'seed';
    // Update controls state
    this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey: shapeKey, sequencerVisible: state.isSequencerMode });
  }

  // Toggle the sequencer visibility
  _onToggleSequencer() {
    const state = this.state;
    state.isSequencerMode = !state.isSequencerMode;
    this._sequencerDiv.style.display = state.isSequencerMode ? 'block' : 'none';
    this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
    if (state.isSequencerMode) {
      this.createSequenceUI();
    } else {
      state.isRecording = false;
      state.currentRecordSlot = -1;
      if (state.sequencePlaying) this.stopSequence();
      this.updateSequenceUI();
    }
  }

  // Handle seed form submission to reset deterministic presets
  _handleSeedSubmit(e) {
    e.preventDefault();
    const input = this.shadowRoot.getElementById('seedInput');
    let val = input.value.trim();
    if (!val) val = 'default';
    if (val === this.state.seed) return;
    this.resetToSeed(val);
  }

  // Reset to a new seed: stop audio, dispose chains, load presets and
  // update UI accordingly
  resetToSeed(newSeed) {
    const state = this.state;
    this.stopAudioAndDraw();
    this.disposeAllChains();
    state.contextUnlocked = false;
    state.initialBufferingStarted = false;
    state.initialShapeBuffered = false;
    state.seed = newSeed;
    this.loadPresets(newSeed);
    // Choose a new starting shape deterministically
    const rand = this.mulberry32(newSeed);
    const firstShape = this.shapes[(rand() * this.shapes.length) | 0];
    state.current = firstShape;
    // Update canvas
    this._canvas.shapeKey = firstShape;
    this._canvas.preset = state.presets[firstShape];
    this._canvas.mode = 'seed';
    // Update controls
    this._controls.updateState({ isAudioStarted: false, isPlaying: false, isMuted: true, shapeKey: firstShape, sequencerVisible: state.isSequencerMode });
    this._loader.textContent = "Seed updated. Click POWER ON.";
    // Reset sequence to empty
    state.sequence = Array(8).fill(null);
    this.updateSequenceUI();
  }

  // Keyboard handlers: digits 1‑6 switch shapes or record into sequencer
  _handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const idx = e.key.charCodeAt(0) - 49; // '1' maps to index 0
    if (idx >= 0 && idx < this.shapes.length) {
      const shapeKey = this.shapes[idx];
      const state = this.state;
  
      // When sequencer is recording, record the step AND play the note immediately
      if (state.isSequencerMode && state.isRecording) {
        this.recordStep(idx + 1);
  
        // Play sound immediately for this step during recording:
        if (state.contextUnlocked && state.initialShapeBuffered) {
          // Activate the chain for the shape immediately
          this.setActiveChain(shapeKey);
  
          // Update canvas to reflect current shape and preset
          this._canvas.shapeKey = shapeKey;
          this._canvas.preset = state.presets[shapeKey];
          this._canvas.mode = 'live';
          this._canvas.isPlaying = true;
  
          // Update controls UI state
          this._controls.updateState({
            isAudioStarted: state.contextUnlocked,
            isPlaying: state.isPlaying,
            isMuted: state.Tone?.Destination?.mute,
            shapeKey,
            sequencerVisible: state.isSequencerMode
          });
        }
  
        e.preventDefault();
        return;
      }
  
      // Otherwise change shape immediately (normal playback)
      if (this._controls) {
        this._controls.updateState({
          isAudioStarted: this.state.contextUnlocked,
          isPlaying: this.state.isPlaying,
          isMuted: this.state.Tone?.Destination?.mute,
          shapeKey,
          sequencerVisible: this.state.isSequencerMode
        });
        this._onShapeChange({ detail: { shapeKey } });
      }
      e.preventDefault();
    }
  }
  
  // Duplicate recordStep removed – the implementation lives closer to the
  // keyboard handlers earlier in this file.  See the first definition of
  // recordStep for the canonical implementation.  Keeping a single
  // implementation avoids divergent behaviour and centralises the logic
  // that records sequencer steps in one place.
  

  _handleKeyUp(e) {
    // No op – step recording handled on keydown
  }

  _handleBlur() {
    // Nothing special in this app when window loses focus
  }

  // Sequencer: build UI slots
  createSequenceUI() {
    // Delegate to the stateless sequencer helper.  We provide
    // callbacks bound to this component so that the helper can
    // manipulate the UI and invoke play/stop as needed.
    seqCreateSequenceUI(
      this.state,
      this._stepSlotsDiv,
      this._playBtn,
      this._stepTimeInput,
      () => this.updateSequenceUI(),
      () => this.playSequence(),
      () => this.stopSequence()
    );
  }

  updateSequenceUI() {
    // Delegate to the stateless sequencer helper.  The helper updates
    // all slot classes and the play button text based on the state.
    seqUpdateSequenceUI(this.state, this._stepSlotsDiv, this._playBtn);
  }

  recordStep(number) {
    // Delegate to the stateless sequencer helper.  A bound update
    // callback is passed so that UI updates remain within this component.
    seqRecordStep(this.state, number, () => this.updateSequenceUI());
  }

  playSequence() {
    // Delegate to the stateless sequencer helper.  Provide callbacks
    // for updating the control panel, invoking the shape change handler
    // and redrawing the sequence UI on each step.
    seqPlaySequence(
      this.state,
      this.shapes,
      (shapeKey) => {
        this._controls.updateState({
          isAudioStarted: this.state.contextUnlocked,
          isPlaying: this.state.isPlaying,
          isMuted: this.state.Tone?.Destination?.mute,
          shapeKey,
          sequencerVisible: this.state.isSequencerMode
        });
      },
      (shapeKey) => {
        this._onShapeChange({ detail: { shapeKey } });
      },
      () => this.updateSequenceUI()
    );
  }

  stopSequence() {
    // Delegate to the stateless sequencer helper.  Pass a callback
    // that updates the sequence UI when the sequence is stopped.
    seqStopSequence(this.state, () => this.updateSequenceUI());
  }
}

customElements.define('osc-app', OscApp2);
