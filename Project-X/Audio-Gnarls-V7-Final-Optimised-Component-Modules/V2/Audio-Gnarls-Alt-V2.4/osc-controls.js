// osc-controls.js

// This component encapsulates the control surface for the oscilloscope
// synthesizer. It exposes buttons for starting/regenerating the
// experience, muting/unmuting audio and selecting a visualisation mode.
// It lazily loads Tone.js via an embedded <tone-loader> and enables
// itself once the engine is ready. CustomEvents are emitted for
// `start-request`, `mode-change` and `mute-toggle` to decouple the
// UI from the application logic. The orchestrator should call
// setPlaying(true|false) to reflect the current playback state.
// osc-controls.js
class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._seed = this._getSeedFromHost();
    this._soundPresets = this._generateSoundPresets(this._seed);

    this._muted = false;
    this._playing = false;
    this._toneReady = false;
    this.sequencer = null;

    this._render();
    this._setupEventListeners();
  }

  
  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  _getSeedFromHost() {
    const app = document.querySelector('osc-app');
    const seedAttr = app?.getAttribute('data-seed');
    return seedAttr ? parseInt(seedAttr, 10) : 42;
  }

  // Simple, repeatable seeded RNG (xorshift-inspired)
  static makeSeededRandom(seed) {
    let x = seed || 123456;
    return () => {
      x ^= x << 13; x ^= x >> 17; x ^= x << 5;
      return (x < 0 ? ~x + 1 : x) % 10000 / 10000;
    };
  }

  // All synth params for each mode, fully deterministic for a given seed
  _generateSoundPresets(seed) {
    const modes = [
      'radial', 'polygon', 'layers', 'particles', 'spiral',
      'waveform', 'starburst', 'ripple', 'orbit', 'fractal'
    ];
    const presetBank = [];
    const robustSeed = s => (s * 0xdeadbeef) ^ (s << 7) ^ (s >> 3);
  
    modes.forEach((mode, index) => {
      const base = robustSeed(seed + index * 971);
      const rand = OscControls.makeSeededRandom(base);
      const choose = arr => arr[Math.floor(rand() * arr.length)];
      const randf = (a, b) => a + rand() * (b - a);
  
      const scaleModes = {
        pentatonic: ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5'],
        minor: ['A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4'],
        dorian: ['C3','D3','Eb3','F3','G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5'],
        lydian: ['C3','D3','E3','F#3','G3','A3','B3','C4','D4','E4','F#4','G4','A4','B4','C5']
      };
      const scaleNames = Object.keys(scaleModes);
      const scaleName = choose(scaleNames);
      const scale = scaleModes[scaleName];
  
      const numVoices = 8 + Math.floor(rand() * 3);
      const voiceTypes = ['Synth','MonoSynth','FMSynth','AMSynth','MembraneSynth','MetalSynth','PluckSynth'];
      const bank = [];
  
      for (let i = 0; i < numVoices; i++) {
        const pitch = i === 0 ? scale[0] : choose(scale);
        const instType = choose(voiceTypes);
  
        const isPercussive = i < Math.floor(numVoices / 3);
        const env = isPercussive ? {
          // Prevent attack too short (clicks), decay too fast (inaudible)
          attack: this._clamp(randf(0.005, 0.05), 0.001, 0.1),
          decay: this._clamp(randf(0.05, 0.4), 0.02, 0.5),
          sustain: this._clamp(randf(0.2, 0.6), 0.1, 0.8), // avoid full decay
          release: this._clamp(randf(0.1, 1.5), 0.1, 2.0)
        } : {
          // Pads: prevent attack too long (no onset), release too short (abrupt)
          attack: this._clamp(randf(0.1, 1.0), 0.05, 3.0),
          decay: this._clamp(randf(0.2, 1.2), 0.1, 2.0),
          sustain: this._clamp(randf(0.5, 1.0), 0.3, 1.0),
          release: this._clamp(randf(1.0, 4.0), 0.5, 6.0)
        };
  
        const oscType = choose(['sine','triangle','square','sawtooth']);
  
        // Ensure volume is in audible range: -6 to -18 dB
        const volume = this._clamp(
          isPercussive
            ? -6 - randf(0, 6)    // -6 to -12
            : -12 - randf(0, 6),  // -12 to -18
          -24, -3  // hard clamp: no quieter than -24 dB, no louder than -3 dB
        );
  
        bank.push({
          note: pitch,
          inst: instType,
          envelope: env,
          oscType,
          volume
        });
      }
  
      // Drone: ensure it's present but not too quiet
      const droneEnabled = rand() > 0.5;
      const drone = droneEnabled ? {
        note: scale[0],
        type: choose(['sine','triangle']),
        volume: this._clamp(-12 - randf(0, 6), -18, -6) // -12 to -18, clamped to -18..-6
      } : null;
  
      const oscTypesAll = ['sine', 'triangle', 'square', 'sawtooth'];
      const filterTypesAll = ['lowpass', 'bandpass', 'highpass', 'notch', 'peaking'];
  
      // 🔊 Critical: Add tempo to every preset
      const tempo = Math.floor(randf(80, 160)); // 80–159 BPM
  
      const preset = {
        mode,
        scale,
        scaleName,
        bank,
        drone,
        tempo, // ✅ Now included
        filter: {
          frequency: this._clamp(randf(400, 6000), 200, 8000), // avoid extreme cutoff
          type: choose(filterTypesAll),
          rolloff: choose([-12, -24, -48]),
          Q: this._clamp(randf(0.4, 8), 0.2, 10)
        },
        lfo: {
          type: choose(oscTypesAll),
          frequency: this._clamp(randf(0.01, 0.4), 0.001, 2),
          depth: this._clamp(randf(0.05, 0.7), 0.01, 1) // avoid zero depth
        },
        phaser: rand() > 0.5 ? {
          frequency: this._clamp(randf(0.1, 4), 0.01, 20),
          octaves: this._clamp(randf(1, 8), 0.5, 8),
          baseFrequency: this._clamp(randf(40, 1000), 20, 5000)
        } : null,
        distortion: rand() > 0.6 ? this._clamp(randf(0.05, 0.8), 0.01, 1) : null,
        bitcrusher: rand() > 0.8 ? Math.floor(randf(1, 6)) : null,
        chorus: rand() > 0.5 ? this._clamp(randf(0.5, 4.0), 0.1, 5.0) : null,
        reverb: rand() > 0.4,
        detune: randf(-50, 50)
      };
  
      presetBank.push(preset);
    });
  
    return presetBank;
  }

  // Public: get params for a given mode (string)
  getSoundPreset(mode) {
    return this._soundPresets.find(p => p.mode === mode) || this._soundPresets[0];
  }

  // Regenerate presets (e.g., on seed change)
  _regeneratePresets() {
    this._soundPresets = this._generateSoundPresets(this._seed);
    this.dispatchEvent(new CustomEvent('sound-presets-changed', {
      bubbles: true, composed: true, detail: { presets: this._soundPresets }
    }));
  }

  connectedCallback() {
    document.addEventListener('keydown', this._onKeyDown);

    document.querySelector('osc-app')?.addEventListener('seed-changed', (e) => {
      const newSeed = parseInt(e.detail.seed, 10);
      this._seed = newSeed;
      this._regeneratePresets();
      console.log(`[OscControls] Seed updated to ${newSeed}. Sound presets regenerated.`);
    });
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.removeEventListener('mode-change', this._onModeChange);
    if (this._onStepTrigger) document.removeEventListener('step-trigger', this._onStepTrigger);
    if (this._onSequenceStart) document.removeEventListener('sequence-start', this._onSequenceStart);
    if (this._onSequenceStop) document.removeEventListener('sequence-stop', this._onSequenceStop);
  }

  _setupEventListeners() {
    // Forward mode-change to step sequencer if recording
    this._onModeChange = (e) => {
      if (this.sequencer && typeof this.sequencer.captureMode === 'function') {
        this.sequencer.captureMode(e.detail.mode);
      }
    };
    this.addEventListener('mode-change', this._onModeChange);

    // Handle step-trigger from sequencer: auto-switch mode
    this._onStepTrigger = (e) => {
      const { mode } = e.detail;
      const option = Array.from(this.modeSelect.options).find(opt => opt.value === mode);
      if (option) {
        this.modeSelect.value = mode;
        this.dispatchEvent(new CustomEvent('mode-change', {
          bubbles: true,
          composed: true,
          detail: { mode }
        }));
      }
    };
    document.addEventListener('step-trigger', this._onStepTrigger);

    // Optional: react to playback start/stop
    this._onSequenceStart = () => {
      // You could disable regenerate during playback if desired
      // this.startBtn.disabled = true;
    };
    document.addEventListener('sequence-start', this._onSequenceStart);

    this._onSequenceStop = () => {
      // this.startBtn.disabled = false;
    };
    document.addEventListener('sequence-stop', this._onSequenceStop);
  }

  _onKeyDown = (event) => {
    if (!this._toneReady || this.startBtn.disabled) return;
    const key = event.key;
    if (!/^[0-9]$/.test(key)) return;
    const index = parseInt(key, 10);
    const options = this.modeSelect.querySelectorAll('option');
    if (index < options.length) {
      this.modeSelect.value = options[index].value;
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true, composed: true, detail: { mode: this.modeSelect.value }
      }));
      this.modeSelect.focus();
      this.modeSelect.style.boxShadow = '0 0 10px rgba(100, 150, 255, 0.6)';
      setTimeout(() => { if (this.modeSelect) this.modeSelect.style.boxShadow = ''; }, 300);
    }
  };

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';
    // Styles mirror the original index.html while keeping them scoped to
    // this component via shadow DOM. Pseudo-classes (hover/active) are
    // supported natively inside a shadow tree.
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: grid;
        gap: 0.5rem;
        justify-items: center;
      }
      #controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
      }
      button, select {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        border: 1px solid #666;
        background: linear-gradient(to bottom, #333, #222);
        color: #eee;
        font-weight: 500;
        cursor: pointer;
        transition: 0.2s;
      }
      button:hover, select:hover {
        background: linear-gradient(to bottom, #444, #333);
        border-color: #888;
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.3);
      }
      button:active {
        transform: translateY(1px);
      }
      button:disabled, select:disabled {
        opacity: 0.5;
        cursor: default;
      }
      #loader {
        font-size: 1rem;
        color: #aaa;
        min-height: 1.4rem;
        text-align: center;
        font-style: italic;
      }
      #info {
        font-size: 0.85rem;
        color: #888;
        text-align: center;
        max-width: 90%;
      }
    `;
    shadow.appendChild(style);
    
    // Container for the main buttons and select.
    const container = document.createElement('div');
    container.id = 'controls';

    // Start/Regenerate button
    this.startBtn = document.createElement('button');
    this.startBtn.textContent = 'Generate New Experience';
    this.startBtn.disabled = true;
    this.startBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('start-request', { bubbles: true, composed: true }));
    });
    container.appendChild(this.startBtn);

    // Mute/Unmute button
    this.muteBtn = document.createElement('button');
    this.muteBtn.textContent = 'Mute';
    this.muteBtn.disabled = true;
    this.muteBtn.addEventListener('click', () => {
      // Toggle internal state and update label.
      this._muted = !this._muted;
      this.muteBtn.textContent = this._muted ? 'Unmute' : 'Mute';
      this.dispatchEvent(new CustomEvent('mute-toggle', {
        bubbles: true,
        composed: true,
        detail: { muted: this._muted }
      }));
    });
    container.appendChild(this.muteBtn);

    // Visual mode selector
    this.modeSelect = document.createElement('select');
    const modes = [
      { value: 'radial', label: 'Radial Waves' },
      { value: 'polygon', label: 'Dynamic Polygons' },
      { value: 'layers', label: 'Layered Interference' },
      { value: 'particles', label: 'Particle Flow' },
      { value: 'spiral', label: 'Spiral Patterns' },
      { value: 'waveform', label: 'Oscilloscope Waveform' },
      { value: 'starburst', label: 'Starburst Radiance' },
      { value: 'ripple', label: 'Water Ripple Effect' },
      { value: 'orbit', label: 'Orbiting Bodies' },
      { value: 'fractal', label: 'Fractal Growth' }
    ];
    modes.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this.modeSelect.appendChild(opt);
    });
    this.modeSelect.disabled = true;
    this.modeSelect.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true,
        composed: true,
        detail: { mode: this.modeSelect.value }
      }));
    });
    container.appendChild(this.modeSelect);

    // Append controls container
    shadow.appendChild(container);

    // Loader message
    this.loaderDiv = document.createElement('div');
    this.loaderDiv.id = 'loader';
    this.loaderDiv.textContent = 'Initializing audio engine...';
    shadow.appendChild(this.loaderDiv);

    // Informational text
    const info = document.createElement('div');
    info.id = 'info';
    info.textContent = 'Each generation creates unique, slowly evolving audiovisual patterns.';
    shadow.appendChild(info);

    // Step Sequencer UI (must be defined first via script import)
    const sequencer = document.createElement('step-sequencer');
    shadow.appendChild(sequencer);
    this.sequencer = sequencer;

    // Tone loader element – hidden but functional
    const toneLoader = document.createElement('tone-loader');
    if (this.hasAttribute('tone-url')) {
      toneLoader.setAttribute('tone-url', this.getAttribute('tone-url'));
    }
    shadow.appendChild(toneLoader);

    // Event handlers for tone lifecycle
    this.addEventListener('tone-ready', (ev) => {
      if (this._toneReady) return;
      this._toneReady = true;
      this.loaderDiv.textContent = `Tone.js v${ev.detail?.Tone?.version || '?' } ready.`;
      this.startBtn.disabled = false;
      this.modeSelect.disabled = false;
      // Mute button remains disabled until playback starts
    });

    this.addEventListener('tone-error', (ev) => {
      this.loaderDiv.textContent = 'Failed to load Tone.js. App cannot start.';
      this.loaderDiv.style.color = '#f66';
      this.startBtn.disabled = true;
      this.muteBtn.disabled = true;
      this.modeSelect.disabled = true;
      console.error('[OscControls] Tone.js load error:', ev.detail);
    });
  }

  /**
   * Called by the orchestrator to reflect whether the experience is playing
   * or stopped. Updates button states accordingly.
   * @param {boolean} playing
   */
  setPlaying(playing) {
    this._playing = playing;
    this.startBtn.textContent = playing ? 'Regenerate Experience' : 'Generate New Experience';
    this.muteBtn.disabled = !playing;
    if (!playing) {
      this._muted = false;
      this.muteBtn.textContent = 'Mute';
    }
  }
  get mode() { return this.modeSelect.value; }
}
customElements.define('osc-controls', OscControls);