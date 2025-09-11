// engine.js
// Corrected state management for all toggle functions.
// Public API preserved: export { Engine, Signatures }; registers <tone-loader>.
// v20.2 - Use shared createElement from utils.js

import { humKey, shapeList, shapeCount, allKeys } from './shapes.js';
import { createElement } from './utils.js';

export function Engine(app) {
  // --------- tiny helpers (pure / side-effect-light) ----------
  const A = Object.assign;
  const _eachChain = f => { const cs = app.state.chains; for (const k in cs) f(cs[k], k); };
  const _sleep = ms => new Promise(r => setTimeout(r, ms));
  const _timeNow = T => T?.now?.() ?? 0;
  const _setCanvas = p => A(app._canvas, p);
  const _rng = s => { let a = 0x6d2b79f5 ^ s.length; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 2654435761); return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000); };
  const _createAnalyser = T => { const n = T?.context?.createAnalyser?.(); if (n) { n.fftSize = 2048; try { n.smoothingTimeConstant = .06; } catch {} } return n || null; };
  const _linToDb = v => v <= 0 ? -60 : Math.max(-60, Math.min(0, 20 * Math.log10(Math.min(1, Math.max(1e-4, v)))));
  const tryDo = f => { try { f?.(); } catch {} };
  const tryAwait = async f => { try { await f?.(); } catch {} };

  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const FADE = isiOS ? 0.028 : 0.012;
  const SWITCH_FADE = isiOS ? 0.028 : 0.008;

  const _rampLinear = (p, t, s = FADE, T) => {
    if (!p || !T) return;
    const n = _timeNow(T);
    tryDo(() => p.cancelScheduledValues?.(n));
    const cur = p.value ?? 0;
    tryDo(() => p.setValueAtTime?.(cur, n));
    tryDo(() => p.linearRampToValueAtTime?.(t, n + Math.max(.001, s)));
  };

  const _silenceAllChains = async (f = FADE) => {
    const T = app.state?.Tone; if (!T) return;
    _eachChain(ch => ch?.out?.gain && _rampLinear(ch.out.gain, 0, f, T));
    await app._sleep(Math.ceil((f + .002) * 1e3));
  };

  const _disposeNode = n => { tryDo(() => n.stop?.()); tryDo(() => n.dispose?.()); tryDo(() => n.disconnect?.()); };
  const _disposeChain = async ch => {
    const T = app.state?.Tone;
    if (T && ch?.out?.gain) {
      _rampLinear(ch.out.gain, 0, FADE, T);
      await app._sleep(Math.ceil((FADE + .002) * 1e3));
    }
    for (const n of Object.values(ch || {})) _disposeNode(n);
  };

  // +++ NEW: Updates the polyphonic synth voice to match a preset +++
  const _updateKeyboardSynthVoice = (shapeKey) => {
    const { Tone: T, presets, keyboardSynth } = app.state;
    if (!T || !keyboardSynth) return;

    const preset = presets[shapeKey];
    if (!preset) {
        // Fallback to a simple sine wave if no preset (e.g., for 'hum')
        tryDo(() => keyboardSynth.set({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 },
            filter: { Q: 1, type: 'lowpass', frequency: 1000 }
        }));
        return;
    }

    // Configure the synth based on the preset
    // Use the primary oscillator from the preset
    const voiceConfig = {
      oscillator: { 
        type: preset.osc1[0] // Use the waveform from the first oscillator
      },
      envelope: preset.envelope, // Use the envelope from the preset
      filter: { 
        Q: preset.filterQ, 
        type: 'lowpass',
        frequency: preset.filter // Use the filter frequency from preset
      }
    };

    tryDo(() => keyboardSynth.set(voiceConfig));
    
    // Log for debugging
    console.log(`Applied preset for ${shapeKey}:`, {
      oscillator: preset.osc1[0],
      envelope: preset.envelope,
      filter: preset.filter,
      filterQ: preset.filterQ
    });
  };

  const deterministicPreset = (seed, shape) => {
    const r = _rng(`${seed}_${shape}`);
    const types = ['sine','triangle','square','sawtooth'];
    const notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const m = r();
    const mode = m < .18 ? 0 : m < .56 ? 1 : m < .85 ? 2 : 3;
    const cnt = mode === 3 ? 2 + (r() > .7 ? 1 : 0) : 1 + (r() > .6 ? 1 : 0);
    const pick = arr => arr[(r() * arr.length) | 0];
    const oscs = Array.from({ length: cnt }, () => [pick(types), pick(notes)]);
    let env, lfoRate, lfoMin, lfoMax, filterBase;
    if (mode === 0) { lfoRate = .07 + r() * .3; lfoMin = 400 + r() * 400; lfoMax = 900 + r() * 600; filterBase = 700 + r() * 500; env = { attack: .005 + r() * .03, decay: .04 + r() * .08, sustain: .1 + r() * .2, release: .03 + r() * .1 }; }
    else if (mode === 1) { lfoRate = .25 + r() * 8;  lfoMin = 120 + r() * 700; lfoMax = 1200 + r() * 1400; filterBase = 300 + r() * 2400; env = { attack: .03 + r() * .4, decay: .1 + r() * .7, sustain: .2 + r() * .5, release: .2 + r() * 3 }; }
    else if (mode === 2) { lfoRate = 6 + r() * 20;  lfoMin = 80 + r() * 250;  lfoMax = 1500 + r() * 3500; filterBase = 300 + r() * 2400; env = { attack: .03 + r() * .4, decay: .1 + r() * .7, sustain: .2 + r() * .5, release: .2 + r() * 3 }; }
    else               { lfoRate = 24 + r() * 36; lfoMin = 80 + r() * 250;  lfoMax = 1500 + r() * 3500; filterBase = 300 + r() * 2400; env = { attack: 2 + r() * 8,   decay: 4 + r() * 20, sustain: .7 + r() * .2, release: 8 + r() * 24 }; }
    return {
      osc1: oscs[0], osc2: oscs[1] || null, filter: filterBase, filterQ: .6 + r() * .7,
      lfo: [lfoRate, lfoMin, lfoMax], envelope: env,
      colorSpeed: .06 + r() * .22, shapeDrift: .0006 + r() * .0032, seed
    };
  };

  const loadPresets = seed => { app.state.presets = Object.fromEntries(shapeList(app).map(k => [k, deterministicPreset(seed, k)])); };

  const bufferHumChain = async () => {
    const { Tone: T, chains: C } = app.state; if (!T) return;
    const key = humKey(app);
    if (C[key]) { await _disposeChain(C[key]); delete C[key]; }
    try {
      const osc = new T.Oscillator('A0', 'sine').start();
      const filter = new T.Filter(150, 'lowpass'); filter.Q.value = .5;
      const volume = new T.Volume(-25);
      const analyser = _createAnalyser(T);
      const out = new T.Gain(0).toDestination();
      osc.connect(volume); volume.connect(filter); filter.connect(out); analyser && filter.connect(analyser);
      C[key] = { osc, volume, filter, out, analyser };
    } catch (e) { console.error('Error buffering hum chain', e); delete app.state.chains[key]; }
  };

  const bufferShapeChain = async shape => {
    if (shape === humKey(app)) return bufferHumChain();
    const { Tone: T, presets: P, chains: C } = app.state, pr = P[shape]; if (!pr || !T) return;
    if (C[shape]) { await _disposeChain(C[shape]); delete C[shape]; }
    try {
      const o1 = new T.Oscillator(pr.osc1[1], pr.osc1[0]).start();
      const o2 = pr.osc2 ? new T.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const vol = new T.Volume(5);
      const fil = new T.Filter(pr.filter, 'lowpass'); fil.Q.value = pr.filterQ;
      const lfo = new T.LFO(...pr.lfo).start();
      const an = _createAnalyser(T);
      const out = new T.Gain(0).toDestination();
      lfo.connect(fil.frequency); o2 && lfo.connect(o2.detune);
      o1.connect(vol); o2?.connect(vol); vol.connect(fil); fil.connect(out); an && fil.connect(an);
      C[shape] = { osc1: o1, osc2: o2, volume: vol, filter: fil, lfo, out, analyser: an };
    } catch (e) { console.error('Error buffering chain for shape', shape, e); delete app.state.chains[shape]; }
  };

  const setActiveChain = (shape, { updateCanvasShape: u = true, setStateCurrent: s = u, syncCanvasPlayState: y = true } = {}) => {
    const { Tone: T, chains: C, current } = app.state;
    const prev = C[current], next = C[shape];
    if (prev && prev !== next) _rampLinear(prev.out.gain, 0, SWITCH_FADE, T);
    if (next) _rampLinear(next.out.gain, 1, SWITCH_FADE, T);

    const patch = { isAudioStarted: true };
    next?.analyser && (patch.analyser = next.analyser);
    y && (patch.isPlaying = app.state.isPlaying);
    _setCanvas(patch);

    if (u) shape === humKey(app)
      ? _setCanvas({ shapeKey: humKey(app), preset: null })
      : _setCanvas({ shapeKey: shape, preset: app.state.presets[shape] });
    if (s) app.state.current = shape;

    // +++ NEW: Update the keyboard synth whenever the active chain changes +++
    _updateKeyboardSynthVoice(shape);
  };

  const disposeAllChains = () => {
    _eachChain(_disposeChain);
    app.state.chains = {};
    app.state.current = null;
    // +++ NEW: Dispose the keyboard synth as well +++
    tryDo(() => app.state.keyboardSynth?.dispose());
    app.state.keyboardSynth = null;
  };

  const updateSequencerState = () => { app.sig?.updateSequencerState?.(); };
  const stopSequence = () => { app.sig?.stopSequence?.(); };
  const stopAudioSignature = () => { app.sig?.stopAudioSignature?.(); };

  const resetState = () => {
    disposeAllChains();
    app.state.sequencePlaying && stopSequence();
    app.state.audioSignaturePlaying && stopAudioSignature?.();

    const { seed, Tone: T, approvedSeeds } = app.state;          // persist
    app.state = app.defaultState(seed);                           // reset
    app.state.Tone = T;                                           // restore
    app.state.approvedSeeds = approvedSeeds || [];
    app.state.keyboardSynth = null; // +++ NEW: Ensure keyboard synth is cleared on reset +++

    loadPresets(seed);
    bufferHumChain();
    const list = shapeList(app), r = _rng(seed), first = list.length ? list[(r() * list.length) | 0] : humKey(app);
    _setCanvas({ preset: app.state.presets[first] ?? null, shapeKey: first, mode: 'seed', isAudioStarted: false, isPlaying: false });
    app.state.current = humKey(app);
    app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(app) });
    app.state.isSequencerMode = false;
    app._sequencerComponent.style.display = 'none';
    app._main.style.overflow = 'hidden';
    app.state.sequence = Array(8).fill(null);
    updateSequencerState?.();
  };

  const unlockAudioAndBufferInitial = async () => {
    const s = app.state;

    if (s.initialBufferingStarted && !s.initialShapeBuffered) { app._loader.textContent = 'Still preparing initial synth, please wait...'; return; }
    if (s.isPlaying) return stopAudioAndDraw();

    if (s.contextUnlocked) {
      if (!s.initialShapeBuffered) { app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.'; return; }

      setActiveChain(humKey(app));
      s.isPlaying = true; app._canvas.isPlaying = true;
      app._updateControls({ isAudioStarted: true, isPlaying: true });

      if (!s._startupSigDone) {
        await tryAwait(() => app._sleep(200));
        tryDo(() => app._triggerSignatureFor?.(humKey(app), { loop: s.isLoopEnabled }));
        setTimeout(() => tryDo(() => { app.cleanupHotkeyTour?.(); app.runHotkeyTour?.({ stepMs: 260, holdMs: 1000 }); }), 60);
        s._startupSigDone = true;
      }
      app._loader.textContent = 'Audio resumed (hum).';
      return;
    }

    // First unlock
    try {
      const T = s.Tone; if (!T) throw new Error('Tone.js not available');
      const ctx = T.getContext?.() || T.context;
      let ok = false;
      if (ctx?.resume) { await ctx.resume(); ok = true; }
      else if (T.start) { await T.start(); ok = true; }
      if (!ok) throw new Error('Could not resume AudioContext');

      s.contextUnlocked = true;
      s.initialBufferingStarted = true;

      // +++ NEW: Create the polyphonic synth for keyboard use +++
      if (!s.keyboardSynth) {
          // Use regular Synth for more reliable preset application
          s.keyboardSynth = new T.PolySynth(T.Synth).toDestination();
          // Apply initial global volume setting
          const currentVolumeDb = _linToDb(s.volume);
          if (s.keyboardSynth.volume) s.keyboardSynth.volume.value = currentVolumeDb;
      }

      // 1) HUM first
      await bufferHumChain();
      setActiveChain(humKey(app));

      // 2) Prebuffer all shapes
      for (const sh of shapeList(app)) {
        if (!s.contextUnlocked) break;
        await tryAwait(() => bufferShapeChain(sh));
        await _sleep(0);
      }
      s.initialShapeBuffered = true;

      // 3) Mark playing + UI
      s.isPlaying = true; app._canvas.isPlaying = true;
      app._updateControls({ isAudioStarted: true, isPlaying: true });

      // 4) Startup signature once
      if (!s._startupSigDone) {
        await tryAwait(() => app._sleep(200));
        tryDo(() => app._triggerSignatureFor?.(humKey(app), { loop: s.isLoopEnabled }));
        setTimeout(() => tryDo(() => { app.cleanupHotkeyTour?.(); app.runHotkeyTour?.({ stepMs: 260, holdMs: 1000 }); }), 60);
        s._startupSigDone = true;
      }
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
      s.contextUnlocked = false;
      s.initialBufferingStarted = false;
      s.initialShapeBuffered = false;
    }
  };

  const stopAudioAndDraw = () => {
    const s = app.state;
    if (!s.isPlaying && !s.initialBufferingStarted) return;

    tryDo(() => app.cleanupHotkeyTour?.());
    if (s.audioSignatureTimer) { tryDo(() => clearTimeout(s.audioSignatureTimer)); s.audioSignatureTimer = null; }

    s.isPlaying = s.initialBufferingStarted = s.initialShapeBuffered = false;
    disposeAllChains();
    s.sequencePlaying && stopSequence?.();
    s.audioSignaturePlaying && stopAudioSignature?.();

    if (app._canvas) { app._canvas.isPlaying = false; app._canvas.isAudioStarted = false; }
    resetState();
  };

  const _onStartRequest = () => unlockAudioAndBufferInitial();

  const _onMuteToggle = () => {
    const s = app.state, T = s.Tone;
    if (!T?.Destination) return;
    const newMutedState = !s.isMuted;
    T.Destination.mute = newMutedState;
    s.isMuted = newMutedState;
    app._updateControls();
    _setCanvas({ isPlaying: s.isPlaying && !s.isMuted });
    app._loader.textContent = s.isMuted ? 'Muted.' : 'Unmuted.';
  };

  const _onVolumeChange = e => {
    const v = e?.detail?.value;
    if (typeof v !== 'number') return;
    const s = app.state; s.volume = Math.min(1, Math.max(0, v));
    const T = s.Tone;
    const newVolumeDb = _linToDb(s.volume);
    // Update main destination volume
    T?.Destination?.volume && (T.Destination.volume.value = newVolumeDb);
    // +++ NEW: Also update the keyboard synth's volume +++
    s.keyboardSynth?.volume && (s.keyboardSynth.volume.value = newVolumeDb);
    app._updateControls({ volume: s.volume });
  };

  const _onShapeChange = e => {
    const k = e?.detail?.shapeKey; if (!k) return;
    const s = app.state, HUM = humKey(app);
    if (!s.audioSignaturePlaying && !s.signatureSequencerRunning) s._uiReturnShapeKey = k !== HUM ? k : s._uiReturnShapeKey;

    if (!s.contextUnlocked || !s.initialShapeBuffered) {
      k === HUM
        ? _setCanvas({ shapeKey: HUM, preset: null, mode: 'seed' })
        : _setCanvas({ shapeKey: k, preset: s.presets[k], mode: 'seed' });
      app._updateControls({ shapeKey: k });
      return;
    }

    setActiveChain(k); // This will now also call _updateKeyboardSynthVoice
    k !== HUM && _setCanvas({ shapeKey: k, preset: s.presets[k], mode: 'live' });
    app._canvas.isPlaying = !app.state.Tone?.Destination?.mute;
    app._updateControls({ shapeKey: k });
    s.current = k;
  };

  // +++ NEW: Public functions for keyboard control +++
  const playNote = (note, velocity = 1.0) => {
      const { Tone: T, keyboardSynth, isMuted } = app.state;
      if (!keyboardSynth || !T || isMuted) return;
      keyboardSynth.triggerAttack(note, T.now(), velocity);
  };

  const stopNote = (note) => {
      const { Tone: T, keyboardSynth } = app.state;
      if (!keyboardSynth || !T) return;
      keyboardSynth.triggerRelease(note, T.now());
  };

  const setInstrument = (shapeKey) => {
      if (!shapeKey || !app.state.presets[shapeKey]) {
          console.log('Invalid shape key or preset not found:', shapeKey);
          return;
      }
      
      // Update the current state
      app.state.current = shapeKey;
      
      // Directly update the keyboard synth with the new preset
      _updateKeyboardSynthVoice(shapeKey);
      
      console.log(`Instrument changed to: ${shapeKey}`);
  };

  const getSynthState = () => ({
      currentShape: app.state.current,
      isMuted: app.state.isMuted,
      volume: app.state.volume,
      isPlaying: app.state.isPlaying,
      isReady: app.state.contextUnlocked && app.state.initialShapeBuffered,
      presets: Object.keys(app.state.presets || {})
  });


  return {
    // Original functions
    createElement,_eachChain,_disposeChain,_rng,_setCanvas,_createAnalyser,_sleep,_timeNow,_rampLinear,_silenceAllChains,_linToDb,
    deterministicPreset, loadPresets,
    bufferHumChain, bufferShapeChain, setActiveChain, disposeAllChains, resetState,
    unlockAudioAndBufferInitial, stopAudioAndDraw, _onStartRequest, _onMuteToggle, _onShapeChange, _onVolumeChange,
    updateSequencerState, stopSequence, stopAudioSignature,
    // +++ NEW: Exposed functions for keyboard interaction +++
    playNote,
    stopNote,
    setInstrument,
    getSynthState
  };
}


export function Signatures(app) {
  const HUM = () => humKey(app), LIST = () => shapeList(app), COUNT = () => shapeCount(app), ALL = () => allKeys(app);
  const rInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const rVal = r => rInt(r, 0, COUNT());
  const rNon = r => { const N = COUNT(); return N > 0 ? rInt(r, 1, N) : 0; };

  const _onToggleSequencer = () => {
    const s = app.state;
    s.isSequencerMode = !s.isSequencerMode;
    app._sequencerComponent && (app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none');
    if (!s.isSequencerMode) {
      s.isRecording = false; s.currentRecordSlot = -1;
      s.sequencePlaying && stopSequence();
      s.signatureSequencerRunning && _stopSignatureSequencer();
    } else updateSequencerState();
    app._updateControls({ sequencerVisible: s.isSequencerMode });
    typeof app._fitLayout == 'function' && app._fitLayout();
  };

  // --- FIX: Correct state management for Loop toggle ---
  const _onLoopToggle = () => {
    const s = app.state;
    s.isLoopEnabled = !s.isLoopEnabled;
    app._updateControls();
    try { app._pathRec?.setLoop?.(s.isLoopEnabled); } catch {}
  };

  // --- FIX: Correct state management for Signature Mode toggle ---
  const _onSignatureModeToggle = () => {
    const s = app.state;
    s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
    app._updateControls();
    s.sequencePlaying && stopSequence();
    s.audioSignaturePlaying && stopAudioSignature();
  };

  const _getUniqueAlgorithmMapping = seed => {
    const r = app._rng(`${seed}_unique_algo_mapping`);
    const keys = ALL(), n = keys.length;
    const base = [1,2,3,4,5,6,7,8,9,10];
    const pool = [];
    while (pool.length < n) pool.push(...base);
    pool.length = n;
    for (let i = pool.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const m = {}; keys.forEach((k, i) => m[k] = pool[i]); return m;
  };

  const _generateSignatureWithConstraints = (
    seed,
    { steps = 32, paletteSize = 6, pRepeat = .35, pHum = .15, pSilence = .2, avoidBackAndForth = true } = {}
  ) => {
    const r = app._rng(`${seed}_audio_signature_constrained`);
    const N = COUNT(), pal = Math.max(1, Math.min(N, paletteSize));
    const seq = []; let last = null, prev = null;
    for (let i = 0; i < steps; i++) {
      if (r() < pSilence) { seq.push(null); continue; }
      const roll = r(); let next;
      if (roll < pHum) next = 0;
      else if (roll < pHum + pRepeat && prev !== null) next = prev;
      else {
        do {
          next = rInt(r, 1, pal);
          if (avoidBackAndForth && last !== null && last >= 1 && next >= 1 && seq.length >= 2 && seq.at(-2) === next) next = null;
        } while (next === null);
      }
      seq.push(next);
      if (next !== null) { if (next >= 1) prev = next; last = next; }
    }
    return seq;
  };

  const generateAudioSignature = (seed, alg = 1) => {
    const r = app._rng(`${seed}_audio_signature_v${alg}`), S = 32, N = COUNT();
    switch (alg) {
      case 1: { const a = []; for (let i = 0; i < S; i++) a.push(rVal(r)); return a; }
      case 2: return _generateSignatureWithConstraints(seed, { steps: S, paletteSize: Math.min(6, Math.max(1, N)), pRepeat: .35, pHum: .15, pSilence: .2, avoidBackAndForth: true });
      case 3: { const L = 8, p = Array.from({ length: L }, () => rVal(r)); return Array.from({ length: S }, (_, i) => p[i % L]); }
      case 4: { const a = [0]; let cur = 0; for (let i = 1; i < S; i++) { const dir = r() > .5 ? 1 : -1, step = ((r() * 3) | 0) + 1; cur = Math.max(0, Math.min(N, cur + dir * step)); a.push(cur); } return a; }
      case 5: { const a = []; let c = rVal(r); for (let i = 0; i < S;) { const len = Math.min(((r() * 6) | 0) + 2, S - i); for (let j = 0; j < len; j++, i++) a.push(c); c = rVal(r); } return a; }
      case 6: { const a = []; for (let i = 0; i < S; i++) a.push(r() > .7 ? rNon(r) : 0); return a; }
      case 7: { const a = new Array(S).fill(0); let pos = 0, x = 1, y = 1; while (pos < S) { a[pos] = rNon(r); const n = x + y; x = y; y = n; pos += n; } return a; }
      case 8: { const a = rVal(r), b = rVal(r); return Array.from({ length: S }, (_, i) => i % 2 === 0 ? a : b); }
      case 9: { let v = rNon(r); const a = []; for (let i = 0; i < S; i++) { if (r() < .2 || v === 0) v = rVal(r); a.push(v); if (r() > .7) v = Math.max(0, v - 1); } return a; }
      case 10:{ let c = rVal(r); const a = []; for (let i = 0; i < S; i++) { if (i % 8 === 0 || r() > .6) c = rVal(r); a.push(c); } return a; }
      default: return _generateSignatureWithConstraints(seed);
    }
  };

  const _onAudioSignature = () => {
    const s = app.state;
    if (s.audioSignaturePlaying) { stopAudioSignature(); app._updateControls({ isAudioSignaturePlaying: false }); return; }
    if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    const sel = s._uiReturnShapeKey || s.current || HUM();
    _triggerSignatureFor(sel, { loop: s.isLoopEnabled });
    app._updateControls({ isAudioSignaturePlaying: true });
  };

  const _triggerSignatureFor = (shapeKey, { loop = app.state.isLoopEnabled } = {}) => {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    s.sequencePlaying && stopSequence();
    s.audioSignaturePlaying && stopAudioSignature();
    s._uiReturnShapeKey = shapeKey || s._uiReturnShapeKey || HUM();
    s._sigStartShapeKey = s._uiReturnShapeKey;

    const map = _getUniqueAlgorithmMapping(s.seed), alg = map[shapeKey] || 1, seq = generateAudioSignature(s.seed, alg);
    playAudioSignature(seq, alg);
    app._loader.textContent = s.isLoopEnabled ? `Playing ${shapeKey} Audio Signature (Loop).` : `Playing ${shapeKey} Audio Signature...`;
  };

  const playAudioSignature = (sequence, alg = 1, { onComplete = null } = {}) => {
    const s = app.state;
    s.audioSignaturePlaying && stopAudioSignature();

    const cur = (typeof s.current === 'string' && s.current) ? s.current : null;
    s._uiReturnShapeKey = cur || s._uiReturnShapeKey || HUM();
    s._sigStartShapeKey = s._uiReturnShapeKey;

    s.audioSignaturePlaying = true;
    s.audioSignatureStepIndex = 0;
    s.audioSignatureOnComplete = onComplete;
    app._updateControls({ isAudioSignaturePlaying: true });

    const stepTime = (alg === 3 || alg === 7) ? 100 : alg === 5 ? 150 : alg === 10 ? 200 : 125;

    // --- DROP-IN: replaces finishAndReturn entirely ---
    const finishAndReturn = () => {
      const s = app.state;
      try { app.cleanupHotkeyTour?.(); } catch {}

      if (s.isLatchOn) {
        s.isLatchOn = false;
        try { app._pathRec?.setLatch?.(false); } catch {}
        app._updateControls();
      }

      const hum = HUM();
      const startKey = s._sigStartShapeKey || s._uiReturnShapeKey || hum;

      try { app.setActiveChain(hum, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false }); } catch {}
      try { if (app._canvas) app._canvas.isPlaying = false; } catch {}

      try {
        const preset = (startKey === hum) ? null : (s.presets?.[startKey] || null);
        if (app._canvas) Object.assign(app._canvas, { shapeKey: startKey, preset, mode: 'live' });
        app._updateControls({ shapeKey: startKey });
      } catch {}

      s._uiReturnShapeKey = startKey;
      s._sigStartShapeKey = null;
    };

    // --- DROP-IN: replaces tick entirely ---
    const tick = () => {
      const s = app.state;
      if (!s.audioSignaturePlaying) return;

      const i = s.audioSignatureStepIndex;
      const val = sequence[i];

      if (val !== null) {
        const sk = val === 0 ? HUM() : LIST()[val - 1];
        if (sk) app._onShapeChange({ detail: { shapeKey: sk } });
      }

      s.audioSignatureStepIndex++;

      if (s.audioSignatureStepIndex >= sequence.length) {
        const finishOnce = () => {
          s.audioSignaturePlaying = false;
          s.audioSignatureTimer = null;
          app._updateControls({ isAudioSignaturePlaying: false });
          const cb = s.audioSignatureOnComplete;
          s.audioSignatureOnComplete = null;
          typeof cb === 'function' ? cb() : (app._loader.textContent = 'Audio Signature complete.');
        };

        if (s.isLoopEnabled) {
          s.audioSignatureStepIndex = 0;
          s.audioSignatureTimer = setTimeout(tick, stepTime);
        } else {
          finishAndReturn();
          s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
        }
        return;
      }

      s.audioSignatureTimer = setTimeout(tick, stepTime);
    };

    tick(); // keep at end
  };

  // --- DROP-IN: replaces stopAudioSignature entirely ---
  const stopAudioSignature = () => {
    const s = app.state;

    if (s.audioSignatureTimer) { clearTimeout(s.audioSignatureTimer); s.audioSignatureTimer = null; }
    try { app.cleanupHotkeyTour?.(); } catch {}

    s.audioSignaturePlaying = false;
    s.audioSignatureStepIndex = 0;
    app._updateControls({ isAudioSignaturePlaying: false });

    if (s.isLatchOn) {
      s.isLatchOn = false;
      try { app._pathRec?.setLatch?.(false); } catch {}
      app._updateControls();
    }

    const hum = HUM();
    const startKey = s._sigStartShapeKey || s._uiReturnShapeKey || hum;

    try { app.setActiveChain(hum, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false }); } catch {}
    try { if (app._canvas) app._canvas.isPlaying = false; } catch {}

    try {
      const preset = (startKey === hum) ? null : (s.presets?.[startKey] || null);
      if (app._canvas) Object.assign(app._canvas, { shapeKey: startKey, preset, mode: 'live' });
      app._updateControls({ shapeKey: startKey });
    } catch {}

    s._uiReturnShapeKey = startKey;
    s._sigStartShapeKey = null;
    s.audioSignatureOnComplete = null;
  };

  const _onSeqRecordStart = e => { const i = e?.detail?.slotIndex ?? -1; app.state.isRecording = true; app.state.currentRecordSlot = i; app._updateControls(); };

  const _onSeqStepCleared = e => {
    const i = e?.detail?.slotIndex; if (typeof i !== 'number') return;
    const s = app.state;
    s.sequence[i] = null;
    if (s.isRecording && s.currentRecordSlot === i) { s.currentRecordSlot = (i + 1) % 8; s.currentRecordSlot === 0 && (s.isRecording = false); }
  };

  const _onSeqStepRecorded = e => {
    const d = e?.detail ?? {};
    typeof d.slotIndex == 'number' && (app.state.sequence[d.slotIndex] = d.value);
    typeof d.nextSlot == 'number' && (app.state.currentRecordSlot = d.nextSlot);
    typeof d.isRecording == 'boolean' && (app.state.isRecording = d.isRecording);
  };

  const _onSeqPlayStarted = e => {
    const t = e?.detail?.stepTime, s = app.state;
    s.sequencePlaying = true; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; s.isSequencerMode = true;
    typeof t == 'number' && (s.stepTime = t);
    app._updateControls();
    s.isSequenceSignatureMode && (app._sequencerComponent?.stopSequence(), _startSignatureSequencer());
  };

  const _onSeqPlayStopped = () => {
    const s = app.state;
    s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; s.isSequencerMode = false;
    s.signatureSequencerRunning && _stopSignatureSequencer();
    if (!s.isLatchOn) {
      try {
        const h = HUM();
        app._updateControls({ shapeKey: h });
        app._onShapeChange({ detail: { shapeKey: h } });
      } catch {}
    }
    app._updateControls();
  };

  const _onSeqStepAdvance = e => {
    if (app.state.isSequenceSignatureMode) return;
    const d = e?.detail || {}, s = app.state;
    const i = typeof d.stepIndex == 'number' ? d.stepIndex : typeof d.index == 'number' ? d.index : s.sequenceStepIndex;
    const v = d.value;
    if (s.sequencePlaying) {
      if (i === 0) {
        if (s._seqFirstCycleStarted) { if (!s.isLoopEnabled) { stopSequence(); return; } }
        else s._seqFirstCycleStarted = true;
      }
    }
    s.sequenceStepIndex = i;
    if (v == null || v === 0) {
      if (!s.isLatchOn) {
        const h = HUM();
        app._updateControls({ shapeKey: h });
        app._onShapeChange({ detail: { shapeKey: h } });
      }
      return;
    }
    if (v >= 1 && v <= COUNT()) {
      const sk = LIST()[v - 1];
      app._updateControls({ shapeKey: sk });
      app._onShapeChange({ detail: { shapeKey: sk } });
    }
  };

  const _onSeqStepTimeChanged = e => { const t = e?.detail?.stepTime; typeof t == 'number' && (app.state.stepTime = t); };

  const _onSeqStepsChanged = e => {
    const n = e?.detail?.steps; if (typeof n == 'number' && n > 0) {
      const s = app.state; s.sequenceSteps = n;
      if (n !== s.sequence.length) {
        const oldSeq = [...s.sequence], oldVel = [...(s.velocities || [])];
        s.sequence = Array.from({ length: n }, (_, i) => oldSeq[i] ?? null);
        s.velocities = Array.from({ length: n }, (_, i) => oldVel[i] ?? 1);
      }
      updateSequencerState();
    }
  };

  const _startSignatureSequencer = async () => {
    const s = app.state; if (s.signatureSequencerRunning) return; s.signatureSequencerRunning = true;
    stopAudioSignature();
    const map = _getUniqueAlgorithmMapping(s.seed);

    const pass = async () => {
      if (!s.signatureSequencerRunning) return;
      for (let i = 0; i < s.sequence.length; i++) {
        if (!s.signatureSequencerRunning) return;
        s.sequenceStepIndex = i; updateSequencerState();
        const v = s.sequence[i];
        if (v === null || typeof v !== 'number' || v < 0) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        let sk = null; if (v === 0) sk = HUM(); else if (v >= 1 && v <= COUNT()) sk = LIST()[v - 1];
        if (!sk) { await app._sleep(Math.max(50, s.stepTime)); continue; }
        const alg = map[sk] || 1, seq = generateAudioSignature(s.seed, alg);
        await new Promise(res => { if (!s.signatureSequencerRunning) { res(); return; } playAudioSignature(seq, alg, { onComplete: () => res() }); });
        if (!s.signatureSequencerRunning) return; await app._sleep(Math.max(30, s.stepTime));
      }
    };

    await pass(); if (!s.signatureSequencerRunning) return;
    // --- LOGIC FIX: Check live state for looping ---
    if (s.isLoopEnabled && s.sequencePlaying) {
      while (s.signatureSequencerRunning && s.sequencePlaying && s.isLoopEnabled) await pass();
    }
    _stopSignatureSequencer(); app._sequencerComponent?.stopSequence?.();
  };

  const _stopSignatureSequencer = () => {
    const s = app.state;
    s.signatureSequencerRunning = false;
    stopAudioSignature();
    s.sequencePlaying = false;
    s.sequenceStepIndex = 0;
    s._seqFirstCycleStarted = false;
    updateSequencerState();
    s._uiReturnShapeKey ? app._updateControls({ shapeKey: s._uiReturnShapeKey }) : app._updateControls();
  };

  const updateSequencerState = () => {
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
  };

  const recordStep = n => { app._sequencerComponent?.recordStep(n); };
  const playSequence = () => { app._sequencerComponent?.playSequence(); };
  const stopSequence = () => {
    app._sequencerComponent?.stopSequence();
    const s = app.state;
    s.signatureSequencerRunning && _stopSignatureSequencer();
    s.audioSignaturePlaying && stopAudioSignature();
    s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false;
    updateSequencerState(); app._updateControls();
  };

  return {
    _onToggleSequencer, _onLoopToggle, _onSignatureModeToggle,
    _getUniqueAlgorithmMapping, generateAudioSignature, _generateSignatureWithConstraints,
    _onAudioSignature, _triggerSignatureFor, playAudioSignature, stopAudioSignature,
    _onSeqRecordStart, _onSeqStepCleared, _onSeqStepRecorded, _onSeqPlayStarted, _onSeqPlayStopped, _onSeqStepAdvance, _onSeqStepTimeChanged, _onSeqStepsChanged,
    _startSignatureSequencer, _stopSignatureSequencer, updateSequencerState,
    recordStep, playSequence, stopSequence
  };
}

// ToneLoader custom element
class ToneLoader extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.shadowRoot.innerHTML = ''; this._loaded = false; }
  connectedCallback() {
    if (this._loaded) return; this._loaded = true;
    const url = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
    import(url).then(mod => {
      if (!window.Tone && (mod?.default || mod?.Tone)) window.Tone = mod.default ?? mod.Tone;
      this.dispatchEvent(new CustomEvent('tone-ready', { bubbles: true, composed: true }));
    }).catch(err => console.error('Failed to load Tone.js:', err));
  }
}
customElements.define('tone-loader', ToneLoader);