(() => {
  // js/utils.js
  var TAU = Math.PI * 2;
  var HALF_PI = Math.PI * 0.5;
  var isArray = Array.isArray;
  var g = globalThis;
  var raf = g.requestAnimationFrame || g.webkitRequestAnimationFrame || g.mozRequestAnimationFrame || ((cb) => setTimeout(cb, 16));
  var cancelRaf = g.cancelAnimationFrame || g.webkitCancelAnimationFrame || g.mozCancelAnimationFrame || clearTimeout;
  var { sin, cos, abs, PI, pow, sqrt: SQRT, imul, min, max, floor, ceil, round } = Math;
  var createElement = (tag, props) => Object.assign(document.createElement(tag), props);

  // js/shapes.js
  var humKey = (app2) => app2?.humKey || "hum";
  var shapeList = (app2) => {
    const fromCanvas = app2?._canvas?.listShapes?.();
    const base = Array.isArray(fromCanvas) && fromCanvas.length ? fromCanvas : Array.isArray(app2?.shapes) ? app2.shapes : [];
    return base.filter((k) => k !== humKey(app2));
  };

  // js/engine.js
  function Engine(app2) {
    const A = Object.assign;
    const _eachChain = (f) => {
      const cs = app2.state.chains;
      for (const k in cs) f(cs[k], k);
    };
    const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const _timeNow = (T) => T?.now?.() ?? 0;
    const _setCanvas = (p) => {
      if (!app2._canvas || typeof app2._canvas !== "object") return;
      Object.assign(app2._canvas, p);
    };
    const _rng = (s) => {
      let a = 1831565813 ^ s.length;
      for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 2654435761);
      return () => (a = Math.imul(a ^ a >>> 15, 1 | a), (a >>> 16 & 65535) / 65536);
    };
    const _createAnalyser = (T) => {
      const n = T?.context?.createAnalyser?.();
      if (n) {
        n.fftSize = 2048;
        try {
          n.smoothingTimeConstant = 0.06;
        } catch {
        }
      }
      return n || null;
    };
    const _linToDb = (v) => v <= 0 ? -60 : Math.max(-60, Math.min(0, 20 * Math.log10(Math.min(1, Math.max(1e-4, v)))));
    const tryDo = (f) => {
      try {
        f?.();
      } catch {
      }
    };
    const tryAwait = async (f) => {
      try {
        await f?.();
      } catch {
      }
    };
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const FADE = isiOS ? 0.028 : 0.012;
    const SWITCH_FADE = isiOS ? 0.028 : 8e-3;
    const _clone = (obj) => JSON.parse(JSON.stringify(obj || {}));
    const _get = (o, p) => p.split(".").reduce((a, k) => a && a[k] !== void 0 ? a[k] : void 0, o);
    const _set = (o, p, v) => {
      const ks = p.split(".");
      let cur = o;
      for (let i = 0; i < ks.length - 1; i++) {
        const k = ks[i];
        if (typeof cur[k] !== "object" || !cur[k]) cur[k] = {};
        cur = cur[k];
      }
      cur[ks.at(-1)] = v;
      return o;
    };
    const _normalizePreset = (pr = {}) => {
      const env = pr.envelope || {};
      const hasOsc2 = !!pr.osc2;
      return {
        osc1: { type: pr.osc1?.[0] || "sine", note: pr.osc1?.[1] || "C3" },
        osc2: { enabled: hasOsc2, type: pr.osc2?.[0] || "sine", note: pr.osc2?.[1] || "E3" },
        filter: { freq: pr.filter ?? 800, Q: pr.filterQ ?? 0.8, type: "lowpass" },
        envelope: {
          attack: env.attack ?? 0.03,
          decay: env.decay ?? 0.2,
          sustain: env.sustain ?? 0.3,
          release: env.release ?? 0.2
        },
        lfo: { rate: pr.lfo?.[0] ?? 2, min: pr.lfo?.[1] ?? 100, max: pr.lfo?.[2] ?? 1200 },
        meta: { seed: pr.seed, colorSpeed: pr.colorSpeed, shapeDrift: pr.shapeDrift }
      };
    };
    function createShapeVoiceClass(T, patch) {
      const f1 = T.Frequency(patch.osc1.note).toFrequency();
      const f2 = patch.osc2?.enabled ? T.Frequency(patch.osc2.note).toFrequency() : null;
      const ratio = f2 && f1 ? f2 / f1 : 1;
      class ShapeVoice extends T.Monophonic {
        constructor(options = {}) {
          super(options);
          this.osc1 = new T.Oscillator({ type: patch.osc1.type }).start();
          this.osc2 = patch.osc2?.enabled ? new T.Oscillator({ type: patch.osc2.type }).start() : null;
          this.ampEnv = new T.AmplitudeEnvelope({
            attack: patch.envelope.attack,
            decay: patch.envelope.decay,
            sustain: patch.envelope.sustain,
            release: patch.envelope.release
          });
          this.amp = new T.Gain(0);
          this.filter = new T.Filter(patch.filter.freq, patch.filter.type || "lowpass");
          if (this.filter.Q) this.filter.Q.value = patch.filter.Q ?? 0.8;
          this.lfo = new T.LFO(patch.lfo.rate, patch.lfo.min, patch.lfo.max).start();
          this.lfo.connect(this.filter.frequency);
          if (this.osc2) this.lfo.connect(this.osc2.detune);
          this.osc1.connect(this.amp);
          this.osc2?.connect(this.amp);
          this.amp.chain(this.filter, this.output);
          this.ampEnv.connect(this.amp.gain);
          this._ratio = ratio;
        }
        // Monophonic interface
        triggerAttack(note, time, vel = 1) {
          const f = T.Frequency(note).toFrequency();
          this.osc1.frequency.setValueAtTime(f, time);
          if (this.osc2) this.osc2.frequency.setValueAtTime(f * this._ratio, time);
          this.ampEnv.triggerAttack(time, vel);
        }
        triggerRelease(note, time) {
          this.ampEnv.triggerRelease(time);
        }
        dispose() {
          super.dispose?.();
          this.lfo?.dispose?.();
          this.filter?.dispose?.();
          this.ampEnv?.dispose?.();
          this.amp?.dispose?.();
          this.osc1?.dispose?.();
          this.osc2?.dispose?.();
          return this;
        }
      }
      return ShapeVoice;
    }
    const _listeners = /* @__PURE__ */ new Set();
    const onPatchChange = (fn) => {
      _listeners.add(fn);
      return () => _listeners.delete(fn);
    };
    const _emitPatch = (shapeKey, patch) => {
      _listeners.forEach((fn) => {
        try {
          fn(shapeKey, _clone(patch));
        } catch {
        }
      });
    };
    const getPatch = (shapeKey = app2.state.current) => shapeKey ? _clone(app2.state.presets?.[shapeKey]) : null;
    const setParam = (path, value, shapeKey = app2.state.current) => {
      const s = app2.state;
      if (!shapeKey || !s.presets?.[shapeKey]) return;
      _set(s.presets[shapeKey], path, value);
      const ch = s.chains?.[shapeKey];
      const T = s.Tone;
      if (ch && T) {
        if (path === "osc1.type" && ch.osc1) ch.osc1.type = value;
        if (path === "osc2.enabled") {
          if (!value && ch.osc2) {
            try {
              ch.osc2.stop();
              ch.osc2.disconnect();
            } catch {
            }
            ch.osc2 = null;
          }
          if (value && !ch.osc2) {
            const p = s.presets[shapeKey];
            try {
              ch.osc2 = new T.Oscillator(p.osc2.note, p.osc2.type).start();
              ch.osc2.connect(ch.volume);
              try {
                ch.lfo?.connect(ch.osc2.detune);
              } catch {
              }
            } catch {
            }
          }
        }
        if (path === "osc2.type" && ch.osc2) ch.osc2.type = value;
        if (path === "filter.freq" && ch.filter?.frequency) ch.filter.frequency.value = value;
        if (path === "filter.Q" && ch.filter?.Q) ch.filter.Q.value = value;
        if (path === "lfo.rate" && ch.lfo?.frequency) ch.lfo.frequency.value = value;
        if (path === "lfo.min" || path === "lfo.max") {
          const p = s.presets[shapeKey];
          if (ch.filter?.frequency) ch.filter.frequency.value = p.filter.freq;
        }
      }
      if (shapeKey === s.current) _updateKeyboardSynthVoice(shapeKey);
      _emitPatch(shapeKey, s.presets[shapeKey]);
    };
    const _rampLinear = (p, t, s = FADE, T) => {
      if (!p || !T) return;
      const n = _timeNow(T);
      tryDo(() => p.cancelScheduledValues?.(n));
      const cur = p.value ?? 0;
      tryDo(() => p.setValueAtTime?.(cur, n));
      tryDo(() => p.linearRampToValueAtTime?.(t, n + Math.max(1e-3, s)));
    };
    const _silenceAllChains = async (f = FADE) => {
      const T = app2.state?.Tone;
      if (!T) return;
      _eachChain((ch) => ch?.out?.gain && _rampLinear(ch.out.gain, 0, f, T));
      await app2._sleep(Math.ceil((f + 2e-3) * 1e3));
    };
    const _disposeNode = (n) => {
      tryDo(() => n.stop?.());
      tryDo(() => n.dispose?.());
      tryDo(() => n.disconnect?.());
    };
    const _disposeChain = async (ch) => {
      const T = app2.state?.Tone;
      if (T && ch?.out?.gain) {
        _rampLinear(ch.out.gain, 0, FADE, T);
        await app2._sleep(Math.ceil((FADE + 2e-3) * 1e3));
      }
      for (const n of Object.values(ch || {})) _disposeNode(n);
    };
    const _updateKeyboardSynthVoice = (shapeKey) => {
      const { Tone: T, presets, keyboardSynth } = app2.state;
      if (!T || !keyboardSynth) return;
      const patch = presets[shapeKey];
      if (!patch) {
        keyboardSynth.set({
          voice0: { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 } },
          voice1: { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 } }
        });
        return;
      }
      const v0 = { oscillator: { type: patch.osc1.type }, envelope: { ...patch.envelope } };
      const v1 = patch.osc2.enabled ? { oscillator: { type: patch.osc2.type }, envelope: { ...patch.envelope } } : { volume: -Infinity };
      const vibAmt = patch.lfo.rate > 6 ? 0.1 : patch.lfo.rate > 2 ? 0.05 : 0;
      keyboardSynth.set({
        voice0: v0,
        voice1: v1,
        vibratoRate: patch.lfo.rate,
        vibratoAmount: vibAmt
      });
    };
    const deterministicPreset = (seed2, shape) => {
      const r = _rng(`${seed2}_${shape}`);
      const types = ["sine", "triangle", "square", "sawtooth"];
      const notes = ["C1", "C2", "E2", "G2", "A2", "C3", "E3", "G3", "B3", "D4", "F#4", "A4", "C5"];
      const m = r();
      const mode = m < 0.18 ? 0 : m < 0.56 ? 1 : m < 0.85 ? 2 : 3;
      const cnt = mode === 3 ? 2 + (r() > 0.7 ? 1 : 0) : 1 + (r() > 0.6 ? 1 : 0);
      const pick = (arr) => arr[r() * arr.length | 0];
      const oscs = Array.from({ length: cnt }, () => [pick(types), pick(notes)]);
      let env, lfoRate, lfoMin, lfoMax, filterBase;
      if (mode === 0) {
        lfoRate = 0.07 + r() * 0.3;
        lfoMin = 400 + r() * 400;
        lfoMax = 900 + r() * 600;
        filterBase = 700 + r() * 500;
        env = { attack: 5e-3 + r() * 0.03, decay: 0.04 + r() * 0.08, sustain: 0.1 + r() * 0.2, release: 0.03 + r() * 0.1 };
      } else if (mode === 1) {
        lfoRate = 0.25 + r() * 8;
        lfoMin = 120 + r() * 700;
        lfoMax = 1200 + r() * 1400;
        filterBase = 300 + r() * 2400;
        env = { attack: 0.03 + r() * 0.4, decay: 0.1 + r() * 0.7, sustain: 0.2 + r() * 0.5, release: 0.2 + r() * 3 };
      } else if (mode === 2) {
        lfoRate = 6 + r() * 20;
        lfoMin = 80 + r() * 250;
        lfoMax = 1500 + r() * 3500;
        filterBase = 300 + r() * 2400;
        env = { attack: 0.03 + r() * 0.4, decay: 0.1 + r() * 0.7, sustain: 0.2 + r() * 0.5, release: 0.2 + r() * 3 };
      } else {
        lfoRate = 24 + r() * 36;
        lfoMin = 80 + r() * 250;
        lfoMax = 1500 + r() * 3500;
        filterBase = 300 + r() * 2400;
        env = { attack: 2 + r() * 8, decay: 4 + r() * 20, sustain: 0.7 + r() * 0.2, release: 8 + r() * 24 };
      }
      return {
        osc1: oscs[0],
        osc2: oscs[1] || null,
        filter: filterBase,
        filterQ: 0.6 + r() * 0.7,
        lfo: [lfoRate, lfoMin, lfoMax],
        envelope: env,
        colorSpeed: 0.06 + r() * 0.22,
        shapeDrift: 6e-4 + r() * 32e-4,
        seed: seed2
      };
    };
    const loadPresets = (seed2) => {
      app2.state.presets = Object.fromEntries(
        shapeList(app2).map((k) => {
          const raw = deterministicPreset(seed2, k);
          return [k, _normalizePreset(raw)];
        })
      );
    };
    const bufferHumChain = async () => {
      const { Tone: T, chains: C } = app2.state;
      if (!T) return;
      const key = humKey(app2);
      if (C[key]) {
        await _disposeChain(C[key]);
        delete C[key];
      }
      try {
        const osc = new T.Oscillator("A0", "sine").start();
        const filter = new T.Filter(150, "lowpass");
        filter.Q.value = 0.5;
        const volume = new T.Volume(-25);
        const analyser = _createAnalyser(T);
        const out = new T.Gain(0).toDestination();
        osc.connect(volume);
        volume.connect(filter);
        filter.connect(out);
        analyser && filter.connect(analyser);
        C[key] = { osc, volume, filter, out, analyser };
      } catch (e) {
        console.error("Error buffering hum chain", e);
        delete app2.state.chains[key];
      }
    };
    const bufferShapeChain = async (shape) => {
      if (shape === humKey(app2)) return bufferHumChain();
      const { Tone: T, presets: P, chains: C } = app2.state;
      const patch = P[shape];
      if (!patch || !T) return;
      if (C[shape]) {
        await _disposeChain(C[shape]);
        delete C[shape];
      }
      try {
        const o1 = new T.Oscillator(patch.osc1.note, patch.osc1.type).start();
        const o2 = patch.osc2?.enabled ? new T.Oscillator(patch.osc2.note, patch.osc2.type).start() : null;
        const vol = new T.Volume(5);
        const fil = new T.Filter(patch.filter.freq, patch.filter.type || "lowpass");
        if (fil.Q) fil.Q.value = patch.filter.Q ?? 0.8;
        const lfo = new T.LFO(patch.lfo.rate, patch.lfo.min, patch.lfo.max).start();
        const an = _createAnalyser(T);
        const out = new T.Gain(0).toDestination();
        lfo.connect(fil.frequency);
        if (o2) lfo.connect(o2.detune);
        o1.connect(vol);
        o2?.connect(vol);
        vol.connect(fil);
        fil.connect(out);
        if (an) fil.connect(an);
        C[shape] = { osc1: o1, osc2: o2, volume: vol, filter: fil, lfo, out, analyser: an };
      } catch (e) {
        console.error("Error buffering chain for shape", shape, e);
        delete app2.state.chains[shape];
      }
    };
    const setActiveChain = (shape, { updateCanvasShape: u = true, setStateCurrent: s = u, syncCanvasPlayState: y = true } = {}) => {
      const { Tone: T, chains: C, current } = app2.state;
      const prev = C[current], next = C[shape];
      if (prev && prev !== next) _rampLinear(prev.out.gain, 0, SWITCH_FADE, T);
      if (next) _rampLinear(next.out.gain, 1, SWITCH_FADE, T);
      const patch = { isAudioStarted: true };
      next?.analyser && (patch.analyser = next.analyser);
      y && (patch.isPlaying = app2.state.isPlaying);
      _setCanvas(patch);
      if (u) shape === humKey(app2) ? _setCanvas({ shapeKey: humKey(app2), preset: null }) : _setCanvas({ shapeKey: shape, preset: app2.state.presets[shape] });
      if (s) app2.state.current = shape;
      _updateKeyboardSynthVoice(shape);
    };
    const disposeAllChains = () => {
      _eachChain(_disposeChain);
      app2.state.chains = {};
      app2.state.current = null;
      tryDo(() => app2.state.keyboardSynth?.dispose());
      app2.state.keyboardSynth = null;
    };
    const updateSequencerState = () => {
      app2.sig?.updateSequencerState?.();
    };
    const stopSequence = () => {
      app2.sig?.stopSequence?.();
    };
    const stopAudioSignature = () => {
      app2.sig?.stopAudioSignature?.();
    };
    const resetState = () => {
      disposeAllChains();
      app2.state.sequencePlaying && stopSequence();
      app2.state.audioSignaturePlaying && stopAudioSignature?.();
      const { seed: seed2, Tone: T, approvedSeeds } = app2.state;
      app2.state = app2.defaultState(seed2);
      app2.state.Tone = T;
      app2.state.approvedSeeds = approvedSeeds || [];
      app2.state.keyboardSynth = null;
      loadPresets(seed2);
      bufferHumChain();
      const list = shapeList(app2), r = _rng(seed2), first = list.length ? list[r() * list.length | 0] : humKey(app2);
      _setCanvas({ preset: app2.state.presets[first] ?? null, shapeKey: first, mode: "seed", isAudioStarted: false, isPlaying: false });
      app2.state.current = humKey(app2);
      app2._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(app2) });
      app2.state.isSequencerMode = false;
      app2._sequencerComponent.style.display = "none";
      app2._main.style.overflow = "hidden";
      app2.state.sequence = Array(8).fill(null);
      updateSequencerState?.();
    };
    const unlockAudioAndBufferInitial = async () => {
      const s = app2.state;
      if (s.initialBufferingStarted && !s.initialShapeBuffered) {
        app2._loader.textContent = "Still preparing initial synth, please wait...";
        return;
      }
      if (s.isPlaying) return stopAudioAndDraw();
      if (s.contextUnlocked) {
        if (!s.initialShapeBuffered) {
          app2._loader.textContent = "Audio context unlocked, but synth not ready. Click again.";
          return;
        }
        setActiveChain(humKey(app2));
        s.isPlaying = true;
        if (app2._canvas) app2._canvas.isPlaying = true;
        app2._updateControls({ isAudioStarted: true, isPlaying: true });
        if (!s._startupSigDone) {
          await tryAwait(() => app2._sleep(200));
          tryDo(() => app2._triggerSignatureFor?.(humKey(app2), { loop: s.isLoopEnabled }));
          setTimeout(() => tryDo(() => {
            app2.cleanupHotkeyTour?.();
            app2.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
          }), 60);
          s._startupSigDone = true;
        }
        app2._loader.textContent = "Audio resumed (hum).";
        return;
      }
      try {
        const T = s.Tone;
        if (!T) throw new Error("Tone.js not available");
        const ctx = T.getContext?.() || T.context;
        let ok = false;
        if (ctx?.resume) {
          await ctx.resume();
          ok = true;
        } else if (T.start) {
          await T.start();
          ok = true;
        }
        if (!ok) throw new Error("Could not resume AudioContext");
        s.contextUnlocked = true;
        s.initialBufferingStarted = true;
        if (!s.keyboardSynth) {
          s.keyboardSynth = new T.PolySynth(T.DuoSynth).toDestination();
          const currentVolumeDb = _linToDb(s.volume);
          if (s.keyboardSynth.volume) s.keyboardSynth.volume.value = currentVolumeDb;
        }
        await bufferHumChain();
        setActiveChain(humKey(app2));
        for (const sh of shapeList(app2)) {
          if (!s.contextUnlocked) break;
          await tryAwait(() => bufferShapeChain(sh));
          await _sleep(0);
        }
        s.initialShapeBuffered = true;
        s.isPlaying = true;
        if (app2._canvas) app2._canvas.isPlaying = true;
        app2._updateControls({ isAudioStarted: true, isPlaying: true });
        if (!s._startupSigDone) {
          await tryAwait(() => app2._sleep(200));
          tryDo(() => app2._triggerSignatureFor?.(humKey(app2), { loop: s.isLoopEnabled }));
          setTimeout(() => tryDo(() => {
            app2.cleanupHotkeyTour?.();
            app2.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
          }), 60);
          s._startupSigDone = true;
        }
      } catch (e) {
        console.error("Failed to unlock AudioContext:", e);
        s.contextUnlocked = false;
        s.initialBufferingStarted = false;
        s.initialShapeBuffered = false;
      }
    };
    const stopAudioAndDraw = () => {
      const s = app2.state;
      if (!s.isPlaying && !s.initialBufferingStarted) return;
      tryDo(() => app2.cleanupHotkeyTour?.());
      if (s.audioSignatureTimer) {
        tryDo(() => clearTimeout(s.audioSignatureTimer));
        s.audioSignatureTimer = null;
      }
      s.isPlaying = s.initialBufferingStarted = s.initialShapeBuffered = false;
      disposeAllChains();
      s.sequencePlaying && stopSequence?.();
      s.audioSignaturePlaying && stopAudioSignature?.();
      if (app2._canvas) {
        app2._canvas.isPlaying = false;
        app2._canvas.isAudioStarted = false;
      }
      resetState();
    };
    const _onStartRequest = () => unlockAudioAndBufferInitial();
    const _onMuteToggle = () => {
      const s = app2.state, T = s.Tone;
      if (!T?.Destination) return;
      const newMutedState = !s.isMuted;
      T.Destination.mute = newMutedState;
      s.isMuted = newMutedState;
      app2._updateControls();
      _setCanvas({ isPlaying: s.isPlaying && !s.isMuted });
      app2._loader.textContent = s.isMuted ? "Muted." : "Unmuted.";
    };
    const _onVolumeChange = (e) => {
      const v = e?.detail?.value;
      if (typeof v !== "number") return;
      const s = app2.state;
      s.volume = Math.min(1, Math.max(0, v));
      const T = s.Tone;
      const newVolumeDb = _linToDb(s.volume);
      T?.Destination?.volume && (T.Destination.volume.value = newVolumeDb);
      s.keyboardSynth?.volume && (s.keyboardSynth.volume.value = newVolumeDb);
      app2._updateControls({ volume: s.volume });
    };
    const _onShapeChange = (e) => {
      const k = e?.detail?.shapeKey;
      if (!k) return;
      const s = app2.state, HUM = humKey(app2);
      if (!s.audioSignaturePlaying && !s.signatureSequencerRunning) s._uiReturnShapeKey = k !== HUM ? k : s._uiReturnShapeKey;
      if (!s.contextUnlocked || !s.initialShapeBuffered) {
        k === HUM ? _setCanvas({ shapeKey: HUM, preset: null, mode: "seed" }) : _setCanvas({ shapeKey: k, preset: s.presets[k], mode: "seed" });
        app2._updateControls({ shapeKey: k });
        return;
      }
      setActiveChain(k);
      k !== HUM && _setCanvas({ shapeKey: k, preset: s.presets[k], mode: "live" });
      app2._canvas.isPlaying = !app2.state.Tone?.Destination?.mute;
      app2._updateControls({ shapeKey: k });
      s.current = k;
    };
    const playNote = (note, velocity = 1) => {
      const { Tone: T, keyboardSynth, isMuted } = app2.state;
      if (!keyboardSynth || !T || isMuted) return;
      keyboardSynth.triggerAttack(note, T.now(), velocity);
    };
    const stopNote = (note) => {
      const { Tone: T, keyboardSynth } = app2.state;
      if (!keyboardSynth || !T) return;
      keyboardSynth.triggerRelease(note, T.now());
    };
    const setInstrument = (shapeKey) => {
      if (!shapeKey || !app2.state.presets[shapeKey]) return;
      _onShapeChange({ detail: { shapeKey } });
    };
    const setInstrumentSilent = (shapeKey) => {
      if (!shapeKey) return;
      const s = app2.state;
      if (!s.presets || !s.presets[shapeKey]) return;
      s.current = shapeKey;
      _updateKeyboardSynthVoice(shapeKey);
      _emitPatch(shapeKey, s.presets[shapeKey]);
    };
    const getSynthState = () => ({
      currentShape: app2.state.current,
      isMuted: app2.state.isMuted,
      volume: app2.state.volume,
      isPlaying: app2.state.isPlaying,
      isReady: app2.state.contextUnlocked && app2.state.initialShapeBuffered,
      presets: Object.keys(app2.state.presets || {})
    });
    return {
      // Original functions
      createElement,
      _eachChain,
      _disposeChain,
      _rng,
      _setCanvas,
      _createAnalyser,
      _sleep,
      _timeNow,
      _rampLinear,
      _silenceAllChains,
      _linToDb,
      deterministicPreset,
      loadPresets,
      bufferHumChain,
      bufferShapeChain,
      setActiveChain,
      disposeAllChains,
      resetState,
      unlockAudioAndBufferInitial,
      stopAudioAndDraw,
      _onStartRequest,
      _onMuteToggle,
      _onShapeChange,
      _onVolumeChange,
      updateSequencerState,
      stopSequence,
      stopAudioSignature,
      // +++ NEW: Exposed functions for keyboard interaction +++
      // Keyboard / patch head
      playNote,
      stopNote,
      setInstrument,
      // keep original (auditions via chain)
      setInstrumentSilent,
      // NEW – no latch/audition
      getSynthState,
      getPatch,
      // NEW
      setParam,
      // NEW
      onPatchChange
      // NEW (subscribe to patch updates)
    };
  }
  var ToneLoader = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = "";
      this._loaded = false;
    }
    connectedCallback() {
      if (this._loaded) return;
      this._loaded = true;
      const url = "https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0";
      import(url).then((mod) => {
        if (!window.Tone && (mod?.default || mod?.Tone)) window.Tone = mod.default ?? mod.Tone;
        this.dispatchEvent(new CustomEvent("tone-ready", { bubbles: true, composed: true }));
      }).catch((err) => console.error("Failed to load Tone.js:", err));
    }
  };
  customElements.define("tone-loader", ToneLoader);

  // js/keyboard.js
  var KeyboardUI = class {
    constructor(containerId, engine2) {
      this.container = document.getElementById(containerId);
      this.engine = engine2;
      this.downKeys = /* @__PURE__ */ new Set();
      this.buildKeyboard();
      this.bindKeyboardEvents();
    }
    buildKeyboard() {
      const row = document.createElement("div");
      row.className = "kb-row";
      this.container.appendChild(row);
      const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      let oct = 1;
      let idx = 0;
      for (let i = 0; i < 88; i++) {
        const name = notes[idx];
        const fullName = `${name}${oct}`;
        const key = document.createElement("div");
        key.dataset.note = fullName;
        key.className = name.includes("#") ? "key black" : "key white";
        row.appendChild(key);
        idx++;
        if (idx >= notes.length) {
          idx = 0;
          oct++;
        }
      }
    }
    play(element) {
      if (!element || element.classList.contains("active")) return;
      this.engine.playNote(element.dataset.note);
      element.classList.add("active");
    }
    stop(element) {
      if (!element) return;
      this.engine.stopNote(element.dataset.note);
      element.classList.remove("active");
    }
    bindKeyboardEvents() {
      this.container.querySelectorAll(".key").forEach((key) => {
        key.addEventListener("mousedown", () => this.play(key));
        key.addEventListener("mouseup", () => this.stop(key));
        key.addEventListener("mouseleave", () => this.stop(key));
        key.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this.play(key);
        });
        key.addEventListener("touchend", (e) => {
          e.preventDefault();
          this.stop(key);
        });
      });
      const keyMap = {
        "a": "C4",
        "w": "C#4",
        "s": "D4",
        "e": "D#4",
        "d": "E4",
        "f": "F4",
        "t": "F#4",
        "g": "G4",
        "y": "G#4",
        "h": "A4",
        "u": "A#4",
        "j": "B4",
        "k": "C5",
        "o": "C#5",
        "l": "D5",
        "p": "D#5",
        ";": "E5"
      };
      window.addEventListener("keydown", (e) => {
        if (this.downKeys.has(e.key)) return;
        const note = keyMap[e.key];
        if (!note) return;
        const keyElement = this.container.querySelector(`[data-note="${note}"]`);
        if (!keyElement) return;
        this.downKeys.add(e.key);
        this.play(keyElement);
      });
      window.addEventListener("keyup", (e) => {
        const note = keyMap[e.key];
        if (!note) return;
        this.downKeys.delete(e.key);
        const keyElement = this.container.querySelector(`[data-note="${note}"]`);
        if (!keyElement) return;
        this.stop(keyElement);
      });
    }
  };

  // js/keyboard-page.js
  var seed = document.documentElement.dataset.seed || "aabbccdd";
  document.getElementById("seedText").textContent = seed;
  var app = {
    humKey: "hum",
    _canvas: {
      listShapes() {
        return [
          "circle",
          "square",
          "butterfly",
          "Bowditch",
          "spiro",
          "harmonograph",
          "rose",
          "hypocycloid",
          "epicycloid",
          "spiral",
          "star",
          "flower",
          "wave",
          "mandala",
          "infinity",
          "dna",
          "tornado"
        ];
      }
    },
    _loader: { textContent: "" },
    _sequencerComponent: { style: {} },
    _main: { style: {} },
    _updateControls() {
    },
    _sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    state: {},
    defaultState(seedStr) {
      return {
        seed: seedStr,
        Tone: window.Tone,
        chains: {},
        presets: {},
        current: null,
        isMuted: false,
        isPlaying: false,
        contextUnlocked: false,
        initialBufferingStarted: false,
        initialShapeBuffered: false,
        volume: 0.8,
        approvedSeeds: []
      };
    }
  };
  var engine = Engine(app);
  var startBtn = document.getElementById("startBtn");
  var statusEl = document.getElementById("status");
  var bankEl = document.getElementById("bank");
  var currentKey = null;
  var $ = (id) => document.getElementById(id);
  var linkPair = (range, num, getter, setter) => {
    const sync = (v) => {
      range.value = v;
      num.value = v;
    };
    range.addEventListener("input", (e) => setter(parseFloat(e.target.value)));
    num.addEventListener("change", (e) => setter(parseFloat(e.target.value)));
    return { set: (v) => sync(getter(v)) };
  };
  function loadHeadFromPatch(p) {
    if (!p) return;
    $("osc1_type").value = p.osc1.type;
    $("osc2_enabled").checked = !!p.osc2.enabled;
    $("osc2_type").value = p.osc2.type;
    $("osc2_type").disabled = !$("osc2_enabled").checked;
    $("filter_freq").value = $("filter_freq_num").value = p.filter.freq;
    $("filter_q").value = $("filter_q_num").value = p.filter.Q;
    $("env_a").value = $("env_a_num").value = p.envelope.attack;
    $("env_d").value = $("env_d_num").value = p.envelope.decay;
    $("env_s").value = $("env_s_num").value = p.envelope.sustain;
    $("env_r").value = $("env_r_num").value = p.envelope.release;
    $("lfo_rate").value = $("lfo_rate_num").value = p.lfo.rate;
    $("lfo_min").value = $("lfo_min_num").value = p.lfo.min;
    $("lfo_max").value = $("lfo_max_num").value = p.lfo.max;
  }
  function bindHead() {
    $("osc1_type").addEventListener("change", (e) => engine.setParam("osc1.type", e.target.value));
    $("osc2_enabled").addEventListener("change", (e) => {
      $("osc2_type").disabled = !e.target.checked;
      engine.setParam("osc2.enabled", e.target.checked);
    });
    $("osc2_type").addEventListener("change", (e) => engine.setParam("osc2.type", e.target.value));
    linkPair($("filter_freq"), $("filter_freq_num"), (v) => v, (v) => engine.setParam("filter.freq", v));
    linkPair($("filter_q"), $("filter_q_num"), (v) => v, (v) => engine.setParam("filter.Q", v));
    linkPair($("env_a"), $("env_a_num"), (v) => v, (v) => engine.setParam("envelope.attack", v));
    linkPair($("env_d"), $("env_d_num"), (v) => v, (v) => engine.setParam("envelope.decay", v));
    linkPair($("env_s"), $("env_s_num"), (v) => v, (v) => engine.setParam("envelope.sustain", v));
    linkPair($("env_r"), $("env_r_num"), (v) => v, (v) => engine.setParam("envelope.release", v));
    linkPair($("lfo_rate"), $("lfo_rate_num"), (v) => v, (v) => engine.setParam("lfo.rate", v));
    linkPair($("lfo_min"), $("lfo_min_num"), (v) => v, (v) => engine.setParam("lfo.min", v));
    linkPair($("lfo_max"), $("lfo_max_num"), (v) => v, (v) => engine.setParam("lfo.max", v));
  }
  engine.onPatchChange((shape, patch) => {
    if (shape === currentKey) loadHeadFromPatch(patch);
  });
  function renderBank() {
    bankEl.innerHTML = "";
    const keys = Object.keys(app.state.presets || {});
    keys.forEach((k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = k;
      btn.dataset.key = k;
      if (k === currentKey) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentKey = k;
        engine.setInstrumentSilent(k);
        [...bankEl.children].forEach((c) => c.classList.toggle("active", c.dataset.key === k));
        loadHeadFromPatch(engine.getPatch(k));
      });
      bankEl.appendChild(btn);
    });
  }
  async function init() {
    app.state = app.defaultState(seed);
    engine.loadPresets(seed);
    currentKey = Object.keys(app.state.presets)[0] || null;
    renderBank();
    startBtn.disabled = true;
    startBtn.textContent = "Starting...";
    try {
      await engine.unlockAudioAndBufferInitial(currentKey || app.humKey);
      statusEl.textContent = "Ready. Select a sound, then play.";
      startBtn.textContent = "Audio Active";
      if (currentKey) engine.setInstrumentSilent(currentKey);
      loadHeadFromPatch(engine.getPatch(currentKey));
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Unable to start audio. See console.";
      startBtn.disabled = false;
      startBtn.textContent = "Click to Start Audio";
    }
  }
  startBtn.addEventListener("click", () => {
    if (!window.Tone) return;
    init();
  }, { once: true });
  document.getElementById("toneLoader").addEventListener("tone-ready", () => {
    statusEl.textContent = 'Audio engine ready. Click "Start" to begin.';
    startBtn.disabled = false;
    startBtn.textContent = "Click to Start Audio";
  });
  new KeyboardUI("keyboard-container", engine);
  bindHead();
})();
