// File: osc-app.js
import { SimpleSampleLoader } from './audional-base64-sample-loader.js';

class OscApp2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = this.defaultState('5s567g67');
    [
      '_onToneReady','_onStartRequest','_onMuteToggle','_onShapeChange',
      '_onToggleSequencer','_handleSeedSubmit','_handleKeyDown','_handleKeyUp','_handleBlur',
      '_onSeqRecordStart', '_onSeqStepCleared', '_onSeqStepRecorded', '_onSeqPlayStarted', 
      '_onSeqPlayStopped', '_onSeqStepAdvance', '_onSeqStepTimeChanged', '_onSeqSampleSelected'
    ].forEach(fn => this[fn] = this[fn].bind(this));
    this.shapes = [
      'circle','square','butterfly','lissajous','spiro',
      'harmonograph','rose','hypocycloid','epicycloid'
    ];
    this.shapeLabels = Object.fromEntries(this.shapes.map(k=>[k, k.charAt(0).toUpperCase()+k.slice(1)]));
    this.humKey = 'hum';
    this.humLabel = 'Power Hum';
    this.samplePlayers = Array.from({ length: 4 }, () => null);
    this.sampleSelection = Array.from({ length: 4 }, () => 0);

    // New: for Tone.Transport sequencer
    this._toneStepId = null;
  }
  defaultState(seed = 'default') {
    return {
      isPlaying: false, isSequencerMode: false, isRecording: false, currentRecordSlot: -1,
      sequence: Array(8).fill(null), sequencePlaying: false, sequenceStepIndex: 0,
      stepTime: 400, Tone: null, chains: {}, current: null, seed, presets: {},
      contextUnlocked: false, initialBufferingStarted: false, initialShapeBuffered: false
    };
  }
  connectedCallback() {
    const $ = (tag, opts) => Object.assign(document.createElement(tag), opts);
    const wrapper = $('div', { id: 'appWrapper' });
    const aside = $('aside', { id: 'instructions' });
    aside.innerHTML = /* ... instructions HTML unchanged ... */ `
      <div>
        <h2>How to Use</h2>
        <ol>
          <li><b>Numbers 1-9:</b><br> Instantly switch between unique sound+visual shapes.</li>
          <li><b>Step Sequencer:</b>
            <ul style="margin:0 0 0 1em; padding:0; font-size:.98em;">
              <li>Click <b>Create Sequence</b> to open.</li>
              <li>Click a box to record steps (use 1-9 keys).</li>
              <li>Right-click a box to clear.</li>
              <li>Set <b>Step Time</b> for sequence speed.</li>
              <li>Press <b>Play Sequence</b> to loop.</li>
            </ul>
          </li>
          <li><b>Mix Sounds:</b> Change shapes while audio is on to layer and blend rich effects.</li>
          <li><b>Toggle Audio:</b> Click the image or use <b>Start Audio</b> button to start/stop.</li>
        </ol>
      </div>
      <form id="seedForm" autocomplete="off" style="margin-top:auto;background:#1c1c1c;padding:1.1em 1em 0.9em 0.9em;border-radius:8px;border:1px solid #292929;">
        <label for="seedInput" style="font-size:0.97em;color:#ffecb3;margin-bottom:0.1em;font-weight:600;">Seed (deterministic):</label>
        <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"
          style="font-family:inherit;padding:0.35em 0.5em;border-radius:4px;border:1px solid #444;background:#232325;color:#ffecb3;font-size:1em;width:100%;margin-bottom:0.2em;letter-spacing:.05em;" />
        <button id="seedSetBtn" type="submit" style="padding:0.3em 1em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:0.97em;transition:background .18s;">Set Seed</button>
      </form>
    `;
    const main = $('div', { id: 'main' });
    const canvasContainer = $('div', { id: 'canvasContainer' });
    this._canvas = $('scope-canvas');
    canvasContainer.appendChild(this._canvas);
    this._controls = $('osc-controls');
    this._sequencerComponent = $('seq-app');
    this._sequencerComponent.style.display = 'none';
    this._loader = $('div', { id: 'loader', textContent: 'Initializing...' });
    main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
    wrapper.append(aside, main);
    this.shadowRoot.append($('style', { textContent: this._style() }), $('tone-loader'), wrapper);

    this.shadowRoot.getElementById('seedInput').value = this.state.seed;
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    this._canvas.onIndicatorUpdate = (text, audioActive) => {
      this._loader.textContent = (!this.state.isPlaying && !this.state.contextUnlocked)
        ? 'Initializing...' : text;
    };
    this.shadowRoot.getElementById('seedForm').addEventListener('submit', this._handleSeedSubmit);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

    // Set up sequencer event listeners
    this._sequencerComponent.addEventListener('seq-record-start', this._onSeqRecordStart);
    this._sequencerComponent.addEventListener('seq-step-cleared', this._onSeqStepCleared);
    this._sequencerComponent.addEventListener('seq-step-recorded', this._onSeqStepRecorded);
    this._sequencerComponent.addEventListener('seq-play-started', this._onSeqPlayStarted);
    this._sequencerComponent.addEventListener('seq-play-stopped', this._onSeqPlayStopped);
    this._sequencerComponent.addEventListener('seq-step-advance', this._onSeqStepAdvance);
    this._sequencerComponent.addEventListener('seq-step-time-changed', this._onSeqStepTimeChanged);

    this._sequencerComponent.addEventListener('seq-sample-selected', this._onSeqSampleSelected);

    const shapeOptions = [{ value: this.humKey, label: this.humLabel }].concat(
      this.shapes.map(key => ({ value: key, label: this.shapeLabels[key] }))
    );
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
    this._sequencerComponent.removeEventListener('seq-sample-selected', this._onSeqSampleSelected);
    this.stopToneSequencer();
  }
  _style() { return /* unchanged */ `
    :host { display:block;width:100%;height:100%; }
    #appWrapper { display:grid;grid-template-columns:minmax(220px,340px) 1fr;grid-template-rows:100vh;gap:0;height:100%; }
    @media (max-width:900px){ #appWrapper{grid-template-columns:1fr;}}
    aside#instructions { background:linear-gradient(90deg,#181818 97%,#0000);color:#e1d9ce;font-size:1.07rem;min-width:210px;max-width:340px;height:100vh;border-right:2px solid #2229;line-height:1.65;box-sizing:border-box;display:flex;flex-direction:column;gap:1.4rem;padding:2.2rem 1.2rem 2.4rem 2.2rem;overflow-y:auto;}
    aside#instructions h2 { color:#f7c469;font-size:1.22rem;margin:0 0 0.95em 0;font-weight:bold;letter-spacing:.04em;}
    #main { width:100%;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;background:#000;}
    #canvasContainer { flex:1 1 0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;}
    #loader { font-size:.98rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin-top:.1em;}
  `}
  _eachChain(fn) { for (const k in this.state.chains) fn(this.state.chains[k], k); }
  _disposeChain(chain) { Object.values(chain).forEach(n => { try{ n.stop?.() }catch{} try{ n.dispose?.() }catch{} }); }
  disposeSamplePlayers() {
    this.samplePlayers.forEach((player, idx) => {
      if (player) {
        try { player.dispose?.(); } catch {}
        this.samplePlayers[idx] = null;
      }
    });
  }
  _rng(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i=0; i<seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return ()=>(a=Math.imul(a^(a>>>15),1|a),((a>>>16)&0xffff)/0x10000);
  }
  deterministicPreset(seed, shape) {
    const rng = this._rng(`${seed}_${shape}`);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng(), mode = modeRoll<.18?0:modeRoll<.56?1:modeRoll<.85?2:3;
    const oscCount = mode===3?2+(rng()>.7?1:0):1+(rng()>.6?1:0);
    const oscs = Array.from({length:oscCount},()=>[types[(rng()*types.length)|0],notes[(rng()*notes.length)|0]]);
    let lfoRate, lfoMin, lfoMax, filterBase, env;
    if(mode===0){ lfoRate=.07+rng()*.3; lfoMin=400+rng()*400; lfoMax=900+rng()*600; filterBase=700+rng()*500; env={attack:.005+rng()*.03,decay:.04+rng()*.08,sustain:.1+rng()*.2,release:.03+rng()*.1}; }
    else if(mode===1){ lfoRate=.25+rng()*8; lfoMin=120+rng()*700; lfoMax=1200+rng()*1400; filterBase=300+rng()*2400; env={attack:.03+rng()*.4,decay:.1+rng()*.7,sustain:.2+rng()*.5,release:.2+rng()*3}; }
    else if(mode===2){ lfoRate=6+rng()*20; lfoMin=80+rng()*250; lfoMax=1500+rng()*3500; filterBase=300+rng()*2400; env={attack:.03+rng()*.4,decay:.1+rng()*.7,sustain:.2+rng()*.5,release:.2+rng()*3}; }
    else{ lfoRate=24+rng()*36; lfoMin=80+rng()*250; lfoMax=1500+rng()*3500; filterBase=300+rng()*2400; env={attack:2+rng()*8,decay:4+rng()*20,sustain:.7+rng()*.2,release:8+rng()*24}; }
    return {
      osc1: oscs[0], osc2: oscs[1]||null, filter: filterBase, filterQ: .6+rng()*.7, lfo: [lfoRate,lfoMin,lfoMax], envelope: env,
      reverb: { wet: mode===3?.4+rng()*.5:.1+rng()*.5, roomSize: mode===3?.85+rng()*.12:.6+rng()*.38 },
      colorSpeed: .06+rng()*.22, shapeDrift: .0006+rng()*.0032, seed
    };
  }
  loadPresets(seed) {
    this.state.presets = Object.fromEntries(this.shapes.map(k=>[k,this.deterministicPreset(seed,k)]));
  }
  async bufferHumChain() {
    const { Tone, chains } = this.state;
    if (!Tone) return;
    if (chains[this.humKey]) this._disposeChain(chains[this.humKey]), delete chains[this.humKey];
    try {
      const osc = new Tone.Oscillator("A0", "sine").start();
      const filter = new Tone.Filter(80, 'lowpass');
      filter.Q.value = 0.5;
      const volume = new Tone.Volume(-25);
      const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
      const analyser = Tone.context.createAnalyser();
      analyser.fftSize = 2048;
      osc.connect(volume); volume.connect(filter); filter.connect(reverb); filter.connect(analyser);
      chains[this.humKey] = { osc, volume, filter, reverb, analyser };
    } catch(e){ console.error('Error buffering hum chain',e); delete chains[this.humKey]; }
  }
  async bufferShapeChain(shape) {
    if (shape === this.humKey) return this.bufferHumChain();
    const { Tone, presets, chains } = this.state, pr = presets[shape];
    if (!pr || !Tone) return;
    if (chains[shape]) this._disposeChain(chains[shape]), delete chains[shape];
    try {
      const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const volume = new Tone.Volume(-20); // Set to -20dB for balance
      const filter = new Tone.Filter(pr.filter, 'lowpass');
      filter.Q.value = pr.filterQ;
      const lfo = new Tone.LFO(...pr.lfo).start();
      const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
      const analyser = Tone.context.createAnalyser(); analyser.fftSize = 2048;
      lfo.connect(filter.frequency); if (osc2) lfo.connect(osc2.detune);
      osc1.connect(volume); if (osc2) osc2.connect(volume);
      volume.connect(filter); filter.connect(reverb); filter.connect(analyser);
      chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
    } catch(e){ console.error('Error buffering chain for shape', shape, e); delete chains[shape]; }
  }
  setActiveChain(shape) {
    this._eachChain(chain => chain.reverb?.disconnect());
    const chain = this.state.chains[shape];
    chain?.reverb?.toDestination();
    this.state.current = shape;
    if (chain?.analyser) {
      Object.assign(this._canvas, { analyser: chain.analyser, isAudioStarted: true, isPlaying: this.state.isPlaying });
    } else Object.assign(this._canvas, { isAudioStarted: true, isPlaying: this.state.isPlaying });
    if (shape === this.humKey) Object.assign(this._canvas, { shapeKey: this.humKey, preset: null });
  }
  disposeAllChains() {
    this._eachChain(chain => this._disposeChain(chain));
    this.state.chains = {};
    this.state.current = null;
  }
  resetState() {
    this.disposeAllChains();
    if (this.state.sequencePlaying) this.stopSequence();
    const { seed, Tone } = this.state;
    this.state = this.defaultState(seed);
    this.state.Tone = Tone;
    this.loadPresets(seed);
    this.bufferHumChain();
    const rand = this._rng(seed), firstShape = this.shapes[(rand()*this.shapes.length)|0];
    Object.assign(this._canvas, { preset: this.state.presets[firstShape], shapeKey: firstShape, mode: 'seed', isAudioStarted: false, isPlaying: false });
    this.state.current = this.humKey;
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.humKey, sequencerVisible: false });
    this.state.isSequencerMode = false;
    this._sequencerComponent.style.display = 'none';
    this.state.sequence = Array(8).fill(null);
    this.updateSequencerState();
  }
  async unlockAudioAndBufferInitial() {
    const state = this.state;
    if (state.initialBufferingStarted && !state.initialShapeBuffered) { this._loader.textContent = 'Still preparing initial synth, please wait...'; return; }
    if (state.isPlaying) return this.stopAudioAndDraw();
    if (state.contextUnlocked) {
      if (state.initialShapeBuffered) {
        this.setActiveChain(this.humKey);
        state.isPlaying = true;
        this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: this.humKey, sequencerVisible: state.isSequencerMode });
        this._loader.textContent = 'Audio resumed (hum).';
        this._canvas.isPlaying = true;
        return;
      } else { this._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.'; return; }
    }
    this._loader.textContent = 'Unlocking AudioContext...';
    try {
      const Tone = state.Tone;
      if (!Tone) throw new Error('Tone.js not available');
      const contextToResume = Tone.getContext?.() || Tone.context;
      let contextResumed = false;
      if (contextToResume?.resume) { await contextToResume.resume(); contextResumed = true; }
      else if (Tone.start) { await Tone.start(); contextResumed = true; }
      if (!contextResumed) throw new Error('Could not resume AudioContext');
      state.contextUnlocked = true; state.initialBufferingStarted = true;
      this._loader.textContent = `Preparing ${this.humLabel} synth...`;
      await this.bufferHumChain();
      this.setActiveChain(this.humKey);
      state.initialShapeBuffered = true;
      state.isPlaying = true;
      this._canvas.isPlaying = true;
      this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: state.Tone.Destination.mute, shapeKey: this.humKey, sequencerVisible: state.isSequencerMode });
      this._loader.textContent = 'Ready. Audio: ' + this.humLabel;
      (async()=>{ for(const shape of this.shapes) { if(state.contextUnlocked){ try{await this.bufferShapeChain(shape);}catch(e){console.error('Error buffering',shape,e);} await new Promise(r=>setTimeout(r,0)); } } })();
    } catch(e) {
      console.error('Failed to unlock AudioContext:', e);
      this._loader.textContent = 'Failed to unlock AudioContext.';
      state.contextUnlocked = false; state.initialBufferingStarted = false; state.initialShapeBuffered = false;
    }
  }
  stopAudioAndDraw() {
    const state = this.state;
    if (!state.isPlaying && !state.initialBufferingStarted) return;
    state.isPlaying = false;
    state.initialBufferingStarted = false;
    state.initialShapeBuffered = false;
    this.disposeAllChains();
    this.disposeSamplePlayers();
    if (state.sequencePlaying) this.stopSequence();
    this._canvas.isPlaying = false;
    this._canvas.isAudioStarted = false;
    this.resetState();
    this.stopToneSequencer();
  }
  // UI/Control event handlers unchanged...
  _onToneReady() {
    this.state.Tone = window.Tone;
    this.loadPresets(this.state.seed);
    this.bufferHumChain();
    const initialShape = this.shapes[(this._rng(this.state.seed)()*this.shapes.length)|0];
    Object.assign(this._canvas, { preset: this.state.presets[initialShape], shapeKey: initialShape, mode: 'seed' });
    this.state.current = this.humKey;
    this._controls.disableAll(false);
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.humKey, sequencerVisible: false });
    this._loader.textContent = 'Tone.js loaded. Click \u2018POWER ON\u2019 or the image to begin.';
    this.disposeSamplePlayers();
    this.sampleSelection.forEach((sampleIndex, idx) => {
      SimpleSampleLoader.getSampleByIndex(sampleIndex).then(buffer => {
        if (this.state.Tone) {
          try {
            const player = new this.state.Tone.Player(buffer).toDestination();
            player.volume.value = -4;
            this.samplePlayers[idx] = player;
          } catch (err) {
            console.warn('Failed to instantiate sample player', err);
          }
        }
      }).catch(err => {
        console.warn('Failed to preload sample buffer', err);
      });
    });
  }
  _onStartRequest() { this.unlockAudioAndBufferInitial(); }
  _onMuteToggle() {
    const state = this.state;
    if (!state.Tone || !state.contextUnlocked) return;
    const mute = state.Tone.Destination.mute = !state.Tone.Destination.mute;
    this._controls.updateState({ isAudioStarted: true, isPlaying: state.isPlaying, isMuted: mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
    this._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
    this._canvas.isPlaying = state.isPlaying && !mute;
  }
  _onShapeChange(e) {
    const shapeKey = e.detail.shapeKey;
    if (!shapeKey) return;
    const state = this.state;
    state.current = shapeKey;
    if (shapeKey === this.humKey) Object.assign(this._canvas, { shapeKey: this.humKey, preset: null });
    else if (this.shapes.includes(shapeKey)) Object.assign(this._canvas, { shapeKey, preset: state.presets[shapeKey] });
    if (state.contextUnlocked && state.initialShapeBuffered) this.setActiveChain(shapeKey);
    this._canvas.mode = (state.contextUnlocked && state.initialShapeBuffered) ? (state.isPlaying ? 'live' : 'seed') : 'seed';
    this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey, sequencerVisible: state.isSequencerMode });
  }
  _onToggleSequencer() {
    const state = this.state;
    state.isSequencerMode = !state.isSequencerMode;
    this._sequencerComponent.style.display = state.isSequencerMode ? 'block' : 'none';
    this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey: state.current, sequencerVisible: state.isSequencerMode });
    if (state.isSequencerMode) this.updateSequencerState();
    else {
      state.isRecording = false;
      state.currentRecordSlot = -1;
      if (state.sequencePlaying) this.stopSequence();
    }
  }
  _handleSeedSubmit(e) {
    e.preventDefault();
    let val = this.shadowRoot.getElementById('seedInput').value.trim() || 'default';
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
  _handleKeyDown(e) {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    let shapeKey = null, idx = -1;
    if (e.key === '0') { shapeKey = this.humKey; }
    else { idx = e.key.charCodeAt(0) - 49; if (idx >= 0 && idx < this.shapes.length) shapeKey = this.shapes[idx]; }
    if (shapeKey) {
      const state = this.state;
      if (state.isSequencerMode && state.isRecording) {
        const recordValue = (idx >= 0) ? (idx + 1) : 0;
        this.recordStep(recordValue);
        if (state.contextUnlocked && state.initialShapeBuffered) {
          this.setActiveChain(shapeKey);
          if (idx >= 0) Object.assign(this._canvas, { shapeKey, preset: state.presets[shapeKey], mode: 'live' });
          this._canvas.isPlaying = true;
          this._controls.updateState({ isAudioStarted: state.contextUnlocked, isPlaying: state.isPlaying, isMuted: state.Tone?.Destination?.mute, shapeKey, sequencerVisible: state.isSequencerMode });
        }
        e.preventDefault(); return;
      }
      if (this._controls) {
        this._controls.updateState({ isAudioStarted: this.state.contextUnlocked, isPlaying: this.state.isPlaying, isMuted: this.state.Tone?.Destination?.mute, shapeKey, sequencerVisible: this.state.isSequencerMode });
        this._onShapeChange({ detail: { shapeKey } });
      }
      e.preventDefault();
    }
  }
  _handleKeyUp(_) {}
  _handleBlur() {}

  // --- SEQUENCER EVENTS ---
  _onSeqRecordStart(e) {
    const { slotIndex } = e.detail;
    this.state.isRecording = true;
    this.state.currentRecordSlot = slotIndex;
    this._controls.updateState({ 
      isAudioStarted: this.state.contextUnlocked, 
      isPlaying: this.state.isPlaying, 
      isMuted: this.state.Tone?.Destination?.mute, 
      shapeKey: this.state.current, 
      sequencerVisible: this.state.isSequencerMode 
    });
  }
  _onSeqStepCleared(e) {
    const { slotIndex } = e.detail;
    this.state.sequence[slotIndex] = null;
    if (this.state.isRecording && this.state.currentRecordSlot === slotIndex) {
      this.state.currentRecordSlot = (slotIndex + 1) % 8;
      if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    }
  }
  _onSeqStepRecorded(e) {
    const { slotIndex, value, nextSlot, isRecording } = e.detail;
    this.state.sequence[slotIndex] = value;
    this.state.currentRecordSlot = nextSlot;
    this.state.isRecording = isRecording;
  }
  _onSeqPlayStarted(e) {
    const { stepTime } = e.detail;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    this.state.stepTime = stepTime;
    this.startToneSequencer(stepTime);
    this._controls.updateState({ 
      isAudioStarted: this.state.contextUnlocked, 
      isPlaying: this.state.isPlaying, 
      isMuted: this.state.Tone?.Destination?.mute, 
      shapeKey: this.state.current, 
      sequencerVisible: this.state.isSequencerMode 
    });
  }
  _onSeqPlayStopped() {
    this.state.sequencePlaying = false;
    this.state.sequenceStepIndex = 0;
    this.stopToneSequencer();
    this._controls.updateState({ 
      isAudioStarted: this.state.contextUnlocked, 
      isPlaying: this.state.isPlaying, 
      isMuted: this.state.Tone?.Destination?.mute, 
      shapeKey: this.state.current, 
      sequencerVisible: this.state.isSequencerMode 
    });
  }
  // This is now called only for UI update, not for scheduling!
  _onSeqStepAdvance(e) {
    // (Optional: UI updates)
    this.state.sequenceStepIndex = e.detail.stepIndex;
    this.updateSequencerState();
  }
  _onSeqStepTimeChanged(e) {
    const { stepTime } = e.detail;
    this.state.stepTime = stepTime;
    if (this.state.sequencePlaying) {
      this.stopToneSequencer();
      this.startToneSequencer(stepTime);
    }
  }
  async _onSeqSampleSelected(e) {
    const { channelIndex, sampleIndex } = e.detail;
    this.sampleSelection[channelIndex] = sampleIndex;
    try {
      const buffer = await SimpleSampleLoader.getSampleByIndex(sampleIndex);
      if (this.state.Tone) {
        const existing = this.samplePlayers[channelIndex];
        if (existing) {
          try { existing.dispose?.(); } catch { }
          this.samplePlayers[channelIndex] = null;
        }
        const player = new this.state.Tone.Player(buffer).toDestination();
        player.volume.value = -4;
        this.samplePlayers[channelIndex] = player;
      }
    } catch (err) {
      console.warn('Failed to load sample for channel', channelIndex, sampleIndex, err);
    }
  }
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
  recordStep(number) {
    if (!this._sequencerComponent) return;
    this._sequencerComponent.recordStep(number);
  }
  playSequence() {
    if (!this._sequencerComponent) return;
    this._sequencerComponent.playSequence();
  }
  stopSequence() {
    if (!this._sequencerComponent) return;
    this._sequencerComponent.stopSequence();
    this.stopToneSequencer();
  }

  // --- TRANSPORT SYNCHRONIZED SEQUENCER ---
  startToneSequencer(stepTimeMs) {
    const { Tone } = this.state;
    if (!Tone) return;
    this.stopToneSequencer();
    // Convert ms to seconds for Tone.Transport
    const stepTimeSec = stepTimeMs / 1000;
    // Schedule a repeating callback for each step. The callback itself should be as lightweight
    // as possible to avoid blocking the audio thread. We defer heavy operations (UI updates,
    // shape switching) using Tone.Transport.scheduleOnce and Tone.Draw.schedule which will
    // execute at the correct AudioContext time on the main/UI thread.
    this._toneStepId = Tone.Transport.scheduleRepeat((time) => {
      // capture current step index and value at the start of this callback
      const stepIndex = this.state.sequenceStepIndex;
      const value = this.state.sequence[stepIndex];

      // Determine which shape should be active on this step
      let shapeKey;
      if (value === 0) shapeKey = this.humKey;
      else if (value >= 1 && value <= this.shapes.length) shapeKey = this.shapes[value - 1];
      else shapeKey = null;

      // Determine which sample channels should be triggered on this step
      // We compute this on-the-fly to reflect any real-time edits to the sequencer pattern.
      const sampleTriggers = [];
      if (this.state.contextUnlocked && this.state.initialShapeBuffered && Array.isArray(this._sequencerComponent?.state?.sampleChannels)) {
        const channels = this._sequencerComponent.state.sampleChannels;
        for (let ch = 0; ch < channels.length; ch++) {
          if (channels[ch].steps[stepIndex]) sampleTriggers.push(ch);
        }
      }

      // Schedule synth shape change at the exact audio time. This uses scheduleOnce which
      // ensures the callback fires synchronously with the Transport. Because changing
      // shapes can involve rebuilding audio chains and UI state, doing it in a
      // separate scheduled callback prevents blocking the audio callback.
      if (shapeKey) {
        Tone.Transport.scheduleOnce((scheduledTime) => {
          // Update control UI to reflect the new shape
          this._controls.updateState({
            isAudioStarted: this.state.contextUnlocked,
            isPlaying: this.state.isPlaying,
            isMuted: this.state.Tone?.Destination?.mute,
            shapeKey,
            sequencerVisible: this.state.isSequencerMode
          });
          // Dispatch the shape change. This will update the oscillator chain and visuals.
          this._onShapeChange({ detail: { shapeKey } });
        }, time);
      }

      // Trigger any samples for this step at the scheduled time. Starting players with
      // the provided `time` ensures sample playback is sample-accurate on the Transport.
      if (sampleTriggers.length > 0) {
        sampleTriggers.forEach((ch) => {
          const player = this.samplePlayers[ch];
          if (player) {
            try {
              player.start(time);
            } catch (err) {
              console.warn('Sample trigger error on channel', ch, err);
            }
          }
        });
      }

      // Use Tone.Draw to schedule UI updates for the next step. Tone.Draw invokes
      // callbacks using requestAnimationFrame and aligns them with the AudioContext time.
      Tone.Draw.schedule(() => {
        // Advance to the next step and update the sequencer's UI state
        this.state.sequenceStepIndex = (stepIndex + 1) % this.state.sequence.length;
        this.updateSequencerState();
      }, time);
    }, stepTimeSec);

    // Start the Transport. If the Transport was already running, this call is idempotent.
    Tone.Transport.start();
  }
  stopToneSequencer() {
    const { Tone } = this.state;
    if (!Tone) return;
    if (this._toneStepId != null) {
      Tone.Transport.clear(this._toneStepId);
      this._toneStepId = null;
    }
    Tone.Transport.stop();
  }
}

customElements.define('osc-app', OscApp2);
