// oscilloscope-module.js

import './tone-loader.js';
import { generateVisualParams, drawFuncs } from './oscB-visual-settings-component.js';
import { generateSynthSettings, wireSynthSettings, disposeSynthSettings } from './oscB-synth-settings.js';


class OscilloscopeApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.analyser = null;
    this.audioNodes = null;
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.visualParams = null;
    this.currentMode = 'radial';
    this.dataArray = null;
    this.isPlaying = false;
    console.log('[OscilloscopeApp] Constructed');
  }

  connectedCallback() {
    console.log('[OscilloscopeApp] connectedCallback');
    this.render();
    this.canvas = this.shadowRoot.getElementById('oscilloscope');
    this.ctx = this.canvas.getContext('2d');
    this.setupEventListeners();
    this.resize();
    this.setVisualMode(0);
    this.startVisuals();

    window.addEventListener('tone-ready', () => {
      console.log('[OscilloscopeApp] Received tone-ready event');
      this.initAudio();
      this.playSound();
    });

    window.addEventListener('resize', () => this.resize());
  }

  render() {
    console.log('[OscilloscopeApp] Rendering');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100vh; background: #000; color: #0f0; font-family: monospace; overflow: hidden; }
        canvas { display: block; margin: 0 auto; border: 1px solid #333; }
        .controls { position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
        button { background: #111; color: #0f0; border: 1px solid #0f0; padding: 8px 12px; cursor: pointer; font-size: 14px; }
        button:hover { background: #222; }
      </style>
      <tone-loader></tone-loader>
      <div class="controls">
        <button id="play">Play Sound</button>
        <button id="stop">Stop Sound</button>
        <div id="pattern-buttons"></div>
      </div>
      <canvas id="oscilloscope"></canvas>
    `;

    // Dynamically create 10 pattern buttons
    const patternButtonsContainer = this.shadowRoot.getElementById('pattern-buttons');
    for (let i = 0; i < 10; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Pattern ${i + 1}`;
      btn.dataset.index = i;
      patternButtonsContainer.appendChild(btn);
    }
  }

  setupEventListeners() {
    console.log('[OscilloscopeApp] Setting up event listeners');
    this.shadowRoot.getElementById('play').addEventListener('click', () => {
      console.log('[OscilloscopeApp] Play button clicked');
      this.playSound();
    });
    this.shadowRoot.getElementById('stop').addEventListener('click', () => {
      console.log('[OscilloscopeApp] Stop button clicked');
      this.stopSound();
    });

    const patternButtons = this.shadowRoot.querySelectorAll('#pattern-buttons button');
    patternButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        console.log('[OscilloscopeApp] Pattern button clicked:', index);
        this.setVisualMode(index);
      });
    });

    window.addEventListener('resize', () => {
      console.log('[OscilloscopeApp] Window resize');
      this.resize();
    });
  }

  initAudio() {
    if (!window.Tone) {
      console.error('[OscilloscopeApp] Tone.js not loaded!');
      return;
    }
    console.log('[OscilloscopeApp] Initializing audio');
    this.analyser = window.Tone.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  playSound() {
    if (this.isPlaying) {
      console.log('[OscilloscopeApp] playSound called, but already playing');
      return;
    }
    if (!window.Tone) {
      console.error('[OscilloscopeApp] playSound: Tone.js not loaded!');
      return;
    }

    if (this.audioNodes) {
      console.log('[OscilloscopeApp] Disposing previous synth');
      disposeSynthSettings(this.audioNodes);
    }

    console.log('[OscilloscopeApp] Generating synth settings');
    this.audioNodes = generateSynthSettings(window.Tone);

    console.log('[OscilloscopeApp] Wiring synth settings');
    wireSynthSettings(this.audioNodes, window.Tone, this.analyser, true);

    this.isPlaying = true;
    console.log('[OscilloscopeApp] Synth is playing');
  }

  stopSound() {
    if (!this.isPlaying || !this.audioNodes) {
      console.log('[OscilloscopeApp] stopSound called, but not playing');
      return;
    }
    console.log('[OscilloscopeApp] Disposing synth and stopping sound');
    disposeSynthSettings(this.audioNodes);
    this.audioNodes = null;
    this.isPlaying = false;
  }

  setVisualMode(index) {
    const modes = [
        'radial', 'spiral', 'lissajous', 'flower', 'hypotrochoid',
        'polygon', 'layers', 'particles', 'gridPulse', 'waveform'
      ];
    const mode = modes[index % modes.length] || 'radial';
    this.currentMode = mode;
    this.visualParams = generateVisualParams(mode);
    console.log('[OscilloscopeApp] Visual mode set to:', mode, this.visualParams);
  }

  startVisuals() {
    console.log('[OscilloscopeApp] Starting visuals');
    this.setVisualMode(0); // Default pattern
    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();

      // Get audio data
      if (this.analyser && this.isPlaying) {
        this.analyser.getByteTimeDomainData(this.dataArray);
      } else {
        this.dataArray = new Uint8Array(this.analyser?.frequencyBinCount || 1024).fill(128);
      }

      // Normalize data to -1..1
      const floatData = new Float32Array(this.dataArray.length);
      for (let i = 0; i < this.dataArray.length; i++) {
        floatData[i] = (this.dataArray[i] / 128) - 1;
      }

      // Draw current visual
      const drawFunc = drawFuncs[this.currentMode] || drawFuncs.radial;
      drawFunc(floatData, performance.now() / 1000, this.visualParams, this.ctx, this.canvas.width, this.canvas.height);

      this.ctx.restore();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  resize() {
    const rect = this.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height * 0.8);
    if (this.canvas) {
      this.canvas.width = size;
      this.canvas.height = size;
      console.log('[OscilloscopeApp] Canvas resized to', size, 'x', size);
    }
  }

  disconnectedCallback() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      console.log('[OscilloscopeApp] Animation cancelled');
    }
    this.stopSound();
    console.log('[OscilloscopeApp] Disconnected');
  }
}

customElements.define('oscilloscope-app', OscilloscopeApp);
