// osc-synth.js
export class OscSynth {
  /**
   * @param {typeof Tone} Tone - Tone.js reference (must be loaded)
   * @param {object} params - All synth params (from OscControls.getSoundPreset)
   */
  constructor(Tone, params) {
    if (!params) throw new Error('OscSynth requires fully defined params!');
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
    const filterRolloff = [-12, -24, -48].includes(p.filter?.rolloff)
      ? p.filter.rolloff
      : -24;

    const master = new T.Volume(-12);

    const filter = new T.Filter({
      type: filterType,
      frequency: filterFreq,
      rolloff: filterRolloff,
      Q: filterQ,
    });

    // Envelope with safety clamping
    // Increase the minimum attack slightly (0.02 instead of 0.01) to avoid
    // instantaneous jumps that can produce audible clicks. These values
    // ensure envelopes remain musical yet snappy.
    const env = p.envelope || {};
    const envAttack = this._clamp(env.attack ?? 0.2, 0.02, 0.35);
    const envDecay = this._clamp(env.decay ?? 0.3, 0.05, 0.8);
    const envSustain = this._clamp(env.sustain ?? 0.7, 0.25, 1.0);
    const envRelease = this._clamp(env.release ?? 0.5, 0.12, 2.5);

    // Always have at least one oscillator.  The first oscillator uses a fixed
    // volume of -6 dB (previously clamped via _clamp) since the clamp
    // always returned the provided value. Removing the needless clamp
    // improves readability.
    const oscTypeA = p.oscillator?.type || 'sine';
    const freqA = p.note || 'C4';
    const detuneA = this._clamp(p.detune ?? 0, -100, 100);
    const volA = -6;

    const oscillators = [
      new T.Oscillator({
        type: oscTypeA,
        frequency: freqA,
        detune: detuneA,
        volume: volA,
      }).start(),
    ];

    // Optionally add a second oscillator, but guarantee it’s not silent.  As
    // with the first oscillator we avoid unnecessary clamping on the
    // volume—the fixed level of -10 dB is sufficient here.
    if (
      Array.isArray(p.oscTypes) &&
      p.oscTypes.length > 1 &&
      Array.isArray(p.scale) &&
      p.scale.length > 1 &&
      p.phaser
    ) {
      const oscTypeB = p.oscTypes[1] || oscTypeA;
      const freqB = p.scale[1] || freqA;
      const detuneB = this._clamp(p.detune ?? 0, -100, 100);
      const volB = -10;
      oscillators.push(
        new T.Oscillator({
          type: oscTypeB,
          frequency: freqB,
          detune: detuneB,
          volume: volB,
        }).start()
      );
    }

    // LFO, but only modulate within safe audible range
    const lfos = [];
    if (p.lfo) {
      const lfoType = ['sine', 'triangle', 'square', 'sawtooth'].includes(p.lfo.type)
        ? p.lfo.type
        : 'sine';
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
        amplitude: lfoAmp,
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
        baseFrequency: this._clamp(p.phaser.baseFrequency ?? 350, 40, 1200),
      });
    }

    // Optionally add support for more FX: distortion, chorus, etc. here!

    // Perform a single early check to see if the resulting chain will be
    // effectively silent. If the measured average amplitude is too low
    // (approximate threshold of 5) then we apply a fallback: boost the
    // filter cutoff, retune the base oscillator and bump the master gain.
    // Doing this once avoids duplicating analyser logic and removes the
    // need for a second deferred check.  See the README for details.
    {
      const ana = T.context.createAnalyser();
      master.connect(ana);
      ana.fftSize = 1024;
      const arr = new Uint8Array(ana.fftSize);
      ana.getByteTimeDomainData(arr);
      const avg =
        arr.reduce((a, b) => a + Math.abs(b - 128), 0) / arr.length;
      ana.disconnect();
      if (avg < 5) {
        // Synth output is too quiet—force audible fallback
        filter.frequency.value = 1800;
        if (oscillators[0]) oscillators[0].frequency.value = 'C4';
        // target volume will be ramped up in connect(); set base here
        master.volume.value = -6;
        // Optionally: replace envelope with snappy, plucky settings
        if (oscillators[0]?.envelope) {
          oscillators[0].envelope.attack = 0.01;
          oscillators[0].envelope.decay = 0.1;
          oscillators[0].envelope.sustain = 0.6;
          oscillators[0].envelope.release = 0.5;
        }
        console.warn('[OscSynth] Applied fallback params to prevent silence.');
      }
    }

    // Start all chains at a very low volume to avoid clicks on connect.
    // The target volume (default -12 dB) will be restored via a smooth
    // ramp in the connect() method.
    master.volume.value = -60;
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
    // Smoothly ramp the master volume up to its intended level to
    // eliminate transient clicks that occur when connecting a node at
    // full amplitude.  The ramp is short enough to be imperceptible.
    try {
      master.volume.rampTo(-12, 0.05);
    } catch {
      // In some Tone.js versions rampTo may not exist; fall back to direct set.
      master.volume.value = -12;
    }

    const ana = this.Tone.context.createAnalyser();
    ana.fftSize = 2048;
    master.connect(ana);
    this.analyser = ana;
    return ana;
  }

  dispose() {
    // Ramp the master volume down to silence before tearing down nodes.
    const master = this.nodes?.master;
    if (master) {
      try {
        master.volume.rampTo(-60, 0.05);
      } catch {
        master.volume.value = -60;
      }
    }
    // Wait a short period to allow the ramp to complete before disposal.
    setTimeout(() => {
      Object.values(this.nodes).forEach(n => {
        try {
          n?.stop?.();
        } catch {}
        try {
          n?.dispose?.();
        } catch {}
      });
      if (this.analyser) this.analyser.disconnect();
      this.nodes = {};
    }, 60);
  }
}
