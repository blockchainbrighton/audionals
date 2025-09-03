// engine.js
// Combined module: osc-core + osc-signatures + tone-loader (inlined)
// Public exports preserved: Engine, Signatures. Also registers <tone-loader>.

import { humKey, shapeList, shapeCount, allKeys } from './shapes.js';

// ============================
// osc-core.js
// Merged: Utils + Presets + Audio → Engine(app)
// Keeps the same public surface as before so <osc-app> can remain mostly unchanged.
// ============================

export function Engine(app) {
  // ---------- Utils ----------
  function _timeNow(Tone) { return Tone?.now?.() ?? 0; }

  function _rampLinear(param, target, seconds, Tone) {
    if (!param || !Tone) return;
    const now = _timeNow(Tone);
    try {
      if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
      const cur = typeof param.value === 'number' ? param.value : param.value?.value;
      if (typeof param.setValueAtTime === 'function') param.setValueAtTime(cur ?? 0, now);
      if (typeof param.linearRampToValueAtTime === 'function') {
        param.linearRampToValueAtTime(target, now + Math.max(0.001, seconds || 0.012));
      }
    } catch {}
  }

  async function _silenceAllChains(fadeSec = 0.012) {
    const Tone = app.state?.Tone; if (!Tone) return;
    const now = _timeNow(Tone);
    _eachChain(chain => {
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

  // ---------- Presets ----------
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
    // Build presets only for real shapes (no hum)
    app.state.presets = Object.fromEntries(shapeList(app).map(k => [k, deterministicPreset(seed, k)]));
  }

  // ---------- Audio ----------
  async function bufferHumChain() {
    const { Tone, chains } = app.state; if (!Tone) return;
    const key = humKey(app);
    if (chains[key]) { await _disposeChain(chains[key]); delete chains[key]; }
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
      app.state.chains[key] = { osc, volume, filter, reverb, out, analyser };
    } catch (e) { console.error('Error buffering hum chain', e); delete app.state.chains[key]; }
  }

  async function bufferShapeChain(shape) {
    if (shape === humKey(app)) return bufferHumChain();
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
        if (shape === humKey(app)) _setCanvas({ shapeKey: humKey(app), preset: null });
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

    const list = shapeList(app);
    const rand = _rng(seed);
    const firstShape = list.length ? list[(rand() * list.length) | 0] : humKey(app);

    _setCanvas({ preset: app.state.presets[firstShape] ?? null, shapeKey: firstShape, mode: 'seed', isAudioStarted: false, isPlaying: false });
    app.state.current = humKey(app);
    app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(app) });
    app.state.isSequencerMode = false; app._sequencerComponent.style.display = 'none'; app._main.style.overflow = 'hidden';
    app.state.sequence = Array(8).fill(null); updateSequencerState?.();
  }

  async function unlockAudioAndBufferInitial() {
    const s = app.state;
    if (s.initialBufferingStarted && !s.initialShapeBuffered) { app._loader.textContent = 'Still preparing initial synth, please wait...'; return; }
    if (s.isPlaying) return stopAudioAndDraw();
    if (s.contextUnlocked) {
      if (s.initialShapeBuffered) {
        setActiveChain(humKey(app)); s.isPlaying = true; app._updateControls({ isAudioStarted: true, isPlaying: true });
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
      await bufferHumChain(); setActiveChain(humKey(app)); s.initialShapeBuffered = true; s.isPlaying = true; app._canvas.isPlaying = true;
      app._updateControls({ isAudioStarted: true, isPlaying: true }); app._loader.textContent = 'Ready. Audio: ' + app.humLabel;

      for (const shape of shapeList(app)) {
        if (!s.contextUnlocked) break;
        try { await bufferShapeChain(shape); } catch (e) { console.error('Error buffering', shape, e); }
        await _sleep(0);
      }
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
    const shapeKeyNew = e?.detail?.shapeKey; if (!shapeKeyNew) return;
    const s = app.state; const HUM = humKey(app);
    s._uiReturnShapeKey = shapeKeyNew !== HUM ? shapeKeyNew : s._uiReturnShapeKey;

    if (!s.contextUnlocked || !s.initialShapeBuffered) {
      if (shapeKeyNew === HUM) _setCanvas({ shapeKey: HUM, preset: null, mode: 'seed' });
      else _setCanvas({ shapeKey: shapeKeyNew, preset: s.presets[shapeKeyNew], mode: 'seed' });
      app._updateControls({ shapeKey: shapeKeyNew });
      return;
    }
    setActiveChain(shapeKeyNew);
    if (shapeKeyNew !== HUM) _setCanvas({ shapeKey: shapeKeyNew, preset: s.presets[shapeKeyNew], mode: 'live' });
    app._canvas.isPlaying = !app.state.Tone?.Destination?.mute;
    app._updateControls({ shapeKey: shapeKeyNew });
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

// ============================
// osc-signatures.js
// Lifts Signature + Sequencer bridge into a single cohesive mixin.
// Public API preserved from osc-signature-sequencer.js
// ============================

export function Signatures(app) {
  // Thin wrappers to pass `app` through the shared helpers.
  const HUM = () => humKey(app);
  const LIST = () => shapeList(app);
  const COUNT = () => shapeCount(app);
  const ALL = () => allKeys(app);

  const randIntInclusive = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const randValue = (rng) => { const N = COUNT(); return randIntInclusive(rng, 0, N); };
  const randNonHum = (rng) => { const N = COUNT(); return N > 0 ? randIntInclusive(rng, 1, N) : 0; };

  // ---------- Global toggles ----------
  function _onToggleSequencer() {
    const s = app.state;
    s.isSequencerMode = !s.isSequencerMode;
    app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none';
    if (s.isSequencerMode) {
      app._main.style.overflow = 'auto';
      if (app._canvasContainer) { app._canvasContainer.style.maxHeight = '60vh'; app._canvasContainer.style.flex = '0 0 auto'; }
      if (app._canvas) { app._canvas.style.maxHeight = '60vh'; }
      updateSequencerState();
    } else {
      app._main.style.overflow = 'hidden';
      if (app._canvasContainer) { app._canvasContainer.style.maxHeight = ''; app._canvasContainer.style.flex = ''; }
      if (app._canvas) { app._canvas.style.maxHeight = ''; }
      s.isRecording = false; s.currentRecordSlot = -1;
      if (s.sequencePlaying) stopSequence();
      if (s.signatureSequencerRunning) _stopSignatureSequencer();
    }
    app._updateControls();
  }

  function _onLoopToggle() {
    app.state.isLoopEnabled = !app.state.isLoopEnabled;
    app._updateControls();
    if (app.state.audioSignaturePlaying && !app.state.isSequenceSignatureMode) {
      app._loader.textContent = app.state.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.';
    }
  }

  function _onSignatureModeToggle() {
    const s = app.state;
    s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
    app._updateControls();
    if (s.sequencePlaying) {
      stopSequence(); stopAudioSignature();
      app._loader.textContent = s.isSequenceSignatureMode
        ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.'
        : 'Sequencer Signature Mode disabled. Press Play for normal step timing.';
    }
  }

  // ---------- Signature generation ----------
  function _getUniqueAlgorithmMapping(seed) {
    const rng = app._rng(`${seed}_unique_algo_mapping`);
    const keys = ALL(); const count = keys.length;
    const base = [1,2,3,4,5,6,7,8,9,10]; const pool = [];
    while (pool.length < count) pool.push(...base); pool.length = count;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const map = {}; keys.forEach((k, i) => { map[k] = pool[i]; }); return map;
  }

  function generateAudioSignature(seed, algorithm = 1) {
    const rng = app._rng(`${seed}_audio_signature_v${algorithm}`);
    const STEPS = 32;
    switch (algorithm) {
      case 1: { const seq = []; for (let i = 0; i < STEPS; i++) seq.push(randValue(rng)); return seq; }
      case 2: return _generateSignatureWithConstraints(seed, { steps: STEPS, paletteSize: Math.min(6, Math.max(1, COUNT())), pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true });
      case 3: { const L = 8; const pattern = Array.from({ length: L }, () => randValue(rng)); return Array.from({ length: STEPS }, (_, i) => pattern[i % L]); }
      case 4: { const N = COUNT(); const seq = [0]; let cur = 0; for (let i = 1; i < STEPS; i++) { const dir = rng() > 0.5 ? 1 : -1; const step = (Math.floor(rng() * 3) + 1); cur = Math.max(0, Math.min(N, cur + dir * step)); seq.push(cur); } return seq; }
      case 5: { const seq = []; let cluster = randValue(rng); for (let i = 0; i < STEPS;) { const len = Math.min((Math.floor(rng() * 6) + 2), STEPS - i); for (let j = 0; j < len; j++, i++) seq.push(cluster); cluster = randValue(rng); } return seq; }
      case 6: { const seq = []; for (let i = 0; i < STEPS; i++) seq.push(rng() > 0.7 ? randNonHum(rng) : 0); return seq; }
      case 7: { const seq = new Array(STEPS).fill(0); let pos = 0; let a = 1, b = 1; while (pos < STEPS) { seq[pos] = randNonHum(rng); const next = a + b; a = b; b = next; pos += next; } return seq; }
      case 8: { const a = randValue(rng); const b = randValue(rng); return Array.from({ length: STEPS }, (_, i) => (i % 2 === 0 ? a : b)); }
      case 9: { let v = randNonHum(rng); const seq = []; for (let i = 0; i < STEPS; i++) { if (rng() < 0.2 || v === 0) v = randValue(rng); seq.push(v); if (rng() > 0.7) v = Math.max(0, v - 1); } return seq; }
      case 10: { let c = randValue(rng); const seq = []; for (let i = 0; i < STEPS; i++) { if (i % 8 === 0 || rng() > 0.6) c = randValue(rng); seq.push(c); } return seq; }
      default: return _generateSignatureWithConstraints(seed);
    }
  }

  function _generateSignatureWithConstraints(seed, { steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true } = {}) {
    const rng = app._rng(`${seed}_audio_signature_constrained`);
    const N = COUNT(); const sequence = []; const paletteCount = Math.max(1, Math.min(N, paletteSize));
    let last = null; let prevNonHum = null;
    for (let i = 0; i < steps; i++) {
      if (rng() < pSilence) { sequence.push(null); continue; }
      const roll = rng(); let next;
      if (roll < pHum) next = 0;
      else if (roll < pHum + pRepeat && prevNonHum !== null) next = prevNonHum;
      else {
        do {
          next = randIntInclusive(rng, 1, paletteCount);
          if (avoidBackAndForth && last !== null && last >= 1 && next >= 1) {
            if (sequence.length >= 2 && sequence[sequence.length - 2] === next) next = null;
          }
        } while (next === null);
      }
      sequence.push(next);
      if (next !== null) { if (next >= 1) prevNonHum = next; last = next; }
    }
    return sequence;
  }

  // ---------- Audio Signature triggers ----------
  function _onAudioSignature() {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered || s.audioSignaturePlaying) return;
    const selected = s._uiReturnShapeKey || s.current || HUM();
    _triggerSignatureFor(selected, { loop: s.isLoopEnabled });
  }

  function _triggerSignatureFor(shapeKey, { loop = app.state.isLoopEnabled } = {}) {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    if (s.sequencePlaying) stopSequence();
    if (s.audioSignaturePlaying) stopAudioSignature();
    s._uiReturnShapeKey = shapeKey || s._uiReturnShapeKey || HUM();
    const algorithmMap = _getUniqueAlgorithmMapping(s.seed);
    const algorithm = algorithmMap[shapeKey] || 1;
    const sequence = generateAudioSignature(s.seed, algorithm);
    playAudioSignature(sequence, algorithm, { loop });
    app._loader.textContent = loop ? `Playing ${shapeKey} Audio Signature (Loop).` : `Playing ${shapeKey} Audio Signature...`;
  }

  function playAudioSignature(sequence, algorithm = 1, { loop = false, onComplete = null } = {}) {
    const s = app.state; if (s.audioSignaturePlaying) stopAudioSignature();
    const currentUiShape = (typeof s.current === 'string' && s.current) ? s.current : null; s._uiReturnShapeKey = currentUiShape || s._uiReturnShapeKey || HUM();
    s.audioSignaturePlaying = true; s.audioSignatureStepIndex = 0; s.audioSignatureOnComplete = onComplete;
    let stepTime; switch (algorithm) { case 3: case 7: stepTime = 100; break; case 5: stepTime = 150; break; case 10: stepTime = 200; break; default: stepTime = 125; }
    const playStep = () => {
      if (!s.audioSignaturePlaying) return;
      const stepIndex = s.audioSignatureStepIndex; const shapeIndex = sequence[stepIndex];
      if (shapeIndex !== null) {
        let sk; if (shapeIndex === 0) sk = HUM(); else { const list = LIST(); sk = list[shapeIndex - 1]; }
        if (sk) { app._updateControls({ shapeKey: sk }); app._onShapeChange({ detail: { shapeKey: sk } }); }
      }
      s.audioSignatureStepIndex++;
      if (s.audioSignatureStepIndex >= sequence.length) {
        const finishOnce = () => {
          s.audioSignaturePlaying = false; s.audioSignatureTimer = null;
          const cb = s.audioSignatureOnComplete; s.audioSignatureOnComplete = null;
          if (typeof cb === 'function') cb(); else app._loader.textContent = 'Audio Signature complete.';
        };
        if (loop) { s.audioSignatureStepIndex = 0; s.audioSignatureTimer = setTimeout(playStep, stepTime); }
        else {
          try { app.setActiveChain(HUM(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
          if (app._canvas) app._canvas.isPlaying = false;
          if (s._uiReturnShapeKey) { app.state.current = s._uiReturnShapeKey; app._updateControls({ shapeKey: s._uiReturnShapeKey }); } else { app._updateControls({}); }
          s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
        }
        return;
      }
      s.audioSignatureTimer = setTimeout(playStep, stepTime);
    };
    playStep();
  }

  function stopAudioSignature() {
    const s = app.state; if (s.audioSignatureTimer) { clearTimeout(s.audioSignatureTimer); s.audioSignatureTimer = null; }
    s.audioSignaturePlaying = false; s.audioSignatureStepIndex = 0;
    try { app.setActiveChain(HUM(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
    if (app._canvas) app._canvas.isPlaying = false;
    if (s._uiReturnShapeKey) { app.state.current = s._uiReturnShapeKey; app._updateControls({ shapeKey: s._uiReturnShapeKey }); } else { app._updateControls({}); }
    s.audioSignatureOnComplete = null;
  }

  // ---------- Sequencer bridge ----------
  function _onSeqRecordStart(e) { const slotIndex = e?.detail?.slotIndex ?? -1; app.state.isRecording = true; app.state.currentRecordSlot = slotIndex; app._updateControls(); }
  function _onSeqStepCleared(e) {
    const slotIndex = e?.detail?.slotIndex; if (typeof slotIndex !== 'number') return;
    app.state.sequence[slotIndex] = null;
    if (app.state.isRecording && app.state.currentRecordSlot === slotIndex) {
      app.state.currentRecordSlot = (slotIndex + 1) % 8;
      if (app.state.currentRecordSlot === 0) app.state.isRecording = false;
    }
  }
  function _onSeqStepRecorded(e) {
    const { slotIndex, value, nextSlot, isRecording } = e?.detail ?? {};
    if (typeof slotIndex === 'number') app.state.sequence[slotIndex] = value;
    if (typeof nextSlot === 'number') app.state.currentRecordSlot = nextSlot;
    if (typeof isRecording === 'boolean') app.state.isRecording = isRecording;
  }
  function _onSeqPlayStarted(e) {
    const stepTime = e?.detail?.stepTime;
    app.state.sequencePlaying = true; app.state.sequenceStepIndex = 0; app.state._seqFirstCycleStarted = false;
    if (typeof stepTime === 'number') app.state.stepTime = stepTime;
    app._updateControls();
    if (app.state.isSequenceSignatureMode) { app._sequencerComponent?.stopSequence(); _startSignatureSequencer(); }
  }
  function _onSeqPlayStopped() {
    const s = app.state;
    s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false;
    if (s.signatureSequencerRunning) _stopSignatureSequencer();
    app._updateControls();
  }
  function _onSeqStepAdvance(e) {
    if (app.state.isSequenceSignatureMode) return;
    const d = e?.detail || {};
    const stepIndex = (typeof d.stepIndex === 'number') ? d.stepIndex : (typeof d.index === 'number') ? d.index : app.state.sequenceStepIndex;
    const value = d.value;

    if (app.state.sequencePlaying) {
      if (stepIndex === 0) {
        if (app.state._seqFirstCycleStarted) {
          if (!app.state.isLoopEnabled) { stopSequence(); return; }
        } else { app.state._seqFirstCycleStarted = true; }
      }
    }
    app.state.sequenceStepIndex = stepIndex;

    let shapeKeyVal = null;
    if (value === 0) shapeKeyVal = HUM();
    else if (value >= 1 && value <= COUNT()) shapeKeyVal = LIST()[value - 1];
    else return;

    app._updateControls({ shapeKey: shapeKeyVal });
    app._onShapeChange({ detail: { shapeKey: shapeKeyVal } });
  }
  function _onSeqStepTimeChanged(e) {
    const stepTime = e?.detail?.stepTime; if (typeof stepTime === 'number') app.state.stepTime = stepTime;
  }
  function _onSeqStepsChanged(e) {
    const steps = e?.detail?.steps;
    if (typeof steps === 'number' && steps > 0) {
      app.state.sequenceSteps = steps;
      const currentLength = app.state.sequence.length;
      if (steps !== currentLength) {
        const oldSeq = [...app.state.sequence]; const oldVel = [...(app.state.velocities || [])];
        app.state.sequence = Array.from({ length: steps }, (_, i) => oldSeq[i] ?? null);
        app.state.velocities = Array.from({ length: steps }, (_, i) => oldVel[i] ?? 1);
      }
      updateSequencerState();
    }
  }

  async function _startSignatureSequencer() {
    const s = app.state; if (s.signatureSequencerRunning) return; s.signatureSequencerRunning = true;
    stopAudioSignature(); const algorithmMap = _getUniqueAlgorithmMapping(s.seed);
    const runOnePass = async () => {
      if (!s.signatureSequencerRunning) return;
      for (let i = 0; i < s.sequence.length; i++) {
        if (!s.signatureSequencerRunning) return;
        s.sequenceStepIndex = i; updateSequencerState();
        const value = s.sequence[i];
        if (value === null || typeof value !== 'number' || value < 0) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        let sk = null;
        if (value === 0) sk = HUM(); else if (value >= 1 && value <= COUNT()) sk = LIST()[value - 1];
        if (!sk) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        const algo = algorithmMap[sk] || 1; const seq = generateAudioSignature(s.seed, algo);
        await new Promise(resolve => {
          if (!s.signatureSequencerRunning) { resolve(); return; }
          playAudioSignature(seq, algo, { loop: false, onComplete: () => resolve() });
        });
        if (!s.signatureSequencerRunning) return; await app._sleep(Math.max(30, s.stepTime));
      }
    };
    await runOnePass(); if (!s.signatureSequencerRunning) return;
    if (s.isLoopEnabled && s.sequencePlaying) { while (s.signatureSequencerRunning && s.sequencePlaying) { await runOnePass(); } }
    _stopSignatureSequencer(); app._sequencerComponent?.stopSequence?.();
  }

  function _stopSignatureSequencer() {
    const s = app.state;
    s.signatureSequencerRunning = false; stopAudioSignature();
    s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false;
    updateSequencerState();
    if (s._uiReturnShapeKey) app._updateControls({ shapeKey: s._uiReturnShapeKey }); else app._updateControls();
  }

  function updateSequencerState() {
    if (!app._sequencerComponent) return;
    app._sequencerComponent.updateState?.({
      isRecording: app.state.isRecording,
      currentRecordSlot: app.state.currentRecordSlot,
      sequence: [...app.state.sequence],
      velocities: [...app.state.velocities],
      sequencePlaying: app.state.sequencePlaying,
      sequenceStepIndex: app.state.sequenceStepIndex,
      stepTime: app.state.stepTime,
      isLoopEnabled: app.state.isLoopEnabled,
      isSequenceSignatureMode: app.state.isSequenceSignatureMode,
      steps: app.state.sequenceSteps
    });
  }

  function recordStep(number) { app._sequencerComponent?.recordStep(number); }
  function playSequence() { app._sequencerComponent?.playSequence(); }
  function stopSequence() {
    app._sequencerComponent?.stopSequence();
    if (app.state.signatureSequencerRunning) _stopSignatureSequencer();
    if (app.state.audioSignaturePlaying) stopAudioSignature();
    app.state.sequencePlaying = false; app.state.sequenceStepIndex = 0; app.state._seqFirstCycleStarted = false;
    updateSequencerState(); app._updateControls();
  }

  return {
    // toggles
    _onToggleSequencer, _onLoopToggle, _onSignatureModeToggle,
    // signatures
    _getUniqueAlgorithmMapping, generateAudioSignature, _generateSignatureWithConstraints,
    _onAudioSignature, _triggerSignatureFor, playAudioSignature, stopAudioSignature,
    // sequencer bridge
    _onSeqRecordStart, _onSeqStepCleared, _onSeqStepRecorded, _onSeqPlayStarted, _onSeqPlayStopped, _onSeqStepAdvance, _onSeqStepTimeChanged, _onSeqStepsChanged,
    _startSignatureSequencer, _stopSignatureSequencer, updateSequencerState,
    // proxies
    recordStep, playSequence, stopSequence,
  };
}

// ============================
// ToneLoader custom element
// ============================

class ToneLoader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '';
    this._loaded = false;
  }
  connectedCallback() {
    if (this._loaded) return;
    this._loaded = true;
    const toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    import(toneUrl).then(mod => {
      if (!window.Tone && (mod?.default || mod?.Tone)) {
        window.Tone = mod.default ?? mod.Tone;
      }
      this.dispatchEvent(new CustomEvent('tone-ready', {
        bubbles: true,
        composed: true
      }));
    }).catch(err => {
      console.error('Failed to load Tone.js:', err);
    });
  }
}
customElements.define('tone-loader', ToneLoader);
