/**
 * Audio Gnarls Unified Component
 * A complete audio synthesis and visualization application in a single JavaScript file
 * Combines oscilloscope visualization, step sequencer, and seed-based audio generation
 */

(function() {
  'use strict';

  // ============================
  // SHARED UTILITIES (shapes.js)
  // ============================
  
  const humKey = (app) => app?.humKey || 'hum';
  
  const shapeList = (app) => {
    const fromCanvas = app?._canvas?.listShapes?.();
    const base = (Array.isArray(fromCanvas) && fromCanvas.length)
      ? fromCanvas
      : (Array.isArray(app?.shapes) ? app.shapes : []);
    return base.filter(k => k !== humKey(app));
  };
  
  const shapeCount = (app) => shapeList(app).length;
  const allKeys = (app) => [humKey(app), ...shapeList(app)];
  
  const shapeLabel = (app, key) => {
    if (!key) return '';
    const map = app?.shapeLabels || {};
    return map[key] ?? (key[0]?.toUpperCase?.() + key.slice(1));
  };
  
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ============================
  // TONE.JS LOADER
  // ============================
  
  class ToneLoader extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._loaded = false;
      this._loading = false;
    }

    connectedCallback() {
      if (this._loaded || this._loading) return;
      this._loading = true;
      this._render();
      this._loadTone();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: none; }
        </style>
        <div>Loading Tone.js...</div>
      `;
    }

    async _loadTone() {
      if (window.Tone) {
        this._onToneReady();
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/tone@14.7.77/build/Tone.js';
        script.onload = () => this._onToneReady();
        script.onerror = () => this._onToneError();
        document.head.appendChild(script);
      } catch (error) {
        this._onToneError(error);
      }
    }

    _onToneReady() {
      this._loaded = true;
      this._loading = false;
      this.dispatchEvent(new CustomEvent('tone-ready', { 
        detail: { Tone: window.Tone }, 
        bubbles: true, 
        composed: true 
      }));
    }

    _onToneError(error) {
      this._loading = false;
      console.error('Failed to load Tone.js:', error);
      this.dispatchEvent(new CustomEvent('tone-error', { 
        detail: { error }, 
        bubbles: true, 
        composed: true 
      }));
    }
  }

  customElements.define('tone-loader', ToneLoader);

  // ============================
  // SCOPE CANVAS COMPONENT
  // ============================
  
  class ScopeCanvas extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      // Public properties
      this.analyser = null;
      this.preset = null;
      this.shapeKey = 'hum';
      this.mode = 'seed';
      this.isAudioStarted = false;
      this.isPlaying = false;
      this.onIndicatorUpdate = null;
      
      // Private state
      this._canvas = null;
      this._ctx = null;
      this._animationId = null;
      this._seedBuffers = {};
      this._time = 0;
      this._colorPhase = 0;
      
      // Shape parameters
      this._shapeParams = {
        circle:       { freq: 1.0, harmonics: [1, 0.5, 0.25],                 complexity: 0.3 },
        square:       { freq: 1.5, harmonics: [1, 0.3, 0.7, 0.2],             complexity: 0.6 },
        butterfly:    { freq: 2.2, harmonics: [1, 0.4, 0.6, 0.3, 0.2],        complexity: 0.8 },
        lissajous:    { freq: 1.8, harmonics: [1, 0.6, 0.4],                  complexity: 0.5 },
        spiro:        { freq: 3.1, harmonics: [1, 0.3, 0.5, 0.2, 0.4],        complexity: 0.9 },
        harmonograph: { freq: 2.5, harmonics: [1, 0.7, 0.5, 0.3, 0.2, 0.1],   complexity: 1.0 },
        rose:         { freq: 1.7, harmonics: [1, 0.4, 0.3, 0.2],             complexity: 0.4 },
        hypocycloid:  { freq: 2.8, harmonics: [1, 0.5, 0.3, 0.4],             complexity: 0.7 },
        epicycloid:   { freq: 2.9, harmonics: [1, 0.4, 0.5, 0.3],             complexity: 0.7 },
        spiral:       { freq: 1.3, harmonics: [1, 0.3, 0.2],                  complexity: 0.4 },
        star:         { freq: 2.1, harmonics: [1, 0.6, 0.4, 0.2],             complexity: 0.6 },
        flower:       { freq: 1.9, harmonics: [1, 0.5, 0.3, 0.4],             complexity: 0.5 },
        wave:         { freq: 1.1, harmonics: [1, 0.4, 0.2],                  complexity: 0.3 },
        mandala:      { freq: 3.5, harmonics: [1, 0.3, 0.4, 0.2, 0.3, 0.1],   complexity: 1.2 },
        infinity:     { freq: 1.6, harmonics: [1, 0.5, 0.3],                  complexity: 0.4 },
        dna:          { freq: 2.7, harmonics: [1, 0.4, 0.3, 0.5, 0.2],        complexity: 0.8 },
        tornado:      { freq: 3.2, harmonics: [1, 0.3, 0.6, 0.2, 0.4],        complexity: 1.1 },
        hum:          { freq: 0.8, harmonics: [1, 0.2, 0.1],                  complexity: 0.2 },
      };
    }

    connectedCallback() {
      this._render();
      this._setupCanvas();
      this._startAnimation();
    }

    disconnectedCallback() {
      this._stopAnimation();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: 100%;
            background: #000;
          }
          canvas {
            width: 100%;
            height: 100%;
            display: block;
            background: #000;
          }
        </style>
        <canvas width="600" height="600"></canvas>
      `;
    }

    _setupCanvas() {
      this._canvas = this.shadowRoot.querySelector('canvas');
      this._ctx = this._canvas.getContext('2d');
      this._ctx.lineCap = 'round';
      this._ctx.lineJoin = 'round';
    }

    _startAnimation() {
      if (this._animationId) return;
      this._animate();
    }

    _stopAnimation() {
      if (this._animationId) {
        cancelAnimationFrame(this._animationId);
        this._animationId = null;
      }
    }

    _animate() {
      this._time += 0.016; // ~60fps
      this._colorPhase += (this.preset?.colorSpeed || 0.1) * 0.016;
      
      this._draw();
      this._animationId = requestAnimationFrame(() => this._animate());
    }

    _draw() {
      const ctx = this._ctx;
      const canvas = this._canvas;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      
      // Get data
      let data;
      if (this.mode === 'live' && this.analyser && this.isPlaying) {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        data = Array.from(dataArray).map(v => (v / 255) * 2 - 1);
      } else {
        data = this._getSeedBuffer(this.shapeKey, this.preset?.seed || 'default');
      }
      
      if (!data || data.length === 0) return;
      
      // Draw shape
      this._drawShape(ctx, data, cx, cy, Math.min(w, h) * 0.4);
    }

    _drawShape(ctx, data, cx, cy, radius) {
      const shape = this.shapeKey || 'hum';
      const len = data.length;
      
      if (len < 2) return;
      
      // Color based on preset or default
      const hue = (this._colorPhase * 60) % 360;
      const saturation = this.isPlaying ? 80 : 40;
      const lightness = this.isPlaying ? 60 : 30;
      
      ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      ctx.beginPath();
      
      // Draw based on shape type
      switch (shape) {
        case 'circle':
          this._drawCircle(ctx, data, cx, cy, radius);
          break;
        case 'lissajous':
          this._drawLissajous(ctx, data, cx, cy, radius);
          break;
        case 'spiral':
          this._drawSpiral(ctx, data, cx, cy, radius);
          break;
        case 'star':
          this._drawStar(ctx, data, cx, cy, radius);
          break;
        default:
          this._drawDefault(ctx, data, cx, cy, radius);
      }
      
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    _drawCircle(ctx, data, cx, cy, radius) {
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const angle = (i / len) * TAU;
        const r = radius + data[i] * radius * 0.3;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    _drawLissajous(ctx, data, cx, cy, radius) {
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const t = (i / len) * TAU;
        const x = cx + Math.sin(t * 3 + this._time) * radius * (1 + data[i] * 0.3);
        const y = cy + Math.sin(t * 2 + this._time * 0.7) * radius * (1 + data[i] * 0.3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    _drawSpiral(ctx, data, cx, cy, radius) {
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const t = (i / len) * TAU * 3;
        const r = (i / len) * radius * (1 + data[i] * 0.5);
        const x = cx + Math.cos(t + this._time) * r;
        const y = cy + Math.sin(t + this._time) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    _drawStar(ctx, data, cx, cy, radius) {
      const len = data.length;
      const points = 5;
      for (let i = 0; i < len; i++) {
        const angle = (i / len) * TAU;
        const pointIndex = Math.floor((i / len) * points);
        const isOuter = pointIndex % 2 === 0;
        const r = radius * (isOuter ? 1 : 0.5) * (1 + data[i] * 0.3);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    _drawDefault(ctx, data, cx, cy, radius) {
      const len = data.length;
      for (let i = 0; i < len; i++) {
        const angle = (i / len) * TAU;
        const r = radius * (1 + data[i] * 0.5);
        const x = cx + Math.cos(angle + this._time) * r;
        const y = cy + Math.sin(angle + this._time) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    _getSeedBuffer(shape, seed) {
      const key = `${shape}_${seed}`;
      if (this._seedBuffers[key]) {
        return this._seedBuffers[key];
      }
      
      const buffer = this._makeSeedBuffer(shape, seed, 512);
      this._seedBuffers[key] = buffer;
      return buffer;
    }

    _makeSeedBuffer(shape, seed, length = 512) {
      const params = this._shapeParams[shape] || this._shapeParams.hum;
      const rng = this._createRNG(seed + shape);
      const buffer = new Float32Array(length);
      
      for (let i = 0; i < length; i++) {
        let value = 0;
        const t = (i / length) * TAU * params.freq;
        
        // Add harmonics
        for (let h = 0; h < params.harmonics.length; h++) {
          const harmonic = params.harmonics[h];
          const freq = (h + 1) * params.freq;
          const phase = rng() * TAU;
          value += Math.sin(t * freq + phase) * harmonic;
        }
        
        // Add complexity/noise
        value += (rng() - 0.5) * params.complexity * 0.1;
        
        buffer[i] = clamp(value, -1, 1);
      }
      
      return buffer;
    }

    _createRNG(seed) {
      let a = 0x6d2b79f5 ^ seed.length;
      for (let i = 0; i < seed.length; ++i) {
        a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
      }
      return () => {
        a = Math.imul(a ^ (a >>> 15), 1 | a);
        return ((a >>> 16) & 0xffff) / 0x10000;
      };
    }

    // Public API
    listShapes() {
      return Object.keys(this._shapeParams).filter(k => k !== 'hum');
    }
  }

  customElements.define('scope-canvas', ScopeCanvas);


  // ============================
  // STEP SEQUENCER COMPONENT
  // ============================
  
  class SeqApp extends HTMLElement {
    static VALID_SIZES = [8, 16, 32, 64];
    static DEFAULT_STEPS = 8;
    static MIN_MS = 50;
    static MAX_MS = 2000;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      this.state = {
        sequence: Array(8).fill(null),
        velocities: Array(8).fill(1),
        stepTime: 500,
        sequencePlaying: false,
        sequenceStepIndex: 0,
        isRecording: false,
        currentRecordSlot: 0,
        stepCount: 8
      };
      
      this._intervalId = null;
      this._stepSlotsDiv = null;
    }

    connectedCallback() {
      this._render();
      this._setupEventListeners();
    }

    disconnectedCallback() {
      this.stopSequence();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 1rem;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            margin: 1rem 0;
          }
          
          .seq-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .seq-title {
            font-size: 1.1rem;
            font-weight: bold;
            color: #fff;
          }
          
          .seq-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            flex-wrap: wrap;
          }
          
          .seq-button {
            padding: 0.4rem 0.8rem;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
          }
          
          .seq-button:hover {
            background: #444;
            border-color: #666;
          }
          
          .seq-button.active {
            background: #4a9eff;
            border-color: #4a9eff;
          }
          
          .seq-button.recording {
            background: #ff4444;
            border-color: #ff4444;
            animation: pulse 1s infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          .step-time-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .step-time-control label {
            font-size: 0.9rem;
            color: #ccc;
          }
          
          .step-time-control input {
            width: 60px;
            padding: 0.2rem;
            background: #222;
            color: #fff;
            border: 1px solid #555;
            border-radius: 3px;
          }
          
          .step-grid {
            display: grid;
            gap: 0.5rem;
            margin-top: 1rem;
          }
          
          .step-grid.size-8 { grid-template-columns: repeat(8, 1fr); }
          .step-grid.size-16 { grid-template-columns: repeat(8, 1fr); }
          .step-grid.size-32 { grid-template-columns: repeat(8, 1fr); }
          .step-grid.size-64 { grid-template-columns: repeat(8, 1fr); }
          
          .step-slot {
            width: 40px;
            height: 40px;
            background: #222;
            border: 2px solid #444;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9rem;
            color: #888;
            transition: all 0.2s;
            position: relative;
          }
          
          .step-slot:hover {
            border-color: #666;
            background: #333;
          }
          
          .step-slot.filled {
            background: #4a9eff;
            border-color: #4a9eff;
            color: #fff;
          }
          
          .step-slot.active {
            background: #ff9944;
            border-color: #ff9944;
            color: #fff;
            box-shadow: 0 0 10px rgba(255, 153, 68, 0.5);
          }
          
          .step-slot.recording {
            border-color: #ff4444;
            box-shadow: 0 0 8px rgba(255, 68, 68, 0.6);
            animation: recordPulse 0.5s infinite alternate;
          }
          
          @keyframes recordPulse {
            from { background: #222; }
            to { background: #441111; }
          }
          
          .velocity-bar {
            position: absolute;
            bottom: 2px;
            left: 2px;
            right: 2px;
            height: 3px;
            background: rgba(255,255,255,0.3);
            border-radius: 1px;
          }
          
          .velocity-fill {
            height: 100%;
            background: #4a9eff;
            border-radius: 1px;
            transition: width 0.2s;
          }
        </style>
        
        <div class="seq-header">
          <div class="seq-title">Step Sequencer</div>
          <div class="seq-controls">
            <button class="seq-button" id="playBtn">Play</button>
            <button class="seq-button" id="stopBtn">Stop</button>
            <button class="seq-button" id="recordBtn">Record</button>
            <button class="seq-button" id="clearBtn">Clear</button>
            <div class="step-time-control">
              <label>BPM:</label>
              <input type="number" id="bpmInput" min="30" max="200" value="120">
            </div>
          </div>
        </div>
        
        <div class="step-grid size-8" id="stepGrid"></div>
      `;
      
      this._stepSlotsDiv = this.shadowRoot.getElementById('stepGrid');
      this._updateStepGrid();
    }

    _setupEventListeners() {
      const playBtn = this.shadowRoot.getElementById('playBtn');
      const stopBtn = this.shadowRoot.getElementById('stopBtn');
      const recordBtn = this.shadowRoot.getElementById('recordBtn');
      const clearBtn = this.shadowRoot.getElementById('clearBtn');
      const bpmInput = this.shadowRoot.getElementById('bpmInput');
      
      playBtn.addEventListener('click', () => this.playSequence());
      stopBtn.addEventListener('click', () => this.stopSequence());
      recordBtn.addEventListener('click', () => this._toggleRecording());
      clearBtn.addEventListener('click', () => this._clearSequence());
      bpmInput.addEventListener('input', (e) => this._updateBPM(e.target.value));
      
      // Number key listeners for recording
      document.addEventListener('keydown', (e) => this._handleKeyDown(e));
    }

    _updateStepGrid() {
      if (!this._stepSlotsDiv) return;
      
      this._stepSlotsDiv.innerHTML = '';
      this._stepSlotsDiv.className = `step-grid size-${this.state.stepCount}`;
      
      for (let i = 0; i < this.state.stepCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'step-slot';
        slot.dataset.index = i;
        
        const velocityBar = document.createElement('div');
        velocityBar.className = 'velocity-bar';
        const velocityFill = document.createElement('div');
        velocityFill.className = 'velocity-fill';
        velocityBar.appendChild(velocityFill);
        slot.appendChild(velocityBar);
        
        slot.addEventListener('click', () => this._onSlotClick(i));
        slot.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this._clearSlot(i);
        });
        
        this._stepSlotsDiv.appendChild(slot);
      }
      
      this.updateSequenceUI();
    }

    _onSlotClick(index) {
      if (this.state.isRecording) {
        // In recording mode, clicking sets the current record slot
        this.state.currentRecordSlot = index;
        this.updateSequenceUI();
      } else {
        // Normal mode: toggle step
        const current = this.state.sequence[index];
        this.state.sequence[index] = current ? null : 1;
        this.updateSequenceUI();
        this._dispatch('seq-step-changed', { index, value: this.state.sequence[index] });
      }
    }

    _clearSlot(index) {
      this.state.sequence[index] = null;
      this.updateSequenceUI();
      this._dispatch('seq-step-changed', { index, value: null });
    }

    _toggleRecording() {
      this.state.isRecording = !this.state.isRecording;
      if (this.state.isRecording) {
        this.state.currentRecordSlot = 0;
      }
      this._updateRecordButton();
      this.updateSequenceUI();
      this._dispatch('seq-recording-changed', { isRecording: this.state.isRecording });
    }

    _updateRecordButton() {
      const recordBtn = this.shadowRoot.getElementById('recordBtn');
      if (recordBtn) {
        recordBtn.textContent = this.state.isRecording ? 'Stop Rec' : 'Record';
        recordBtn.classList.toggle('recording', this.state.isRecording);
      }
    }

    _clearSequence() {
      this.state.sequence.fill(null);
      this.state.velocities.fill(1);
      this.updateSequenceUI();
      this._dispatch('seq-cleared');
    }

    _updateBPM(bpm) {
      const bpmNum = parseInt(bpm, 10);
      if (bpmNum >= 30 && bpmNum <= 200) {
        this.state.stepTime = Math.round(60000 / (bpmNum * 4)); // 16th notes
        this._dispatch('seq-bpm-changed', { bpm: bpmNum, stepTime: this.state.stepTime });
      }
    }

    _handleKeyDown(e) {
      if (!this.state.isRecording) return;
      
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        this.recordStep(num);
      }
    }

    updateSequenceUI() {
      const slots = this.shadowRoot.querySelectorAll('.step-slot');
      
      slots.forEach((slot, i) => {
        const value = this.state.sequence[i];
        const velocity = this.state.velocities[i];
        const isActive = this.state.sequencePlaying && this.state.sequenceStepIndex === i;
        const isRecording = this.state.isRecording && this.state.currentRecordSlot === i;
        
        slot.textContent = value || '';
        slot.classList.toggle('filled', !!value);
        slot.classList.toggle('active', isActive);
        slot.classList.toggle('recording', isRecording);
        
        const velocityFill = slot.querySelector('.velocity-fill');
        if (velocityFill) {
          velocityFill.style.width = `${velocity * 100}%`;
        }
      });
    }

    playSequence() {
      if (this.state.sequencePlaying) return;
      
      this.state.sequencePlaying = true;
      this.state.sequenceStepIndex = 0;
      
      this._updatePlayButton();
      this._startSequenceLoop();
      this._dispatch('seq-play-started');
    }

    stopSequence() {
      if (!this.state.sequencePlaying) return;
      
      this.state.sequencePlaying = false;
      
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      
      this._updatePlayButton();
      this.updateSequenceUI();
      this._dispatch('seq-play-stopped');
    }

    _startSequenceLoop() {
      this._intervalId = setInterval(() => {
        const value = this.state.sequence[this.state.sequenceStepIndex];
        const velocity = this.state.velocities[this.state.sequenceStepIndex];
        
        if (value) {
          this._dispatch('seq-step-triggered', {
            step: this.state.sequenceStepIndex,
            value,
            velocity
          });
        }
        
        this.state.sequenceStepIndex = (this.state.sequenceStepIndex + 1) % this.state.stepCount;
        this.updateSequenceUI();
        
      }, this.state.stepTime);
    }

    _updatePlayButton() {
      const playBtn = this.shadowRoot.getElementById('playBtn');
      if (playBtn) {
        playBtn.textContent = this.state.sequencePlaying ? 'Playing' : 'Play';
        playBtn.classList.toggle('active', this.state.sequencePlaying);
      }
    }

    recordStep(value) {
      if (!this.state.isRecording) return;
      
      const index = this.state.currentRecordSlot;
      this.state.sequence[index] = value;
      this.state.currentRecordSlot = (index + 1) % this.state.stepCount;
      
      if (this.state.currentRecordSlot === 0) {
        this.state.isRecording = false;
        this._updateRecordButton();
      }
      
      this.updateSequenceUI();
      this._dispatch('seq-step-recorded', { index, value });
    }

    setStepTime(ms) {
      this.state.stepTime = clamp(ms, SeqApp.MIN_MS, SeqApp.MAX_MS);
    }

    _dispatch(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
  }

  customElements.define('seq-app', SeqApp);


  // ============================
  // AUDIO ENGINE
  // ============================
  
  function createEngine(app) {
    // Utility functions
    function _timeNow(Tone) { return Tone?.now?.() ?? 0; }

    function _rampLinear(param, target, seconds, Tone) {
      if (!param || !Tone) return;
      const now = _timeNow(Tone);
      try {
        if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
        const cur = typeof param.value === 'number' ? param.value : param.value?.value;
        if (typeof param.setValueAtTime === 'function') param.setValueAtTime(cur ?? 0, now);
        if (typeof param.linearRampToValueAtTime === 'function') {
          param.linearRampToValueAtTime(target, now + Math.max(0.001, seconds || 0.012));
        }
      } catch {}
    }

    async function _silenceAllChains(fadeSec = 0.012) {
      const Tone = app.state?.Tone; if (!Tone) return;
      const now = _timeNow(Tone);
      _eachChain(chain => {
        const g = chain?.out?.gain ?? chain?.volume?.volume;
        if (g?.linearRampToValueAtTime) {
          try {
            g.cancelScheduledValues?.(now);
            g.setValueAtTime?.(g.value, now);
            g.linearRampToValueAtTime(0, now + fadeSec);
          } catch {}
        }
        const wet = chain?.reverb?.wet;
        if (wet?.rampTo) { try { wet.rampTo(0, fadeSec); } catch {} }
      });
      await _sleep(Math.ceil((fadeSec + 0.002) * 1000));
    }

    function _eachChain(fn) { for (const k in app.state.chains) fn(app.state.chains[k], k); }

    async function _disposeChain(chain) {
      const Tone = app.state?.Tone; const fadeSec = 0.012;
      try {
        if (Tone && chain) {
          const now = _timeNow(Tone);
          const g = chain?.out?.gain ?? chain?.volume?.volume;
          if (g?.linearRampToValueAtTime && g?.setValueAtTime) {
            g.cancelScheduledValues?.(now);
            g.setValueAtTime(g.value, now);
            g.linearRampToValueAtTime(0, now + fadeSec);
          }
          const wet = chain?.reverb?.wet; if (wet?.rampTo) { try { wet.rampTo(0, fadeSec); } catch {} }
          await _sleep(Math.ceil((fadeSec + 0.002) * 1000));
        }
      } catch {}
      for (const n of Object.values(chain || {})) {
        try { n.stop?.(); } catch {}
        try { n.dispose?.(); } catch {}
        try { n.disconnect?.(); } catch {}
      }
    }

    function _rng(seed) {
      let a = 0x6d2b79f5 ^ seed.length;
      for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
      return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000);
    }

    function _createAnalyser(Tone) {
      const analyser = Tone?.context?.createAnalyser?.();
      if (analyser) {
        analyser.fftSize = 2048; 
        try { analyser.smoothingTimeConstant = 0.06; } catch {}
      }
      return analyser || null;
    }

    function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _linToDb(v) {
      const minDb = -60; const maxDb = 0;
      if (v <= 0) return minDb;
      const db = 20 * Math.log10(Math.min(1, Math.max(1e-4, v)));
      return Math.max(minDb, Math.min(maxDb, db));
    }

    // Preset generation
    function deterministicPreset(seed, shape) {
      const rng = _rng(`${seed}_${shape}`);
      const types = ['sine','triangle','square','sawtooth'];
      const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];

      const modeRoll = rng();
      const mode = modeRoll < .18 ? 0 : modeRoll < .56 ? 1 : modeRoll < .85 ? 2 : 3;
      const oscCount = mode === 3 ? 2 + (rng() > .7 ? 1 : 0) : 1 + (rng() > .6 ? 1 : 0);
      const oscs = Array.from({ length: oscCount }, () => [
        types[(rng() * types.length) | 0],
        notes[(rng() * notes.length) | 0]
      ]);

      let lfoRate, lfoMin, lfoMax, filterBase, env;
      if (mode === 0) {
        lfoRate = .07 + rng() * .3; lfoMin = 400 + rng() * 400; lfoMax = 900 + rng() * 600; filterBase = 700 + rng() * 500;
        env = { attack: .005 + rng() * .03, decay: .04 + rng() * .08, sustain: .1 + rng() * .2, release: .03 + rng() * .1 };
      } else if (mode === 1) {
        lfoRate = .25 + rng() * 8; lfoMin = 120 + rng() * 700; lfoMax = 1200 + rng() * 1400; filterBase = 300 + rng() * 2400;
        env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
      } else if (mode === 2) {
        lfoRate = 6 + rng() * 20; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
        env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
      } else {
        lfoRate = 24 + rng() * 36; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
        env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: .7 + rng() * .2, release: 8 + rng() * 24 };
      }

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

    function loadPresets(seed) {
      app.state.presets = Object.fromEntries(shapeList(app).map(k => [k, deterministicPreset(seed, k)]));
    }

    // Audio chain management
    async function bufferHumChain() {
      const { Tone, chains } = app.state; if (!Tone) return;
      const key = humKey(app);
      if (chains[key]) { await _disposeChain(chains[key]); delete chains[key]; }
      try {
        const osc = new Tone.Oscillator('A0', 'sine').start();
        const filter = new Tone.Filter(80, 'lowpass'); filter.Q.value = 0.5;
        const volume = new Tone.Volume(-25);
        const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
        const out = new Tone.Gain(0);
        const analyser = _createAnalyser(Tone);
        osc.connect(volume); volume.connect(filter); filter.connect(reverb);
        if (analyser) filter.connect(analyser);
        reverb.connect(out);
        app.state.chains[key] = { osc, volume, filter, reverb, out, analyser };
      } catch (e) { console.error('Error buffering hum chain', e); delete app.state.chains[key]; }
    }

    async function bufferShapeChain(shape) {
      if (shape === humKey(app)) return bufferHumChain();
      const { Tone, presets, chains } = app.state, pr = presets[shape];
      if (!pr || !Tone) return;
      if (chains[shape]) { await _disposeChain(chains[shape]); delete chains[shape]; }
      try {
        const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
        const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
        const volume = new Tone.Volume(5);
        const filter = new Tone.Filter(pr.filter, 'lowpass'); filter.Q.value = pr.filterQ;
        const lfo = new Tone.LFO(...pr.lfo).start();
        const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
        const out = new Tone.Gain(0);
        const analyser = _createAnalyser(Tone);
        lfo.connect(filter.frequency); if (osc2) lfo.connect(osc2.detune);
        osc1.connect(volume); osc2?.connect(volume); volume.connect(filter); filter.connect(reverb);
        if (analyser) filter.connect(analyser);
        reverb.connect(out);
        chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, out, analyser };
      } catch (e) { console.error('Error buffering chain for shape', shape, e); delete app.state.chains[shape]; }
    }

    function setActiveChain(shape, options = {}) {
      const { 
        updateCanvasShape = true,
        setStateCurrent = updateCanvasShape,
        syncCanvasPlayState = true 
      } = options;
      
      const { Tone, chains, current } = app.state; 
      const dur = 0.008;

      const prev = current ? chains[current] : null;
      if (prev?.reverb?.wet?.rampTo) { 
        try { prev.reverb.wet.rampTo(0, dur); } catch {} 
      }

      const nonce = (app.state._switchNonce = (app.state._switchNonce || 0) + 1);

      const doSwitch = () => {
        if (nonce !== app.state._switchNonce) return;

        _eachChain(chain => chain.reverb?.disconnect?.());
        const next = chains[shape]; 
        next?.reverb?.toDestination?.();

        const patch = { isAudioStarted: true };
        if (next?.analyser) patch.analyser = next.analyser;
        if (syncCanvasPlayState) patch.isPlaying = app.state.isPlaying;
        
        if (app._canvas) {
          Object.assign(app._canvas, patch);
        }

        if (updateCanvasShape) {
          if (shape === humKey(app)) {
            if (app._canvas) {
              app._canvas.shapeKey = humKey(app);
              app._canvas.preset = null;
            }
          } else {
            if (app._canvas) {
              app._canvas.shapeKey = shape;
              app._canvas.preset = app.state.presets[shape];
            }
          }
        }
        
        if (setStateCurrent) app.state.current = shape;

        if (next?.reverb?.wet) {
          try {
            const target = next.reverb.wet.value ?? 0.3;
            if (typeof next.reverb.wet.setValueAtTime === 'function') {
              next.reverb.wet.setValueAtTime(0, Tone?.now?.() ?? 0);
            } else {
              next.reverb.wet.value = 0;
            }
            if (next.reverb.wet.rampTo) {
              next.reverb.wet.rampTo(target, dur);
            } else {
              next.reverb.wet.value = target;
            }
          } catch {}
        }
      };

      setTimeout(doSwitch, Math.max(1, Math.floor(dur * 1000)));
    }

    function disposeAllChains() {
      _eachChain(chain => _disposeChain(chain));
      app.state.chains = {}; 
      app.state.current = null;
    }

    function resetState() {
      disposeAllChains();
      if (app.state.sequencePlaying && app._sequencerComponent) {
        app._sequencerComponent.stopSequence();
      }
      
      const { seed, Tone } = app.state;
      app.state = app.defaultState(seed); 
      app.state.Tone = Tone;
      loadPresets(seed); 
      bufferHumChain();

      const list = shapeList(app);
      const rand = _rng(seed);
      const firstShape = list.length ? list[(rand() * list.length) | 0] : humKey(app);

      if (app._canvas) {
        app._canvas.preset = app.state.presets[firstShape] ?? null;
        app._canvas.shapeKey = firstShape;
        app._canvas.mode = 'seed';
        app._canvas.isAudioStarted = false;
        app._canvas.isPlaying = false;
      }
      
      app.state.current = humKey(app);
      app._updateControls({ 
        isAudioStarted: true, 
        isPlaying: false, 
        isMuted: false, 
        shapeKey: humKey(app) 
      });
      
      app.state.isSequencerMode = false; 
      if (app._sequencerComponent) {
        app._sequencerComponent.style.display = 'none';
      }
      
      app.state.sequence = Array(8).fill(null);
    }

    async function unlockAudioAndBufferInitial() {
      const s = app.state;
      if (s.initialBufferingStarted && !s.initialShapeBuffered) { 
        app._loader.textContent = 'Still preparing initial synth, please wait...'; 
        return; 
      }
      
      if (s.isPlaying) return stopAudioAndDraw();
      
      if (s.contextUnlocked) {
        if (s.initialShapeBuffered) {
          setActiveChain(humKey(app)); 
          s.isPlaying = true; 
          app._updateControls({ isAudioStarted: true, isPlaying: true });
          app._loader.textContent = 'Audio resumed (hum).'; 
          if (app._canvas) app._canvas.isPlaying = true; 
          return;
        }
        app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.'; 
        return;
      }
      
      app._loader.textContent = 'Unlocking AudioContext...';
      try {
        const Tone = s.Tone; 
        if (!Tone) throw new Error('Tone.js not available');
        
        const contextToResume = Tone.getContext?.() || Tone.context; 
        let contextResumed = false;
        if (contextToResume?.resume) { 
          await contextToResume.resume(); 
          contextResumed = true; 
        } else if (Tone.start) { 
          await Tone.start(); 
          contextResumed = true; 
        }
        
        if (!contextResumed) throw new Error('Could not resume AudioContext');
        
        s.contextUnlocked = true; 
        s.initialBufferingStarted = true; 
        app._loader.textContent = `Preparing ${app.humLabel} synth...`;
        
        await bufferHumChain(); 
        setActiveChain(humKey(app)); 
        s.initialShapeBuffered = true; 
        s.isPlaying = true; 
        if (app._canvas) app._canvas.isPlaying = true;
        
        app._updateControls({ isAudioStarted: true, isPlaying: true }); 
        app._loader.textContent = 'Ready. Audio: ' + app.humLabel;

        for (const shape of shapeList(app)) {
          if (!s.contextUnlocked) break;
          try { await bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); }
          await _sleep(0);
        }
      } catch (e) {
        console.error('Failed to unlock AudioContext:', e);
        app._loader.textContent = 'Failed to unlock AudioContext.';
        s.contextUnlocked = false; 
        s.initialBufferingStarted = false; 
        s.initialShapeBuffered = false;
      }
    }

    function stopAudioAndDraw() {
      const s = app.state; 
      if (!s.isPlaying && !s.initialBufferingStarted) return;
      
      s.isPlaying = false; 
      s.initialBufferingStarted = false; 
      s.initialShapeBuffered = false;
      disposeAllChains(); 
      
      if (s.sequencePlaying && app._sequencerComponent) {
        app._sequencerComponent.stopSequence();
      }
      
      if (app._canvas) {
        app._canvas.isPlaying = false; 
        app._canvas.isAudioStarted = false;
      }
      
      resetState();
    }

    return {
      // Utils
      _timeNow, _rampLinear, _silenceAllChains, _eachChain, _disposeChain, _rng, 
      _createAnalyser, _sleep, _linToDb,
      // Presets
      deterministicPreset, loadPresets,
      // Audio
      bufferHumChain, bufferShapeChain, setActiveChain, disposeAllChains, resetState,
      unlockAudioAndBufferInitial, stopAudioAndDraw
    };
  }


  // ============================
  // MAIN APPLICATION COMPONENT
  // ============================
  
  class OscApp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      // Default state
      this.defaultState = (seed) => ({
        seed: seed || 'abcddfgh',
        current: 'hum',
        chains: {},
        presets: {},
        isPlaying: false,
        contextUnlocked: false,
        initialBufferingStarted: false,
        initialShapeBuffered: false,
        volume: 0.7,
        sequence: Array(8).fill(null),
        stepTime: 500,
        sequencePlaying: false,
        sequenceStepIndex: 0,
        isSequencerMode: false,
        Tone: null
      });
      
      this.state = this.defaultState();
      this.humKey = 'hum';
      this.humLabel = 'Power Hum';
      this.shapes = [
        'circle', 'square', 'butterfly', 'lissajous', 'spiro', 'harmonograph',
        'rose', 'hypocycloid', 'epicycloid', 'spiral', 'star', 'flower',
        'wave', 'mandala', 'infinity', 'dna', 'tornado'
      ];
      
      // Components
      this._canvas = null;
      this._sequencerComponent = null;
      this._loader = null;
      this._main = null;
      
      // Engine
      this.engine = null;
    }

    connectedCallback() {
      this._render();
      this._setupComponents();
      this._setupEventListeners();
      this._initializeFromSeed();
    }

    disconnectedCallback() {
      if (this.engine) {
        this.engine.disposeAllChains();
      }
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            height: 100%;
            background: #000;
            color: #fff;
            font-family: 'Courier New', monospace;
            overflow: hidden;
          }
          
          .main-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          
          .canvas-container {
            flex: 1;
            position: relative;
            min-height: 400px;
          }
          
          .loader {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            padding: 1rem 2rem;
            border-radius: 8px;
            border: 1px solid #333;
            z-index: 10;
            text-align: center;
            min-width: 200px;
          }
          
          .controls-container {
            background: rgba(255,255,255,0.05);
            border-top: 1px solid #333;
            padding: 1rem;
          }
          
          .sequencer-container {
            display: none;
            background: rgba(255,255,255,0.03);
            border-top: 1px solid #333;
          }
          
          .sequencer-container.visible {
            display: block;
          }
          
          scope-canvas {
            width: 100%;
            height: 100%;
          }
          
          @media (max-width: 768px) {
            .main-container {
              min-height: 100vh;
            }
            
            .canvas-container {
              min-height: 300px;
            }
            
            .controls-container {
              padding: 0.5rem;
            }
          }
        </style>
        
        <div class="main-container" id="main">
          <div class="canvas-container">
            <scope-canvas></scope-canvas>
            <div class="loader" id="loader">Loading...</div>
          </div>
          
          <div class="controls-container">
            <osc-controls></osc-controls>
          </div>
          
          <div class="sequencer-container" id="sequencerContainer">
            <seq-app></seq-app>
          </div>
        </div>
        
        <tone-loader></tone-loader>
      `;
    }

    _setupComponents() {
      this._main = this.shadowRoot.getElementById('main');
      this._loader = this.shadowRoot.getElementById('loader');
      this._canvas = this.shadowRoot.querySelector('scope-canvas');
      this._sequencerComponent = this.shadowRoot.querySelector('seq-app');
      
      // Initialize engine
      this.engine = createEngine(this);
    }

    _setupEventListeners() {
      // Tone.js ready
      this.shadowRoot.addEventListener('tone-ready', (e) => {
        this.state.Tone = e.detail.Tone;
        this._loader.textContent = 'Tone.js loaded. Click to start audio.';
      });
      
      // Controls events
      this.shadowRoot.addEventListener('start-request', () => {
        this.engine.unlockAudioAndBufferInitial();
      });
      
      this.shadowRoot.addEventListener('mute-toggle', () => {
        this._onMuteToggle();
      });
      
      this.shadowRoot.addEventListener('volume-change', (e) => {
        this._onVolumeChange(e);
      });
      
      this.shadowRoot.addEventListener('shape-change', (e) => {
        this._onShapeChange(e);
      });
      
      this.shadowRoot.addEventListener('seed-change', (e) => {
        this.resetToSeed(e.detail.seed);
      });
      
      this.shadowRoot.addEventListener('sequencer-toggle', () => {
        this._toggleSequencer();
      });
      
      // Sequencer events
      this.shadowRoot.addEventListener('seq-step-triggered', (e) => {
        this._onSequencerStep(e.detail);
      });
      
      this.shadowRoot.addEventListener('seq-play-started', () => {
        this.state.sequencePlaying = true;
      });
      
      this.shadowRoot.addEventListener('seq-play-stopped', () => {
        this.state.sequencePlaying = false;
      });
    }

    _initializeFromSeed() {
      const seedFromHTML = document.documentElement.dataset.seed || 
                          document.body.dataset.seed || 
                          'abcddfgh';
      this.resetToSeed(seedFromHTML);
    }

    resetToSeed(seed) {
      this.state.seed = seed || 'abcddfgh';
      if (this.engine) {
        this.engine.loadPresets(this.state.seed);
        this.engine.resetState();
      }
      this._updateControls({ seed: this.state.seed });
    }

    _onMuteToggle() {
      const Tone = this.state.Tone; 
      if (!Tone?.Destination) return;
      
      const mute = !Tone.Destination.mute; 
      Tone.Destination.mute = mute;
      this._updateControls({ isMuted: mute });
      
      const isPlaying = this.state.isPlaying && !mute; 
      if (this._canvas) {
        this._canvas.isPlaying = isPlaying;
      }
      
      this._loader.textContent = mute ? 'Muted.' : 'Unmuted.';
    }

    _onVolumeChange(e) {
      const vol = e?.detail?.value;
      if (typeof vol === 'number') {
        this.state.volume = Math.min(1, Math.max(0, vol));
        const Tone = this.state.Tone;
        if (Tone?.Destination?.volume) {
          Tone.Destination.volume.value = this.engine._linToDb(this.state.volume);
        }
        this._updateControls({ volume: this.state.volume });
      }
    }

    _onShapeChange(e) {
      const shapeKeyNew = e?.detail?.shapeKey; 
      if (!shapeKeyNew) return;
      
      const s = this.state; 
      const HUM = this.humKey;

      if (!s.contextUnlocked || !s.initialShapeBuffered) {
        if (shapeKeyNew === HUM) {
          if (this._canvas) {
            this._canvas.shapeKey = HUM;
            this._canvas.preset = null;
            this._canvas.mode = 'seed';
          }
        } else {
          if (this._canvas) {
            this._canvas.shapeKey = shapeKeyNew;
            this._canvas.preset = s.presets[shapeKeyNew];
            this._canvas.mode = 'seed';
          }
        }
        this._updateControls({ shapeKey: shapeKeyNew });
        return;
      }

      this.engine.setActiveChain(shapeKeyNew);

      if (shapeKeyNew !== HUM && this._canvas) {
        this._canvas.shapeKey = shapeKeyNew;
        this._canvas.preset = s.presets[shapeKeyNew];
        this._canvas.mode = 'live';
      }
      
      if (this._canvas) {
        this._canvas.isPlaying = !this.state.Tone?.Destination?.mute;
      }
      
      this._updateControls({ shapeKey: shapeKeyNew });
      s.current = shapeKeyNew;
    }

    _toggleSequencer() {
      this.state.isSequencerMode = !this.state.isSequencerMode;
      const container = this.shadowRoot.getElementById('sequencerContainer');
      if (container) {
        container.classList.toggle('visible', this.state.isSequencerMode);
      }
      this._updateControls({ isSequencerMode: this.state.isSequencerMode });
    }

    _onSequencerStep(detail) {
      // Trigger shape change based on sequencer step
      const shapes = this.shapes;
      if (shapes.length > 0) {
        const shapeIndex = (detail.value - 1) % shapes.length;
        const shape = shapes[shapeIndex];
        this._onShapeChange({ detail: { shapeKey: shape } });
      }
    }

    _updateControls(updates) {
      const controls = this.shadowRoot.querySelector('osc-controls');
      if (controls && controls.updateState) {
        controls.updateState(updates);
      }
    }

    _sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // ============================
  // CONTROLS COMPONENT
  // ============================
  
  class OscControls extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      this.state = {
        isAudioStarted: false,
        isPlaying: false,
        isMuted: false,
        volume: 0.7,
        shapeKey: 'hum',
        seed: 'abcddfgh',
        isSequencerMode: false
      };
    }

    connectedCallback() {
      this._render();
      this._setupEventListeners();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          
          .controls {
            display: flex; 
            gap: 1.1rem; 
            align-items: center; 
            flex-wrap: wrap; 
            justify-content: center;
            padding: 0.7rem 1.2rem; 
            background: rgba(255,255,255,0.07); 
            border-radius: 9px;
            width: 95%; 
            max-width: 880px; 
            margin: 0 auto; 
            box-sizing: border-box;
          }
          
          .control-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.3rem 0.55rem;
            background: #23252b;
            border: 1px solid #4e5668;
            border-radius: 8px;
            min-width: fit-content;
          }
          
          .control-group label {
            font-size: 0.95rem;
            color: #cfe3ff;
            letter-spacing: 0.02em;
            white-space: nowrap;
          }
          
          .btn {
            padding: 0.5rem 1rem;
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-family: inherit;
            transition: all 0.2s;
            white-space: nowrap;
          }
          
          .btn:hover {
            background: #444;
            border-color: #666;
          }
          
          .btn.active {
            background: #4a9eff;
            border-color: #4a9eff;
          }
          
          .btn.muted {
            background: #ff4444;
            border-color: #ff4444;
          }
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            width: 120px;
            height: 4px;
            background: #3a3f4a;
            border-radius: 999px;
            outline: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #46ad6d;
            border: 1px solid #2b6b44;
            box-shadow: 0 0 6px #46ad6d55;
            cursor: pointer;
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #46ad6d;
            border: 1px solid #2b6b44;
            cursor: pointer;
          }
          
          select {
            padding: 0.3rem 0.5rem;
            background: #222;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.9rem;
            min-width: 120px;
          }
          
          input[type="text"] {
            padding: 0.3rem 0.5rem;
            background: #222;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.9rem;
            width: 100px;
          }
          
          .volume-display {
            font-size: 0.8rem;
            color: #46ad6d;
            min-width: 35px;
            text-align: right;
          }
          
          @media (max-width: 768px) {
            .controls {
              flex-direction: column;
              gap: 0.8rem;
              padding: 0.5rem;
            }
            
            .control-group {
              width: 100%;
              justify-content: space-between;
            }
            
            input[type="range"] {
              width: 100px;
            }
          }
        </style>
        
        <div class="controls">
          <button class="btn" id="startBtn">Start Audio</button>
          <button class="btn" id="muteBtn">Mute</button>
          
          <div class="control-group">
            <label>Volume:</label>
            <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="0.7">
            <span class="volume-display" id="volumeDisplay">70%</span>
          </div>
          
          <div class="control-group">
            <label>Shape:</label>
            <select id="shapeSelect">
              <option value="hum">Power Hum</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="butterfly">Butterfly</option>
              <option value="lissajous">Lissajous</option>
              <option value="spiro">Spiro</option>
              <option value="harmonograph">Harmonograph</option>
              <option value="rose">Rose</option>
              <option value="hypocycloid">Hypocycloid</option>
              <option value="epicycloid">Epicycloid</option>
              <option value="spiral">Spiral</option>
              <option value="star">Star</option>
              <option value="flower">Flower</option>
              <option value="wave">Wave</option>
              <option value="mandala">Mandala</option>
              <option value="infinity">Infinity</option>
              <option value="dna">DNA</option>
              <option value="tornado">Tornado</option>
            </select>
          </div>
          
          <div class="control-group">
            <label>Seed:</label>
            <input type="text" id="seedInput" value="abcddfgh" maxlength="20">
          </div>
          
          <button class="btn" id="sequencerBtn">Sequencer</button>
        </div>
      `;
    }

    _setupEventListeners() {
      const startBtn = this.shadowRoot.getElementById('startBtn');
      const muteBtn = this.shadowRoot.getElementById('muteBtn');
      const volumeSlider = this.shadowRoot.getElementById('volumeSlider');
      const shapeSelect = this.shadowRoot.getElementById('shapeSelect');
      const seedInput = this.shadowRoot.getElementById('seedInput');
      const sequencerBtn = this.shadowRoot.getElementById('sequencerBtn');
      
      startBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
      });
      
      muteBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('mute-toggle', { bubbles: true, composed: true }));
      });
      
      volumeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this._updateVolumeDisplay(value);
        this.dispatchEvent(new CustomEvent('volume-change', { 
          detail: { value }, 
          bubbles: true, 
          composed: true 
        }));
      });
      
      shapeSelect.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('shape-change', { 
          detail: { shapeKey: e.target.value }, 
          bubbles: true, 
          composed: true 
        }));
      });
      
      seedInput.addEventListener('change', (e) => {
        this.dispatchEvent(new CustomEvent('seed-change', { 
          detail: { seed: e.target.value }, 
          bubbles: true, 
          composed: true 
        }));
      });
      
      sequencerBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('sequencer-toggle', { bubbles: true, composed: true }));
      });
    }

    _updateVolumeDisplay(value) {
      const display = this.shadowRoot.getElementById('volumeDisplay');
      if (display) {
        display.textContent = `${Math.round(value * 100)}%`;
      }
    }

    updateState(updates) {
      Object.assign(this.state, updates);
      
      const startBtn = this.shadowRoot.getElementById('startBtn');
      const muteBtn = this.shadowRoot.getElementById('muteBtn');
      const volumeSlider = this.shadowRoot.getElementById('volumeSlider');
      const shapeSelect = this.shadowRoot.getElementById('shapeSelect');
      const seedInput = this.shadowRoot.getElementById('seedInput');
      const sequencerBtn = this.shadowRoot.getElementById('sequencerBtn');
      
      if (startBtn) {
        startBtn.textContent = this.state.isPlaying ? 'Stop Audio' : 'Start Audio';
        startBtn.classList.toggle('active', this.state.isPlaying);
      }
      
      if (muteBtn) {
        muteBtn.textContent = this.state.isMuted ? 'Unmute' : 'Mute';
        muteBtn.classList.toggle('muted', this.state.isMuted);
      }
      
      if (volumeSlider && 'volume' in updates) {
        volumeSlider.value = this.state.volume;
        this._updateVolumeDisplay(this.state.volume);
      }
      
      if (shapeSelect && 'shapeKey' in updates) {
        shapeSelect.value = this.state.shapeKey;
      }
      
      if (seedInput && 'seed' in updates) {
        seedInput.value = this.state.seed;
      }
      
      if (sequencerBtn) {
        sequencerBtn.classList.toggle('active', this.state.isSequencerMode);
      }
    }
  }

  customElements.define('osc-controls', OscControls);
  customElements.define('osc-app', OscApp);


  // ============================
  // SEED SYNTH WRAPPER COMPONENT
  // ============================
  
  class SeedSynthElement extends HTMLElement {
    static get observedAttributes() {
      return ['seed', 'show-sequencer'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._oscApp = null;
      this._initialized = false;
      this._defaultOptions = {
        seed: '5s567g67',
        showSequencer: false,
        audioContext: null,
      };
      this._options = { ...this._defaultOptions };
    }

    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;

      const seedAttr = this.getAttribute('seed');
      const showSeq = this.hasAttribute('show-sequencer');
      this.setOptions({ seed: seedAttr || this._defaultOptions.seed, showSequencer: showSeq });

      this._render();
      setTimeout(() => this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true })), 0);
    }

    disconnectedCallback() {
      this._oscApp?.disconnectedCallback?.();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._initialized || oldVal === newVal) return;
      switch (name) {
        case 'seed':
          this.seed = newVal || this._defaultOptions.seed;
          break;
        case 'show-sequencer':
          this._updateSequencerVisibility();
          break;
      }
    }

    setOptions(opts = {}) {
      this._options = { ...this._options, ...opts };
      if (this._oscApp) this._applyOptionsToOscApp();
    }

    get seed() {
      return this._options.seed;
    }
    
    set seed(v) {
      this._options.seed = String(v || this._defaultOptions.seed);
      this.setAttribute('seed', this._options.seed);
      if (this._oscApp) {
        this._oscApp.resetToSeed?.(this._options.seed);
        const input = this._oscApp.shadowRoot?.getElementById('seedInput');
        if (input) input.value = this._options.seed;
      }
    }

    get options() {
      const e = this._oscApp;
      if (!e) return [];
      const shapes = e.shapes || [];
      const humKey = e.humKey || 'hum';
      const humLabel = e.humLabel || 'Power Hum';
      return [{ key: humKey, label: humLabel }, ...shapes.map(k => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))];
    }

    get currentKey() {
      return this._oscApp?.state?.current || this._oscApp?.humKey || 'hum';
    }

    setCurrent(key) {
      if (!this._oscApp) return;
      this._oscApp._onShapeChange?.({ detail: { shapeKey: key } });
    }

    async start() {
      if (!this._oscApp) throw new Error('Component not ready');
      this._oscApp.engine?.unlockAudioAndBufferInitial?.();
    }

    stop() {
      if (!this._oscApp) return;
      if (this._oscApp.state?.isPlaying) this._oscApp.engine?.stopAudioAndDraw?.();
      if (this._oscApp.state?.sequencePlaying) this.stopSequence();
    }

    mute(forceBool) {
      if (!this._oscApp) return;
      if (typeof forceBool === 'boolean') {
        const muted = this._oscApp.state?.Tone?.Destination?.mute ?? false;
        if (muted !== forceBool) this._oscApp._onMuteToggle?.();
      } else {
        this._oscApp._onMuteToggle?.();
      }
    }

    get muted() {
      const e = this._oscApp;
      if (!e) return true;
      const dest = e.state?.Tone?.Destination;
      return !!dest?.mute;
    }

    recordStep(n) {
      const el = this._oscApp?._sequencerComponent;
      if (!el) return;
      const val = (typeof n === 'number' && n >= 1 && n <= 9) ? n : 1;
      el.recordStep?.(val);
    }

    playSequence() {
      this._oscApp?._sequencerComponent?.playSequence?.();
    }

    stopSequence() {
      this._oscApp?._sequencerComponent?.stopSequence?.();
    }

    setStepTime(ms) {
      if (this._oscApp) {
        this._oscApp.state.stepTime = ms;
        this._oscApp?._sequencerComponent?.setStepTime?.(ms);
      }
    }

    getAnalyser() {
      return this._oscApp?.state?.chains?.[this.currentKey]?.analyser || null;
    }

    getState() {
      const s = this._oscApp?.state;
      if (!s) return null;
      return {
        seed: s.seed,
        currentKey: s.current,
        sequence: [...s.sequence],
        stepTime: s.stepTime,
        muted: !!s.Tone?.Destination?.mute,
        isSequencerMode: s.isSequencerMode,
        sequencePlaying: s.sequencePlaying,
      };
    }

    setState(patch = {}) {
      if (!this._oscApp) return;
      if (patch.seed) this.seed = patch.seed;
      if (patch.currentKey) this.setCurrent(patch.currentKey);
      if (Array.isArray(patch.sequence)) this._oscApp.state.sequence = [...patch.sequence];
      if (typeof patch.stepTime === 'number') this.setStepTime(patch.stepTime);
      if (typeof patch.muted === 'boolean') this.mute(patch.muted);
      if (typeof patch.isSequencerMode === 'boolean') {
        this._oscApp.state.isSequencerMode = patch.isSequencerMode;
        this._updateSequencerVisibility();
      }
      if (patch.sequencePlaying) this.playSequence(); 
      else this.stopSequence();
    }

    get audioContext() { return this._options.audioContext || null; }
    set audioContext(ctx) { this._options.audioContext = ctx; }

    get tone() { return window.Tone || null; }
    set tone(T) { window.Tone = T; }

    dispose() {
      this._oscApp?.disconnectedCallback?.();
      this._oscApp = null;
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; width:100%; height:100%; }
          osc-app { width:100%; height:100%; }
        </style>
        <osc-app></osc-app>
      `;
      this._oscApp = this.shadowRoot.querySelector('osc-app');
      this._applyOptionsToOscApp();
      this._updateSequencerVisibility();
    }

    _applyOptionsToOscApp() {
      if (!this._oscApp) return;
      if (this._oscApp.state) {
        this._oscApp.state.seed = this._options.seed;
        const input = this._oscApp.shadowRoot?.getElementById('seedInput');
        if (input) input.value = this._options.seed;
      }
    }

    _updateSequencerVisibility() {
      if (!this._oscApp) return;
      const seq = this._oscApp._sequencerComponent;
      if (seq) {
        const show = this.hasAttribute('show-sequencer') || !!this._options.showSequencer;
        seq.style.display = show ? '' : 'none';
        this._oscApp.state.isSequencerMode = !!show;
      }
    }
  }

  customElements.define('seed-synth', SeedSynthElement);

})(); // End of IIFE

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SeedSynthElement };
}

