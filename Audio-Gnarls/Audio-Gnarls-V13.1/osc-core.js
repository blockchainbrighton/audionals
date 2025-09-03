// osc-core.js
// Merged: Utils + Presets + Audio → Engine(app)
// Keeps the same public surface as before so <osc-app> can remain mostly unchanged.

export function Engine(app) {
  // ============================
  // Utils (from osc-utils.js)
  // ============================
  function _timeNow(Tone) { return Tone?.now?.() ?? 0; }

  function _rampLinear(param, target, seconds, Tone) {
    if (!param || !Tone) return;
    const now = _timeNow(Tone);
    try {
      if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
      const cur = typeof param.value === 'number' ? param.value : param.value?.value;
      if (typeof param.setValueAtTime === 'function') param.setValueAtTime(cur ?? 0, now);
      if (typeof param.linearRampToValueAtTime === 'function') param.linearRampToValueAtTime(target, now + Math.max(0.001, seconds || 0.012));
    } catch {}
  }

  async function _silenceAllChains(fadeSec = 0.012) {
    const Tone = app.state?.Tone; if (!Tone) return;
    const now = _timeNow(Tone);
    app._eachChain(chain => {
      const g = chain?.out?.gain ?? chain?.volume?.volume;
      if (g?.linearRampToValueAtTime) {
        try {
          g.cancelScheduledValues?.(now);
          g.setValueAtTime?.(g.value, now);
          g.linearRampToValueAtTime(0, now + fadeSec);
        } catch {}
      }
      const wet = chain?.reverb?.wet;
      if (wet?.rampTo) { try { wet.rampTo(0, fadeSec); } catch {} }
    });
    await app._sleep(Math.ceil((fadeSec + 0.002) * 1000));
  }

  function _el(tag, opts) { return Object.assign(document.createElement(tag), opts); }
  function _eachChain(fn) { for (const k in app.state.chains) fn(app.state.chains[k], k); }

  async function _disposeChain(chain) {
    const Tone = app.state?.Tone; const fadeSec = 0.012;
    try {
      if (Tone && chain) {
        const now = _timeNow(Tone);
        const g = chain?.out?.gain ?? chain?.volume?.volume;
        if (g?.linearRampToValueAtTime && g?.setValueAtTime) {
          g.cancelScheduledValues?.(now);
          g.setValueAtTime(g.value, now);
          g.linearRampToValueAtTime(0, now + fadeSec);
        }
        const wet = chain?.reverb?.wet; if (wet?.rampTo) { try { wet.rampTo(0, fadeSec); } catch {} }
        await app._sleep(Math.ceil((fadeSec + 0.002) * 1000));
      }
    } catch {}
    for (const n of Object.values(chain || {})) {
      try { n.stop?.(); } catch {}
      try { n.dispose?.(); } catch {}
      try { n.disconnect?.(); } catch {}
    }
  }

  function _rng(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000);
  }

  function _setCanvas(props) { Object.assign(app._canvas, props); }
  function _createAnalyser(Tone) {
    const analyser = Tone?.context?.createAnalyser?.();
    if (analyser) {
      analyser.fftSize = 2048; try { analyser.smoothingTimeConstant = 0.06; } catch {}
    }
    return analyser || null;
  }
  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _linToDb(v) {
    // Clamp [0..1] to a musical range; avoid -Infinity.
    const minDb = -60; const maxDb = 0;
    if (v <= 0) return minDb;
    const db = 20 * Math.log10(Math.min(1, Math.max(1e-4, v)));
    return Math.max(minDb, Math.min(maxDb, db));
  }

  // ============================
  // Presets (from osc-presets.js)
  // ============================
  function deterministicPreset(seed, shape) {
    const rng = _rng(`${seed}_${shape}`);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];

    const modeRoll = rng();
    const mode = modeRoll < .18 ? 0 : modeRoll < .56 ? 1 : modeRoll < .85 ? 2 : 3;
    const oscCount = mode === 3 ? 2 + (rng() > .7 ? 1 : 0) : 1 + (rng() > .6 ? 1 : 0);
    const oscs = Array.from({ length: oscCount }, () => [
      types[(rng() * types.length) | 0],
      notes[(rng() * notes.length) | 0]
    ]);

    let lfoRate, lfoMin, lfoMax, filterBase, env;
    if (mode === 0) {
      lfoRate = .07 + rng() * .3; lfoMin = 400 + rng() * 400; lfoMax = 900 + rng() * 600; filterBase = 700 + rng() * 500;
      env = { attack: .005 + rng() * .03, decay: .04 + rng() * .08, sustain: .1 + rng() * .2, release: .03 + rng() * .1 };
    } else if (mode === 1) {
      lfoRate = .25 + rng() * 8; lfoMin = 120 + rng() * 700; lfoMax = 1200 + rng() * 1400; filterBase = 300 + rng() * 2400;
      env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
    } else if (mode === 2) {
      lfoRate = 6 + rng() * 20; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
      env = { attack: .03 + rng() * .4, decay: .1 + rng() * .7, sustain: .2 + rng() * .5, release: .2 + rng() * 3 };
    } else {
      lfoRate = 24 + rng() * 36; lfoMin = 80 + rng() * 250; lfoMax = 1500 + rng() * 3500; filterBase = 300 + rng() * 2400;
      env = { attack: 2 + rng() * 8, decay: 4 + rng() * 20, sustain: .7 + rng() * .2, release: 8 + rng() * 24 };
    }

    return {
      osc1: oscs[0],
      osc2: oscs[1] || null,
      filter: filterBase,
      filterQ: .6 + rng() * .7,
      lfo: [lfoRate, lfoMin, lfoMax],
      envelope: env,
      reverb: { wet: mode === 3 ? .4 + rng() * .5 : .1 + rng() * .5, roomSize: mode === 3 ? .85 + rng() * .12 : .6 + rng() * .38 },
      colorSpeed: .06 + rng() * .22,
      shapeDrift: .0006 + rng() * .0032,
      seed
    };
  }

  function loadPresets(seed) {
    app.state.presets = Object.fromEntries(app.shapes.map(k => [k, deterministicPreset(seed, k)]));
  }

  // ============================
  // Audio (from osc-audio.js)
  // ============================
  async function bufferHumChain() {
    const { Tone, chains } = app.state; if (!Tone) return;
    if (chains[app.humKey]) { await _disposeChain(chains[app.humKey]); delete chains[app.humKey]; }
    try {
      const osc = new Tone.Oscillator('A0', 'sine').start();
      const filter = new Tone.Filter(80, 'lowpass'); filter.Q.value = 0.5;
      const volume = new Tone.Volume(-25);
      const reverb = new Tone.Freeverb().set({ wet: 0.3, roomSize: 0.9 });
      const out = new Tone.Gain(0);
      const analyser = _createAnalyser(Tone);
      osc.connect(volume); volume.connect(filter); filter.connect(reverb);
      if (analyser) filter.connect(analyser);
      reverb.connect(out);
      app.state.chains[app.humKey] = { osc, volume, filter, reverb, out, analyser };
    } catch (e) { console.error('Error buffering hum chain', e); delete app.state.chains[app.humKey]; }
  }

  async function bufferShapeChain(shape) {
    if (shape === app.humKey) return bufferHumChain();
    const { Tone, presets, chains } = app.state, pr = presets[shape];
    if (!pr || !Tone) return;
    if (chains[shape]) { await _disposeChain(chains[shape]); delete chains[shape]; }
    try {
      const osc1 = new Tone.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const osc2 = pr.osc2 ? new Tone.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const volume = new Tone.Volume(5);
      const filter = new Tone.Filter(pr.filter, 'lowpass'); filter.Q.value = pr.filterQ;
      const lfo = new Tone.LFO(...pr.lfo).start();
      const reverb = new Tone.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
      const out = new Tone.Gain(0);
      const analyser = _createAnalyser(Tone);
      lfo.connect(filter.frequency); if (osc2) lfo.connect(osc2.detune);
      osc1.connect(volume); osc2?.connect(volume); volume.connect(filter); filter.connect(reverb);
      if (analyser) filter.connect(analyser);
      reverb.connect(out);
      chains[shape] = { osc1, osc2, volume, filter, lfo, reverb, out, analyser };
    } catch (e) { console.error('Error buffering chain for shape', shape, e); delete app.state.chains[shape]; }
  }

  function setActiveChain(shape, { updateCanvasShape = true, setStateCurrent = updateCanvasShape } = {}) {
    const { Tone, chains, current } = app.state; const dur = 0.008;
    const prev = current ? chains[current] : null;
    if (prev?.reverb?.wet?.rampTo) { try { prev.reverb.wet.rampTo(0, dur); } catch {} }
    const doSwitch = () => {
      _eachChain(chain => chain.reverb?.disconnect());
      const next = chains[shape]; next?.reverb?.toDestination();
      if (next?.analyser) _setCanvas({ analyser: next.analyser, isAudioStarted: true, isPlaying: app.state.isPlaying });
      else _setCanvas({ isAudioStarted: true, isPlaying: app.state.isPlaying });
      if (updateCanvasShape) {
        if (shape === app.humKey) _setCanvas({ shapeKey: app.humKey, preset: null });
        else _setCanvas({ shapeKey: shape, preset: app.state.presets[shape] });
      }
      if (setStateCurrent) app.state.current = shape;
      if (next?.reverb?.wet) {
        try {
          const target = next.reverb.wet.value ?? 0.3;
          if (typeof next.reverb.wet.setValueAtTime === 'function') next.reverb.wet.setValueAtTime(0, Tone?.now?.() ?? 0);
          else next.reverb.wet.value = 0;
          if (next.reverb.wet.rampTo) next.reverb.wet.rampTo(target, dur); else next.reverb.wet.value = target;
        } catch {}
      }
    };
    setTimeout(doSwitch, Math.max(1, Math.floor(dur * 1000)));
  }

  function disposeAllChains() {
    _eachChain(chain => _disposeChain(chain));
    app.state.chains = {}; app.state.current = null;
  }

  function resetState() {
    disposeAllChains();
    if (app.state.sequencePlaying) stopSequence();
    if (app.state.audioSignaturePlaying) stopAudioSignature?.();
    const { seed, Tone } = app.state;
    app.state = app.defaultState(seed); app.state.Tone = Tone;
    loadPresets(seed); bufferHumChain();
    const rand = _rng(seed); const firstShape = app.shapes[(rand() * app.shapes.length) | 0];
    _setCanvas({ preset: app.state.presets[firstShape], shapeKey: firstShape, mode: 'seed', isAudioStarted: false, isPlaying: false });
    app.state.current = app.humKey;
    app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: app.humKey });
    app.state.isSequencerMode = false; app._sequencerComponent.style.display = 'none'; app._main.style.overflow = 'hidden';
    app.state.sequence = Array(8).fill(null); updateSequencerState?.();
  }

  async function unlockAudioAndBufferInitial() {
    const s = app.state;
    if (s.initialBufferingStarted && !s.initialShapeBuffered) { app._loader.textContent = 'Still preparing initial synth, please wait...'; return; }
    if (s.isPlaying) return stopAudioAndDraw();
    if (s.contextUnlocked) {
      if (s.initialShapeBuffered) {
        setActiveChain(app.humKey); s.isPlaying = true; app._updateControls({ isAudioStarted: true, isPlaying: true });
        app._loader.textContent = 'Audio resumed (hum).'; app._canvas.isPlaying = true; return;
      }
      app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.'; return;
    }
    app._loader.textContent = 'Unlocking AudioContext...';
    try {
      const Tone = s.Tone; if (!Tone) throw new Error('Tone.js not available');
      const contextToResume = Tone.getContext?.() || Tone.context; let contextResumed = false;
      if (contextToResume?.resume) { await contextToResume.resume(); contextResumed = true; }
      else if (Tone.start) { await Tone.start(); contextResumed = true; }
      if (!contextResumed) throw new Error('Could not resume AudioContext');
      s.contextUnlocked = true; s.initialBufferingStarted = true; app._loader.textContent = `Preparing ${app.humLabel} synth...`;
      await bufferHumChain(); setActiveChain(app.humKey); s.initialShapeBuffered = true; s.isPlaying = true; app._canvas.isPlaying = true;
      app._updateControls({ isAudioStarted: true, isPlaying: true }); app._loader.textContent = 'Ready. Audio: ' + app.humLabel;
      for (const shape of app.shapes) { if (!s.contextUnlocked) break; try { await bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); } await _sleep(0); }
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
      app._loader.textContent = 'Failed to unlock AudioContext.';
      s.contextUnlocked = false; s.initialBufferingStarted = false; s.initialShapeBuffered = false;
    }
  }

  function stopAudioAndDraw() {
    const s = app.state; if (!s.isPlaying && !s.initialBufferingStarted) return;
    s.isPlaying = false; s.initialBufferingStarted = false; s.initialShapeBuffered = false;
    disposeAllChains(); if (s.sequencePlaying) stopSequence?.(); if (s.audioSignaturePlaying) stopAudioSignature?.();
    app._canvas.isPlaying = false; app._canvas.isAudioStarted = false; resetState();
  }

  function _onStartRequest() { unlockAudioAndBufferInitial(); }

  function _onMuteToggle() {
    const Tone = app.state.Tone; if (!Tone?.Destination) return;
    const mute = !Tone.Destination.mute; Tone.Destination.mute = mute;
    app._updateControls({ isMuted: mute });
    const isPlaying = app.state.isPlaying && !mute; _setCanvas({ isPlaying });
    app._loader.textContent = mute ? 'Muted.' : 'Unmuted.';
  }

  function _onVolumeChange(e) {
    const vol = e?.detail?.value;
    if (typeof vol === 'number') {
      app.state.volume = Math.min(1, Math.max(0, vol));
      const Tone = app.state.Tone;
      if (Tone?.Destination?.volume) {
        Tone.Destination.volume.value = _linToDb(app.state.volume);
      }
      app._updateControls({ volume: app.state.volume });
    }
  }

  function _onShapeChange(e) {
    const shapeKey = e?.detail?.shapeKey; if (!shapeKey) return;
    const s = app.state; s._uiReturnShapeKey = shapeKey !== app.humKey ? shapeKey : s._uiReturnShapeKey;
    if (!s.contextUnlocked || !s.initialShapeBuffered) {
      if (shapeKey === app.humKey) _setCanvas({ shapeKey: app.humKey, preset: null, mode: 'seed' });
      else _setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'seed' });
      app._updateControls({ shapeKey });
      return;
    }
    setActiveChain(shapeKey);
    if (shapeKey !== app.humKey) _setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: 'live' });
    app._canvas.isPlaying = !app.state.Tone?.Destination?.mute;
    app._updateControls({ shapeKey });
  }

  // expose a minimal subset for Sequencer bridge to call back into
  function updateSequencerState() { app.sig?.updateSequencerState?.(); }
  function stopSequence() { app.sig?.stopSequence?.(); }
  function stopAudioSignature() { app.sig?.stopAudioSignature?.(); }

  return {
    // Utils
    _el, _eachChain, _disposeChain, _rng, _setCanvas, _createAnalyser, _sleep, _timeNow, _rampLinear, _silenceAllChains, _linToDb,
    // Presets
    deterministicPreset, loadPresets,
    // Audio
    bufferHumChain, bufferShapeChain, setActiveChain, disposeAllChains, resetState,
    unlockAudioAndBufferInitial, stopAudioAndDraw, _onStartRequest, _onMuteToggle, _onShapeChange, _onVolumeChange,
    // Sequencer hooks
    updateSequencerState, stopSequence, stopAudioSignature,
  };
}
