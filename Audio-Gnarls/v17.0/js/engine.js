// engine.js
// Public API preserved: export { Engine, Signatures }; registers <tone-loader>.
import { humKey, shapeList, shapeCount, allKeys } from './shapes.js';

export function Engine(app) {
  const _el = (t, o) => Object.assign(document.createElement(t), o);
  const _eachChain = f => { const c = app.state.chains; for (const k in c) f(c[k], k); };
  const _sleep = ms => new Promise(r => setTimeout(r, ms));
  const _timeNow = T => T?.now?.() ?? 0;
  const _setCanvas = p => Object.assign(app._canvas, p);
  const _rng = s => { let a = 0x6d2b79f5 ^ s.length; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 2654435761); return () => (a = Math.imul(a ^ (a >>> 15), 1 | a), ((a >>> 16) & 0xffff) / 0x10000); };
  const _createAnalyser = T => { const n = T?.context?.createAnalyser?.(); if (n) { n.fftSize = 2048; try { n.smoothingTimeConstant = .06; } catch {} } return n || null; };
  const _linToDb = v => v <= 0 ? -60 : Math.max(-60, Math.min(0, 20 * Math.log10(Math.min(1, Math.max(1e-4, v)))));

  // --- Platform-aware fades (iOS Safari benefits from longer ramps) ---
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const FADE = isiOS ? 0.028 : 0.012; // ~28ms on iOS, ~12ms elsewhere
  const SWITCH_FADE = isiOS ? 0.028 : 0.008;

  const _rampLinear = (p, t, s = FADE, T) => {
    if (!p || !T) return;
    const n = _timeNow(T);
    try {
      typeof p.cancelScheduledValues == 'function' && p.cancelScheduledValues(n);
      const cur = typeof p.value == 'number' ? p.value : p.value?.value;
      typeof p.setValueAtTime == 'function' && p.setValueAtTime(cur ?? 0, n);
      typeof p.linearRampToValueAtTime == 'function' && p.linearRampToValueAtTime(t, n + Math.max(.001, s));
    } catch {}
  };

  const _silenceAllChains = async (f = FADE) => {
    const T = app.state?.Tone; if (!T) return;
    const n = _timeNow(T);
    _eachChain(ch => {
      const g = ch?.out?.gain ?? ch?.volume?.volume;
      if (g?.linearRampToValueAtTime) { try { g.cancelScheduledValues?.(n); g.setValueAtTime?.(g.value, n); g.linearRampToValueAtTime(0, n + f); } catch {} }
      const w = ch?.reverb?.wet; if (w?.rampTo) { try { w.rampTo(0, f); } catch {} }
    });
    await app._sleep(Math.ceil((f + .002) * 1e3));
  };

  const _disposeChain = async ch => {
    const T = app.state?.Tone, f = FADE;
    try {
      if (T && ch) {
        const n = _timeNow(T), g = ch?.out?.gain ?? ch?.volume?.volume, w = ch?.reverb?.wet;
        if (g?.linearRampToValueAtTime && g?.setValueAtTime) { g.cancelScheduledValues?.(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0, n + f); }
        if (w?.rampTo) { try { w.rampTo(0, f); } catch {} }
        await app._sleep(Math.ceil((f + .002) * 1e3));
      }
    } catch {}
    for (const n of Object.values(ch || {})) { try { n.stop?.(); } catch {} try { n.dispose?.(); } catch {} try { n.disconnect?.(); } catch {} }
  };

  const deterministicPreset = (seed, shape) => {
    const r = _rng(`${seed}_${shape}`), types = ['sine','triangle','square','sawtooth'], notes = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
    const m = r(), mode = m < .18 ? 0 : m < .56 ? 1 : m < .85 ? 2 : 3, cnt = mode === 3 ? 2 + (r() > .7 ? 1 : 0) : 1 + (r() > .6 ? 1 : 0);
    const oscs = Array.from({ length: cnt }, () => [types[(r() * types.length) | 0], notes[(r() * notes.length) | 0]]);
    let lfoRate, lfoMin, lfoMax, filterBase, env;
    if (mode === 0) { lfoRate = .07 + r() * .3; lfoMin = 400 + r() * 400; lfoMax = 900 + r() * 600; filterBase = 700 + r() * 500; env = { attack: .005 + r() * .03, decay: .04 + r() * .08, sustain: .1 + r() * .2, release: .03 + r() * .1 }; }
    else if (mode === 1) { lfoRate = .25 + r() * 8; lfoMin = 120 + r() * 700; lfoMax = 1200 + r() * 1400; filterBase = 300 + r() * 2400; env = { attack: .03 + r() * .4, decay: .1 + r() * .7, sustain: .2 + r() * .5, release: .2 + r() * 3 }; }
    else if (mode === 2) { lfoRate = 6 + r() * 20; lfoMin = 80 + r() * 250; lfoMax = 1500 + r() * 3500; filterBase = 300 + r() * 2400; env = { attack: .03 + r() * .4, decay: .1 + r() * .7, sustain: .2 + r() * .5, release: .2 + r() * 3 }; }
    else { lfoRate = 24 + r() * 36; lfoMin = 80 + r() * 250; lfoMax = 1500 + r() * 3500; filterBase = 300 + r() * 2400; env = { attack: 2 + r() * 8, decay: 4 + r() * 20, sustain: .7 + r() * .2, release: 8 + r() * 24 }; }
    return {
      osc1: oscs[0], osc2: oscs[1] || null, filter: filterBase, filterQ: .6 + r() * .7,
      lfo: [lfoRate, lfoMin, lfoMax], envelope: env,
      reverb: { wet: mode === 3 ? .4 + r() * .5 : .1 + r() * .5, roomSize: mode === 3 ? .85 + r() * .12 : .6 + r() * .38 },
      colorSpeed: .06 + r() * .22, shapeDrift: .0006 + r() * .0032, seed
    };
  };

  const loadPresets = seed => { app.state.presets = Object.fromEntries(shapeList(app).map(k => [k, deterministicPreset(seed, k)])); };

  const bufferHumChain = async () => {
    const { Tone: T, chains: C } = app.state; if (!T) return;
    const key = humKey(app); if (C[key]) { await _disposeChain(C[key]); delete C[key]; }
    try {
      const osc = new T.Oscillator('A0', 'sine').start(), filter = new T.Filter(150, 'lowpass'); filter.Q.value = .5;
      const volume = new T.Volume(-25), reverb = new T.Freeverb().set({ wet: .3, roomSize: .9 }), out = new T.Gain(0), analyser = _createAnalyser(T);
      // Keep graph stable: connect once, gate with gains
      osc.connect(volume); volume.connect(filter); filter.connect(reverb); analyser && filter.connect(analyser); reverb.connect(out);
      C[key] = { osc, volume, filter, reverb, out, analyser };
    } catch (e) { console.error('Error buffering hum chain', e); delete app.state.chains[key]; }
  };

  const bufferShapeChain = async shape => {
    if (shape === humKey(app)) return bufferHumChain();
    const { Tone: T, presets: P, chains: C } = app.state, pr = P[shape]; if (!pr || !T) return;
    if (C[shape]) { await _disposeChain(C[shape]); delete C[shape]; }
    try {
      const o1 = new T.Oscillator(pr.osc1[1], pr.osc1[0]).start(), o2 = pr.osc2 ? new T.Oscillator(pr.osc2[1], pr.osc2[0]).start() : null;
      const vol = new T.Volume(5), fil = new T.Filter(pr.filter, 'lowpass'); fil.Q.value = pr.filterQ;
      const lfo = new T.LFO(...pr.lfo).start(), rev = new T.Freeverb().set({ wet: pr.reverb.wet, roomSize: pr.reverb.roomSize });
      const out = new T.Gain(0), an = _createAnalyser(T);
      // Stable graph: no disconnect/reconnect during playback
      lfo.connect(fil.frequency); o2 && lfo.connect(o2.detune);
      o1.connect(vol); o2?.connect(vol); vol.connect(fil); fil.connect(rev); an && fil.connect(an); rev.connect(out);
      C[shape] = { osc1: o1, osc2: o2, volume: vol, filter: fil, lfo, reverb: rev, out, analyser: an };
    } catch (e) { console.error('Error buffering chain for shape', shape, e); delete app.state.chains[shape]; }
  };

  const setActiveChain = (shape, { updateCanvasShape: u = true, setStateCurrent: s = u, syncCanvasPlayState: y = true } = {}) => {
    const { Tone: T, chains: C, current } = app.state;
    const d = SWITCH_FADE;
    const prev = current ? C[current] : null;
    try { if (current && current !== humKey(app)) applyVariant(current, null); } catch {}
    if (prev?.reverb?.wet?.rampTo) { try { prev.reverb.wet.rampTo(0, d); } catch {} }
    const nonce = (app.state._switchNonce = (app.state._switchNonce || 0) + 1);
    const doSwitch = () => {
      if (nonce !== app.state._switchNonce) return;
      _eachChain(ch => ch.reverb?.disconnect?.()); // keep graph quiet while we route destination
      const next = C[shape];
      next?.reverb?.toDestination?.();
      const patch = { isAudioStarted: true }; next?.analyser && (patch.analyser = next.analyser); y && (patch.isPlaying = app.state.isPlaying); _setCanvas(patch);
      if (u) shape === humKey(app) ? _setCanvas({ shapeKey: humKey(app), preset: null }) : _setCanvas({ shapeKey: shape, preset: app.state.presets[shape] });
      s && (app.state.current = shape);
      if (next?.reverb?.wet) {
        try {
          const t = next.reverb.wet.value ?? .3, n = T?.now?.() ?? 0;
          typeof next.reverb.wet.setValueAtTime == 'function' ? next.reverb.wet.setValueAtTime(0, n) : (next.reverb.wet.value = 0);
          next.reverb.wet.rampTo ? next.reverb.wet.rampTo(t, d) : (next.reverb.wet.value = t);
        } catch {}
      }
    };
    setTimeout(doSwitch, Math.max(1, (d * 1000) | 0));
  };

  const disposeAllChains = () => { _eachChain(_disposeChain); app.state.chains = {}; app.state.current = null; };

  const updateSequencerState = () => { app.sig?.updateSequencerState?.(); };
  const stopSequence = () => { app.sig?.stopSequence?.(); };
  const stopAudioSignature = () => { app.sig?.stopAudioSignature?.(); };

  const resetState = () => {
    disposeAllChains(); app.state.sequencePlaying && stopSequence(); app.state.audioSignaturePlaying && stopAudioSignature?.();
    const { seed, Tone: T } = app.state; app.state = app.defaultState(seed); app.state.Tone = T; loadPresets(seed); bufferHumChain();
    const list = shapeList(app), r = _rng(seed), first = list.length ? list[(r() * list.length) | 0] : humKey(app);
    _setCanvas({ preset: app.state.presets[first] ?? null, shapeKey: first, mode: 'seed', isAudioStarted: false, isPlaying: false });
    app.state.current = humKey(app);
    app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(app) });
    app.state.isSequencerMode = false; app._sequencerComponent.style.display = 'none'; app._main.style.overflow = 'hidden';
    app.state.sequence = Array(8).fill(null); updateSequencerState?.();
  };

  // --- Variant FX (seed-linked) ---
  const _ensureDelay = (ch, T) => {
    if (ch._delay) return ch._delay;
    try {
      const d = new T.FeedbackDelay(0.25, 0.4);
      try { ch.filter.disconnect?.(ch.reverb); } catch {}
      ch.filter.connect(d); d.connect(ch.reverb);
      ch._delay = d;
      return d;
    } catch { return null; }
  };

  const _resetVariant = (ch, T) => {
    if (!ch) return;
    if (ch._origRevWet == null) ch._origRevWet = ch?.reverb?.wet?.value ?? 0.3;
    try { ch.reverb?.wet?.rampTo?.(ch._origRevWet, .06); } catch {}
    if (ch._delay) {
      try {
        ch.filter.disconnect?.(ch._delay);
        ch._delay.disconnect?.(ch.reverb);
        ch.filter.connect?.(ch.reverb);
      } catch {}
      try { ch._delay.dispose?.(); } catch {}
      ch._delay = null;
    }
    if (typeof ch._origLfoFreq === 'number' && ch.lfo?.frequency?.value != null) {
      try { ch.lfo.frequency.rampTo(ch._origLfoFreq, .06); } catch {}
    }
  };

  const unlockAudioAndBufferInitial = async () => {
    const s = app.state;
    if (s.initialBufferingStarted && !s.initialShapeBuffered) { app._loader.textContent = 'Still preparing initial synth, please wait...'; return; }
    if (s.isPlaying) return stopAudioAndDraw();
    if (s.contextUnlocked) {
      if (s.initialShapeBuffered) { setActiveChain(humKey(app)); s.isPlaying = true; app._updateControls({ isAudioStarted: true, isPlaying: true }); app._loader.textContent = 'Audio resumed (hum).'; app._canvas.isPlaying = true; return; }
      app._loader.textContent = 'Audio context unlocked, but synth not ready. Click again.'; return;
    }
    app._loader.textContent = 'Unlocking AudioContext...';
    try {
      const T = s.Tone; if (!T) throw new Error('Tone.js not available');
      const ctx = T.getContext?.() || T.context; let ok = false;
      if (ctx?.resume) { await ctx.resume(); ok = true; } else if (T.start) { await T.start(); ok = true; }
      if (!ok) throw new Error('Could not resume AudioContext');
      s.contextUnlocked = true; s.initialBufferingStarted = true; app._loader.textContent = `Preparing ${app.humLabel} synth...`;
      await bufferHumChain(); setActiveChain(humKey(app)); s.initialShapeBuffered = true; s.isPlaying = true; s.contextUnlocked = true; app._canvas.isPlaying = true;
      app._updateControls({ isAudioStarted: true, isPlaying: true }); app._loader.textContent = 'Ready. Audio: ' + app.humLabel;
      for (const sh of shapeList(app)) { if (!s.contextUnlocked) break; try { await bufferShapeChain(sh); } catch (e) { console.error('Error buffering', sh, e); } await _sleep(0); }
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
      app._loader.textContent = 'Failed to unlock AudioContext.';
      s.contextUnlocked = false; s.initialBufferingStarted = false; s.initialShapeBuffered = false;
    }
  };

  const stopAudioAndDraw = () => {
    const s = app.state; if (!s.isPlaying && !s.initialBufferingStarted) return;
    s.isPlaying = s.initialBufferingStarted = s.initialShapeBuffered = false;
    disposeAllChains(); s.sequencePlaying && stopSequence?.(); s.audioSignaturePlaying && stopAudioSignature?.();
    app._canvas.isPlaying = false; app._canvas.isAudioStarted = false; resetState();
  };

  const _onStartRequest = () => unlockAudioAndBufferInitial();
  const _onMuteToggle = () => { const T = app.state.Tone; if (!T?.Destination) return; const m = !T.Destination.mute; T.Destination.mute = m; app._updateControls({ isMuted: m }); _setCanvas({ isPlaying: app.state.isPlaying && !m }); app._loader.textContent = m ? 'Muted.' : 'Unmuted.'; };
  const _onVolumeChange = e => { const v = e?.detail?.value; if (typeof v == 'number') { app.state.volume = Math.min(1, Math.max(0, v)); const T = app.state.Tone; T?.Destination?.volume && (T.Destination.volume.value = _linToDb(app.state.volume)); app._updateControls({ volume: app.state.volume }); } };

  const _onShapeChange = e => {
    const k = e?.detail?.shapeKey; if (!k) return;
    const s = app.state, HUM = humKey(app);
    if (!s.audioSignaturePlaying && !s.signatureSequencerRunning) s._uiReturnShapeKey = k !== HUM ? k : s._uiReturnShapeKey;
    if (!s.contextUnlocked || !s.initialShapeBuffered) { k === HUM ? _setCanvas({ shapeKey: HUM, preset: null, mode: 'seed' }) : _setCanvas({ shapeKey: k, preset: s.presets[k], mode: 'seed' }); app._updateControls({ shapeKey: k }); return; }
    setActiveChain(k); k !== HUM && _setCanvas({ shapeKey: k, preset: s.presets[k], mode: 'live' });
    app._canvas.isPlaying = !app.state.Tone?.Destination?.mute; app._updateControls({ shapeKey: k }); s.current = k;
  };

  return {
    _el,_eachChain,_disposeChain,_rng,_setCanvas,_createAnalyser,_sleep,_timeNow,_rampLinear,_silenceAllChains,_linToDb,
    deterministicPreset, loadPresets,
    bufferHumChain, bufferShapeChain, setActiveChain, disposeAllChains, resetState,
    unlockAudioAndBufferInitial, stopAudioAndDraw, _onStartRequest, _onMuteToggle, _onShapeChange, _onVolumeChange,
    updateSequencerState, stopSequence, stopAudioSignature
  };
}

export function Signatures(app) {
  const HUM = () => humKey(app), LIST = () => shapeList(app), COUNT = () => shapeCount(app), ALL = () => allKeys(app);
  const rInt = (r, a, b) => a + Math.floor(r() * (b - a + 1)), rVal = r => { const N = COUNT(); return rInt(r, 0, N); }, rNon = r => { const N = COUNT(); return N > 0 ? rInt(r, 1, N) : 0; };

  const _onToggleSequencer = () => {
    const s = app.state; s.isSequencerMode = !s.isSequencerMode;
    app._sequencerComponent && (app._sequencerComponent.style.display = s.isSequencerMode ? 'block' : 'none');
    if (!s.isSequencerMode) { s.isRecording = false; s.currentRecordSlot = -1; s.sequencePlaying && stopSequence(); s.signatureSequencerRunning && _stopSignatureSequencer(); } else updateSequencerState();
    app._updateControls({ sequencerVisible: s.isSequencerMode }); typeof app._fitLayout == 'function' && app._fitLayout();
  };

  const _onLoopToggle = () => { const s = app.state; s.isLoopEnabled = !s.isLoopEnabled; app._updateControls({ isLoopEnabled: s.isLoopEnabled }); s.audioSignaturePlaying && !s.isSequenceSignatureMode && (app._loader.textContent = s.isLoopEnabled ? 'Loop enabled.' : 'Loop disabled.'); };
  const _onSignatureModeToggle = () => {
    const s = app.state; s.isSequenceSignatureMode = !s.isSequenceSignatureMode; app._updateControls({ isSequenceSignatureMode: s.isSequenceSignatureMode });
    s.sequencePlaying && stopSequence(); s.audioSignaturePlaying && stopAudioSignature();
    app._loader.textContent = s.isSequenceSignatureMode ? 'Sequencer Signature Mode enabled. Press Play to run signatures per step.' : 'Sequencer Signature Mode disabled. Press Play for normal step timing.';
  };

  const _getUniqueAlgorithmMapping = seed => {
    const r = app._rng(`${seed}_unique_algo_mapping`), keys = ALL(), n = keys.length, base = [1,2,3,4,5,6,7,8,9,10], pool = [];
    while (pool.length < n) pool.push(...base); pool.length = n;
    for (let i = pool.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const m = {}; keys.forEach((k, i) => m[k] = pool[i]); return m;
  };

  const _generateSignatureWithConstraints = (seed, { steps = 32, paletteSize = 6, pRepeat = .35, pHum = .15, pSilence = .2, avoidBackAndForth = true } = {}) => {
    const r = app._rng(`${seed}_audio_signature_constrained`), N = COUNT(), seq = [], pal = Math.max(1, Math.min(N, paletteSize)); let last = null, prev = null;
    for (let i = 0; i < steps; i++) {
      if (r() < pSilence) { seq.push(null); continue; }
      const roll = r(); let next;
      if (roll < pHum) next = 0;
      else if (roll < pHum + pRepeat && prev !== null) next = prev;
      else { do { next = rInt(r, 1, pal); if (avoidBackAndForth && last !== null && last >= 1 && next >= 1 && seq.length >= 2 && seq[seq.length - 2] === next) next = null; } while (next === null); }
      seq.push(next); if (next !== null) { if (next >= 1) prev = next; last = next; }
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
      case 10: { let c = rVal(r); const a = []; for (let i = 0; i < S; i++) { if (i % 8 === 0 || r() > .6) c = rVal(r); a.push(c); } return a; }
      default: return _generateSignatureWithConstraints(seed);
    }
  };

  const _onAudioSignature = () => {
    const s = app.state;
    if (s.audioSignaturePlaying) { stopAudioSignature(); app._loader.textContent = 'Audio Signature stopped.'; app._updateControls({ isAudioSignaturePlaying: false }); return; }
    if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    const sel = s._uiReturnShapeKey || s.current || HUM(); _triggerSignatureFor(sel, { loop: s.isLoopEnabled }); app._updateControls({ isAudioSignaturePlaying: true });
  };

  const _triggerSignatureFor = (shapeKey, { loop = app.state.isLoopEnabled } = {}) => {
    const s = app.state; if (!s.contextUnlocked || !s.initialShapeBuffered) return;
    s.sequencePlaying && stopSequence(); s.audioSignaturePlaying && stopAudioSignature();
    s._uiReturnShapeKey = shapeKey || s._uiReturnShapeKey || HUM();
    const map = _getUniqueAlgorithmMapping(s.seed), alg = map[shapeKey] || 1, seq = generateAudioSignature(s.seed, alg);
    playAudioSignature(seq, alg, { loop }); app._loader.textContent = loop ? `Playing ${shapeKey} Audio Signature (Loop).` : `Playing ${shapeKey} Audio Signature...`;
  };

  const playAudioSignature = (sequence, alg = 1, { loop = false, onComplete = null } = {}) => {
    const s = app.state; s.audioSignaturePlaying && stopAudioSignature();
    const cur = (typeof s.current === 'string' && s.current) ? s.current : null;
    s._uiReturnShapeKey = cur || s._uiReturnShapeKey || HUM(); s.audioSignaturePlaying = true; s.audioSignatureStepIndex = 0; s.audioSignatureOnComplete = onComplete;
    app._updateControls({ isAudioSignaturePlaying: true });
    const stepTime = (alg === 3 || alg === 7) ? 100 : alg === 5 ? 150 : alg === 10 ? 200 : 125;

    const tick = () => {
      if (!s.audioSignaturePlaying) return;
      const i = s.audioSignatureStepIndex, val = sequence[i];
      if (val !== null) {
        const sk = val === 0 ? HUM() : LIST()[val - 1];
        if (sk) { app._updateControls({ shapeKey: sk }); app._onShapeChange({ detail: { shapeKey: sk } }); }
      }
      s.audioSignatureStepIndex++;
      if (s.audioSignatureStepIndex >= sequence.length) {
        const finishOnce = () => { s.audioSignaturePlaying = false; s.audioSignatureTimer = null; app._updateControls({ isAudioSignaturePlaying: false }); const cb = s.audioSignatureOnComplete; s.audioSignatureOnComplete = null; typeof cb == 'function' ? cb() : (app._loader.textContent = 'Audio Signature complete.'); };
        if (loop) { s.audioSignatureStepIndex = 0; s.audioSignatureTimer = setTimeout(tick, stepTime); }
        else {
          const ret = s._uiReturnShapeKey || HUM();
          try { app.setActiveChain(HUM(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
          app._canvas && (app._canvas.isPlaying = false);
          ret === HUM() ? app._setCanvas({ shapeKey: HUM(), preset: null, mode: 'seed' }) : app._setCanvas({ shapeKey: ret, preset: s.presets[ret], mode: 'live' });
          s.current = ret; app._updateControls({ shapeKey: ret }); s.audioSignatureTimer = setTimeout(finishOnce, stepTime);
        }
        return;
      }
      s.audioSignatureTimer = setTimeout(tick, stepTime);
    };
    tick();
  };

  const applyVariant = (shape, variant) => {
    const s = app.state, T = s.Tone; if (!T) return;
    if (!shape || shape === humKey(app)) return;

    const ch = s.chains?.[shape];
    if (!ch) return;

    const ensureDelay = () => {
      if (ch._delay) return ch._delay;
      try {
        const d = new T.FeedbackDelay(0.25, 0.4);
        try { ch.filter.disconnect?.(ch.reverb); } catch {}
        ch.filter.connect(d); d.connect(ch.reverb);
        ch._delay = d;
        return d;
      } catch { return null; }
    };

    const resetVariant = () => {
      if (!ch) return;
      if (ch._origRevWet == null) ch._origRevWet = ch?.reverb?.wet?.value ?? 0.3;
      try { ch.reverb?.wet?.rampTo?.(ch._origRevWet, .06); } catch {}
      if (ch._delay) {
        try { ch.filter.disconnect?.(ch._delay); ch._delay.disconnect?.(ch.reverb); ch.filter.connect?.(ch.reverb); } catch {}
        try { ch._delay.dispose?.(); } catch {}
        ch._delay = null;
      }
      if (typeof ch._origLfoFreq === 'number' && ch.lfo?.frequency?.value != null) {
        try { ch.lfo.frequency.rampTo(ch._origLfoFreq, .06); } catch {}
      }
    };

    if (ch._origRevWet == null) ch._origRevWet = ch?.reverb?.wet?.value ?? .3;
    if (ch.lfo && ch.lfo.frequency && ch._origLfoFreq == null) ch._origLfoFreq = ch.lfo.frequency.value ?? 1;

    if (!variant) { resetVariant(); return; }

    const r = app._rng(`${s.seed}_${shape}_fx_${variant}`);
    resetVariant();

    if (variant === 'reverb' || variant === 'both') {
      const target = Math.min(0.95, Math.max(0.35, ch._origRevWet + 0.25 + r()*0.35));
      try { ch.reverb?.wet?.rampTo?.(target, .08); } catch {}
    }
    if (variant === 'delay' || variant === 'both') {
      const d = ensureDelay();
      if (d) {
        const dt = 0.15 + r()*0.35;  // 150–500ms
        const fb = 0.25 + r()*0.45;  // 0.25–0.7
        const wet = 0.18 + r()*0.2;  // 0.18–0.38
        try {
          d.delayTime?.rampTo?.(dt, .06);
          d.feedback?.linearRampToValueAtTime?.(fb, (T?.now?.() ?? 0)+.06);
          d.wet?.rampTo?.(wet, .06);
        } catch {}
      }
    }
    if (ch.lfo?.frequency) {
      const mult = (variant==='delay') ? 0.85 + r()*0.3 : (variant==='reverb' ? 0.75 + r()*0.2 : 0.65 + r()*0.4);
      const tgt = Math.max(0.01, (ch._origLfoFreq||1) * mult);
      try { ch.lfo.frequency.rampTo(tgt, .1); } catch {}
    }
  };

  const stopAudioSignature = () => {
    const s = app.state; s.audioSignatureTimer && (clearTimeout(s.audioSignatureTimer), s.audioSignatureTimer = null);
    s.audioSignaturePlaying = false; s.audioSignatureStepIndex = 0; app._updateControls({ isAudioSignaturePlaying: false });
    const ret = s._uiReturnShapeKey || HUM();
    try { app.setActiveChain(HUM(), { updateCanvasShape: false, setStateCurrent: false }); } catch {}
    app._canvas && (app._canvas.isPlaying = false);
    ret === HUM() ? app._setCanvas({ shapeKey: HUM(), preset: null, mode: 'seed' }) : app._setCanvas({ shapeKey: ret, preset: s.presets[ret], mode: 'live' });
    s.current = ret; app._updateControls({ shapeKey: ret }); s.audioSignatureOnComplete = null;
  };

  const _onSeqRecordStart = e => { const i = e?.detail?.slotIndex ?? -1; app.state.isRecording = true; app.state.currentRecordSlot = i; app._updateControls(); };
  const _onSeqStepCleared = e => {
    const i = e?.detail?.slotIndex; if (typeof i !== 'number') return;
    const s = app.state;
    s.sequence[i] = null;
    if (s.isRecording && s.currentRecordSlot === i) { s.currentRecordSlot = (i + 1) % 8; s.currentRecordSlot === 0 && (s.isRecording = false); }
  };
  const _onSeqStepRecorded = e => { const d = e?.detail ?? {}; typeof d.slotIndex == 'number' && (app.state.sequence[d.slotIndex] = d.value); typeof d.nextSlot == 'number' && (app.state.currentRecordSlot = d.nextSlot); typeof d.isRecording == 'boolean' && (app.state.isRecording = d.isRecording); };
  const _onSeqPlayStarted = e => {
    const t = e?.detail?.stepTime, s = app.state; s.sequencePlaying = true; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; s.isSequencerMode = true; typeof t == 'number' && (s.stepTime = t); app._updateControls(); s.isSequenceSignatureMode && (app._sequencerComponent?.stopSequence(), _startSignatureSequencer());
  };
  const _onSeqPlayStopped = () => {
    const s = app.state; s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; s.isSequencerMode = false; s.signatureSequencerRunning && _stopSignatureSequencer();
    if (!s.isLatchOn) { try { const h = HUM(); app._updateControls({ shapeKey: h }); app._onShapeChange({ detail: { shapeKey: h } }); } catch {} }
    app._updateControls();
  };
  const _onSeqStepAdvance = e => {
    if (app.state.isSequenceSignatureMode) return;
    const d = e?.detail || {}, s = app.state;
    const i = typeof d.stepIndex == 'number' ? d.stepIndex : typeof d.index == 'number' ? d.index : s.sequenceStepIndex, v = d.value;
    if (s.sequencePlaying) {
      if (i === 0) {
        if (s._seqFirstCycleStarted) { if (!s.isLoopEnabled) { stopSequence(); return; } }
        else s._seqFirstCycleStarted = true;
      }
    }
    s.sequenceStepIndex = i;
    if (v == null || v === 0) { if (!s.isLatchOn) { const h = HUM(); app._updateControls({ shapeKey: h }); app._onShapeChange({ detail: { shapeKey: h } }); } return; }
    if (v >= 1 && v <= COUNT()) { const sk = LIST()[v - 1]; app._updateControls({ shapeKey: sk }); app._onShapeChange({ detail: { shapeKey: sk } }); }
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
    stopAudioSignature(); const map = _getUniqueAlgorithmMapping(s.seed);
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
        await new Promise(res => { if (!s.signatureSequencerRunning) { res(); return; } playAudioSignature(seq, alg, { loop: false, onComplete: () => res() }); });
        if (!s.signatureSequencerRunning) return; await app._sleep(Math.max(30, s.stepTime));
      }
    };
    await pass(); if (!s.signatureSequencerRunning) return;
    if (s.isLoopEnabled && s.sequencePlaying) { while (s.signatureSequencerRunning && s.sequencePlaying) await pass(); }
    _stopSignatureSequencer(); app._sequencerComponent?.stopSequence?.();
  };

  const _stopSignatureSequencer = () => {
    const s = app.state; s.signatureSequencerRunning = false; stopAudioSignature(); s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; updateSequencerState(); s._uiReturnShapeKey ? app._updateControls({ shapeKey: s._uiReturnShapeKey }) : app._updateControls();
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
    const s = app.state; s.signatureSequencerRunning && _stopSignatureSequencer(); s.audioSignaturePlaying && stopAudioSignature();
    s.sequencePlaying = false; s.sequenceStepIndex = 0; s._seqFirstCycleStarted = false; updateSequencerState(); app._updateControls();
  };

  return {
    _onToggleSequencer, _onLoopToggle, _onSignatureModeToggle,
    _getUniqueAlgorithmMapping, generateAudioSignature, _generateSignatureWithConstraints,
    _onAudioSignature, _triggerSignatureFor, playAudioSignature, stopAudioSignature, applyVariant,
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

// 