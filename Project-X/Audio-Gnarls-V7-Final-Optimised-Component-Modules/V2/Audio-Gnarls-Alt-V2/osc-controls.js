// This component encapsulates the control surface for the oscilloscope
// synthesizer. It exposes buttons for starting/regenerating the
// experience, muting/unmuting audio and selecting a visualisation mode.
// It lazily loads Tone.js via an embedded <tone-loader> and enables
// itself once the engine is ready. CustomEvents are emitted for
// `start-request`, `mode-change` and `mute-toggle` to decouple the
// UI from the application logic. The orchestrator should call
// setPlaying(true|false) to reflect the current playback state.
class OscControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Find seed from host attribute
    this._seed = this._getSeedFromHost();
    this._random = this._makeSeededRandom(this._seed);

    // Internal state
    this._muted = false;
    this._playing = false;
    this._toneReady = false;
    this.sequencer = null;

    // Event bindings
    this._onModeChange = null;
    this._onStepTrigger = null;
    this._onSequenceStart = null;
    this._onSequenceStop = null;

    // Generate deterministic sound profiles (1 per mode)
    this._soundPresets = this._generateSoundPresets();

    this._render();
    this._setupEventListeners();
  }

  /**
   * Read seed from the host element's data-seed attribute
   */
  _getSeedFromHost() {
    const app = document.querySelector('osc-app');
    const seedAttr = app?.getAttribute('data-seed');
    return seedAttr ? parseInt(seedAttr, 10) : 42; // fallback
  }

  /**
   * Creates a seeded random number generator (xorshift)
   */
  _makeSeededRandom(seed) {
    let x = seed;
    return () => {
      x = Math.sin(x) * 10000; // deterministic float
      return x - Math.floor(x); // return fractional part [0,1)
    };
  }

  /**
   * Generate 10 deterministic sound presets tied to each visualization mode
   */
  _generateSoundPresets() {
    const modes = [
      'radial', 'polygon', 'layers', 'particles', 'spiral',
      'waveform', 'starburst', 'ripple', 'orbit', 'fractal'
    ];

    return modes.map((mode, index) => {
      // Use index + seed to make each preset deterministic
      const rand = this._makeSeededRandom(this._seed + index);

      const getRandInRange = (min, max) => min + rand() * (max - min);
      const chooseOne = (arr) => arr[Math.floor(rand() * arr.length)];

      // Example sound parameters (Tone.js Synth-like config)
      return {
        mode,
        oscillator: {
          type: chooseOne(['sine', 'triangle', 'square', 'sawtooth'])
        },
        envelope: {
          attack: getRandInRange(0.1, 1.5),
          decay: getRandInRange(0.1, 0.5),
          sustain: getRandInRange(0.3, 0.8),
          release: getRandInRange(0.5, 2.0)
        },
        filter: {
          frequency: getRandInRange(400, 5000),
          type: chooseOne(['lowpass', 'bandpass', 'highpass']),
          rolloff: -12
        },
        lfo: {
          frequency: getRandInRange(0.1, 8),
          depth: rand()
        },
        note: chooseOne(['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2']),
        modulation: chooseOne(['am', 'fm', 'none']),
        reverb: rand() > 0.5
      };
    });
  }

  /**
   * Public method to get the sound preset for a given mode
   */
  getSoundPreset(mode) {
    return this._soundPresets.find(p => p.mode === mode) || this._soundPresets[0];
  }

  /**
   * Force regeneration of presets (e.g., after seed change)
   */
  _regeneratePresets() {
    this._soundPresets = this._generateSoundPresets();
    this.dispatchEvent(new CustomEvent('sound-presets-changed', {
      bubbles: true,
      composed: true,
      detail: { presets: this._soundPresets }
    }));
  }

  connectedCallback() {
    document.addEventListener('keydown', this._onKeyDown);

    // Listen for external seed changes
    document.querySelector('osc-app')?.addEventListener('seed-changed', (e) => {
      const newSeed = parseInt(e.detail.seed, 10);
      this._seed = newSeed;
      this._random = this._makeSeededRandom(newSeed);
      this._regeneratePresets();
      console.log(`[OscControls] Seed updated to ${newSeed}. Sound presets regenerated.`);
    });
  }

  disconnectedCallback() {
    // Clean up all listeners when element is removed
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
    // Only allow shortcuts when Tone is ready and controls are active
    if (!this._toneReady || this.startBtn.disabled) return;

    const key = event.key;
    if (!/^[0-9]$/.test(key)) return; // Only 0–9

    // Convert key to index (0 = 0, ..., 9 = 9)
    const index = parseInt(key, 10);
    const options = this.modeSelect.querySelectorAll('option');
    
    if (index < options.length) {
      // Update select value
      this.modeSelect.value = options[index].value;
      // Dispatch mode-change event
      this.dispatchEvent(new CustomEvent('mode-change', {
        bubbles: true,
        composed: true,
        detail: { mode: this.modeSelect.value }
      }));

      // Optional: visual feedback (highlight selected briefly)
      this.modeSelect.focus();
      this.modeSelect.style.boxShadow = '0 0 10px rgba(100, 150, 255, 0.6)';
      setTimeout(() => {
        if (this.modeSelect) this.modeSelect.style.boxShadow = '';
      }, 300);

      // Prevent default only if you want to block browser defaults (e.g., address bar focus)
      // event.preventDefault();
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
    // When stopping, reset mute state and label
    if (!playing) {
      this._muted = false;
      this.muteBtn.textContent = 'Mute';
    }
  }

  /**
   * Optional getter for the current mode, exposed for convenience.
   */
  get mode() {
    return this.modeSelect.value;
  }
}

customElements.define('osc-controls', OscControls);