// The third application is a stripped down oscilloscope and synthesiser
// that randomly generates a new audio/visual preset each time audio is
// started.  It supports only start/stop, mute/unmute and shape
// selection.  When the shape changes the preset is regenerated.
class OscApp3 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // State
    this.state = {
      isPlaying: false,
      isAudioStarted: false,
      Tone: null,
      nodes: {},
      currentPreset: null
    };
    // Bind methods
    this._onToneReady = this._onToneReady.bind(this);
    this._onStartRequest = this._onStartRequest.bind(this);
    this._onMuteToggle = this._onMuteToggle.bind(this);
    this._onShapeChange = this._onShapeChange.bind(this);
    this._updateIndicator = this._updateIndicator.bind(this);
    // Shape definitions in order
    this.shapes = ['circle','square','butterfly','lissajous'];
    this.shapeLabels = { circle:'Circle', square:'Square', butterfly:'Butterfly', lissajous:'Lissajous' };
  }
  connectedCallback() {
    // Build UI
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    this._canvas = document.createElement('scope-canvas');
    wrapper.appendChild(this._canvas);
    this._controls = document.createElement('osc-controls');
    wrapper.appendChild(this._controls);
    this._loader = document.createElement('div');
    this._loader.id = 'loader';
    this._loader.textContent = 'Initializing...';
    wrapper.appendChild(this._loader);
    const style = document.createElement('style');
    style.textContent = `
      :host { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
      #wrapper { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
      #loader { font-size: 0.9rem; color: #aaa; min-height: 1.2rem; text-align: center; }
    `;
    // Append tone loader, style and wrapper
    this.shadowRoot.append(style, document.createElement('tone-loader'), wrapper);
    // Setup controls shapes
    const shapeOptions = this.shapes.map(k => ({ value: k, label: this.shapeLabels[k] }));
    this._controls.setShapes(shapeOptions);
    // Event wiring
    this.shadowRoot.querySelector('tone-loader').addEventListener('tone-ready', this._onToneReady);
    this._controls.addEventListener('start-request', this._onStartRequest);
    this._controls.addEventListener('mute-toggle', this._onMuteToggle);
    this._controls.addEventListener('shape-change', this._onShapeChange);
    // Canvas indicator callback updates loader
    this._canvas.onIndicatorUpdate = this._updateIndicator;
    // Disable controls until Tone is ready
    this._controls.disableAll(true);
  }
  // random preset generator based on the original
  generatePreset() {
    const Randomizers = {
      choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
      range: (min, max) => Math.random() * (max - min) + min,
      intRange: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
      frequency: (baseNote = 'C2', octaves = 4, Tone) => {
        const baseFreq = Tone ? Tone.Frequency(baseNote).toFrequency() : 65.41;
        const octave = Randomizers.intRange(0, octaves);
        const multiplier = Math.pow(2, octave);
        const detune = Randomizers.range(0.995, 1.005);
        return baseFreq * multiplier * detune;
      },
      harmonicFrequency: (baseFreq, ratios = [0.5,1,1.5,2,2.5]) => {
        const ratio = Randomizers.choice(ratios);
        return baseFreq * ratio;
      }
    };
    const oscTypes = ['sine','square','sawtooth','triangle'];
    const baseNote = Randomizers.choice(['C','D','E','G','A']) + Randomizers.choice(['2','3','4']);
    const baseFreq = Randomizers.frequency(baseNote, 3, this.state.Tone);
    const preset = {
      osc1: [Randomizers.choice(oscTypes), baseFreq],
      osc2: Math.random() > 0.3 ? null : [Randomizers.choice(oscTypes), Randomizers.harmonicFrequency(baseFreq)],
      filter: {
        type: Randomizers.choice(['lowpass','highpass']),
        frequency: Randomizers.intRange(800, 4000),
        rolloff: Randomizers.choice([-12, -24])
      },
      lfo: {
        type: Randomizers.choice(oscTypes),
        rate: Randomizers.range(0.05, 3),
        depth: Randomizers.range(100, 3000),
        target: Randomizers.choice(['frequency','filter'])
      },
      visual: {
        baseRotationSpeed: Randomizers.range(-0.3, 0.3),
        scaleModDepth: Randomizers.range(0.05, 0.2),
        hueShiftSpeed: Randomizers.range(0.005, 0.05),
        lineWidth: Randomizers.range(1.5, 3.5),
        useAlpha: Math.random() > 0.5
      }
    };
    return preset;
  }
  async startAudioAndDraw() {
    if (this.state.isPlaying) return;
    const Tone = this.state.Tone;
    if (!Tone) {
      this._loader.textContent = 'Tone.js not loaded.';
      return;
    }
    await Tone.start();
    this.disposeNodes();
    const pr = this.generatePreset();
    this.state.currentPreset = pr;
    // Build audio graph
    const osc1 = this.state.nodes.osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
    let osc2 = null;
    if (pr.osc2) {
      osc2 = this.state.nodes.osc2 = new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start();
    }
    const volume = this.state.nodes.volume = new Tone.Volume(-10);
    const filter = this.state.nodes.filter = new Tone.Filter(pr.filter.frequency, pr.filter.type);
    filter.rolloff = pr.filter.rolloff;
    const lfo = this.state.nodes.lfo = new Tone.LFO(pr.lfo.rate, pr.lfo.depth * 0.5, pr.lfo.depth * 1.5).start();
    lfo.type = pr.lfo.type;
    if (pr.lfo.target === 'frequency') {
      lfo.connect(osc1.frequency);
      if (osc2) lfo.connect(osc2.frequency);
    } else {
      lfo.connect(filter.frequency);
    }
    osc1.connect(volume);
    if (osc2) osc2.connect(volume);
    volume.connect(filter);
    filter.toDestination();
    const analyser = this.state.nodes.analyser = Tone.context.createAnalyser();
    analyser.fftSize = 2048;
    filter.connect(analyser);
    this.state.isPlaying = true;
    this.state.isAudioStarted = true;
    // Update canvas properties
    this._canvas.analyser = analyser;
    this._canvas.preset = pr;
    this._canvas.isAudioStarted = true;
    this._canvas.isPlaying = true;
    // Update controls
    this._controls.updateState({ isAudioStarted: true, isPlaying: true, isMuted: Tone.Destination.mute, shapeKey: this.currentShapeKey });
    this._loader.textContent = 'Audio playing.';
  }
  stopAudioAndDraw() {
    if (!this.state.isPlaying) return;
    cancelAnimationFrame(this.state.nodes.animId);
    this._canvas.isPlaying = false;
    this.disposeNodes();
    this.state.isPlaying = false;
    // Reset destination mute
    if (this.state.Tone) this.state.Tone.Destination.mute = false;
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: this.currentShapeKey });
    this._loader.textContent = 'Audio stopped.';
    this._canvas.isAudioStarted = true;
  }
  disposeNodes() {
    Object.values(this.state.nodes).forEach(n => {
      try { if (n && typeof n.stop === 'function') n.stop(); } catch (_) {}
      try { if (n && typeof n.dispose === 'function') n.dispose(); } catch (_) {}
    });
    this.state.nodes = {};
  }
  // Event handlers
  _onToneReady() {
    this.state.Tone = window.Tone;
    this._loader.textContent = 'Audio engine ready. Click Start.';
    this._controls.disableAll(false);
    // Set initial shape in controls
    this.currentShapeKey = this.shapes[0];
    this._controls.updateState({ isAudioStarted: true, isPlaying: false, isMuted: true, shapeKey: this.currentShapeKey });
    // Set canvas properties
    this._canvas.shapeKey = this.currentShapeKey;
  }
  _onStartRequest() {
    if (this.state.isPlaying) {
      this.stopAudioAndDraw();
    } else {
      this.startAudioAndDraw();
    }
  }
  _onMuteToggle() {
    const Tone = this.state.Tone;
    if (!Tone) return;
    const muted = Tone.Destination.mute = !Tone.Destination.mute;
    this._controls.updateState({ isAudioStarted: true, isPlaying: this.state.isPlaying, isMuted: muted, shapeKey: this.currentShapeKey });
    this._loader.textContent = muted ? 'Audio muted.' : 'Audio unmuted.';
    this._canvas.isPlaying = this.state.isPlaying && !muted;
  }
  _onShapeChange(e) {
    const shapeKey = e.detail.shapeKey;
    if (!shapeKey) return;
    this.currentShapeKey = shapeKey;
    // Update canvas shape immediately
    this._canvas.shapeKey = shapeKey;
    // Generate a new preset for the new shape
    const pr = this.generatePreset();
    this.state.currentPreset = pr;
    this._canvas.preset = pr;
    // If playing, restart the audio with the new preset
    if (this.state.isPlaying) {
      this.stopAudioAndDraw();
      this.startAudioAndDraw();
    } else {
      // When not playing update canvas without starting audio
      this._controls.updateState({ isAudioStarted: this.state.isAudioStarted, isPlaying: false, isMuted: this.state.Tone?.Destination?.mute, shapeKey: shapeKey });
    }
  }
  _updateIndicator(text, audioActive) {
    this._loader.textContent = text;
  }
}
customElements.define('osc-app', OscApp3);