// osc-synth.js
export class OscSynth {
  constructor(Tone, params) {
    if (!params) throw new Error('OscSynth requires fully defined params!');
    this.Tone = Tone;
    this.params = this._sanitizeParams(params);
    this.nodes = {};
    this.analyser = null;
    this.voices = [];
    this.activeLoopers = [];
    // Per‑voice gain nodes used for instant switching between sustained
    // voices. When sequencing sustained voices we keep their envelope
    // running continuously and fade their gain in/out. Transient
    // voices ignore these gains (unity gain).
    this.voiceGains = [];
    // Flags marking which voices are transient/percussive. Populated
    // during _setupAutoLoopers().
    this.transientFlags = [];
    // Track the currently audible sustained voice so we can mute it
    // before switching to another one. Null means no sustained voice is
    // currently audible.
    this.currentSustainedIndex = null;
    this._buildChain();
  }


  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  _sanitizeParams(params) {
    const p = { ...params };
    if (p.filter) {
      p.filter.frequency = this._clamp(p.filter.frequency ?? 2000, 200, 8000);
      p.filter.Q = this._clamp(p.filter.Q ?? 1, 0.2, 10);
      p.filter.rolloff = [-12, -24, -48].includes(p.filter.rolloff) ? p.filter.rolloff : -24;
      p.filter.type = ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'allpass'].includes(p.filter.type)
        ? p.filter.type : 'lowpass';
    }
    if (p.lfo) {
      p.lfo.frequency = this._clamp(p.lfo.frequency ?? 0.25, 0.0125, 2.0);
      p.lfo.depth = this._clamp(p.lfo.depth ?? 0.4, 0.01, 1);
      p.lfo.type = ['sine', 'triangle', 'sawtooth', 'square'].includes(p.lfo.type) ? p.lfo.type : 'sine';
    }
    if (p.phaser) {
      p.phaser.frequency = this._clamp(p.phaser.frequency ?? 0.5, 0.01, 20);
      p.phaser.octaves = this._clamp(p.phaser.octaves ?? 3, 0.5, 8);
      p.phaser.baseFrequency = this._clamp(p.phaser.baseFrequency ?? 350, 20, 5000);
    }
    if (typeof p.chorus === 'number') {
      p.chorus = this._clamp(p.chorus, 0.1, 5.0);
    }
    if (typeof p.distortion === 'number') {
      p.distortion = this._clamp(p.distortion, 0.01, 1.0);
    }
    if (typeof p.bitcrusher === 'number') {
      p.bitcrusher = this._clamp(p.bitcrusher, 1, 16);
    }
    if (p.drone) {
      p.drone.type = ['sine', 'triangle', 'sawtooth', 'square'].includes(p.drone.type) ? p.drone.type : 'sine';
      p.drone.note = p.drone.note || 'C2';
      p.drone.volume = this._clamp(p.drone.volume ?? -12, -40, -6);
    }
    if (Array.isArray(p.bank)) {
      p.bank = p.bank.map(voice => {
        let env = {
          attack: this._clamp(voice.envelope?.attack ?? 0.05, 0.001, 2.5),
          decay: this._clamp(voice.envelope?.decay ?? 0.2, 0.01, 3),
          sustain: this._clamp(voice.envelope?.sustain ?? 0.9, 0.3, 1),
          release: this._clamp(voice.envelope?.release ?? 2.5, 0.2, 8)
        };
        // Harden: if total decay+release is very short, stretch both so the sound is sustained or will loop cleanly
        if (env.decay + env.release < 1.2) {
          env.decay = Math.max(env.decay, 0.2);
          env.release = Math.max(env.release, 0.6);
        }
        return {
          ...voice,
          inst: ['Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'MembraneSynth', 'MetalSynth', 'PluckSynth'].includes(voice.inst)
            ? voice.inst : 'Synth',
          oscType: ['sine', 'triangle', 'sawtooth', 'square'].includes(voice.oscType) ? voice.oscType : 'sine',
          note: voice.note || 'C3',
          volume: this._clamp(voice.volume ?? -10, -30, -3),
          envelope: env
        };
      });
    } else {
      p.bank = [{ note: 'C3', inst: 'Synth', oscType: 'sine', volume: -6, envelope: {} }];
    }
    p.volume = this._clamp(p.volume ?? -6, -24, 0);
    p.tempo = 120;
    return p;
  }

  _buildChain() {
    const T = this.Tone;
    const p = this.params;

    const voices = [];
    (p.bank || []).forEach((voiceDesc, i) => {
      let voice = null;
      const env = voiceDesc.envelope || {};
      try {
        switch (voiceDesc.inst) {
          case 'MonoSynth':
            voice = new T.MonoSynth({
              oscillator: { type: voiceDesc.oscType },
              envelope: env,
              volume: voiceDesc.volume
            });
            break;
          case 'FMSynth':
            voice = new T.FMSynth({
              oscillator: { type: voiceDesc.oscType },
              envelope: env,
              harmonicity: 1.5,
              modulationIndex: 2.5,
              volume: voiceDesc.volume
            });
            break;
          case 'AMSynth':
            voice = new T.AMSynth({
              oscillator: { type: voiceDesc.oscType },
              envelope: env,
              harmonicity: 2.5,
              volume: voiceDesc.volume
            });
            break;
          case 'MembraneSynth':
            voice = new T.MembraneSynth({
              oscillator: { type: 'triangle' },
              envelope: { ...env, sustain: 0 },
              pitchDecay: 0.05,
              octaves: 3,
              volume: voiceDesc.volume
            });
            break;
          case 'MetalSynth':
            voice = new T.MetalSynth({
              envelope: env,
              harmonicity: 5.1,
              resonance: 700,
              modulationIndex: 32,
              volume: voiceDesc.volume
            });
            break;
          case 'PluckSynth':
            voice = new T.PluckSynth({
              attackNoise: 1.2,
              dampening: 4000,
              resonance: 0.7,
              volume: voiceDesc.volume
            });
            break;
          case 'Synth':
          default:
            voice = new T.Synth({
              oscillator: { type: voiceDesc.oscType },
              envelope: env,
              volume: voiceDesc.volume
            });
            break;
        }
      } catch (err) {
        voice = new T.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 2.0 },
          volume: -12
        });
      }
      voices.push(voice);
    });
    this.voices = voices;

    // -------------------------------------------------------------------
    // Set up per‑voice gains. Each voice connects to its own Gain node
    // rather than directly to the filter/effects chain. These gains
    // enable instant muting/unmuting of sustained voices. Transient
    // voices leave their gain at unity while sustained voices start
    // muted (gain 0) and are faded in when triggered via triggerVoice().
    const gains = voices.map(() => new T.Gain(0));
    this.voiceGains = gains;
    voices.forEach((voice, idx) => {
      try {
        voice.connect(gains[idx]);
      } catch {
        // ignore connection errors to avoid breaking the chain
      }
    });

    // Drone Oscillator
    let droneOsc = null;
    if (p.drone) {
      droneOsc = new T.Oscillator({
        type: p.drone.type,
        frequency: p.drone.note,
        volume: p.drone.volume
      }).start();
    }
    // Master Volume
    const master = new T.Volume(p.volume);
    // Filter
    const filter = new T.Filter({
      type: p.filter?.type || 'lowpass',
      frequency: p.filter?.frequency || 1000,
      rolloff: p.filter?.rolloff || -24,
      Q: p.filter?.Q || 1
    });
    // LFO
    let lfo = null;
    if (p.lfo && p.lfo.depth > 0.01) {
      lfo = new T.LFO({
        type: p.lfo.type,
        frequency: p.lfo.frequency,
        min: p.filter.frequency * (1 - p.lfo.depth),
        max: p.filter.frequency * (1 + p.lfo.depth)
      }).start();
      lfo.connect(filter.frequency);
    }
    // Effects Chain
    const phaser = p.phaser ? new T.Phaser({
      frequency: p.phaser.frequency,
      octaves: p.phaser.octaves,
      baseFrequency: p.phaser.baseFrequency
    }) : null;
    const chorus = typeof p.chorus === 'number'
      ? new T.Chorus({ frequency: 1.5, delayTime: 3.5, depth: p.chorus })
      : null;
    const reverb = p.reverb ? new T.Reverb(2) : null;
    if (reverb) reverb.generate();
    const distortion = typeof p.distortion === 'number'
      ? new T.Distortion(p.distortion)
      : null;
    const bitcrusher = typeof p.bitcrusher === 'number'
      ? new T.BitCrusher(p.bitcrusher)
      : null;
    // Connect effects in series
    const effects = [phaser, chorus, distortion, bitcrusher, reverb].filter(Boolean);
    let prev = filter;
    effects.forEach(effect => {
      prev.connect(effect);
      prev = effect;
    });
    prev.connect(master);
    this.nodes = { master, filter, lfo, phaser, chorus, reverb, distortion, bitcrusher, droneOsc };
    // Set up auto-loop for only truly transient voices
    this._setupAutoLoopers();
  }

  /**
   * Only voices with both (decay + release < 1.2s) AND (sustain < 0.5) are considered "transient" and get looped.
   * All other voices are played as a single long note and never retriggered.
   * This version always derives loop interval from the **current BPM**.
   */
  _setupAutoLoopers() {
    // Clear any existing scheduled loopers (no longer used for sustained
    // voices). We maintain this list for backward compatibility but
    // scheduling of transients is now handled externally.
    this.activeLoopers.forEach(l => clearInterval(l));
    this.activeLoopers = [];
    // Build an array of flags marking which voices are transient. A
    // transient voice is defined as one with both short decay+release
    // (combined < 1.2s) and a low sustain (< 0.5). These voices are not
    // pre‑started and are retriggered manually via triggerVoice().
    this.transientFlags = [];
    const bank = this.params.bank || [];
    this.voices.forEach((voice, idx) => {
      const env = bank[idx]?.envelope || {};
      const isTransient = ((env.decay ?? 0.2) + (env.release ?? 2.5) < 1.2) && ((env.sustain ?? 0.9) < 0.5);
      this.transientFlags[idx] = isTransient;
    });
    // Pre‑start all sustained voices by triggering a very long note.
    // Their corresponding gain nodes are initially muted (gain=0) to
    // silence them until explicitly made audible. Without this pre‑start
    // the long attack of pads would cause audible lag when first
    // triggered.
    this.voices.forEach((voice, idx) => {
      const isTransient = this.transientFlags[idx];
      // Configure per‑voice gain: transient voices start at unity (1)
      // so they can be heard when retriggered; sustained voices start
      // muted (0) and will be faded in on demand via triggerVoice().
      const gainNode = this.voiceGains?.[idx];
      if (gainNode) {
        try { gainNode.gain.value = isTransient ? 1 : 0; } catch {}
      }
      if (!isTransient) {
        const note = bank[idx]?.note || 'C3';
        try {
          voice.triggerAttackRelease(note, '60s', undefined, 0.8);
        } catch {}
      }
    });
  }

  connect(destination) {
    const T = this.Tone;
    const { master, filter, droneOsc } = this.nodes;
    // Connect per‑voice gains into the filter instead of voices
    this.voiceGains.forEach(gainNode => {
      try { gainNode.connect(filter); } catch {}
    });
    if (droneOsc) droneOsc.connect(filter);
    master.connect(destination);
    const ana = T.context.createAnalyser();
    ana.fftSize = 2048;
    master.connect(ana);
    this.analyser = ana;
    // We deliberately avoid re‑running _setupAutoLoopers() here. The
    // transient flags and pre‑starting of sustained voices are handled
    // once in the constructor. Recomputing here would trigger
    // additional long notes and duplicate state. Instead we simply
    // perform an audibility check on the assembled graph.
    this._ensureAudible();
    return ana;
  }

  _ensureAudible() {
    const ana = this.analyser;
    const { master, filter } = this.nodes;
    if (!ana || !master || !filter) return;
    const maxAttempts = 5;
    let attempt = 0;
    const check = () => {
      if (attempt >= maxAttempts || !this.analyser) return;
      const buf = new Uint8Array(ana.fftSize);
      ana.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = (buf[i] - 128) / 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / buf.length);
      if (rms < 0.03) {
        attempt++;
        try { master.volume.value = Math.min(master.volume.value + 3, 0); } catch {}
        try { if (filter.type === 'lowpass' && filter.frequency.value < 800) filter.frequency.value = 2000; } catch {}
        if (attempt === 3) try { filter.type = 'allpass'; } catch {}
        setTimeout(check, 600);
      }
    };
    setTimeout(check, 800);
  }

  triggerVoice(index, note, velocity = 0.7) {
    const voice = this.voices[index];
    if (!voice) return;
    const actualNote = note || this.params.bank?.[index]?.note;
    if (!actualNote) return;
    const isTransient = this.transientFlags?.[index];
    if (isTransient) {
      // For transient/percussive voices, simply retrigger the envelope.
      try { voice.triggerAttackRelease(actualNote, '8n', undefined, velocity); } catch {}
    } else {
      // For sustained voices, implement instantaneous switching by
      // modulating the per‑voice gain. Mute any previously audible
      // sustained voice and unmute the new one. This avoids envelope
      // attack delay by keeping the voices running continuously in the
      // background.
      if (this.currentSustainedIndex !== null && this.currentSustainedIndex !== index) {
        const prevGain = this.voiceGains[this.currentSustainedIndex];
        try { prevGain.gain.setValueAtTime(0, this.Tone.now()); } catch {}
      }
      const gainNode = this.voiceGains[index];
      // Ramp instantly to the desired velocity. Using setValueAtTime
      // ensures the change is sample‑accurate.
      try { gainNode.gain.setValueAtTime(velocity, this.Tone.now()); } catch {}
      this.currentSustainedIndex = index;
    }
  }

  dispose() {
    // Reset sustained voice tracking
    this.currentSustainedIndex = null;
    this.activeLoopers.forEach(l => clearInterval(l));
    this.activeLoopers = [];
    if (Array.isArray(this.voices)) {
      this.voices.forEach(v => {
        try { v.releaseAll?.(); } catch {}
        try { v.dispose?.(); } catch {}
      });
      this.voices = [];
    }
    // Disconnect and dispose of per‑voice gain nodes
    if (Array.isArray(this.voiceGains)) {
      this.voiceGains.forEach(g => {
        try { g.disconnect?.(); } catch {}
        try { g.dispose?.(); } catch {}
      });
      this.voiceGains = [];
    }
    Object.values(this.nodes).forEach(node => {
      if (node && typeof node.dispose === 'function') {
        try { node.dispose(); } catch {}
      }
    });
    this.Tone.Transport.cancel();
    this.nodes = {};
    this.analyser = null;
  }
}
