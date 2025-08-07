// Main orchestrator element. It composes the other custom elements
// together and manages the synthesis graph as well as visual
// parameters. Communication is event-driven: it listens for events from
// its child controls and directs the Tone.js audio graph and canvas
// rendering accordingly. When the Tone engine is loaded the
// orchestrator stores a reference to window.Tone for use in helper
// routines.

import './tone-loader.js';
import './step-sequencer.js';
import './osc-controls.js';
import './scope-canvas.js';
import { OscSynth } from './osc-synth.js';

// --- Helper utilities copied from the original implementation ---
const rand = (a, b) => Math.random() * (b - a) + a;
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate audio parameters using the same logic as the original page.
 * Returns an object containing oscillators, filter, master, phaser and
 * LFOs. The caller is responsible for wiring up the nodes to the
 * destination and disposing them when finished.
 * @param {typeof Tone} T Tone.js reference
 */
function generateAudioParams(T) {
  const scales = {
    pentatonic: ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5'],
    minor: ['A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4'],
    dorian: ['C3','D3','Eb3','F3','G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5']
  };
  const scale = pick(Object.values(scales));
  const note = pick(scale);
  const oscTypes = ['sine', 'square', 'sawtooth', 'triangle'];
  const filterTypes = ['lowpass', 'highpass', 'bandpass'];
  const master = new T.Volume(-12);
  const filter = new T.Filter({ type: pick(filterTypes), frequency: rand(300, 4000), rolloff: -24, Q: rand(1, 10) });
  const oscillators = [new T.Oscillator({ type: pick(oscTypes), frequency: note, volume: -6 }).start()];
  if (Math.random() > 0.4) {
    oscillators.push(new T.Oscillator({ type: pick(oscTypes), frequency: pick(scale), volume: -10, detune: rand(-20, 20) }).start());
  }
  const lfos = [];
  for (let i = 0; i < randi(1, 2); ++i) {
    const lfoType = pick(oscTypes);
    const lfoFreq = rand(0.01, 1.5);
    const tgts = [
      { target: filter.frequency, min: rand(200, 1000), max: rand(1000, 8000) },
      oscillators[1] && { target: oscillators[1].detune, min: rand(-50, -5), max: rand(5, 50) },
      { target: master.volume, min: rand(-15, -1), max: rand(1, 3) }
    ].filter(Boolean);
    const trg = pick(tgts);
    const lfo = new T.LFO({ type: lfoType, frequency: lfoFreq, min: trg.min, max: trg.max, amplitude: 1 }).start();
    lfo.connect(trg.target);
    lfos.push(lfo);
  }
  const phaser = Math.random() > 0.6 ? new T.Phaser({ frequency: rand(0.1, 2), octaves: rand(2, 6), baseFrequency: rand(200, 1000) }) : null;
  return { master, oscillators, filter, lfos, phaser };
}

/**
 * Generate visual parameters for the scope-canvas. Accepts a selected
 * mode string and returns a configuration mirroring the original
 * behaviour. Colours are chosen from analogous, triadic or complementary
 * strategies.
 * @param {string} mode
 */
function generateVisualParams(mode) {
  const baseHue = rand(0, 360);
  const strategies = {
    analogous: [0, 30, 60],
    triadic: [0, 120, 240],
    complementary: [0, 180, 0]
  };
  const offsets = pick(Object.values(strategies));
  const palette = offsets.map(o => `hsla(${(baseHue + o) % 360},90%,60%,0.85)`);
  const bgColor = `hsl(${baseHue},20%,${rand(5, 12)}%)`;
  return {
    palette,
    bgColor,
    baseShape: mode,
    symmetry: randi(1, 8),
    visualLFOs: [
      { type: 'rotation', rate: rand(0.001, 0.01), depth: Math.PI * 2, phase: rand(0, 2 * Math.PI) },
      { type: 'hueShift', rate: rand(0.0005, 0.005), depth: 360, phase: rand(0, 2 * Math.PI) }
    ],
    polygonSides: mode === 'polygon' ? randi(3, 9) : 4,
    particleCount: mode === 'particles' ? randi(50, 200) : 0,
    particleSize: rand(1, 4)
  };
}

/**
 * Dispose of all Tone.js nodes created during a session. Attempts to
 * gracefully stop oscillators, LFOs, filters and the master volume. Any
 * errors during disposal are swallowed.
 * @param {Object} nodes
 */
function disposeAll(nodes) {
  Object.values(nodes).forEach(n => {
    try { n?.stop?.(); } catch {} // eslint-disable-line no-empty
    try { n?.dispose?.(); } catch {} // eslint-disable-line no-empty
  });
}

// (rand, randi, pick, generateVisualParams: keep as before...)

class OscApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isPlaying = false;
    this.Tone = null;
    this.synth = null;
    this.visualParams = null;
    this.currentMode = 'radial';
    this._render();
  }

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = '';
    shadow.appendChild(style);
    this.scopeCanvas = document.createElement('scope-canvas');
    this.controls = document.createElement('osc-controls');
    if (this.hasAttribute('tone-url')) {
      this.controls.setAttribute('tone-url', this.getAttribute('tone-url'));
    }
    shadow.appendChild(this.scopeCanvas);
    shadow.appendChild(this.controls);
    this._bindEvents();
  }

  _bindEvents() {
    this.addEventListener('tone-ready', (ev) => {
      if (!this.Tone) this.Tone = ev.detail?.Tone;
    });
    this.addEventListener('start-request', () => this.startExperience());
    this.addEventListener('mode-change', (ev) => {
      this.currentMode = ev.detail?.mode || this.currentMode;
      if (this.isPlaying) {
        this.stopExperience();
        this.startExperience();
      }
    });
    this.addEventListener('mute-toggle', (ev) => {
      if (!this.Tone) return;
      const muted = ev.detail?.muted;
      this.Tone.Destination.mute = !!muted;
    });
  }

  async startExperience() {
    if (!this.Tone) return;
    if (this.isPlaying) this.stopExperience();
    if (this.controls.loaderDiv) {
      this.controls.loaderDiv.textContent = 'Generating unique experience...';
      this.controls.loaderDiv.style.color = '#aaa';
    }
    await this.Tone.start();
    // Generate audio and visuals
    if (this.synth) this.synth.dispose();
    this.synth = new OscSynth(this.Tone);
    const ana = this.synth.connect(this.Tone.Destination);
    this.visualParams = generateVisualParams(this.currentMode);
    this.isPlaying = true;
    this.controls.setPlaying(true);
    if (this.controls.loaderDiv) {
      this.controls.loaderDiv.textContent = 'Experience active. Generating visuals...';
      this.controls.loaderDiv.style.color = '#aaa';
    }
    this.scopeCanvas.start(ana, this.visualParams);
  }

  stopExperience() {
    if (!this.isPlaying) return;
    this.scopeCanvas.stop();
    if (this.synth) this.synth.dispose();
    this.synth = null;
    this.isPlaying = false;
    this.controls.setPlaying(false);
    if (this.Tone) this.Tone.Destination.mute = false;
    if (this.controls.loaderDiv) {
      this.controls.loaderDiv.textContent = 'Audio engine ready. Click Start.';
      this.controls.loaderDiv.style.color = '#aaa';
    }
  }
}

customElements.define('osc-app', OscApp);
