// File: osc-app.js
import './tone-loader.js';
import './scope-canvas.js';
import './osc-controls.js';

class OscApp extends HTMLElement {
  #shadow;
  #toneLoader;
  #scopeCanvas;
  #oscControls;

  // State fields
  #state = {
    isPlaying: false,
    isMuted: true,
    contextUnlocked: false,
    Tone: null,
    chains: {}, // shape -> audio nodes
    currentShape: null,
    seed: '5s567g67',
    presets: {},
    mode: 'seed', // 'seed' or 'live'
    sequence: Array(8).fill(null),
    isSequencerMode: false,
    isRecording: false,
    currentRecordSlot: -1,
    sequencePlaying: false,
    sequenceStepIndex: 0,
    sequenceIntervalId: null,
    stepTime: 400
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#shadow = this.shadowRoot;

    this.#shadow.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: minmax(220px, 340px) 1fr;
          grid-template-rows: 100vh;
          gap: 0;
          box-sizing: border-box;
          height: 100vh;
          width: 100vw;
          background: #000;
          color: #fff;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
        tone-loader {
          grid-column: 1 / -1;
          grid-row: 1 / 2;
          align-self: end;
          justify-self: center;
          user-select: none;
          pointer-events: none;
        }
        osc-controls {
          grid-column: 1 / 2;
          align-self: start;
          margin: 1rem;
        }
        scope-canvas {
          grid-column: 2 / 3;
          align-self: center;
          justify-self: center;
        }
        #sequencer {
          grid-column: 1 / 2;
          background: #fff1;
          color: #000;
          margin: 1rem;
          padding: 0.5rem;
          border-radius: 8px;
          user-select: none;
          display: none;
          flex-direction: column;
          align-items: center;
          font-weight: bold;
          font-size: 0.9rem;
        }
        #stepSlots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin: 0.5rem 0;
          user-select: none;
        }
        .step-slot {
          width: 40px;
          height: 40px;
          border: 1px solid #555;
          border-radius: 6px;
          background: #222;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-weight: bold;
          color: #fff;
        }
        .step-slot.record-mode {
          background: #444;
          box-shadow: 0 0 8px #fff8;
        }
        .step-slot.record-mode.active {
          background: #666;
        }
        #sequenceControls {
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        #playBtn {
          padding: 0.3rem 0.8rem;
          border-radius: 6px;
          border: 1px solid #555;
          background: #222;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
        }
        #playBtn:hover {
          background: #444;
        }
        #stepTimeInput {
          width: 60px;
          border-radius: 6px;
          border: 1px solid #555;
          padding: 0.3rem 0.4rem;
          font-size: 0.9rem;
          text-align: center;
          background: #222;
          color: #fff;
          outline: none;
        }
        #stepTimeInput:focus {
          border-color: #eee;
          background: #444;
        }
      </style>
      <tone-loader></tone-loader>
      <osc-controls></osc-controls>
      <scope-canvas></scope-canvas>
      <section id="sequencer" aria-label="Sequencer Controls" role="region" aria-live="polite">
        <div id="stepSlots"></div>
        <div id="sequenceControls">
          <button id="playBtn" disabled>Play Sequence</button>
          <label for="stepTimeInput">Step Time (ms):</label>
          <input type="number" id="stepTimeInput" min="50" max="2000" value="400" />
        </div>
      </section>
    `;

    this.#toneLoader = this.#shadow.querySelector('tone-loader');
    this.#scopeCanvas = this.#shadow.querySelector('scope-canvas');
    this.#oscControls = this.#shadow.querySelector('osc-controls');
    this.#sequencerDiv = this.#shadow.getElementById('sequencer');
    this.#stepSlotsDiv = this.#shadow.getElementById('stepSlots');
    this.#playBtn = this.#shadow.getElementById('playBtn');
    this.#stepTimeInput = this.#shadow.getElementById('stepTimeInput');

    this.SHAPES = ['circle','square','butterfly','lissajous','spiro','harmonograph'];

    // Bind handlers
    this.#onToneReady = this.#onToneReady.bind(this);
    this.#onStartRequest = this.#onStartRequest.bind(this);
    this.#onMuteToggle = this.#onMuteToggle.bind(this);
    this.#onModeChange = this.#onModeChange.bind(this);
    this.#onSequencerToggle = this.#onSequencerToggle.bind(this);
    this.#onStepSlotClick = this.#onStepSlotClick.bind(this);
    this.#onStepSlotClear = this.#onStepSlotClear.bind(this);
    this.#onPlayBtnClick = this.#onPlayBtnClick.bind(this);
    this.#onStepTimeChange = this.#onStepTimeChange.bind(this);
    this.#onKeyDown = this.#onKeyDown.bind(this);

    // Prepare presets at construction
    for (const shape of this.SHAPES) {
      this.#state.presets[shape] = this.deterministicPreset(this.#state.seed, shape);
    }
  }

  connectedCallback() {
    this.#toneLoader.addEventListener('tone-ready', this.#onToneReady);
    this.#oscControls.addEventListener('start-request', this.#onStartRequest);
    this.#oscControls.addEventListener('mute-toggle', this.#onMuteToggle);
    this.#oscControls.addEventListener('mode-change', this.#onModeChange);
    this.#oscControls.addEventListener('sequencer-toggle', this.#onSequencerToggle);
    this.#playBtn.addEventListener('click', this.#onPlayBtnClick);
    this.#stepTimeInput.addEventListener('change', this.#onStepTimeChange);
    document.addEventListener('keydown', this.#onKeyDown);

    // Initialize UI
    this.#oscControls.enabled = false;
    this.#oscControls.playing = false;
    this.#oscControls.muted = true;
    this.#oscControls.shape = this.SHAPES[0];
    this.#scopeCanvas.shape = this.SHAPES[0];
    this.#scopeCanvas.mode = 'seed';
    this.#scopeCanvas.startAnimation();

    // Sequence UI initially hidden
    this.#sequencerDiv.style.display = 'none';
  }

  disconnectedCallback() {
    this.#toneLoader.removeEventListener('tone-ready', this.#onToneReady);
    this.#oscControls.removeEventListener('start-request', this.#onStartRequest);
    this.#oscControls.removeEventListener('mute-toggle', this.#onMuteToggle);
    this.#oscControls.removeEventListener('mode-change', this.#onModeChange);
    this.#oscControls.removeEventListener('sequencer-toggle', this.#onSequencerToggle);
    this.#playBtn.removeEventListener('click', this.#onPlayBtnClick);
    this.#stepTimeInput.removeEventListener('change', this.#onStepTimeChange);
    document.removeEventListener('keydown', this.#onKeyDown);
  }

  // --- Event Handlers ---
  #onToneReady() {
    this.#state.Tone = window.Tone;
    this.#oscControls.enabled = true;
    // Setup initial shape chain for the first shape
    this.#state.currentShape = this.#oscControls.shape;
  }

  async #onStartRequest() {
    if (!this.#state.contextUnlocked) {
      await this.#unlockAudioAndBufferInitial();
    } else if (this.#state.isPlaying) {
      this.#stopAudioAndDraw();
    } else {
      await this.#unlockAudioAndBufferInitial();
    }
  }

  #onMuteToggle() {
    if (!this.#state.Tone) return;
    const mute = !this.#state.isMuted;
    this.#state.isMuted = mute;
    this.#state.Tone.Destination.mute = mute;
    this.#oscControls.muted = mute;
  }

  #onModeChange(e) {
    const shape = e.detail;
    if (!this.SHAPES.includes(shape)) return;
    this.#oscControls.shape = shape;
    this.#scopeCanvas.shape = shape;
    if (this.#state.isPlaying) {
      this.#setActiveChain(shape);
      this.#state.mode = 'live';
    } else {
      this.#state.mode = 'seed';
    }
    this.#scopeCanvas.mode = this.#state.mode;
  }

  #onSequencerToggle() {
    this.#state.isSequencerMode = !this.#state.isSequencerMode;
    this.#sequencerDiv.style.display = this.#state.isSequencerMode ? 'flex' : 'none';
    this.#oscControls.shadowRoot.querySelector('#seqBtn').textContent = this.#state.isSequencerMode ? 'Hide Sequencer' : 'Create Sequence';
    if (this.#state.isSequencerMode) {
      this.#createSequenceUI();
    } else {
      this.#state.isRecording = false;
      this.#state.currentRecordSlot = -1;
      if (this.#state.sequencePlaying) {
        this.#stopSequence();
      }
      this.#updateSequenceUI();
    }
  }

  #onStepSlotClick(e) {
    if (!this.#state.isSequencerMode) return;
    const index = Number(e.target.dataset.index);
    if (this.#state.sequencePlaying) return;
    this.#startRecording(index);
  }

  #onStepSlotClear(e) {
    e.preventDefault();
    if (!this.#state.isSequencerMode) return;
    const index = Number(e.target.dataset.index);
    if (this.#state.sequencePlaying) return;
    this.#clearSlot(index);
  }

  #onPlayBtnClick() {
    if (this.#state.sequencePlaying) {
      this.#stopSequence();
    } else {
      const val = parseInt(this.#stepTimeInput.value, 10);
      if (!isNaN(val) && val >= 50 && val <= 2000) {
        this.#state.stepTime = val;
      } else {
        this.#stepTimeInput.value = this.#state.stepTime;
      }
      this.#playSequence();
    }
  }

  #onStepTimeChange() {
    const val = parseInt(this.#stepTimeInput.value, 10);
    if (!isNaN(val) && val >= 50 && val <= 2000) {
      this.#state.stepTime = val;
    } else {
      this.#stepTimeInput.value = this.#state.stepTime;
    }
  }

  #onKeyDown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const idx = e.key.charCodeAt(0) - 49; // '1' -> 0
    if (idx >= 0 && idx < this.SHAPES.length) {
      if (this.#state.isSequencerMode && this.#state.isRecording) {
        this.#recordStep(idx + 1);
        e.preventDefault();
        return;
      }
      if (this.#oscControls.shadowRoot.querySelector('#shapeSelect').selectedIndex !== idx) {
        this.#oscControls.shadowRoot.querySelector('#shapeSelect').selectedIndex = idx;
        this.#onModeChange({ detail: this.SHAPES[idx] });
      }
      e.preventDefault();
    }
  }

  // --- Audio Graph Management ---
  async #unlockAudioAndBufferInitial() {
    if (this.#state.contextUnlocked) return;
    const T = this.#state.Tone;
    if (!T) return;
    this.#toneLoader.shadowRoot.querySelector('div').textContent = "Unlocking AudioContext...";
    try {
      await T.context.resume();
      this.#state.contextUnlocked = true;
      this.#toneLoader.shadowRoot.querySelector('div').textContent = "Buffering first synth chain...";
      await this.#bufferShapeChain(this.#oscControls.shape);
      this.#setActiveChain(this.#oscControls.shape);
      this.#toneLoader.shadowRoot.querySelector('div').textContent = "Ready. Shape: " + this.#oscControls.shape;
      this.#oscControls.playing = true;
      this.#oscControls.enabled = true;
      this.#state.isPlaying = true;
      this.#state.mode = 'live';
      this.#scopeCanvas.mode = 'live';

      // Buffer other shapes lazily
      setTimeout(() => {
        for (const shape of this.SHAPES) {
          if (shape !== this.#oscControls.shape) {
            this.#bufferShapeChain(shape).catch(e => console.warn(`Buffering ${shape} failed:`, e));
          }
        }
      }, 100);
    } catch (e) {
      console.error("Error unlocking audio:", e);
      this.#toneLoader.shadowRoot.querySelector('div').textContent = "Failed to unlock AudioContext.";
    }
  }

  #stopAudioAndDraw() {
    if (!this.#state.isPlaying) return;
    this.#disposeAllChains();
    this.#state.isPlaying = false;
    this.#oscControls.playing = false;
    this.#oscControls.muted = true;
    if (this.#state.Tone) this.#state.Tone.Destination.mute = false;
    this.#state.mode = 'seed';
    this.#scopeCanvas.mode = 'seed';
    // Stop sequence if playing
    if (this.#state.sequencePlaying) this.#stopSequence();
  }

  #disposeAllChains() {
    for (const shape in this.#state.chains) {
      const chain = this.#state.chains[shape];
      Object.values(chain).forEach(node => {
        try { node?.stop?.(); } catch {}
        try { node?.dispose?.(); } catch {}
      });
    }
    this.#state.chains = {};
    this.#state.currentShape = null;
  }

  async #bufferShapeChain(shape) {
    if (!this.#state.contextUnlocked) return;
    if (this.#state.chains[shape]) return;
    const pr = this.#state.presets[shape];
    const T = this.#state.Tone;
    if (!T) return;
    const osc1 = new T.Oscillator(pr.osc1[1], pr.osc1[0]).start();
    let osc2 = null;
    if (pr.osc2) osc2 = new T.Oscillator(pr.osc2[1], pr.osc2[0]).start();
    const volume = new T.Volume(5);
    const filter = new T.Filter(pr.filter, "lowpass");
    const lfo = new T.LFO(pr.lfo[0]+"n", pr.lfo[1], pr.lfo[2]).start();
    lfo.connect(filter.frequency);
    if (osc2) lfo.connect(osc2.detune);
    osc1.connect(volume);
    if (osc2) osc2.connect(volume);
    volume.connect(filter);
    const reverb = new T.Freeverb().set({ wet: 0.3, roomSize: 0.8 });
    filter.connect(reverb);
    const analyser = T.context.createAnalyser();
    analyser.fftSize = 2048;
    filter.connect(analyser);
    this.#state.chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
  }

  #setActiveChain(shape) {
    if (!this.#state.chains[shape]) return;
    // Disconnect all chains first
    for (const s in this.#state.chains) {
      this.#state.chains[s]?.reverb?.disconnect();
    }
    this.#state.chains[shape].reverb.toDestination();
    this.#state.currentShape = shape;
  }

  // --- Sequencer Logic ---
  #createSequenceUI() {
    this.#stepSlotsDiv.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'step-slot';
      slot.dataset.index = i;
      slot.textContent = this.#state.sequence[i] || '';
      slot.addEventListener('click', this.#onStepSlotClick);
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.#onStepSlotClear(e);
      });
      // Touch support for long press clear
      let pressTimer;
      slot.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
          this.#clearSlot(i);
          e.preventDefault();
        }, 500);
      });
      slot.addEventListener('touchend', () => clearTimeout(pressTimer));
      slot.addEventListener('touchmove', () => clearTimeout(pressTimer));
      this.#stepSlotsDiv.appendChild(slot);
    }
    this.#updateSequenceUI();
  }

  #updateSequenceUI() {
    const slots = this.#stepSlotsDiv.querySelectorAll('.step-slot');
    slots.forEach((slot, i) => {
      slot.textContent = this.#state.sequence[i] || '';
      slot.classList.remove('record-mode', 'active');
      if (this.#state.isRecording && i === this.#state.currentRecordSlot) {
        slot.classList.add('record-mode', 'active');
      } else if (this.#state.isRecording && i > this.#state.currentRecordSlot) {
        slot.classList.add('record-mode');
      }
    });
    this.#playBtn.disabled = !this.#state.sequence.every(s => s !== null);
  }

  #startRecording(slotIndex) {
    if (this.#state.sequencePlaying) return;
    this.#state.isRecording = true;
    this.#state.currentRecordSlot = slotIndex;
    this.#updateSequenceUI();
  }

  #recordStep(keyNumber) {
    if (!this.#state.isRecording || this.#state.currentRecordSlot < 0 || this.#state.currentRecordSlot >= 8) return;
    this.#state.sequence[this.#state.currentRecordSlot] = keyNumber;
    this.#state.currentRecordSlot++;
    if (this.#state.currentRecordSlot >= 8) {
      this.#state.isRecording = false;
      this.#state.currentRecordSlot = -1;
    }
    this.#updateSequenceUI();
  }

  #clearSlot(slotIndex) {
    if (this.#state.sequencePlaying) return;
    this.#state.sequence[slotIndex] = null;
    if (this.#state.isRecording && slotIndex <= this.#state.currentRecordSlot) {
      this.#state.isRecording = false;
      this.#state.currentRecordSlot = -1;
    }
    this.#updateSequenceUI();
  }

  #playSequence() {
    if (this.#state.sequencePlaying || !this.#state.sequence.every(s => s !== null)) return;
    this.#state.sequencePlaying = true;
    this.#state.sequenceStepIndex = 0;
    this.#playBtn.textContent = "Stop Sequence";
    this.#playBtn.disabled = false;
    const playStep = () => {
      if (!this.#state.sequencePlaying) return;
      const stepValue = this.#state.sequence[this.#state.sequenceStepIndex];
      if (stepValue !== null && stepValue >= 1 && stepValue <= 6) {
        this.#triggerStep(stepValue - 1);
      }
      this.#state.sequenceStepIndex = (this.#state.sequenceStepIndex + 1) % 8;
      this.#state.sequenceIntervalId = setTimeout(playStep, this.#state.stepTime);
    };
    playStep();
  }

  #stopSequence() {
    this.#state.sequencePlaying = false;
    clearTimeout(this.#state.sequenceIntervalId);
    this.#state.sequenceIntervalId = null;
    this.#playBtn.textContent = "Play Sequence";
    this.#playBtn.disabled = false;
  }

  #triggerStep(shapeIndex) {
    if (shapeIndex < 0 || shapeIndex >= this.SHAPES.length) return;
    const shape = this.SHAPES[shapeIndex];
    this.#oscControls.shape = shape;
    this.#scopeCanvas.shape = shape;
    if (this.#state.isPlaying) {
      this.#setActiveChain(shape);
      this.#state.mode = 'live';
    } else {
      this.#state.mode = 'seed';
    }
    this.#scopeCanvas.mode = this.#state.mode;
  }

  // --- Helper: deterministic PRNG and preset generator (copied from scope-canvas) ---
  mulberry32(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return () => ((a = Math.imul(a ^ (a >>> 15), 1 | a)), (a >>> 16) / 0x10000);
  }

  deterministicPreset(seed, shape) {
    const rng = this.mulberry32(seed + "_" + shape);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const modeRoll = rng();
    let mode = 1;
    if (modeRoll < 0.18) mode = 0;
    else if (modeRoll < 0.56) mode = 1;
    else if (modeRoll < 0.85) mode = 2;
    else mode = 3;
    let lfoRate;
    if (mode === 0)      lfoRate = 0.07 + rng()*0.3;
    else if (mode === 1) lfoRate = 0.25 + rng()*8;
    else if (mode === 2) lfoRate = 6 + rng()*20;
    else                 lfoRate = 24 + rng()*36;
    let lfoMin, lfoMax;
    if (mode === 0) {
        lfoMin = 400 + rng()*400;
        lfoMax = 900 + rng()*600;
    } else if (mode === 1) {
        lfoMin = 120 + rng()*700;
        lfoMax = 1200 + rng()*1400;
    } else {
        lfoMin = 80 + rng()*250;
        lfoMax = 1500 + rng()*3500;
    }
    const oscCount = mode === 3 ? 2 + (rng() > 0.7 ? 1 : 0) : 1 + (rng() > 0.6 ? 1 : 0);
    const oscs = [];
    for (let i = 0; i < oscCount; ++i) {
        oscs.push([types[(rng()*types.length)|0], notes[(rng()*notes.length)|0]]);
    }
    const filterBase = mode === 0 ? 700 + rng()*500 : 300 + rng()*2400;
    const resonance = 0.6 + rng()*0.7;
    let env = {};
    if (mode === 0) {
        env = { attack: 0.005 + rng()*0.03, decay: 0.04 + rng()*0.08, sustain: 0.1 + rng()*0.2, release: 0.03 + rng()*0.1 };
    } else if (mode === 3) {
        env = { attack: 2 + rng()*8, decay: 4 + rng()*20, sustain: 0.7 + rng()*0.2, release: 8 + rng()*24 };
    } else {
        env = { attack: 0.03 + rng()*0.4, decay: 0.1 + rng()*0.7, sustain: 0.2 + rng()*0.5, release: 0.2 + rng()*3 };
    }
    const reverbWet = (mode === 3 ? 0.4 + rng()*0.5 : 0.1 + rng()*0.5);
    const reverbRoom = (mode === 3 ? 0.85 + rng()*0.12 : 0.6 + rng()*0.38);
    const colorSpeed = 0.06 + rng()*0.22;
    const shapeDrift = 0.0006 + rng()*0.0032;
    return {
        osc1: oscs[0],
        osc2: oscs[1] || null,
        filter: filterBase,
        filterQ: resonance,
        lfo: [lfoRate, lfoMin, lfoMax],
        envelope: env,
        reverb: { wet: reverbWet, roomSize: reverbRoom },
        colorSpeed,
        shapeDrift
    };
  }

  // --- Animation frame handler for live mode to update canvas with analyser data ---
  #animationFrameId = null;
  #animationStep = () => {
    if (!this.#state.isPlaying || this.#state.mode !== 'live' || !this.#state.currentShape) {
      this.#animationFrameId = requestAnimationFrame(this.#animationStep);
      return;
    }
    const chain = this.#state.chains[this.#state.currentShape];
    const analyser = chain?.analyser;
    if (analyser) {
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      this.#scopeCanvas.renderLiveBuffer(buf);
    }
    this.#animationFrameId = requestAnimationFrame(this.#animationStep);
  }

  // Start animation loop for live mode updates
  #startAnimationLoop() {
    if (!this.#animationFrameId) {
      this.#animationFrameId = requestAnimationFrame(this.#animationStep);
    }
  }

  // Stop animation loop
  #stopAnimationLoop() {
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }
}

customElements.define('osc-app', OscApp);
