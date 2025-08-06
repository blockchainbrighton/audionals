// <osc-app> orchestrates the entire application.  It composes the tone
// loader, the oscilloscope canvas and the control panel and wires them
// together using custom events.  It manages the audio graph (oscillators,
// filters, LFOs and analysers) and handles parameter generation (both
// deterministic and random).  Keyboard input for playing individual
// notes is also handled here.

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Internal runtime state mirrors the original script.  Most fields
    // correspond directly to the properties of the plain object `state`
    // in the original implementation.
    this.state = {
      isPlaying: false,
      isAudioStarted: false,
      Tone: null,
      nodes: {},
      currentParams: {},
      isSeedMode: false,
      seedGenerator: null,
      predefinedSets: {},
      dummyData: null,
      liveDataBuffer: null,
      keyboardOsc: {}
    };
    // Bind methods once so they retain the correct `this` when used as
    // event handlers or callbacks.
    this._onToneReady = this._onToneReady.bind(this);
    this._onStartRequest = this._onStartRequest.bind(this);
    this._onMuteToggle = this._onMuteToggle.bind(this);
    this._onShapeChange = this._onShapeChange.bind(this);
    this._onRandomize = this._onRandomize.bind(this);
    this._onModeChange = this._onModeChange.bind(this);
    this._updateIndicator = this._updateIndicator.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    // Define the set of supported shapes and their human‑friendly labels.
    this.shapes = {
      circle: 'Circle',
      square: 'Square',
      butterfly: 'Butterfly',
      lissajous: 'Lissajous',
      spiral: 'Spiral',
      rose: 'Rose'
    };
    // Keyboard mapping for playing notes.  Keys map to MIDI note numbers.
    this.keyMap = {
      'a':21,'w':22,'s':23,'e':24,'d':25,'f':26,'t':27,'g':28,'y':29,'h':30,'u':31,'j':32,
      'k':33,'o':34,'l':35,'p':36,';':37,"'":38,'z':39,'x':40,'c':41,'v':42,'b':43,'n':44,
      ',':45,'m':46,'.':47,'/':48,'q':49,'1':50,'2':51,'3':52,'4':53,'5':54,'6':55,'7':56,
      '8':57,'9':58,'0':59,'-':60,'=':61,'r':62,'i':63,'[':64,']':65,'\\':66
    };
  }

  connectedCallback() {
    // Build the internal DOM structure.  Use a container to center the
    // application on the page and group related elements.
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    // Visual indicator shows the current audio status (live/muted/silent).
    this._visualIndicator = document.createElement('div');
    this._visualIndicator.id = 'visualIndicator';
    this._visualIndicator.textContent = 'Silent Mode';
    this._visualIndicator.className = 'visual-indicator indicator-silent';
    // Keyboard indicator displays the last key pressed for the keyboard
    // synthesiser.
    this._keyboardIndicator = document.createElement('div');
    this._keyboardIndicator.id = 'keyboardIndicator';
    this._keyboardIndicator.style.display = 'none';
    this._keyboardIndicator.textContent = 'Keyboard Ready';
    this._keyboardIndicator.className = 'keyboard-note';
    // Instantiate child components.
    const toneLoader = document.createElement('tone-loader');
    this._canvas = document.createElement('scope-canvas');
    this._controls = document.createElement('osc-controls');
    // Loader message area for status updates.
    this._loader = document.createElement('div');
    this._loader.id = 'loader';
    this._loader.textContent = 'Initializing...';
    // Informational text shown below the loader.
    this._info = document.createElement('div');
    this._info.id = 'info';
    this._info.textContent = "Visuals start automatically. Click 'Start Audio' OR the image to hear sound. Use 'Mode' to switch generation method.";
    // Append elements into wrapper
    wrapper.append(
      this._visualIndicator,
      this._keyboardIndicator,
      this._canvas,
      this._controls,
      this._loader,
      this._info
    );
    // Append wrapper and tone loader to shadow root
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      #wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.2rem;
        padding: 1rem;
      }
      #visualIndicator {
        position: relative;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 0.75rem;
        font-weight: bold;
        z-index: 10;
      }
      .indicator-silent {
        background: #555;
        color: #ccc;
      }
      .indicator-audio {
        background: #4a86e8;
        color: #fff;
        box-shadow: 0 0 8px rgba(74,134,232,0.7);
      }
      #keyboardIndicator {
        position: relative;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 0.75rem;
        opacity: 0.9;
        background: #8b4513;
        color: #fff;
        box-shadow: 0 0 8px rgba(139,69,19,0.7);
      }
      #loader {
        font-size: 0.95rem;
        color: #aaa;
        min-height: 1.3rem;
        text-align: center;
        font-style: italic;
      }
      #info {
        font-size: 0.8rem;
        color: #888;
        text-align: center;
        max-width: 600px;
      }
    `;
    this.shadowRoot.append(style, toneLoader, wrapper);
    // Set up shape options in the controls component
    const shapeOptions = Object.keys(this.shapes).map(key => ({ value: key, label: this.shapes[key] }));
    this._controls.setShapes(shapeOptions);
    // Attach indicator update callback to canvas
    this._canvas.onIndicatorUpdate = this._updateIndicator;
    // Register event listeners
    toneLoader.addEventListener('tone-ready', this._onToneReady);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('randomize-request', this._onRandomize);
    this._controls.addEventListener('mode-change', this._onModeChange);
    // Keyboard events are attached on the window so that focus isn't required.
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);
    window.addEventListener('beforeunload', () => {
      // Ensure any active notes are stopped when the page unloads
      Object.values(this.state.keyboardOsc).forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      this.state.keyboardOsc = {};
    });
    // Until Tone.js is ready controls remain disabled
    this._controls.disableAll(true);
  }

  // -- Utilities for parameter generation and PRNG --
  // Multiply two numbers modulo 2^32 using imul (as used in the original mulberry32).
  mulberry32(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return () => {
      a = Math.imul(a ^ (a >>> 15), 1 | a);
      return ((a >>> 16) & 0xffff) / 0x10000;
    };
  }

  // Convert note name (e.g. "C4") to frequency in Hz.  Only A4 and above
  // are required for this application.
  noteToFrequency(note) {
    const A4 = 440;
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const match = note.match(/([A-G]#?)(\d+)/);
    if (!match) return A4;
    const idx = noteNames.indexOf(match[1]);
    const oct = +match[2];
    return A4 * Math.pow(2, (idx + (oct - 4) * 12 - 9) / 12);
  }

  // Generate a random element from an array using optional RNG function.
  rand(arr, rng = Math.random) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // Generate a random musical note (note name with octave).  Uses a
  // provided RNG when deterministic sequences are required.
  getRandomNote(rng = Math.random) {
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const octaves = [2,3,4,5];
    return this.rand(noteNames, rng) + this.rand(octaves, rng);
  }

  // Produce a complete parameter set.  When provided a shapeKey the shape
  // will be locked to that value.  Otherwise a random shape is chosen.
  generateRandomParams(shapeKey = null, rng = Math.random) {
    const waveforms = ['sine','square','sawtooth','triangle'];
    const filterTypes = ['lowpass','highpass','bandpass'];
    const keys = Object.keys(this.shapes);
    const sKey = shapeKey || this.rand(keys, rng);
    const osc1Type = this.rand(waveforms, rng);
    const osc1Note = this.getRandomNote(rng);
    const useOsc2 = rng() > 0.3;
    const osc2Type = useOsc2 ? this.rand(waveforms, rng) : null;
    const osc2Note = useOsc2 ? this.getRandomNote(rng) : null;
    let interaction = 'mix';
    if (useOsc2) {
      const r = rng();
      if (r < 0.4) interaction = 'am'; else if (r < 0.7) interaction = 'fm';
    }
    const filterFreq = 500 + rng() * 4000;
    const filterType = this.rand(filterTypes, rng);
    const lfoFreq = 0.1 + rng() * 5;
    const lfoMin = 200 + rng() * 1000;
    const lfoMax = lfoMin + 500 + rng() * 4000;
    const hueBase = Math.floor(rng() * 360);
    const hueRange = 50 + Math.floor(rng() * 100);
    const lineWidth = 1.5 + rng() * 3;
    const rotationSpeed = (rng() - 0.5) * 0.3;
    const pulseSpeed = 0.05 + rng() * 0.3;
    const size = 0.65 + rng() * 0.4;
    const useGlow = rng() > 0.5;
    let lissaA, lissaB, lissaDelta, spiralTurns, roseK;
    switch (sKey) {
      case 'lissajous':
        lissaA = 1 + Math.floor(rng() * 5);
        lissaB = 1 + Math.floor(rng() * 5);
        lissaDelta = rng() * Math.PI;
        break;
      case 'spiral':
        spiralTurns = 2 + Math.floor(rng() * 6);
        break;
      case 'rose':
        roseK = 0.5 + rng() * 5;
        break;
      default:
        lissaA = 1 + Math.floor(rng() * 5);
        lissaB = 1 + Math.floor(rng() * 5);
        lissaDelta = rng() * Math.PI;
        spiralTurns = 2 + Math.floor(rng() * 6);
        roseK = 0.5 + rng() * 5;
    }
    return {
      shapeKey: sKey,
      osc1: { type: osc1Type, note: osc1Note },
      osc2: useOsc2 ? { type: osc2Type, note: osc2Note } : null,
      interaction,
      filter: { frequency: filterFreq, type: filterType },
      lfo: { frequency: lfoFreq, min: lfoMin, max: lfoMax },
      visual: {
        hueBase, hueRange, lineWidth, rotationSpeed, pulseSpeed, size,
        useGlow, lissaA, lissaB, lissaDelta, spiralTurns, roseK
      }
    };
  }

  // Generate deterministic preset sets based on a seed string.  A PRNG
  // derived from the seed drives generation of one set per shape.  The
  // resulting object maps shape keys to parameter sets.
  generatePredefinedSets(seedString = 'defaultSeed') {
    const rng = this.mulberry32(seedString);
    const sets = {};
    Object.keys(this.shapes).forEach(k => {
      sets[k] = this.generateRandomParams(k, rng);
    });
    this.state.predefinedSets = sets;
  }

  // Determine if the audio graph needs to be rebuilt due to structural
  // changes (addition or removal of oscillator 2 or interaction mode).
  needsRebuild(newP, oldP) {
    if (!oldP) return true;
    return Boolean(newP.osc2) !== Boolean(oldP.osc2) || newP.interaction !== oldP.interaction;
  }

  // Clean up and dispose all Tone.js objects in the current nodes.  This
  // stops any oscillators and frees resources.
  disposeNodes() {
    Object.values(this.state.nodes).forEach(n => {
      try {
        if (n && typeof n.stop === 'function') n.stop();
      } catch (e) {}
      try {
        if (n && typeof n.dispose === 'function') n.dispose();
      } catch (e) {}
    });
    this.state.nodes = {};
  }

  // Update parameters on existing audio nodes without recreating the
  // entire graph.  This ramps frequencies and updates filter settings.
  updateAudioNodes(params) {
    const nodes = this.state.nodes;
    const Tone = this.state.Tone;
    if (nodes.osc1) {
      nodes.osc1.type = params.osc1.type;
      nodes.osc1.frequency.rampTo(this.noteToFrequency(params.osc1.note), 0.05);
    }
    if (params.osc2 && nodes.osc2) {
      nodes.osc2.type = params.osc2.type;
      nodes.osc2.frequency.rampTo(this.noteToFrequency(params.osc2.note), 0.05);
    }
    if (nodes.filter) {
      nodes.filter.type = params.filter.type;
      nodes.filter.frequency.rampTo(params.filter.frequency, 0.05);
    }
    if (nodes.lfo) {
      nodes.lfo.frequency.value = params.lfo.frequency;
      nodes.lfo.min = params.lfo.min;
      nodes.lfo.max = params.lfo.max;
    }
  }

  // Build or update the audio graph to reflect new parameters.  When
  // forceRebuild is true or the structure has changed we dispose the
  // existing graph and create a fresh one; otherwise we update
  // parameters on the existing nodes.  Returns true if the setup
  // succeeded.
  async setupAudioGraph(params, forceRebuild = false) {
    const state = this.state;
    const Tone = state.Tone;
    if (!Tone) {
      this._loader.textContent = 'Tone.js not loaded.';
      return false;
    }
    // Boot the audio context if it has not yet been started.
    if (!state.isAudioStarted) {
      try {
        await Tone.start();
        state.isAudioStarted = true;
      } catch (e) {
        this._loader.textContent = 'Failed to start audio.';
        return false;
      }
    }
    // Determine whether a full rebuild is necessary.
    const needs = forceRebuild || this.needsRebuild(params, state.currentParams);
    if (needs) {
      // Dispose of any existing nodes before building a new graph.
      this.disposeNodes();
      const osc1 = state.nodes.osc1 = new Tone.Oscillator(this.noteToFrequency(params.osc1.note), params.osc1.type).start();
      let osc2 = null;
      if (params.osc2) {
        osc2 = state.nodes.osc2 = new Tone.Oscillator(this.noteToFrequency(params.osc2.note), params.osc2.type).start();
      }
      const filter = state.nodes.filter = new Tone.Filter(params.filter.frequency, params.filter.type);
      const lfo = state.nodes.lfo = new Tone.LFO(params.lfo.frequency, params.lfo.min, params.lfo.max).start();
      const modulatedGain = state.nodes.modulatedGain = new Tone.Gain(1);
      const volume = state.nodes.volume = new Tone.Volume(-10);
      // Wire up LFO modulation to filter frequency
      lfo.connect(filter.frequency);
      // Interaction between oscillators depends on selected mode
      if (params.interaction === 'am' && osc2) {
        osc1.connect(modulatedGain);
        osc2.connect(modulatedGain.gain);
        modulatedGain.connect(volume);
      } else if (params.interaction === 'fm' && osc2) {
        osc2.connect(osc1.frequency);
        osc1.connect(volume);
      } else {
        osc1.connect(volume);
        if (osc2) osc2.connect(volume);
      }
      volume.connect(filter);
      filter.toDestination();
      // Create analyser node off of the native AudioContext for the
      // oscilloscope visuals.  This analyser lives outside of Tone.js
      // because Tone provides no direct API for its creation.
      const ana = state.nodes.analyser = Tone.context.createAnalyser();
      ana.fftSize = 2048;
      filter.connect(ana);
      // Ensure the master output mute state matches our playing flag
      Tone.Destination.mute = !state.isPlaying;
      // Update labels on mute button immediately via controls state
      this._controls.updateState({
        isAudioStarted: true,
        isPlaying: state.isPlaying,
        isMuted: Tone.Destination.mute,
        shapeKey: params.shapeKey,
        isSeedMode: state.isSeedMode
      });
    } else {
      // When the graph structure stays the same we simply update
      // individual parameters.
      this.updateAudioNodes(params);
    }
    // Expose the analyser to the canvas for visualisation
    this._canvas.analyser = state.nodes.analyser;
    return true;
  }

  // Toggle the audio on or off.  On the first invocation this will
  // build the audio graph.  Subsequent invocations simply mute or
  // unmute the master output.  The loader text and control labels are
  // updated to reflect the new state.
  async toggleAudio() {
    const state = this.state;
    // When the audio context hasn't been booted we need to build the
    // graph.  The first call to start returns a boolean indicating
    // success.
    if (!state.isAudioStarted) {
      const ok = await this.setupAudioGraph(state.currentParams || {}, true);
      if (ok) {
        state.isPlaying = true;
        state.Tone.Destination.mute = false;
        this._loader.textContent = 'Audio is now playing.';
      } else {
        return;
      }
    } else if (state.isPlaying) {
      // Currently playing: mute the output and flip the flag
      state.Tone.Destination.mute = true;
      state.isPlaying = false;
      this._loader.textContent = 'Audio muted.';
    } else {
      // Currently muted: unmute and flip the flag
      state.Tone.Destination.mute = false;
      state.isPlaying = true;
      this._loader.textContent = 'Audio unmuted.';
    }
    // Update the control panel state to reflect the new playing/mute state
    this._controls.updateState({
      isAudioStarted: true,
      isPlaying: state.isPlaying,
      isMuted: state.Tone.Destination.mute,
      shapeKey: state.currentParams?.shapeKey,
      isSeedMode: state.isSeedMode
    });
    // Pass updated flags down to the canvas so it knows whether to use
    // live audio data or dummy data for rendering.
    this._canvas.isAudioStarted = state.isAudioStarted;
    this._canvas.isPlaying = state.isPlaying;
  }

  // -- Event handlers --
  _onToneReady() {
    // Tone.js has finished loading.  Store the global Tone object and
    // enable the control panel.  Generate initial presets using a
    // deterministic seed so that the user sees the same starting point
    // each time.  The loader text is updated accordingly.
    this.state.Tone = window.Tone;
    // Enable controls now that audio can be used.
    this._controls.disableAll(false);
    // Generate deterministic presets and select a default shape.
    this.generatePredefinedSets('InitialSeed_v1');
    const initialShape = 'circle';
    // Choose initial params from the predefined set or generate a
    // fallback random set in case of missing entry.
    const initialParams = this.state.predefinedSets[initialShape] || this.generateRandomParams(initialShape);
    this.state.currentParams = initialParams;
    // Set canvas parameters
    this._canvas.shapeKey = initialParams.shapeKey;
    this._canvas.visualParams = initialParams.visual;
    this._canvas.isAudioStarted = false;
    this._canvas.isPlaying = false;
    // Update controls to reflect initial state (audio not started yet)
    this._controls.updateState({
      isAudioStarted: true, // <-- NOW BUTTONS ENABLE
      isPlaying: false,
      isMuted: true,
      shapeKey: initialParams.shapeKey,
      isSeedMode: false
    });
    // Inform the user via loader
    this._loader.textContent = 'Audio engine ready. Pattern generated (Seed Mode ready). Click \u2018Start Audio\u2019 OR the image to hear sound.';
    // Prepare dummy data for the canvas
    this.state.dummyData = null;
  }

  _onStartRequest() {
    this.toggleAudio();
  }

  _onMuteToggle() {
    const state = this.state;
    if (!state.Tone || !state.isAudioStarted) return;
    const mute = state.Tone.Destination.mute = !state.Tone.Destination.mute;
    // If the mute state changes we do not toggle isPlaying; instead we
    // consider isPlaying and mute independent.  However for the visual
    // indicator we treat the output as active only when both are true.
    this._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
    this._controls.updateState({
      isAudioStarted: true,
      isPlaying: state.isPlaying,
      isMuted: mute,
      shapeKey: state.currentParams?.shapeKey,
      isSeedMode: state.isSeedMode
    });
    this._canvas.isAudioStarted = state.isAudioStarted;
    this._canvas.isPlaying = state.isPlaying && !mute;
  }

  _onShapeChange(e) {
    const newShape = e.detail.shapeKey;
    if (!newShape) return;
    const state = this.state;
    let np;
    if (state.isSeedMode && state.predefinedSets[newShape]) {
      np = state.predefinedSets[newShape];
    } else {
      np = { ...state.currentParams, shapeKey: newShape };
      // When switching shapes we need to remove shape‑specific parameters
      if (np.visual) {
        delete np.visual.lissaA;
        delete np.visual.lissaB;
        delete np.visual.lissaDelta;
        delete np.visual.spiralTurns;
        delete np.visual.roseK;
      }
    }
    state.currentParams = np;
    // Propagate visual changes to the canvas
    this._canvas.shapeKey = np.shapeKey;
    this._canvas.visualParams = np.visual;
    // If audio is running update the audio graph to reflect new params
    if (state.isAudioStarted) {
      this.setupAudioGraph(np);
      this._loader.textContent = state.isPlaying ? 'Audio pattern updated.' : 'Visual pattern updated. Click \u2018Start Audio\u2019 to hear.';
    }
    this._controls.updateState({
      isAudioStarted: state.isAudioStarted,
      isPlaying: state.isPlaying,
      isMuted: state.Tone?.Destination?.mute,
      shapeKey: np.shapeKey,
      isSeedMode: state.isSeedMode
    });
  }

  _onRandomize() {
    const state = this.state;
    let np;
    if (state.isSeedMode) {
      // Use deterministic generator
      np = this.generateRandomParams(null, state.seedGenerator);
    } else {
      np = this.generateRandomParams();
    }
    state.currentParams = np;
    this._controls.updateState({
      isAudioStarted: state.isAudioStarted,
      isPlaying: state.isPlaying,
      isMuted: state.Tone?.Destination?.mute,
      shapeKey: np.shapeKey,
      isSeedMode: state.isSeedMode
    });
    this._canvas.shapeKey = np.shapeKey;
    this._canvas.visualParams = np.visual;
    state.dummyData = null; // regenerate dummy data for new visuals
    if (state.isAudioStarted) {
      this.setupAudioGraph(np);
      this._loader.textContent = state.isPlaying ? 'Audio pattern randomized.' : 'Visual pattern randomized. Click \u2018Start Audio\u2019 to hear.';
    } else {
      this._loader.textContent = 'New visual pattern generated. Click \u2018Start Audio\u2019 to hear.';
    }
  }

  _onModeChange(e) {
    const state = this.state;
    const isSeed = e.detail.isSeedMode;
    state.isSeedMode = isSeed;
    if (isSeed) {
      const seed = 'MyUniqueSeed_v1';
      state.seedGenerator = this.mulberry32(seed);
      this.generatePredefinedSets(seed);
      // Pick the first shape in the set as the current params
      const k = Object.keys(state.predefinedSets)[0];
      const np = state.predefinedSets[k];
      state.currentParams = np;
      this._canvas.shapeKey = np.shapeKey;
      this._canvas.visualParams = np.visual;
      this._controls.updateState({
        isAudioStarted: state.isAudioStarted,
        isPlaying: state.isPlaying,
        isMuted: state.Tone?.Destination?.mute,
        shapeKey: np.shapeKey,
        isSeedMode: true
      });
      this._loader.textContent = `Seed Mode (${seed}) loaded. Showing '${this.shapes[k]}'.`;
    } else {
      state.seedGenerator = null;
      this._controls.updateState({
        isAudioStarted: state.isAudioStarted,
        isPlaying: state.isPlaying,
        isMuted: state.Tone?.Destination?.mute,
        shapeKey: state.currentParams?.shapeKey,
        isSeedMode: false
      });
      this._loader.textContent = 'Random Mode. New randomizations will use Math.random.';
    }
  }

  // Callback provided to the canvas to update the on‑screen indicator
  _updateIndicator(text, audioActive) {
    this._visualIndicator.textContent = text;
    this._visualIndicator.className = 'visual-indicator ' + (audioActive ? 'indicator-audio' : 'indicator-silent');
    // When audio is live the keyboard indicator remains visible.  When
    // silent or muted we hide it.
    if (!audioActive) {
      this._keyboardIndicator.style.display = 'none';
    }
  }

  // Key down handler for live keyboard input.  When audio is started and
  // the user holds down a mapped key an oscillator is created with the
  // appropriate frequency and connected through the filter chain.
  _handleKeyDown(e) {
    // Ignore input if Tone.js hasn't been loaded or the audio context
    // hasn't been started.
    const state = this.state;
    if (!state.Tone || !state.isAudioStarted || e.repeat) return;
    const key = e.key.toLowerCase();
    const midi = this.keyMap[key];
    if (!midi || state.keyboardOsc[key]) return;
    // Build a simple oscillator for the pressed note.  Use current
    // parameters for oscillator type and filter configuration.  This
    // matches the behaviour of the original script.
    const osc1Params = state.currentParams?.osc1 || {};
    const freq = this.midiToFreq(midi);
    const osc = new state.Tone.Oscillator(freq, osc1Params.type || 'sine').start();
    let out = osc;
    const filterCfg = state.currentParams?.filter || {};
    if (filterCfg.frequency) {
      const f = new state.Tone.Filter(filterCfg.frequency, filterCfg.type);
      osc.connect(f);
      out = f;
    }
    out.connect(state.Tone.Destination);
    state.keyboardOsc[key] = osc;
    // Show keyboard indicator and update loader
    this._keyboardIndicator.style.display = 'block';
    this._keyboardIndicator.textContent = `Playing: ${this.midiToNoteName(midi)}`;
    this._loader.textContent = `Playing note: ${this.midiToNoteName(midi)}`;
  }

  _handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const osc = this.state.keyboardOsc[key];
    if (osc) {
      try { osc.stop('+0.05'); } catch (_) {}
      delete this.state.keyboardOsc[key];
    }
  }

  _handleBlur() {
    // Stop any active keyboard oscillators when the window loses focus
    Object.values(this.state.keyboardOsc).forEach(o => {
      try { o.stop('+0.01'); } catch (_) {}
    });
    this.state.keyboardOsc = {};
  }

  // Convert MIDI note number to note name (e.g. 60 -> C4).  This helper
  // reproduces the original midiToNoteName function.
  midiToNoteName(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  // Convert MIDI note number to frequency in Hz.  This helper matches
  // the original midiToFreq function.
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
}

customElements.define('osc-app', OscApp);