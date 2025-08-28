
class OscApp2 extends HTMLElement {
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
      this.shapes.map(k => [k, k.charAt(0).toUpperCase() + k.slice(1)])
    );

    // --- State -------------------------------------------------------------
    this.state = this.defaultState('5s567g67');

    // --- Bind handlers once ------------------------------------------------
    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange',
      '_onToggleSequencer','_onAudioSignature','_handleSeedSubmit','_handleKeyDown','_handleKeyUp','_handleBlur',
      '_onSeqRecordStart','_onSeqStepCleared','_onSeqStepRecorded','_onSeqPlayStarted',
      '_onSeqPlayStopped','_onSeqStepAdvance','_onSeqStepTimeChanged'
    ].forEach(fn => this[fn] = this[fn].bind(this));
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
      chains: {}, // keyed by shapeKey (and hum)
      current: null, // current active shapeKey

      // Sequencer
      isSequencerMode: false,
      isRecording: false,
      currentRecordSlot: -1,
      sequence: Array(8).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null, // (legacy, unused but kept for drop‑in)
      sequenceStepIndex: 0,
      stepTime: 400,

      // Audio Signature
      audioSignaturePlaying: false,
      audioSignatureTimer: null,
      audioSignatureStepIndex: 0,

      // Seed / presets
      seed,
      presets: {}
    };
  }

  // Lifecycle ---------------------------------------------------------------
  connectedCallback() {
    const $ = (tag, opts) => Object.assign(document.createElement(tag), opts);

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
              <li>Right‑click a box to clear.</li>
              <li>Set <b>Step Time</b> for speed.</li>
              <li>Press <b>Play Sequence</b> to loop.</li>
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
    this._sequencerComponent.addEventListener('seq-record-start', this._onSeqRecordStart);
    this._sequencerComponent.addEventListener('seq-step-cleared', this._onSeqStepCleared);
    this._sequencerComponent.addEventListener('seq-step-recorded', this._onSeqStepRecorded);
    this._sequencerComponent.addEventListener('seq-play-started', this._onSeqPlayStarted);
    this._sequencerComponent.addEventListener('seq-play-stopped', this._onSeqPlayStopped);
    this._sequencerComponent.addEventListener('seq-step-advance', this._onSeqStepAdvance);
    this._sequencerComponent.addEventListener('seq-step-time-changed', this._onSeqStepTimeChanged);

    // Populate shape selector
    const shapeOptions = [{ value: this.humKey, label: this.humLabel }]
      .concat(this.shapes.map(key => ({ value: key, label: this.shapeLabels[key] })));
    this._controls.setShapes(shapeOptions);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);

    this._sequencerComponent.removeEventListener('seq-record-start', this._onSeqRecordStart);
    this._sequencerComponent.removeEventListener('seq-step-cleared', this._onSeqStepCleared);
    this._sequencerComponent.removeEventListener('seq-step-recorded', this._onSeqStepRecorded);
    this._sequencerComponent.removeEventListener('seq-play-started', this._onSeqPlayStarted);
    this._sequencerComponent.removeEventListener('seq-play-stopped', this._onSeqPlayStopped);
    this._sequencerComponent.removeEventListener('seq-step-advance', this._onSeqStepAdvance);
    this._sequencerComponent.removeEventListener('seq-step-time-changed', this._onSeqStepTimeChanged);
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

  // Helpers ----------------------------------------------------------------
  _eachChain(fn) { for (const k in this.state.chains) fn(this.state.chains[k], k); }
  _disposeChain(chain) {
    Object.values(chain).forEach(n => {
      try { n.stop?.(); } catch {}
      try { n.dispose?.(); } catch {}
    });
  }
  _rng(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000);
  }

  // Presets / synthesis -----------------------------------------------------
  deterministicPreset(seed, shape) {
    const rng = this._rng(`${seed}_${shape}`);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng();
    const mode = modeRoll < .18 ? 0 : modeRoll < .56 ? 1 : modeRoll < .85 ? 2 : 3;
    const oscCount = mode === 3 ? 2 + (rng() > .7 ? 1 : 0) : 1 + (rng() > .6 ? 1 : 0);
    const oscs = Array.from({ length: oscCount }, () => [types[(rng() * types.length) | 0], notes[(rng() * notes.length) | 0]]);
    let lfoRate, lfoMin, lfoMax, filterBase, env;
    if (mode === 0) { lfoRate = .07 + rng() * .3; lfoMin = 400 + rng() * 400; lfoMax = 900 + rng() * 600; filterBase = 700 + rng() * 500; env = { attack: .005 + rng() * .03, decay: .04 + rng() * .08, sustain: .1 + rng() * .2, release: .03 + rng() * .1 }; }
    else if (mode === 1) { lfoRate = .25 + rng() * 8; lfoMin = 120 + rng() * 700; lfoMax = 1200 + rng() * 1400; filterBase = 300 + rng() * 2400; env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 }; }
    else if (mode === 2) { lfoRate = 6 + rng() * 20; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400; env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 }; }
    else { lfoRate = 24 + rng() * 36; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400; env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: .7 + rng() * .2, release: 8 + rng() * 24 }; }
    return {
      osc1: oscs[0],
      osc2: oscs[1] || null,
      filter: filterBase,
      filterQ: .6 + rng() * .7,
      lfo: [lfoRate, lfoMin, lfoMax],
      envelope: env,
      reverb: { wet: mode === 3 ? .4 + rng() * .5 : .1 + rng() * .5, roomSize: mode === 3 ? .85 + rng() * .12 : .6 + rng() * .38 },
      colorSpeed: .06 + rng() * .22,
      shapeDrift: .0006 + rng() * .0032,
      seed
    };
  }
  loadPresets(seed) {
    this.state.presets = Object.fromEntries(this.shapes.map(k => [k, this.deterministicPreset(seed, k)]));
  }

  async bufferHumChain() {
    const { Tone, chains } = this.state;
    if (!Tone) return;
    if (chains[this.humKey]) { this._disposeChain(chains[this.humKey]); delete chains[this.humKey]; }
    try {
      const osc = new Tone.Oscillator('A0', 'sine').start();
      const filter = new Tone.Filter(80, 'lowpass');
      filter.Q.value = 0.5;
      const volume = new Tone.Volume(-25);
      const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
      const analyser = Tone.context.createAnalyser();
      analyser.fftSize = 2048;
      osc.connect(volume); volume.connect(filter); filter.connect(reverb); filter.connect(analyser);
      chains[this.humKey] = { osc, volume, filter, reverb, analyser };
    } catch (e) {
      console.error('Error buffering hum chain', e);
      delete chains[this.humKey];
    }
  }

  async bufferShapeChain(shape) {
    if (shape === this.humKey) return this.bufferHumChain();
    const { Tone, presets, chains } = this.state, pr = presets[shape];
    if (!pr || !Tone) return;
    if (chains[shape]) { this._disposeChain(chains[shape]); delete chains[shape]; }
    try {
      const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const volume = new Tone.Volume(5);
      const filter = new Tone.Filter(pr.filter, 'lowpass');
      filter.Q.value = pr.filterQ;
      const lfo = new Tone.LFO(...pr.lfo).start();
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

      chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
    } catch (e) {
      console.error('Error buffering chain for shape', shape, e);
      delete chains[shape];
    }
  }

  setActiveChain(shape) {
    // Disconnect all reverbs from destination first
    this._eachChain(chain => chain.reverb?.disconnect());

    const chain = this.state.chains[shape];
    chain?.reverb?.toDestination();
    this.state.current = shape;

    if (chain?.analyser) {
      Object.assign(this._canvas, { analyser: chain.analyser, isAudioStarted: true, isPlaying: this.state.isPlaying });
    } else {
      Object.assign(this._canvas, { isAudioStarted: true, isPlaying: this.state.isPlaying });
    }

    if (shape === this.humKey) {
      Object.assign(this._canvas, { shapeKey: this.humKey, preset: null });
    }
  }

  disposeAllChains() {
    this._eachChain(chain => this._disposeChain(chain));
    this.state.chains = {};
    this.state.current = null;
  }

  // App state / reset -------------------------------------------------------
  resetState() {
    this.disposeAllChains();
    if (this.state.sequencePlaying) this.stopSequence();
    if (this.state.audioSignaturePlaying) this.stopAudioSignature();

    const { seed, Tone } = this.state;
    this.state = this.defaultState(seed);
    this.state.Tone = Tone;

    this.loadPresets(seed);
    this.bufferHumChain();

    const rand = this._rng(seed);
    const firstShape = this.shapes[(rand() * this.shapes.length) | 0];
    Object.assign(this._canvas, {
      preset: this.state.presets[firstShape],
      shapeKey: firstShape,
      mode: 'seed',
      isAudioStarted: false,
      isPlaying: false
    });
    this.state.current = this.humKey;

    this._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.humKey });

    this.state.isSequencerMode = false;
    this._sequencerComponent.style.display = 'none';
    this._main.style.overflow = 'hidden';

    this.state.sequence = Array(8).fill(null);
    this.updateSequencerState();
  }

  // Audio power: unlock / start / stop -------------------------------------
  async unlockAudioAndBufferInitial() {
    const s = this.state;

    if (s.initialBufferingStarted && !s.initialShapeBuffered) {
      this._loader.textContent = 'Still preparing initial synth, please wait...';
      return;
    }
    if (s.isPlaying) return this.stopAudioAndDraw();

    if (s.contextUnlocked) {
      if (s.initialShapeBuffered) {
        this.setActiveChain(this.humKey);
        s.isPlaying = true;
        this._updateControls({ isAudioStarted: true, isPlaying: true });
        this._loader.textContent = 'Audio resumed (hum).';
        this._canvas.isPlaying = true;
        return;
      } else {
        this._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.';
        return;
      }
    }

    this._loader.textContent = 'Unlocking AudioContext...';
    try {
      const Tone = s.Tone;
      if (!Tone) throw new Error('Tone.js not available');

      const contextToResume = Tone.getContext?.() || Tone.context;
      let contextResumed = false;
      if (contextToResume?.resume) { await contextToResume.resume(); contextResumed = true; }
      else if (Tone.start) { await Tone.start(); contextResumed = true; }
      if (!contextResumed) throw new Error('Could not resume AudioContext');

      s.contextUnlocked = true;
      s.initialBufferingStarted = true;
      this._loader.textContent = `Preparing ${this.humLabel} synth...`;

      await this.bufferHumChain();
      this.setActiveChain(this.humKey);
      s.initialShapeBuffered = true;
      s.isPlaying = true;
      this._canvas.isPlaying = true;

      this._updateControls({ isAudioStarted: true, isPlaying: true });
      this._loader.textContent = 'Ready. Audio: ' + this.humLabel;

      // Opportunistically buffer all shapes in the background (yielding per shape)
      (async () => {
        for (const shape of this.shapes) {
          if (!s.contextUnlocked) break;
          try { await this.bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); }
          await new Promise(r => setTimeout(r, 0));
        }
      })();
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
      this._loader.textContent = 'Failed to unlock AudioContext.';
      s.contextUnlocked = false;
      s.initialBufferingStarted = false;
      s.initialShapeBuffered = false;
    }
  }

  stopAudioAndDraw() {
    const s = this.state;
    if (!s.isPlaying && !s.initialBufferingStarted) return;

    s.isPlaying = false;
    s.initialBufferingStarted = false;
    s.initialShapeBuffered = false;

    this.disposeAllChains();
    if (s.sequencePlaying) this.stopSequence();
    if (s.audioSignaturePlaying) this.stopAudioSignature();

    this._canvas.isPlaying = false;
    this._canvas.isAudioStarted = false;

    this.resetState();
  }

  // UI / controls -----------------------------------------------------------
  _updateControls({ isAudioStarted = this.state.contextUnlocked, isPlaying = this.state.isPlaying, isMuted = this.state.Tone?.Destination?.mute, shapeKey = this.state.current, sequencerVisible = this.state.isSequencerMode } = {}) {
    this._controls.updateState({ isAudioStarted, isPlaying, isMuted, shapeKey, sequencerVisible });
  }

  _onToneReady() {
    this.state.Tone = window.Tone;
    this.loadPresets(this.state.seed);
    this.bufferHumChain();
    const initialShape = this.shapes[(this._rng(this.state.seed)() * this.shapes.length) | 0];
    Object.assign(this._canvas, { preset: this.state.presets[initialShape], shapeKey: initialShape, mode: 'seed' });
    this.state.current = this.humKey;
    this._controls.disableAll?.(false);
    this._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.humKey, sequencerVisible: false });
    this._loader.textContent = 'Tone.js loaded. Click “POWER ON” or the image to begin.';
  }

  _onStartRequest() { this.unlockAudioAndBufferInitial(); }

  _onMuteToggle() {
    const s = this.state;
    if (!s.Tone || !s.contextUnlocked) return;
    const mute = s.Tone.Destination.mute = !s.Tone.Destination.mute;
    this._updateControls({ isMuted: mute });
    this._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
    this._canvas.isPlaying = s.isPlaying && !mute;
  }

  _onShapeChange(e) {
    const shapeKey = e?.detail?.shapeKey;
    if (!shapeKey) return;

    const s = this.state;
    s.current = shapeKey;

    if (shapeKey === this.humKey) {
      Object.assign(this._canvas, { shapeKey: this.humKey, preset: null });
    } else if (this.shapes.includes(shapeKey)) {
      Object.assign(this._canvas, { shapeKey, preset: s.presets[shapeKey] });
    }

    if (s.contextUnlocked && s.initialShapeBuffered) this.setActiveChain(shapeKey);
    this._canvas.mode = (s.contextUnlocked && s.initialShapeBuffered) ? (s.isPlaying ? 'live' : 'seed') : 'seed';

    this._updateControls({ shapeKey });
  }

  _onToggleSequencer() {
    const s = this.state;
    s.isSequencerMode = !s.isSequencerMode;
    this._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';

    // Layout tweaks when sequencer is visible
    if (s.isSequencerMode) {
      this._main.style.overflow = 'auto';
      if (this._canvasContainer) { this._canvasContainer.style.maxHeight = '60vh'; this._canvasContainer.style.flex = '0 0 auto'; }
      if (this._canvas) { this._canvas.style.maxHeight = '60vh'; }
      this.updateSequencerState();
    } else {
      this._main.style.overflow = 'hidden';
      if (this._canvasContainer) { this._canvasContainer.style.maxHeight = ''; this._canvasContainer.style.flex = ''; }
      if (this._canvas) { this._canvas.style.maxHeight = ''; }
      s.isRecording = false;
      s.currentRecordSlot = -1;
      if (s.sequencePlaying) this.stopSequence();
    }

    this._updateControls();
  }


  // AUDIO SIGNATURE GENERATION ------------------------------------------------

  _onAudioSignature() {
    const s = this.state;
    
    // Don't start if audio isn't ready or already playing a signature
    if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
    
    // Stop any existing sequence
    if (s.sequencePlaying) this.stopSequence();
    
    // Deterministically assign unique algorithms to shapes (1-10)
    const algorithmMap = this._getUniqueAlgorithmMapping(s.seed);
    
    // Get algorithm for current shape
    const algorithm = algorithmMap[s.current] || 1;
    
    // Generate deterministic sequence using selected algorithm
    const audioSignatureSequence = this.generateAudioSignature(s.seed, algorithm);
    
    // Start playback
    this.playAudioSignature(audioSignatureSequence, algorithm);
    
    this._loader.textContent = 'Playing Audio Signature...';
  }

  _getUniqueAlgorithmMapping(seed) {
    // Create deterministic unique mapping from shapes to algorithms (1-10)
    const rng = this._rng(`${seed}_unique_algo_mapping`);
    
    // All shape keys
    const shapeKeys = [this.humKey, ...this.shapes]; // 10 shapes total
    
    // Create array of algorithms 1-10
    const algorithms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    // Shuffle algorithms deterministically based on seed
    for (let i = algorithms.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [algorithms[i], algorithms[j]] = [algorithms[j], algorithms[i]];
    }
    
    // Create mapping
    const algorithmMap = {};
    shapeKeys.forEach((shapeKey, index) => {
      algorithmMap[shapeKey] = algorithms[index];
    });
    
    return algorithmMap;
  }

  generateAudioSignature(seed, algorithm = 1) {
    const rng = this._rng(`${seed}_audio_signature_v${algorithm}`);
    
    switch(algorithm) {
      case 1:
        // Original random selection
        const sequence1 = [];
        for (let i = 0; i < 32; i++) {
          const shapeIndex = Math.floor(rng() * 10);
          sequence1.push(shapeIndex);
        }
        return sequence1;
        
      case 2:
        // Palette-based with repetition avoidance
        return this._generateSignatureWithConstraints(seed, {
          steps: 32,
          paletteSize: 6,
          pRepeat: 0.35,
          pHum: 0.15,
          pSilence: 0.2,
          avoidBackAndForth: true
        });
        
      case 3:
        // Rhythmic pattern generator
        const sequence3 = [];
        const patternLength = 8;
        const pattern = [];
        for (let i = 0; i < patternLength; i++) {
          pattern.push(Math.floor(rng() * 10));
        }
        for (let i = 0; i < 32; i++) {
          sequence3.push(pattern[i % patternLength]);
        }
        return sequence3;
        
      case 4:
        // Ascending/descending sequences
        const sequence4 = [0];
        let current = 0;
        for (let i = 1; i < 32; i++) {
          const direction = rng() > 0.5 ? 1 : -1;
          const step = Math.floor(rng() * 3) + 1;
          current = Math.max(0, Math.min(9, current + (direction * step)));
          sequence4.push(current);
        }
        return sequence4;
        
      case 5:
        // Cluster-based with longer notes
        const sequence5 = [];
        let clusterValue = Math.floor(rng() * 10);
        for (let i = 0; i < 32; ) {
          const clusterLength = Math.min(Math.floor(rng() * 6) + 2, 32 - i);
          for (let j = 0; j < clusterLength; j++) {
            sequence5.push(clusterValue);
            i++;
          }
          clusterValue = Math.floor(rng() * 10);
        }
        return sequence5;
        
      case 6:
        // Binary rhythm (sparse activation)
        const sequence6 = [];
        for (let i = 0; i < 32; i++) {
          sequence6.push(rng() > 0.7 ? Math.floor(rng() * 9) + 1 : 0);
        }
        return sequence6;
        
      case 7:
        // Fibonacci-inspired spacing
        const sequence7 = new Array(32).fill(0);
        let pos = 0;
        let a = 1, b = 1;
        while (pos < 32) {
          sequence7[pos] = Math.floor(rng() * 9) + 1;
          const next = a + b;
          a = b;
          b = next;
          pos += next;
        }
        return sequence7;
        
      case 8:
        // Ping-pong between two values
        const sequence8 = [];
        const valA = Math.floor(rng() * 10);
        const valB = Math.floor(rng() * 10);
        for (let i = 0; i < 32; i++) {
          sequence8.push(i % 2 === 0 ? valA : valB);
        }
        return sequence8;
        
      case 9:
        // Exponential decay pattern
        const sequence9 = [];
        let startValue = Math.floor(rng() * 9) + 1;
        for (let i = 0; i < 32; i++) {
          if (rng() < 0.2 || startValue === 0) {
            startValue = Math.floor(rng() * 10);
          }
          sequence9.push(startValue);
          if (rng() > 0.7) startValue = Math.max(0, startValue - 1);
        }
        return sequence9;
        
      case 10:
        // Chaos with periodic reset
        const sequence10 = [];
        let chaosValue = Math.floor(rng() * 10);
        for (let i = 0; i < 32; i++) {
          if (i % 8 === 0) {
            chaosValue = Math.floor(rng() * 10);
          } else {
            if (rng() > 0.6) {
              chaosValue = Math.floor(rng() * 10);
            }
          }
          sequence10.push(chaosValue);
        }
        return sequence10;
        
      default:
        return this._generateSignatureWithConstraints(seed);
    }
  }

  _generateSignatureWithConstraints(seed, {
    steps = 32,
    paletteSize = 6,
    pRepeat = 0.35,
    pHum = 0.15,
    pSilence = 0.2,
    avoidBackAndForth = true
  } = {}) {
    const rng = this._rng(`${seed}_audio_signature_constrained`);
    const sequence = [];
    const paletteCount = Math.max(1, Math.min(9, paletteSize));

    let last = null;
    let prevNonHum = null;

    for (let i = 0; i < steps; i++) {
      if (rng() < pSilence) {
        sequence.push(null);
        continue;
      }

      const roll = rng();
      let next;

      if (roll < pHum) {
        next = 0;
      } else if (roll < pHum + pRepeat && prevNonHum !== null) {
        next = prevNonHum;
      } else {
        do {
          next = 1 + Math.floor(rng() * paletteCount);
          if (avoidBackAndForth && last !== null && last >= 1 && next >= 1) {
            if (sequence.length >= 2 && sequence[sequence.length - 2] === next) {
              next = null;
            }
          }
        } while (next === null);
      }

      sequence.push(next);
      if (next !== null) {
        if (next >= 1) prevNonHum = next;
        last = next;
      }
    }

    return sequence;
  }

  playAudioSignature(sequence, algorithm = 1) {
    const s = this.state;
    s.audioSignaturePlaying = true;
    s.audioSignatureStepIndex = 0;
    
    // Algorithm-specific timing
    let stepTime;
    switch(algorithm) {
      case 3:
      case 7:
        stepTime = 100; // Faster for rhythmic patterns
        break;
      case 5:
        stepTime = 150; // Slower for clusters
        break;
      case 10:
        stepTime = 200; // Very slow for chaos
        break;
      default:
        stepTime = 125; // Default 16th notes at 120 BPM
    }
    
    const playStep = () => {
      if (!s.audioSignaturePlaying) return;
      
      const stepIndex = s.audioSignatureStepIndex;
      const shapeIndex = sequence[stepIndex];
      
      // Handle null values (silence)
      if (shapeIndex !== null) {
        let shapeKey;
        if (shapeIndex === 0) {
          shapeKey = this.humKey;
        } else {
          shapeKey = this.shapes[shapeIndex - 1];
        }
        
        if (shapeKey) {
          this._updateControls({ shapeKey });
          this._onShapeChange({ detail: { shapeKey } });
        }
      }
      
      s.audioSignatureStepIndex++;
      
      if (s.audioSignatureStepIndex >= sequence.length) {
        this._updateControls({ shapeKey: this.humKey });
        this._onShapeChange({ detail: { shapeKey: this.humKey } });
        
        s.audioSignatureTimer = setTimeout(() => {
          s.audioSignaturePlaying = false;
          s.audioSignatureTimer = null;
          this._loader.textContent = 'Audio Signature complete.';
        }, stepTime);
        return;
      }
      
      s.audioSignatureTimer = setTimeout(playStep, stepTime);
    };
    
    playStep();
  }

// End AUDIO SIGNATURE GENERATION ------------------------------------------------

// End AUDIO SIGNATURE GENERATION ------------------------------------------------

//   // AUDIO SIGNATURE GENERATION ------------------------------------------------


//   _onAudioSignature() {
//     const s = this.state;
    
//     // Don't start if audio isn't ready or already playing a signature
//     if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
    
//     // Stop any existing sequence
//     if (s.sequencePlaying) this.stopSequence();
    
//     // Generate deterministic 32-step sequence
//     const audioSignatureSequence = this.generateAudioSignature(s.seed);
    
//     // Start playback
//     this.playAudioSignature(audioSignatureSequence);
    
//     this._loader.textContent = 'Playing Audio Signature...';
//   }




// // OG AUDIO SIGNATURE GENERATION Snippet 
// generateAudioSignature(seed) {
//     // Use seed + "audio_signature" for deterministic generation
//     const rng = this._rng(`${seed}_audio_signature`);
//     const sequence = [];
    
//     // Generate 32 steps (32 16th notes)
//     for (let i = 0; i < 32; i++) {
//       // Choose from 0 (hum) + 9 shapes = 10 total options
//       const shapeIndex = Math.floor(rng() * 10);
//       sequence.push(shapeIndex);
//     }
    
//     return sequence;
//   }

//   playAudioSignature(sequence) {
//     const s = this.state;
//     s.audioSignaturePlaying = true;
//     s.audioSignatureStepIndex = 0;
    
//     // 120 BPM = 500ms per quarter note, 125ms per 16th note
//     const stepTime = 125;
    
//     const playStep = () => {
//       if (!s.audioSignaturePlaying) return;
      
//       const stepIndex = s.audioSignatureStepIndex;
//       const shapeIndex = sequence[stepIndex];
      
//       // Map shape index to shape key
//       let shapeKey;
//       if (shapeIndex === 0) {
//         shapeKey = this.humKey;
//       } else {
//         shapeKey = this.shapes[shapeIndex - 1];
//       }
      
//       // Switch to the shape for this step
//       if (shapeKey) {
//         this._updateControls({ shapeKey });
//         this._onShapeChange({ detail: { shapeKey } });
//       }
      
//       // Advance to next step
//       s.audioSignatureStepIndex++;
      
//       // Check if we've completed all 32 steps
//     if (s.audioSignatureStepIndex >= sequence.length) {
//       // Add final step to return to hum (zero) for clean ending
//       this._updateControls({ shapeKey: this.humKey });
//       this._onShapeChange({ detail: { shapeKey: this.humKey } });
      
//       // End the signature after the final hum step
//       s.audioSignatureTimer = setTimeout(() => {
//         s.audioSignaturePlaying = false;
//         s.audioSignatureTimer = null;
//         this._loader.textContent = 'Audio Signature complete.';
//       }, stepTime);
//       return;
//     }
      
//       // Schedule next step
//       s.audioSignatureTimer = setTimeout(playStep, stepTime);
//     };
    
//     // Start the sequence
//     playStep();
//   }

//   // V2 Snippet

// //   generateAudioSignature(seed, {
// //   steps = 32,
// //   paletteSize = 6,          // 1..9 usable shapes
// //   pRepeat = 0.35,           // chance to repeat last non-hum shape
// //   pHum = 0.15,              // chance to drop to hum
// //   pSilence = 0.2,           // chance to insert a silence
// //   avoidBackAndForth = true  // reduce A-B-A-B ping-pong
// // } = {}) {
// //   const rng = this._rng(`${seed}_audio_signature_v3`);
// //   const sequence = [];
// //   const paletteCount = Math.max(1, Math.min(9, paletteSize));

// //   let last = null;
// //   let prevNonHum = null;

// //   for (let i = 0; i < steps; i++) {
// //     if (rng() < pSilence) {
// //       sequence.push(null);
// //       continue;
// //     }

// //     const roll = rng();
// //     let next;

// //     if (roll < pHum) {
// //       next = 0;
// //     } else if (roll < pHum + pRepeat && prevNonHum !== null) {
// //       next = prevNonHum;
// //     } else {
// //       // pick a new non-hum shape
// //       do {
// //         next = 1 + Math.floor(rng() * paletteCount);
// //         if (avoidBackAndForth && last !== null && last >= 1 && next >= 1) {
// //           // avoid immediate A-B-A by rejecting the one we just came from
// //           if (sequence.length >= 2 && sequence[sequence.length - 2] === next) {
// //             next = null; // force repick
// //           }
// //         }
// //       } while (next === null);
// //     }

// //     sequence.push(next);
// //     if (next !== null) {
// //       if (next >= 1) prevNonHum = next;
// //       last = next;
// //     }
// //   }

// //   return sequence;
// // }

// // playAudioSignature(sequence, {
// //   bpm = 120,
// //   stepDivision = 4,     // 4 = 16ths, 3 = 8th triplets, 2 = 8ths
// //   humanizeMs = 4,
// // } = {}) {
// //   const s = this.state;
// //   s.audioSignaturePlaying = true;
// //   s.audioSignatureStepIndex = 0;

// //   const stepMs = (60000 / bpm) / stepDivision;

// //   const playStep = () => {
// //     if (!s.audioSignaturePlaying) return;

// //     const i = s.audioSignatureStepIndex;
// //     const val = sequence[i];

// //     if (val !== null) {
// //       const shapeKey = (val === 0) ? this.humKey : this.shapes[val - 1];
// //       if (shapeKey) {
// //         this._updateControls({ shapeKey });
// //         this._onShapeChange({ detail: { shapeKey } });
// //       }
// //     }

// //     s.audioSignatureStepIndex++;

// //     if (s.audioSignatureStepIndex >= sequence.length) {
// //       this._updateControls({ shapeKey: this.humKey });
// //       this._onShapeChange({ detail: { shapeKey: this.humKey } });
// //       s.audioSignatureTimer = setTimeout(() => {
// //         s.audioSignaturePlaying = false;
// //         s.audioSignatureTimer = null;
// //         this._loader.textContent = 'Audio Signature complete.';
// //       }, stepMs);
// //       return;
// //     }

// //     const jitter = humanizeMs ? (Math.floor((this._rng('humanize3'+i)() * 2 - 1) * humanizeMs)) : 0;
// //     s.audioSignatureTimer = setTimeout(playStep, Math.max(0, stepMs + jitter));
// //   };

// //   playStep();
// // }


// // End AUDIO SIGNATURE GENERATION ------------------------------------------------

  stopAudioSignature() {
    const s = this.state;
    if (s.audioSignatureTimer) {
      clearTimeout(s.audioSignatureTimer);
      s.audioSignatureTimer = null;
    }
    s.audioSignaturePlaying = false;
    s.audioSignatureStepIndex = 0;
  }

  _handleSeedSubmit(e) {
    e.preventDefault();
    const input = this.shadowRoot.getElementById('seedInput');
    const val = (input?.value?.trim()) || 'default';
    if (val === this.state.seed) return;
    this.resetToSeed(val);
  }

  resetToSeed(newSeed) {
    this.stopAudioAndDraw();
    this.state.seed = newSeed;
    this.loadPresets(newSeed);
    this.resetState();
    this._loader.textContent = 'Seed updated. Click POWER ON.';
  }

  // Keyboard: shape switching / recording ----------------------------------
  _handleKeyDown(e) {
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
        if (idx >= 0) Object.assign(this._canvas, { shapeKey, preset: s.presets[shapeKey], mode: 'live' });
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey });
      }
      e.preventDefault();
      return;
    }

    // Live shape switch
    this._updateControls({ shapeKey });
    this._onShapeChange({ detail: { shapeKey } });
    e.preventDefault();
  }
  _handleKeyUp(_) {}
  _handleBlur() {}

  // Sequencer bridge --------------------------------------------------------
  _onSeqRecordStart(e) {
    const slotIndex = e?.detail?.slotIndex ?? -1;
    this.state.isRecording = true;
    this.state.currentRecordSlot = slotIndex;
    this._updateControls();
  }

  _onSeqStepCleared(e) {
    const slotIndex = e?.detail?.slotIndex;
    if (typeof slotIndex !== 'number') return;

    this.state.sequence[slotIndex] = null;

    // If we were recording in this slot, advance
    if (this.state.isRecording && this.state.currentRecordSlot === slotIndex) {
      this.state.currentRecordSlot = (slotIndex + 1) % 8;
      if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    }
  }

  _onSeqStepRecorded(e) {
    const { slotIndex, value, nextSlot, isRecording } = e?.detail ?? {};
    if (typeof slotIndex === 'number') this.state.sequence[slotIndex] = value;
    if (typeof nextSlot === 'number') this.state.currentRecordSlot = nextSlot;
    if (typeof isRecording === 'boolean') this.state.isRecording = isRecording;
  }

  _onSeqPlayStarted(e) {
    const stepTime = e?.detail?.stepTime;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    if (typeof stepTime === 'number') this.state.stepTime = stepTime;
    this._updateControls();
  }

  _onSeqPlayStopped() {
    this.state.sequencePlaying = false;
    this.state.sequenceStepIndex = 0;
    this._updateControls();
  }

  _onSeqStepAdvance(e) {
    const d = e?.detail || {};
    const stepIndex = (typeof d.stepIndex === 'number') ? d.stepIndex
                     : (typeof d.index === 'number') ? d.index
                     : this.state.sequenceStepIndex;
    const value = d.value;

    this.state.sequenceStepIndex = stepIndex;

    // Map numeric step value to shape key
    let shapeKey;
    if (value === 0) shapeKey = this.humKey;
    else if (value >= 1 && value <= this.shapes.length) shapeKey = this.shapes[value - 1];
    else return; // ignore unknown values

    this._updateControls({ shapeKey });
    this._onShapeChange({ detail: { shapeKey } });
  }

  _onSeqStepTimeChanged(e) {
    const stepTime = e?.detail?.stepTime;
    if (typeof stepTime === 'number') this.state.stepTime = stepTime;
  }

  // Sequencer control surface ----------------------------------------------
  updateSequencerState() {
    if (!this._sequencerComponent) return;
    this._sequencerComponent.updateState({
      isRecording: this.state.isRecording,
      currentRecordSlot: this.state.currentRecordSlot,
      sequence: [...this.state.sequence],
      sequencePlaying: this.state.sequencePlaying,
      sequenceStepIndex: this.state.sequenceStepIndex,
      stepTime: this.state.stepTime
    });
  }

  // Public proxies to child component --------------------------------------
  recordStep(number) { this._sequencerComponent?.recordStep(number); }
  playSequence() { this._sequencerComponent?.playSequence(); }
  stopSequence() { this._sequencerComponent?.stopSequence(); }
}

customElements.define('osc-app', OscApp2);
