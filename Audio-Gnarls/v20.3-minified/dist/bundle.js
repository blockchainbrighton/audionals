(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // js/osc-hotkeys.js
  var OscHotkeys = class extends HTMLElement {
    static get observedAttributes() {
      return ["disabled"];
    }
    constructor() {
      super(), this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:none}</style>", this._enabled = true, this._config = { humKey: "hum", shapes: [] }, this._downKeys = /* @__PURE__ */ new Set(), this._onKeyDown = this._onKeyDown.bind(this), this._onKeyUp = this._onKeyUp.bind(this), this._onBlur = this._onBlur.bind(this), this._onVisibility = this._onVisibility.bind(this), this._onPageHide = this._onPageHide.bind(this), this._listeners = [];
    }
    connectedCallback() {
      this._enabled && this._attach();
    }
    disconnectedCallback() {
      this._detach();
    }
    attributeChangedCallback(e) {
      if ("disabled" !== e) return;
      const t = !this.hasAttribute("disabled");
      t && !this._enabled ? (this._enabled = true, this._attach()) : !t && this._enabled && (this._enabled = false, this._detach());
    }
    setConfig({ humKey: e, shapes: t } = {}) {
      e && (this._config.humKey = e), Array.isArray(t) && (this._config.shapes = t);
    }
    simulatePressKey(e) {
      this._handlePress(e);
    }
    simulateReleaseKey(e) {
      this._handleRelease(e);
    }
    _addL(e, t, s, i) {
      e.addEventListener(t, s, i), this._listeners.push({ target: e, type: t, fn: s, opts: i });
    }
    _attach() {
      const e = { capture: false, passive: false }, t = { capture: false, passive: true };
      this._addL(window, "keydown", this._onKeyDown, e), this._addL(window, "keyup", this._onKeyUp, e), this._addL(window, "blur", this._onBlur, t), this._addL(document, "visibilitychange", this._onVisibility, t), this._addL(window, "pagehide", this._onPageHide, t);
    }
    _detach() {
      for (const { target: e, type: t, fn: s, opts: i } of this._listeners) e.removeEventListener(t, s, i?.capture ?? false);
      this._listeners.length = 0, this._downKeys.size && this._releaseAll();
    }
    _onKeyDown(e) {
      const t = (e.composedPath?.()[0] || e.target).tagName || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t)) return;
      const s = e.key, i = s?.toUpperCase?.() || "", h = (t2, s2) => {
        this._emit(t2, s2), e.preventDefault();
      }, n = { O: "hk-toggle-power", M: "hk-toggle-mute", C: "hk-toggle-controls", Q: "hk-toggle-sequencer", P: "hk-toggle-seq-play" };
      if (n[i]) return h(n[i]);
      if ("L" === s && e.shiftKey) return h("hk-toggle-latch");
      if ("l" === s && !e.shiftKey) return h("hk-toggle-loop");
      if ("S" === s && e.shiftKey) return h("hk-toggle-signature");
      if ("s" === s && !e.shiftKey) return h("hk-audio-signature");
      if ("R" === i && e.shiftKey) return h("fr-play");
      if ("R" === i && !e.shiftKey) return h("fr-toggle");
      if ("ArrowUp" === s || "ArrowDown" === s) return h("hk-shape-step", { direction: "ArrowDown" === s ? 1 : -1 });
      if (this._downKeys.has(s)) return e.preventDefault();
      this._downKeys.add(s);
      const o = this._mapKey(s);
      o && h("hk-press", o);
    }
    _onKeyUp(e) {
      const t = e.key;
      if (!this._downKeys.has(t)) return;
      this._downKeys.delete(t);
      const s = this._mapKey(t);
      s && this._emit("hk-release", s);
    }
    _onBlur() {
      this._releaseAll();
    }
    _onVisibility() {
      "hidden" === document.visibilityState && this._releaseAll();
    }
    _onPageHide() {
      this._releaseAll();
    }
    _releaseAll() {
      for (const e of this._downKeys) {
        const t = this._mapKey(e);
        t && this._emit("hk-release", t);
      }
      this._downKeys.clear();
    }
    _handlePress(e) {
      if (!this._downKeys.has(e)) {
        this._downKeys.add(e);
        const t = this._mapKey(e);
        t && this._emit("hk-press", t);
      }
    }
    _handleRelease(e) {
      if (this._downKeys.delete(e)) {
        const t = this._mapKey(e);
        t && this._emit("hk-release", t);
      }
    }
    _mapKey(e) {
      if ("0" === e) return { key: e, idx: -1, shapeKey: this._config.humKey };
      const t = (e?.charCodeAt?.(0) ?? 0) - 49;
      return t >= 0 && t < this._config.shapes.length ? { key: e, idx: t, shapeKey: this._config.shapes[t] } : null;
    }
    _emit(e, t) {
      this.dispatchEvent(new CustomEvent(e, { detail: t, bubbles: true, composed: true }));
    }
  };
  customElements.define("osc-hotkeys", OscHotkeys);

  // js/worklet/aw-bridge.js
  var ensureModule = async (e) => {
    if (!e.audioWorklet) throw new Error("AudioWorklet not supported");
    return ensureModule._added || (ensureModule._added = e.audioWorklet.addModule("./js/worklet/dsp-processor.js")), ensureModule._added;
  };
  var noteToHz = (e, t) => {
    if ("number" == typeof t) return t;
    try {
      return e.Frequency(t).toFrequency();
    } catch {
      return 440;
    }
  };
  var AWOscillator = class {
    constructor(e = 440, t = "sine") {
      const o = window.Tone, n = o?.getContext?.()?.rawContext || o?.context?._context || o?.context?._nativeAudioContext || o?.context?.rawContext || o?.context || new (window.AudioContext || window.webkitAudioContext)();
      this._ctx = n, this._type = t || "sine", this._frequency = noteToHz(o, e), this._node = null, this._started = false, this._ready = ensureModule(n).then((() => {
        this._node = new AudioWorkletNode(n, "dsp-processor", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], parameterData: { frequency: this._frequency } }), this._node.port.postMessage({ type: this._type, detune: 0, gain: 1, seed: 123456 });
      })), this.frequency = { get value() {
        return this._owner._frequency;
      }, set value(e2) {
        const t2 = "number" == typeof e2 ? e2 : noteToHz(window.Tone, e2);
        if (this._owner._frequency = t2, this._owner._node) {
          const e3 = this._owner._node.parameters.get("frequency");
          e3 && e3.setValueAtTime(t2, this._owner._ctx.currentTime);
        }
      } }, this.frequency._owner = this, this.type = this._type;
    }
    start() {
      return this._started = true, this;
    }
    stop() {
      return this;
    }
    set(e) {
      return e && this._node && (this._type = e, this._node.port.postMessage({ type: e })), this;
    }
    connect(e) {
      return this._ready.then((() => {
        const t = this._node, o = e;
        return t.connect(o), e;
      }));
    }
    disconnect() {
      if (this._node) try {
        this._node.disconnect();
      } catch {
      }
      return this;
    }
    get context() {
      return this._ctx;
    }
  };
  var patchTone = () => {
    const e = window, t = e.Tone;
    if (!t || !("Oscillator" in t)) return false;
    const o = t?.getContext?.()?.rawContext || t?.context?._context || t?.context?._nativeAudioContext || t?.context?.rawContext || t?.context || null;
    if (!o?.audioWorklet) return console.info("[AW Bridge] AudioWorklet not supported; keeping original Tone.Oscillator."), false;
    try {
      return e.Tone = new Proxy(t, { get: (e2, t2, o2) => "Oscillator" === t2 ? AWOscillator : Reflect.get(e2, t2, o2) }), e.Tone.__OrigOscillator = t.Oscillator, console.info("[AW Bridge] Patched Tone via Proxy -> Oscillator routed to AudioWorklet"), true;
    } catch (o2) {
      console.warn("[AW Bridge] Failed to install Proxy; falling back to shadow object", o2);
      try {
        const o3 = Object.create(t);
        return Object.defineProperty(o3, "Oscillator", { configurable: true, enumerable: true, get: () => AWOscillator }), o3.__OrigOscillator = t.Oscillator, e.Tone = o3, console.info("[AW Bridge] Patched Tone via shadow object -> Oscillator routed to AudioWorklet"), true;
      } catch (e2) {
        return console.warn("[AW Bridge] Failed to patch Tone.", e2), false;
      }
    }
  };
  window.Tone ? patchTone() : window.addEventListener("tone-ready", (() => patchTone()), { once: true });

  // js/utils.js
  function clamp01(t) {
    return Number.isFinite(t) ? t < 0 ? 0 : t > 1 ? 1 : t : 0;
  }
  function pct(t) {
    return Math.round(100 * clamp01(t));
  }
  var TAU = 2 * Math.PI;
  var HALF_PI = 0.5 * Math.PI;
  function on(t, e, n, o) {
    t?.addEventListener?.(e, n, o);
  }
  function off(t, e, n, o) {
    t?.removeEventListener?.(e, n, o);
  }
  function addEvents(t, e) {
    for (let n = 0; n < (e?.length || 0); n++) on(t, e[n][0], e[n][1], e[n][2]);
  }
  function removeEvents(t, e) {
    for (let n = 0; n < (e?.length || 0); n++) off(t, e[n][0], e[n][1], e[n][2]);
  }
  function setText(t, e) {
    t && t.textContent !== e && (t.textContent = e);
  }
  function setPressed(t, e) {
    const n = String(!!e);
    t?.getAttribute?.("aria-pressed") !== n && t?.setAttribute?.("aria-pressed", n);
  }
  function toggleClass(t, e, n) {
    t?.classList?.toggle?.(e, !!n);
  }
  function byId(t, e) {
    return t?.getElementById?.(e) ?? null;
  }
  function setDisabledAll(t, e) {
    const n = !!e;
    for (const e2 of t || []) e2 && e2.disabled !== n && (e2.disabled = n);
  }
  var isBool = (t) => "boolean" == typeof t;
  var isNum = (t) => "number" == typeof t && !Number.isNaN(t);
  var isArray = Array.isArray;
  var g = globalThis;
  var raf = g.requestAnimationFrame || g.webkitRequestAnimationFrame || g.mozRequestAnimationFrame || ((t) => setTimeout(t, 16));
  var cancelRaf = g.cancelAnimationFrame || g.webkitCancelAnimationFrame || g.mozCancelAnimationFrame || clearTimeout;
  var { sin, cos, abs, PI, pow, sqrt: SQRT, imul, min, max, floor, ceil, round } = Math;
  var SQRT2 = Math.SQRT2;
  var createElement = (t, e) => Object.assign(document.createElement(t), e);
  var ready = (t) => "loading" !== document.readyState ? t() : document.addEventListener("DOMContentLoaded", t);
  function waitFor(t, e = 6e3) {
    return new Promise(((n) => {
      const o = performance.now(), r = () => {
        t() ? n(true) : performance.now() - o > e ? n(false) : requestAnimationFrame(r);
      };
      r();
    }));
  }
  var theta = (t, e, n = 0) => t / e * TAU + n;
  var norm = (t) => 0.5 * (t + 1);

  // js/shapes.js
  var humKey = (e) => e?.humKey || "hum";
  var shapeList = (e) => {
    const s = e?._canvas?.listShapes?.();
    return (Array.isArray(s) && s.length ? s : Array.isArray(e?.shapes) ? e.shapes : []).filter(((s2) => s2 !== humKey(e)));
  };
  var shapeCount = (e) => shapeList(e).length;
  var allKeys = (e) => [humKey(e), ...shapeList(e)];

  // js/engine.js
  function Engine(e) {
    const t = Object.assign, n = (t2) => {
      const n2 = e.state.chains;
      for (const e2 in n2) t2(n2[e2], e2);
    }, a = (e2) => new Promise(((t2) => setTimeout(t2, e2))), s = (e2) => e2?.now?.() ?? 0, o = (n2) => t(e._canvas, n2), i = (e2) => {
      let t2 = 1831565813 ^ e2.length;
      for (let n2 = 0; n2 < e2.length; n2++) t2 = Math.imul(t2 ^ e2.charCodeAt(n2), 2654435761);
      return () => (t2 = Math.imul(t2 ^ t2 >>> 15, 1 | t2), (t2 >>> 16 & 65535) / 65536);
    }, r = (e2) => {
      const t2 = e2?.context?.createAnalyser?.();
      if (t2) {
        t2.fftSize = 2048;
        try {
          t2.smoothingTimeConstant = 0.06;
        } catch {
        }
      }
      return t2 || null;
    }, u = (e2) => e2 <= 0 ? -60 : Math.max(-60, Math.min(0, 20 * Math.log10(Math.min(1, Math.max(1e-4, e2))))), c = (e2) => {
      try {
        e2?.();
      } catch {
      }
    }, l = async (e2) => {
      try {
        await e2?.();
      } catch {
      }
    }, d = /iPad|iPhone|iPod/.test(navigator.userAgent), p = d ? 0.028 : 0.012, g2 = d ? 0.028 : 8e-3, S = (e2, t2, n2 = p, a2) => {
      if (!e2 || !a2) return;
      const o2 = s(a2);
      c((() => e2.cancelScheduledValues?.(o2)));
      const i2 = e2.value ?? 0;
      c((() => e2.setValueAtTime?.(i2, o2))), c((() => e2.linearRampToValueAtTime?.(t2, o2 + Math.max(1e-3, n2))));
    }, h = (e2) => {
      c((() => e2.stop?.())), c((() => e2.dispose?.())), c((() => e2.disconnect?.()));
    }, y = async (t2) => {
      const n2 = e.state?.Tone;
      n2 && t2?.out?.gain && (S(t2.out.gain, 0, p, n2), await e._sleep(Math.ceil(1e3 * (p + 2e-3))));
      for (const e2 of Object.values(t2 || {})) h(e2);
    }, _ = (e2, t2) => {
      const n2 = i(`${e2}_${t2}`), a2 = ["sine", "triangle", "square", "sawtooth"], s2 = ["C1", "C2", "E2", "G2", "A2", "C3", "E3", "G3", "B3", "D4", "F#4", "A4", "C5"], o2 = n2(), r2 = o2 < 0.18 ? 0 : o2 < 0.56 ? 1 : o2 < 0.85 ? 2 : 3, u2 = 3 === r2 ? 2 + (n2() > 0.7 ? 1 : 0) : 1 + (n2() > 0.6 ? 1 : 0), c2 = (e3) => e3[n2() * e3.length | 0], l2 = Array.from({ length: u2 }, (() => [c2(a2), c2(s2)]));
      let d2, p2, g3, S2, h2;
      return 0 === r2 ? (p2 = 0.07 + 0.3 * n2(), g3 = 400 + 400 * n2(), S2 = 900 + 600 * n2(), h2 = 700 + 500 * n2(), d2 = { attack: 5e-3 + 0.03 * n2(), decay: 0.04 + 0.08 * n2(), sustain: 0.1 + 0.2 * n2(), release: 0.03 + 0.1 * n2() }) : 1 === r2 ? (p2 = 0.25 + 8 * n2(), g3 = 120 + 700 * n2(), S2 = 1200 + 1400 * n2(), h2 = 300 + 2400 * n2(), d2 = { attack: 0.03 + 0.4 * n2(), decay: 0.1 + 0.7 * n2(), sustain: 0.2 + 0.5 * n2(), release: 0.2 + 3 * n2() }) : 2 === r2 ? (p2 = 6 + 20 * n2(), g3 = 80 + 250 * n2(), S2 = 1500 + 3500 * n2(), h2 = 300 + 2400 * n2(), d2 = { attack: 0.03 + 0.4 * n2(), decay: 0.1 + 0.7 * n2(), sustain: 0.2 + 0.5 * n2(), release: 0.2 + 3 * n2() }) : (p2 = 24 + 36 * n2(), g3 = 80 + 250 * n2(), S2 = 1500 + 3500 * n2(), h2 = 300 + 2400 * n2(), d2 = { attack: 2 + 8 * n2(), decay: 4 + 20 * n2(), sustain: 0.7 + 0.2 * n2(), release: 8 + 24 * n2() }), { osc1: l2[0], osc2: l2[1] || null, filter: h2, filterQ: 0.6 + 0.7 * n2(), lfo: [p2, g3, S2], envelope: d2, colorSpeed: 0.06 + 0.22 * n2(), shapeDrift: 6e-4 + 32e-4 * n2(), seed: e2 };
    }, f = (t2) => {
      e.state.presets = Object.fromEntries(shapeList(e).map(((e2) => [e2, _(t2, e2)])));
    }, m = async () => {
      const { Tone: t2, chains: n2 } = e.state;
      if (!t2) return;
      const a2 = humKey(e);
      n2[a2] && (await y(n2[a2]), delete n2[a2]);
      try {
        const e2 = new t2.Oscillator("A0", "sine").start(), s2 = new t2.Filter(150, "lowpass");
        s2.Q.value = 0.5;
        const o2 = new t2.Volume(-25), i2 = r(t2), u2 = new t2.Gain(0).toDestination();
        e2.connect(o2), o2.connect(s2), s2.connect(u2), i2 && s2.connect(i2), n2[a2] = { osc: e2, volume: o2, filter: s2, out: u2, analyser: i2 };
      } catch (t3) {
        console.error("Error buffering hum chain", t3), delete e.state.chains[a2];
      }
    }, q = async (t2) => {
      if (t2 === humKey(e)) return m();
      const { Tone: n2, presets: a2, chains: s2 } = e.state, o2 = a2[t2];
      if (o2 && n2) {
        s2[t2] && (await y(s2[t2]), delete s2[t2]);
        try {
          const e2 = new n2.Oscillator(o2.osc1[1], o2.osc1[0]).start(), a3 = o2.osc2 ? new n2.Oscillator(o2.osc2[1], o2.osc2[0]).start() : null, i2 = new n2.Volume(5), u2 = new n2.Filter(o2.filter, "lowpass");
          u2.Q.value = o2.filterQ;
          const c2 = new n2.LFO(...o2.lfo).start(), l2 = r(n2), d2 = new n2.Gain(0).toDestination();
          c2.connect(u2.frequency), a3 && c2.connect(a3.detune), e2.connect(i2), a3?.connect(i2), i2.connect(u2), u2.connect(d2), l2 && u2.connect(l2), s2[t2] = { osc1: e2, osc2: a3, volume: i2, filter: u2, lfo: c2, out: d2, analyser: l2 };
        } catch (n3) {
          console.error("Error buffering chain for shape", t2, n3), delete e.state.chains[t2];
        }
      }
    }, C = (t2, { updateCanvasShape: n2 = true, setStateCurrent: a2 = n2, syncCanvasPlayState: s2 = true } = {}) => {
      const { Tone: i2, chains: r2, current: u2 } = e.state, c2 = r2[u2], l2 = r2[t2];
      c2 && c2 !== l2 && S(c2.out.gain, 0, g2, i2), l2 && S(l2.out.gain, 1, g2, i2);
      const d2 = { isAudioStarted: true };
      l2?.analyser && (d2.analyser = l2.analyser), s2 && (d2.isPlaying = e.state.isPlaying), o(d2), n2 && (t2 === humKey(e) ? o({ shapeKey: humKey(e), preset: null }) : o({ shapeKey: t2, preset: e.state.presets[t2] })), a2 && (e.state.current = t2);
    }, v = () => {
      n(y), e.state.chains = {}, e.state.current = null;
    }, T = () => {
      e.sig?.updateSequencerState?.();
    }, P = () => {
      e.sig?.stopSequence?.();
    }, K = () => {
      e.sig?.stopAudioSignature?.();
    }, x = () => {
      v(), e.state.sequencePlaying && P(), e.state.audioSignaturePlaying && K?.();
      const { seed: t2, Tone: n2, approvedSeeds: a2 } = e.state;
      e.state = e.defaultState(t2), e.state.Tone = n2, e.state.approvedSeeds = a2 || [], f(t2), m();
      const s2 = shapeList(e), r2 = i(t2), u2 = s2.length ? s2[r2() * s2.length | 0] : humKey(e);
      o({ preset: e.state.presets[u2] ?? null, shapeKey: u2, mode: "seed", isAudioStarted: false, isPlaying: false }), e.state.current = humKey(e), e._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(e) }), e.state.isSequencerMode = false, e._sequencerComponent.style.display = "none", e._main.style.overflow = "hidden", e.state.sequence = Array(8).fill(null), T?.();
    }, R = async () => {
      const t2 = e.state;
      if (!t2.initialBufferingStarted || t2.initialShapeBuffered) {
        if (t2.isPlaying) return A();
        if (t2.contextUnlocked) return t2.initialShapeBuffered ? (C(humKey(e)), t2.isPlaying = true, e._canvas.isPlaying = true, e._updateControls({ isAudioStarted: true, isPlaying: true }), t2._startupSigDone || (await l((() => e._sleep(200))), c((() => e._triggerSignatureFor?.(humKey(e), { loop: t2.isLoopEnabled }))), setTimeout((() => c((() => {
          e.cleanupHotkeyTour?.(), e.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
        }))), 60), t2._startupSigDone = true), void (e._loader.textContent = "Audio resumed (hum).")) : void (e._loader.textContent = "Audio context unlocked, but synth not ready. Click again.");
        try {
          const n2 = t2.Tone;
          if (!n2) throw new Error("Tone.js not available");
          const s2 = n2.getContext?.() || n2.context;
          let o2 = false;
          if (s2?.resume ? (await s2.resume(), o2 = true) : n2.start && (await n2.start(), o2 = true), !o2) throw new Error("Could not resume AudioContext");
          t2.contextUnlocked = true, t2.initialBufferingStarted = true, await m(), C(humKey(e));
          for (const n3 of shapeList(e)) {
            if (!t2.contextUnlocked) break;
            await l((() => q(n3))), await a(0);
          }
          t2.initialShapeBuffered = true, t2.isPlaying = true, e._canvas.isPlaying = true, e._updateControls({ isAudioStarted: true, isPlaying: true }), t2._startupSigDone || (await l((() => e._sleep(200))), c((() => e._triggerSignatureFor?.(humKey(e), { loop: t2.isLoopEnabled }))), setTimeout((() => c((() => {
            e.cleanupHotkeyTour?.(), e.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
          }))), 60), t2._startupSigDone = true);
        } catch (e2) {
          console.error("Failed to unlock AudioContext:", e2), t2.contextUnlocked = false, t2.initialBufferingStarted = false, t2.initialShapeBuffered = false;
        }
      } else e._loader.textContent = "Still preparing initial synth, please wait...";
    }, A = () => {
      const t2 = e.state;
      (t2.isPlaying || t2.initialBufferingStarted) && (c((() => e.cleanupHotkeyTour?.())), t2.audioSignatureTimer && (c((() => clearTimeout(t2.audioSignatureTimer))), t2.audioSignatureTimer = null), t2.isPlaying = t2.initialBufferingStarted = t2.initialShapeBuffered = false, v(), t2.sequencePlaying && P?.(), t2.audioSignaturePlaying && K?.(), e._canvas && (e._canvas.isPlaying = false, e._canvas.isAudioStarted = false), x());
    };
    return { createElement, _eachChain: n, _disposeChain: y, _rng: i, _setCanvas: o, _createAnalyser: r, _sleep: a, _timeNow: s, _rampLinear: S, _silenceAllChains: async (t2 = p) => {
      const a2 = e.state?.Tone;
      a2 && (n(((e2) => e2?.out?.gain && S(e2.out.gain, 0, t2, a2))), await e._sleep(Math.ceil(1e3 * (t2 + 2e-3))));
    }, _linToDb: u, deterministicPreset: _, loadPresets: f, bufferHumChain: m, bufferShapeChain: q, setActiveChain: C, disposeAllChains: v, resetState: x, unlockAudioAndBufferInitial: R, stopAudioAndDraw: A, _onStartRequest: () => R(), _onMuteToggle: () => {
      const t2 = e.state, n2 = t2.Tone;
      if (!n2?.Destination) return;
      const a2 = !t2.isMuted;
      n2.Destination.mute = a2, t2.isMuted = a2, e._updateControls(), o({ isPlaying: t2.isPlaying && !t2.isMuted }), e._loader.textContent = t2.isMuted ? "Muted." : "Unmuted.";
    }, _onShapeChange: (t2) => {
      const n2 = t2?.detail?.shapeKey;
      if (!n2) return;
      const a2 = e.state, s2 = humKey(e);
      if (a2.audioSignaturePlaying || a2.signatureSequencerRunning || (a2._uiReturnShapeKey = n2 !== s2 ? n2 : a2._uiReturnShapeKey), !a2.contextUnlocked || !a2.initialShapeBuffered) return o(n2 === s2 ? { shapeKey: s2, preset: null, mode: "seed" } : { shapeKey: n2, preset: a2.presets[n2], mode: "seed" }), void e._updateControls({ shapeKey: n2 });
      C(n2), n2 !== s2 && o({ shapeKey: n2, preset: a2.presets[n2], mode: "live" }), e._canvas.isPlaying = !e.state.Tone?.Destination?.mute, e._updateControls({ shapeKey: n2 }), a2.current = n2;
    }, _onVolumeChange: (t2) => {
      const n2 = t2?.detail?.value;
      if ("number" != typeof n2) return;
      const a2 = e.state;
      a2.volume = Math.min(1, Math.max(0, n2));
      const s2 = a2.Tone;
      s2?.Destination?.volume && (s2.Destination.volume.value = u(a2.volume)), e._updateControls({ volume: a2.volume });
    }, updateSequencerState: T, stopSequence: P, stopAudioSignature: K };
  }
  function Signatures(e) {
    const t = () => humKey(e), n = () => shapeList(e), a = () => shapeCount(e), s = (e2, t2, n2) => t2 + Math.floor(e2() * (n2 - t2 + 1)), o = (e2) => s(e2, 0, a()), i = (e2) => {
      const t2 = a();
      return t2 > 0 ? s(e2, 1, t2) : 0;
    }, r = (t2) => {
      const n2 = e._rng(`${t2}_unique_algo_mapping`), a2 = allKeys(e), s2 = a2.length, o2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], i2 = [];
      for (; i2.length < s2; ) i2.push(...o2);
      i2.length = s2;
      for (let e2 = i2.length - 1; e2 > 0; e2--) {
        const t3 = n2() * (e2 + 1) | 0;
        [i2[e2], i2[t3]] = [i2[t3], i2[e2]];
      }
      const r2 = {};
      return a2.forEach(((e2, t3) => r2[e2] = i2[t3])), r2;
    }, u = (t2, { steps: n2 = 32, paletteSize: o2 = 6, pRepeat: i2 = 0.35, pHum: r2 = 0.15, pSilence: u2 = 0.2, avoidBackAndForth: c2 = true } = {}) => {
      const l2 = e._rng(`${t2}_audio_signature_constrained`), d2 = a(), p2 = Math.max(1, Math.min(d2, o2)), g3 = [];
      let S2 = null, h2 = null;
      for (let e2 = 0; e2 < n2; e2++) {
        if (l2() < u2) {
          g3.push(null);
          continue;
        }
        const e3 = l2();
        let t3;
        if (e3 < r2) t3 = 0;
        else if (e3 < r2 + i2 && null !== h2) t3 = h2;
        else do {
          t3 = s(l2, 1, p2), c2 && null !== S2 && S2 >= 1 && t3 >= 1 && g3.length >= 2 && g3.at(-2) === t3 && (t3 = null);
        } while (null === t3);
        g3.push(t3), null !== t3 && (t3 >= 1 && (h2 = t3), S2 = t3);
      }
      return g3;
    }, c = (t2, n2 = 1) => {
      const s2 = e._rng(`${t2}_audio_signature_v${n2}`), r2 = 32, c2 = a();
      switch (n2) {
        case 1: {
          const e2 = [];
          for (let t3 = 0; t3 < r2; t3++) e2.push(o(s2));
          return e2;
        }
        case 2:
          return u(t2, { steps: r2, paletteSize: Math.min(6, Math.max(1, c2)), pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true });
        case 3: {
          const e2 = 8, t3 = Array.from({ length: e2 }, (() => o(s2)));
          return Array.from({ length: r2 }, ((n3, a2) => t3[a2 % e2]));
        }
        case 4: {
          const e2 = [0];
          let t3 = 0;
          for (let n3 = 1; n3 < r2; n3++) {
            const n4 = s2() > 0.5 ? 1 : -1, a2 = 1 + (3 * s2() | 0);
            t3 = Math.max(0, Math.min(c2, t3 + n4 * a2)), e2.push(t3);
          }
          return e2;
        }
        case 5: {
          const e2 = [];
          let t3 = o(s2);
          for (let n3 = 0; n3 < r2; ) {
            const a2 = Math.min(2 + (6 * s2() | 0), r2 - n3);
            for (let s3 = 0; s3 < a2; s3++, n3++) e2.push(t3);
            t3 = o(s2);
          }
          return e2;
        }
        case 6: {
          const e2 = [];
          for (let t3 = 0; t3 < r2; t3++) e2.push(s2() > 0.7 ? i(s2) : 0);
          return e2;
        }
        case 7: {
          const e2 = new Array(r2).fill(0);
          let t3 = 0, n3 = 1, a2 = 1;
          for (; t3 < r2; ) {
            e2[t3] = i(s2);
            const o2 = n3 + a2;
            n3 = a2, a2 = o2, t3 += o2;
          }
          return e2;
        }
        case 8: {
          const e2 = o(s2), t3 = o(s2);
          return Array.from({ length: r2 }, ((n3, a2) => a2 % 2 == 0 ? e2 : t3));
        }
        case 9: {
          let e2 = i(s2);
          const t3 = [];
          for (let n3 = 0; n3 < r2; n3++) (s2() < 0.2 || 0 === e2) && (e2 = o(s2)), t3.push(e2), s2() > 0.7 && (e2 = Math.max(0, e2 - 1));
          return t3;
        }
        case 10: {
          let e2 = o(s2);
          const t3 = [];
          for (let n3 = 0; n3 < r2; n3++) (n3 % 8 == 0 || s2() > 0.6) && (e2 = o(s2)), t3.push(e2);
          return t3;
        }
        default:
          return u(t2);
      }
    }, l = (n2, { loop: a2 = e.state.isLoopEnabled } = {}) => {
      const s2 = e.state;
      if (!s2.contextUnlocked || !s2.initialShapeBuffered) return;
      s2.sequencePlaying && y(), s2.audioSignaturePlaying && p(), s2._uiReturnShapeKey = n2 || s2._uiReturnShapeKey || t(), s2._sigStartShapeKey = s2._uiReturnShapeKey;
      const o2 = r(s2.seed)[n2] || 1, i2 = c(s2.seed, o2);
      d(i2, o2), e._loader.textContent = s2.isLoopEnabled ? `Playing ${n2} Audio Signature (Loop).` : `Playing ${n2} Audio Signature...`;
    }, d = (a2, s2 = 1, { onComplete: o2 = null } = {}) => {
      const i2 = e.state;
      i2.audioSignaturePlaying && p();
      const r2 = "string" == typeof i2.current && i2.current ? i2.current : null;
      i2._uiReturnShapeKey = r2 || i2._uiReturnShapeKey || t(), i2._sigStartShapeKey = i2._uiReturnShapeKey, i2.audioSignaturePlaying = true, i2.audioSignatureStepIndex = 0, i2.audioSignatureOnComplete = o2, e._updateControls({ isAudioSignaturePlaying: true });
      const u2 = 3 === s2 || 7 === s2 ? 100 : 5 === s2 ? 150 : 10 === s2 ? 200 : 125, c2 = () => {
        const s3 = e.state;
        if (!s3.audioSignaturePlaying) return;
        const o3 = s3.audioSignatureStepIndex, i3 = a2[o3];
        if (null !== i3) {
          const a3 = 0 === i3 ? t() : n()[i3 - 1];
          a3 && e._onShapeChange({ detail: { shapeKey: a3 } });
        }
        if (s3.audioSignatureStepIndex++, s3.audioSignatureStepIndex >= a2.length) {
          const n2 = () => {
            s3.audioSignaturePlaying = false, s3.audioSignatureTimer = null, e._updateControls({ isAudioSignaturePlaying: false });
            const t2 = s3.audioSignatureOnComplete;
            s3.audioSignatureOnComplete = null, "function" == typeof t2 ? t2() : e._loader.textContent = "Audio Signature complete.";
          };
          s3.isLoopEnabled ? (s3.audioSignatureStepIndex = 0, s3.audioSignatureTimer = setTimeout(c2, u2)) : ((() => {
            const n3 = e.state;
            try {
              e.cleanupHotkeyTour?.();
            } catch {
            }
            if (n3.isLatchOn) {
              n3.isLatchOn = false;
              try {
                e._pathRec?.setLatch?.(false);
              } catch {
              }
              e._updateControls();
            }
            const a3 = t(), s4 = n3._sigStartShapeKey || n3._uiReturnShapeKey || a3;
            try {
              e.setActiveChain(a3, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false });
            } catch {
            }
            try {
              e._canvas && (e._canvas.isPlaying = false);
            } catch {
            }
            try {
              const t2 = s4 === a3 ? null : n3.presets?.[s4] || null;
              e._canvas && Object.assign(e._canvas, { shapeKey: s4, preset: t2, mode: "live" }), e._updateControls({ shapeKey: s4 });
            } catch {
            }
            n3._uiReturnShapeKey = s4, n3._sigStartShapeKey = null;
          })(), s3.audioSignatureTimer = setTimeout(n2, u2));
        } else s3.audioSignatureTimer = setTimeout(c2, u2);
      };
      c2();
    }, p = () => {
      const n2 = e.state;
      n2.audioSignatureTimer && (clearTimeout(n2.audioSignatureTimer), n2.audioSignatureTimer = null);
      try {
        e.cleanupHotkeyTour?.();
      } catch {
      }
      if (n2.audioSignaturePlaying = false, n2.audioSignatureStepIndex = 0, e._updateControls({ isAudioSignaturePlaying: false }), n2.isLatchOn) {
        n2.isLatchOn = false;
        try {
          e._pathRec?.setLatch?.(false);
        } catch {
        }
        e._updateControls();
      }
      const a2 = t(), s2 = n2._sigStartShapeKey || n2._uiReturnShapeKey || a2;
      try {
        e.setActiveChain(a2, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false });
      } catch {
      }
      try {
        e._canvas && (e._canvas.isPlaying = false);
      } catch {
      }
      try {
        const t2 = s2 === a2 ? null : n2.presets?.[s2] || null;
        e._canvas && Object.assign(e._canvas, { shapeKey: s2, preset: t2, mode: "live" }), e._updateControls({ shapeKey: s2 });
      } catch {
      }
      n2._uiReturnShapeKey = s2, n2._sigStartShapeKey = null, n2.audioSignatureOnComplete = null;
    }, g2 = async () => {
      const s2 = e.state;
      if (s2.signatureSequencerRunning) return;
      s2.signatureSequencerRunning = true, p();
      const o2 = r(s2.seed), i2 = async () => {
        if (s2.signatureSequencerRunning) for (let i3 = 0; i3 < s2.sequence.length; i3++) {
          if (!s2.signatureSequencerRunning) return;
          s2.sequenceStepIndex = i3, h();
          const r2 = s2.sequence[i3];
          if (null === r2 || "number" != typeof r2 || r2 < 0) {
            await e._sleep(Math.max(50, s2.stepTime));
            continue;
          }
          let u2 = null;
          if (0 === r2 ? u2 = t() : r2 >= 1 && r2 <= a() && (u2 = n()[r2 - 1]), !u2) {
            await e._sleep(Math.max(50, s2.stepTime));
            continue;
          }
          const l2 = o2[u2] || 1, p2 = c(s2.seed, l2);
          if (await new Promise(((e2) => {
            s2.signatureSequencerRunning ? d(p2, l2, { onComplete: () => e2() }) : e2();
          })), !s2.signatureSequencerRunning) return;
          await e._sleep(Math.max(30, s2.stepTime));
        }
      };
      if (await i2(), s2.signatureSequencerRunning) {
        if (s2.isLoopEnabled && s2.sequencePlaying) for (; s2.signatureSequencerRunning && s2.sequencePlaying && s2.isLoopEnabled; ) await i2();
        S(), e._sequencerComponent?.stopSequence?.();
      }
    }, S = () => {
      const t2 = e.state;
      t2.signatureSequencerRunning = false, p(), t2.sequencePlaying = false, t2.sequenceStepIndex = 0, t2._seqFirstCycleStarted = false, h(), t2._uiReturnShapeKey ? e._updateControls({ shapeKey: t2._uiReturnShapeKey }) : e._updateControls();
    }, h = () => {
      e._sequencerComponent && e._sequencerComponent.updateState?.({ isRecording: e.state.isRecording, currentRecordSlot: e.state.currentRecordSlot, sequence: [...e.state.sequence], velocities: [...e.state.velocities], sequencePlaying: e.state.sequencePlaying, sequenceStepIndex: e.state.sequenceStepIndex, stepTime: e.state.stepTime, isLoopEnabled: e.state.isLoopEnabled, isSequenceSignatureMode: e.state.isSequenceSignatureMode, steps: e.state.sequenceSteps });
    }, y = () => {
      e._sequencerComponent?.stopSequence();
      const t2 = e.state;
      t2.signatureSequencerRunning && S(), t2.audioSignaturePlaying && p(), t2.sequencePlaying = false, t2.sequenceStepIndex = 0, t2._seqFirstCycleStarted = false, h(), e._updateControls();
    };
    return { _onToggleSequencer: () => {
      const t2 = e.state;
      t2.isSequencerMode = !t2.isSequencerMode, e._sequencerComponent && (e._sequencerComponent.style.display = t2.isSequencerMode ? "block" : "none"), t2.isSequencerMode ? h() : (t2.isRecording = false, t2.currentRecordSlot = -1, t2.sequencePlaying && y(), t2.signatureSequencerRunning && S()), e._updateControls({ sequencerVisible: t2.isSequencerMode }), "function" == typeof e._fitLayout && e._fitLayout();
    }, _onLoopToggle: () => {
      const t2 = e.state;
      t2.isLoopEnabled = !t2.isLoopEnabled, e._updateControls();
      try {
        e._pathRec?.setLoop?.(t2.isLoopEnabled);
      } catch {
      }
    }, _onSignatureModeToggle: () => {
      const t2 = e.state;
      t2.isSequenceSignatureMode = !t2.isSequenceSignatureMode, e._updateControls(), t2.sequencePlaying && y(), t2.audioSignaturePlaying && p();
    }, _getUniqueAlgorithmMapping: r, generateAudioSignature: c, _generateSignatureWithConstraints: u, _onAudioSignature: () => {
      const n2 = e.state;
      if (n2.audioSignaturePlaying) return p(), void e._updateControls({ isAudioSignaturePlaying: false });
      if (!n2.contextUnlocked || !n2.initialShapeBuffered) return;
      const a2 = n2._uiReturnShapeKey || n2.current || t();
      l(a2, { loop: n2.isLoopEnabled }), e._updateControls({ isAudioSignaturePlaying: true });
    }, _triggerSignatureFor: l, playAudioSignature: d, stopAudioSignature: p, _onSeqRecordStart: (t2) => {
      const n2 = t2?.detail?.slotIndex ?? -1;
      e.state.isRecording = true, e.state.currentRecordSlot = n2, e._updateControls();
    }, _onSeqStepCleared: (t2) => {
      const n2 = t2?.detail?.slotIndex;
      if ("number" != typeof n2) return;
      const a2 = e.state;
      a2.sequence[n2] = null, a2.isRecording && a2.currentRecordSlot === n2 && (a2.currentRecordSlot = (n2 + 1) % 8, 0 === a2.currentRecordSlot && (a2.isRecording = false));
    }, _onSeqStepRecorded: (t2) => {
      const n2 = t2?.detail ?? {};
      "number" == typeof n2.slotIndex && (e.state.sequence[n2.slotIndex] = n2.value), "number" == typeof n2.nextSlot && (e.state.currentRecordSlot = n2.nextSlot), "boolean" == typeof n2.isRecording && (e.state.isRecording = n2.isRecording);
    }, _onSeqPlayStarted: (t2) => {
      const n2 = t2?.detail?.stepTime, a2 = e.state;
      a2.sequencePlaying = true, a2.sequenceStepIndex = 0, a2._seqFirstCycleStarted = false, a2.isSequencerMode = true, "number" == typeof n2 && (a2.stepTime = n2), e._updateControls(), a2.isSequenceSignatureMode && (e._sequencerComponent?.stopSequence(), g2());
    }, _onSeqPlayStopped: () => {
      const n2 = e.state;
      if (n2.sequencePlaying = false, n2.sequenceStepIndex = 0, n2._seqFirstCycleStarted = false, n2.isSequencerMode = false, n2.signatureSequencerRunning && S(), !n2.isLatchOn) try {
        const n3 = t();
        e._updateControls({ shapeKey: n3 }), e._onShapeChange({ detail: { shapeKey: n3 } });
      } catch {
      }
      e._updateControls();
    }, _onSeqStepAdvance: (s2) => {
      if (e.state.isSequenceSignatureMode) return;
      const o2 = s2?.detail || {}, i2 = e.state, r2 = "number" == typeof o2.stepIndex ? o2.stepIndex : "number" == typeof o2.index ? o2.index : i2.sequenceStepIndex, u2 = o2.value;
      if (i2.sequencePlaying && 0 === r2) if (i2._seqFirstCycleStarted) {
        if (!i2.isLoopEnabled) return void y();
      } else i2._seqFirstCycleStarted = true;
      if (i2.sequenceStepIndex = r2, null != u2 && 0 !== u2) {
        if (u2 >= 1 && u2 <= a()) {
          const t2 = n()[u2 - 1];
          e._updateControls({ shapeKey: t2 }), e._onShapeChange({ detail: { shapeKey: t2 } });
        }
      } else if (!i2.isLatchOn) {
        const n2 = t();
        e._updateControls({ shapeKey: n2 }), e._onShapeChange({ detail: { shapeKey: n2 } });
      }
    }, _onSeqStepTimeChanged: (t2) => {
      const n2 = t2?.detail?.stepTime;
      "number" == typeof n2 && (e.state.stepTime = n2);
    }, _onSeqStepsChanged: (t2) => {
      const n2 = t2?.detail?.steps;
      if ("number" == typeof n2 && n2 > 0) {
        const t3 = e.state;
        if (t3.sequenceSteps = n2, n2 !== t3.sequence.length) {
          const e2 = [...t3.sequence], a2 = [...t3.velocities || []];
          t3.sequence = Array.from({ length: n2 }, ((t4, n3) => e2[n3] ?? null)), t3.velocities = Array.from({ length: n2 }, ((e3, t4) => a2[t4] ?? 1));
        }
        h();
      }
    }, _startSignatureSequencer: g2, _stopSignatureSequencer: S, updateSequencerState: h, recordStep: (t2) => {
      e._sequencerComponent?.recordStep(t2);
    }, playSequence: () => {
      e._sequencerComponent?.playSequence();
    }, stopSequence: y };
  }
  var ToneLoader = class extends HTMLElement {
    constructor() {
      super(), this.attachShadow({ mode: "open" }), this.shadowRoot.innerHTML = "", this._loaded = false;
    }
    connectedCallback() {
      if (this._loaded) return;
      this._loaded = true;
      import("https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0").then(((e) => {
        window.Tone || !e?.default && !e?.Tone || (window.Tone = e.default ?? e.Tone), this.dispatchEvent(new CustomEvent("tone-ready", { bubbles: true, composed: true }));
      })).catch(((e) => console.error("Failed to load Tone.js:", e)));
    }
  };
  customElements.define("tone-loader", ToneLoader);

  // js/scope-canvas.js
  (() => {
    const t = { PROB: { "mono-prob": 0.02, "half-dominant-prob": 0.05, "group-strobe-prob": 0.01, "dark-palette-prob": 0.01, "neutral-palette-prob": 0.05 }, HALF_DOMINANT_RATIO: 0.5, CYCLER_SPEEDS: { slow: 0.03, medium: 0.06, fast: 0.12, lightning: 0.6 }, EFFECT_WEIGHTS: { none: 60, glow: 25, strobe: 10, neon: 5 }, CYC_SPEED_WEIGHTS: { slow: 25, medium: 40, fast: 25, lightning: 10 }, COLOR_WEIGHTS: { bitcoin_orange: 3, stacks_purple: 2, deep_purple: 2, light_magenta: 3, shocking_pink: 4, royal_blue: 10, dark_green: 3, bright_pink: 6, bright_red: 12, dark_red: 6, bright_yellow: 1, gold: 1, white: 3, dark_gray: 2, cycler: 3 }, DARK_COLOR_WEIGHTS: { extra_dark_purple: 2, very_dark_blue: 2, very_dark_green: 3, dark_red: 5, extra_dark_gray: 3, charcoal: 2, near_black: 1, gold: 1 }, NEUTRAL_COLOR_WEIGHTS: { near_black: 4, extra_dark_gray: 5, charcoal: 5, dark_gray: 5, slate_gray: 4, dim_gray: 4, silver: 3, gainsboro: 3, off_white: 4, white: 3 }, NAMED_COLORS: { bitcoin_orange: "#F7931A", stacks_purple: "#5546FF", deep_purple: "#4B1EFF", light_magenta: "#FF4FD8", shocking_pink: "#FF00A8", bright_pink: "#FF1493", bright_red: "#FF1A1A", dark_red: "#6A0000", royal_blue: "#0726a2ff", dark_green: "#017210ff", bright_yellow: "#FFD400", gold: "#FFD700", white: "#FFFFFF", dark_gray: "rgba(16,16,24,0.40)", stacks_purple_dark: "#241E72", extra_dark_purple: "#1C0033", very_dark_blue: "#0B1E3A", very_dark_green: "#012B1B", extra_dark_gray: "#0F1014", charcoal: "#14161C", slate_gray: "#2A2F3A", dim_gray: "#6E6E73", silver: "#C0C0C8", gainsboro: "#DDDEE3" } }, e = (Object.keys(t.DARK_COLOR_WEIGHTS), Object.keys(t.NEUTRAL_COLOR_WEIGHTS)), s = (t2) => {
      let e2 = ((t3) => {
        let e3 = 0;
        for (let s2 = 0; s2 < t3.length; s2++) e3 = (e3 << 5) - e3 + t3.charCodeAt(s2);
        return 0 | e3;
      })(t2);
      return () => {
        e2 = e2 + 1831565813 | 0;
        let t3 = imul(e2 ^ e2 >>> 15, 1 | e2);
        return t3 = t3 + imul(t3 ^ t3 >>> 7, 61 | t3) ^ t3, ((t3 ^ t3 >>> 14) >>> 0) / 4294967296;
      };
    }, i = (t2, e2) => {
      const s2 = Object.keys(e2);
      if (!s2.length) return null;
      const i2 = s2.map(((t3) => max(0, +e2[t3] || 0))), r2 = i2.reduce(((t3, e3) => t3 + e3), 0);
      if (r2 <= 0) return s2[0];
      let o2 = t2() * r2;
      for (let t3 = 0; t3 < s2.length; t3++) if (o2 -= i2[t3], o2 <= 0) return s2[t3];
      return s2.at(-1);
    }, r = (t2, e2) => Object.fromEntries(e2.filter(((e3) => e3 in t2)).map(((e3) => [e3, t2[e3]]))), o = (t2, e2, s2) => {
      const i2 = e2.slice();
      for (let e3 = i2.length - 1; e3 > 0; e3--) {
        const s3 = t2() * (e3 + 1) | 0;
        [i2[e3], i2[s3]] = [i2[s3], i2[e3]];
      }
      return i2.slice(0, s2);
    }, a = { circle: { freq: 1, harmonics: [1, 0.5, 0.25], complexity: 0.3 }, square: { freq: 1.5, harmonics: [1, 0.3, 0.7, 0.2], complexity: 0.6 }, butterfly: { freq: 2.2, harmonics: [1, 0.4, 0.6, 0.3, 0.2], complexity: 0.8 }, Bowditch: { freq: 1.8, harmonics: [1, 0.6, 0.4], complexity: 0.5 }, spiro: { freq: 3.1, harmonics: [1, 0.3, 0.5, 0.2, 0.4], complexity: 0.9 }, harmonograph: { freq: 2.5, harmonics: [1, 0.7, 0.5, 0.3, 0.2, 0.1], complexity: 1 }, rose: { freq: 1.7, harmonics: [1, 0.4, 0.3, 0.2], complexity: 0.4 }, hypocycloid: { freq: 2.8, harmonics: [1, 0.5, 0.3, 0.4], complexity: 0.7 }, epicycloid: { freq: 2.9, harmonics: [1, 0.4, 0.5, 0.3], complexity: 0.7 }, spiral: { freq: 1.3, harmonics: [1, 0.3, 0.2], complexity: 0.4 }, star: { freq: 2.1, harmonics: [1, 0.6, 0.4, 0.2], complexity: 0.6 }, flower: { freq: 1.9, harmonics: [1, 0.5, 0.3, 0.4], complexity: 0.5 }, wave: { freq: 1.1, harmonics: [1, 0.4, 0.2], complexity: 0.3 }, mandala: { freq: 3.5, harmonics: [1, 0.3, 0.4, 0.2, 0.3, 0.1], complexity: 1.2 }, infinity: { freq: 1.6, harmonics: [1, 0.5, 0.3], complexity: 0.4 }, dna: { freq: 2.7, harmonics: [1, 0.4, 0.3, 0.5, 0.2], complexity: 0.8 }, tornado: { freq: 3.2, harmonics: [1, 0.3, 0.6, 0.2, 0.4], complexity: 1.1 }, hum: { freq: 0.8, harmonics: [1, 0.2, 0.1], complexity: 0.2 } };
    class n extends HTMLElement {
      constructor() {
        super();
        const t2 = this.attachShadow({ mode: "open" }), e2 = document.createElement("style");
        e2.textContent = ":host{display:block;width:100%;height:100%}canvas{display:block;width:100%;height:100%}", t2.append(e2), this._canvas = document.createElement("canvas"), t2.append(this._canvas), this._ctx = this._canvas.getContext("2d"), this.analyser = null, this.preset = null, this.shapeKey = "circle", this.mode = "seed", this.isAudioStarted = false, this.isPlaying = false, this.onIndicatorUpdate = null, this._plan = null, this._dummyData = null, this._liveBuffer = null, this._animId = null, this._cssW = 0, this._cssH = 0, this._dpr = 1, this._animate = this._animate.bind(this), this._resizeCanvas = this._resizeCanvas.bind(this), this._samp = (t3, e3) => t3 ? t3[e3 % t3.length] ?? 0 : 0, this._ampAt = (t3, e3) => norm(this._samp(t3, e3)), this._avgAbs = (t3) => t3.reduce?.(((t4, e3) => t4 + abs(e3)), 0) / t3.length, this._withCtx = (t3) => {
          const e3 = this._cssW || this._canvas.clientWidth || this._canvas.width, s3 = this._canvas.width / 2 | 0, i2 = this._canvas.height / 2 | 0, r2 = min(s3, i2) / (this._dpr || 1);
          return t3(this._ctx, e3, r2);
        }, this._traceParam = (t3, e3, { close: s3 = false } = {}) => this._withCtx(((i2, r2, o2) => {
          i2.beginPath();
          for (let s4 = 0, a2 = t3.length; s4 < a2; s4++) {
            const [t4, n2] = e3(s4, a2, r2, o2);
            s4 ? i2.lineTo(t4, n2) : i2.moveTo(t4, n2);
          }
          s3 && i2.closePath(), i2.stroke();
        })), this._tracePolar = (t3, e3, { phase: s3 = 0, close: i2 = false } = {}) => this._traceParam(t3, ((t4, i3, r2, o2) => {
          const a2 = theta(t4, i3, s3), n2 = e3(t4, i3, a2, r2, o2);
          return [o2 + cos(a2) * n2, o2 + sin(a2) * n2];
        }), { close: i2 }), this._prepareStroke = (t3, { effect: e3 = "none", now: s3 = 0 } = {}) => {
          const i2 = this._ctx;
          if (i2.clearRect(0, 0, this._cssW, this._cssH), i2.globalCompositeOperation = "source-over", i2.shadowBlur = 0, i2.shadowColor = "transparent", i2.globalAlpha = 1, i2.lineWidth = 2, i2.lineJoin = i2.lineCap = "round", "glow" === e3) i2.shadowBlur = 16, i2.shadowColor = t3;
          else if ("neon" === e3) i2.shadowBlur = 28, i2.shadowColor = t3, i2.globalCompositeOperation = "lighter", i2.lineWidth = 2.6;
          else if ("strobe" === e3) {
            const t4 = s3 * (10 + s3 % 1e3 * 2e-3) / 1e3 % 1 < 0.5;
            i2.globalAlpha = t4 ? 1 : 0.22;
          }
          i2.strokeStyle = t3;
        };
        const s2 = (t3) => (e3, s3) => this._withCtx(((i2, r2, o2) => {
          const a2 = "epi" === t3 ? 1 : -1, n2 = ("epi" === t3 ? 0.36 : 0.39) * r2, h = "epi" === t3 ? 4 + Math.round(3 * abs(sin(21e-5 * s3 + 0.5))) : 3 + Math.round(3 * abs(cos(23e-5 * s3))), c = 1 / h, l = (1 + a2 * c) / c, _ = "epi" === t3 ? 38e-5 * s3 : 4e-4 * s3;
          this._traceParam(e3, ((t4, s4) => {
            const i3 = theta(t4, s4, _), r3 = 0.7 + 0.3 * this._ampAt(e3, t4), h2 = n2 * ((1 + a2 * c) * cos(i3) - a2 * c * cos(l * i3)) * r3, p = n2 * ((1 + a2 * c) * sin(i3) - c * sin(l * i3)) * r3;
            return [o2 + h2, o2 + p];
          }), { close: true });
        }));
        this.drawFuncs = { hum: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.33 * i2 + 5 * sin(2e-4 * e3);
          s3.save(), s3.globalAlpha = 0.23 + 0.14 * abs(sin(4e-4 * e3)), s3.beginPath(), s3.arc(r2, r2, o2, 0, TAU), s3.stroke();
          const a2 = !!this._plan?.isMono;
          s3.strokeStyle = a2 ? this._getColorFor("hum", e3).css : "hsl(195, 80%, 62%)", s3.globalAlpha = 0.36, s3.beginPath();
          for (let i3 = 0, a3 = 128; i3 < a3; i3++) {
            const n2 = i3 / a3 * TAU, h = o2 + (12 * sin(3 * n2 + 45e-5 * e3) + 6 * sin(6 * n2 - 32e-5 * e3)) + 7 * this._samp(t3, i3), c = r2 + cos(n2) * h, l = r2 + sin(n2) * h;
            i3 ? s3.lineTo(c, l) : s3.moveTo(c, l);
          }
          s3.closePath(), s3.stroke(), s3.restore();
        })), circle: (t3, e3) => this._withCtx(((s3, i2, r2) => this._traceParam(t3, ((s4, o2) => {
          const a2 = theta(s4, o2, 1e-3 * e3), n2 = 0.4 * i2 * this._ampAt(t3, s4);
          return [r2 + cos(a2) * n2, r2 + sin(a2) * n2];
        }), { close: true }))), square: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.8 * i2 / SQRT2, a2 = (i2 - o2) / 2, n2 = 10 * sin(5e-4 * e3), h = 10 * cos(6e-4 * e3);
          this._traceParam(t3, ((e4, s4) => {
            const i3 = e4 / s4, [c, l] = ((t4) => t4 < 0.25 ? [a2 + o2 * (t4 / 0.25), a2] : t4 < 0.5 ? [a2 + o2, a2 + o2 * ((t4 - 0.25) / 0.25)] : t4 < 0.75 ? [a2 + o2 - o2 * ((t4 - 0.5) / 0.25), a2 + o2] : [a2, a2 + o2 - o2 * ((t4 - 0.75) / 0.25)])(i3);
            if (!e4) return [c, l];
            const _ = 0.8 + 0.2 * this._ampAt(t3, e4);
            return [r2 + (c - r2) * _ + n2, r2 + (l - r2) * _ + h];
          }), { close: true });
        })), butterfly: (t3, e3) => this._withCtx((() => this._traceParam(t3, ((s3, i2, r2, o2) => {
          const a2 = s3 / i2 * PI * 28 + 35e-5 * e3, n2 = pow(this._ampAt(t3, s3), 1.25), h = 0.22 * (Math.exp(0.85 * cos(a2)) - 1.6 * cos(5 * a2) + pow(sin(a2 / 10), 7)) * r2 * (0.5 + 0.5 * n2);
          return [o2 + sin(a2) * h, o2 + cos(a2) * h];
        }), { close: true }))), Bowditch: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.8 * i2 / 3, a2 = this._avgAbs(t3), n2 = 3 + 1.5 * sin(3e-4 * e3), h = 2 + 1.5 * cos(4e-4 * e3), c = 5e-4 * e3;
          this._traceParam(t3, ((e4, s4) => {
            const i3 = theta(e4, s4), l = a2 * (0.5 + 0.5 * this._samp(t3, e4));
            return [r2 + sin(n2 * i3 + c) * o2 * l, r2 + sin(h * i3) * o2 * l];
          }));
        })), spiro: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.6 * i2 / 3, a2 = 0.3 + 0.2 * sin(2e-4 * e3), n2 = 0.21 + 0.02 * sin(1e-4 * e3), h = (0.7 - a2) / a2;
          this._traceParam(t3, ((s4, i3) => {
            const c = theta(s4, i3), l = 0.8 + 0.2 * this._ampAt(t3, s4), _ = (o2 * (0.7 - a2) * cos(c) + o2 * a2 * cos(h * c + e3 * n2)) * l, p = (o2 * (0.7 - a2) * sin(c) - o2 * a2 * sin(h * c + e3 * n2)) * l;
            return [r2 + _, r2 + p];
          }));
        })), harmonograph: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.7 * i2 / 4;
          this._traceParam(t3, ((s4, i3) => {
            const a2 = theta(s4, i3), n2 = 0.7 * sin(3 * a2 + 3e-4 * e3) + 0.3 * sin(5 * a2 + 4e-4 * e3), h = 0.6 * sin(4 * a2 + 35e-5 * e3) + 0.4 * sin(6 * a2 + 25e-5 * e3), c = 0.5 + 0.5 * this._samp(t3, s4);
            return [r2 + o2 * n2 * c, r2 + o2 * h * c];
          }));
        })), rose: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.42 * i2, a2 = 3 + Math.round(4 * abs(sin(25e-5 * e3)));
          this._tracePolar(t3, ((e4, s4, i3) => o2 * cos(a2 * i3) * (0.65 + 0.35 * this._ampAt(t3, e4))), { phase: 35e-5 * e3, close: true });
        })), hypocycloid: s2("hypo"), epicycloid: s2("epi"), spiral: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.4 * i2;
          this._traceParam(t3, ((s4, i3) => {
            const a2 = s4 / i3 * TAU * 8 + 3e-4 * e3, n2 = o2 * (s4 / i3) * (1 + this._ampAt(t3, s4));
            return [r2 + cos(a2) * n2, r2 + sin(a2) * n2];
          }));
        })), star: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.45 * i2, a2 = 5 + Math.round(3 * abs(sin(2e-4 * e3)));
          this._tracePolar(t3, ((e4, s4, i3) => o2 * (0.5 * sin(a2 * i3) + 0.5) * (0.7 + 0.3 * this._ampAt(t3, e4))), { phase: 4e-4 * e3, close: true });
        })), flower: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.4 * i2, a2 = 6 + Math.round(2 * abs(cos(15e-5 * e3)));
          this._tracePolar(t3, ((e4, s4, i3) => o2 * (0.3 * cos(a2 * i3) + 0.7) * (0.6 + 0.4 * this._ampAt(t3, e4))), { phase: 3e-4 * e3, close: true });
        })), wave: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.6 * i2, a2 = t3.length, n2 = 3 + 2 * sin(2e-4 * e3);
          this._traceParam(t3, ((s4) => {
            const i3 = s4 / a2 * o2 - o2 / 2, h = sin(i3 * n2 / 50 + 1e-3 * e3) * o2 * 0.3 * this._ampAt(t3, s4);
            return [r2 + i3, r2 + h];
          }));
        })), mandala: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.35 * i2;
          this._tracePolar(t3, ((e4, s4, i3) => o2 * (0.8 + 0.3 * cos(6 * i3) + 0.2 * sin(12 * i3) + 0.1 * cos(18 * i3)) * (0.7 + 0.3 * this._ampAt(t3, e4))), { phase: 2e-4 * e3, close: true });
        })), infinity: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.4 * i2;
          this._traceParam(t3, ((s4, i3) => {
            const a2 = theta(s4, i3, 3e-4 * e3), n2 = 0.7 + 0.3 * this._ampAt(t3, s4), h = 1 + sin(a2) * sin(a2);
            return [r2 + o2 * cos(a2) / h * n2, r2 + o2 * sin(a2) * cos(a2) / h * n2];
          }));
        })), dna: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.3 * i2, a2 = t3.length, n2 = 0.8 * i2, h = (i3) => {
            s3.beginPath();
            for (let h2 = 0; h2 < a2; h2++) {
              const c = h2 / a2 * 4 * PI + i3 + 1e-3 * e3, l = 0.7 + 0.3 * this._ampAt(t3, h2), _ = r2 + cos(c) * o2 * l, p = r2 + (h2 / a2 - 0.5) * n2;
              h2 ? s3.lineTo(_, p) : s3.moveTo(_, p);
            }
            s3.stroke();
          };
          h(0), h(PI);
        })), tornado: (t3, e3) => this._withCtx(((s3, i2, r2) => {
          const o2 = 0.4 * i2;
          this._traceParam(t3, ((s4, a2) => {
            const n2 = s4 / a2, h = n2 * TAU * 6 + 5e-4 * e3, c = o2 * (1 - n2) * (0.6 + 0.4 * this._ampAt(t3, s4));
            return [r2 + cos(h) * c, r2 + (n2 - 0.5) * i2 * 0.7];
          }));
        })) };
      }
      listShapes() {
        return Object.keys(this.drawFuncs).filter(((t2) => "hum" !== t2));
      }
      connectedCallback() {
        this._animId || (this._animId = requestAnimationFrame(this._animate));
        try {
          this._ro = new ResizeObserver(this._resizeCanvas), this._ro.observe(this);
        } catch {
          this._resizeCanvas();
        }
        this._resizeCanvas();
      }
      disconnectedCallback() {
        if (this._animId && (cancelAnimationFrame(this._animId), this._animId = null), this._ro) {
          try {
            this._ro.disconnect();
          } catch {
          }
          this._ro = null;
        }
      }
      _resizeCanvas() {
        const { width: t2, height: e2 } = this.getBoundingClientRect?.() ?? { width: this._cssW, height: this._cssH }, s2 = max(1, 0 | t2), i2 = max(1, 0 | e2), r2 = min(4, max(1, window.devicePixelRatio || 1));
        if (s2 === this._cssW && i2 === this._cssH && r2 === this._dpr) return;
        this._cssW = s2, this._cssH = i2, this._dpr = r2;
        const o2 = max(1, Math.round(s2 * r2)), a2 = max(1, Math.round(i2 * r2)), n2 = this._canvas;
        n2.width !== o2 && (n2.width = o2), n2.height !== a2 && (n2.height = a2);
        const h = this._ctx;
        h.setTransform(1, 0, 0, 1, 0, 0), h.clearRect(0, 0, o2, a2), h.setTransform(r2, 0, 0, r2, 0, 0);
      }
      _getSeed() {
        return this.preset?.seed ?? this.closest?.("osc-app")?.getAttribute?.("seed") ?? document.documentElement?.dataset?.seed ?? "default";
      }
      _makeSeedBuffer(t2, e2, s2 = 2048) {
        const i2 = `${e2}_${t2}`;
        let r2 = 0;
        for (let t3 = 0; t3 < i2.length; t3++) r2 = (r2 << 5) - r2 + i2.charCodeAt(t3);
        let o2 = 0 | r2;
        const n2 = () => {
          o2 = o2 + 1831565813 | 0;
          let t3 = imul(o2 ^ o2 >>> 15, 1 | o2);
          return t3 = t3 + imul(t3 ^ t3 >>> 7, 61 | t3) ^ t3, ((t3 ^ t3 >>> 14) >>> 0) / 4294967296;
        }, h = new Float32Array(s2), c = a[t2] || a.circle;
        for (let t3 = 0; t3 < s2; t3++) {
          const e3 = t3 / s2;
          let i3 = 0;
          for (let t4 = 0; t4 < c.harmonics.length; t4++) {
            const s3 = c.freq * (t4 + 1);
            i3 += c.harmonics[t4] * sin(TAU * s3 * e3 + n2() * TAU);
          }
          const r3 = c.complexity * (n2() - 0.5) * 0.3, o3 = 0.5 + 0.5 * sin(TAU * e3 * 0.1 + n2() * TAU);
          h[t3] = (i3 + r3) * o3 * 0.7;
        }
        return h;
      }
      _selectData() {
        if (this.isAudioStarted && this.isPlaying && this.analyser) {
          const t2 = this.analyser.fftSize;
          return this._liveBuffer && this._liveBuffer.length === t2 || (this._liveBuffer = new Float32Array(t2)), this.analyser.getFloatTimeDomainData(this._liveBuffer), this._liveBuffer;
        }
        if (this.preset && "seed" === this.mode) {
          const t2 = this.preset?.seed ?? this._getSeed(), e2 = this.shapeKey || "circle";
          return this.preset._seedBuffers ||= {}, this.preset._seedBuffers[e2] ||= this._makeSeedBuffer(e2, t2);
        }
        if (!this._dummyData) {
          const t2 = 2048, e2 = new Float32Array(t2);
          for (let s2 = 0; s2 < t2; s2++) {
            const i2 = s2 / t2;
            e2[s2] = 0.5 * sin(TAU * i2) + 0.3 * sin(2 * TAU * i2 + PI / 3);
          }
          this._dummyData = e2;
        }
        return this._dummyData;
      }
      _prob(e2) {
        const s2 = parseFloat(this.getAttribute?.(e2) || ""), i2 = Number.isFinite(s2) ? s2 : t.PROB[e2];
        return min(1, max(0, i2));
      }
      _weights(t2, e2) {
        const s2 = ((t3, e3, s3) => {
          try {
            const i2 = t3?.getAttribute?.(e3);
            if (!i2) return s3;
            const r2 = JSON.parse(i2);
            return r2 && "object" == typeof r2 ? r2 : s3;
          } catch {
            return s3;
          }
        })(this, e2, t2);
        return { ...t2, ...s2 };
      }
      _getColorWeights() {
        return this._weights(t.COLOR_WEIGHTS, "color-weights");
      }
      _getDarkColorWeights() {
        return this._weights(t.DARK_COLOR_WEIGHTS, "dark-color-weights");
      }
      _getNeutralColorWeights() {
        return this._weights(t.NEUTRAL_COLOR_WEIGHTS, "neutral-color-weights");
      }
      _getEffectWeights() {
        return this._weights(t.EFFECT_WEIGHTS, "effect-weights");
      }
      _getSpeedWeights() {
        return this._weights(t.CYC_SPEED_WEIGHTS, "cycle-speed-weights");
      }
      _ensurePlan() {
        const a2 = this.preset?.seed ?? this._getSeed(), n2 = this._prob("mono-prob"), h = this._prob("half-dominant-prob"), c = this._prob("group-strobe-prob"), l = this._prob("dark-palette-prob"), _ = this._prob("neutral-palette-prob"), p = this._getColorWeights(), m = this._getEffectWeights(), d = this._getSpeedWeights(), u = this._getDarkColorWeights(), g2 = this._getNeutralColorWeights(), f = this._plan;
        if (!(!f || f.seed !== a2 || JSON.stringify(f.colorWeights) !== JSON.stringify(p) || JSON.stringify(f.effectWeights) !== JSON.stringify(m) || JSON.stringify(f.speedWeights) !== JSON.stringify(d) || JSON.stringify(f.darkWeights) !== JSON.stringify(u) || JSON.stringify(f.neutralWeights) !== JSON.stringify(g2) || f.monoProb !== n2 || f.halfDomProb !== h || f.groupStrobeProb !== c || f.darkProb !== l || f.neutralProb !== _)) return;
        const y = s(`${a2}::mode::mono`)() < n2, b = s(`${a2}::mode::neutral`), w = !y && b() < _, C = s(`${a2}::mode::dark`), S = !y && !w && C() < l, A = s(`${a2}::mode::half`), k = !y && A() < h, x = s(`${a2}::mode::gStrobe`)() < c, F = x && s(`${a2}::mode::gStrobeType`)() < 0.5;
        let P = w ? r(g2, e) : S ? r(u, Object.keys(u)) : { ...p };
        Object.keys(P).length || (P = { ...p });
        const E = y ? i(s(`${a2}::monoColorPick`), P) : null;
        let O = null, T = /* @__PURE__ */ new Set();
        if (k) {
          O = i(s(`${a2}::halfColorPick`), P);
          const e2 = Object.keys(this.drawFuncs), r2 = max(1, Math.round(e2.length * t.HALF_DOMINANT_RATIO));
          T = new Set(o(s(`${a2}::halfSubset`), e2, r2));
        }
        const v = {}, W = {}, D = {}, I = Object.keys(this.drawFuncs);
        for (const e2 of I) {
          const r2 = y ? E : k && T.has(e2) ? O : i(s(`${a2}::color::${e2}`), P);
          v[e2] = r2, "cycler" === r2 && (W[e2] = i(s(`${a2}::speed::${e2}`), d));
          const o2 = s(`${a2}::effect::${e2}`);
          D[e2] = i(o2, t.EFFECT_WEIGHTS) ?? "none";
          const n3 = i(o2, m);
          n3 && (D[e2] = n3);
        }
        let R = /* @__PURE__ */ new Set();
        if (x) {
          if (F) R = new Set(I);
          else {
            const t2 = 0.5 + 0.5 * s(`${a2}::gStrobe::size`)(), e2 = max(1, Math.round(I.length * t2));
            R = new Set(o(s(`${a2}::gStrobe::subset`), I, e2));
          }
          for (const t2 of R) D[t2] = "strobe";
        }
        this._plan = { seed: a2, monoProb: n2, halfDomProb: h, groupStrobeProb: c, darkProb: l, neutralProb: _, isMono: y, isHalf: k, isDarkPalette: S, isNeutralPalette: w, colorUniformKey: E, halfDominantKey: O, halfDominantSet: T, colorWeights: p, effectWeights: m, speedWeights: d, darkWeights: u, neutralWeights: g2, perShapeColorKey: v, perShapeCyclerSpeedKey: W, perShapeEffectKey: D, isGroupStrobe: x, groupStrobeAll: F, groupStrobeSet: R };
      }
      _getColorFor(e2, s2) {
        this._ensurePlan();
        const i2 = this._plan.perShapeColorKey[e2] || "bitcoin_orange";
        if ("cycler" === i2) {
          const r2 = this._plan.perShapeCyclerSpeedKey[e2] || "medium";
          return { css: `hsl(${s2 * (t.CYCLER_SPEEDS[r2] ?? t.CYCLER_SPEEDS.medium) % 360},85%,60%)`, key: i2, speedKey: r2 };
        }
        return { css: t.NAMED_COLORS[i2] || "#FFFFFF", key: i2, speedKey: null };
      }
      _getEffectFor(t2) {
        return this._ensurePlan(), this._plan.perShapeEffectKey[t2] || "none";
      }
      _animate() {
        const t2 = performance.now();
        this._resizeCanvas();
        const e2 = this._selectData(), { css: s2 } = this._getColorFor(this.shapeKey, t2), i2 = this._getEffectFor(this.shapeKey);
        if (this._prepareStroke(s2, { effect: i2, now: t2 }), (this.drawFuncs[this.shapeKey] || this.drawFuncs.circle)(e2, t2, this.preset ?? {}), "function" == typeof this.onIndicatorUpdate) {
          this.isAudioStarted && this.isPlaying;
        }
        this._animId = requestAnimationFrame(this._animate);
      }
    }
    customElements.define("scope-canvas", n);
  })();

  // js/path-rec-app.js
  var PathRecApp = class extends HTMLElement {
    constructor() {
      super(), this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:none}</style>", this._armed = this._isRecording = this._isPlaying = false, this._loop = false, this._showOverlay = true, this._recording = null, this._points = [], this._t0 = this._lastSampleT = this._playIdx = this._playT0 = this._raf = 0;
      for (const t of ["arm", "disarm", "clear", "play", "stop", "getRecording", "inputPointer", "renderOverlay", "setLoop"]) this[t] = this[t].bind(this);
    }
    arm() {
      this._armed || (this._armed = true, this._showOverlay = true, this._dispatch("fr-armed"));
    }
    disarm() {
      this._armed && (this._isRecording && this._endRecording(performance.now()), this._armed = false, this._showOverlay = false, this._dispatch("fr-disarmed"));
    }
    clear() {
      this.stop(), this._recording = null, this._points = [], this._dispatch("fr-cleared");
    }
    getRecording() {
      return this._recording ? { points: this._recording.points.slice(), duration: this._recording.duration } : null;
    }
    play(t, i = {}) {
      if (this._loop = !!i.loop, this._isPlaying) return;
      const s = t || this._recording;
      if (!s?.points?.length) return;
      t && (this._recording = t), this._isPlaying = true, this._playIdx = 0, this._playT0 = performance.now(), this._dispatch("fr-play-started");
      const e = s.points[0];
      e && this._emitPlayInput({ x: e.x, y: e.y, t: 0, type: e.type || "down" });
      const n = () => {
        if (!this._isPlaying) return;
        const t2 = performance.now() - this._playT0, i2 = s.points;
        for (; this._playIdx < i2.length && i2[this._playIdx].t <= t2; ) this._emitPlayInput(i2[this._playIdx++]);
        const e2 = this._interpAtTime(s, t2);
        if (e2 && this._emitPlayInput({ x: e2.x, y: e2.y, t: t2, type: "move", _interp: true }), t2 >= s.duration) {
          const t3 = i2[i2.length - 1];
          if ("up" !== t3.type && this._emitPlayInput({ x: t3.x, y: t3.y, t: s.duration, type: "up" }), this._loop) {
            this._dispatch("fr-play-loop"), this._playIdx = 0, this._playT0 = performance.now();
            const t4 = i2[0];
            t4 && this._emitPlayInput({ x: t4.x, y: t4.y, t: 0, type: t4.type || "down" }), this._raf = requestAnimationFrame(n);
          } else this.stop();
        } else this._raf = requestAnimationFrame(n);
      };
      this._raf = requestAnimationFrame(n);
    }
    stop() {
      this._isPlaying && (cancelAnimationFrame(this._raf), this._isPlaying = false, this._dispatch("fr-play-stopped"));
    }
    setLoop(t) {
      this._loop = !!t;
    }
    inputPointer(t, i, s, e) {
      if (!this._armed) return;
      i = clamp01(i), s = clamp01(s);
      const n = e ?? performance.now();
      if ("down" !== t || this._isRecording || this._beginRecording(n), !this._isRecording) return;
      const r = n - this._t0;
      this._points.push({ x: i, y: s, t: r, type: t }), this._lastSampleT = r, "up" === t && this._endRecording(n);
    }
    renderOverlay(t, i = performance.now()) {
      if (!(this._showOverlay || this._isPlaying && this._recording)) return;
      const s = this._isRecording ? { points: this._points } : this._recording, e = s?.points?.length > 0, { canvas: n } = t;
      if (t.save(), this._showOverlay && e && (t.lineWidth = 3, t.lineJoin = "round", t.lineCap = "round", t.shadowBlur = 15, t.shadowColor = "#00ffff80", t.strokeStyle = "#00ffff", t.beginPath(), this._drawPath(t, s.points, n), t.stroke(), t.shadowBlur = 5, t.shadowColor = "#00ffff", t.lineWidth = 2, t.stroke()), this._isPlaying && this._recording) {
        const s2 = i - this._playT0, e2 = this._interpAtTime(this._recording, s2);
        if (e2) {
          const s3 = e2.x * n.width, r = e2.y * n.height, o = 0.8 + 0.2 * Math.sin(i / 100), h = 0.7 + 0.3 * Math.sin(i / 150);
          t.beginPath(), t.arc(s3, r, 10 * o, 0, 2 * Math.PI), t.fillStyle = `hsl(300,100%,${70 + 10 * h}%)`, t.fill(), t.shadowBlur = 15 * h, t.shadowColor = "#ff00ff", t.strokeStyle = "#ff00ff", t.lineWidth = 2, t.stroke();
        }
      }
      t.restore();
    }
    _beginRecording(t) {
      this.stop(), this._isRecording = true, this._points = [], this._t0 = t, this._lastSampleT = 0, this._dispatch("fr-record-started");
    }
    _endRecording(t) {
      if (!this._isRecording) return;
      const i = Math.max(1, Math.round(t - this._t0));
      0 === this._points.length && this._points.push({ x: 0.5, y: 0.5, t: 0, type: "down" });
      const s = this._points[this._points.length - 1];
      "up" !== s.type && this._points.push({ x: s.x, y: s.y, t: i, type: "up" }), this._recording = { points: this._points.slice(), duration: i }, this._isRecording = false, this._dispatch("fr-record-stopped", { duration: i }), this._armed && (this._armed = false, this._showOverlay = false, this._dispatch("fr-disarmed")), this.play(this._recording, { loop: this._loop });
    }
    _drawPath(t, i, s) {
      for (let e = 0; e < i.length; e++) {
        const n = i[e], r = n.x * s.width, o = n.y * s.height;
        0 === e ? t.moveTo(r, o) : t.lineTo(r, o);
      }
    }
    _interpAtTime(t, i) {
      const s = t.points;
      if (!s.length) return null;
      if (i <= s[0].t) return { x: s[0].x, y: s[0].y };
      if (i >= t.duration) {
        const t2 = s[s.length - 1];
        return { x: t2.x, y: t2.y };
      }
      for (let t2 = 1; t2 < s.length; t2++) {
        const e2 = s[t2 - 1], n = s[t2];
        if (i <= n.t) {
          const t3 = (i - e2.t) / (n.t - e2.t || 1);
          return { x: e2.x + (n.x - e2.x) * t3, y: e2.y + (n.y - e2.y) * t3 };
        }
      }
      const e = s[s.length - 1];
      return { x: e.x, y: e.y };
    }
    _emitPlayInput(t) {
      this._dispatch("fr-play-input", { x: t.x, y: t.y, t: t.t, type: t.type });
    }
    _dispatch(t, i) {
      this.dispatchEvent(new CustomEvent(t, { detail: i, bubbles: true, composed: true }));
    }
  };
  customElements.define("path-rec-app", PathRecApp);

  // js/osc-app.js
  var OscControls = class extends HTMLElement {
    constructor() {
      super();
      const e = this.attachShadow({ mode: "open" }), t = (e2, t2) => this.dispatchEvent(new CustomEvent(e2, { detail: t2, bubbles: true, composed: true }));
      e.innerHTML = '\n      <style>\n        :host{display:block}\n        #controls{display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap;justify-content:center;padding:.7rem 1.2rem;background:rgba(255,255,255,.07);border-radius:9px;width:95%;max-width:980px;margin:.9rem auto 0;box-sizing:border-box}\n        .seed{display:flex;align-items:center;gap:.55rem;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}\n        .seed label{font-size:.95rem;color:#ffe7b3;letter-spacing:.02em}\n        .seed input{font-family:inherit;font-size:.98rem;color:#ffecb3;background:#1c1d22;border:1px solid #3c3f48;border-radius:6px;padding:.38rem .55rem;width:15ch;letter-spacing:.04em}\n        .seed button{padding:.42rem .8rem;border-radius:6px;border:1px solid #665;background:#221;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:.95rem;transition:background .18s}\n        .seed button:hover{background:#2c1f1f}\n        .vol{display:flex;align-items:center;gap:.55rem;min-width:190px;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}\n        .vol label{font-size:.95rem;color:#cfe3ff;letter-spacing:.02em}\n        .vol input[type="range"]{-webkit-appearance:none;appearance:none;width:140px;height:4px;background:#3a3f4a;border-radius:999px;outline:none}\n        .vol input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;box-shadow:0 0 6px #46ad6d55;cursor:pointer}\n        .vol input[type="range"]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;cursor:pointer}\n        .vol #volVal{font-size:.92rem;color:#9df5c2;min-width:3.5ch;text-align:right}\n        button,select{padding:.53em 1.17em;border-radius:6px;border:1px solid #555;background:#242;color:#fff;font-size:1rem;cursor:pointer;font-family:inherit;font-weight:500;transition:background .19s,color .19s,box-shadow .19s,transform .06s ease;box-shadow:0 0 0 #0000;will-change:transform}\n        button:active{transform:translateY(1px)}\n        button:focus{outline:2px solid #7af6ff;outline-offset:1px}\n        button:hover{background:#454}\n        #startBtn.power-off{background:#451015;color:#e97c90;border-color:#89232a;box-shadow:0 0 4px #ff505011,0 0 0 #0000;text-shadow:none;filter:brightness(.95)}\n        #startBtn.power-on{background:#ff2a39;color:#fff;border-color:#ff4e6a;box-shadow:0 0 18px 5px #ff2a3999,0 0 4px #ff748499;text-shadow:0 1px 3px #8d2025cc,0 0 10px #fff7;filter:brightness(1.1) saturate(1.2)}\n        #startBtn:not(.ready){opacity:.7}\n        #muteBtn.muted{background:#a51427;color:#fff;border-color:#ff506e;box-shadow:0 0 12px #ff506e66;text-shadow:0 1px 2px #320a0b}\n        #audioSigBtn{background:#2a4d3a;color:#7af6ff;border-color:#4a7c59;box-shadow:0 0 8px #7af6ff33}\n        #audioSigBtn:hover{background:#3a5d4a;box-shadow:0 0 12px #7af6ff55}\n        #audioSigBtn:disabled{background:#1a2d2a;color:#4a6c59;box-shadow:none}\n        .toggle{position:relative;background:#23252b;border-color:#4e5668;color:#cfe3ff;box-shadow:inset 0 -1px 0 #0004,0 0 0 #0000}\n        .toggle:hover{background:#2b2f38}\n        .toggle[aria-pressed="true"]{background:#1f3a26;color:#9df5c2;border-color:#46ad6d;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33;text-shadow:0 1px 2px #0b1a10aa}\n        #loopBtn.toggle[aria-pressed="true"]{background:#173a2a;border-color:#35d08e;box-shadow:0 0 12px #35d08e55,inset 0 0 0 1px #35d08e33}\n        #sigModeBtn.toggle[aria-pressed="true"]{background:#1f2a3f;border-color:#7aa2ff;color:#cfe0ff;box-shadow:0 0 12px #7aa2ff55,inset 0 0 0 1px #7aa2ff33}\n        #latchBtn.toggle[aria-pressed="true"]{background:#1f3a26;border-color:#46ad6d;color:#9df5c2;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33}\n        /* Auditioning Controls Styles */\n        #auditionControls{display:flex;gap:.5rem;border-left:2px solid #555;padding-left:1rem;margin-left:.5rem}\n        #approveBtn{background:#141;color:#8f8;border-color:#383}\n        #approveBtn:hover{background:#252}\n        #rejectBtn{background:#411;color:#f88;border-color:#833}\n        #rejectBtn:hover{background:#522}\n        #approvedSeedsWrapper{width:100%;margin-top:.8rem;display:none}\n        #approvedSeedsWrapper label{color:#ffe7b3;font-size:.9rem;display:block;margin-bottom:.3rem}\n        #approvedSeedsList{width:100%;box-sizing:border-box;height:80px;background:#1c1d22;border:1px solid #3c3f48;color:#9f8;font-family:monospace;resize:vertical;padding:.4rem .6rem;border-radius:6px}\n        @media (max-width:430px){#controls{gap:.5rem;padding:.55rem .8rem}button,select{padding:.42em .8em;font-size:.93rem}.vol{min-width:160px}.vol input[type="range"]{width:120px}.seed input{width:11ch}}\n        @media (max-width:380px){#controls{gap:.45rem;padding:.5rem .7rem}button,select{padding:.4em .72em;font-size:.9rem}.vol{min-width:150px}.vol input[type="range"]{width:110px}.seed label{display:none}}\n        button:disabled,select:disabled{opacity:.5;pointer-events:none}\n        .vol:has(input:disabled){opacity:.5;pointer-events:none}\n      </style>\n      <div id="controls">\n        <button id="startBtn" title="Click to initialize audio">POWER ON</button>\n        <button id="muteBtn">Mute</button>\n        <select id="shapeSelect"></select>\n        <button id="seqBtn">Create Sequence</button>\n        <button id="audioSigBtn">Audio Signature</button>\n        <button id="latchBtn" class="toggle" aria-pressed="false">Latch: Off</button>\n        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>\n        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>\n        <div id="volWrap" class="vol" title="Master Volume">\n          <label for="vol">Vol</label>\n          <input id="vol" type="range" min="0" max="100" step="1" value="10"/>\n          <span id="volVal">10%</span>\n        </div>\n        <form id="seedForm" class="seed" autocomplete="off">\n          <label for="seedInput">Seed</label>\n          <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"/>\n          <button id="seedSetBtn" type="submit">Set Seed</button>\n        </form>\n        <!-- MODIFIED START: Seed Auditioning Controls -->\n        <div id="auditionControls">\n            <button id="nextSeedBtn" title="Load the next seed from the CSV list">Next Seed</button>\n            <button id="approveBtn" title="Save this seed to the list and play the next one">\u2705</button>\n            <button id="rejectBtn" title="Discard this seed and play the next one">\u274C</button>\n        </div>\n        <!-- MODIFIED END -->\n        <!-- Freestyle Path Recorder Buttons -->\n        <button id="frReadyBtn" class="toggle" aria-pressed="false" title="Freestyle Record-Ready (R)">FR Ready</button>\n        <button id="frPlayBtn" disabled title="Play Freestyle Recording (Shift+R)">FR Play</button>\n        <!-- Save/Load Buttons -->\n        <button id="saveBtn" title="Save entire sequencer state to clipboard as JSON">Save State</button>\n        <button id="loadBtn" title="Load sequencer state from JSON data">Load State</button>\n      </div>\n      <!-- MODIFIED START: Approved Seeds List Display -->\n      <div id="approvedSeedsWrapper">\n        <label for="approvedSeedsList">Approved Seeds:</label>\n        <textarea id="approvedSeedsList" readonly spellcheck="false"></textarea>\n      </div>\n      <!-- MODIFIED END -->', this._startBtn = byId(e, "startBtn"), this._muteBtn = byId(e, "muteBtn"), this._shapeSelect = byId(e, "shapeSelect"), this._seqBtn = byId(e, "seqBtn"), this._audioSigBtn = byId(e, "audioSigBtn"), this._latchBtn = byId(e, "latchBtn"), this._loopBtn = byId(e, "loopBtn"), this._sigModeBtn = byId(e, "sigModeBtn"), this._vol = byId(e, "vol"), this._volVal = byId(e, "volVal"), this._seedForm = byId(e, "seedForm"), this._seedInput = byId(e, "seedInput"), this._nextSeedBtn = byId(e, "nextSeedBtn"), this._approveBtn = byId(e, "approveBtn"), this._rejectBtn = byId(e, "rejectBtn"), this._approvedSeedsWrapper = byId(e, "approvedSeedsWrapper"), this._approvedSeedsList = byId(e, "approvedSeedsList"), this._allControls = [this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol], this._frReadyBtn = byId(e, "frReadyBtn"), this._frPlayBtn = byId(e, "frPlayBtn"), this._saveBtn = byId(e, "saveBtn"), this._loadBtn = byId(e, "loadBtn"), this._allControls.push(this._frReadyBtn, this._frPlayBtn, this._saveBtn, this._loadBtn), this._allControls.push(this._nextSeedBtn, this._approveBtn, this._rejectBtn), addEvents(this._frReadyBtn, [["click", () => t("fr-toggle")]]), addEvents(this._frPlayBtn, [["click", () => t("fr-play")]]), addEvents(this._saveBtn, [["click", () => t("save-state")]]), addEvents(this._loadBtn, [["click", () => t("load-state")]]), addEvents(this._startBtn, [["click", () => t("start-request")]]), addEvents(this._muteBtn, [["click", () => t("mute-toggle")]]), addEvents(this._shapeSelect, [["change", () => t("shape-change", { shapeKey: this._shapeSelect.value })]]), addEvents(this._seqBtn, [["click", () => t("toggle-sequencer")]]), addEvents(this._audioSigBtn, [["click", () => t("audio-signature")]]), addEvents(this._latchBtn, [["click", () => t("latch-toggle")]]), addEvents(this._loopBtn, [["click", () => t("loop-toggle")]]), addEvents(this._sigModeBtn, [["click", () => t("signature-mode-toggle")]]), addEvents(this._vol, [["input", () => t("volume-change", { value: Number(this._vol.value) })]]), addEvents(this._seedForm, [["submit", (e2) => (e2.preventDefault(), t("seed-set", { value: (this._seedInput?.value || "").trim() }))]]), addEvents(this._nextSeedBtn, [["click", () => t("next-seed")]]), addEvents(this._approveBtn, [["click", () => t("approve-seed")]]), addEvents(this._rejectBtn, [["click", () => t("reject-seed")]]), this._helpers = { setPressed, setText };
    }
    setShapes(e) {
      const t = document.createDocumentFragment();
      for (const { value: s, label: o } of e ?? []) t.appendChild(Object.assign(document.createElement("option"), { value: s, textContent: o }));
      this._shapeSelect.replaceChildren(t);
    }
    setSeed(e) {
      this._seedInput && (this._seedInput.value = e ?? "");
    }
    disableAll(e) {
      setDisabledAll(this._allControls, e);
    }
    updateApprovedSeeds(e = []) {
      if (this._approvedSeedsWrapper && this._approvedSeedsList) {
        const t = e.length > 0;
        this._approvedSeedsWrapper.style.display = t ? "block" : "none", this._approvedSeedsList.value = t ? e.join("\n") : "", t && (this._approvedSeedsList.scrollTop = this._approvedSeedsList.scrollHeight), this.dispatchEvent(new Event("controls-resize"));
      }
    }
    updateState(e = {}) {
      const { setPressed: t, setText: s } = this._helpers, o = (e2, o2, n, i) => (t(e2, o2), s(e2, o2 ? n : i));
      if (isBool(e.isAudioSignaturePlaying) && o(this._audioSigBtn, e.isAudioSignaturePlaying, "Stop Signature", "Audio Signature"), isBool(e.isPlaying) && (s(this._startBtn, e.isPlaying ? "POWER OFF" : "POWER ON"), toggleClass(this._startBtn, "power-on", e.isPlaying), toggleClass(this._startBtn, "power-off", !e.isPlaying)), isBool(e.isAudioStarted) && (toggleClass(this._startBtn, "ready", e.isAudioStarted), setDisabledAll([this._muteBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol], !e.isAudioStarted)), isBool(e.isMuted) && (s(this._muteBtn, e.isMuted ? "Unmute" : "Mute"), toggleClass(this._muteBtn, "muted", e.isMuted)), e.shapeKey && (this._shapeSelect.value = e.shapeKey), isBool(e.sequencerVisible) && s(this._seqBtn, e.sequencerVisible ? "Hide Sequencer" : "Create Sequence"), isBool(e.isLoopEnabled) && o(this._loopBtn, e.isLoopEnabled, "Loop: On", "Loop: Off"), isBool(e.isSequenceSignatureMode) && o(this._sigModeBtn, e.isSequenceSignatureMode, "Signature Mode: On", "Signature Mode: Off"), isBool(e.isLatchOn) && o(this._latchBtn, !!e.isLatchOn, "Latch: On", "Latch: Off"), isNum(e.volume)) {
        const t2 = pct(e.volume);
        this._vol && (this._vol.value = String(t2)), this._volVal && (this._volVal.textContent = `${t2}%`);
      }
      isBool(e.sequencerVisible) && this.dispatchEvent(new Event("controls-resize"));
    }
  };
  customElements.define("osc-controls", OscControls);
  var OscApp = class extends HTMLElement {
    static get observedAttributes() {
      return ["seed"];
    }
    constructor() {
      super(), this.attachShadow({ mode: "open" }), this._heldKeys = /* @__PURE__ */ new Set(), this.humKey = "hum", this.humLabel = "Power Hum", this.shapes = ["circle", "square", "butterfly", "Bowditch", "spiro", "harmonograph", "rose", "hypocycloid", "epicycloid", "spiral", "star", "flower", "wave", "mandala", "infinity", "dna", "tornado"], this.shapeLabels = Object.fromEntries(this.shapes.map(((e2) => [e2, e2[0].toUpperCase() + e2.slice(1)]))), Object.assign(this, Engine(this), Signatures(this));
      const e = (this.getAttribute("seed") || "").trim(), t = (document.documentElement?.dataset?.seed || "").trim(), s = e || t || "default";
      this.state = this.defaultState(s), ["_onToneReady", "_onStartRequest", "_onMuteToggle", "_onShapeChange", "_onToggleSequencer", "_onAudioSignature", "_handleSeedSubmit", "_onSeqRecordStart", "_onSeqStepCleared", "_onSeqStepRecorded", "_onSeqPlayStarted", "_onSeqPlayStopped", "_onSeqStepAdvance", "_onSeqStepTimeChanged", "_onSeqStepsChanged", "_onLoopToggle", "_onSignatureModeToggle", "_onVolumeChange", "_onHotkeyPress", "_onHotkeyRelease", "_onHotkeyLoopToggle", "_onHotkeySignatureToggle", "_onLatchToggle", "_fitLayout", "_onWindowResize", "_onShapeStep", "_onHotkeyToggleSeqPlay", "_onHotkeyTogglePower", "_onToggleControls", "_initControlsVisibility", "_onFreestyleReadyToggle", "_onFreestylePlay", "_onSaveState", "_onLoadState", "_onNextSeed", "_onApproveSeed", "_onRejectSeed"].forEach(((e2) => this[e2] = this[e2].bind(this)));
    }
    _onToneReady() {
      const e = this.state;
      e.Tone = window.Tone, this.loadPresets(e.seed), this.bufferHumChain();
      const t = this.shapes[this._rng(e.seed)() * this.shapes.length | 0];
      e.uiHomeShapeKey = t, this._setCanvas({ preset: e.presets[t], shapeKey: t, mode: "seed" }), e.current = this.humKey, this._controls.disableAll?.(false);
      const s = e.Tone?.Destination?.volume;
      s && (s.value = this._linToDb(e.volume)), this._updateControls(), this._fitLayout();
    }
    attributeChangedCallback(e, t, s) {
      if ("seed" !== e) return;
      const o = (s || "").trim();
      !o || o === this.state.seed || this.resetToSeed(o);
    }
    defaultState(e = "default") {
      return { isPlaying: false, contextUnlocked: false, initialBufferingStarted: false, initialShapeBuffered: false, Tone: null, chains: {}, current: null, isMuted: false, isLoopEnabled: false, volume: 0.2, isSequencerMode: false, isRecording: false, currentRecordSlot: -1, sequence: Array(8).fill(null), velocities: Array(8).fill(1), sequencePlaying: false, sequenceIntervalId: null, sequenceStepIndex: 0, stepTime: 200, _seqFirstCycleStarted: false, sequenceSteps: 8, isSequenceSignatureMode: false, signatureSequencerRunning: false, audioSignaturePlaying: false, audioSignatureTimer: null, audioSignatureStepIndex: 0, audioSignatureOnComplete: null, isLatchOn: false, seed: e, presets: {}, uiHomeShapeKey: null, _transientOverride: false, isFreestyleMode: false, isFreestyleRecording: false, freestyleRecording: null, freestylePlayback: false, approvedSeeds: [], seedList: [], seedListIndex: 0, seedListLoaded: false };
    }
    connectedCallback() {
      const e = this.createElement?.bind(this) ?? ((e2, t2 = {}) => {
        const s2 = document.createElement(e2);
        for (const e3 in t2) "textContent" === e3 ? s2.textContent = t2[e3] : s2.setAttribute(e3, t2[e3]);
        return s2;
      }), t = e("div", { id: "appWrapper" }), s = this._main = e("div", { id: "main" }), o = this._canvasContainer = e("div", { id: "canvasContainer" });
      this._canvas = e("scope-canvas"), o.appendChild(this._canvas), this._setupCanvasClickGrid(), this._renderPowerOverlay(), this._controls = e("osc-controls");
      const n = [{ value: this.humKey, label: this.humLabel }, ...this.shapes.map(((e2) => ({ value: e2, label: this.shapeLabels[e2] || e2 })))];
      this._controls.setShapes(n), this._hotkeys = e("osc-hotkeys"), this._hotkeys.setConfig({ humKey: this.humKey, shapes: this.shapes }), s.appendChild(this._hotkeys), addEvents(this._hotkeys, [["hk-press", this._onHotkeyPress], ["hk-release", this._onHotkeyRelease], ["hk-toggle-loop", this._onHotkeyLoopToggle], ["hk-toggle-signature", this._onHotkeySignatureToggle], ["hk-shape-step", this._onShapeStep], ["hk-toggle-mute", this._onMuteToggle], ["hk-toggle-sequencer", this._onToggleSequencer], ["hk-audio-signature", this._onAudioSignature], ["hk-toggle-latch", this._onLatchToggle], ["hk-toggle-seq-play", this._onHotkeyToggleSeqPlay], ["hk-toggle-power", this._onHotkeyTogglePower], ["fr-toggle", this._onFreestyleReadyToggle], ["fr-play", this._onFreestylePlay]]), this._buildGridMap = () => {
        const e2 = (e3, t3) => `${e3},${t3}`, t2 = [[0, 0], [0, 4], [4, 0], [4, 4]], s2 = new Set(t2.map((([t3, s3]) => e2(t3, s3)))), o2 = [];
        for (let e3 = 0; e3 < 5; e3++) o2.push([0, e3]);
        for (let e3 = 1; e3 < 5; e3++) o2.push([e3, 4]);
        for (let e3 = 3; e3 >= 0; e3--) o2.push([4, e3]);
        for (let e3 = 3; e3 >= 1; e3--) o2.push([e3, 0]);
        const n2 = [];
        for (let e3 = 1; e3 <= 3; e3++) for (let t3 = 1; t3 <= 3; t3++) n2.push([e3, t3]);
        const i = /* @__PURE__ */ new Set(), a = [].concat(o2, n2).filter((([t3, o3]) => {
          const n3 = e2(t3, o3);
          return !s2.has(n3) && !i.has(n3) && (i.add(n3), true);
        })), r = this.shapes.slice(0, 18), d = /* @__PURE__ */ new Map();
        for (let t3 = 0; t3 < a.length; t3++) {
          const [s3, o3] = a[t3];
          d.set(e2(s3, o3), { type: "shape", shapeKey: r[t3 % r.length] });
        }
        t2.forEach((([t3, s3]) => d.set(e2(t3, s3), { type: "hum", shapeKey: this.humKey }))), this._grid25 = { map: d, cellInfo: (t3, s3) => d.get(e2(t3, s3)) || null };
      }, this._buildGridMap(), this._pathRec = document.createElement("path-rec-app"), this.shadowRoot.appendChild(this._pathRec), this._frLastCell = null, this._frCanvas = document.createElement("canvas"), Object.assign(this._frCanvas.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none" }), o.appendChild(this._frCanvas), this._frCtx = this._frCanvas.getContext("2d"), this._drawFrOverlay = () => {
        const e2 = this._frCtx;
        if (e2) {
          e2.clearRect(0, 0, this._frCanvas.width, this._frCanvas.height);
          try {
            (this.state?.isFreestyleMode || this.state?.freestylePlayback || this.state?.isFreestyleRecording) && this._pathRec?.renderOverlay(e2);
          } catch {
          }
        }
        requestAnimationFrame(this._drawFrOverlay);
      }, this._resizeFrCanvas(), requestAnimationFrame(this._drawFrOverlay), this._pathRec.addEventListener("fr-armed", (() => {
        this.state.isFreestyleMode = true, this._updateControls();
      })), this._pathRec.addEventListener("fr-disarmed", (() => {
        this.state.isFreestyleMode = false, this._updateControls();
      })), this._pathRec.addEventListener("fr-record-started", (() => {
        this.state.isFreestyleRecording = true, this._updateControls();
      })), this._pathRec.addEventListener("fr-record-stopped", (() => {
        this.state.isFreestyleRecording = false, this.state.freestyleRecording = this._pathRec.getRecording(), this._updateControls();
      })), this._pathRec.addEventListener("fr-cleared", (() => {
        this.state.freestyleRecording = null, this._updateControls();
      })), this._pathRec.addEventListener("fr-play-started", (() => {
        this.state.freestylePlayback = true, this._updateControls();
      })), this._pathRec.addEventListener("fr-play-stopped", (() => {
        this.state.freestylePlayback = false, this._updateControls(), this._frLastCell && (this._releaseCell(this._frLastCell), this._frLastCell = null);
      })), this._pathRec.addEventListener("fr-play-input", ((e2) => {
        const { x: t2, y: s2, type: o2 } = e2.detail || {}, n2 = this._cellFromNorm(t2, s2);
        this._handleFreestyleInput(n2, o2);
      })), this._sequencerComponent = e("seq-app"), this._sequencerComponent.style.display = "none", this._loader = e("div", { id: "loader", textContent: "..." }), s.append(o, this._controls, this._sequencerComponent, this._loader), t.append(s), this.shadowRoot.append(e("style", { textContent: this._style() }), e("tone-loader"), t), this._main.style.overflow = "hidden", this._controls.setSeed?.(this.state.seed), this.shadowRoot.querySelector("tone-loader").addEventListener("tone-ready", this._onToneReady), addEvents(this._controls, [["start-request", this._onStartRequest], ["mute-toggle", this._onMuteToggle], ["shape-change", this._onShapeChange], ["toggle-sequencer", this._onToggleSequencer], ["audio-signature", this._onAudioSignature], ["latch-toggle", this._onLatchToggle], ["loop-toggle", this._onLoopToggle], ["signature-mode-toggle", this._onSignatureModeToggle], ["volume-change", this._onVolumeChange], ["seed-set", this._handleSeedSubmit], ["controls-resize", this._fitLayout], ["fr-toggle", this._onFreestyleReadyToggle], ["fr-play", this._onFreestylePlay], ["save-state", this._onSaveState], ["load-state", this._onLoadState], ["next-seed", this._onNextSeed], ["approve-seed", this._onApproveSeed], ["reject-seed", this._onRejectSeed]]), this._canvas.onIndicatorUpdate = (e2) => {
        this._loader.textContent = this.state.isPlaying || this.state.contextUnlocked ? e2 : "Initializing...", this._fitLayout();
      }, this._seqPairs = [["seq-record-start", this._onSeqRecordStart], ["seq-step-cleared", this._onSeqStepCleared], ["seq-step-recorded", this._onSeqStepRecorded], ["seq-play-started", this._onSeqPlayStarted], ["seq-play-stopped", this._onSeqPlayStopped], ["seq-step-advance", this._onSeqStepAdvance], ["seq-step-time-changed", this._onSeqStepTimeChanged], ["seq-steps-changed", this._onSeqStepsChanged]], addEvents(this._sequencerComponent, this._seqPairs), this._fitLayout(), setTimeout(this._fitLayout, 50), setTimeout(this._fitLayout, 250), on(window, "resize", this._onWindowResize, { passive: true }), on(window, "orientationchange", this._onWindowResize, { passive: true });
      try {
        this._resizeObserver = new ResizeObserver(this._fitLayout), this._controls && this._resizeObserver.observe(this._controls), this._sequencerComponent && this._resizeObserver.observe(this._sequencerComponent);
        const e2 = this.shadowRoot.getElementById("loader");
        e2 && this._resizeObserver.observe(e2);
      } catch {
      }
    }
    _onToggleControls() {
      const e = this._controls;
      if (!e) return;
      const t = "none" === e.style.display;
      e.style.display = t ? "flex" : "none";
      try {
        this._fitLayout();
      } catch {
      }
      try {
        e.dispatchEvent(new Event("controls-resize"));
      } catch {
      }
    }
    _initControlsVisibility() {
      this._controls && (this._controls.style.display = "none"), this._hotkeys && this._hotkeys.addEventListener("hk-toggle-controls", this._onToggleControls);
    }
    disconnectedCallback() {
      if (removeEvents(this._hotkeys, [["hk-press", this._onHotkeyPress], ["hk-release", this._onHotkeyRelease], ["hk-toggle-loop", this._onHotkeyLoopToggle], ["hk-toggle-signature", this._onHotkeySignatureToggle], ["hk-shape-step", this._onShapeStep]]), this._sequencerComponent && removeEvents(this._sequencerComponent, this._seqPairs || []), this._resizeObserver) {
        try {
          this._resizeObserver.disconnect();
        } catch {
        }
        this._resizeObserver = null;
      }
      off(window, "resize", this._onWindowResize), off(window, "orientationchange", this._onWindowResize);
    }
    _updateControls(e = {}) {
      const t = this._controls;
      if (!t) return;
      const s = { ...this.state, ...e };
      s.contextUnlocked && this._removePowerOverlay(), "function" == typeof t.updateState && t.updateState(s), this.updateHkIcons?.(s), Object.prototype.hasOwnProperty.call(e, "sequencerVisible") && this._fitLayout();
      try {
        const { isFreestyleMode: e2, freestyleRecording: o, freestylePlayback: n } = s;
        t._frReadyBtn && setPressed(t._frReadyBtn, !!e2), t._frPlayBtn && (t._frPlayBtn.disabled = !o, setText(t._frPlayBtn, n ? "Stop" : "FR Play"));
      } catch {
      }
    }
    _style() {
      return "\n      :host{display:block;width:100%;height:100%}\n      #appWrapper{display:flex;flex-direction:column;height:100dvh;padding-bottom:env(safe-area-inset-bottom,0)}\n      #main{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;overflow:hidden;background:#000;gap:8px;padding-inline:env(safe-area-inset-left,0) env(safe-area-inset-right,0)}\n      #canvasContainer{flex:0 0 auto;max-width:100%;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;transform:none;margin-left:auto;margin-right:auto;aspect-ratio:1/1;box-sizing:border-box}\n      #loader{font-size:.95rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin:2px 0 8px}\n      @media (max-width:430px){:host{font-size:15px}}\n      @media (max-width:380px){:host{font-size:14px}}\n    ";
    }
    _safeInsetBottom() {
      try {
        const e = document.createElement("div");
        e.style.cssText = "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;", document.documentElement.appendChild(e);
        const t = parseFloat(getComputedStyle(e).paddingBottom) || 0;
        return e.remove(), t;
      } catch {
        return 0;
      }
    }
    _measureChromeHeights() {
      const e = this.shadowRoot;
      if (!e) return { controlsH: 0, loaderH: 0, seqH: 0 };
      const t = e.querySelector("osc-controls"), s = e.getElementById("loader"), o = this._sequencerComponent, n = (e2) => e2 ? e2.getBoundingClientRect().height : 0;
      return { controlsH: n(t), loaderH: n(s), seqH: o && "none" !== o.style.display ? n(o) : 0 };
    }
    _fitLayout() {
      try {
        const e = this._canvasContainer, t = this._canvas, s = this._main;
        if (!e || !t || !s) return;
        const o = Math.max(1, window.innerWidth || document.documentElement.clientWidth), n = Math.max(1, window.innerHeight || document.documentElement.clientHeight), { controlsH: i, loaderH: a, seqH: r } = this._measureChromeHeights(), d = Math.max(1, n - i - a - r - this._safeInsetBottom() - 10), l = Math.round(Math.max(1, Math.min(o, d)));
        Object.assign(e.style, { width: `${l}px`, height: `${l}px`, maxWidth: "100%", maxHeight: `calc(100dvh - ${i + a + r + this._safeInsetBottom() + 10}px)`, aspectRatio: "1 / 1", boxSizing: "border-box", left: "", transform: "" }), Object.assign(t.style, { width: "100%", height: "100%", aspectRatio: "1 / 1", display: "block", touchAction: "none" }), this._resizeFrCanvas?.();
      } catch (e) {
        console.warn("fitLayout failed", e);
      }
    }
    _onWindowResize() {
      this._fitLayout();
    }
    _onHotkeyToggleSeqPlay() {
      this.state.sequencePlaying ? this.stopSequence?.() : this.playSequence?.();
    }
    _onSeqPlayStarted(e) {
      const t = e?.detail?.stepTime, s = this.state;
      s.sequencePlaying = true, s.sequenceStepIndex = 0, s._seqFirstCycleStarted = false, "number" == typeof t && (s.stepTime = t), this._updateControls(), s.isSequenceSignatureMode && (this._sequencerComponent?.stopSequence(), this._startSignatureSequencer());
    }
    _onSeqPlayStopped() {
      const e = this.state;
      if (e.sequencePlaying = false, e.sequenceStepIndex = 0, e._seqFirstCycleStarted = false, e.signatureSequencerRunning && this._stopSignatureSequencer(), !e.isLatchOn) try {
        const e2 = this.humKey;
        this._updateControls({ shapeKey: e2 }), this._onShapeChange({ detail: { shapeKey: e2 } });
      } catch {
      }
      this._updateControls();
    }
    _onHotkeyTogglePower() {
      (this.state || {}).isPlaying ? this.stopAudioAndDraw?.() : this._onStartRequest?.();
    }
    _handleSeedSubmit(e) {
      const t = e?.detail?.value && String(e.detail.value).trim() || (this.getAttribute("seed") || "").trim() || (document.documentElement?.dataset?.seed || "").trim() || "default";
      !t || t === this.state.seed || (this.resetToSeed(t), this._controls.setSeed?.(t));
    }
    resetToSeed(e) {
      const { seedList: t, seedListIndex: s, seedListLoaded: o, approvedSeeds: n } = this.state;
      this.stopAudioAndDraw(), this.state.seed = e, this.setAttribute("seed", e), document?.documentElement && (document.documentElement.dataset.seed = e), this.loadPresets(e), this.resetState ? this.resetState() : this.state = this.defaultState(e), this.state.seedList = t, this.state.seedListIndex = s, this.state.seedListLoaded = o, this.state.approvedSeeds = n, this._controls.setSeed?.(e), this._loader.textContent = "Seed updated. Click POWER ON.", this._fitLayout();
    }
    _generateRandomSeed() {
      return Math.random().toString(36).substring(2, 10);
    }
    _onNextSeed() {
      const e = this._generateRandomSeed();
      this._loader.textContent = `Loading new random seed: ${e}...`, this.resetToSeed(e), setTimeout((() => {
        this._onStartRequest();
      }), 150);
    }
    _onApproveSeed() {
      const { seed: e, approvedSeeds: t } = this.state;
      e && !t.includes(e) && (this.state.approvedSeeds.push(e), this._controls.updateApprovedSeeds(this.state.approvedSeeds), console.log("Approved seeds:", this.state.approvedSeeds)), this._onNextSeed();
    }
    _onRejectSeed() {
      this._onNextSeed();
    }
    _renderPowerOverlay() {
      try {
        const e = this.state, t = this._canvasContainer || this._main || this.shadowRoot?.host || document.body;
        if (!t) return;
        if (e?.contextUnlocked) return void this._removePowerOverlay();
        if (this._powerOverlay) return;
        const s = Object.assign(document.createElement("div"), { id: "powerOverlay" });
        Object.assign(s.style, { position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "20", pointerEvents: "auto", background: "rgba(0,0,0,.55)", userSelect: "none", cursor: "pointer", fontFamily: "'Courier New', monospace" });
        const o = Object.assign(document.createElement("div"), { textContent: "Click to power on" });
        Object.assign(o.style, { padding: "14px 18px", border: "1px dashed rgba(255,255,255,.65)", borderRadius: "8px", fontSize: "18px", letterSpacing: ".06em", color: "#fff", background: "rgba(0,0,0,.25)", textShadow: "0 1px 2px rgba(0,0,0,.5)" }), s.appendChild(o);
        const n = this._canvasContainer || this._main;
        n && "static" === getComputedStyle(n).position && (n.style.position = "relative"), (this._canvasContainer || this._main || t).appendChild(s), this._powerOverlay = s, s.addEventListener("click", (() => this._onStartRequest?.()));
      } catch (e) {
        console.error("overlay error", e);
      }
    }
    _removePowerOverlay() {
      this._powerOverlay?.parentNode?.removeChild(this._powerOverlay), this._powerOverlay = null;
    }
    _setupCanvasClickGrid() {
      const e = this._canvas;
      if (!e || this._canvasClickGridSetup) return;
      this._canvasClickGridSetup = true;
      const t = (t2) => {
        const s2 = e.getBoundingClientRect(), o2 = Math.max(0, Math.min(s2.width, (t2.clientX ?? 0) - s2.left)), n = Math.max(0, Math.min(s2.height, (t2.clientY ?? 0) - s2.top)), i = Math.min(4, Math.max(0, Math.floor(o2 / (s2.width / 5)))), a = Math.min(4, Math.max(0, Math.floor(n / (s2.height / 5)))), r = this._grid25?.cellInfo(a, i);
        return { row: a, col: i, info: r, xNorm: s2.width > 0 ? o2 / s2.width : 0, yNorm: s2.height > 0 ? n / s2.height : 0 };
      }, s = (e2, t2, s2) => {
        const o2 = `r${e2}c${t2}`, n = s2?.shapeKey || this.humKey, i = n === this.humKey ? -1 : this.shapes.indexOf(n);
        this._heldKeys.add(o2);
        const a = { key: o2, idx: i, shapeKey: n, variant: s2?.variant || null };
        this._onHotkeyPress({ detail: a });
      }, o = (e2) => {
        this._onHotkeyRelease({ detail: { key: e2 } });
      };
      this._onCanvasPointerDown = (e2) => {
        if (this.state?.contextUnlocked) try {
          this._isCanvasPointerDown = true;
          try {
            e2.target?.setPointerCapture?.(e2.pointerId);
          } catch {
          }
          const { row: o2, col: n, info: i, xNorm: a, yNorm: r } = t(e2);
          if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) try {
            this._pathRec?.arm?.(), this._pathRec?.inputPointer?.("down", a, r, performance.now());
          } catch {
          }
          this._lastPointerKey = `r${o2}c${n}`, this._lastPointerInfo = i || null, s(o2, n, i);
        } catch (e3) {
          console.error("canvas grid down error", e3);
        }
        else {
          try {
            this.unlockAudioAndBufferInitial?.();
          } catch {
          }
          e2?.preventDefault?.();
        }
      }, this._onCanvasPointerMove = (e2) => {
        if (this._isCanvasPointerDown && this.state?.contextUnlocked) try {
          const { row: n, col: i, info: a, xNorm: r, yNorm: d } = t(e2);
          if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) try {
            this._pathRec?.inputPointer?.("move", r, d, performance.now());
          } catch {
          }
          const l = `r${n}c${i}`;
          if (l !== this._lastPointerKey) {
            const e3 = this._lastPointerKey;
            this._lastPointerKey = l, this._lastPointerInfo = a || null, e3 && o(e3), s(n, i, a);
          }
        } catch (e3) {
          console.error("canvas grid move error", e3);
        }
      }, this._onCanvasPointerUp = (t2) => {
        try {
          this._isCanvasPointerDown = false, t2?.target?.releasePointerCapture?.(t2.pointerId);
        } catch {
        }
        if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) try {
          const s3 = e.getBoundingClientRect(), o2 = Math.max(0, Math.min(s3.width, (t2?.clientX ?? 0) - s3.left)), n = Math.max(0, Math.min(s3.height, (t2?.clientY ?? 0) - s3.top)), i = s3.width > 0 ? o2 / s3.width : 0, a = s3.height > 0 ? n / s3.height : 0;
          this._pathRec?.inputPointer?.("up", i, a, performance.now());
        } catch {
        }
        if (!this._lastPointerKey) return;
        const s2 = this._lastPointerKey;
        this._lastPointerKey = null, this._lastPointerInfo = null, o(s2);
      }, this._onCanvasPointerCancel = () => {
        if (this._isCanvasPointerDown = false, this.state?.isFreestyleMode && !this.state?.isSequencerMode) try {
          this._pathRec?.inputPointer?.("up", 0, 0, performance.now());
        } catch {
        }
        if (this._lastPointerKey) {
          const e2 = this._lastPointerKey;
          this._lastPointerKey = null, this._lastPointerInfo = null, o(e2);
        }
      }, addEvents(e, [["pointerdown", this._onCanvasPointerDown], ["pointermove", this._onCanvasPointerMove], ["pointercancel", this._onCanvasPointerCancel], ["pointerleave", this._onCanvasPointerUp]]), on(window, "pointerup", this._onCanvasPointerUp);
    }
    _onHotkeyLoopToggle() {
      this._onLoopToggle();
    }
    _onHotkeySignatureToggle() {
      this._onSignatureModeToggle();
    }
    _onHotkeyPress({ detail: e }) {
      const t = this.state, { key: s, idx: o, shapeKey: n, variant: i } = e || {};
      if (!n) return;
      if (t._transientOverride = i || null, t.isSequenceSignatureMode) return void this._triggerSignatureFor(n, { loop: t.isLoopEnabled });
      this._heldKeys.add(s);
      const a = () => {
        this.setActiveChain(n), t._transientOverride && this.applyVariant?.(n, t._transientOverride), o >= 0 && this._setCanvas({ shapeKey: n, preset: t.presets[n], mode: "live" }), this._canvas.isPlaying = true, this._updateControls({ shapeKey: n }), t.current = n, n !== this.humKey && (t._uiReturnShapeKey = n);
      };
      t.isSequencerMode, t.contextUnlocked && t.initialShapeBuffered && a();
    }
    _onHotkeyRelease({ detail: e }) {
      const t = this.state, { key: s } = e || {};
      this._heldKeys?.has(s) && (this._heldKeys.delete(s), this._recordedThisHold?.delete?.(s), t._transientOverride && t.current && t.current !== this.humKey && this.applyVariant?.(t.current, null), t._transientOverride = null, !t.isLatchOn && t.contextUnlocked && t.initialShapeBuffered && (this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false }), this._canvas.isPlaying = false, t._uiReturnShapeKey ? this._updateControls({ shapeKey: t._uiReturnShapeKey }) : this._updateControls()));
    }
    _onShapeStep({ detail: e }) {
      const t = e?.direction;
      if (!t || !this.shapes.length) return;
      const s = this.state, o = this.shapes, n = s._uiReturnShapeKey || s.current;
      let i = o.indexOf(n);
      -1 === i && (i = 1 === t ? -1 : 0);
      const a = o[(i + t + o.length) % o.length];
      s.contextUnlocked && s.initialShapeBuffered && (this.setActiveChain(a), this._setCanvas({ shapeKey: a, preset: s.presets[a], mode: "live" }), this._canvas.isPlaying = true, this._updateControls({ shapeKey: a }), s.current = s._uiReturnShapeKey = a);
    }
    _onFreestyleReadyToggle() {
      const e = this.state || {}, t = !e.isFreestyleMode;
      e.isFreestyleMode = t;
      try {
        t ? this._pathRec?.arm?.() : this._pathRec?.disarm?.();
      } catch {
      }
      this._updateControls();
    }
    _onFreestylePlay() {
      const e = this.state || {};
      try {
        e.freestylePlayback ? this._pathRec?.stop?.() : e.freestyleRecording && this._pathRec?.play?.(e.freestyleRecording, { loop: !!e.isLoopEnabled });
      } catch {
      }
    }
    _cellFromNorm(e, t) {
      const s = Math.min(4, Math.max(0, Math.floor(5 * t))), o = Math.min(4, Math.max(0, Math.floor(5 * e)));
      return { row: s, col: o, info: this._grid25?.cellInfo(s, o) || null };
    }
    _resizeFrCanvas() {
      const e = this._frCanvas;
      if (!e) return;
      const t = (this._canvasContainer || this._canvas || e.parentElement).getBoundingClientRect(), s = Math.max(1, Math.round(window.devicePixelRatio || 1)), o = Math.max(1, Math.round(t.width * s)), n = Math.max(1, Math.round(t.height * s));
      e.width === o && e.height === n || (e.width = o, e.height = n, e.style.width = "100%", e.style.height = "100%");
    }
    _pressCell(e) {
      if (!e) return;
      const { row: t, col: s, info: o } = e, n = `r${t}c${s}`, i = o?.shapeKey || this.humKey, a = i === this.humKey ? -1 : this.shapes.indexOf(i);
      this._heldKeys.add(n);
      const r = { key: n, idx: a, shapeKey: i, variant: o?.variant || null };
      this._onHotkeyPress({ detail: r });
    }
    _releaseCell(e) {
      if (!e) return;
      const t = "string" == typeof e ? e : `r${e.row}c${e.col}`;
      this._onHotkeyRelease({ detail: { key: t } });
    }
    _handleFreestyleInput(e, t) {
      e && ("down" === t ? (!this._frLastCell || this._frLastCell.row === e.row && this._frLastCell.col === e.col || this._releaseCell(this._frLastCell), this._pressCell(e), this._frLastCell = e) : "move" === t ? this._frLastCell && this._frLastCell.row === e.row && this._frLastCell.col === e.col || (this._frLastCell && this._releaseCell(this._frLastCell), this._pressCell(e), this._frLastCell = e) : "up" === t && this._frLastCell && (this._releaseCell(this._frLastCell), this._frLastCell = null));
    }
    _onLatchToggle() {
      this.state.isLatchOn = !this.state.isLatchOn, this._updateControls();
      const e = this.state;
      e.isLatchOn || e.isSequencerMode || this._heldKeys?.size || !e.contextUnlocked || !e.initialShapeBuffered || (this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false }), this._canvas.isPlaying = false);
    }
    async _onSaveState() {
      try {
        const e = { ...this.state, Tone: void 0, chains: void 0, audioSignatureTimer: void 0, sequenceIntervalId: void 0, sequencerState: this._sequencerComponent ? { steps: this._sequencerComponent.steps, state: this._sequencerComponent.state } : null, pathRecorderState: this._pathRec ? { recording: this._pathRec.getRecording(), isArmed: this._pathRec._armed, loop: this._pathRec._loop } : null, uiState: { sequencerVisible: "none" !== this._sequencerComponent?.style.display, currentShapeKey: this.state.current, volume: this.state.volume }, saveTimestamp: (/* @__PURE__ */ new Date()).toISOString(), version: "v19.3" }, t = JSON.stringify(e, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(t), this._showNotification("State saved to clipboard successfully!", "success");
        else {
          const e2 = document.createElement("textarea");
          e2.value = t, document.body.appendChild(e2), e2.select(), document.execCommand("copy"), document.body.removeChild(e2), this._showNotification("State saved to clipboard (fallback method)", "success");
        }
        console.log("Saved state:", e);
      } catch (e) {
        console.error("Error saving state:", e), this._showNotification("Error saving state: " + e.message, "error");
      }
    }
    async _onLoadState() {
      try {
        const e = prompt("Paste the JSON state data to load:");
        if (!e || "" === e.trim()) return;
        const t = JSON.parse(e);
        if (!t || "object" != typeof t) throw new Error("Invalid state data format");
        this.state.sequencePlaying && this._sequencerComponent?.stopSequence(), this.state.freestylePlayback && this._pathRec?.stop();
        const s = { ...this.state };
        if (["isMuted", "isLoopEnabled", "volume", "isSequencerMode", "isRecording", "currentRecordSlot", "sequence", "velocities", "sequenceStepIndex", "stepTime", "sequenceSteps", "isSequenceSignatureMode", "isLatchOn", "seed", "uiHomeShapeKey", "isFreestyleMode", "freestyleRecording", "approvedSeeds"].forEach(((e2) => {
          t.hasOwnProperty(e2) && (s[e2] = t[e2]);
        })), Object.assign(this.state, s), t.sequencerState && this._sequencerComponent) {
          const e2 = t.sequencerState;
          e2.steps && this._sequencerComponent.changeStepCount(e2.steps), e2.state && (Object.assign(this._sequencerComponent.state, e2.state), this._sequencerComponent.updateSequenceUI(), this._sequencerComponent.updateStepControls());
        }
        if (t.pathRecorderState && this._pathRec) {
          const e2 = t.pathRecorderState;
          e2.recording && (this.state.freestyleRecording = e2.recording), void 0 !== e2.loop && this._pathRec.setLoop(e2.loop);
        }
        if (t.uiState) {
          const e2 = t.uiState;
          void 0 !== e2.sequencerVisible && this._sequencerComponent && (this._sequencerComponent.style.display = e2.sequencerVisible ? "block" : "none", this.state.isSequencerMode = e2.sequencerVisible), void 0 !== e2.volume && (this.state.volume = e2.volume);
        }
        t.seed && t.seed !== this.state.seed && this.resetToSeed(t.seed), this._controls.updateApprovedSeeds(this.state.approvedSeeds), this._updateControls(), this._fitLayout(), this._showNotification("State loaded successfully!", "success"), console.log("Loaded state:", t);
      } catch (e) {
        console.error("Error loading state:", e), this._showNotification("Error loading state: " + e.message, "error");
      }
    }
    _showNotification(e, t = "info") {
      const s = document.createElement("div");
      s.textContent = e, Object.assign(s.style, { position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "6px", color: "#fff", fontFamily: "inherit", fontSize: "14px", zIndex: "10000", maxWidth: "300px", wordWrap: "break-word", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", background: "success" === t ? "#4CAF50" : "error" === t ? "#f44336" : "#2196F3" }), document.body.appendChild(s), setTimeout((() => {
        s.parentNode && s.parentNode.removeChild(s);
      }), 3e3);
    }
  };
  customElements.define("osc-app", OscApp);

  // js/seq-app.js
  var SeqApp = class _SeqApp extends HTMLElement {
    static VALID_SIZES = [8, 16, 32, 64];
    static DEFAULT_STEPS = 8;
    static MIN_MS = 50;
    static MAX_MS = 2e3;
    #t = (t, e = {}) => this.dispatchEvent(new CustomEvent(t, { detail: e, bubbles: true, composed: true }));
    #e = () => this.state.sequence.length;
    #s = (t) => (t + 1) % this.#e();
    #i = () => this._stepSlotsDiv?.querySelectorAll(".step-slot") ?? [];
    #n = (t) => this.state.velocities?.[t] ?? 1;
    #a = (t, e) => this.state.sequence[t] = e;
    #o = (t, e) => this.state.velocities[t] = e;
    #l = (t) => this.state.isRecording && this.state.currentRecordSlot === t;
    #r = (t) => this.state.sequencePlaying && this.state.sequenceStepIndex === t;
    #h = (t, e, s = "Alt-drag to edit") => t.title = `Velocity: ${Math.round(100 * e)}% (${s})`;
    #d = (t) => _SeqApp.VALID_SIZES[_SeqApp.VALID_SIZES.indexOf(this.steps) + t] ?? null;
    #c(t) {
      this.steps = t, Object.assign(this.state, { sequence: Array(t).fill(null), velocities: Array(t).fill(1), sequenceStepIndex: 0 });
    }
    #p() {
      const t = (t2) => this.shadowRoot.getElementById(t2);
      this._stepSlotsDiv = t("stepSlots"), this._playBtn = t("playBtn"), this._stepTimeInput = t("stepTimeInput"), this._addBlockBtn = t("addBlockBtn"), this._removeBlockBtn = t("removeBlockBtn"), this._stepInfo = t("stepInfo");
    }
    #u() {
      this._eventListeners ||= [];
      const t = (t2, e, s) => t2 && (t2.addEventListener(e, s), this._eventListeners.push([t2, e, s]));
      t(this._playBtn, "click", this.handlePlayClick), t(this._stepTimeInput, "change", this.handleStepTimeChange), t(this._addBlockBtn, "click", this.handleAddBlock), t(this._removeBlockBtn, "click", this.handleRemoveBlock);
    }
    _applyPendingEdits() {
      const t = this._pendingEdits || [];
      if (t.length) {
        for (const e of t) "paint" === e.type ? (this.#a(e.i, e.value), this.#t("seq-step-recorded", { slotIndex: e.i, value: e.value, nextSlot: this.#s(e.i), isRecording: false })) : (this.#a(e.i, null), this.#t("seq-step-cleared", { slotIndex: e.i }));
        this._pendingEdits.length = 0, this.updateSequenceUI();
      }
    }
    #S(t, e) {
      if (!this.state.isRecording || t < 0 || t >= this.#e()) return;
      this._pendingEdits && (this._pendingEdits = this._pendingEdits.filter(((e2) => e2.i !== t))), this.#a(t, e);
      const s = this.#s(t);
      this.state.currentRecordSlot = s, 0 === s && (this.state.isRecording = false), this.updateSequenceUI(), this.#t("seq-step-recorded", { slotIndex: t, value: e, nextSlot: s, isRecording: this.state.isRecording });
    }
    #g(t) {
      this.#a(t, null), this.updateSequenceUI(), this.#t("seq-step-cleared", { slotIndex: t });
    }
    #m(t, e) {
      this._pendingEdits ||= [], this._pendingEdits.push(null == e ? { type: "clear", i: t } : { type: "paint", i: t, value: 0 }), this.#a(t, null == e ? null : 0), this.updateSequenceUI();
    }
    #q(t) {
      const e = null == this.state.sequence[t] ? 1 : null;
      Object.assign(this._dragState, { painting: true, mode: "paint", setTo: e, lastIndex: -1 }), this.#m(t, e);
    }
    #_(t, e) {
      Object.assign(this._dragState, { painting: true, mode: "velocity", baseVel: this.#n(t), startY: e.clientY, lastIndex: t });
    }
    #f(t) {
      const e = this._dragState;
      e.painting && "paint" === e.mode && e.lastIndex !== t && (e.lastIndex = t, this.#m(t, e.setTo));
    }
    #v(t, e, s, i) {
      const n = this._dragState;
      if (!n.painting || "velocity" !== n.mode) return;
      this._velocityUpdateThrottle ||= {};
      const a = Date.now(), o = this._velocityUpdateThrottle[t];
      if (o && a - o < 16) return;
      this._velocityUpdateThrottle[t] = a;
      const l = clamp01(n.baseVel + (n.startY - e.clientY) / 150 * (e.shiftKey ? 0.25 : 1));
      this.#o(t, l), this.#h(s, l, "Alt-drag" + (e.shiftKey ? " + Shift" : "")), i.style.height = `${Math.round(100 * l)}%`;
    }
    #b(t) {
      const e = Object.assign(document.createElement("div"), { className: "step-slot" });
      e.dataset.index = `${t}`;
      const s = Object.assign(document.createElement("div"), { className: "vel-bar" }), i = Object.assign(document.createElement("div"), { className: "digit" });
      e.append(s, i), this._slotListeners ||= [];
      const n = (t2, s2) => (e.addEventListener(t2, s2), this._slotListeners.push([e, t2, s2]));
      return n("click", (() => this.handleStepClick(t))), n("contextmenu", ((e2) => this.handleStepRightClick(e2, t))), n("pointerdown", ((s2) => (s2.altKey ? this.#_(t, s2) : this.#q(t), e.setPointerCapture(s2.pointerId)))), n("pointerenter", (() => this.#f(t))), n("pointermove", ((i2) => this.#v(t, i2, e, s))), e;
    }
    #y() {
      this.render(), this.#u(), this.updateSequenceUI();
    }
    constructor() {
      super(), this.attachShadow({ mode: "open" }), this.state = { isRecording: false, currentRecordSlot: -1, sequence: [], velocities: [], sequencePlaying: false, sequenceStepIndex: 0, stepTime: 400 }, ["updateState", "updateSequenceUI", "recordStep", "playSequence", "stopSequence", "handleStepClick", "handleStepRightClick", "handlePlayClick", "handleStepTimeChange", "handleAddBlock", "handleRemoveBlock", "updateStepControls", "_onWindowKeyDown", "_onPointerUpGlobal", "createSequenceUI", "render", "changeStepCount"].forEach(((t) => this[t] = this[t].bind(this))), this._eventListeners = [], this._slotListeners = [];
    }
    connectedCallback() {
      const t = Number(this.getAttribute("steps")) || _SeqApp.DEFAULT_STEPS;
      this.#c(_SeqApp.VALID_SIZES.includes(t) ? t : _SeqApp.DEFAULT_STEPS), this.render(), this.updateSequenceUI(), this.#u(), window.addEventListener("keydown", this._onWindowKeyDown), window.addEventListener("pointerup", this._onPointerUpGlobal), this._globalListeners = [["keydown", this._onWindowKeyDown], ["pointerup", this._onPointerUpGlobal]];
    }
    disconnectedCallback() {
      (this._globalListeners || []).forEach((([t, e]) => window.removeEventListener(t, e))), (this._eventListeners || []).forEach((([t, e, s]) => t.removeEventListener(e, s))), (this._slotListeners || []).forEach((([t, e, s]) => t.removeEventListener(e, s))), this._globalListeners = this._eventListeners = this._slotListeners = [], this._seqTimer && clearTimeout(this._seqTimer), this._tailTimer && clearTimeout(this._tailTimer), this._velocityUpdateThrottle = null;
    }
    render() {
      const t = Math.min(8, this.steps), e = Math.min(320, 40 * this.steps), { MIN_MS: s, MAX_MS: i } = _SeqApp;
      this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;text-align:center;width:95%;margin:.8em auto 0;font-family:sans-serif}
        #stepSlots{display:grid;grid-template-columns:repeat(${t},1fr);gap:.4em;margin:.6em auto .7em;max-width:${e}px;width:100%;justify-content:center;align-content:center;padding:0;border-radius:6px;background:#fff0;box-shadow:0 0 12px #0003}
        #stepControls{display:flex;align-items:center;justify-content:center;gap:1rem;margin:.5em 0;font-size:.9em}
        #stepControls button{padding:.3em .8em;border-radius:4px;border:1px solid #666;background:#212;color:#ffe0a3;cursor:pointer;font:inherit;font-size:.9em;transition:background .18s}
        #stepControls button:hover{background:#323}
        #stepControls button:disabled{opacity:.5;cursor:not-allowed}
        #stepInfo{color:#aaa;font-size:.85em}
        .step-slot{position:relative;width:37px;height:37px;border:1px solid #555;border-radius:6px;background:#232325;display:grid;place-items:center;cursor:pointer;font-weight:700;font-size:1.12rem;user-select:none;transition:background .15s,box-shadow .16s,border-color .16s}
        .step-slot.record-mode{background:#343;box-shadow:0 0 7px #f7c46988}
        .step-slot.active{border-color:#7af6ff;box-shadow:0 0 8px #7af6ff88}
        .step-slot.record-mode.active{background:#575;box-shadow:0 0 12px #f7c469d6}
        .digit{position:relative;z-index:2;color:#eee}
        .vel-bar{position:absolute;bottom:0;left:0;width:100%;height:0%;background:#7af6ff55;border-bottom-left-radius:6px;border-bottom-right-radius:6px;pointer-events:none;transition:height .05s linear;z-index:1}
        #sequenceControls{display:flex;align-items:center;justify-content:center;gap:1.1rem;margin:1.1em 0 0;width:100%}
        #playBtn{min-width:150px;font-size:1.09rem;padding:.44em 1.4em;border-radius:7px;margin:0;background:#181818;color:#fff;border:2px solid #7af6ff;transition:background .19s,color .19s;box-shadow:0 2px 10px #7af6ff22}
        #playBtn:hover{background:#212d3d;color:#fff;border-color:#fff}
        #playBtn:disabled{opacity:.5;cursor:not-allowed;background:#181818;border-color:#555;color:#888}
        #stepTimeInput{width:60px;margin-left:.7em}
      </style>
      <div id="sequencer">
        <div id="stepControls">
          <button id="removeBlockBtn">Remove Block (-8)</button>
          <span id="stepInfo">${this.steps} steps (${this.steps / 8} blocks)</span>
          <button id="addBlockBtn">Add Block (+8)</button>
        </div>
        <div id="stepSlots"></div>
        <div id="sequenceControls">
          <button id="playBtn">Play Sequence</button>
          <label for="stepTimeInput" style="margin-left:1.2em;">Step Time (ms):</label>
          <input type="number" id="stepTimeInput" min="${s}" max="${i}" value="${this.state.stepTime}"/>
        </div>
      </div>`, this.#p(), this.createSequenceUI(), this.updateStepControls();
    }
    createSequenceUI() {
      if (!this._stepSlotsDiv) return;
      (this._slotListeners || []).forEach((([t2, e, s]) => t2.removeEventListener(e, s))), this._slotListeners = [], this._stepSlotsDiv.innerHTML = "", this._dragState = { painting: false, mode: null, setTo: null, baseVel: 1, startY: 0, lastIndex: -1 };
      const t = document.createDocumentFragment();
      for (let e = 0; e < this.steps; e++) t.appendChild(this.#b(e));
      this._stepSlotsDiv.appendChild(t);
    }
    updateState(t = {}) {
      if ("steps" in t) {
        const e = _SeqApp.VALID_SIZES.includes(t.steps) ? t.steps : this.steps;
        if (e !== this.steps) return this.#c(e), this.#y();
      }
      Object.assign(this.state, t), this.updateSequenceUI();
    }
    updateSequenceUI() {
      if (!this._stepSlotsDiv) return;
      const { sequence: t, velocities: e, sequencePlaying: s, stepTime: i } = this.state;
      for (const s2 of this.#i()) {
        const i2 = +s2.dataset.index, n = t[i2], a = s2.querySelector(".digit"), o = s2.querySelector(".vel-bar"), l = e?.[i2] ?? 1;
        a && (a.textContent = 0 === n ? "0" : n ?? ""), s2.classList.toggle("record-mode", this.#l(i2)), s2.classList.toggle("active", this.#r(i2)), o && (o.style.height = `${Math.round(100 * l)}%`), s2.title?.startsWith("Velocity:") || this.#h(s2, l);
      }
      this._playBtn && (this._playBtn.textContent = s ? "Stop Sequence" : "Play Sequence", this._playBtn.disabled = !s && !this.hasPopulatedSteps()), this._stepTimeInput && !s && (this._stepTimeInput.value = i), this.updateStepControls();
    }
    handleStepClick(t) {
      this.state.isRecording = true, this.state.currentRecordSlot = t, this.updateSequenceUI(), this.#t("seq-record-start", { slotIndex: t });
    }
    handleStepRightClick(t, e) {
      t.preventDefault(), this._pendingEdits ||= [], this._pendingEdits.push({ type: "clear", i: e }), this.#a(e, null), this.updateSequenceUI();
    }
    handlePlayClick() {
      this.state.sequencePlaying ? this.stopSequence() : this.playSequence();
    }
    handleStepTimeChange() {
      const t = this._stepTimeInput;
      if (!t) return;
      const e = parseInt(t.value, 10);
      !Number.isFinite(e) || e < _SeqApp.MIN_MS || e > _SeqApp.MAX_MS || (this.state.stepTime = e, this.#t("seq-step-time-changed", { stepTime: e }));
    }
    handleAddBlock() {
      if (!this.state.sequencePlaying) {
        const t = this.#d(1);
        t && this.changeStepCount(t);
      }
    }
    handleRemoveBlock() {
      if (!this.state.sequencePlaying) {
        const t = this.#d(-1);
        t && this.changeStepCount(t);
      }
    }
    changeStepCount(t) {
      if (!_SeqApp.VALID_SIZES.includes(t)) return;
      this.state.isRecording = false, this.state.currentRecordSlot = -1;
      const e = [...this.state.sequence], s = [...this.state.velocities];
      this.steps = t, this.state.sequence = Array(t).fill(null), this.state.velocities = Array(t).fill(1);
      for (let i = 0, n = Math.min(e.length, t); i < n; i++) this.state.sequence[i] = e[i], this.state.velocities[i] = s[i];
      this.state.sequenceStepIndex >= t && (this.state.sequenceStepIndex = 0), this.#y(), this.#t("seq-steps-changed", { steps: t });
    }
    updateStepControls() {
      this._addBlockBtn && (this._addBlockBtn.disabled = this.steps >= 64 || this.state.sequencePlaying), this._removeBlockBtn && (this._removeBlockBtn.disabled = this.steps <= 8 || this.state.sequencePlaying), this._stepInfo && (this._stepInfo.textContent = `${this.steps} steps (${this.steps / 8} blocks)`);
    }
    _onWindowKeyDown(t) {
      this.state.isRecording && /^[0-9]$/.test(t.key) && this.#S(this.state.currentRecordSlot, parseInt(t.key, 10));
    }
    _onPointerUpGlobal() {
      this._dragState && Object.assign(this._dragState, { painting: false, mode: null, lastIndex: -1 });
    }
    recordStep(t) {
      this.#S(this.state.currentRecordSlot, t);
    }
    hasPopulatedSteps() {
      return this.state.sequence.some(((t) => null !== t));
    }
    playSequence() {
      if (this.state.sequencePlaying || !this.hasPopulatedSteps()) return;
      this.state.sequencePlaying = true, this.state.sequenceStepIndex = 0, this.#t("seq-play-started", { stepTime: this.state.stepTime });
      const t = () => {
        if (!this.state.sequencePlaying) return;
        this._applyPendingEdits();
        const e = this.state.sequenceStepIndex;
        this.updateSequenceUI();
        const s = this.state.sequence[e], i = this.#n(e), n = 0 === this.#s(e);
        this.#t("seq-step-advance", { stepIndex: e, index: e, value: s, velocity: i, isLastStep: n }), this.state.sequenceStepIndex = this.#s(e), this._seqTimer = this.state.sequencePlaying ? setTimeout(t, this.state.stepTime) : null;
      };
      t();
    }
    stopSequence() {
      this.state.sequencePlaying = false, this._seqTimer && (clearTimeout(this._seqTimer), this._seqTimer = null), this._tailTimer && (clearTimeout(this._tailTimer), this._tailTimer = null), this._applyPendingEdits(), this.state.sequenceStepIndex = 0, this.updateSequenceUI(), this.#t("seq-play-stopped", {});
      const t = Math.max(20, Math.min(this.state.stepTime, 200));
      this._tailTimer = setTimeout((() => {
        this.#t("seq-step-advance", { stepIndex: -1, index: -1, value: 0, velocity: 1, isLastStep: true }), this._tailTimer = null;
      }), t);
    }
  };
  customElements.get("seq-app") || customElements.define("seq-app", SeqApp);

  // js/hk-icons.js
  (() => {
    const e = [["o", "O", "hk-toggle-power", null, -90, "Power", "power"], ["m", "M", "hk-toggle-mute", null, -45, "Mute", "mute"], ["c", "C", "hk-toggle-controls", null, -15, "Controls", "controls"], ["q", "Q", "hk-toggle-sequencer", null, 10, "Show/Hide Sequencer", "sequencer"], ["p", "P", "hk-toggle-seq-play", null, 35, "Play/Pause Sequence", "seq-play"], ["r", "FR", "fr-toggle", null, 60, "Freestyle Recording", "fr-ready"], ["R", "PF", "fr-play", null, 85, "Play Freestyle Recording", "fr-playback"], ["s", "CALL SIGN", "hk-audio-signature", null, 0, "Signature", "signature"], ["S", "S", "hk-toggle-signature", null, 135, "Signature Mode", "sig-mode"], ["l", "L", "hk-toggle-loop", null, 180, "Loop", "loop"], ["L", "L", "hk-toggle-latch", null, -135, "Latch", "latch"]], t = (e2, t2) => e2.querySelector(t2), a = (e2, t2, a2) => {
      const o = t2.getBoundingClientRect(), i = a2.getBoundingClientRect(), r = t2.dataset.id, s = t2.textContent?.trim(), n = o.top - i.top - 12 + "px", l = `${o.top - i.top + o.height + 8}px`;
      e2.style.left = o.left - i.left + o.width / 2 + "px";
      const c = ["signature", "fr-ready", "fr-playback"].includes(r) ? n : "O" === s ? l : o.top - i.top - 8 + "px", d = "O" === s ? "translate(-50%,0)" : "translate(-50%,-100%)";
      e2.style.top = c, e2.style.setProperty("--tooltip-transform", d);
    };
    ready((async () => {
      const o = document.querySelector("osc-app");
      if (!o) return;
      if (!await waitFor((() => o.shadowRoot?.querySelector("#canvasContainer") && o.shadowRoot?.querySelector("osc-hotkeys")))) return;
      const i = o.shadowRoot, r = t(i, "#canvasContainer"), s = t(i, "osc-hotkeys");
      "static" === getComputedStyle(r).position && (r.style.position = "relative");
      const n = document.createElement("div");
      n.className = "hk-ring", n.appendChild(Object.assign(document.createElement("style"), { textContent: '.hk-ring{position:absolute;inset:0;pointer-events:none;z-index:40;--scale:1;--badge:calc(60px*var(--scale));--badge-font:calc(28px*var(--scale));--gap:calc(10px*var(--scale));--ring-outset:calc(28px*var(--scale));--cluster-left:calc(-208px*var(--scale));--cluster-right:calc(208px*var(--scale));--cluster-left-sm:calc(-172px*var(--scale));--cluster-right-sm:calc(172px*var(--scale))}\n.hk-badge{position:absolute;left:50%;top:50%;width:var(--badge);height:var(--badge);display:flex;align-items:center;justify-content:center;font:700 var(--badge-font)/1 "Courier New",monospace;color:#888;background:rgba(0,0,0,.5);border:1px solid #555;border-radius:999px;box-shadow:0 0 0 1px #000;backdrop-filter:blur(4px);user-select:none;cursor:pointer;letter-spacing:.02em;transition:transform .15s ease-out,box-shadow .15s ease-out,background .15s ease-out,border-color .15s ease-out,opacity .25s ease-out,color .15s ease-out,visibility .25s;transform:translate(-50%,-50%) scale(1);touch-action:manipulation;opacity:0;visibility:hidden;pointer-events:none}\n.hk-badge.is-visible{opacity:.6;visibility:visible;pointer-events:auto}\n.hk-badge.is-visible:hover{opacity:1;transform:translate(-50%,-50%) scale(1.1)}\n.hk-badge.is-visible:active{transform:translate(-50%,-50%) scale(1.05)}\n.hk-badge[data-shift="1"]{border-color:#6b7fad}\n.hk-badge span{display:inline-block}\n.hk-badge.is-power[data-active="true"]{opacity:1;background:#a11221;color:#f0f0f0;border-color:#d34e5a;box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc;text-shadow:0 0 4px #ddd}\n.hk-badge.is-mute[data-active="true"]{opacity:1;background:#851020;color:#e0e0e0;border-color:#d0405e;box-shadow:0 0 8px #d0405e55}\n.hk-badge[data-active="true"]{opacity:1;background:#1a2f21;color:#ade5c2;border-color:#409060;box-shadow:0 0 8px #40906055}\n.hk-badge[data-id="sig-mode"][data-active="true"]{opacity:1;background:#1a253a;border-color:#6a82cc;color:#ced5e0;box-shadow:0 0 12px #6a82cc55}\n.hk-badge[data-disabled="1"]{opacity:.25!important;pointer-events:none!important;filter:grayscale(.4)}\n.hk-tooltip{position:absolute;top:0;left:0;color:#ccc;background:rgba(20,20,20,.6);border:1px solid rgba(255,255,255,.15);padding:6px 12px;border-radius:6px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:50;opacity:0;white-space:nowrap;pointer-events:none;box-shadow:0 5px 15px rgba(0,0,0,.6);backdrop-filter:blur(12px);transform-origin:center;transform:var(--tooltip-transform,translate(-50%,-100%)) scale(.9);transition:opacity .2s cubic-bezier(.4,0,.2,1),transform .2s cubic-bezier(.4,0,.2,1)}\n.hk-tooltip.is-visible{opacity:1;transform:var(--tooltip-transform,translate(-50%,-100%)) scale(1)}\n@keyframes shimmer-text{0%{background-position:-200% center}100%{background-position:200% center}}\n.hk-badge.is-visible[data-id="signature"]{width:calc(160px*var(--scale));height:calc(72px*var(--scale));margin:0;padding:0;border-radius:calc(18px*var(--scale));background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.3);color:transparent;font-size:calc(40px*var(--scale));font-weight:700;letter-spacing:.05em;box-shadow:0 0 6px rgba(255,255,255,.1);backdrop-filter:blur(6px);overflow:hidden;opacity:.7;z-index:41;position:absolute;left:50%;top:100%;transform:translate(-50%,calc(-100% - var(--gap)));transition:all .2s ease}\n.hk-badge.is-visible[data-id="signature"] span{background:linear-gradient(90deg,#ff00de 0%,#00f7ff 25%,#ff00de 50%,#00f7ff 75%,#ff00de 100%);background-size:200% auto;background-clip:text;-webkit-background-clip:text;color:transparent;animation:shimmer-text 4s linear infinite;display:inline-block;width:100%;text-align:center;text-shadow:none}\n.hk-badge.is-visible[data-id="signature"][data-active="true"]{opacity:1;border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5)}\n.hk-badge.is-visible[data-id="signature"][data-active="true"] span{animation-duration:1.5s;background:linear-gradient(90deg,#ff00de 0%,#00f7ff 30%,#f0f 50%,#00f7ff 70%,#ff00de 100%);background-size:150% auto}\n.hk-badge.is-visible[data-id="fr-ready"],.hk-badge.is-visible[data-id="fr-playback"]{left:50%;top:100%;margin:0;transform:translate(calc(-50% + var(--x,0px)),calc(-100% - calc(var(--gap) + 4px)))}\n.hk-badge.is-visible[data-id="fr-ready"]{--x:var(--cluster-left)}.hk-badge.is-visible[data-id="fr-playback"]{--x:var(--cluster-right)}\n@media (max-width:520px){.hk-badge.is-visible[data-id="fr-ready"]{--x:var(--cluster-left-sm)}.hk-badge.is-visible[data-id="fr-playback"]{--x:var(--cluster-right-sm)}}\n.hk-badge.is-tour{opacity:1!important;color:#ddd;border-color:#aaa;box-shadow:0 0 0 1px #000,0 0 12px rgba(255,255,255,.35);transform:translate(-50%,-50%) scale(1.1)}\n.hk-badge.is-tour.is-power[data-active="true"]{box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc,0 0 12px rgba(255,255,255,.25)}\n.hk-badge.is-tour[data-id="signature"]{opacity:1;border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5)}\n.hk-tooltip.hk-tour{opacity:1;pointer-events:none;transition:none}\n' }));
      const l = document.createElement("div");
      l.className = "hk-tooltip";
      const c = ([, e2, t2, o2, i2, r2, c2]) => {
        const d2 = document.createElement("div");
        return d2.className = "hk-badge", d2.dataset.id = c2, d2.dataset.angle = i2, "power" === c2 && d2.classList.add("is-visible", "is-power"), "mute" === c2 && d2.classList.add("is-mute"), ("S" === e2 || "L" === e2 || "fr-playback" === c2 && "R" === e2) && (d2.dataset.shift = "1"), d2.appendChild(Object.assign(document.createElement("span"), { textContent: e2 })), on(d2, "mouseenter", (() => {
          l.textContent = r2, a(l, d2, n), l.classList.add("is-visible");
        })), on(d2, "mouseleave", (() => l.classList.remove("is-visible"))), on(d2, "click", ((e3) => {
          e3.preventDefault(), e3.stopPropagation(), s.dispatchEvent(new CustomEvent(t2, { detail: o2, bubbles: true, composed: true }));
        }), { passive: false }), d2;
      }, d = document.createDocumentFragment();
      for (const t2 of e) d.appendChild(c(t2));
      n.append(l), r.appendChild(n.appendChild(d) && n);
      const p = /* @__PURE__ */ new Set();
      let u = false;
      const g2 = () => {
        u = p.size > 0;
        try {
          o.updateHkIcons?.(o.state);
        } catch {
        }
      };
      on(s, "seq-step-recorded", ((e2) => {
        const t2 = e2.detail?.slotIndex;
        Number.isInteger(t2) && p.add(t2), g2();
      })), on(s, "seq-step-cleared", ((e2) => {
        const t2 = e2.detail?.slotIndex;
        Number.isInteger(t2) && p.delete(t2), g2();
      })), on(s, "seq-steps-changed", (() => {
        p.clear(), g2();
      }));
      const b = () => {
        try {
          l.classList.remove("is-visible");
        } catch {
        }
        n.querySelectorAll(".hk-badge.is-tour").forEach(((e2) => e2.classList.remove("is-tour"))), n.querySelectorAll(".hk-tooltip.hk-tour").forEach(((e2) => e2.remove())), o._hkTourTips = [], o._hkTourRunning = false;
      };
      o.cleanupHotkeyTour = b;
      const h = e.map((([, , , , , e2, t2]) => ({ id: t2, title: e2 }))).filter(((e2) => e2.id));
      o.runHotkeyTour = async (e2 = {}) => {
        if (o._hkTourRunning) return;
        b(), o._hkTourRunning = true;
        const t2 = Math.max(120, Math.min(900, e2.stepMs ?? 260)), i2 = Math.max(500, e2.holdMs ?? 1e3), r2 = (e3) => new Promise(((t3) => setTimeout(t3, e3))), s2 = h.map((({ id: e3, title: t3 }) => {
          const a2 = n.querySelector(`.hk-badge[data-id="${e3}"]`);
          return a2?.classList.contains("is-visible") ? { el: a2, title: t3 } : null;
        })).filter(Boolean), l2 = (e3, t3) => {
          const i3 = document.createElement("div");
          return i3.className = "hk-tooltip hk-tour is-visible", i3.textContent = t3, a(i3, e3, n), n.appendChild(i3), (o._hkTourTips ??= []).push(i3), i3;
        };
        try {
          for (const { el: e3, title: a2 } of s2) e3.classList.add("is-tour"), l2(e3, a2), await r2(t2);
          await r2(i2);
        } finally {
          b();
        }
      };
      const f = (e2, t2, a2) => {
        const o2 = n.querySelector(`[data-id="${e2}"]`);
        o2 && (o2.dataset[t2] = "disabled" === t2 ? a2 ? "1" : "" : (!!a2).toString());
      }, m = (e2 = {}) => {
        const t2 = !!e2.isPlaying;
        if (!t2) try {
          o.cleanupHotkeyTour?.();
        } catch {
        }
        n.querySelectorAll('.hk-badge:not([data-id="power"])').forEach(((e3) => e3.classList.toggle("is-visible", t2))), f("power", "active", t2), f("mute", "active", e2.isMuted), f("controls", "active", e2.controlsVisible), f("sequencer", "active", e2.sequencerVisible), f("seq-play", "active", e2.sequencePlaying), f("sig-mode", "active", e2.isSequenceSignatureMode), f("loop", "active", e2.isLoopEnabled), f("latch", "active", e2.isLatchOn);
        const a2 = e2.isSignaturePlaying || e2.signatureActive || false;
        f("signature", "active", a2), f("fr-ready", "active", !!e2.isFreestyleMode), f("fr-playback", "active", !!e2.freestylePlayback), f("fr-playback", "disabled", !e2.freestyleRecording);
      };
      o.updateHkIcons = m, o.state && m(o.state);
      const v = () => {
        try {
          o.cleanupHotkeyTour?.();
        } catch {
        }
        const e2 = r.getBoundingClientRect();
        if (!e2 || e2.width < 100) return;
        const t2 = e2.left + e2.width / 2, a2 = e2.top + e2.height / 2, s2 = innerWidth, l2 = innerHeight, c2 = (() => {
          const e3 = document.createElement("div");
          e3.style.cssText = "position:fixed;inset:auto 0 0 0;height:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0);visibility:hidden", document.body.appendChild(e3);
          const t3 = getComputedStyle(e3), a3 = { top: +t3.paddingTop.replace("px", "") || 0, right: +t3.paddingRight.replace("px", "") || 0, bottom: +t3.paddingBottom.replace("px", "") || 0, left: +t3.paddingLeft.replace("px", "") || 0 };
          return e3.remove(), a3;
        })(), d2 = Math.min(e2.width, e2.height) / 2 + 28, p2 = i.querySelector("osc-controls"), u2 = p2 && null !== p2.offsetParent ? p2.getBoundingClientRect() : null;
        n.querySelectorAll(".hk-badge").forEach(((e3) => {
          const { id: o2 } = e3.dataset;
          if (["signature", "fr-ready", "fr-playback"].includes(o2)) return;
          const i2 = (+e3.dataset.angle || 0) * Math.PI / 180, r2 = Math.cos(i2), n2 = Math.sin(i2), p3 = 15, g3 = c2.left + 10 + p3, b2 = s2 - c2.right - 10 - p3, h2 = c2.top + 10 + p3, f2 = u2 ? Math.max(h2, u2.top - 10 - p3) : l2 - c2.bottom - 10 - p3;
          let m2 = d2, v2 = 1 / 0;
          r2 > 0 && (v2 = Math.min(v2, (b2 - t2) / r2)), r2 < 0 && (v2 = Math.min(v2, (t2 - g3) / -r2)), n2 > 0 && (v2 = Math.min(v2, (f2 - a2) / n2)), n2 < 0 && (v2 = Math.min(v2, (a2 - h2) / -n2)), m2 = Math.max(19, Math.floor(Math.min(m2, v2)));
          const y2 = Math.cos(i2) * m2, x = Math.sin(i2) * m2;
          e3.style.transform = `translate(${y2}px,${x}px) translate(-50%,-50%) scale(1)`;
        }));
      };
      v(), on(window, "resize", v, { passive: true });
      const y = i.querySelector("osc-controls");
      if (y) try {
        new ResizeObserver(v).observe(y);
      } catch {
      }
    }));
  })();

  // js/controls-visibility.js
  ready((async () => {
    const o = document.querySelector("osc-app");
    if (!o) return;
    if (!await waitFor((() => o.shadowRoot && o.shadowRoot.querySelector("osc-controls") && o.shadowRoot.querySelector("osc-hotkeys")))) return;
    const t = o.shadowRoot, e = t.querySelector("osc-controls"), s = t.querySelector("osc-hotkeys");
    e.style.display = "none", s.addEventListener("hk-toggle-controls", (() => {
      const t2 = "none" === e.style.display;
      e.style.display = t2 ? "block" : "none";
      try {
        o._fitLayout?.();
      } catch {
      }
      try {
        e.dispatchEvent(new Event("controls-resize"));
      } catch {
      }
    }));
  }));
})();
