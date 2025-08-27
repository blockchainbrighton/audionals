// Import all internal components
import './internal/tone-loader.js';
import './internal/scope-canvas.js';
import './internal/osc-controls.js';
import './internal/seq-app.js';

// Import the main orchestrator to extend from it
import './internal/osc-app.js';

/**
 * SeedSynthElement - A unified Web Component that packages the synthesizer
 * into a single drop-in component with a clean public API.
 */
class SeedSynthElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initialize internal state
    this._options = null;
    this._oscApp = null;
    this._initialized = false;
    
    // Default options
    this._defaultOptions = {
      seed: '5s567g67',
      showSequencer: false,
      toneModuleUrl: 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0',
      audioContext: null
    };
    
    // Bind methods
    this._onReady = this._onReady.bind(this);
    this._onOptionChange = this._onOptionChange.bind(this);
    this._onStateChange = this._onStateChange.bind(this);
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    
    // Parse attributes
    const options = {
      ...this._defaultOptions,
      seed: this.getAttribute('seed') || this._defaultOptions.seed,
      showSequencer: this.hasAttribute('show-sequencer')
    };
    
    this.setOptions(options);
    this._render();
  }

  disconnectedCallback() {
    if (this._oscApp) {
      this._oscApp.dispose?.();
    }
  }

  // Attribute observation
  static get observedAttributes() {
    return ['seed', 'show-sequencer'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._initialized) return;
    
    switch (name) {
      case 'seed':
        if (newValue !== oldValue) {
          this.seed = newValue;
        }
        break;
      case 'show-sequencer':
        this._updateSequencerVisibility();
        break;
    }
  }

  // Public API - Options
  setOptions(opts) {
    this._options = { ...this._defaultOptions, ...opts };
    if (this._oscApp) {
      this._applyOptionsToOscApp();
    }
  }

  // Public API - Seed and Options
  get seed() {
    return this._options?.seed || this._defaultOptions.seed;
  }

  set seed(value) {
    if (this._options) {
      this._options.seed = value;
    }
    this.setAttribute('seed', value);
    if (this._oscApp) {
      this._oscApp.state.seed = value;
      // Regenerate presets for new seed
      this._oscApp.state.presets = {};
      // Update UI
      const seedInput = this._oscApp.shadowRoot?.getElementById('seedInput');
      if (seedInput) {
        seedInput.value = value;
      }
    }
  }

  get options() {
    if (!this._oscApp) return [];
    
    const shapes = this._oscApp.shapes || [];
    const humKey = this._oscApp.humKey || 'hum';
    const humLabel = this._oscApp.humLabel || 'Power Hum';
    
    return [
      { key: humKey, label: humLabel },
      ...shapes.map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1)
      }))
    ];
  }

  get currentKey() {
    return this._oscApp?.state?.current || this._oscApp?.humKey || 'hum';
  }

  setCurrent(key) {
    if (!this._oscApp) return;
    
    // Find the option and trigger the change
    const options = this.options;
    const option = options.find(opt => opt.key === key);
    if (option) {
      // Simulate the shape change event
      this._oscApp._onShapeChange({ detail: { value: key } });
      this._dispatchOptionChange(key, option.label);
    }
  }

  // Public API - Transport
  async start() {
    if (!this._oscApp) {
      throw new Error('Component not ready');
    }
    
    // Wait for Tone to be ready if not already
    if (!window.Tone) {
      await new Promise((resolve) => {
        const checkTone = () => {
          if (window.Tone) {
            resolve();
          } else {
            setTimeout(checkTone, 100);
          }
        };
        checkTone();
      });
    }
    
    // Ensure audio context is resumed (user gesture requirement)
    if (window.Tone && window.Tone.context.state !== 'running') {
      await window.Tone.start();
    }
    
    // Trigger the start request
    this._oscApp._onStartRequest();
  }

  stop() {
    if (!this._oscApp) return;
    
    // Stop audio if playing
    if (this._oscApp.state.isPlaying) {
      this._oscApp._onStartRequest(); // Toggle off
    }
    
    // Stop sequence if playing
    if (this._oscApp.state.sequencePlaying) {
      this.stopSequence();
    }
  }

  mute(value) {
    if (!this._oscApp) return;
    
    if (typeof value === 'boolean') {
      // Set specific mute state
      const currentlyMuted = !this._oscApp.state.isPlaying;
      if (currentlyMuted !== value) {
        this._oscApp._onMuteToggle();
      }
    } else {
      // Toggle mute
      this._oscApp._onMuteToggle();
    }
  }

  get muted() {
    return this._oscApp ? !this._oscApp.state.isPlaying : true;
  }

  // Public API - Sequencer
  recordStep(indexOrNumber) {
    if (!this._oscApp?._sequencerComponent) return;
    
    // Convert to 0-based index if needed
    const index = typeof indexOrNumber === 'number' && indexOrNumber >= 1 && indexOrNumber <= 9 
      ? indexOrNumber - 1 
      : indexOrNumber;
    
    this._oscApp._sequencerComponent.recordStep?.(index);
  }

  playSequence() {
    if (!this._oscApp?._sequencerComponent) return;
    this._oscApp._sequencerComponent.playSequence?.();
  }

  stopSequence() {
    if (!this._oscApp?._sequencerComponent) return;
    this._oscApp._sequencerComponent.stopSequence?.();
  }

  setStepTime(ms) {
    if (!this._oscApp) return;
    this._oscApp.state.stepTime = ms;
    if (this._oscApp._sequencerComponent) {
      this._oscApp._sequencerComponent.setStepTime?.(ms);
    }
  }

  // Public API - Analysis
  getAnalyser() {
    return this._oscApp?.state?.analyser || null;
  }

  // Public API - State
  getState() {
    if (!this._oscApp) return null;
    
    const state = this._oscApp.state;
    return {
      seed: state.seed,
      currentKey: state.current,
      sequence: [...state.sequence],
      stepTime: state.stepTime,
      muted: !state.isPlaying,
      isSequencerMode: state.isSequencerMode,
      sequencePlaying: state.sequencePlaying
    };
  }

  setState(newState) {
    if (!this._oscApp || !newState) return;
    
    const state = this._oscApp.state;
    
    if (newState.seed) {
      this.seed = newState.seed;
    }
    
    if (newState.currentKey) {
      this.setCurrent(newState.currentKey);
    }
    
    if (newState.sequence) {
      state.sequence = [...newState.sequence];
    }
    
    if (typeof newState.stepTime === 'number') {
      this.setStepTime(newState.stepTime);
    }
    
    if (typeof newState.muted === 'boolean') {
      this.mute(newState.muted);
    }
    
    if (typeof newState.isSequencerMode === 'boolean') {
      state.isSequencerMode = newState.isSequencerMode;
      this._updateSequencerVisibility();
    }
  }

  // Public API - Advanced
  get audioContext() {
    return this._options?.audioContext || null;
  }

  set audioContext(ctx) {
    if (this._options) {
      this._options.audioContext = ctx;
    }
  }

  get tone() {
    return window.Tone || null;
  }

  set tone(toneInstance) {
    window.Tone = toneInstance;
  }

  dispose() {
    if (this._oscApp) {
      this._oscApp.disconnectedCallback?.();
      this._oscApp = null;
    }
  }

  // Internal methods
  _render() {
    // Create a wrapper for the osc-app component
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        osc-app {
          width: 100%;
          height: 100%;
        }
        
        .sequencer-hidden osc-app::part(sequencer) {
          display: none !important;
        }
      </style>
      <osc-app></osc-app>
    `;

    // Get the osc-app element and set up event listeners
    this._oscApp = this.shadowRoot.querySelector('osc-app');
    
    // Wait for the osc-app to be ready
    this._setupOscAppIntegration();
  }

  _setupOscAppIntegration() {
    if (!this._oscApp) return;

    // Override the osc-app's seed if needed
    if (this._options.seed !== this._defaultOptions.seed) {
      // Wait for osc-app to initialize, then update seed
      setTimeout(() => {
        if (this._oscApp.state) {
          this._oscApp.state.seed = this._options.seed;
          const seedInput = this._oscApp.shadowRoot?.getElementById('seedInput');
          if (seedInput) {
            seedInput.value = this._options.seed;
          }
        }
      }, 100);
    }

    // Set up event forwarding
    this._setupEventForwarding();
    
    // Apply initial options
    this._applyOptionsToOscApp();
    
    // Update sequencer visibility
    this._updateSequencerVisibility();
    
    // Dispatch ready event after a short delay to ensure everything is set up
    setTimeout(() => {
      this._dispatchReady();
    }, 200);
  }

  _setupEventForwarding() {
    if (!this._oscApp) return;

    // Listen for tone-ready events from the tone-loader
    const toneLoader = this._oscApp.shadowRoot?.querySelector('tone-loader');
    if (toneLoader) {
      toneLoader.addEventListener('tone-ready', this._onReady);
    }
    
    // Monitor state changes by observing the controls
    const controls = this._oscApp._controls;
    if (controls) {
      controls.addEventListener('shape-change', this._onOptionChange);
      controls.addEventListener('start-request', () => this._onStateChange());
      controls.addEventListener('mute-toggle', () => this._onStateChange());
    }
    
    // Monitor sequencer events
    const sequencer = this._oscApp._sequencerComponent;
    if (sequencer) {
      sequencer.addEventListener('seq-play-started', () => this._onStateChange());
      sequencer.addEventListener('seq-play-stopped', () => this._onStateChange());
      sequencer.addEventListener('seq-step-advance', () => this._onStateChange());
    }
    
    // Monitor scope for frame events (optional)
    const scope = this._oscApp._canvas;
    if (scope && scope.onIndicatorUpdate) {
      const originalUpdate = scope.onIndicatorUpdate;
      scope.onIndicatorUpdate = (text, audioActive) => {
        originalUpdate(text, audioActive);
        // Dispatch scope frame event if needed
        this._dispatchScopeFrame();
      };
    }
  }

  _applyOptionsToOscApp() {
    if (!this._oscApp || !this._options) return;

    // Apply audio context if provided
    if (this._options.audioContext) {
      // This would need to be integrated with the tone-loader
      // For now, we'll store it for later use
    }

    // Apply custom tone module URL if provided
    if (this._options.toneModuleUrl !== this._defaultOptions.toneModuleUrl) {
      // This would need to be passed to the tone-loader
      // For now, we'll store it for later use
    }
  }

  _updateSequencerVisibility() {
    if (!this._oscApp) return;

    const sequencer = this._oscApp._sequencerComponent;
    if (sequencer) {
      const shouldShow = this.hasAttribute('show-sequencer') || this._options?.showSequencer;
      sequencer.style.display = shouldShow ? '' : 'none';
    }
  }

  // Event handlers
  _onReady() {
    this._dispatchReady();
  }

  _onOptionChange(event) {
    const { value } = event.detail || {};
    if (value) {
      const option = this.options.find(opt => opt.key === value);
      if (option) {
        this._dispatchOptionChange(value, option.label);
      }
    }
  }

  _onStateChange() {
    this._dispatchStateChange();
  }

  // Event dispatching
  _dispatchReady() {
    this.dispatchEvent(new CustomEvent('ready', {
      bubbles: true,
      composed: true
    }));
  }

  _dispatchOptionChange(key, label) {
    this.dispatchEvent(new CustomEvent('optionchange', {
      bubbles: true,
      composed: true,
      detail: { key, label }
    }));
  }

  _dispatchStateChange() {
    this.dispatchEvent(new CustomEvent('statechange', {
      bubbles: true,
      composed: true,
      detail: { state: this.getState() }
    }));
  }

  _dispatchScopeFrame() {
    // Get the current analyser buffer if available
    const analyser = this.getAnalyser();
    if (analyser) {
      const buffer = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatTimeDomainData(buffer);
      
      this.dispatchEvent(new CustomEvent('scopeframe', {
        bubbles: true,
        composed: true,
        detail: { buffer }
      }));
    }
  }
}

// Register the custom element
customElements.define('seed-synth', SeedSynthElement);

export { SeedSynthElement };

