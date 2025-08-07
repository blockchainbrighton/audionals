// osc-synth.js
export class OscSynth {
    /**
     * @param {typeof Tone} Tone - Tone.js reference (must be loaded)
     * @param {object} params - All synth params (from OscControls.getSoundPreset)
     */
    constructor(Tone, params) {
      if (!params) throw new Error("OscSynth requires fully defined params!");
      this.Tone = Tone;
      this.params = params;
      this.nodes = this._buildChain();
    }
  
    _clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }
  
    _buildChain() {
      const T = this.Tone;
      const p = this.params;
  
      // Clamp filter params to guarantee always audible
      const filterType = p.filter?.type || 'lowpass';
      const filterFreq = this._clamp(p.filter?.frequency ?? 2000, 500, 6000); // Safe musical range
      const filterQ = this._clamp(p.filter?.Q ?? 5, 0.4, 8);
      const filterRolloff = [-12, -24, -48].includes(p.filter?.rolloff) ? p.filter.rolloff : -24;
  
      const master = new T.Volume(-12);
  
      const filter = new T.Filter({
        type: filterType,
        frequency: filterFreq,
        rolloff: filterRolloff,
        Q: filterQ
      });
  
      // Envelope with safety clamping
      const env = p.envelope || {};
      const envAttack  = this._clamp(env.attack ?? 0.2, 0.01, 0.35);
      const envDecay   = this._clamp(env.decay ?? 0.3, 0.05, 0.8);
      const envSustain = this._clamp(env.sustain ?? 0.7, 0.25, 1.0);
      const envRelease = this._clamp(env.release ?? 0.5, 0.12, 2.5);
  
      // Always have at least one oscillator, clamp freq and volume
      const oscTypeA = p.oscillator?.type || 'sine';
      const freqA = p.note || 'C4';
      const detuneA = this._clamp(p.detune ?? 0, -100, 100);
      const volA = this._clamp(-6, -36, 0);
  
      const oscillators = [
        new T.Oscillator({
          type: oscTypeA,
          frequency: freqA,
          detune: detuneA,
          volume: volA
        }).start()
      ];
  
      // Optionally add a second oscillator, but guarantee it’s not silent
      if (Array.isArray(p.oscTypes) && p.oscTypes.length > 1 && Array.isArray(p.scale) && p.scale.length > 1 && p.phaser) {
        const oscTypeB = p.oscTypes[1] || oscTypeA;
        const freqB = p.scale[1] || freqA;
        const detuneB = this._clamp(p.detune ?? 0, -100, 100);
        const volB = this._clamp(-10, -36, 0);
        oscillators.push(
          new T.Oscillator({
            type: oscTypeB,
            frequency: freqB,
            detune: detuneB,
            volume: volB
          }).start()
        );
      }
  
      // LFO, but only modulate within safe audible range
      const lfos = [];
      if (p.lfo) {
        const lfoType = ['sine', 'triangle', 'square', 'sawtooth'].includes(p.lfo.type) ? p.lfo.type : 'sine';
        const lfoFreq = this._clamp(p.lfo.frequency ?? 0.2, 0.01, 8.0);
        // Clamp LFO min/max to filter safe range
        const lfoMin = this._clamp(p.lfo.min ?? 900, 500, 4000);
        const lfoMax = this._clamp(p.lfo.max ?? 2000, 500, 6000);
        const lfoAmp = this._clamp(p.lfo.depth ?? 0.25, 0.01, 0.7);
        const lfo = new T.LFO({
          type: lfoType,
          frequency: lfoFreq,
          min: lfoMin,
          max: lfoMax,
          amplitude: lfoAmp
        }).start();
        lfo.connect(filter.frequency);
        lfos.push(lfo);
      }
  
      // Optional Phaser, clamp params
      let phaser = null;
      if (p.phaser) {
        phaser = new T.Phaser({
          frequency: this._clamp(p.phaser.frequency ?? 0.5, 0.1, 8),
          octaves: this._clamp(p.phaser.octaves ?? 3, 1, 8),
          baseFrequency: this._clamp(p.phaser.baseFrequency ?? 350, 40, 1200)
        });
      }
  
      // Optionally add support for more FX: distortion, chorus, etc. here!
  
        // Add to the bottom of _buildChain() in osc-synth.js (after setting up all nodes)

        const ana = T.context.createAnalyser();
        master.connect(ana);
        ana.fftSize = 1024;
        const arr = new Uint8Array(ana.fftSize);
        ana.getByteTimeDomainData(arr);
        const avg = arr.reduce((a, b) => a + Math.abs(b - 128), 0) / arr.length;

        if (avg < 5) {
        // Synth output is too quiet—force audible fallback
        filter.frequency.value = 1800;
        if (oscillators[0]) oscillators[0].frequency.value = "C4";
        master.volume.value = -6;
        // Optionally: replace envelope with snappy, plucky
        if (oscillators[0]?.envelope) {
            oscillators[0].envelope.attack = 0.01;
            oscillators[0].envelope.decay = 0.1;
            oscillators[0].envelope.sustain = 0.6;
            oscillators[0].envelope.release = 0.5;
        }
        console.warn('[OscSynth] Applied fallback params to prevent silence.');
        }
        ana.disconnect();

      // -- Simple debug check for "silent" outputs --
      setTimeout(() => {
        const ana = T.context.createAnalyser();
        master.connect(ana);
        const arr = new Uint8Array(ana.fftSize);
        ana.getByteTimeDomainData(arr);
        const avg = arr.reduce((a, b) => a + Math.abs(b - 128), 0) / arr.length;
        if (avg < 5) {
          // This mode is likely too quiet, log params for review
          // (optional: auto-boost master or skip to next preset)
          console.warn('[OscSynth] WARNING: Synth output likely too quiet for params:', p);
        }
        ana.disconnect();
      }, 180);
  
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
  
      const ana = this.Tone.context.createAnalyser();
      ana.fftSize = 2048;
      master.connect(ana);
      this.analyser = ana;
      return ana;
    }
  
    dispose() {
      Object.values(this.nodes).forEach(n => {
        try { n?.stop?.(); } catch {}
        try { n?.dispose?.(); } catch {}
      });
      if (this.analyser) this.analyser.disconnect();
      this.nodes = {};
    }
  }
  