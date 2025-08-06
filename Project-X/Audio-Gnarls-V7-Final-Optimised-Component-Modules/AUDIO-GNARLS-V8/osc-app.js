// The oscilloscope application has a rich user interface and
// features.  It supports deterministic presets
// keyed off of a user‑supplied seed, real time audio synthesis with
// extensive modulation, and an optional step sequencer.  This class
// composes the tone loader, the canvas, a control panel and the
// sequencer UI.  It manages the asynchronous unlocking of the
// AudioContext and lazy initialization of individual synth chains for
// each visual shape.

class OscApp2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Application state (mirrors the original script where possible).
    /**
     * Internal application state.  All runtime variables live inside this
     * object so that resetting the application simply means reassigning
     * a new default state.  See `defaultState()` for the initial
     * structure.  This approach centralises state definition and
     * simplifies resets.
     *
     * @type {ReturnType<OscApp2['defaultState']>}
     */
    this.state = this.defaultState('5s567g67');
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

  /**
   * Produce a fresh state object.  A single function is responsible
   * for the initial shape of `this.state`, which makes it easy to
   * reset the application to a clean slate.  Where possible default
   * values mirror those used in the original implementation.
   *
   * @param {string} seed The seed used for deterministic presets.
   */
  defaultState(seed = 'default') {
    return {
      // Playback flags
      isPlaying: false,
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      // Sequencer data
      sequence: Array(8).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null,
      sequenceStepIndex: 0,
      stepTime: 400,
      // Tone.js and audio chain management
      Tone: null,
      chains: {},
      current: null,
      seed: seed,
      presets: {},
      contextUnlocked: false,
      initialBufferingStarted: false,
      initialShapeBuffered: false
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
  <li><b>Toggle Audio:</b> Click the image or use <b>Start Audio</b> button to start/stop.</li>
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

  disconnectedCallback() {
    // Clean up global listeners to avoid leaks if the component is removed
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);
  }

  /**
   * Resets the entire application state to its default state for the
   * current seed.  This method disposes all audio chains, stops any
   * running sequence, clears timers and resets UI elements.  It is
   * invoked internally when the user stops playback via the start
   * button.  After reset the UI will reflect an uninitialised but
   * Tone‑enabled app ready to be started again.
   */
  resetState() {
    // Dispose any audio nodes to ensure complete silence
    this.disposeAllChains();
    // Stop any active sequence timers
    if (this.state.sequencePlaying) {
      this.stopSequence();
    }
    // Reset internal state while preserving the seed and loaded Tone
    const seed = this.state.seed;
    const Tone = this.state.Tone;
    // Create a new state object and carry over the existing Tone instance
    this.state = this.defaultState(seed);
    this.state.Tone = Tone;
    // Reload deterministic presets for the seed
    this.loadPresets(seed);
    // Choose a deterministic starting shape and update canvas
    const rand = this.mulberry32(seed);
    const firstShape = this.shapes[(rand() * this.shapes.length) | 0];
    this.state.current = firstShape;
    this._canvas.preset = this.state.presets[firstShape];
    this._canvas.shapeKey = firstShape;
    this._canvas.mode = 'seed';
    this._canvas.isAudioStarted = false;
    this._canvas.isPlaying = false;
    // Update control panel state (audio not yet started)
    // Tone remains loaded after the initial load, so allow the user to
    // start audio again by signalling that the context is ready even
    // though nothing is playing yet.  The start button will be
    // re‑enabled when `isAudioStarted` is true.
    this._controls.updateState({
      isAudioStarted: true,
      isPlaying: false,
      isMuted: true,
      shapeKey: firstShape,
      sequencerVisible: false
    });
    // Hide sequencer UI
    this.state.isSequencerMode = false;
    this._sequencerDiv.style.display = 'none';
    // Reset sequence UI
    this.state.sequence = Array(8).fill(null);
    this.updateSequenceUI();
    // Reset loader text
    this._loader.textContent = 'Ready. Click \u2018Start Audio + Draw\u2019 or the image to begin.';
  }

  // Seed PRNG used by deterministic preset generator
  mulberry32(seedStr) {
    let a = 0x6d2b79f5 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; ++i) a = Math.imul(a ^ seedStr.charCodeAt(i), 2654435761);
    return () => {
      a = Math.imul(a ^ (a >>> 15), 1 | a);
      return ((a >>> 16) & 0xffff) / 0x10000;
    };
  }

  // deterministicPreset is ported from the original.  It produces a
  // repeatable audio/visual configuration for a given seed and shape.
  deterministicPreset(seed, shape) {
    const rng = this.mulberry32(seed + '_' + shape);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng();
    let mode = modeRoll < 0.18 ? 0 : modeRoll < 0.56 ? 1 : modeRoll < 0.85 ? 2 : 3;
    let lfoRate;
    if (mode === 0) lfoRate = 0.07 + rng() * 0.3;
    else if (mode === 1) lfoRate = 0.25 + rng() * 8;
    else if (mode === 2) lfoRate = 6 + rng() * 20;
    else lfoRate = 24 + rng() * 36;
    let lfoMin, lfoMax;
    if (mode === 0) {
      lfoMin = 400 + rng() * 400;
      lfoMax = 900 + rng() * 600;
    } else if (mode === 1) {
      lfoMin = 120 + rng() * 700;
      lfoMax = 1200 + rng() * 1400;
    } else {
      lfoMin = 80 + rng() * 250;
      lfoMax = 1500 + rng() * 3500;
    }
    const oscCount = mode === 3 ? 2 + (rng() > 0.7 ? 1 : 0) : 1 + (rng() > 0.6 ? 1 : 0);
    const oscs = [];
    for (let i = 0; i < oscCount; ++i) oscs.push([types[(rng() * types.length) | 0], notes[(rng() * notes.length) | 0]]);
    const filterBase = mode === 0 ? 700 + rng() * 500 : 300 + rng() * 2400;
    const resonance = 0.6 + rng() * 0.7;
    let env = {};
    if (mode === 0) env = { attack: 0.005 + rng() * 0.03, decay: 0.04 + rng() * 0.08, sustain: 0.1 + rng() * 0.2, release: 0.03 + rng() * 0.1 };
    else if (mode === 3) env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: 0.7 + rng() * 0.2, release: 8 + rng() * 24 };
    else env = { attack: 0.03 + rng() * 0.4, decay: 0.1 + rng() * 0.7, sustain: 0.2 + rng() * 0.5, release: 0.2 + rng() * 3 };
    const reverbWet = mode === 3 ? 0.4 + rng() * 0.5 : 0.1 + rng() * 0.5;
    const reverbRoom = mode === 3 ? 0.85 + rng() * 0.12 : 0.6 + rng() * 0.38;
    const colorSpeed = 0.06 + rng() * 0.22;
    const shapeDrift = 0.0006 + rng() * 0.0032;
    return {
      osc1: oscs[0],
      osc2: oscs[1] || null,
      filter: filterBase,
      filterQ: resonance,
      lfo: [lfoRate, lfoMin, lfoMax],
      envelope: env,
      reverb: { wet: reverbWet, roomSize: reverbRoom },
      colorSpeed,
      shapeDrift,
      seed: seed
    };
  }

  // Load deterministic presets for all shapes from a seed
  loadPresets(seed) {
    const presets = {};
    for (const k of this.shapes) {
      presets[k] = this.deterministicPreset(seed, k);
    }
    this.state.presets = presets;
  }

  // Buffer audio chain for a specific shape.  This creates oscillators,
  // filters, LFOs and reverb according to the deterministic preset and
  // stores them in state.chains.  If a chain already exists for the
  // shape it will be disposed first.
  async bufferShapeChain(shape) {
    const state = this.state;
    const pr = state.presets[shape];
    const Tone = state.Tone;
    if (!pr || !Tone) return;
    // Dispose any existing chain for this shape
    if (state.chains[shape]) {
      Object.values(state.chains[shape]).forEach(n => {
        try { n.stop?.(); } catch (_) {}
        try { n.dispose?.(); } catch (_) {}
      });
      delete state.chains[shape];
    }
    try {
      const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const volume = new Tone.Volume(5);
      const filter = new Tone.Filter(pr.filter, 'lowpass');
      filter.Q.value = pr.filterQ;
      const lfo = new Tone.LFO(pr.lfo[0], pr.lfo[1], pr.lfo[2]).start();
      const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
      const analyser = Tone.context.createAnalyser();
      analyser.fftSize = 2048;
      lfo.connect(filter.frequency);
      if (osc2) lfo.connect(osc2.detune);
      osc1.connect(volume);
      if (osc2) osc2.connect(volume);
      volume.connect(filter);
      filter.connect(reverb);
      filter.connect(analyser);
      state.chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
    } catch (e) {
      console.error('Error buffering chain for shape', shape, e);
      delete state.chains[shape];
    }
  }

  // Activate a pre‑buffered chain.  Only one chain should be connected
  // to the destination at a time.  When switching shapes we disconnect
  // the reverb of all chains and connect the selected one.
  setActiveChain(shape) {
    const state = this.state;
    // Disconnect all reverb outputs
    for (const s in state.chains) {
      state.chains[s]?.reverb?.disconnect();
    }
    const chain = state.chains[shape];
    chain?.reverb?.toDestination();
    state.current = shape;
    // Provide analyser to the canvas
    if (chain?.analyser) {
      this._canvas.analyser = chain.analyser;
      this._canvas.isAudioStarted = true;
      this._canvas.isPlaying = state.isPlaying;
    }
  }

  // Dispose all chains and reset state
  disposeAllChains() {
    const state = this.state;
    for (const shape in state.chains) {
      const chain = state.chains[shape];
      if (!chain) continue;
      Object.values(chain).forEach(n => {
        try { n.stop?.(); } catch (_) {}
        try { n.dispose?.(); } catch (_) {}
      });
    }
    state.chains = {};
    state.current = null;
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
      const initialShape = this._controls.shadowRoot.querySelector('#shapeSelect').value;
      this._loader.textContent = `Preparing ${initialShape} synth...`;
      await this.bufferShapeChain(initialShape);
      // Activate initial chain and mark buffered
      this.setActiveChain(initialShape);
      state.initialShapeBuffered = true;
      state.isPlaying = true;
      this._canvas.isPlaying = true;
      this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: initialShape, sequencerVisible: state.isSequencerMode });
      this._loader.textContent = 'Ready. Shape: ' + initialShape;
      // Background buffer remaining shapes
      (async () => {
        for (const shape of this.shapes) {
          if (shape !== initialShape && state.contextUnlocked) {
            try {
              await this.bufferShapeChain(shape);
            } catch (e) {
              console.error('Error background buffering chain for', shape, e);
            }
            await new Promise(r => setTimeout(r, 0));
          }
        }
      })();
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
    // Reset internal flags and audio; state.isPlaying will be reset via resetState
    state.isPlaying = false;
    state.initialBufferingStarted = false;
    state.initialShapeBuffered = false;
    // Immediately dispose all chains and stop any sequence
    this.disposeAllChains();
    if (state.sequencePlaying) this.stopSequence();
    // Ensure the analyser stops driving the canvas
    this._canvas.isPlaying = false;
    this._canvas.isAudioStarted = false;
    // Fully reset the application back to a clean state
    this.resetState();
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
    this._loader.textContent = 'Tone.js loaded. Click \u2018Start Audio + Draw\u2019 or the image to begin.';
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
    // Stop current playback and reset using the new seed
    this.stopAudioAndDraw();
    // Assign new seed and reload presets
    this.state.seed = newSeed;
    this.loadPresets(newSeed);
    // Apply the new seed to the reset state
    this.resetState();
    this._loader.textContent = 'Seed updated. Click Start Audio + Draw.';
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
  
  recordStep(number) {
    const state = this.state;
    if (!state.isRecording) return;
    const idx = state.currentRecordSlot;
    if (idx < 0 || idx >= state.sequence.length) return;
    state.sequence[idx] = number;
    // Advance to next slot
    state.currentRecordSlot = (idx + 1) % state.sequence.length;
    // If we've wrapped around, stop recording
    if (state.currentRecordSlot === 0) {
      state.isRecording = false;
    }
    this.updateSequenceUI();
  }
  

  _handleKeyUp(e) {
    // No op – step recording handled on keydown
  }

  _handleBlur() {
    // Nothing special in this app when window loses focus
  }

  // Sequencer: build UI slots
  createSequenceUI() {
    // Build 8 step slots
    this._stepSlotsDiv.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.classList.add('step-slot');
      slot.dataset.index = i.toString();
      slot.textContent = this.state.sequence[i] ? this.state.sequence[i] : '';
      // Left click to select slot for recording
      slot.addEventListener('click', (ev) => {
        const idx = parseInt(slot.dataset.index, 10);
        this.state.isRecording = true;
        this.state.currentRecordSlot = idx;
        this.updateSequenceUI();
      });
      // Right click clears the slot
      slot.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const idx = parseInt(slot.dataset.index, 10);
        this.state.sequence[idx] = null;
        // If clearing the current record slot, advance to next or stop recording
        if (this.state.isRecording && this.state.currentRecordSlot === idx) {
          this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
          // Stop recording if we've wrapped around
          if (this.state.currentRecordSlot === 0) {
            this.state.isRecording = false;
          }
        }
        this.updateSequenceUI();
      });
      this._stepSlotsDiv.appendChild(slot);
    }
    // Play button toggles sequence playback
    this._playBtn.onclick = () => {
      if (this.state.sequencePlaying) this.stopSequence(); else this.playSequence();
    };
    // Step time input
    this._stepTimeInput.onchange = () => {
      const val = parseInt(this._stepTimeInput.value, 10);
      if (val >= 50 && val <= 2000) {
        this.state.stepTime = val;
        if (this.state.sequencePlaying) {
          this.stopSequence();
          this.playSequence();
        }
      } else {
        this._stepTimeInput.value = this.state.stepTime;
      }
    };
    this.updateSequenceUI();
  }

  updateSequenceUI() {
    const slots = this._stepSlotsDiv.querySelectorAll('.step-slot');
    slots.forEach((slot) => {
      const idx = parseInt(slot.dataset.index, 10);
      const val = this.state.sequence[idx];
      slot.textContent = val || '';
      slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
      slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);
    });
    this._playBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
  }

  
  playSequence() {
    const state = this.state;
    if (state.sequencePlaying) return;
    state.sequencePlaying = true;
    state.sequenceStepIndex = 0;
    this.updateSequenceUI();
    const stepFn = () => {
      const idx = state.sequenceStepIndex;
      const val = state.sequence[idx];
      if (val != null) {
        const shapeKey = this.shapes[val - 1];
        this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey: shapeKey, sequencerVisible: state.isSequencerMode });
        this._onShapeChange({ detail: { shapeKey } });
      }
      state.sequenceStepIndex = (state.sequenceStepIndex + 1) % state.sequence.length;
      this.updateSequenceUI();
    };
    stepFn();
    state.sequenceIntervalId = setInterval(stepFn, state.stepTime);
  }

  stopSequence() {
    const state = this.state;
    if (!state.sequencePlaying) return;
    clearInterval(state.sequenceIntervalId);
    state.sequenceIntervalId = null;
    state.sequencePlaying = false;
    state.sequenceStepIndex = 0;
    this.updateSequenceUI();
  }
}

customElements.define('osc-app', OscApp2);
