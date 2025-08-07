// osc-app.js
// Orchestrates tone-loader, oscilloscope, osc-controls, and osc-sequencer.
// Maintains zero-latency by direct signal routing and synchronous state updates.

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      isPlaying: false,
      isSequencerMode: false,
      Tone: null,
      chains: {},
      current: null,
      seed: '5s567g67',
      presets: {},
      contextUnlocked: false,
      initialBufferingStarted: false,
      initialShapeBuffered: false
    };

    this.shapes = ['circle','square','butterfly','lissajous','spiro','harmonograph'];
    this.shapeLabels = {
      circle: 'Circle',
      square: 'Square',
      butterfly: 'Butterfly',
      lissajous: 'Lissajous',
      spiro: 'Spirograph',
      harmonograph: 'Harmonograph'
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
    this._onSequencerStep = this._onSequencerStep.bind(this);
  }

  connectedCallback() {
    const wrapper = document.createElement('div');
    wrapper.id = 'appWrapper';

    const aside = document.createElement('aside');
    aside.id = 'instructions';
    aside.innerHTML = `<h2>How to Use</h2>
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
</ol>
<form id="seedForm" autocomplete="off">
  <label for="seedInput">Seed (deterministic):</label>
  <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false" />
  <button id="seedSetBtn" type="submit">Set Seed</button>
</form>`;

    const main = document.createElement('div');
    main.id = 'main';

    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'canvasContainer';
    this._oscilloscope = document.createElement('scope-canvas');
    canvasContainer.appendChild(this._oscilloscope);

    this._controls = document.createElement('osc-controls');
    this._sequencer = document.createElement('osc-sequencer');
    this._sequencer.style.display = 'none';

    this._loader = document.createElement('div');
    this._loader.id = 'loader';
    this._loader.textContent = 'Initializing...';

    main.append(canvasContainer, this._controls, this._sequencer, this._loader);
    wrapper.append(aside, main);

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; width: 100%; height: 100%; }
      #appWrapper {
        display: grid;
        grid-template-columns: minmax(220px, 340px) 1fr;
        height: 100vh;
      }
      @media (max-width:900px) {
        #appWrapper { grid-template-columns: 1fr; }
        aside#instructions { max-width: none; }
      }
      aside#instructions {
        background: linear-gradient(90deg, #181818 97%, #0000);
        color: #e1d9ce; font-size: 1.07rem; padding: 2.2rem 1.2rem;
        line-height: 1.65; overflow-y: auto; border-right: 2px solid #2229;
      }
      aside#instructions h2 { color: #f7c469; }
      #seedForm { margin-top: auto; background: #1c1c1c; padding: 1.1em;
        border-radius: 8px; border: 1px solid #292929; box-shadow: 0 0 9px #0006;
        display: flex; flex-direction: column; gap: 0.5em;
      }
      #seedForm input, #seedForm button { font-family: inherit; padding: 0.35em 0.5em; border-radius: 4px; }
      #seedForm input { border: 1px solid #444; background: #232325; color: #ffecb3; }
      #seedForm button { border: 1px solid #666; background: #212; color: #ffe0a3; cursor: pointer; }
      #main { background: #000; display: flex; flex-direction: column; }
      #canvasContainer { flex: 1; display: flex; align-items: center; justify-content: center; }
      #loader { text-align: center; color: #aaa; min-height: 1.3em; margin-top: .1em; font-style: italic; }
    `;

    this.shadowRoot.append(style, document.createElement('tone-loader'), wrapper);

    // Setup
    this.shadowRoot.querySelector('#seedInput').value = this.state.seed;
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._sequencer.addEventListener('step', this._onSequencerStep);

    this._oscilloscope.onIndicatorUpdate = (text, active) => {
      this._loader.textContent = active ? text : 'Initializing...';
    };

    this.shadowRoot.getElementById('seedForm').addEventListener('submit', this._handleSeedSubmit);

    window.addEventListener('keydown', this._handleKeyDown, { passive: false });
    window.addEventListener('keyup', this._handleKeyUp, { passive: false });
    window.addEventListener('blur', this._handleBlur);

    const shapeOptions = this.shapes.map(k => ({ value: k, label: this.shapeLabels[k] }));
    this._controls.setShapes(shapeOptions);
  }

  mulberry32(seedStr) {
    let a = 0x6d2b79f5 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; ++i) a = Math.imul(a ^ seedStr.charCodeAt(i), 2654435761);
    return () => { a = Math.imul(a ^ (a >>> 15), 1 | a); return ((a >>> 16) & 0xffff) / 0x10000; };
  }

  deterministicPreset(seed, shape) {
    const rng = this.mulberry32(seed + '_' + shape);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng();
    let mode = modeRoll < 0.18 ? 0 : modeRoll < 0.56 ? 1 : modeRoll < 0.85 ? 2 : 3;

    const lfoRate = mode === 0 ? 0.07 + rng() * 0.3 :
                    mode === 1 ? 0.25 + rng() * 8 :
                    mode === 2 ? 6 + rng() * 20 : 24 + rng() * 36;

    const lfoMin = mode === 0 ? 400 + rng() * 400 : mode === 1 ? 120 + rng() * 700 : 80 + rng() * 250;
    const lfoMax = mode === 0 ? 900 + rng() * 600 : mode === 1 ? 1200 + rng() * 1400 : 1500 + rng() * 3500;

    const oscCount = mode === 3 ? 2 + (rng() > 0.7 ? 1 : 0) : 1 + (rng() > 0.6 ? 1 : 0);
    const oscs = [];
    for (let i = 0; i < oscCount; ++i) oscs.push([types[(rng() * types.length) | 0], notes[(rng() * notes.length) | 0]]);

    const filterBase = mode === 0 ? 700 + rng() * 500 : 300 + rng() * 2400;
    const resonance = 0.6 + rng() * 0.7;

    const env = mode === 0 ? { attack: 0.005 + rng() * 0.03, decay: 0.04 + rng() * 0.08, sustain: 0.1 + rng() * 0.2, release: 0.03 + rng() * 0.1 } :
                 mode === 3 ? { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: 0.7 + rng() * 0.2, release: 8 + rng() * 24 } :
                 { attack: 0.03 + rng() * 0.4, decay: 0.1 + rng() * 0.7, sustain: 0.2 + rng() * 0.5, release: 0.2 + rng() * 3 };

    const reverbWet = mode === 3 ? 0.4 + rng() * 0.5 : 0.1 + rng() * 0.5;
    const reverbRoom = mode === 3 ? 0.85 + rng() * 0.12 : 0.6 + rng() * 0.38;
    const colorSpeed = 0.06 + rng() * 0.22;
    const shapeDrift = 0.0006 + rng() * 0.0032;

    return { osc1: oscs[0], osc2: oscs[1] || null, filter: filterBase, filterQ: resonance, lfo: [lfoRate, lfoMin, lfoMax],
      envelope: env, reverb: { wet: reverbWet, roomSize: reverbRoom }, colorSpeed, shapeDrift, seed };
  }

  loadPresets(seed) {
    const presets = {};
    for (const k of this.shapes) presets[k] = this.deterministicPreset(seed, k);
    this.state.presets = presets;
  }

  async bufferShapeChain(shape) {
    const { Tone, presets, chains } = this.state;
    const pr = presets[shape];
    if (!pr || !Tone || chains[shape]) return;

    try {
      const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const volume = new Tone.Volume(5);
      const filter = new Tone.Filter(pr.filter, 'lowpass'); filter.Q.value = pr.filterQ;
      const lfo = new Tone.LFO(pr.lfo[0], pr.lfo[1], pr.lfo[2]).start();
      const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
      const analyser = Tone.context.createAnalyser(); analyser.fftSize = 2048;

      lfo.connect(filter.frequency);
      if (osc2) lfo.connect(osc2.detune);
      osc1.connect(volume); if (osc2) osc2.connect(volume);
      volume.connect(filter); filter.connect(reverb); filter.connect(analyser);

      this.state.chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
    } catch (e) { console.error('Chain error:', shape, e); }
  }

  setActiveChain(shape) {
    const { chains, Tone } = this.state;
    Object.values(chains).forEach(c => c?.reverb?.disconnect());
    const chain = chains[shape];
    chain?.reverb?.toDestination();
    this.state.current = shape;
    if (chain?.analyser) this._oscilloscope.analyser = chain.analyser;
  }

  disposeAllChains() {
    Object.values(this.state.chains).forEach(chain => {
      Object.values(chain).forEach(n => { try { n.stop?.(); n.dispose?.(); } catch (_) {} });
    });
    this.state.chains = {};
    this.state.current = null;
  }

  async unlockAudioAndBufferInitial() {
    const { state } = this;
    if (state.initialBufferingStarted && !state.initialShapeBuffered) {
      this._loader.textContent = 'Still preparing initial synth...';
      return;
    }
    if (state.isPlaying) return this.stopAudioAndDraw();

    if (state.contextUnlocked && state.initialShapeBuffered) {
      this.setActiveChain(this._controls.shadowRoot.querySelector('#shapeSelect').value);
      state.isPlaying = true;
      this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: Tone.Destination.mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
      this._oscilloscope.isPlaying = true;
      this._loader.textContent = 'Audio resumed.';
      return;
    }

    this._loader.textContent = 'Unlocking AudioContext...';
    try {
      const ctx = state.Tone.getContext?.() || state.Tone.context;
      if (ctx && ctx.resume) await ctx.resume(); else if (state.Tone.start) await state.Tone.start();
      state.contextUnlocked = true;

      const initialShape = this._controls.shadowRoot.querySelector('#shapeSelect').value;
      await this.bufferShapeChain(initialShape);
      this.setActiveChain(initialShape);
      state.initialShapeBuffered = true;
      state.isPlaying = true;
      this._oscilloscope.isPlaying = true;
      this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: initialShape, sequencerVisible: state.isSequencerMode });
      this._loader.textContent = 'Ready. Shape: ' + initialShape;

      // Background buffer others
      this.shapes.forEach(shape => shape !== initialShape && this.bufferShapeChain(shape));
    } catch (e) {
      this._loader.textContent = 'Failed to unlock.';
      state.contextUnlocked = false;
    }
  }

  stopAudioAndDraw() {
    this.disposeAllChains();
    this.state.isPlaying = false;
    this._oscilloscope.isPlaying = false;
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: this.state.Tone?.Destination?.mute, shapeKey: this._controls.shadowRoot.querySelector('#shapeSelect').value, sequencerVisible: this.state.isSequencerMode });
    this._loader.textContent = 'Audio stopped.';
    if (this._sequencer.state.sequencePlaying) this._sequencer.stopSequence();
  }

  _onToneReady() {
    this.state.Tone = window.Tone;
    this.loadPresets(this.state.seed);
    const initialShape = this.shapes[Math.floor(this.mulberry32(this.state.seed)() * this.shapes.length)];
    this.state.current = initialShape;
    this._oscilloscope.shapeKey = initialShape;
    this._oscilloscope.preset = this.state.presets[initialShape];
    this._oscilloscope.mode = 'seed';
    this._controls.disableAll(false);
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: true, shapeKey: initialShape, sequencerVisible: false });
    this._loader.textContent = 'Tone.js loaded. Click to begin.';
  }

  _onStartRequest() { this.unlockAudioAndBufferInitial(); }
  _onMuteToggle() {
    const mute = this.state.Tone.Destination.mute = !this.state.Tone.Destination.mute;
    this._controls.updateState({ isAudioStarted: true, isPlaying: this.state.isPlaying, isMuted: mute, shapeKey: this.state.current, sequencerVisible: this.state.isSequencerMode });
    this._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
    this._oscilloscope.isPlaying = this.state.isPlaying && !mute;
  }

  _onShapeChange(e) {
    const shapeKey = e.detail.shapeKey;
    this.state.current = shapeKey;
    this._oscilloscope.shapeKey = shapeKey;
    this._oscilloscope.preset = this.state.presets[shapeKey];
    if (this.state.contextUnlocked && this.state.initialShapeBuffered) this.setActiveChain(shapeKey);
    this._oscilloscope.mode = this.state.isPlaying ? 'live' : 'seed';
    this._controls.updateState({ isAudioStarted: this.state.contextUnlocked, isPlaying: this.state.isPlaying, isMuted: this.state.Tone?.Destination?.mute, shapeKey, sequencerVisible: this.state.isSequencerMode });
  }

  _onToggleSequencer() {
    this.state.isSequencerMode = !this.state.isSequencerMode;
    this._sequencer.style.display = this.state.isSequencerMode ? 'block' : 'none';
    this._controls.updateState({ sequencerVisible: this.state.isSequencerMode });
    if (this.state.isSequencerMode) {
      this._sequencer.createSequenceUI();
    } else {
      this._sequencer.reset();
    }
  }

  _handleSeedSubmit(e) {
    e.preventDefault();
    const val = this.shadowRoot.getElementById('seedInput').value.trim() || 'default';
    if (val === this.state.seed) return;
    this.resetToSeed(val);
  }

  resetToSeed(newSeed) {
    this.stopAudioAndDraw();
    this.disposeAllChains();
    this.state.contextUnlocked = false;
    this.state.seed = newSeed;
    this.loadPresets(newSeed);
    const rand = this.mulberry32(newSeed);
    const firstShape = this.shapes[(rand() * this.shapes.length) | 0];
    this.state.current = firstShape;
    this._oscilloscope.shapeKey = firstShape;
    this._oscilloscope.preset = this.state.presets[firstShape];
    this._oscilloscope.mode = 'seed';
    this._controls.updateState({ isAudioStarted: false, isPlaying: false, isMuted: true, shapeKey: firstShape, sequencerVisible: this.state.isSequencerMode });
    this._loader.textContent = "Seed updated. Click Start Audio + Draw.";
    this._sequencer.reset();
  }

  _handleKeyDown(e) {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const idx = e.key.charCodeAt(0) - 49;
    if (idx >= 0 && idx < 6) {
      if (this.state.isSequencerMode && this._sequencer.state.isRecording) {
        this._sequencer.recordStep(idx + 1);
        e.preventDefault();
      } else {
        const shapeKey = this.shapes[idx];
        this._controls.updateState({ shapeKey });
        this._onShapeChange({ detail: { shapeKey } });
        e.preventDefault();
      }
    }
  }

  _handleKeyUp() {}
  _handleBlur() {}

  _onSequencerStep(e) {
    this._onShapeChange(e);
  }
}

customElements.define('osc-app', OscApp);