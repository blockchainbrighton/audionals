// osc-synth.js
// Headless, stateless audio module for Tone.js synth chain, fully externalized.

export class OscSynth {
    /**
     * @param {typeof Tone} Tone - Tone.js reference (must be loaded)
     * @param {object} params - Synth config { scaleMode, oscTypes, filterTypes, ... }
     */
    constructor(Tone, params = {}) {
      this.Tone = Tone;
      this.params = params;
      this.nodes = this._buildChain();
    }
  
    _pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    _rand(a, b) {
      return Math.random() * (b - a) + a;
    }
    _randi(a, b) {
      return Math.floor(this._rand(a, b + 1));
    }
  
    _buildChain() {
      const T = this.Tone;
      // Accept param overrides but fall back to random if not provided
      const scales = {
        pentatonic: ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5'],
        minor: ['A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4'],
        dorian: ['C3','D3','Eb3','F3','G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5']
      };
      const scale = this.params.scale || this._pick(Object.values(scales));
      const note = this.params.note || this._pick(scale);
      const oscTypes = this.params.oscTypes || ['sine', 'square', 'sawtooth', 'triangle'];
      const filterTypes = this.params.filterTypes || ['lowpass', 'highpass', 'bandpass'];
      const master = new T.Volume(-12);
      const filter = new T.Filter({
        type: this._pick(filterTypes),
        frequency: this._rand(300, 4000),
        rolloff: -24,
        Q: this._rand(1, 10)
      });
      const oscillators = [
        new T.Oscillator({
          type: this._pick(oscTypes),
          frequency: note,
          volume: -6
        }).start()
      ];
      if (Math.random() > 0.4) {
        oscillators.push(
          new T.Oscillator({
            type: this._pick(oscTypes),
            frequency: this._pick(scale),
            volume: -10,
            detune: this._rand(-20, 20)
          }).start()
        );
      }
      const lfos = [];
      for (let i = 0; i < this._randi(1, 2); ++i) {
        const lfoType = this._pick(oscTypes);
        const lfoFreq = this._rand(0.01, 1.5);
        const tgts = [
          { target: filter.frequency, min: this._rand(200, 1000), max: this._rand(1000, 8000) },
          oscillators[1] && { target: oscillators[1].detune, min: this._rand(-50, -5), max: this._rand(5, 50) },
          { target: master.volume, min: this._rand(-15, -1), max: this._rand(1, 3) }
        ].filter(Boolean);
        const trg = this._pick(tgts);
        const lfo = new T.LFO({
          type: lfoType,
          frequency: lfoFreq,
          min: trg.min,
          max: trg.max,
          amplitude: 1
        }).start();
        lfo.connect(trg.target);
        lfos.push(lfo);
      }
      const phaser = Math.random() > 0.6
        ? new T.Phaser({
            frequency: this._rand(0.1, 2),
            octaves: this._rand(2, 6),
            baseFrequency: this._rand(200, 1000)
          })
        : null;
      return { master, oscillators, filter, lfos, phaser };
    }
  
    /**
     * Connect all oscillators -> filter -> [phaser] -> master -> destination/analyser.
     * Returns analyser node for visuals.
     * @param {AudioNode} destination - Where to connect (usually Tone.Destination)
     * @returns {AnalyserNode}
     */
    connect(destination) {
      const { oscillators, filter, phaser, master } = this.nodes;
      oscillators.forEach(o => o.connect(filter));
      let out = filter;
      if (phaser) {
        out.connect(phaser);
        out = phaser;
      }
      out.connect(master);
      master.connect(destination);
      // For visualisation, also connect master to an AnalyserNode
      const ana = this.Tone.context.createAnalyser();
      ana.fftSize = 2048;
      master.connect(ana);
      this.analyser = ana;
      return ana;
    }
  
    /**
     * Stop and dispose of all Tone nodes.
     */
    dispose() {
      Object.values(this.nodes).forEach(n => {
        try { n?.stop?.(); } catch {}
        try { n?.dispose?.(); } catch {}
      });
      if (this.analyser) this.analyser.disconnect();
      this.nodes = {};
    }
  }
  