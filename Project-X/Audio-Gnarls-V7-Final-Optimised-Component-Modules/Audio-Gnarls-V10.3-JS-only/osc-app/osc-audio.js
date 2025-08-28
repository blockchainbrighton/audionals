// osc-audio.js
export function Audio(app) {
  return {
    async bufferHumChain() {
      const { Tone, chains } = app.state;
      if (!Tone) return;
      if (chains[app.humKey]) { app._disposeChain(chains[app.humKey]); delete chains[app.humKey]; }

      try {
        const osc = new Tone.Oscillator('A0', 'sine').start();
        const filter = new Tone.Filter(80, 'lowpass'); filter.Q.value = 0.5;
        const volume = new Tone.Volume(-25);
        const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
        const analyser = app._createAnalyser(Tone);

        osc.connect(volume); volume.connect(filter); filter.connect(reverb); if (analyser) filter.connect(analyser);

        chains[app.humKey] = { osc, volume, filter, reverb, analyser };
      } catch (e) {
        console.error('Error buffering hum chain', e);
        delete chains[app.humKey];
      }
    },

    async bufferShapeChain(shape) {
      if (shape === app.humKey) return app.bufferHumChain();
      const { Tone, presets, chains } = app.state, pr = presets[shape];
      if (!pr || !Tone) return;
      if (chains[shape]) { app._disposeChain(chains[shape]); delete chains[shape]; }

      try {
        const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
        const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
        const volume = new Tone.Volume(5);
        const filter = new Tone.Filter(pr.filter, 'lowpass'); filter.Q.value = pr.filterQ;
        const lfo = new Tone.LFO(...pr.lfo).start();
        const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
        const analyser = app._createAnalyser(Tone);

        lfo.connect(filter.frequency);
        if (osc2) lfo.connect(osc2.detune);

        osc1.connect(volume);
        osc2?.connect(volume);
        volume.connect(filter);
        filter.connect(reverb);
        if (analyser) filter.connect(analyser);

        chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, analyser };
      } catch (e) {
        console.error('Error buffering chain for shape', shape, e);
        delete chains[shape];
      }
    },

    setActiveChain(shape) {
      app._eachChain(chain => chain.reverb?.disconnect());

      const chain = app.state.chains[shape];
      chain?.reverb?.toDestination();
      app.state.current = shape;

      if (chain?.analyser) {
        app._setCanvas({ analyser: chain.analyser, isAudioStarted: true, isPlaying: app.state.isPlaying });
      } else {
        app._setCanvas({ isAudioStarted: true, isPlaying: app.state.isPlaying });
      }

      if (shape === app.humKey) app._setCanvas({ shapeKey: app.humKey, preset: null });
    },

    disposeAllChains() {
      app._eachChain(chain => app._disposeChain(chain));
      app.state.chains = {};
      app.state.current = null;
    },

    resetState() {
      app.disposeAllChains();
      if (app.state.sequencePlaying) app.stopSequence();
      if (app.state.audioSignaturePlaying) app.stopAudioSignature();

      const { seed, Tone } = app.state;
      app.state = app.defaultState(seed);
      app.state.Tone = Tone;

      app.loadPresets(seed);
      app.bufferHumChain();

      const rand = app._rng(seed);
      const firstShape = app.shapes[(rand() * app.shapes.length) | 0];
      app._setCanvas({
        preset: app.state.presets[firstShape],
        shapeKey: firstShape,
        mode: 'seed',
        isAudioStarted: false,
        isPlaying: false
      });
      app.state.current = app.humKey;

      app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: app.humKey });

      app.state.isSequencerMode = false;
      app._sequencerComponent.style.display = 'none';
      app._main.style.overflow = 'hidden';

      app.state.sequence = Array(8).fill(null);
      app.updateSequencerState();
    },

    async unlockAudioAndBufferInitial() {
      const s = app.state;

      if (s.initialBufferingStarted && !s.initialShapeBuffered) {
        app._loader.textContent = 'Still preparing initial synth, please wait...';
        return;
      }
      if (s.isPlaying) return app.stopAudioAndDraw();

      if (s.contextUnlocked) {
        if (s.initialShapeBuffered) {
          app.setActiveChain(app.humKey);
          s.isPlaying = true;
          app._updateControls({ isAudioStarted: true, isPlaying: true });
          app._loader.textContent = 'Audio resumed (hum).';
          app._canvas.isPlaying = true;
          return;
        }
        app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.';
        return;
      }

      app._loader.textContent = 'Unlocking AudioContext...';
      try {
        const Tone = s.Tone;
        if (!Tone) throw new Error('Tone.js not available');

        const contextToResume = Tone.getContext?.() || Tone.context;
        let contextResumed = false;
        if (contextToResume?.resume) { await contextToResume.resume(); contextResumed = true; }
        else if (Tone.start) { await Tone.start(); contextResumed = true; }
        if (!contextResumed) throw new Error('Could not resume AudioContext');

        s.contextUnlocked = true;
        s.initialBufferingStarted = true;
        app._loader.textContent = `Preparing ${app.humLabel} synth...`;

        await app.bufferHumChain();
        app.setActiveChain(app.humKey);
        s.initialShapeBuffered = true;
        s.isPlaying = true;
        app._canvas.isPlaying = true;

        app._updateControls({ isAudioStarted: true, isPlaying: true });
        app._loader.textContent = 'Ready. Audio: ' + app.humLabel;

        // Pre-buffer shapes
        for (const shape of app.shapes) {
          if (!s.contextUnlocked) break;
          try { await app.bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); }
          await app._sleep(0);
        }
      } catch (e) {
        console.error('Failed to unlock AudioContext:', e);
        app._loader.textContent = 'Failed to unlock AudioContext.';
        s.contextUnlocked = false;
        s.initialBufferingStarted = false;
        s.initialShapeBuffered = false;
      }
    },

    stopAudioAndDraw() {
      const s = app.state;
      if (!s.isPlaying && !s.initialBufferingStarted) return;

      s.isPlaying = false;
      s.initialBufferingStarted = false;
      s.initialShapeBuffered = false;

      app.disposeAllChains();
      if (s.sequencePlaying) app.stopSequence();
      if (s.audioSignaturePlaying) app.stopAudioSignature();

      app._canvas.isPlaying = false;
      app._canvas.isAudioStarted = false;

      app.resetState();
    },

    _onStartRequest() { app.unlockAudioAndBufferInitial(); },

    _onMuteToggle() {
      const s = app.state;
      if (!s.Tone || !s.contextUnlocked) return;
      const mute = (s.Tone.Destination.mute = !s.Tone.Destination.mute);
      app._updateControls({ isMuted: mute });
      app._loader.textContent = mute ? 'Audio muted.' : 'Audio unmuted.';
      app._canvas.isPlaying = s.isPlaying && !mute;
    },

    _onShapeChange(e) {
      const shapeKey = e?.detail?.shapeKey;
      if (!shapeKey) return;

      const s = app.state;
      s.current = shapeKey;

      if (shapeKey === app.humKey) {
        app._setCanvas({ shapeKey: app.humKey, preset: null });
      } else if (app.shapes.includes(shapeKey)) {
        app._setCanvas({ shapeKey, preset: s.presets[shapeKey] });
      }

      if (s.contextUnlocked && s.initialShapeBuffered) app.setActiveChain(shapeKey);
      app._canvas.mode = (s.contextUnlocked && s.initialShapeBuffered) ? (s.isPlaying ? 'live' : 'seed') : 'seed';

      app._updateControls({ shapeKey });
    },
  };
}
