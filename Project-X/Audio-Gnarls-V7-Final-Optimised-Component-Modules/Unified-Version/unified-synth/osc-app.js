// Unified oscilloscope synthesiser orchestrator
//
// This module composes the Tone loader, control surface, visual canvas
// and step sequencer into a cohesive application.  It manages the
// generation of audio/visual presets (random and deterministic), the
// construction of Tone.js audio chains, keyboard interaction for
// playing musical notes and switching shapes, as well as recording
// and playing back sequences.  The audio engine builds upon ideas
// present in the individual versions: multiple oscillators with
// optional AM/FM interactions, filters, LFO modulation, phaser and
// reverb effects.  The visual engine is driven by the current preset
// and shape selection, and is rendered within scope-canvas.
import './tone-loader.js';
import './osc-controls.js';
import './scope-canvas.js';

// Global utility: clamp value to range
function clamp(value, min, max) {
  if (!isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Application state
    this.state = {
      isPlaying: false,
      isAudioStarted: false,
      isMuted: true,
      Tone: null,
      chains: {},       // Map of shapeKey -> audio chain
      presets: {},      // Map of shapeKey -> preset (audio+visual)
      currentShape: null,
      isSeedMode: false,
      seed: '',
      rng: null,
      // Sequencer state
      sequence: Array(8).fill(null),
      sequencePlaying: false,
      sequenceIntervalId: null,
      sequenceStepIndex: 0,
      stepTime: 400,
      isRecording: false,
      currentRecordSlot: -1,
      isSequencerVisible: false,
      // Keyboard oscillator map
      keyboardOsc: {}
    };
    // Shape definitions (10 shapes bound to digits 1-9 and 0)
    this.shapes = ['circle','square','butterfly','lissajous','spiral','rose','radial','polygon','spiro','harmonograph'];
    this.shapeLabels = {
      circle: 'Circle',
      square: 'Square',
      butterfly: 'Butterfly',
      lissajous: 'Lissajous',
      spiral: 'Spiral',
      rose: 'Rose',
      radial: 'Radial Waves',
      polygon: 'Polygon',
      spiro: 'Spirograph',
      harmonograph: 'Harmonograph',
      layers: 'Layers',
      particles: 'Particles'
    };
    // Additional shapes accessible via letters
    this.extraShapes = ['layers','particles'];
    // Key mapping for musical notes (letters only to avoid collision with shape keys)
    this.noteKeyMap = {
      'a':21,'w':22,'s':23,'e':24,'d':25,'f':26,'t':27,'g':28,'y':29,'h':30,'u':31,'j':32,
      'k':33,'o':34,'l':35,'p':36,';':37,"'":38,'z':39,'x':40,'c':41,'v':42,'b':43,'n':44,
      ',':45,'m':46,'.':47,'/':48,'q':49,'r':62,'i':63,'[':64,']':65,'\\':66
    };
    // Bind methods
    this._onToneReady = this._onToneReady.bind(this);
    this._onToneError = this._onToneError.bind(this);
    this._onStartRequest = this._onStartRequest.bind(this);
    this._onMuteToggle = this._onMuteToggle.bind(this);
    this._onRandomize = this._onRandomize.bind(this);
    this._onShapeChange = this._onShapeChange.bind(this);
    this._onModeChange = this._onModeChange.bind(this);
    this._onSeedSubmit = this._onSeedSubmit.bind(this);
    this._onToggleSequencer = this._onToggleSequencer.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
  }

  connectedCallback() {
    this._buildUI();
    this.shadowRoot.querySelector('tone-loader')?.addEventListener('tone-ready', this._onToneReady);
    this.shadowRoot.querySelector('tone-loader')?.addEventListener('tone-error', this._onToneError);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('randomize-request', this._onRandomize);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    this._controls.addEventListener('mode-change', this._onModeChange);
    this._controls.addEventListener('seed-submit', this._onSeedSubmit);
    this._controls.addEventListener('toggle-sequencer', this._onToggleSequencer);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);

    const shapeOptions = this.shapes.map(k => ({ value: k, label: this.shapeLabels[k] }));
    this.extraShapes.forEach(k => shapeOptions.push({ value: k, label: this.shapeLabels[k] }));
    this._controls.setShapes(shapeOptions);

    this._controls.updateState({
      isAudioStarted: false,
      isPlaying: false,
      isMuted: true,
      shapeKey: this.shapes[0],
      isSeedMode: false,
      sequencerVisible: false
    });

    this._canvas.onIndicatorUpdate = (text, audioActive) => {
      this._statusDiv.textContent = text;
    };
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);
    this.disposeAllChains();
  }

  _buildUI() {
    const root = this.shadowRoot;
    root.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      #appContainer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
      }
      #status {
        min-height: 1.2rem;
        font-size: 0.85rem;
        color: #bbb;
        font-style: italic;
        text-align: center;
      }
      #sequencer {
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        background: #111;
        padding: 0.6rem 0.8rem;
        border-radius: 6px;
        box-shadow: 0 0 10px #0006;
      }
      #stepSlots {
        display: grid;
        grid-template-columns: repeat(8, 2rem);
        gap: 0.3rem;
        justify-content: center;
      }
      .step-slot {
        width: 2rem;
        height: 2rem;
        background: #222;
        color: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        font-size: 0.9rem;
      }
      .step-slot.record-mode {
        background: #4455aa;
      }
      .step-slot.active {
        background: #bb8844;
      }
      #sequenceControls {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        justify-content: center;
      }
      #sequenceControls input[type=number] {
        width: 4.5rem;
        padding: 0.3rem 0.4rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: #202020;
        color: #f0f0f0;
      }
      #sequenceControls button {
        padding: 0.4rem 0.8rem;
        border-radius: 4px;
        border: 1px solid #555;
        background: #202020;
        color: #f0f0f0;
        cursor: pointer;
      }
      #sequenceControls button:hover:not(:disabled) {
        background: #2e2e2e;
      }
      #sequenceControls button:disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `;
    root.appendChild(style);
    const container = document.createElement('div');
    container.id = 'appContainer';
    const toneLoader = document.createElement('tone-loader');
    container.appendChild(toneLoader);
    this._canvas = document.createElement('scope-canvas');
    container.appendChild(this._canvas);
    this._controls = document.createElement('osc-controls');
    container.appendChild(this._controls);
    this._statusDiv = document.createElement('div');
    this._statusDiv.id = 'status';
    this._statusDiv.textContent = '';
    container.appendChild(this._statusDiv);
    this._sequencerDiv = document.createElement('div');
    this._sequencerDiv.id = 'sequencer';
    this._stepSlotsDiv = document.createElement('div');
    this._stepSlotsDiv.id = 'stepSlots';
    this._sequencerDiv.appendChild(this._stepSlotsDiv);
    this._sequenceControls = document.createElement('div');
    this._sequenceControls.id = 'sequenceControls';
    this._seqPlayBtn = document.createElement('button');
    this._seqPlayBtn.textContent = 'Play Sequence';
    this._seqPlayBtn.addEventListener('click', () => {
      if (this.state.sequencePlaying) this.stopSequence(); else this.playSequence();
    });
    const stepTimeLabel = document.createElement('label');
    stepTimeLabel.textContent = 'Step (ms)';
    this._stepTimeInput = document.createElement('input');
    this._stepTimeInput.type = 'number';
    this._stepTimeInput.min = '50';
    this._stepTimeInput.max = '2000';
    this._stepTimeInput.value = String(this.state.stepTime);
    this._stepTimeInput.addEventListener('change', () => {
      const val = parseInt(this._stepTimeInput.value, 10);
      if (val >= 50 && val <= 2000) {
        this.state.stepTime = val;
        if (this.state.sequencePlaying) {
          this.stopSequence();
          this.playSequence();
        }
      } else {
        this._stepTimeInput.value = String(this.state.stepTime);
      }
    });
    this._saveSeqBtn = document.createElement('button');
    this._saveSeqBtn.textContent = 'Save';
    this._saveSeqBtn.addEventListener('click', () => {
      try {
        localStorage.setItem('unifiedSynthSequence', JSON.stringify(this.state.sequence));
        this._statusDiv.textContent = 'Sequence saved.';
      } catch (e) {
        this._statusDiv.textContent = 'Failed to save sequence.';
      }
    });
    this._loadSeqBtn = document.createElement('button');
    this._loadSeqBtn.textContent = 'Load';
    this._loadSeqBtn.addEventListener('click', () => {
      try {
        const stored = localStorage.getItem('unifiedSynthSequence');
        if (stored) {
          const seq = JSON.parse(stored);
          if (Array.isArray(seq) && seq.length === this.state.sequence.length) {
            this.state.sequence = seq;
            this.updateSequenceUI();
            this._statusDiv.textContent = 'Sequence loaded.';
          }
        }
      } catch (e) {
        this._statusDiv.textContent = 'Failed to load sequence.';
      }
    });
    this._clearSeqBtn = document.createElement('button');
    this._clearSeqBtn.textContent = 'Clear';
    this._clearSeqBtn.addEventListener('click', () => {
      this.state.sequence = Array(8).fill(null);
      this.updateSequenceUI();
    });
    this._sequenceControls.append(this._seqPlayBtn, stepTimeLabel, this._stepTimeInput, this._saveSeqBtn, this._loadSeqBtn, this._clearSeqBtn);
    this._sequencerDiv.appendChild(this._sequenceControls);
    container.appendChild(this._sequencerDiv);
    root.appendChild(container);
  }

  _onToneReady(ev) {
    this.state.Tone = ev.detail?.Tone || window.Tone;
    this._statusDiv.textContent = 'Audio engine ready.';
    this.state.isAudioStarted = true;
    this._controls.updateState({
      isAudioStarted: true,
      isPlaying: false,
      isMuted: true,
      shapeKey: this.shapes[0],
      isSeedMode: this.state.isSeedMode,
      sequencerVisible: this.state.isSequencerVisible
    });
    this.generateInitialPresets();
    const shapeKey = this.shapes[0];
    this.state.currentShape = shapeKey;
    const preset = this.state.presets[shapeKey];
    if (preset) {
      this._canvas.shapeKey = shapeKey;
      this._canvas.preset = preset;
    }
    this._controls.updateState({ shapeKey: shapeKey });
  }

  _onToneError(ev) {
    this._statusDiv.textContent = 'Failed to load Tone.js';
  }

  generateInitialPresets() {
    const rng = Math.random;
    this.shapes.concat(this.extraShapes).forEach(key => {
      this.state.presets[key] = this.generateRandomPreset(key, rng);
    });
  }

  loadSeedPresets(seed) {
    const rng = this.mulberry32(seed);
    this.state.rng = rng;
    this.shapes.concat(this.extraShapes).forEach(key => {
      this.state.presets[key] = this.generateRandomPreset(key, rng);
    });
  }

  generateRandomPreset(shapeKey, rng = Math.random) {
    const rand = (min, max) => {
      let r = rng();
      if (!isFinite(r) || r < 0) r = 0;
      if (r > 1) r = 1;
      return r * (max - min) + min;
    };

    const randi = (min, max) => Math.floor(rand(min, max + 1));
    const pick = arr => arr[Math.floor(rand(0, arr.length))];

    const waveforms = ['sine','square','sawtooth','triangle'];
    const useOsc2 = rand(0, 1) > 0.3;
    const osc1Type = pick(waveforms);
    const osc2Type = useOsc2 ? pick(waveforms) : null;
    const baseNotes = ['C','D','E','F','G','A','B'];
    const octaves = [2,3,4,5];
    const randNote = () => pick(baseNotes) + pick(octaves);
    const osc1Note = randNote();
    const osc2Note = useOsc2 ? randNote() : null;

    let interaction = 'mix';
    if (useOsc2) {
      const r = rand(0, 1);
      if (r < 0.4) interaction = 'am'; else if (r < 0.7) interaction = 'fm';
    }

    const filterType = pick(['lowpass','highpass','bandpass']);
    const filterFreq = clamp(rand(300, 4000), 20, 20000);
    const filterQ = clamp(rand(0.5, 8), 0.1, 100);
    const filterRolloff = pick([-12,-24]);

    const lfoCount = randi(1, 2);
    const lfos = [];
    for (let i = 0; i < lfoCount; i++) {
      const lfoType = pick(waveforms);
      const lfoFreq = clamp(rand(0.05, 3), 0.01, 50);
      const minVal = clamp(rand(200, 800), 0, 10000);
      const maxVal = clamp(minVal + rand(500, 2000), minVal + 1, 12000);
      const target = pick(['filterFreq','osc1Detune','osc2Detune','masterVolume']);
      lfos.push({ type: lfoType, frequency: lfoFreq, min: minVal, max: maxVal, target });
    }

    let phaser = null;
    if (rand(0, 1) > 0.7) {
      phaser = {
        frequency: clamp(rand(0.1, 2), 0.01, 50),
        octaves: clamp(rand(2, 6), 1, 8),
        baseFrequency: clamp(rand(200, 1000), 20, 5000)
      };
    }

    let reverb = null;
    if (rand(0, 1) > 0.5) {
      reverb = {
        wet: clamp(rand(0.1, 0.6), 0, 1),
        roomSize: clamp(rand(0.5, 0.9), 0.1, 1)
      };
    }

    const masterVol = clamp(rand(-12, -6), -60, 6);

    const hueBase = clamp(rand(0, 360), 0, 360);
    const colorSpeed = clamp(rand(0.02, 0.1), 0.001, 1);
    const lineWidth = clamp(rand(1, 3.5), 0.1, 10);
    const rotationSpeed = clamp(rand(-0.3, 0.3), -2, 2);
    const pulseSpeed = clamp(rand(0.05, 0.3), 0.01, 5);
    const size = clamp(rand(0.6, 1.0), 0.1, 3);
    const useGlow = rand(0, 1) > 0.5;
    const useAlpha = rand(0, 1) > 0.5;

    let lissaA, lissaB, lissaDelta, spiralTurns, roseK, symmetry, polygonSides, particleCount, particleSize;
    if (shapeKey === 'lissajous') {
      lissaA = randi(1, 5);
      lissaB = randi(1, 5);
      lissaDelta = clamp(rand(0, Math.PI), 0, Math.PI);
    } else if (shapeKey === 'spiral') {
      spiralTurns = randi(2, 8);
    } else if (shapeKey === 'rose') {
      roseK = clamp(rand(0.5, 5), 0.1, 10);
    } else if (shapeKey === 'radial') {
      symmetry = randi(3, 8);
    } else if (shapeKey === 'polygon') {
      symmetry = randi(2, 6);
      polygonSides = randi(3, 9);
    } else if (shapeKey === 'particles') {
      particleCount = randi(50, 200);
      particleSize = clamp(rand(1, 4), 0.1, 10);
    }

    const visualLFOs = [];
    visualLFOs.push({
      type: 'rotation',
      rate: clamp(rand(0.001, 0.01), 0.0001, 0.1),
      depth: Math.PI * 2,
      phase: clamp(rand(0, 2 * Math.PI), 0, 2 * Math.PI)
    });
    visualLFOs.push({
      type: 'hueShift',
      rate: clamp(rand(0.0005, 0.005), 0.0001, 0.01),
      depth: 360,
      phase: clamp(rand(0, 2 * Math.PI), 0, 2 * Math.PI)
    });

    const visual = {
      hueBase,
      colorSpeed,
      lineWidth,
      rotationSpeed,
      pulseSpeed,
      size,
      useGlow,
      useAlpha,
      lissaA,
      lissaB,
      lissaDelta,
      spiralTurns,
      roseK,
      symmetry,
      polygonSides,
      particleCount,
      particleSize,
      visualLFOs,
      baseRotationSpeed: rotationSpeed,
      scaleModDepth: clamp(rand(0.05, 0.2), 0.01, 0.5),
      hueShiftSpeed: colorSpeed
    };

    return {
      shapeKey,
      audio: {
        osc1: [osc1Type, osc1Note],
        osc2: useOsc2 ? [osc2Type, osc2Note] : null,
        interaction,
        filter: { type: filterType, frequency: filterFreq, Q: filterQ, rolloff: filterRolloff },
        lfos,
        phaser,
        reverb,
        masterVolume: masterVol,
        colorSpeed,
        shapeDrift: clamp(rand(0.0006, 0.003), 0.0001, 0.01)
      },
      visual
    };
  }

  mulberry32(seedStr) {
    let seed = String(seedStr || 'default').trim();
    if (seed === '') seed = 'empty';
    let a = 0;
    for (let i = 0; i < seed.length; i++) {
      a = (a << 5) - a + seed.charCodeAt(i);
      a |= 0;
    }
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  noteToFrequency(note) {
    const A4 = 440;
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const match = /([A-G]#?)(\d+)/.exec(String(note).trim());
    if (!match) return A4;
    const idx = noteNames.indexOf(match[1]);
    if (idx === -1) return A4;
    const oct = parseInt(match[2], 10);
    if (isNaN(oct) || oct < 0 || oct > 8) return A4;
    const freq = A4 * Math.pow(2, (idx + (oct - 4) * 12 - 9) / 12);
    return clamp(freq, 20, 20000);
  }

  buildChain(shapeKey) {
    const state = this.state;
    const Tone = state.Tone;
    if (!Tone) return null;
    if (state.chains[shapeKey]) return state.chains[shapeKey];
    const preset = state.presets[shapeKey];
    if (!preset) return null;
    const pr = preset.audio;

    const osc1Freq = this.noteToFrequency(pr.osc1[1]);
    const osc1 = new Tone.Oscillator(osc1Freq, pr.osc1[0]).start();
    let osc2 = null;
    if (pr.osc2) {
      const osc2Freq = this.noteToFrequency(pr.osc2[1]);
      osc2 = new Tone.Oscillator(osc2Freq, pr.osc2[0]).start();
    }

    const volume = new Tone.Volume(clamp(pr.masterVolume || -8, -60, 6));
    const filter = new Tone.Filter(clamp(pr.filter.frequency, 20, 20000), pr.filter.type);
    filter.Q.value = clamp(pr.filter.Q, 0.1, 100);
    if (pr.filter.rolloff) filter.rolloff = pr.filter.rolloff;

    const lfoNodes = [];
    pr.lfos.forEach(lfoParam => {
      const l = new Tone.LFO(
        clamp(lfoParam.frequency, 0.01, 50),
        clamp(lfoParam.min, -10000, 10000),
        clamp(lfoParam.max, -10000, 10000)
      ).start();
      l.type = lfoParam.type;
      switch (lfoParam.target) {
        case 'filterFreq': l.connect(filter.frequency); break;
        case 'osc1Detune': l.connect(osc1.detune); break;
        case 'osc2Detune': if (osc2) l.connect(osc2.detune); break;
        case 'masterVolume': l.connect(volume.volume); break;
      }
      lfoNodes.push(l);
    });

    let modulatedGain = null;
    if (pr.interaction === 'am' && osc2) {
      modulatedGain = new Tone.Gain(1);
      osc1.connect(modulatedGain);
      osc2.connect(modulatedGain.gain);
      modulatedGain.connect(volume);
    } else if (pr.interaction === 'fm' && osc2) {
      osc2.connect(osc1.frequency);
      osc1.connect(volume);
    } else {
      osc1.connect(volume);
      if (osc2) osc2.connect(volume);
    }

    let phaser = null;
    if (pr.phaser) {
      phaser = new Tone.Phaser({
        frequency: clamp(pr.phaser.frequency, 0.01, 50),
        octaves: clamp(pr.phaser.octaves, 1, 8),
        baseFrequency: clamp(pr.phaser.baseFrequency, 20, 5000)
      });
    }

    let reverb = null;
    if (pr.reverb) {
      reverb = new Tone.Freeverb();
      reverb.set({
        wet: clamp(pr.reverb.wet, 0, 1),
        roomSize: clamp(pr.reverb.roomSize, 0.1, 1)
      });
    }

    let outNode = volume;
    volume.connect(filter);
    if (phaser) {
      filter.connect(phaser);
      outNode = phaser;
    } else {
      outNode = filter;
    }
    if (reverb) {
      outNode.connect(reverb);
      outNode = reverb;
    }
    outNode.toDestination();

    const analyser = Tone.context.createAnalyser();
    analyser.fftSize = 2048;
    outNode.connect(analyser);

    const chain = { osc1, osc2, volume, filter, lfos: lfoNodes, modulatedGain, phaser, reverb, analyser };
    state.chains[shapeKey] = chain;
    return chain;
  }

  disposeAllChains() {
    const state = this.state;
    Object.keys(state.chains).forEach(k => {
      const ch = state.chains[k];
      if (!ch) return;
      try { ch.osc1.stop(); } catch (_) {}
      try { ch.osc1.dispose(); } catch (_) {}
      if (ch.osc2) {
        try { ch.osc2.stop(); } catch (_) {}
        try { ch.osc2.dispose(); } catch (_) {}
      }
      ch.lfos?.forEach(l => { try { l.stop(); } catch (_) {} try { l.dispose(); } catch (_) {} });
      if (ch.modulatedGain) { try { ch.modulatedGain.dispose(); } catch (_) {} }
      if (ch.phaser) { try { ch.phaser.dispose(); } catch (_) {} }
      if (ch.reverb) { try { ch.reverb.dispose(); } catch (_) {} }
      try { ch.volume.dispose(); } catch (_) {}
      try { ch.filter.dispose(); } catch (_) {}
    });
    state.chains = {};
  }

  async toggleAudio() {
    const state = this.state;
    const Tone = state.Tone;
    if (!Tone) return;
    if (!state.isAudioStarted) {
      try {
        await Tone.start();
      } catch (e) {
        this._statusDiv.textContent = 'Failed to start audio context.';
        return;
      }
      state.isAudioStarted = true;
      const chain = this.buildChain(state.currentShape);
      if (chain) {
        this._canvas.analyser = chain.analyser;
        this._canvas.isAudioStarted = true;
      }
      state.isPlaying = true;
      Tone.Destination.mute = false;
      state.isMuted = false;
      this._canvas.isPlaying = true;
      this._statusDiv.textContent = 'Audio started.';
      this._controls.updateState({
        isAudioStarted: true,
        isPlaying: true,
        isMuted: false,
        shapeKey: state.currentShape,
        isSeedMode: state.isSeedMode,
        sequencerVisible: state.isSequencerVisible
      });
      return;
    }
    if (state.isPlaying) {
      Tone.Destination.mute = true;
      state.isPlaying = false;
      state.isMuted = true;
      this._canvas.isPlaying = false;
      this._statusDiv.textContent = 'Audio muted.';
    } else {
      Tone.Destination.mute = false;
      state.isPlaying = true;
      state.isMuted = false;
      this._canvas.isPlaying = true;
      this._statusDiv.textContent = 'Audio unmuted.';
    }
    this._controls.updateState({
      isAudioStarted: true,
      isPlaying: state.isPlaying,
      isMuted: state.isMuted,
      shapeKey: state.currentShape,
      isSeedMode: state.isSeedMode,
      sequencerVisible: state.isSequencerVisible
    });
  }

  _onStartRequest() { this.toggleAudio(); }
  _onMuteToggle() { this._onStartRequest(); }

  _onRandomize() {
    if (!this.state.isAudioStarted || this.state.isGenerating) return;
    this._controls.updateState({ isGenerating: true });
    requestAnimationFrame(() => {
      const allShapes = this.shapes.concat(this.extraShapes);
      const shapeKey = allShapes[Math.floor(Math.random() * allShapes.length)];
      const rng = this.state.isSeedMode && this.state.rng ? this.state.rng : Math.random;
      this.state.presets[shapeKey] = this.generateRandomPreset(shapeKey, rng);
      this.setShape(shapeKey);
      this._statusDiv.textContent = `Random preset generated for ${this.shapeLabels[shapeKey]}.`;
      this._controls.updateState({ isGenerating: false });
    });
  }

  _onShapeChange(ev) {
    const shapeKey = ev.detail?.shapeKey;
    if (shapeKey) this.setShape(shapeKey);
  }

  _onModeChange(ev) {
    const isSeed = !!ev.detail?.isSeedMode;
    this.state.isSeedMode = isSeed;
    if (isSeed) {
      const seed = this.state.seed || 'default';
      this.loadSeedPresets(seed);
      this._statusDiv.textContent = `Seed mode: using seed '${seed}'.`;
    } else {
      this.generateInitialPresets();
      this._statusDiv.textContent = 'Random mode activated.';
    }
    if (this.state.currentShape) {
      const pr = this.state.presets[this.state.currentShape];
      if (pr) this._canvas.preset = pr;
    }
    this._controls.updateState({
      isSeedMode: isSeed,
      shapeKey: this.state.currentShape,
      sequencerVisible: this.state.isSequencerVisible
    });
  }

  _onSeedSubmit(ev) {
    const seed = ev.detail?.seed?.trim();
    if (!seed) return;
    this.state.seed = seed;
    this.loadSeedPresets(seed);
    this._statusDiv.textContent = `Seed set to '${seed}'.`;
    if (this.state.currentShape) {
      const pr = this.state.presets[this.state.currentShape];
      if (pr) {
        this._canvas.preset = pr;
        if (this.state.isAudioStarted && this.state.isPlaying) {
          this.buildChain(this.state.currentShape);
        }
      }
    }
  }

  _onToggleSequencer(ev) {
    const visible = !this.state.isSequencerVisible;
    this.state.isSequencerVisible = visible;
    this._sequencerDiv.style.display = visible ? 'flex' : 'none';
    if (visible && !this._stepSlotsDiv.hasChildNodes()) this.createSequenceUI();
    this._controls.updateState({ sequencerVisible: visible });
  }

  setShape(shapeKey) {
    this.state.currentShape = shapeKey;
    if (this.state.isAudioStarted) {
      const chain = this.buildChain(shapeKey);
      if (chain) {
        this._canvas.analyser = chain.analyser;
        this._canvas.isAudioStarted = true;
        this._canvas.isPlaying = this.state.isPlaying && !this.state.isMuted;
      }
    }
    const pr = this.state.presets[shapeKey] || this.generateRandomPreset(shapeKey);
    this.state.presets[shapeKey] = pr;
    this._canvas.shapeKey = shapeKey;
    this._canvas.preset = pr;
    this._controls.updateState({ shapeKey });
    this._statusDiv.textContent = `${this.shapeLabels[shapeKey]} selected.`;
  }

  _handleKeyDown(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const key = e.key;
    let shapeIndex = -1;
    if (key >= '1' && key <= '9') shapeIndex = parseInt(key, 10) - 1;
    else if (key === '0') shapeIndex = 9;
    else if (key.toLowerCase() === 'p') { this.setShape('particles'); e.preventDefault(); return; }
    else if (key.toLowerCase() === 'l') { this.setShape('layers'); e.preventDefault(); return; }

    if (shapeIndex >= 0 && shapeIndex < this.shapes.length) {
      if (this.state.isSequencerVisible && this.state.isRecording) {
        this.recordStep(shapeIndex + 1);
        e.preventDefault();
        return;
      }
      this.setShape(this.shapes[shapeIndex]);
      e.preventDefault();
      return;
    }

    const noteKey = key.toLowerCase();
    const midi = this.noteKeyMap[noteKey];
    if (!midi || this.state.keyboardOsc[noteKey] || !this.state.isAudioStarted || !this.state.isPlaying || e.repeat) return;
    const Tone = this.state.Tone;
    if (!Tone) return;
    const preset = this.state.presets[this.state.currentShape];
    const oscType = preset?.audio?.osc1?.[0] || 'sine';
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = new Tone.Oscillator(freq, oscType).start();
    let out = osc;
    const filterCfg = preset?.audio?.filter;
    if (filterCfg) {
      const f = new Tone.Filter(filterCfg.frequency, filterCfg.type);
      f.Q.value = clamp(filterCfg.Q, 0.1, 100);
      osc.connect(f);
      out = f;
    }
    out.connect(Tone.Destination);
    this.state.keyboardOsc[noteKey] = osc;
    const noteName = this.midiToNoteName(midi);
    this._statusDiv.textContent = `Playing note ${noteName}`;
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
    Object.keys(this.state.keyboardOsc).forEach(k => {
      try { this.state.keyboardOsc[k].stop('+0.01'); } catch (_) {}
    });
    this.state.keyboardOsc = {};
  }

  midiToNoteName(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  createSequenceUI() {
    this._stepSlotsDiv.innerHTML = '';
    for (let i = 0; i < this.state.sequence.length; i++) {
      const slot = document.createElement('div');
      slot.classList.add('step-slot');
      slot.dataset.index = String(i);
      slot.textContent = this.state.sequence[i] ? this.state.sequence[i] : '';
      slot.addEventListener('click', () => {
        this.state.isRecording = true;
        this.state.currentRecordSlot = i;
        this.updateSequenceUI();
      });
      slot.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this.state.sequence[i] = null;
        if (this.state.isRecording && this.state.currentRecordSlot === i) {
          this.state.currentRecordSlot = (i + 1) % this.state.sequence.length;
          if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
        }
        this.updateSequenceUI();
      });
      this._stepSlotsDiv.appendChild(slot);
    }
    this.updateSequenceUI();
  }

  updateSequenceUI() {
    const slots = this._stepSlotsDiv.querySelectorAll('.step-slot');
    slots.forEach(slot => {
      const idx = parseInt(slot.dataset.index, 10);
      const val = this.state.sequence[idx];
      slot.textContent = val || '';
      slot.classList.toggle('record-mode', this.state.isRecording && this.state.currentRecordSlot === idx);
      slot.classList.toggle('active', this.state.sequencePlaying && this.state.sequenceStepIndex === idx);
    });
    this._seqPlayBtn.textContent = this.state.sequencePlaying ? 'Stop Sequence' : 'Play Sequence';
  }

  recordStep(number) {
    if (!this.state.isRecording) return;
    const idx = this.state.currentRecordSlot;
    if (idx < 0 || idx >= this.state.sequence.length) return;
    this.state.sequence[idx] = number;
    this.state.currentRecordSlot = (idx + 1) % this.state.sequence.length;
    if (this.state.currentRecordSlot === 0) this.state.isRecording = false;
    this.updateSequenceUI();
  }

  playSequence() {
    if (this.state.sequencePlaying) return;
    this.state.sequencePlaying = true;
    this.state.sequenceStepIndex = 0;
    const stepFn = () => {
      const idx = this.state.sequenceStepIndex;
      const val = this.state.sequence[idx];
      if (val != null) {
        const shapeKey = this.shapes[val - 1];
        if (shapeKey) this.setShape(shapeKey);
      }
      this.state.sequenceStepIndex = (this.state.sequenceStepIndex + 1) % this.state.sequence.length;
      this.updateSequenceUI();
    };
    stepFn();
    this.state.sequenceIntervalId = setInterval(stepFn, this.state.stepTime);
  }

  stopSequence() {
    if (!this.state.sequencePlaying) return;
    clearInterval(this.state.sequenceIntervalId);
    this.state.sequenceIntervalId = null;
    this.state.sequencePlaying = false;
    this.state.sequenceStepIndex = 0;
    this.updateSequenceUI();
  }
}

customElements.define('osc-app', OscApp);