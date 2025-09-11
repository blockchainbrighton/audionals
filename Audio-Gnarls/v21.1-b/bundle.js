(() => {
  // js/setup.js
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
    :root { color-scheme: dark; }

    html, body {
      margin: 0; padding: 0;
      height: 100%; width: 100%;
      background: #000; color: #fff;
      font-family: 'Courier New', monospace;
      overflow: hidden; /* no page scroll during performance */
    }

    /* Desktop-friendly floor, but don't block phones from fitting */
    body { min-width: 480px; min-height: 400px; }

    /* On small screens, let the app fill the dynamic viewport
       (prevents iOS URL bar shrinking issues) */
    @media (max-width: 480px) {
      body {
        min-width: 0;
        min-height: 100dvh; /* dynamic viewport height on mobile */
      }
    }

    /* Respect reduced motion preferences (small global nudge) */
    @media (prefers-reduced-motion: reduce) {
      * { scroll-behavior: auto !important; }
    }
  `;
    document.head.appendChild(style);
  }
  function injectAppleMetas() {
    const ua = navigator.userAgent || navigator.vendor || "";
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIOSDevice && isSafari) {
      const m1 = document.createElement("meta");
      m1.name = "apple-mobile-web-app-capable";
      m1.content = "yes";
      document.head.appendChild(m1);
      const m2 = document.createElement("meta");
      m2.name = "apple-mobile-web-app-status-bar-style";
      m2.content = "black-translucent";
      document.head.appendChild(m2);
    }
  }
  function syncDataSeed() {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.dataset.seed = document.documentElement.dataset.seed || "default";
      const mo = new MutationObserver(() => {
        document.body.dataset.seed = document.documentElement.dataset.seed || "default";
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-seed"] });
    });
  }
  injectStyles();
  injectAppleMetas();
  syncDataSeed();

  // js/osc-hotkeys.js
  var OscHotkeys = class extends HTMLElement {
    static get observedAttributes() {
      return ["disabled"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:none}</style>";
      this._enabled = true;
      this._config = { humKey: "hum", shapes: [] };
      this._downKeys = /* @__PURE__ */ new Set();
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onBlur = this._onBlur.bind(this);
      this._onVisibility = this._onVisibility.bind(this);
      this._onPageHide = this._onPageHide.bind(this);
      this._listeners = [];
    }
    connectedCallback() {
      if (this._enabled) this._attach();
    }
    disconnectedCallback() {
      this._detach();
    }
    attributeChangedCallback(n) {
      if (n !== "disabled") return;
      const en = !this.hasAttribute("disabled");
      if (en && !this._enabled) {
        this._enabled = true;
        this._attach();
      } else if (!en && this._enabled) {
        this._enabled = false;
        this._detach();
      }
    }
    setConfig({ humKey: humKey2, shapes } = {}) {
      if (humKey2) this._config.humKey = humKey2;
      if (Array.isArray(shapes)) this._config.shapes = shapes;
    }
    simulatePressKey(k) {
      this._handlePress(k);
    }
    simulateReleaseKey(k) {
      this._handleRelease(k);
    }
    _addL(t, ty, fn, o) {
      t.addEventListener(ty, fn, o);
      this._listeners.push({ target: t, type: ty, fn, opts: o });
    }
    _attach() {
      const a = { capture: false, passive: false }, p = { capture: false, passive: true };
      this._addL(window, "keydown", this._onKeyDown, a);
      this._addL(window, "keyup", this._onKeyUp, a);
      this._addL(window, "blur", this._onBlur, p);
      this._addL(document, "visibilitychange", this._onVisibility, p);
      this._addL(window, "pagehide", this._onPageHide, p);
    }
    _detach() {
      for (const { target, type, fn, opts } of this._listeners)
        target.removeEventListener(type, fn, opts?.capture ?? false);
      this._listeners.length = 0;
      if (this._downKeys.size) this._releaseAll();
    }
    _onKeyDown(ev) {
      const t = (ev.composedPath?.()[0] || ev.target).tagName || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t)) return;
      const k = ev.key, KU = k?.toUpperCase?.() || "";
      const emit = (type, detail) => {
        this._emit(type, detail);
        ev.preventDefault();
      };
      const simple = { O: "hk-toggle-power", M: "hk-toggle-mute", C: "hk-toggle-controls", Q: "hk-toggle-sequencer", P: "hk-toggle-seq-play" };
      if (simple[KU]) return emit(simple[KU]);
      if (k === "L" && ev.shiftKey) return emit("hk-toggle-latch");
      if (k === "l" && !ev.shiftKey) return emit("hk-toggle-loop");
      if (k === "S" && ev.shiftKey) return emit("hk-toggle-signature");
      if (k === "s" && !ev.shiftKey) return emit("hk-audio-signature");
      if (KU === "R" && ev.shiftKey) return emit("fr-play");
      if (KU === "R" && !ev.shiftKey) return emit("fr-toggle");
      if (k === "ArrowUp" || k === "ArrowDown") return emit("hk-shape-step", { direction: k === "ArrowDown" ? 1 : -1 });
      if (this._downKeys.has(k)) return ev.preventDefault();
      this._downKeys.add(k);
      const m = this._mapKey(k);
      if (!m) return;
      emit("hk-press", m);
    }
    _onKeyUp(ev) {
      const k = ev.key;
      if (!this._downKeys.has(k)) return;
      this._downKeys.delete(k);
      const m = this._mapKey(k);
      if (m) this._emit("hk-release", m);
    }
    _onBlur() {
      this._releaseAll();
    }
    _onVisibility() {
      if (document.visibilityState === "hidden") this._releaseAll();
    }
    _onPageHide() {
      this._releaseAll();
    }
    _releaseAll() {
      for (const k of this._downKeys) {
        const m = this._mapKey(k);
        if (m) this._emit("hk-release", m);
      }
      this._downKeys.clear();
    }
    _handlePress(k) {
      if (!this._downKeys.has(k)) {
        this._downKeys.add(k);
        const m = this._mapKey(k);
        if (m) this._emit("hk-press", m);
      }
    }
    _handleRelease(k) {
      if (this._downKeys.delete(k)) {
        const m = this._mapKey(k);
        if (m) this._emit("hk-release", m);
      }
    }
    _mapKey(k) {
      if (k === "0") return { key: k, idx: -1, shapeKey: this._config.humKey };
      const i = (k?.charCodeAt?.(0) ?? 0) - 49;
      return i >= 0 && i < this._config.shapes.length ? { key: k, idx: i, shapeKey: this._config.shapes[i] } : null;
    }
    _emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
  };
  customElements.define("osc-hotkeys", OscHotkeys);

  // js/worklet/aw-bridge.js
  var ensureModule = async (ctx) => {
    if (!ctx.audioWorklet) throw new Error("AudioWorklet not supported");
    if (!ensureModule._added) {
      ensureModule._added = ctx.audioWorklet.addModule("./js/worklet/dsp-processor.js");
    }
    return ensureModule._added;
  };
  var noteToHz = (ToneNS, n) => {
    if (typeof n === "number") return n;
    try {
      return ToneNS.Frequency(n).toFrequency();
    } catch {
      return 440;
    }
  };
  var AWOscillator = class {
    constructor(frequency = 440, type = "sine") {
      const ToneNS = window.Tone;
      const ctx = ToneNS?.getContext?.()?.rawContext || ToneNS?.context?._context || ToneNS?.context?._nativeAudioContext || ToneNS?.context?.rawContext || ToneNS?.context || new (window.AudioContext || window.webkitAudioContext)();
      this._ctx = ctx;
      this._type = type || "sine";
      this._frequency = noteToHz(ToneNS, frequency);
      this._node = null;
      this._started = false;
      this._ready = ensureModule(ctx).then(() => {
        this._node = new AudioWorkletNode(ctx, "dsp-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          parameterData: { frequency: this._frequency }
        });
        this._node.port.postMessage({ type: this._type, detune: 0, gain: 1, seed: 123456 });
      });
      this.frequency = {
        get value() {
          return this._owner._frequency;
        },
        set value(v) {
          const hz = typeof v === "number" ? v : noteToHz(window.Tone, v);
          this._owner._frequency = hz;
          if (this._owner._node) {
            const p = this._owner._node.parameters.get("frequency");
            if (p) p.setValueAtTime(hz, this._owner._ctx.currentTime);
          }
        }
      };
      this.frequency._owner = this;
      this.type = this._type;
    }
    start() {
      this._started = true;
      return this;
    }
    stop() {
      return this;
    }
    set(type) {
      if (type && this._node) {
        this._type = type;
        this._node.port.postMessage({ type });
      }
      return this;
    }
    // Connect to either a native AudioNode or a Tone node
    connect(dest) {
      return this._ready.then(() => {
        const node = this._node;
        const target = dest?.input || dest?._input?.[0] || dest?.context?.rawContext ? dest : dest;
        node.connect(target);
        return dest;
      });
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
    const W = window;
    const ToneNS = W.Tone;
    if (!ToneNS || !("Oscillator" in ToneNS)) return false;
    const ctx = ToneNS?.getContext?.()?.rawContext || ToneNS?.context?._context || ToneNS?.context?._nativeAudioContext || ToneNS?.context?.rawContext || ToneNS?.context || null;
    if (!ctx?.audioWorklet) {
      console.info("[AW Bridge] AudioWorklet not supported; keeping original Tone.Oscillator.");
      return false;
    }
    try {
      W.Tone = new Proxy(ToneNS, {
        get(target, prop, receiver) {
          if (prop === "Oscillator") return AWOscillator;
          return Reflect.get(target, prop, receiver);
        }
      });
      W.Tone.__OrigOscillator = ToneNS.Oscillator;
      console.info("[AW Bridge] Patched Tone via Proxy -> Oscillator routed to AudioWorklet");
      return true;
    } catch (e) {
      console.warn("[AW Bridge] Failed to install Proxy; falling back to shadow object", e);
      try {
        const shadow = Object.create(ToneNS);
        Object.defineProperty(shadow, "Oscillator", {
          configurable: true,
          enumerable: true,
          get: () => AWOscillator
        });
        shadow.__OrigOscillator = ToneNS.Oscillator;
        W.Tone = shadow;
        console.info("[AW Bridge] Patched Tone via shadow object -> Oscillator routed to AudioWorklet");
        return true;
      } catch (e2) {
        console.warn("[AW Bridge] Failed to patch Tone.", e2);
        return false;
      }
    }
  };
  if (window.Tone) {
    patchTone();
  } else {
    window.addEventListener("tone-ready", () => patchTone(), { once: true });
  }

  // js/utils.js
  function clamp01(n) {
    return Number.isFinite(n) ? n < 0 ? 0 : n > 1 ? 1 : n : 0;
  }
  function pct(n) {
    return Math.round(clamp01(n) * 100);
  }
  var TAU = Math.PI * 2;
  var HALF_PI = Math.PI * 0.5;
  function on(el, type, handler, opts) {
    el?.addEventListener?.(type, handler, opts);
  }
  function off(el, type, handler, opts) {
    el?.removeEventListener?.(type, handler, opts);
  }
  function addEvents(el, pairs) {
    for (let i = 0; i < (pairs?.length || 0); i++) on(el, pairs[i][0], pairs[i][1], pairs[i][2]);
  }
  function removeEvents(el, pairs) {
    for (let i = 0; i < (pairs?.length || 0); i++) off(el, pairs[i][0], pairs[i][1], pairs[i][2]);
  }
  function setText(el, s) {
    if (el && el.textContent !== s) el.textContent = s;
  }
  function setPressed(button, value) {
    const pressed = String(!!value);
    if (button?.getAttribute?.("aria-pressed") !== pressed) button?.setAttribute?.("aria-pressed", pressed);
  }
  function toggleClass(el, cls, on2) {
    el?.classList?.toggle?.(cls, !!on2);
  }
  function byId(root, id) {
    return root?.getElementById?.(id) ?? null;
  }
  function setDisabledAll(els, disabled) {
    const d = !!disabled;
    for (const el of els || []) if (el && el.disabled !== d) el.disabled = d;
  }
  var isBool = (v) => typeof v === "boolean";
  var isNum = (v) => typeof v === "number" && !Number.isNaN(v);
  var isArray = Array.isArray;
  var g = globalThis;
  var raf = g.requestAnimationFrame || g.webkitRequestAnimationFrame || g.mozRequestAnimationFrame || ((cb) => setTimeout(cb, 16));
  var cancelRaf = g.cancelAnimationFrame || g.webkitCancelAnimationFrame || g.mozCancelAnimationFrame || clearTimeout;
  var { sin, cos, abs, PI, pow, sqrt: SQRT, imul, min, max, floor, ceil, round } = Math;
  var SQRT2 = Math.SQRT2;
  var createElement = (tag, props) => Object.assign(document.createElement(tag), props);
  var ready = (fn) => document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);
  function waitFor(predicate, timeout = 6e3) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const check = () => {
        if (predicate()) {
          resolve(true);
        } else if (performance.now() - startTime > timeout) {
          resolve(false);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }
  var theta = (i, n, ph = 0) => i / n * TAU + ph;
  var norm = (v) => (v + 1) * 0.5;

  // js/shapes.js
  var humKey = (app) => app?.humKey || "hum";
  var shapeList = (app) => {
    const fromCanvas = app?._canvas?.listShapes?.();
    const base = Array.isArray(fromCanvas) && fromCanvas.length ? fromCanvas : Array.isArray(app?.shapes) ? app.shapes : [];
    return base.filter((k) => k !== humKey(app));
  };
  var shapeCount = (app) => shapeList(app).length;
  var allKeys = (app) => [humKey(app), ...shapeList(app)];

  // js/engine.js
  function Engine(app) {
    const A = Object.assign;
    const _eachChain = (f) => {
      const cs = app.state.chains;
      for (const k in cs) f(cs[k], k);
    };
    const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const _timeNow = (T) => T?.now?.() ?? 0;
    const _setCanvas = (p) => {
      if (!app._canvas || typeof app._canvas !== "object") return;
      Object.assign(app._canvas, p);
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
    const getPatch = (shapeKey = app.state.current) => shapeKey ? _clone(app.state.presets?.[shapeKey]) : null;
    const setParam = (path, value, shapeKey = app.state.current) => {
      const s = app.state;
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
      const T = app.state?.Tone;
      if (!T) return;
      _eachChain((ch) => ch?.out?.gain && _rampLinear(ch.out.gain, 0, f, T));
      await app._sleep(Math.ceil((f + 2e-3) * 1e3));
    };
    const _disposeNode = (n) => {
      tryDo(() => n.stop?.());
      tryDo(() => n.dispose?.());
      tryDo(() => n.disconnect?.());
    };
    const _disposeChain = async (ch) => {
      const T = app.state?.Tone;
      if (T && ch?.out?.gain) {
        _rampLinear(ch.out.gain, 0, FADE, T);
        await app._sleep(Math.ceil((FADE + 2e-3) * 1e3));
      }
      for (const n of Object.values(ch || {})) _disposeNode(n);
    };
    const _updateKeyboardSynthVoice = (shapeKey) => {
      const { Tone: T, presets, keyboardSynth } = app.state;
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
    const deterministicPreset = (seed, shape) => {
      const r = _rng(`${seed}_${shape}`);
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
        seed
      };
    };
    const loadPresets = (seed) => {
      app.state.presets = Object.fromEntries(
        shapeList(app).map((k) => {
          const raw = deterministicPreset(seed, k);
          return [k, _normalizePreset(raw)];
        })
      );
    };
    const bufferHumChain = async () => {
      const { Tone: T, chains: C } = app.state;
      if (!T) return;
      const key = humKey(app);
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
        delete app.state.chains[key];
      }
    };
    const bufferShapeChain = async (shape) => {
      if (shape === humKey(app)) return bufferHumChain();
      const { Tone: T, presets: P, chains: C } = app.state;
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
        delete app.state.chains[shape];
      }
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
      if (u) shape === humKey(app) ? _setCanvas({ shapeKey: humKey(app), preset: null }) : _setCanvas({ shapeKey: shape, preset: app.state.presets[shape] });
      if (s) app.state.current = shape;
      _updateKeyboardSynthVoice(shape);
    };
    const disposeAllChains = () => {
      _eachChain(_disposeChain);
      app.state.chains = {};
      app.state.current = null;
      tryDo(() => app.state.keyboardSynth?.dispose());
      app.state.keyboardSynth = null;
    };
    const updateSequencerState = () => {
      app.sig?.updateSequencerState?.();
    };
    const stopSequence = () => {
      app.sig?.stopSequence?.();
    };
    const stopAudioSignature = () => {
      app.sig?.stopAudioSignature?.();
    };
    const resetState = () => {
      disposeAllChains();
      app.state.sequencePlaying && stopSequence();
      app.state.audioSignaturePlaying && stopAudioSignature?.();
      const { seed, Tone: T, approvedSeeds } = app.state;
      app.state = app.defaultState(seed);
      app.state.Tone = T;
      app.state.approvedSeeds = approvedSeeds || [];
      app.state.keyboardSynth = null;
      loadPresets(seed);
      bufferHumChain();
      const list = shapeList(app), r = _rng(seed), first = list.length ? list[r() * list.length | 0] : humKey(app);
      _setCanvas({ preset: app.state.presets[first] ?? null, shapeKey: first, mode: "seed", isAudioStarted: false, isPlaying: false });
      app.state.current = humKey(app);
      app._updateControls({ isAudioStarted: true, isPlaying: false, isMuted: false, shapeKey: humKey(app) });
      app.state.isSequencerMode = false;
      app._sequencerComponent.style.display = "none";
      app._main.style.overflow = "hidden";
      app.state.sequence = Array(8).fill(null);
      updateSequencerState?.();
    };
    const unlockAudioAndBufferInitial = async () => {
      const s = app.state;
      if (s.initialBufferingStarted && !s.initialShapeBuffered) {
        app._loader.textContent = "Still preparing initial synth, please wait...";
        return;
      }
      if (s.isPlaying) return stopAudioAndDraw();
      if (s.contextUnlocked) {
        if (!s.initialShapeBuffered) {
          app._loader.textContent = "Audio context unlocked, but synth not ready. Click again.";
          return;
        }
        setActiveChain(humKey(app));
        s.isPlaying = true;
        if (app._canvas) app._canvas.isPlaying = true;
        app._updateControls({ isAudioStarted: true, isPlaying: true });
        if (!s._startupSigDone) {
          await tryAwait(() => app._sleep(200));
          tryDo(() => app._triggerSignatureFor?.(humKey(app), { loop: s.isLoopEnabled }));
          setTimeout(() => tryDo(() => {
            app.cleanupHotkeyTour?.();
            app.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
          }), 60);
          s._startupSigDone = true;
        }
        app._loader.textContent = "Audio resumed (hum).";
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
        setActiveChain(humKey(app));
        for (const sh of shapeList(app)) {
          if (!s.contextUnlocked) break;
          await tryAwait(() => bufferShapeChain(sh));
          await _sleep(0);
        }
        s.initialShapeBuffered = true;
        s.isPlaying = true;
        if (app._canvas) app._canvas.isPlaying = true;
        app._updateControls({ isAudioStarted: true, isPlaying: true });
        if (!s._startupSigDone) {
          await tryAwait(() => app._sleep(200));
          tryDo(() => app._triggerSignatureFor?.(humKey(app), { loop: s.isLoopEnabled }));
          setTimeout(() => tryDo(() => {
            app.cleanupHotkeyTour?.();
            app.runHotkeyTour?.({ stepMs: 260, holdMs: 1e3 });
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
      const s = app.state;
      if (!s.isPlaying && !s.initialBufferingStarted) return;
      tryDo(() => app.cleanupHotkeyTour?.());
      if (s.audioSignatureTimer) {
        tryDo(() => clearTimeout(s.audioSignatureTimer));
        s.audioSignatureTimer = null;
      }
      s.isPlaying = s.initialBufferingStarted = s.initialShapeBuffered = false;
      disposeAllChains();
      s.sequencePlaying && stopSequence?.();
      s.audioSignaturePlaying && stopAudioSignature?.();
      if (app._canvas) {
        app._canvas.isPlaying = false;
        app._canvas.isAudioStarted = false;
      }
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
      app._loader.textContent = s.isMuted ? "Muted." : "Unmuted.";
    };
    const _onVolumeChange = (e) => {
      const v = e?.detail?.value;
      if (typeof v !== "number") return;
      const s = app.state;
      s.volume = Math.min(1, Math.max(0, v));
      const T = s.Tone;
      const newVolumeDb = _linToDb(s.volume);
      T?.Destination?.volume && (T.Destination.volume.value = newVolumeDb);
      s.keyboardSynth?.volume && (s.keyboardSynth.volume.value = newVolumeDb);
      app._updateControls({ volume: s.volume });
    };
    const _onShapeChange = (e) => {
      const k = e?.detail?.shapeKey;
      if (!k) return;
      const s = app.state, HUM = humKey(app);
      if (!s.audioSignaturePlaying && !s.signatureSequencerRunning) s._uiReturnShapeKey = k !== HUM ? k : s._uiReturnShapeKey;
      if (!s.contextUnlocked || !s.initialShapeBuffered) {
        k === HUM ? _setCanvas({ shapeKey: HUM, preset: null, mode: "seed" }) : _setCanvas({ shapeKey: k, preset: s.presets[k], mode: "seed" });
        app._updateControls({ shapeKey: k });
        return;
      }
      setActiveChain(k);
      k !== HUM && _setCanvas({ shapeKey: k, preset: s.presets[k], mode: "live" });
      app._canvas.isPlaying = !app.state.Tone?.Destination?.mute;
      app._updateControls({ shapeKey: k });
      s.current = k;
    };
    const playNote = (note, velocity = 1) => {
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
      if (!shapeKey || !app.state.presets[shapeKey]) return;
      _onShapeChange({ detail: { shapeKey } });
    };
    const setInstrumentSilent = (shapeKey) => {
      if (!shapeKey) return;
      const s = app.state;
      if (!s.presets || !s.presets[shapeKey]) return;
      s.current = shapeKey;
      _updateKeyboardSynthVoice(shapeKey);
      _emitPatch(shapeKey, s.presets[shapeKey]);
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
  function Signatures(app) {
    const HUM = () => humKey(app), LIST = () => shapeList(app), COUNT = () => shapeCount(app), ALL = () => allKeys(app);
    const rInt = (r, a, b) => a + Math.floor(r() * (b - a + 1));
    const rVal = (r) => rInt(r, 0, COUNT());
    const rNon = (r) => {
      const N = COUNT();
      return N > 0 ? rInt(r, 1, N) : 0;
    };
    const _onToggleSequencer = () => {
      const s = app.state;
      s.isSequencerMode = !s.isSequencerMode;
      app._sequencerComponent && (app._sequencerComponent.style.display = s.isSequencerMode ? "block" : "none");
      if (!s.isSequencerMode) {
        s.isRecording = false;
        s.currentRecordSlot = -1;
        s.sequencePlaying && stopSequence();
        s.signatureSequencerRunning && _stopSignatureSequencer();
      } else updateSequencerState();
      app._updateControls({ sequencerVisible: s.isSequencerMode });
      typeof app._fitLayout == "function" && app._fitLayout();
    };
    const _onLoopToggle = () => {
      const s = app.state;
      s.isLoopEnabled = !s.isLoopEnabled;
      app._updateControls();
      try {
        app._pathRec?.setLoop?.(s.isLoopEnabled);
      } catch {
      }
    };
    const _onSignatureModeToggle = () => {
      const s = app.state;
      s.isSequenceSignatureMode = !s.isSequenceSignatureMode;
      app._updateControls();
      s.sequencePlaying && stopSequence();
      s.audioSignaturePlaying && stopAudioSignature();
    };
    const _getUniqueAlgorithmMapping = (seed) => {
      const r = app._rng(`${seed}_unique_algo_mapping`);
      const keys = ALL(), n = keys.length;
      const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const pool = [];
      while (pool.length < n) pool.push(...base);
      pool.length = n;
      for (let i = pool.length - 1; i > 0; i--) {
        const j = r() * (i + 1) | 0;
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const m = {};
      keys.forEach((k, i) => m[k] = pool[i]);
      return m;
    };
    const _generateSignatureWithConstraints = (seed, { steps = 32, paletteSize = 6, pRepeat = 0.35, pHum = 0.15, pSilence = 0.2, avoidBackAndForth = true } = {}) => {
      const r = app._rng(`${seed}_audio_signature_constrained`);
      const N = COUNT(), pal = Math.max(1, Math.min(N, paletteSize));
      const seq = [];
      let last = null, prev = null;
      for (let i = 0; i < steps; i++) {
        if (r() < pSilence) {
          seq.push(null);
          continue;
        }
        const roll = r();
        let next;
        if (roll < pHum) next = 0;
        else if (roll < pHum + pRepeat && prev !== null) next = prev;
        else {
          do {
            next = rInt(r, 1, pal);
            if (avoidBackAndForth && last !== null && last >= 1 && next >= 1 && seq.length >= 2 && seq.at(-2) === next) next = null;
          } while (next === null);
        }
        seq.push(next);
        if (next !== null) {
          if (next >= 1) prev = next;
          last = next;
        }
      }
      return seq;
    };
    const generateAudioSignature = (seed, alg = 1) => {
      const r = app._rng(`${seed}_audio_signature_v${alg}`), S = 32, N = COUNT();
      switch (alg) {
        case 1: {
          const a = [];
          for (let i = 0; i < S; i++) a.push(rVal(r));
          return a;
        }
        case 2:
          return _generateSignatureWithConstraints(seed, { steps: S, paletteSize: Math.min(6, Math.max(1, N)), pRepeat: 0.35, pHum: 0.15, pSilence: 0.2, avoidBackAndForth: true });
        case 3: {
          const L = 8, p = Array.from({ length: L }, () => rVal(r));
          return Array.from({ length: S }, (_, i) => p[i % L]);
        }
        case 4: {
          const a = [0];
          let cur = 0;
          for (let i = 1; i < S; i++) {
            const dir = r() > 0.5 ? 1 : -1, step = (r() * 3 | 0) + 1;
            cur = Math.max(0, Math.min(N, cur + dir * step));
            a.push(cur);
          }
          return a;
        }
        case 5: {
          const a = [];
          let c = rVal(r);
          for (let i = 0; i < S; ) {
            const len = Math.min((r() * 6 | 0) + 2, S - i);
            for (let j = 0; j < len; j++, i++) a.push(c);
            c = rVal(r);
          }
          return a;
        }
        case 6: {
          const a = [];
          for (let i = 0; i < S; i++) a.push(r() > 0.7 ? rNon(r) : 0);
          return a;
        }
        case 7: {
          const a = new Array(S).fill(0);
          let pos = 0, x = 1, y = 1;
          while (pos < S) {
            a[pos] = rNon(r);
            const n = x + y;
            x = y;
            y = n;
            pos += n;
          }
          return a;
        }
        case 8: {
          const a = rVal(r), b = rVal(r);
          return Array.from({ length: S }, (_, i) => i % 2 === 0 ? a : b);
        }
        case 9: {
          let v = rNon(r);
          const a = [];
          for (let i = 0; i < S; i++) {
            if (r() < 0.2 || v === 0) v = rVal(r);
            a.push(v);
            if (r() > 0.7) v = Math.max(0, v - 1);
          }
          return a;
        }
        case 10: {
          let c = rVal(r);
          const a = [];
          for (let i = 0; i < S; i++) {
            if (i % 8 === 0 || r() > 0.6) c = rVal(r);
            a.push(c);
          }
          return a;
        }
        default:
          return _generateSignatureWithConstraints(seed);
      }
    };
    const _onAudioSignature = () => {
      const s = app.state;
      if (s.audioSignaturePlaying) {
        stopAudioSignature();
        app._updateControls({ isAudioSignaturePlaying: false });
        return;
      }
      if (!s.contextUnlocked || !s.initialShapeBuffered) return;
      const sel = s._uiReturnShapeKey || s.current || HUM();
      _triggerSignatureFor(sel, { loop: s.isLoopEnabled });
      app._updateControls({ isAudioSignaturePlaying: true });
    };
    const _triggerSignatureFor = (shapeKey, { loop = app.state.isLoopEnabled } = {}) => {
      const s = app.state;
      if (!s.contextUnlocked || !s.initialShapeBuffered) return;
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
      const cur = typeof s.current === "string" && s.current ? s.current : null;
      s._uiReturnShapeKey = cur || s._uiReturnShapeKey || HUM();
      s._sigStartShapeKey = s._uiReturnShapeKey;
      s.audioSignaturePlaying = true;
      s.audioSignatureStepIndex = 0;
      s.audioSignatureOnComplete = onComplete;
      app._updateControls({ isAudioSignaturePlaying: true });
      const stepTime = alg === 3 || alg === 7 ? 100 : alg === 5 ? 150 : alg === 10 ? 200 : 125;
      const finishAndReturn = () => {
        const s2 = app.state;
        try {
          app.cleanupHotkeyTour?.();
        } catch {
        }
        if (s2.isLatchOn) {
          s2.isLatchOn = false;
          try {
            app._pathRec?.setLatch?.(false);
          } catch {
          }
          app._updateControls();
        }
        const hum = HUM();
        const startKey = s2._sigStartShapeKey || s2._uiReturnShapeKey || hum;
        try {
          app.setActiveChain(hum, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false });
        } catch {
        }
        try {
          if (app._canvas) app._canvas.isPlaying = false;
        } catch {
        }
        try {
          const preset = startKey === hum ? null : s2.presets?.[startKey] || null;
          if (app._canvas) Object.assign(app._canvas, { shapeKey: startKey, preset, mode: "live" });
          app._updateControls({ shapeKey: startKey });
        } catch {
        }
        s2._uiReturnShapeKey = startKey;
        s2._sigStartShapeKey = null;
      };
      const tick = () => {
        const s2 = app.state;
        if (!s2.audioSignaturePlaying) return;
        const i = s2.audioSignatureStepIndex;
        const val = sequence[i];
        if (val !== null) {
          const sk = val === 0 ? HUM() : LIST()[val - 1];
          if (sk) app._onShapeChange({ detail: { shapeKey: sk } });
        }
        s2.audioSignatureStepIndex++;
        if (s2.audioSignatureStepIndex >= sequence.length) {
          const finishOnce = () => {
            s2.audioSignaturePlaying = false;
            s2.audioSignatureTimer = null;
            app._updateControls({ isAudioSignaturePlaying: false });
            const cb = s2.audioSignatureOnComplete;
            s2.audioSignatureOnComplete = null;
            typeof cb === "function" ? cb() : app._loader.textContent = "Audio Signature complete.";
          };
          if (s2.isLoopEnabled) {
            s2.audioSignatureStepIndex = 0;
            s2.audioSignatureTimer = setTimeout(tick, stepTime);
          } else {
            finishAndReturn();
            s2.audioSignatureTimer = setTimeout(finishOnce, stepTime);
          }
          return;
        }
        s2.audioSignatureTimer = setTimeout(tick, stepTime);
      };
      tick();
    };
    const stopAudioSignature = () => {
      const s = app.state;
      if (s.audioSignatureTimer) {
        clearTimeout(s.audioSignatureTimer);
        s.audioSignatureTimer = null;
      }
      try {
        app.cleanupHotkeyTour?.();
      } catch {
      }
      s.audioSignaturePlaying = false;
      s.audioSignatureStepIndex = 0;
      app._updateControls({ isAudioSignaturePlaying: false });
      if (s.isLatchOn) {
        s.isLatchOn = false;
        try {
          app._pathRec?.setLatch?.(false);
        } catch {
        }
        app._updateControls();
      }
      const hum = HUM();
      const startKey = s._sigStartShapeKey || s._uiReturnShapeKey || hum;
      try {
        app.setActiveChain(hum, { updateCanvasShape: false, setStateCurrent: true, syncCanvasPlayState: false });
      } catch {
      }
      try {
        if (app._canvas) app._canvas.isPlaying = false;
      } catch {
      }
      try {
        const preset = startKey === hum ? null : s.presets?.[startKey] || null;
        if (app._canvas) Object.assign(app._canvas, { shapeKey: startKey, preset, mode: "live" });
        app._updateControls({ shapeKey: startKey });
      } catch {
      }
      s._uiReturnShapeKey = startKey;
      s._sigStartShapeKey = null;
      s.audioSignatureOnComplete = null;
    };
    const _onSeqRecordStart = (e) => {
      const i = e?.detail?.slotIndex ?? -1;
      app.state.isRecording = true;
      app.state.currentRecordSlot = i;
      app._updateControls();
    };
    const _onSeqStepCleared = (e) => {
      const i = e?.detail?.slotIndex;
      if (typeof i !== "number") return;
      const s = app.state;
      s.sequence[i] = null;
      if (s.isRecording && s.currentRecordSlot === i) {
        s.currentRecordSlot = (i + 1) % 8;
        s.currentRecordSlot === 0 && (s.isRecording = false);
      }
    };
    const _onSeqStepRecorded = (e) => {
      const d = e?.detail ?? {};
      typeof d.slotIndex == "number" && (app.state.sequence[d.slotIndex] = d.value);
      typeof d.nextSlot == "number" && (app.state.currentRecordSlot = d.nextSlot);
      typeof d.isRecording == "boolean" && (app.state.isRecording = d.isRecording);
    };
    const _onSeqPlayStarted = (e) => {
      const t = e?.detail?.stepTime, s = app.state;
      s.sequencePlaying = true;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      s.isSequencerMode = true;
      typeof t == "number" && (s.stepTime = t);
      app._updateControls();
      s.isSequenceSignatureMode && (app._sequencerComponent?.stopSequence(), _startSignatureSequencer());
    };
    const _onSeqPlayStopped = () => {
      const s = app.state;
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      s.isSequencerMode = false;
      s.signatureSequencerRunning && _stopSignatureSequencer();
      if (!s.isLatchOn) {
        try {
          const h = HUM();
          app._updateControls({ shapeKey: h });
          app._onShapeChange({ detail: { shapeKey: h } });
        } catch {
        }
      }
      app._updateControls();
    };
    const _onSeqStepAdvance = (e) => {
      if (app.state.isSequenceSignatureMode) return;
      const d = e?.detail || {}, s = app.state;
      const i = typeof d.stepIndex == "number" ? d.stepIndex : typeof d.index == "number" ? d.index : s.sequenceStepIndex;
      const v = d.value;
      if (s.sequencePlaying) {
        if (i === 0) {
          if (s._seqFirstCycleStarted) {
            if (!s.isLoopEnabled) {
              stopSequence();
              return;
            }
          } else s._seqFirstCycleStarted = true;
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
    const _onSeqStepTimeChanged = (e) => {
      const t = e?.detail?.stepTime;
      typeof t == "number" && (app.state.stepTime = t);
    };
    const _onSeqStepsChanged = (e) => {
      const n = e?.detail?.steps;
      if (typeof n == "number" && n > 0) {
        const s = app.state;
        s.sequenceSteps = n;
        if (n !== s.sequence.length) {
          const oldSeq = [...s.sequence], oldVel = [...s.velocities || []];
          s.sequence = Array.from({ length: n }, (_, i) => oldSeq[i] ?? null);
          s.velocities = Array.from({ length: n }, (_, i) => oldVel[i] ?? 1);
        }
        updateSequencerState();
      }
    };
    const _startSignatureSequencer = async () => {
      const s = app.state;
      if (s.signatureSequencerRunning) return;
      s.signatureSequencerRunning = true;
      stopAudioSignature();
      const map = _getUniqueAlgorithmMapping(s.seed);
      const pass = async () => {
        if (!s.signatureSequencerRunning) return;
        for (let i = 0; i < s.sequence.length; i++) {
          if (!s.signatureSequencerRunning) return;
          s.sequenceStepIndex = i;
          updateSequencerState();
          const v = s.sequence[i];
          if (v === null || typeof v !== "number" || v < 0) {
            await app._sleep(Math.max(50, s.stepTime));
            continue;
          }
          let sk = null;
          if (v === 0) sk = HUM();
          else if (v >= 1 && v <= COUNT()) sk = LIST()[v - 1];
          if (!sk) {
            await app._sleep(Math.max(50, s.stepTime));
            continue;
          }
          const alg = map[sk] || 1, seq = generateAudioSignature(s.seed, alg);
          await new Promise((res) => {
            if (!s.signatureSequencerRunning) {
              res();
              return;
            }
            playAudioSignature(seq, alg, { onComplete: () => res() });
          });
          if (!s.signatureSequencerRunning) return;
          await app._sleep(Math.max(30, s.stepTime));
        }
      };
      await pass();
      if (!s.signatureSequencerRunning) return;
      if (s.isLoopEnabled && s.sequencePlaying) {
        while (s.signatureSequencerRunning && s.sequencePlaying && s.isLoopEnabled) await pass();
      }
      _stopSignatureSequencer();
      app._sequencerComponent?.stopSequence?.();
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
    const recordStep = (n) => {
      app._sequencerComponent?.recordStep(n);
    };
    const playSequence = () => {
      app._sequencerComponent?.playSequence();
    };
    const stopSequence = () => {
      app._sequencerComponent?.stopSequence();
      const s = app.state;
      s.signatureSequencerRunning && _stopSignatureSequencer();
      s.audioSignaturePlaying && stopAudioSignature();
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      updateSequencerState();
      app._updateControls();
    };
    return {
      _onToggleSequencer,
      _onLoopToggle,
      _onSignatureModeToggle,
      _getUniqueAlgorithmMapping,
      generateAudioSignature,
      _generateSignatureWithConstraints,
      _onAudioSignature,
      _triggerSignatureFor,
      playAudioSignature,
      stopAudioSignature,
      _onSeqRecordStart,
      _onSeqStepCleared,
      _onSeqStepRecorded,
      _onSeqPlayStarted,
      _onSeqPlayStopped,
      _onSeqStepAdvance,
      _onSeqStepTimeChanged,
      _onSeqStepsChanged,
      _startSignatureSequencer,
      _stopSignatureSequencer,
      updateSequencerState,
      recordStep,
      playSequence,
      stopSequence
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

  // js/scope-canvas.js
  (() => {
    const DEFAULTS = {
      PROB: {
        "mono-prob": 0.02,
        "half-dominant-prob": 0.05,
        "group-strobe-prob": 0.01,
        "dark-palette-prob": 0.01,
        "neutral-palette-prob": 0.05
      },
      HALF_DOMINANT_RATIO: 0.5,
      CYCLER_SPEEDS: { slow: 0.03, medium: 0.06, fast: 0.12, lightning: 0.6 },
      EFFECT_WEIGHTS: { none: 60, glow: 25, strobe: 10, neon: 5 },
      CYC_SPEED_WEIGHTS: { slow: 25, medium: 40, fast: 25, lightning: 10 },
      // base bright palette
      COLOR_WEIGHTS: {
        bitcoin_orange: 3,
        stacks_purple: 2,
        deep_purple: 2,
        light_magenta: 3,
        shocking_pink: 4,
        royal_blue: 10,
        dark_green: 3,
        bright_pink: 6,
        bright_red: 12,
        dark_red: 6,
        bright_yellow: 1,
        gold: 1,
        white: 3,
        dark_gray: 2,
        cycler: 3
      },
      // dark-biased
      DARK_COLOR_WEIGHTS: {
        extra_dark_purple: 2,
        very_dark_blue: 2,
        very_dark_green: 3,
        dark_red: 5,
        extra_dark_gray: 3,
        charcoal: 2,
        near_black: 1,
        gold: 1
      },
      // neutral-biased
      NEUTRAL_COLOR_WEIGHTS: {
        near_black: 4,
        extra_dark_gray: 5,
        charcoal: 5,
        dark_gray: 5,
        slate_gray: 4,
        dim_gray: 4,
        silver: 3,
        gainsboro: 3,
        off_white: 4,
        white: 3
      },
      NAMED_COLORS: {
        bitcoin_orange: "#F7931A",
        stacks_purple: "#5546FF",
        deep_purple: "#4B1EFF",
        light_magenta: "#FF4FD8",
        shocking_pink: "#FF00A8",
        bright_pink: "#FF1493",
        bright_red: "#FF1A1A",
        dark_red: "#6A0000",
        royal_blue: "#0726a2ff",
        dark_green: "#017210ff",
        bright_yellow: "#FFD400",
        gold: "#FFD700",
        white: "#FFFFFF",
        dark_gray: "rgba(16,16,24,0.40)",
        stacks_purple_dark: "#241E72",
        extra_dark_purple: "#1C0033",
        very_dark_blue: "#0B1E3A",
        very_dark_green: "#012B1B",
        extra_dark_gray: "#0F1014",
        charcoal: "#14161C",
        slate_gray: "#2A2F3A",
        dim_gray: "#6E6E73",
        silver: "#C0C0C8",
        gainsboro: "#DDDEE3"
      }
    };
    const DARK_COLOR_KEYS = Object.keys(DEFAULTS.DARK_COLOR_WEIGHTS);
    const NEUTRAL_COLOR_KEYS = Object.keys(DEFAULTS.NEUTRAL_COLOR_WEIGHTS);
    const _hash32 = (str) => {
      let a = 0;
      for (let i = 0; i < str.length; i++) a = (a << 5) - a + str.charCodeAt(i);
      return a | 0;
    };
    const _rngFrom = (str) => {
      let s = _hash32(str);
      return () => {
        s = s + 1831565813 | 0;
        let t = imul(s ^ s >>> 15, 1 | s);
        t = t + imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    };
    const _jsonAttr = (el, name, fallback) => {
      try {
        const raw = el?.getAttribute?.(name);
        if (!raw) return fallback;
        const obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : fallback;
      } catch {
        return fallback;
      }
    };
    const _pickWeightedKey = (rand, weights) => {
      const keys = Object.keys(weights);
      if (!keys.length) return null;
      const positives = keys.map((k) => max(0, +weights[k] || 0));
      const sum = positives.reduce((a, b) => a + b, 0);
      if (sum <= 0) return keys[0];
      let r = rand() * sum;
      for (let i = 0; i < keys.length; i++) {
        r -= positives[i];
        if (r <= 0) return keys[i];
      }
      return keys.at(-1);
    };
    const _onlyKeys = (weights, allowed) => Object.fromEntries(allowed.filter((k) => k in weights).map((k) => [k, weights[k]]));
    const _chooseSubset = (rand, items, k) => {
      const arr = items.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = rand() * (i + 1) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(0, k);
    };
    const SHAPE_PARAMS = {
      circle: { freq: 1, harmonics: [1, 0.5, 0.25], complexity: 0.3 },
      square: { freq: 1.5, harmonics: [1, 0.3, 0.7, 0.2], complexity: 0.6 },
      butterfly: { freq: 2.2, harmonics: [1, 0.4, 0.6, 0.3, 0.2], complexity: 0.8 },
      Bowditch: { freq: 1.8, harmonics: [1, 0.6, 0.4], complexity: 0.5 },
      spiro: { freq: 3.1, harmonics: [1, 0.3, 0.5, 0.2, 0.4], complexity: 0.9 },
      harmonograph: { freq: 2.5, harmonics: [1, 0.7, 0.5, 0.3, 0.2, 0.1], complexity: 1 },
      rose: { freq: 1.7, harmonics: [1, 0.4, 0.3, 0.2], complexity: 0.4 },
      hypocycloid: { freq: 2.8, harmonics: [1, 0.5, 0.3, 0.4], complexity: 0.7 },
      epicycloid: { freq: 2.9, harmonics: [1, 0.4, 0.5, 0.3], complexity: 0.7 },
      spiral: { freq: 1.3, harmonics: [1, 0.3, 0.2], complexity: 0.4 },
      star: { freq: 2.1, harmonics: [1, 0.6, 0.4, 0.2], complexity: 0.6 },
      flower: { freq: 1.9, harmonics: [1, 0.5, 0.3, 0.4], complexity: 0.5 },
      wave: { freq: 1.1, harmonics: [1, 0.4, 0.2], complexity: 0.3 },
      mandala: { freq: 3.5, harmonics: [1, 0.3, 0.4, 0.2, 0.3, 0.1], complexity: 1.2 },
      infinity: { freq: 1.6, harmonics: [1, 0.5, 0.3], complexity: 0.4 },
      dna: { freq: 2.7, harmonics: [1, 0.4, 0.3, 0.5, 0.2], complexity: 0.8 },
      tornado: { freq: 3.2, harmonics: [1, 0.3, 0.6, 0.2, 0.4], complexity: 1.1 },
      hum: { freq: 0.8, harmonics: [1, 0.2, 0.1], complexity: 0.2 }
    };
    class ScopeCanvas extends HTMLElement {
      constructor() {
        super();
        const sh = this.attachShadow({ mode: "open" });
        const st = document.createElement("style");
        st.textContent = ":host{display:block;width:100%;height:100%}canvas{display:block;width:100%;height:100%}";
        sh.append(st);
        this._canvas = document.createElement("canvas");
        sh.append(this._canvas);
        this._ctx = this._canvas.getContext("2d");
        this.analyser = null;
        this.preset = null;
        this.shapeKey = "circle";
        this.mode = "seed";
        this.isAudioStarted = false;
        this.isPlaying = false;
        this.onIndicatorUpdate = null;
        this._plan = null;
        this._dummyData = null;
        this._liveBuffer = null;
        this._animId = null;
        this._cssW = 0;
        this._cssH = 0;
        this._dpr = 1;
        this._animate = this._animate.bind(this);
        this._resizeCanvas = this._resizeCanvas.bind(this);
        this._samp = (a, i) => a ? a[i % a.length] ?? 0 : 0;
        this._ampAt = (a, i) => norm(this._samp(a, i));
        this._avgAbs = (a) => a.reduce?.((s, v) => s + abs(v), 0) / a.length;
        this._withCtx = (fn) => {
          const cw = this._cssW || this._canvas.clientWidth || this._canvas.width;
          const cx = this._canvas.width / 2 | 0, cy = this._canvas.height / 2 | 0;
          const c = min(cx, cy) / (this._dpr || 1);
          return fn(this._ctx, cw, c);
        };
        this._traceParam = (data, map, { close = false } = {}) => this._withCtx((ctx, cw, c) => {
          ctx.beginPath();
          for (let i = 0, n = data.length; i < n; i++) {
            const [x, y] = map(i, n, cw, c);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          if (close) ctx.closePath();
          ctx.stroke();
        });
        this._tracePolar = (data, rFn, { phase = 0, close = false } = {}) => this._traceParam(data, (i, n, cw, c) => {
          const th = theta(i, n, phase), r = rFn(i, n, th, cw, c);
          return [c + cos(th) * r, c + sin(th) * r];
        }, { close });
        this._prepareStroke = (cssColor, { effect = "none", now = 0 } = {}) => {
          const ctx = this._ctx;
          ctx.clearRect(0, 0, this._cssW, this._cssH);
          ctx.globalCompositeOperation = "source-over";
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2;
          ctx.lineJoin = ctx.lineCap = "round";
          if (effect === "glow") {
            ctx.shadowBlur = 16;
            ctx.shadowColor = cssColor;
          } else if (effect === "neon") {
            ctx.shadowBlur = 28;
            ctx.shadowColor = cssColor;
            ctx.globalCompositeOperation = "lighter";
            ctx.lineWidth = 2.6;
          } else if (effect === "strobe") {
            const hz = 10 + now % 1e3 * 2e-3;
            const phase = now * hz / 1e3 % 1 < 0.5;
            ctx.globalAlpha = phase ? 1 : 0.22;
          }
          ctx.strokeStyle = cssColor;
        };
        const cycloid = (k) => (data, t) => this._withCtx((ctx, cw, c) => {
          const epi = k === "epi" ? 1 : -1, S = (k === "epi" ? 0.36 : 0.39) * cw;
          const n = k === "epi" ? 4 + Math.round(3 * abs(sin(t * 21e-5 + 0.5))) : 3 + Math.round(3 * abs(cos(t * 23e-5)));
          const R = 1, r = 1 / n, coef = (R + epi * r) / r, ph = k === "epi" ? t * 38e-5 : t * 4e-4;
          this._traceParam(data, (i, N) => {
            const th = theta(i, N, ph), M = 0.7 + 0.3 * this._ampAt(data, i);
            const x = S * ((R + epi * r) * cos(th) - epi * r * cos(coef * th)) * M, y = S * ((R + epi * r) * sin(th) - r * sin(coef * th)) * M;
            return [c + x, c + y];
          }, { close: true });
        });
        this.drawFuncs = {
          hum: (d, t) => this._withCtx((ctx, cw, c) => {
            const R = 0.33 * cw + sin(t * 2e-4) * 5;
            ctx.save();
            ctx.globalAlpha = 0.23 + 0.14 * abs(sin(t * 4e-4));
            ctx.beginPath();
            ctx.arc(c, c, R, 0, TAU);
            ctx.stroke();
            const mono = !!this._plan?.isMono;
            ctx.strokeStyle = mono ? this._getColorFor("hum", t).css : "hsl(195, 80%, 62%)";
            ctx.globalAlpha = 0.36;
            ctx.beginPath();
            for (let i = 0, s = 128; i < s; i++) {
              const th = i / s * TAU, ripple = 12 * sin(th * 3 + t * 45e-5) + 6 * sin(th * 6 - t * 32e-5);
              const r = R + ripple + this._samp(d, i) * 7, x = c + cos(th) * r, y = c + sin(th) * r;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }),
          circle: (d, t) => this._withCtx((_, cw, c) => this._traceParam(d, (i, n) => {
            const th = theta(i, n, t * 1e-3), r = 0.4 * cw * this._ampAt(d, i);
            return [c + cos(th) * r, c + sin(th) * r];
          }, { close: true })),
          square: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.8 * cw / SQRT2, o = (cw - S) / 2, jx = sin(t * 5e-4) * 10, jy = cos(t * 6e-4) * 10;
            const seg = (p) => p < 0.25 ? [o + S * (p / 0.25), o] : p < 0.5 ? [o + S, o + S * ((p - 0.25) / 0.25)] : p < 0.75 ? [o + S - S * ((p - 0.5) / 0.25), o + S] : [o, o + S - S * ((p - 0.75) / 0.25)];
            this._traceParam(d, (i, n) => {
              const p = i / n, [x, y] = seg(p);
              if (!i) return [x, y];
              const A = 0.8 + 0.2 * this._ampAt(d, i);
              return [c + (x - c) * A + jx, c + (y - c) * A + jy];
            }, { close: true });
          }),
          butterfly: (d, t) => this._withCtx(
            () => this._traceParam(d, (i, n, cw, c) => {
              const th = i / n * PI * 28 + t * 35e-5;
              const a = pow(this._ampAt(d, i), 1.25);
              const s = Math.exp(0.85 * cos(th)) - 1.6 * cos(5 * th) + pow(sin(th / 10), 7);
              const r = s * 0.22 * cw * (0.5 + 0.5 * a);
              return [c + sin(th) * r, c + cos(th) * r];
            }, { close: true })
          ),
          Bowditch: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.8 * cw / 3, avg = this._avgAbs(d), fx = 3 + sin(t * 3e-4) * 1.5, fy = 2 + cos(t * 4e-4) * 1.5, ph = t * 5e-4;
            this._traceParam(d, (i, n) => {
              const th = theta(i, n), r = avg * (0.5 + 0.5 * this._samp(d, i));
              return [c + sin(fx * th + ph) * S * r, c + sin(fy * th) * S * r];
            });
          }),
          spiro: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.6 * cw / 3, inner = 0.3 + sin(t * 2e-4) * 0.2, outer = 0.7, ratio = 0.21 + 0.02 * sin(t * 1e-4), co = (outer - inner) / inner;
            this._traceParam(d, (i, n) => {
              const th = theta(i, n), w = this._ampAt(d, i), M = 0.8 + 0.2 * w;
              const x = (S * (outer - inner) * cos(th) + S * inner * cos(co * th + t * ratio)) * M, y = (S * (outer - inner) * sin(th) - S * inner * sin(co * th + t * ratio)) * M;
              return [c + x, c + y];
            });
          }),
          harmonograph: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.7 * cw / 4;
            this._traceParam(d, (i, n) => {
              const th = theta(i, n), s1 = sin(3 * th + t * 3e-4) * 0.7 + sin(5 * th + t * 4e-4) * 0.3, s2 = sin(4 * th + t * 35e-5) * 0.6 + sin(6 * th + t * 25e-5) * 0.4, a = 0.5 + 0.5 * this._samp(d, i);
              return [c + S * s1 * a, c + S * s2 * a];
            });
          }),
          rose: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.42 * cw, k = 3 + Math.round(abs(sin(t * 25e-5)) * 4);
            this._tracePolar(d, (_2, __, th) => S * cos(k * th) * (0.65 + 0.35 * this._ampAt(d, _2)), { phase: t * 35e-5, close: true });
          }),
          hypocycloid: cycloid("hypo"),
          epicycloid: cycloid("epi"),
          spiral: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.4 * cw;
            this._traceParam(d, (i, n) => {
              const th = i / n * TAU * 8 + t * 3e-4, r = S * (i / n) * (0.6 + 0.4 + this._ampAt(d, i));
              return [c + cos(th) * r, c + sin(th) * r];
            });
          }),
          star: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.45 * cw, p = 5 + Math.round(3 * abs(sin(t * 2e-4)));
            this._tracePolar(d, (i, __, th) => S * (sin(p * th) * 0.5 + 0.5) * (0.7 + 0.3 * this._ampAt(d, i)), { phase: t * 4e-4, close: true });
          }),
          flower: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.4 * cw, pt = 6 + Math.round(2 * abs(cos(t * 15e-5)));
            this._tracePolar(d, (i, __, th) => S * (cos(pt * th) * 0.3 + 0.7) * (0.6 + 0.4 * this._ampAt(d, i)), { phase: t * 3e-4, close: true });
          }),
          wave: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.6 * cw, n = d.length, fq = 3 + sin(t * 2e-4) * 2;
            this._traceParam(d, (i) => {
              const x = i / n * S - S / 2, y = sin(x * fq / 50 + t * 1e-3) * S * 0.3 * this._ampAt(d, i);
              return [c + x, c + y];
            });
          }),
          mandala: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.35 * cw;
            this._tracePolar(d, (i, __, th) => S * (0.8 + cos(6 * th) * 0.3 + sin(12 * th) * 0.2 + cos(18 * th) * 0.1) * (0.7 + 0.3 * this._ampAt(d, i)), { phase: t * 2e-4, close: true });
          }),
          infinity: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.4 * cw;
            this._traceParam(d, (i, n) => {
              const th = theta(i, n, t * 3e-4), sc = 0.7 + 0.3 * this._ampAt(d, i), den = 1 + sin(th) * sin(th);
              return [c + S * cos(th) / den * sc, c + S * sin(th) * cos(th) / den * sc];
            });
          }),
          dna: (d, t) => this._withCtx((ctx, cw, c) => {
            const S = 0.3 * cw, n = d.length, H = cw * 0.8, helix = (ph) => {
              ctx.beginPath();
              for (let i = 0; i < n; i++) {
                const z = i / n * 4 * PI + ph + t * 1e-3, a = 0.7 + 0.3 * this._ampAt(d, i), x = c + cos(z) * S * a, y = c + (i / n - 0.5) * H;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
              }
              ctx.stroke();
            };
            helix(0);
            helix(PI);
          }),
          tornado: (d, t) => this._withCtx((_, cw, c) => {
            const S = 0.4 * cw;
            this._traceParam(d, (i, n) => {
              const p = i / n, th = p * TAU * 6 + t * 5e-4, r = S * (1 - p) * (0.6 + 0.4 * this._ampAt(d, i));
              return [c + cos(th) * r, c + (p - 0.5) * cw * 0.7];
            });
          })
        };
      }
      // ---------------- Lifecycle ----------------
      listShapes() {
        return Object.keys(this.drawFuncs).filter((k) => k !== "hum");
      }
      connectedCallback() {
        if (!this._animId) this._animId = requestAnimationFrame(this._animate);
        try {
          this._ro = new ResizeObserver(this._resizeCanvas);
          this._ro.observe(this);
        } catch {
          this._resizeCanvas();
        }
        this._resizeCanvas();
      }
      disconnectedCallback() {
        if (this._animId) cancelAnimationFrame(this._animId), this._animId = null;
        if (this._ro) {
          try {
            this._ro.disconnect();
          } catch {
          }
          this._ro = null;
        }
      }
      // ---------------- Layout ----------------
      _resizeCanvas() {
        const { width, height } = this.getBoundingClientRect?.() ?? { width: this._cssW, height: this._cssH };
        const cssW = max(1, width | 0), cssH = max(1, height | 0), dpr = min(4, max(1, window.devicePixelRatio || 1));
        if (cssW === this._cssW && cssH === this._cssH && dpr === this._dpr) return;
        this._cssW = cssW;
        this._cssH = cssH;
        this._dpr = dpr;
        const devW = max(1, Math.round(cssW * dpr)), devH = max(1, Math.round(cssH * dpr));
        const cv = this._canvas;
        if (cv.width !== devW) cv.width = devW;
        if (cv.height !== devH) cv.height = devH;
        const ctx = this._ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, devW, devH);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      // ---------------- Data ----------------
      _getSeed() {
        return this.preset?.seed ?? this.closest?.("osc-app")?.getAttribute?.("seed") ?? document.documentElement?.dataset?.seed ?? "default";
      }
      _makeSeedBuffer(shape, seed, len = 2048) {
        const str = `${seed}_${shape}`;
        let a = 0;
        for (let i = 0; i < str.length; i++) a = (a << 5) - a + str.charCodeAt(i);
        let s = a | 0;
        const rng = () => {
          s = s + 1831565813 | 0;
          let t = imul(s ^ s >>> 15, 1 | s);
          t = t + imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        const out = new Float32Array(len), p = SHAPE_PARAMS[shape] || SHAPE_PARAMS.circle;
        for (let i = 0; i < len; i++) {
          const tt = i / len;
          let sig = 0;
          for (let h = 0; h < p.harmonics.length; h++) {
            const f = p.freq * (h + 1);
            sig += p.harmonics[h] * sin(TAU * f * tt + rng() * TAU);
          }
          const mod = p.complexity * (rng() - 0.5) * 0.3, env = 0.5 + 0.5 * sin(TAU * tt * 0.1 + rng() * TAU);
          out[i] = (sig + mod) * env * 0.7;
        }
        return out;
      }
      _selectData() {
        if (this.isAudioStarted && this.isPlaying && this.analyser) {
          const need = this.analyser.fftSize;
          if (!this._liveBuffer || this._liveBuffer.length !== need) this._liveBuffer = new Float32Array(need);
          this.analyser.getFloatTimeDomainData(this._liveBuffer);
          return this._liveBuffer;
        }
        if (this.preset && this.mode === "seed") {
          const seed = this.preset?.seed ?? this._getSeed(), key = this.shapeKey || "circle";
          this.preset._seedBuffers ||= {};
          return this.preset._seedBuffers[key] ||= this._makeSeedBuffer(key, seed);
        }
        if (!this._dummyData) {
          const len = 2048, a = new Float32Array(len);
          for (let i = 0; i < len; i++) {
            const t = i / len;
            a[i] = 0.5 * sin(TAU * t) + 0.3 * sin(TAU * 2 * t + PI / 3);
          }
          this._dummyData = a;
        }
        return this._dummyData;
      }
      // ---------------- Seeded Look Planning (colors + effects) ----------------
      _prob(attr) {
        const v = parseFloat(this.getAttribute?.(attr) || "");
        const p = Number.isFinite(v) ? v : DEFAULTS.PROB[attr];
        return min(1, max(0, p));
      }
      _weights(base, attrName) {
        const w = _jsonAttr(this, attrName, base);
        return { ...base, ...w };
      }
      _getColorWeights() {
        return this._weights(DEFAULTS.COLOR_WEIGHTS, "color-weights");
      }
      _getDarkColorWeights() {
        return this._weights(DEFAULTS.DARK_COLOR_WEIGHTS, "dark-color-weights");
      }
      _getNeutralColorWeights() {
        return this._weights(DEFAULTS.NEUTRAL_COLOR_WEIGHTS, "neutral-color-weights");
      }
      _getEffectWeights() {
        return this._weights(DEFAULTS.EFFECT_WEIGHTS, "effect-weights");
      }
      _getSpeedWeights() {
        return this._weights(DEFAULTS.CYC_SPEED_WEIGHTS, "cycle-speed-weights");
      }
      _ensurePlan() {
        const seed = this.preset?.seed ?? this._getSeed();
        const monoProb = this._prob("mono-prob");
        const halfDomProb = this._prob("half-dominant-prob");
        const groupStrobeProb = this._prob("group-strobe-prob");
        const darkProb = this._prob("dark-palette-prob");
        const neutralProb = this._prob("neutral-palette-prob");
        const colorWeights = this._getColorWeights();
        const effectWeights = this._getEffectWeights();
        const speedWeights = this._getSpeedWeights();
        const darkWeights = this._getDarkColorWeights();
        const neutralWeights = this._getNeutralColorWeights();
        const p = this._plan;
        const changed = !p || p.seed !== seed || JSON.stringify(p.colorWeights) !== JSON.stringify(colorWeights) || JSON.stringify(p.effectWeights) !== JSON.stringify(effectWeights) || JSON.stringify(p.speedWeights) !== JSON.stringify(speedWeights) || JSON.stringify(p.darkWeights) !== JSON.stringify(darkWeights) || JSON.stringify(p.neutralWeights) !== JSON.stringify(neutralWeights) || p.monoProb !== monoProb || p.halfDomProb !== halfDomProb || p.groupStrobeProb !== groupStrobeProb || p.darkProb !== darkProb || p.neutralProb !== neutralProb;
        if (!changed) return;
        const rMono = _rngFrom(`${seed}::mode::mono`);
        const isMono = rMono() < monoProb;
        const rNeutral = _rngFrom(`${seed}::mode::neutral`);
        const isNeutralPalette = !isMono && rNeutral() < neutralProb;
        const rDark = _rngFrom(`${seed}::mode::dark`);
        const isDarkPalette = !isMono && !isNeutralPalette && rDark() < darkProb;
        const rHalf = _rngFrom(`${seed}::mode::half`);
        const isHalf = !isMono && rHalf() < halfDomProb;
        const rGroupStrobe = _rngFrom(`${seed}::mode::gStrobe`);
        const isGroupStrobe = rGroupStrobe() < groupStrobeProb;
        const groupStrobeAll = isGroupStrobe && _rngFrom(`${seed}::mode::gStrobeType`)() < 0.5;
        let activeColorWeights = isNeutralPalette ? _onlyKeys(neutralWeights, NEUTRAL_COLOR_KEYS) : isDarkPalette ? _onlyKeys(darkWeights, Object.keys(darkWeights)) : { ...colorWeights };
        if (!Object.keys(activeColorWeights).length) activeColorWeights = { ...colorWeights };
        const colorUniformKey = isMono ? _pickWeightedKey(_rngFrom(`${seed}::monoColorPick`), activeColorWeights) : null;
        let halfDominantKey = null, halfDominantSet = /* @__PURE__ */ new Set();
        if (isHalf) {
          halfDominantKey = _pickWeightedKey(_rngFrom(`${seed}::halfColorPick`), activeColorWeights);
          const shapesAll = Object.keys(this.drawFuncs);
          const target = max(1, Math.round(shapesAll.length * DEFAULTS.HALF_DOMINANT_RATIO));
          halfDominantSet = new Set(_chooseSubset(_rngFrom(`${seed}::halfSubset`), shapesAll, target));
        }
        const perShapeColorKey = {};
        const perShapeCyclerSpeedKey = {};
        const perShapeEffectKey = {};
        const shapes = Object.keys(this.drawFuncs);
        for (const k of shapes) {
          const key = isMono ? colorUniformKey : isHalf && halfDominantSet.has(k) ? halfDominantKey : _pickWeightedKey(_rngFrom(`${seed}::color::${k}`), activeColorWeights);
          perShapeColorKey[k] = key;
          if (key === "cycler") {
            perShapeCyclerSpeedKey[k] = _pickWeightedKey(_rngFrom(`${seed}::speed::${k}`), speedWeights);
          }
          const rEff = _rngFrom(`${seed}::effect::${k}`);
          perShapeEffectKey[k] = _pickWeightedKey(rEff, DEFAULTS.EFFECT_WEIGHTS) ?? "none";
          const effOverride = _pickWeightedKey(rEff, effectWeights);
          if (effOverride) perShapeEffectKey[k] = effOverride;
        }
        let groupStrobeSet = /* @__PURE__ */ new Set();
        if (isGroupStrobe) {
          if (groupStrobeAll) {
            groupStrobeSet = new Set(shapes);
          } else {
            const frac = 0.5 + 0.5 * _rngFrom(`${seed}::gStrobe::size`)();
            const count = max(1, Math.round(shapes.length * frac));
            groupStrobeSet = new Set(_chooseSubset(_rngFrom(`${seed}::gStrobe::subset`), shapes, count));
          }
          for (const k of groupStrobeSet) perShapeEffectKey[k] = "strobe";
        }
        this._plan = {
          seed,
          monoProb,
          halfDomProb,
          groupStrobeProb,
          darkProb,
          neutralProb,
          isMono,
          isHalf,
          isDarkPalette,
          isNeutralPalette,
          colorUniformKey,
          halfDominantKey,
          halfDominantSet,
          colorWeights,
          effectWeights,
          speedWeights,
          darkWeights,
          neutralWeights,
          perShapeColorKey,
          perShapeCyclerSpeedKey,
          perShapeEffectKey,
          isGroupStrobe,
          groupStrobeAll,
          groupStrobeSet
        };
      }
      _getColorFor(shapeKey, now) {
        this._ensurePlan();
        const key = this._plan.perShapeColorKey[shapeKey] || "bitcoin_orange";
        if (key === "cycler") {
          const spdKey = this._plan.perShapeCyclerSpeedKey[shapeKey] || "medium";
          const speed = DEFAULTS.CYCLER_SPEEDS[spdKey] ?? DEFAULTS.CYCLER_SPEEDS.medium;
          const hue = now * speed % 360;
          return { css: `hsl(${hue},85%,60%)`, key, speedKey: spdKey };
        }
        return { css: DEFAULTS.NAMED_COLORS[key] || "#FFFFFF", key, speedKey: null };
      }
      _getEffectFor(shapeKey) {
        this._ensurePlan();
        return this._plan.perShapeEffectKey[shapeKey] || "none";
      }
      // ---------------- Animation ----------------
      _animate() {
        const now = performance.now();
        this._resizeCanvas();
        const data = this._selectData();
        const { css } = this._getColorFor(this.shapeKey, now);
        const effect = this._getEffectFor(this.shapeKey);
        this._prepareStroke(css, { effect, now });
        (this.drawFuncs[this.shapeKey] || this.drawFuncs.circle)(data, now, this.preset ?? {});
        if (typeof this.onIndicatorUpdate === "function") {
          const started = this.isAudioStarted, active = started && this.isPlaying;
        }
        this._animId = requestAnimationFrame(this._animate);
      }
    }
    customElements.define("scope-canvas", ScopeCanvas);
  })();

  // js/path-rec-app.js
  var PathRecApp = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:none}</style>";
      this._armed = this._isRecording = this._isPlaying = false;
      this._loop = false;
      this._showOverlay = true;
      this._recording = null;
      this._points = [];
      this._t0 = this._lastSampleT = this._playIdx = this._playT0 = this._raf = 0;
      for (const k of ["arm", "disarm", "clear", "play", "stop", "getRecording", "inputPointer", "renderOverlay", "setLoop"]) this[k] = this[k].bind(this);
    }
    // -------------------- Public API --------------------
    arm() {
      if (this._armed) return;
      this._armed = true;
      this._showOverlay = true;
      this._dispatch("fr-armed");
    }
    disarm() {
      if (!this._armed) return;
      if (this._isRecording) this._endRecording(performance.now());
      this._armed = false;
      this._showOverlay = false;
      this._dispatch("fr-disarmed");
    }
    clear() {
      this.stop();
      this._recording = null;
      this._points = [];
      this._dispatch("fr-cleared");
    }
    getRecording() {
      return this._recording ? { points: this._recording.points.slice(), duration: this._recording.duration } : null;
    }
    play(recording, opts = {}) {
      this._loop = !!opts.loop;
      if (this._isPlaying) return;
      const rec = recording || this._recording;
      if (!rec?.points?.length) return;
      if (recording) this._recording = recording;
      this._isPlaying = true;
      this._playIdx = 0;
      this._playT0 = performance.now();
      this._dispatch("fr-play-started");
      const first = rec.points[0];
      if (first) this._emitPlayInput({ x: first.x, y: first.y, t: 0, type: first.type || "down" });
      const step = () => {
        if (!this._isPlaying) return;
        const now = performance.now(), et = now - this._playT0, pts = rec.points;
        while (this._playIdx < pts.length && pts[this._playIdx].t <= et) this._emitPlayInput(pts[this._playIdx++]);
        const pos = this._interpAtTime(rec, et);
        if (pos) this._emitPlayInput({ x: pos.x, y: pos.y, t: et, type: "move", _interp: true });
        if (et >= rec.duration) {
          const last = pts[pts.length - 1];
          if (last.type !== "up") this._emitPlayInput({ x: last.x, y: last.y, t: rec.duration, type: "up" });
          if (this._loop) {
            this._dispatch("fr-play-loop");
            this._playIdx = 0;
            this._playT0 = performance.now();
            const f = pts[0];
            if (f) this._emitPlayInput({ x: f.x, y: f.y, t: 0, type: f.type || "down" });
            this._raf = requestAnimationFrame(step);
          } else this.stop();
          return;
        }
        this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }
    stop() {
      if (!this._isPlaying) return;
      cancelAnimationFrame(this._raf);
      this._isPlaying = false;
      this._dispatch("fr-play-stopped");
    }
    setLoop(v) {
      this._loop = !!v;
    }
    inputPointer(type, x, y, t) {
      if (!this._armed) return;
      x = clamp01(x);
      y = clamp01(y);
      const now = t ?? performance.now();
      if (type === "down" && !this._isRecording) this._beginRecording(now);
      if (!this._isRecording) return;
      const rel = now - this._t0;
      this._points.push({ x, y, t: rel, type });
      this._lastSampleT = rel;
      if (type === "up") this._endRecording(now);
    }
    renderOverlay(ctx, now = performance.now()) {
      if (!this._showOverlay && !(this._isPlaying && this._recording)) return;
      const rec = this._isRecording ? { points: this._points } : this._recording, hasPoints = rec?.points?.length > 0, { canvas } = ctx;
      ctx.save();
      if (this._showOverlay && hasPoints) {
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff80";
        ctx.strokeStyle = "#00ffff";
        ctx.beginPath();
        this._drawPath(ctx, rec.points, canvas);
        ctx.stroke();
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#00ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (this._isPlaying && this._recording) {
        const et = now - this._playT0, pos = this._interpAtTime(this._recording, et);
        if (pos) {
          const cx = pos.x * canvas.width, cy = pos.y * canvas.height, pulse = 0.8 + 0.2 * Math.sin(now / 100), glow = 0.7 + 0.3 * Math.sin(now / 150);
          ctx.beginPath();
          ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(300,100%,${70 + 10 * glow}%)`;
          ctx.fill();
          ctx.shadowBlur = 15 * glow;
          ctx.shadowColor = "#ff00ff";
          ctx.strokeStyle = "#ff00ff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // -------------------- Private Helpers --------------------
    _beginRecording(tAbs) {
      this.stop();
      this._isRecording = true;
      this._points = [];
      this._t0 = tAbs;
      this._lastSampleT = 0;
      this._dispatch("fr-record-started");
    }
    _endRecording(tAbs) {
      if (!this._isRecording) return;
      const duration = Math.max(1, Math.round(tAbs - this._t0));
      if (this._points.length === 0) this._points.push({ x: 0.5, y: 0.5, t: 0, type: "down" });
      const last = this._points[this._points.length - 1];
      if (last.type !== "up") this._points.push({ x: last.x, y: last.y, t: duration, type: "up" });
      this._recording = { points: this._points.slice(), duration };
      this._isRecording = false;
      this._dispatch("fr-record-stopped", { duration });
      if (this._armed) {
        this._armed = false;
        this._showOverlay = false;
        this._dispatch("fr-disarmed");
      }
      this.play(this._recording, { loop: this._loop });
    }
    _drawPath(ctx, points, canvas) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i], cx = p.x * canvas.width, cy = p.y * canvas.height;
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      }
    }
    _interpAtTime(rec, t) {
      const pts = rec.points;
      if (!pts.length) return null;
      if (t <= pts[0].t) return { x: pts[0].x, y: pts[0].y };
      if (t >= rec.duration) {
        const l2 = pts[pts.length - 1];
        return { x: l2.x, y: l2.y };
      }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if (t <= b.t) {
          const u = (t - a.t) / (b.t - a.t || 1);
          return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        }
      }
      const l = pts[pts.length - 1];
      return { x: l.x, y: l.y };
    }
    _emitPlayInput(p) {
      this._dispatch("fr-play-input", { x: p.x, y: p.y, t: p.t, type: p.type });
    }
    _dispatch(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
  };
  customElements.define("path-rec-app", PathRecApp);

  // js/osc-app.js
  var OscControls = class extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const dispatch = (type, detail) => this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
      root.innerHTML = /* html */
      `
      <style>
        :host{display:block}
        #controls{display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap;justify-content:center;padding:.7rem 1.2rem;background:rgba(255,255,255,.07);border-radius:9px;width:95%;max-width:980px;margin:.9rem auto 0;box-sizing:border-box}
        .seed{display:flex;align-items:center;gap:.55rem;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}
        .seed label{font-size:.95rem;color:#ffe7b3;letter-spacing:.02em}
        .seed input{font-family:inherit;font-size:.98rem;color:#ffecb3;background:#1c1d22;border:1px solid #3c3f48;border-radius:6px;padding:.38rem .55rem;width:15ch;letter-spacing:.04em}
        .seed button{padding:.42rem .8rem;border-radius:6px;border:1px solid #665;background:#221;color:#ffe0a3;cursor:pointer;font-family:inherit;font-size:.95rem;transition:background .18s}
        .seed button:hover{background:#2c1f1f}
        .vol{display:flex;align-items:center;gap:.55rem;min-width:190px;padding:.3rem .55rem;background:#23252b;border:1px solid #4e5668;border-radius:8px}
        .vol label{font-size:.95rem;color:#cfe3ff;letter-spacing:.02em}
        .vol input[type="range"]{-webkit-appearance:none;appearance:none;width:140px;height:4px;background:#3a3f4a;border-radius:999px;outline:none}
        .vol input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;box-shadow:0 0 6px #46ad6d55;cursor:pointer}
        .vol input[type="range"]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#46ad6d;border:1px solid #2b6b44;cursor:pointer}
        .vol #volVal{font-size:.92rem;color:#9df5c2;min-width:3.5ch;text-align:right}
        button,select{padding:.53em 1.17em;border-radius:6px;border:1px solid #555;background:#242;color:#fff;font-size:1rem;cursor:pointer;font-family:inherit;font-weight:500;transition:background .19s,color .19s,box-shadow .19s,transform .06s ease;box-shadow:0 0 0 #0000;will-change:transform}
        button:active{transform:translateY(1px)}
        button:focus{outline:2px solid #7af6ff;outline-offset:1px}
        button:hover{background:#454}
        #startBtn.power-off{background:#451015;color:#e97c90;border-color:#89232a;box-shadow:0 0 4px #ff505011,0 0 0 #0000;text-shadow:none;filter:brightness(.95)}
        #startBtn.power-on{background:#ff2a39;color:#fff;border-color:#ff4e6a;box-shadow:0 0 18px 5px #ff2a3999,0 0 4px #ff748499;text-shadow:0 1px 3px #8d2025cc,0 0 10px #fff7;filter:brightness(1.1) saturate(1.2)}
        #startBtn:not(.ready){opacity:.7}
        #muteBtn.muted{background:#a51427;color:#fff;border-color:#ff506e;box-shadow:0 0 12px #ff506e66;text-shadow:0 1px 2px #320a0b}
        #audioSigBtn{background:#2a4d3a;color:#7af6ff;border-color:#4a7c59;box-shadow:0 0 8px #7af6ff33}
        #audioSigBtn:hover{background:#3a5d4a;box-shadow:0 0 12px #7af6ff55}
        #audioSigBtn:disabled{background:#1a2d2a;color:#4a6c59;box-shadow:none}
        .toggle{position:relative;background:#23252b;border-color:#4e5668;color:#cfe3ff;box-shadow:inset 0 -1px 0 #0004,0 0 0 #0000}
        .toggle:hover{background:#2b2f38}
        .toggle[aria-pressed="true"]{background:#1f3a26;color:#9df5c2;border-color:#46ad6d;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33;text-shadow:0 1px 2px #0b1a10aa}
        #loopBtn.toggle[aria-pressed="true"]{background:#173a2a;border-color:#35d08e;box-shadow:0 0 12px #35d08e55,inset 0 0 0 1px #35d08e33}
        #sigModeBtn.toggle[aria-pressed="true"]{background:#1f2a3f;border-color:#7aa2ff;color:#cfe0ff;box-shadow:0 0 12px #7aa2ff55,inset 0 0 0 1px #7aa2ff33}
        #latchBtn.toggle[aria-pressed="true"]{background:#1f3a26;border-color:#46ad6d;color:#9df5c2;box-shadow:0 0 10px #46ad6d55,inset 0 0 0 1px #46ad6d33}
        /* Auditioning Controls Styles */
        #auditionControls{display:flex;gap:.5rem;border-left:2px solid #555;padding-left:1rem;margin-left:.5rem}
        #approveBtn{background:#141;color:#8f8;border-color:#383}
        #approveBtn:hover{background:#252}
        #rejectBtn{background:#411;color:#f88;border-color:#833}
        #rejectBtn:hover{background:#522}
        #approvedSeedsWrapper{width:100%;margin-top:.8rem;display:none}
        #approvedSeedsWrapper label{color:#ffe7b3;font-size:.9rem;display:block;margin-bottom:.3rem}
        #approvedSeedsList{width:100%;box-sizing:border-box;height:80px;background:#1c1d22;border:1px solid #3c3f48;color:#9f8;font-family:monospace;resize:vertical;padding:.4rem .6rem;border-radius:6px}
        @media (max-width:430px){#controls{gap:.5rem;padding:.55rem .8rem}button,select{padding:.42em .8em;font-size:.93rem}.vol{min-width:160px}.vol input[type="range"]{width:120px}.seed input{width:11ch}}
        @media (max-width:380px){#controls{gap:.45rem;padding:.5rem .7rem}button,select{padding:.4em .72em;font-size:.9rem}.vol{min-width:150px}.vol input[type="range"]{width:110px}.seed label{display:none}}
        button:disabled,select:disabled{opacity:.5;pointer-events:none}
        .vol:has(input:disabled){opacity:.5;pointer-events:none}
      </style>
      <div id="controls">
        <button id="startBtn" title="Click to initialize audio">POWER ON</button>
        <button id="muteBtn">Mute</button>
        <select id="shapeSelect"></select>
        <button id="seqBtn">Create Sequence</button>
        <button id="audioSigBtn">Audio Signature</button>
        <button id="latchBtn" class="toggle" aria-pressed="false">Latch: Off</button>
        <button id="loopBtn" class="toggle" aria-pressed="false">Loop: Off</button>
        <button id="sigModeBtn" class="toggle" aria-pressed="false">Signature Mode: Off</button>
        <div id="volWrap" class="vol" title="Master Volume">
          <label for="vol">Vol</label>
          <input id="vol" type="range" min="0" max="100" step="1" value="10"/>
          <span id="volVal">10%</span>
        </div>
        <form id="seedForm" class="seed" autocomplete="off">
          <label for="seedInput">Seed</label>
          <input id="seedInput" name="seedInput" maxlength="32" spellcheck="false"/>
          <button id="seedSetBtn" type="submit">Set Seed</button>
        </form>
        <!-- MODIFIED START: Seed Auditioning Controls -->
        <div id="auditionControls">
            <button id="nextSeedBtn" title="Load the next seed from the CSV list">Next Seed</button>
            <button id="approveBtn" title="Save this seed to the list and play the next one">\u2705</button>
            <button id="rejectBtn" title="Discard this seed and play the next one">\u274C</button>
        </div>
        <!-- MODIFIED END -->
        <!-- Freestyle Path Recorder Buttons -->
        <button id="frReadyBtn" class="toggle" aria-pressed="false" title="Freestyle Record-Ready (R)">FR Ready</button>
        <button id="frPlayBtn" disabled title="Play Freestyle Recording (Shift+R)">FR Play</button>
        <!-- Save/Load Buttons -->
        <button id="saveBtn" title="Save entire sequencer state to clipboard as JSON">Save State</button>
        <button id="loadBtn" title="Load sequencer state from JSON data">Load State</button>
      </div>
      <!-- MODIFIED START: Approved Seeds List Display -->
      <div id="approvedSeedsWrapper">
        <label for="approvedSeedsList">Approved Seeds:</label>
        <textarea id="approvedSeedsList" readonly spellcheck="false"></textarea>
      </div>
      <!-- MODIFIED END -->`;
      this._startBtn = byId(root, "startBtn");
      this._muteBtn = byId(root, "muteBtn");
      this._shapeSelect = byId(root, "shapeSelect");
      this._seqBtn = byId(root, "seqBtn");
      this._audioSigBtn = byId(root, "audioSigBtn");
      this._latchBtn = byId(root, "latchBtn");
      this._loopBtn = byId(root, "loopBtn");
      this._sigModeBtn = byId(root, "sigModeBtn");
      this._vol = byId(root, "vol");
      this._volVal = byId(root, "volVal");
      this._seedForm = byId(root, "seedForm");
      this._seedInput = byId(root, "seedInput");
      this._nextSeedBtn = byId(root, "nextSeedBtn");
      this._approveBtn = byId(root, "approveBtn");
      this._rejectBtn = byId(root, "rejectBtn");
      this._approvedSeedsWrapper = byId(root, "approvedSeedsWrapper");
      this._approvedSeedsList = byId(root, "approvedSeedsList");
      this._allControls = [this._startBtn, this._muteBtn, this._shapeSelect, this._seqBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol];
      this._frReadyBtn = byId(root, "frReadyBtn");
      this._frPlayBtn = byId(root, "frPlayBtn");
      this._saveBtn = byId(root, "saveBtn");
      this._loadBtn = byId(root, "loadBtn");
      this._allControls.push(this._frReadyBtn, this._frPlayBtn, this._saveBtn, this._loadBtn);
      this._allControls.push(this._nextSeedBtn, this._approveBtn, this._rejectBtn);
      addEvents(this._frReadyBtn, [["click", () => dispatch("fr-toggle")]]);
      addEvents(this._frPlayBtn, [["click", () => dispatch("fr-play")]]);
      addEvents(this._saveBtn, [["click", () => dispatch("save-state")]]);
      addEvents(this._loadBtn, [["click", () => dispatch("load-state")]]);
      addEvents(this._startBtn, [["click", () => dispatch("start-request")]]);
      addEvents(this._muteBtn, [["click", () => dispatch("mute-toggle")]]);
      addEvents(this._shapeSelect, [["change", () => dispatch("shape-change", { shapeKey: this._shapeSelect.value })]]);
      addEvents(this._seqBtn, [["click", () => dispatch("toggle-sequencer")]]);
      addEvents(this._audioSigBtn, [["click", () => dispatch("audio-signature")]]);
      addEvents(this._latchBtn, [["click", () => dispatch("latch-toggle")]]);
      addEvents(this._loopBtn, [["click", () => dispatch("loop-toggle")]]);
      addEvents(this._sigModeBtn, [["click", () => dispatch("signature-mode-toggle")]]);
      addEvents(this._vol, [["input", () => dispatch("volume-change", { value: Number(this._vol.value) })]]);
      addEvents(this._seedForm, [["submit", (e) => (e.preventDefault(), dispatch("seed-set", { value: (this._seedInput?.value || "").trim() }))]]);
      addEvents(this._nextSeedBtn, [["click", () => dispatch("next-seed")]]);
      addEvents(this._approveBtn, [["click", () => dispatch("approve-seed")]]);
      addEvents(this._rejectBtn, [["click", () => dispatch("reject-seed")]]);
      this._helpers = { setPressed, setText };
    }
    setShapes(shapes) {
      const f = document.createDocumentFragment();
      for (const { value, label } of shapes ?? []) f.appendChild(Object.assign(document.createElement("option"), { value, textContent: label }));
      this._shapeSelect.replaceChildren(f);
    }
    setSeed(seed) {
      this._seedInput && (this._seedInput.value = seed ?? "");
    }
    disableAll(disabled) {
      setDisabledAll(this._allControls, disabled);
    }
    // MODIFIED START: New method to update the approved seeds list
    updateApprovedSeeds(seeds = []) {
      if (this._approvedSeedsWrapper && this._approvedSeedsList) {
        const hasSeeds = seeds.length > 0;
        this._approvedSeedsWrapper.style.display = hasSeeds ? "block" : "none";
        this._approvedSeedsList.value = hasSeeds ? seeds.join("\n") : "";
        if (hasSeeds) {
          this._approvedSeedsList.scrollTop = this._approvedSeedsList.scrollHeight;
        }
        this.dispatchEvent(new Event("controls-resize"));
      }
    }
    // MODIFIED END
    updateState(o = {}) {
      const { setPressed: setP, setText: sT } = this._helpers, T = (btn, on2, a, b) => (setP(btn, on2), sT(btn, on2 ? a : b));
      isBool(o.isAudioSignaturePlaying) && T(this._audioSigBtn, o.isAudioSignaturePlaying, "Stop Signature", "Audio Signature");
      if (isBool(o.isPlaying)) {
        sT(this._startBtn, o.isPlaying ? "POWER OFF" : "POWER ON");
        toggleClass(this._startBtn, "power-on", o.isPlaying);
        toggleClass(this._startBtn, "power-off", !o.isPlaying);
      }
      if (isBool(o.isAudioStarted)) {
        toggleClass(this._startBtn, "ready", o.isAudioStarted);
        setDisabledAll([this._muteBtn, this._audioSigBtn, this._latchBtn, this._loopBtn, this._sigModeBtn, this._vol], !o.isAudioStarted);
      }
      isBool(o.isMuted) && (sT(this._muteBtn, o.isMuted ? "Unmute" : "Mute"), toggleClass(this._muteBtn, "muted", o.isMuted));
      o.shapeKey && (this._shapeSelect.value = o.shapeKey);
      isBool(o.sequencerVisible) && sT(this._seqBtn, o.sequencerVisible ? "Hide Sequencer" : "Create Sequence");
      isBool(o.isLoopEnabled) && T(this._loopBtn, o.isLoopEnabled, "Loop: On", "Loop: Off");
      isBool(o.isSequenceSignatureMode) && T(this._sigModeBtn, o.isSequenceSignatureMode, "Signature Mode: On", "Signature Mode: Off");
      isBool(o.isLatchOn) && T(this._latchBtn, !!o.isLatchOn, "Latch: On", "Latch: Off");
      if (isNum(o.volume)) {
        const p = pct(o.volume);
        this._vol && (this._vol.value = String(p));
        this._volVal && (this._volVal.textContent = `${p}%`);
      }
      isBool(o.sequencerVisible) && this.dispatchEvent(new Event("controls-resize"));
    }
  };
  customElements.define("osc-controls", OscControls);
  var OscApp = class extends HTMLElement {
    static get observedAttributes() {
      return ["seed"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._heldKeys = /* @__PURE__ */ new Set();
      this.humKey = "hum";
      this.humLabel = "Power Hum";
      this.shapes = ["circle", "square", "butterfly", "Bowditch", "spiro", "harmonograph", "rose", "hypocycloid", "epicycloid", "spiral", "star", "flower", "wave", "mandala", "infinity", "dna", "tornado"];
      this.shapeLabels = Object.fromEntries(this.shapes.map((k) => [k, k[0].toUpperCase() + k.slice(1)]));
      Object.assign(this, Engine(this), Signatures(this));
      const attrSeed = (this.getAttribute("seed") || "").trim(), htmlSeed = (document.documentElement?.dataset?.seed || "").trim();
      const initialSeed = attrSeed || htmlSeed || "default";
      this.state = this.defaultState(initialSeed);
      [
        "_onToneReady",
        "_onStartRequest",
        "_onMuteToggle",
        "_onShapeChange",
        "_onToggleSequencer",
        "_onAudioSignature",
        "_handleSeedSubmit",
        "_onSeqRecordStart",
        "_onSeqStepCleared",
        "_onSeqStepRecorded",
        "_onSeqPlayStarted",
        "_onSeqPlayStopped",
        "_onSeqStepAdvance",
        "_onSeqStepTimeChanged",
        "_onSeqStepsChanged",
        "_onLoopToggle",
        "_onSignatureModeToggle",
        "_onVolumeChange",
        "_onHotkeyPress",
        "_onHotkeyRelease",
        "_onHotkeyLoopToggle",
        "_onHotkeySignatureToggle",
        "_onLatchToggle",
        "_fitLayout",
        "_onWindowResize",
        "_onShapeStep",
        "_onHotkeyToggleSeqPlay",
        "_onHotkeyTogglePower",
        "_onToggleControls",
        "_initControlsVisibility",
        "_onFreestyleReadyToggle",
        "_onFreestylePlay",
        "_onSaveState",
        "_onLoadState",
        // MODIFIED START: Add new handlers for auditioning
        "_onNextSeed",
        "_onApproveSeed",
        "_onRejectSeed"
        // MODIFIED END
      ].forEach((fn) => this[fn] = this[fn].bind(this));
    }
    _onToneReady() {
      const s = this.state;
      s.Tone = window.Tone;
      this.loadPresets(s.seed);
      this.bufferHumChain();
      const initial = this.shapes[this._rng(s.seed)() * this.shapes.length | 0];
      s.uiHomeShapeKey = initial;
      this._setCanvas({ preset: s.presets[initial], shapeKey: initial, mode: "seed" });
      s.current = this.humKey;
      this._controls.disableAll?.(false);
      const D = s.Tone?.Destination?.volume;
      D && (D.value = this._linToDb(s.volume));
      this._updateControls();
      this._fitLayout();
    }
    attributeChangedCallback(name, _o, nv) {
      if (name !== "seed") return;
      const next = (nv || "").trim();
      !next || next === this.state.seed || this.resetToSeed(next);
    }
    defaultState(seed = "default") {
      return {
        isPlaying: false,
        contextUnlocked: false,
        initialBufferingStarted: false,
        initialShapeBuffered: false,
        Tone: null,
        chains: {},
        current: null,
        isMuted: false,
        isLoopEnabled: false,
        volume: 0.2,
        isSequencerMode: false,
        isRecording: false,
        currentRecordSlot: -1,
        sequence: Array(8).fill(null),
        velocities: Array(8).fill(1),
        sequencePlaying: false,
        sequenceIntervalId: null,
        sequenceStepIndex: 0,
        stepTime: 200,
        _seqFirstCycleStarted: false,
        sequenceSteps: 8,
        isSequenceSignatureMode: false,
        signatureSequencerRunning: false,
        audioSignaturePlaying: false,
        audioSignatureTimer: null,
        audioSignatureStepIndex: 0,
        audioSignatureOnComplete: null,
        isLatchOn: false,
        seed,
        presets: {},
        uiHomeShapeKey: null,
        _transientOverride: false,
        // Freestyle Path Recorder state
        isFreestyleMode: false,
        isFreestyleRecording: false,
        freestyleRecording: null,
        freestylePlayback: false,
        // MODIFIED START: State for seed auditioning
        approvedSeeds: [],
        seedList: [],
        seedListIndex: 0,
        seedListLoaded: false
        // MODIFIED END
      };
    }
    connectedCallback() {
      const $ = this.createElement?.bind(this) ?? ((tag, attrs = {}) => {
        const el = document.createElement(tag);
        for (const k in attrs) {
          if (k === "textContent") el.textContent = attrs[k];
          else el.setAttribute(k, attrs[k]);
        }
        return el;
      });
      const wrapper = $("div", { id: "appWrapper" });
      const main = this._main = $("div", { id: "main" });
      const canvasContainer = this._canvasContainer = $("div", { id: "canvasContainer" });
      this._canvas = $("scope-canvas");
      canvasContainer.appendChild(this._canvas);
      this._setupCanvasClickGrid();
      this._renderPowerOverlay();
      this._controls = $("osc-controls");
      const shapeOptions = [{ value: this.humKey, label: this.humLabel }, ...this.shapes.map((k) => ({ value: k, label: this.shapeLabels[k] || k }))];
      this._controls.setShapes(shapeOptions);
      this._hotkeys = $("osc-hotkeys");
      this._hotkeys.setConfig({ humKey: this.humKey, shapes: this.shapes });
      main.appendChild(this._hotkeys);
      addEvents(this._hotkeys, [
        ["hk-press", this._onHotkeyPress],
        ["hk-release", this._onHotkeyRelease],
        ["hk-toggle-loop", this._onHotkeyLoopToggle],
        ["hk-toggle-signature", this._onHotkeySignatureToggle],
        // Shift+S
        ["hk-shape-step", this._onShapeStep],
        ["hk-toggle-mute", this._onMuteToggle],
        // M
        ["hk-toggle-sequencer", this._onToggleSequencer],
        // C
        ["hk-audio-signature", this._onAudioSignature],
        // s
        ["hk-toggle-latch", this._onLatchToggle],
        // Shift+L
        ["hk-toggle-seq-play", this._onHotkeyToggleSeqPlay],
        // P
        ["hk-toggle-power", this._onHotkeyTogglePower],
        // O
        ["fr-toggle", this._onFreestyleReadyToggle],
        // R
        ["fr-play", this._onFreestylePlay]
        // Shift+R
      ]);
      this._buildGridMap = () => {
        const key = (r, c) => `${r},${c}`;
        const humCells = [[0, 0], [0, 4], [4, 0], [4, 4]];
        const humSet = new Set(humCells.map(([r, c]) => key(r, c)));
        const borderCW = [];
        for (let c = 0; c < 5; c++) borderCW.push([0, c]);
        for (let r = 1; r < 5; r++) borderCW.push([r, 4]);
        for (let c = 3; c >= 0; c--) borderCW.push([4, c]);
        for (let r = 3; r >= 1; r--) borderCW.push([r, 0]);
        const innerRowMajor = [];
        for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) innerRowMajor.push([r, c]);
        const seen = /* @__PURE__ */ new Set();
        const orderedNonHum = [].concat(borderCW, innerRowMajor).filter(([r, c]) => {
          const k = key(r, c);
          if (humSet.has(k) || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        const shapes = this.shapes.slice(0, 18);
        const map = /* @__PURE__ */ new Map();
        for (let i = 0; i < orderedNonHum.length; i++) {
          const [r, c] = orderedNonHum[i];
          map.set(key(r, c), { type: "shape", shapeKey: shapes[i % shapes.length] });
        }
        humCells.forEach(([r, c]) => map.set(key(r, c), { type: "hum", shapeKey: this.humKey }));
        this._grid25 = { map, cellInfo: (r, c) => map.get(key(r, c)) || null };
      };
      this._buildGridMap();
      this._pathRec = document.createElement("path-rec-app");
      this.shadowRoot.appendChild(this._pathRec);
      this._frLastCell = null;
      this._frCanvas = document.createElement("canvas");
      Object.assign(this._frCanvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none"
      });
      canvasContainer.appendChild(this._frCanvas);
      this._frCtx = this._frCanvas.getContext("2d");
      this._drawFrOverlay = () => {
        const ctx = this._frCtx;
        if (ctx) {
          ctx.clearRect(0, 0, this._frCanvas.width, this._frCanvas.height);
          try {
            if (this.state?.isFreestyleMode || this.state?.freestylePlayback || this.state?.isFreestyleRecording) {
              this._pathRec?.renderOverlay(ctx);
            }
          } catch {
          }
        }
        requestAnimationFrame(this._drawFrOverlay);
      };
      this._resizeFrCanvas();
      requestAnimationFrame(this._drawFrOverlay);
      this._pathRec.addEventListener("fr-armed", () => {
        this.state.isFreestyleMode = true;
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-disarmed", () => {
        this.state.isFreestyleMode = false;
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-record-started", () => {
        this.state.isFreestyleRecording = true;
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-record-stopped", () => {
        this.state.isFreestyleRecording = false;
        this.state.freestyleRecording = this._pathRec.getRecording();
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-cleared", () => {
        this.state.freestyleRecording = null;
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-play-started", () => {
        this.state.freestylePlayback = true;
        this._updateControls();
      });
      this._pathRec.addEventListener("fr-play-stopped", () => {
        this.state.freestylePlayback = false;
        this._updateControls();
        if (this._frLastCell) {
          this._releaseCell(this._frLastCell);
          this._frLastCell = null;
        }
      });
      this._pathRec.addEventListener("fr-play-input", (ev) => {
        const { x, y, type } = ev.detail || {};
        const cell = this._cellFromNorm(x, y);
        this._handleFreestyleInput(cell, type);
      });
      this._sequencerComponent = $("seq-app");
      this._sequencerComponent.style.display = "none";
      this._loader = $("div", { id: "loader", textContent: "..." });
      main.append(canvasContainer, this._controls, this._sequencerComponent, this._loader);
      wrapper.append(main);
      this.shadowRoot.append($("style", { textContent: this._style() }), $("tone-loader"), wrapper);
      this._main.style.overflow = "hidden";
      this._controls.setSeed?.(this.state.seed);
      this.shadowRoot.querySelector("tone-loader").addEventListener("tone-ready", this._onToneReady);
      addEvents(this._controls, [
        ["start-request", this._onStartRequest],
        ["mute-toggle", this._onMuteToggle],
        ["shape-change", this._onShapeChange],
        ["toggle-sequencer", this._onToggleSequencer],
        ["audio-signature", this._onAudioSignature],
        ["latch-toggle", this._onLatchToggle],
        ["loop-toggle", this._onLoopToggle],
        ["signature-mode-toggle", this._onSignatureModeToggle],
        ["volume-change", this._onVolumeChange],
        ["seed-set", this._handleSeedSubmit],
        ["controls-resize", this._fitLayout],
        ["fr-toggle", this._onFreestyleReadyToggle],
        ["fr-play", this._onFreestylePlay],
        ["save-state", this._onSaveState],
        ["load-state", this._onLoadState],
        // MODIFIED START: Add listeners for auditioning controls
        ["next-seed", this._onNextSeed],
        ["approve-seed", this._onApproveSeed],
        ["reject-seed", this._onRejectSeed]
        // MODIFIED END
      ]);
      this._canvas.onIndicatorUpdate = (text) => {
        this._loader.textContent = !this.state.isPlaying && !this.state.contextUnlocked ? "Initializing..." : text;
        this._fitLayout();
      };
      this._seqPairs = [
        ["seq-record-start", this._onSeqRecordStart],
        ["seq-step-cleared", this._onSeqStepCleared],
        ["seq-step-recorded", this._onSeqStepRecorded],
        ["seq-play-started", this._onSeqPlayStarted],
        ["seq-play-stopped", this._onSeqPlayStopped],
        ["seq-step-advance", this._onSeqStepAdvance],
        ["seq-step-time-changed", this._onSeqStepTimeChanged],
        ["seq-steps-changed", this._onSeqStepsChanged]
      ];
      addEvents(this._sequencerComponent, this._seqPairs);
      this._fitLayout();
      setTimeout(this._fitLayout, 50);
      setTimeout(this._fitLayout, 250);
      on(window, "resize", this._onWindowResize, { passive: true });
      on(window, "orientationchange", this._onWindowResize, { passive: true });
      try {
        this._resizeObserver = new ResizeObserver(this._fitLayout);
        this._controls && this._resizeObserver.observe(this._controls);
        this._sequencerComponent && this._resizeObserver.observe(this._sequencerComponent);
        const loader = this.shadowRoot.getElementById("loader");
        loader && this._resizeObserver.observe(loader);
      } catch {
      }
    }
    // Hide controls at startup and toggle them when 'hk-toggle-controls' fires.
    _onToggleControls() {
      const c = this._controls;
      if (!c) return;
      const show = c.style.display === "none";
      c.style.display = show ? "flex" : "none";
      try {
        this._fitLayout();
      } catch {
      }
      try {
        c.dispatchEvent(new Event("controls-resize"));
      } catch {
      }
    }
    _initControlsVisibility() {
      if (this._controls) this._controls.style.display = "none";
      if (this._hotkeys) this._hotkeys.addEventListener("hk-toggle-controls", this._onToggleControls);
    }
    disconnectedCallback() {
      removeEvents(this._hotkeys, [
        ["hk-press", this._onHotkeyPress],
        ["hk-release", this._onHotkeyRelease],
        ["hk-toggle-loop", this._onHotkeyLoopToggle],
        ["hk-toggle-signature", this._onHotkeySignatureToggle],
        ["hk-shape-step", this._onShapeStep]
      ]);
      this._sequencerComponent && removeEvents(this._sequencerComponent, this._seqPairs || []);
      if (this._resizeObserver) {
        try {
          this._resizeObserver.disconnect();
        } catch {
        }
        this._resizeObserver = null;
      }
      off(window, "resize", this._onWindowResize);
      off(window, "orientationchange", this._onWindowResize);
    }
    _updateControls(patch = {}) {
      const c = this._controls;
      if (!c) return;
      const fullState = { ...this.state, ...patch };
      if (fullState.contextUnlocked) this._removePowerOverlay();
      if (typeof c.updateState === "function") {
        c.updateState(fullState);
      }
      this.updateHkIcons?.(fullState);
      if (Object.prototype.hasOwnProperty.call(patch, "sequencerVisible")) {
        this._fitLayout();
      }
      try {
        const { isFreestyleMode, freestyleRecording, freestylePlayback } = fullState;
        if (c._frReadyBtn) setPressed(c._frReadyBtn, !!isFreestyleMode);
        if (c._frPlayBtn) {
          c._frPlayBtn.disabled = !freestyleRecording;
          setText(c._frPlayBtn, freestylePlayback ? "Stop" : "FR Play");
        }
      } catch {
      }
    }
    _style() {
      return `
      :host{display:block;width:100%;height:100%}
      #appWrapper{display:flex;flex-direction:column;height:100dvh;padding-bottom:env(safe-area-inset-bottom,0)}
      #main{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;overflow:hidden;background:#000;gap:8px;padding-inline:env(safe-area-inset-left,0) env(safe-area-inset-right,0)}
      #canvasContainer{flex:0 0 auto;max-width:100%;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;transform:none;margin-left:auto;margin-right:auto;aspect-ratio:1/1;box-sizing:border-box}
      #loader{font-size:.95rem;color:#aaa;min-height:1.3em;text-align:center;font-style:italic;margin:2px 0 8px}
      @media (max-width:430px){:host{font-size:15px}}
      @media (max-width:380px){:host{font-size:14px}}
    `;
    }
    _safeInsetBottom() {
      try {
        const d = document.createElement("div");
        d.style.cssText = "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;";
        document.documentElement.appendChild(d);
        const pb = parseFloat(getComputedStyle(d).paddingBottom) || 0;
        d.remove();
        return pb;
      } catch {
        return 0;
      }
    }
    _measureChromeHeights() {
      const sr = this.shadowRoot;
      if (!sr) return { controlsH: 0, loaderH: 0, seqH: 0 };
      const controls = sr.querySelector("osc-controls"), loader = sr.getElementById("loader"), seq = this._sequencerComponent;
      const h = (a) => a ? a.getBoundingClientRect().height : 0;
      return { controlsH: h(controls), loaderH: h(loader), seqH: seq && seq.style.display !== "none" ? h(seq) : 0 };
    }
    _fitLayout() {
      try {
        const cc = this._canvasContainer, sc = this._canvas, main = this._main;
        if (!cc || !sc || !main) return;
        const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth);
        const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight);
        const { controlsH, loaderH, seqH } = this._measureChromeHeights();
        const avail = Math.max(1, vh - controlsH - loaderH - seqH - this._safeInsetBottom() - 10);
        const side = Math.round(Math.max(1, Math.min(vw, avail)));
        Object.assign(cc.style, {
          width: `${side}px`,
          height: `${side}px`,
          maxWidth: "100%",
          maxHeight: `calc(100dvh - ${controlsH + loaderH + seqH + this._safeInsetBottom() + 10}px)`,
          aspectRatio: "1 / 1",
          boxSizing: "border-box",
          left: "",
          transform: ""
        });
        Object.assign(sc.style, { width: "100%", height: "100%", aspectRatio: "1 / 1", display: "block", touchAction: "none" });
        this._resizeFrCanvas?.();
      } catch (e) {
        console.warn("fitLayout failed", e);
      }
    }
    _onWindowResize() {
      this._fitLayout();
    }
    _onHotkeyToggleSeqPlay() {
      if (this.state.sequencePlaying) this.stopSequence?.();
      else this.playSequence?.();
    }
    _onSeqPlayStarted(e) {
      const t = e?.detail?.stepTime, s = this.state;
      s.sequencePlaying = true;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      typeof t === "number" && (s.stepTime = t);
      this._updateControls();
      if (s.isSequenceSignatureMode) {
        this._sequencerComponent?.stopSequence();
        this._startSignatureSequencer();
      }
    }
    _onSeqPlayStopped() {
      const s = this.state;
      s.sequencePlaying = false;
      s.sequenceStepIndex = 0;
      s._seqFirstCycleStarted = false;
      if (s.signatureSequencerRunning) this._stopSignatureSequencer();
      if (!s.isLatchOn) {
        try {
          const h = this.humKey;
          this._updateControls({ shapeKey: h });
          this._onShapeChange({ detail: { shapeKey: h } });
        } catch {
        }
      }
      this._updateControls();
    }
    _onHotkeyTogglePower() {
      const s = this.state || {};
      if (s.isPlaying) this.stopAudioAndDraw?.();
      else this._onStartRequest?.();
    }
    _handleSeedSubmit(e) {
      const v = e?.detail?.value && String(e.detail.value).trim() || (this.getAttribute("seed") || "").trim() || (document.documentElement?.dataset?.seed || "").trim() || "default";
      !v || v === this.state.seed || (this.resetToSeed(v), this._controls.setSeed?.(v));
    }
    // =========================================================================
    // ===== THIS IS THE CORRECTED FUNCTION ====================================
    // =========================================================================
    resetToSeed(newSeed) {
      const { seedList, seedListIndex, seedListLoaded, approvedSeeds } = this.state;
      this.stopAudioAndDraw();
      this.state.seed = newSeed;
      this.setAttribute("seed", newSeed);
      document?.documentElement && (document.documentElement.dataset.seed = newSeed);
      this.loadPresets(newSeed);
      if (this.resetState) {
        this.resetState();
      } else {
        this.state = this.defaultState(newSeed);
      }
      this.state.seedList = seedList;
      this.state.seedListIndex = seedListIndex;
      this.state.seedListLoaded = seedListLoaded;
      this.state.approvedSeeds = approvedSeeds;
      this._controls.setSeed?.(newSeed);
      this._loader.textContent = "Seed updated. Click POWER ON.";
      this._fitLayout();
    }
    // =========================================================================
    // ===== END OF CORRECTED FUNCTION =========================================
    // =========================================================================
    _generateRandomSeed() {
      return Math.random().toString(36).substring(2, 10);
    }
    _onNextSeed() {
      const newSeed = this._generateRandomSeed();
      this._loader.textContent = `Loading new random seed: ${newSeed}...`;
      this.resetToSeed(newSeed);
      setTimeout(() => {
        this._onStartRequest();
      }, 150);
    }
    _onApproveSeed() {
      const { seed, approvedSeeds } = this.state;
      if (seed && !approvedSeeds.includes(seed)) {
        this.state.approvedSeeds.push(seed);
        this._controls.updateApprovedSeeds(this.state.approvedSeeds);
        console.log("Approved seeds:", this.state.approvedSeeds);
      }
      this._onNextSeed();
    }
    _onRejectSeed() {
      this._onNextSeed();
    }
    // MODIFIED END
    _renderPowerOverlay() {
      try {
        const s = this.state, container = this._canvasContainer || this._main || this.shadowRoot?.host || document.body;
        if (!container) return;
        if (s?.contextUnlocked) {
          this._removePowerOverlay();
          return;
        }
        if (this._powerOverlay) return;
        const overlay = Object.assign(document.createElement("div"), { id: "powerOverlay" });
        Object.assign(overlay.style, { position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "20", pointerEvents: "auto", background: "rgba(0,0,0,.55)", userSelect: "none", cursor: "pointer", fontFamily: "'Courier New', monospace" });
        const inner = Object.assign(document.createElement("div"), { textContent: "Click to power on" });
        Object.assign(inner.style, { padding: "14px 18px", border: "1px dashed rgba(255,255,255,.65)", borderRadius: "8px", fontSize: "18px", letterSpacing: ".06em", color: "#fff", background: "rgba(0,0,0,.25)", textShadow: "0 1px 2px rgba(0,0,0,.5)" });
        overlay.appendChild(inner);
        const parent = this._canvasContainer || this._main;
        parent && getComputedStyle(parent).position === "static" && (parent.style.position = "relative");
        (this._canvasContainer || this._main || container).appendChild(overlay);
        this._powerOverlay = overlay;
        overlay.addEventListener("click", () => this._onStartRequest?.());
      } catch (e) {
        console.error("overlay error", e);
      }
    }
    _removePowerOverlay() {
      this._powerOverlay?.parentNode?.removeChild(this._powerOverlay);
      this._powerOverlay = null;
    }
    _setupCanvasClickGrid() {
      const el = this._canvas;
      if (!el || this._canvasClickGridSetup) return;
      this._canvasClickGridSetup = true;
      const cellFromEvent = (ev) => {
        const rct = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(rct.width, (ev.clientX ?? 0) - rct.left));
        const y = Math.max(0, Math.min(rct.height, (ev.clientY ?? 0) - rct.top));
        const cols = 5, rows = 5;
        const col = Math.min(cols - 1, Math.max(0, Math.floor(x / (rct.width / cols))));
        const row = Math.min(rows - 1, Math.max(0, Math.floor(y / (rct.height / rows))));
        const info = this._grid25?.cellInfo(row, col);
        const xNorm = rct.width > 0 ? x / rct.width : 0;
        const yNorm = rct.height > 0 ? y / rct.height : 0;
        return { row, col, info, xNorm, yNorm };
      };
      const pressCell = (row, col, info) => {
        const key = `r${row}c${col}`;
        const shapeKey = info?.shapeKey || this.humKey;
        const idx = shapeKey === this.humKey ? -1 : this.shapes.indexOf(shapeKey);
        this._heldKeys.add(key);
        const detail = { key, idx, shapeKey, variant: info?.variant || null };
        this._onHotkeyPress({ detail });
      };
      const releaseCell = (key) => {
        this._onHotkeyRelease({ detail: { key } });
      };
      this._onCanvasPointerDown = (ev) => {
        if (!this.state?.contextUnlocked) {
          try {
            this.unlockAudioAndBufferInitial?.();
          } catch {
          }
          ev?.preventDefault?.();
          return;
        }
        try {
          this._isCanvasPointerDown = true;
          try {
            ev.target?.setPointerCapture?.(ev.pointerId);
          } catch {
          }
          const { row, col, info, xNorm, yNorm } = cellFromEvent(ev);
          if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
            try {
              this._pathRec?.arm?.();
              this._pathRec?.inputPointer?.("down", xNorm, yNorm, performance.now());
            } catch {
            }
          }
          this._lastPointerKey = `r${row}c${col}`;
          this._lastPointerInfo = info || null;
          pressCell(row, col, info);
        } catch (e) {
          console.error("canvas grid down error", e);
        }
      };
      this._onCanvasPointerMove = (ev) => {
        if (!this._isCanvasPointerDown || !this.state?.contextUnlocked) return;
        try {
          const { row, col, info, xNorm, yNorm } = cellFromEvent(ev);
          if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
            try {
              this._pathRec?.inputPointer?.("move", xNorm, yNorm, performance.now());
            } catch {
            }
          }
          const key = `r${row}c${col}`;
          if (key !== this._lastPointerKey) {
            const prev = this._lastPointerKey;
            this._lastPointerKey = key;
            this._lastPointerInfo = info || null;
            prev && releaseCell(prev);
            pressCell(row, col, info);
          }
        } catch (e) {
          console.error("canvas grid move error", e);
        }
      };
      this._onCanvasPointerUp = (ev) => {
        try {
          this._isCanvasPointerDown = false;
          ev?.target?.releasePointerCapture?.(ev.pointerId);
        } catch {
        }
        if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
          try {
            const rct = el.getBoundingClientRect();
            const x = Math.max(0, Math.min(rct.width, (ev?.clientX ?? 0) - rct.left));
            const y = Math.max(0, Math.min(rct.height, (ev?.clientY ?? 0) - rct.top));
            const xn = rct.width > 0 ? x / rct.width : 0;
            const yn = rct.height > 0 ? y / rct.height : 0;
            this._pathRec?.inputPointer?.("up", xn, yn, performance.now());
          } catch {
          }
        }
        if (!this._lastPointerKey) return;
        const k = this._lastPointerKey;
        this._lastPointerKey = null;
        this._lastPointerInfo = null;
        releaseCell(k);
      };
      this._onCanvasPointerCancel = () => {
        this._isCanvasPointerDown = false;
        if (this.state?.isFreestyleMode && !this.state?.isSequencerMode) {
          try {
            this._pathRec?.inputPointer?.("up", 0, 0, performance.now());
          } catch {
          }
        }
        if (this._lastPointerKey) {
          const k = this._lastPointerKey;
          this._lastPointerKey = null;
          this._lastPointerInfo = null;
          releaseCell(k);
        }
      };
      addEvents(el, [
        ["pointerdown", this._onCanvasPointerDown],
        ["pointermove", this._onCanvasPointerMove],
        ["pointercancel", this._onCanvasPointerCancel],
        ["pointerleave", this._onCanvasPointerUp]
      ]);
      on(window, "pointerup", this._onCanvasPointerUp);
    }
    _onHotkeyLoopToggle() {
      this._onLoopToggle();
    }
    _onHotkeySignatureToggle() {
      this._onSignatureModeToggle();
    }
    _onHotkeyPress({ detail }) {
      const s = this.state;
      const { key, idx, shapeKey, variant } = detail || {};
      if (!shapeKey) return;
      s._transientOverride = variant || null;
      if (s.isSequenceSignatureMode) {
        this._triggerSignatureFor(shapeKey, { loop: s.isLoopEnabled });
        return;
      }
      this._heldKeys.add(key);
      const enter = () => {
        this.setActiveChain(shapeKey);
        if (s._transientOverride) {
          this.applyVariant?.(shapeKey, s._transientOverride);
        }
        idx >= 0 && this._setCanvas({ shapeKey, preset: s.presets[shapeKey], mode: "live" });
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey });
        s.current = shapeKey;
        shapeKey !== this.humKey && (s._uiReturnShapeKey = shapeKey);
      };
      if (s.isSequencerMode) {
        if (s.contextUnlocked && s.initialShapeBuffered) {
          enter();
        }
        return;
      }
      s.contextUnlocked && s.initialShapeBuffered && enter();
    }
    _onHotkeyRelease({ detail }) {
      const s = this.state;
      const { key } = detail || {};
      if (!this._heldKeys?.has(key)) return;
      this._heldKeys.delete(key);
      this._recordedThisHold?.delete?.(key);
      if (s._transientOverride && s.current && s.current !== this.humKey) {
        this.applyVariant?.(s.current, null);
      }
      s._transientOverride = null;
      if (!s.isLatchOn && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
        s._uiReturnShapeKey ? this._updateControls({ shapeKey: s._uiReturnShapeKey }) : this._updateControls();
      }
    }
    _onShapeStep({ detail }) {
      const d = detail?.direction;
      if (!d || !this.shapes.length) return;
      const s = this.state, arr = this.shapes, cur = s._uiReturnShapeKey || s.current;
      let i = arr.indexOf(cur);
      if (i === -1) i = d === 1 ? -1 : 0;
      const next = arr[(i + d + arr.length) % arr.length];
      if (s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(next);
        this._setCanvas({ shapeKey: next, preset: s.presets[next], mode: "live" });
        this._canvas.isPlaying = true;
        this._updateControls({ shapeKey: next });
        s.current = s._uiReturnShapeKey = next;
      }
    }
    _onFreestyleReadyToggle() {
      const s = this.state || {};
      const newMode = !s.isFreestyleMode;
      s.isFreestyleMode = newMode;
      try {
        newMode ? this._pathRec?.arm?.() : this._pathRec?.disarm?.();
      } catch {
      }
      this._updateControls();
    }
    _onFreestylePlay() {
      const s = this.state || {};
      try {
        if (s.freestylePlayback) {
          this._pathRec?.stop?.();
        } else if (s.freestyleRecording) {
          this._pathRec?.play?.(s.freestyleRecording, { loop: !!s.isLoopEnabled });
        }
      } catch {
      }
    }
    _cellFromNorm(x, y) {
      const row = Math.min(4, Math.max(0, Math.floor(y * 5)));
      const col = Math.min(4, Math.max(0, Math.floor(x * 5)));
      const info = this._grid25?.cellInfo(row, col) || null;
      return { row, col, info };
    }
    _resizeFrCanvas() {
      const c = this._frCanvas;
      if (!c) return;
      const host = this._canvasContainer || this._canvas || c.parentElement;
      const r = host.getBoundingClientRect();
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const W = Math.max(1, Math.round(r.width * dpr));
      const H = Math.max(1, Math.round(r.height * dpr));
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
        c.style.width = "100%";
        c.style.height = "100%";
      }
    }
    _pressCell(cell) {
      if (!cell) return;
      const { row, col, info } = cell;
      const key = `r${row}c${col}`;
      const shapeKey = info?.shapeKey || this.humKey;
      const idx = shapeKey === this.humKey ? -1 : this.shapes.indexOf(shapeKey);
      this._heldKeys.add(key);
      const detail = { key, idx, shapeKey, variant: info?.variant || null };
      this._onHotkeyPress({ detail });
    }
    _releaseCell(cell) {
      if (!cell) return;
      const key = typeof cell === "string" ? cell : `r${cell.row}c${cell.col}`;
      this._onHotkeyRelease({ detail: { key } });
    }
    _handleFreestyleInput(cell, type) {
      if (!cell) return;
      if (type === "down") {
        if (this._frLastCell && (this._frLastCell.row !== cell.row || this._frLastCell.col !== cell.col)) {
          this._releaseCell(this._frLastCell);
        }
        this._pressCell(cell);
        this._frLastCell = cell;
      } else if (type === "move") {
        if (!this._frLastCell || this._frLastCell.row !== cell.row || this._frLastCell.col !== cell.col) {
          if (this._frLastCell) this._releaseCell(this._frLastCell);
          this._pressCell(cell);
          this._frLastCell = cell;
        }
      } else if (type === "up") {
        if (this._frLastCell) {
          this._releaseCell(this._frLastCell);
          this._frLastCell = null;
        }
      }
    }
    _onLatchToggle() {
      this.state.isLatchOn = !this.state.isLatchOn;
      this._updateControls();
      const s = this.state;
      if (!s.isLatchOn && !s.isSequencerMode && !this._heldKeys?.size && s.contextUnlocked && s.initialShapeBuffered) {
        this.setActiveChain(this.humKey, { updateCanvasShape: false, setStateCurrent: false });
        this._canvas.isPlaying = false;
      }
    }
    async _onSaveState() {
      try {
        const appState = {
          ...this.state,
          Tone: void 0,
          chains: void 0,
          audioSignatureTimer: void 0,
          sequenceIntervalId: void 0,
          sequencerState: this._sequencerComponent ? {
            steps: this._sequencerComponent.steps,
            state: this._sequencerComponent.state
          } : null,
          pathRecorderState: this._pathRec ? {
            recording: this._pathRec.getRecording(),
            isArmed: this._pathRec._armed,
            loop: this._pathRec._loop
          } : null,
          uiState: {
            sequencerVisible: this._sequencerComponent?.style.display !== "none",
            currentShapeKey: this.state.current,
            volume: this.state.volume
          },
          saveTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
          version: "v19.3"
        };
        const jsonData = JSON.stringify(appState, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonData);
          this._showNotification("State saved to clipboard successfully!", "success");
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = jsonData;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          this._showNotification("State saved to clipboard (fallback method)", "success");
        }
        console.log("Saved state:", appState);
      } catch (error) {
        console.error("Error saving state:", error);
        this._showNotification("Error saving state: " + error.message, "error");
      }
    }
    async _onLoadState() {
      try {
        const jsonData = prompt("Paste the JSON state data to load:");
        if (!jsonData || jsonData.trim() === "") {
          return;
        }
        const loadedState = JSON.parse(jsonData);
        if (!loadedState || typeof loadedState !== "object") {
          throw new Error("Invalid state data format");
        }
        if (this.state.sequencePlaying) {
          this._sequencerComponent?.stopSequence();
        }
        if (this.state.freestylePlayback) {
          this._pathRec?.stop();
        }
        const newState = { ...this.state };
        const stateProps = [
          "isMuted",
          "isLoopEnabled",
          "volume",
          "isSequencerMode",
          "isRecording",
          "currentRecordSlot",
          "sequence",
          "velocities",
          "sequenceStepIndex",
          "stepTime",
          "sequenceSteps",
          "isSequenceSignatureMode",
          "isLatchOn",
          "seed",
          "uiHomeShapeKey",
          "isFreestyleMode",
          "freestyleRecording",
          "approvedSeeds"
        ];
        stateProps.forEach((prop) => {
          if (loadedState.hasOwnProperty(prop)) {
            newState[prop] = loadedState[prop];
          }
        });
        Object.assign(this.state, newState);
        if (loadedState.sequencerState && this._sequencerComponent) {
          const seqState = loadedState.sequencerState;
          if (seqState.steps) {
            this._sequencerComponent.changeStepCount(seqState.steps);
          }
          if (seqState.state) {
            Object.assign(this._sequencerComponent.state, seqState.state);
            this._sequencerComponent.updateSequenceUI();
            this._sequencerComponent.updateStepControls();
          }
        }
        if (loadedState.pathRecorderState && this._pathRec) {
          const prState = loadedState.pathRecorderState;
          if (prState.recording) {
            this.state.freestyleRecording = prState.recording;
          }
          if (prState.loop !== void 0) {
            this._pathRec.setLoop(prState.loop);
          }
        }
        if (loadedState.uiState) {
          const uiState = loadedState.uiState;
          if (uiState.sequencerVisible !== void 0 && this._sequencerComponent) {
            this._sequencerComponent.style.display = uiState.sequencerVisible ? "block" : "none";
            this.state.isSequencerMode = uiState.sequencerVisible;
          }
          if (uiState.volume !== void 0) {
            this.state.volume = uiState.volume;
          }
        }
        if (loadedState.seed && loadedState.seed !== this.state.seed) {
          this.resetToSeed(loadedState.seed);
        }
        this._controls.updateApprovedSeeds(this.state.approvedSeeds);
        this._updateControls();
        this._fitLayout();
        this._showNotification("State loaded successfully!", "success");
        console.log("Loaded state:", loadedState);
      } catch (error) {
        console.error("Error loading state:", error);
        this._showNotification("Error loading state: " + error.message, "error");
      }
    }
    _showNotification(message, type = "info") {
      const notification = document.createElement("div");
      notification.textContent = message;
      Object.assign(notification.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "12px 20px",
        borderRadius: "6px",
        color: "#fff",
        fontFamily: "inherit",
        fontSize: "14px",
        zIndex: "10000",
        maxWidth: "300px",
        wordWrap: "break-word",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        background: type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"
      });
      document.body.appendChild(notification);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3e3);
    }
  };
  customElements.define("osc-app", OscApp);

  // js/seq-app.js
  var SeqApp = class _SeqApp extends HTMLElement {
    static VALID_SIZES = [8, 16, 32, 64];
    static DEFAULT_STEPS = 8;
    static MIN_MS = 50;
    static MAX_MS = 2e3;
    #dispatch = (t, d = {}) => this.dispatchEvent(new CustomEvent(t, { detail: d, bubbles: true, composed: true }));
    #len = () => this.state.sequence.length;
    #next = (i) => (i + 1) % this.#len();
    #slotEls = () => this._stepSlotsDiv?.querySelectorAll(".step-slot") ?? [];
    #velAt = (i) => this.state.velocities?.[i] ?? 1;
    #setSeq = (i, v) => this.state.sequence[i] = v;
    #setVel = (i, v) => this.state.velocities[i] = v;
    #isRecordingSlot = (i) => this.state.isRecording && this.state.currentRecordSlot === i;
    #isActiveStep = (i) => this.state.sequencePlaying && this.state.sequenceStepIndex === i;
    #setTooltip = (s, v, suf = "Alt-drag to edit") => s.title = `Velocity: ${Math.round(v * 100)}% (${suf})`;
    #nextSize = (dir) => _SeqApp.VALID_SIZES[_SeqApp.VALID_SIZES.indexOf(this.steps) + dir] ?? null;
    #initStateForSteps(n) {
      this.steps = n;
      Object.assign(this.state, { sequence: Array(n).fill(null), velocities: Array(n).fill(1), sequenceStepIndex: 0 });
    }
    #cacheRefs() {
      const $ = (id) => this.shadowRoot.getElementById(id);
      this._stepSlotsDiv = $("stepSlots");
      this._playBtn = $("playBtn");
      this._stepTimeInput = $("stepTimeInput");
      this._addBlockBtn = $("addBlockBtn");
      this._removeBlockBtn = $("removeBlockBtn");
      this._stepInfo = $("stepInfo");
    }
    #attachUIEvents() {
      this._eventListeners ||= [];
      const on2 = (el, ev, h) => el && (el.addEventListener(ev, h), this._eventListeners.push([el, ev, h]));
      on2(this._playBtn, "click", this.handlePlayClick);
      on2(this._stepTimeInput, "change", this.handleStepTimeChange);
      on2(this._addBlockBtn, "click", this.handleAddBlock);
      on2(this._removeBlockBtn, "click", this.handleRemoveBlock);
    }
    _applyPendingEdits() {
      const q = this._pendingEdits || [];
      if (!q.length) return;
      for (const e of q) {
        if (e.type === "paint") {
          this.#setSeq(e.i, e.value);
          this.#dispatch("seq-step-recorded", { slotIndex: e.i, value: e.value, nextSlot: this.#next(e.i), isRecording: false });
        } else {
          this.#setSeq(e.i, null);
          this.#dispatch("seq-step-cleared", { slotIndex: e.i });
        }
      }
      this._pendingEdits.length = 0;
      this.updateSequenceUI();
    }
    #recordAt(i, n) {
      if (!this.state.isRecording || i < 0 || i >= this.#len()) return;
      this._pendingEdits && (this._pendingEdits = this._pendingEdits.filter((e) => e.i !== i));
      this.#setSeq(i, n);
      const nx = this.#next(i);
      this.state.currentRecordSlot = nx;
      if (nx === 0) this.state.isRecording = false;
      this.updateSequenceUI();
      this.#dispatch("seq-step-recorded", { slotIndex: i, value: n, nextSlot: nx, isRecording: this.state.isRecording });
    }
    #clearAt(i) {
      this.#setSeq(i, null);
      this.updateSequenceUI();
      this.#dispatch("seq-step-cleared", { slotIndex: i });
    }
    #paint(i, to) {
      this._pendingEdits ||= [];
      this._pendingEdits.push(to == null ? { type: "clear", i } : { type: "paint", i, value: 0 });
      this.#setSeq(i, to == null ? null : 0);
      this.updateSequenceUI();
    }
    #beginDragPaint(i) {
      const to = this.state.sequence[i] == null ? 1 : null;
      Object.assign(this._dragState, { painting: true, mode: "paint", setTo: to, lastIndex: -1 });
      this.#paint(i, to);
    }
    #beginDragVelocity(i, e) {
      Object.assign(this._dragState, { painting: true, mode: "velocity", baseVel: this.#velAt(i), startY: e.clientY, lastIndex: i });
    }
    #handleDragPaint(i) {
      const d = this._dragState;
      if (!d.painting || d.mode !== "paint" || d.lastIndex === i) return;
      d.lastIndex = i;
      this.#paint(i, d.setTo);
    }
    #handleDragVelocity(i, e, slot, bar) {
      const d = this._dragState;
      if (!d.painting || d.mode !== "velocity") return;
      this._velocityUpdateThrottle ||= {};
      const now = Date.now(), t = this._velocityUpdateThrottle[i];
      if (t && now - t < 16) return;
      this._velocityUpdateThrottle[i] = now;
      const v = clamp01(d.baseVel + (d.startY - e.clientY) / 150 * (e.shiftKey ? 0.25 : 1));
      this.#setVel(i, v);
      this.#setTooltip(slot, v, `Alt-drag${e.shiftKey ? " + Shift" : ""}`);
      bar.style.height = `${Math.round(v * 100)}%`;
    }
    #createSlot(i) {
      const s = Object.assign(document.createElement("div"), { className: "step-slot" });
      s.dataset.index = `${i}`;
      const b = Object.assign(document.createElement("div"), { className: "vel-bar" }), d = Object.assign(document.createElement("div"), { className: "digit" });
      s.append(b, d);
      this._slotListeners ||= [];
      const on2 = (ev, h) => (s.addEventListener(ev, h), this._slotListeners.push([s, ev, h]));
      on2("click", () => this.handleStepClick(i));
      on2("contextmenu", (e) => this.handleStepRightClick(e, i));
      on2("pointerdown", (e) => (e.altKey ? this.#beginDragVelocity(i, e) : this.#beginDragPaint(i), s.setPointerCapture(e.pointerId)));
      on2("pointerenter", () => this.#handleDragPaint(i));
      on2("pointermove", (e) => this.#handleDragVelocity(i, e, s, b));
      return s;
    }
    #rebuildAfterSteps() {
      this.render();
      this.#attachUIEvents();
      this.updateSequenceUI();
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.state = { isRecording: false, currentRecordSlot: -1, sequence: [], velocities: [], sequencePlaying: false, sequenceStepIndex: 0, stepTime: 400 };
      ["updateState", "updateSequenceUI", "recordStep", "playSequence", "stopSequence", "handleStepClick", "handleStepRightClick", "handlePlayClick", "handleStepTimeChange", "handleAddBlock", "handleRemoveBlock", "updateStepControls", "_onWindowKeyDown", "_onPointerUpGlobal", "createSequenceUI", "render", "changeStepCount"].forEach((k) => this[k] = this[k].bind(this));
      this._eventListeners = [];
      this._slotListeners = [];
    }
    connectedCallback() {
      const a = Number(this.getAttribute("steps")) || _SeqApp.DEFAULT_STEPS;
      this.#initStateForSteps(_SeqApp.VALID_SIZES.includes(a) ? a : _SeqApp.DEFAULT_STEPS);
      this.render();
      this.updateSequenceUI();
      this.#attachUIEvents();
      window.addEventListener("keydown", this._onWindowKeyDown);
      window.addEventListener("pointerup", this._onPointerUpGlobal);
      this._globalListeners = [["keydown", this._onWindowKeyDown], ["pointerup", this._onPointerUpGlobal]];
    }
    disconnectedCallback() {
      (this._globalListeners || []).forEach(([e, h]) => window.removeEventListener(e, h));
      (this._eventListeners || []).forEach(([el, e, h]) => el.removeEventListener(e, h));
      (this._slotListeners || []).forEach(([el, e, h]) => el.removeEventListener(e, h));
      this._globalListeners = this._eventListeners = this._slotListeners = [];
      this._seqTimer && clearTimeout(this._seqTimer);
      this._tailTimer && clearTimeout(this._tailTimer);
      this._velocityUpdateThrottle = null;
    }
    render() {
      const gc = Math.min(8, this.steps), mw = Math.min(320, this.steps * 40), { MIN_MS, MAX_MS } = _SeqApp;
      this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;text-align:center;width:95%;margin:.8em auto 0;font-family:sans-serif}
        #stepSlots{display:grid;grid-template-columns:repeat(${gc},1fr);gap:.4em;margin:.6em auto .7em;max-width:${mw}px;width:100%;justify-content:center;align-content:center;padding:0;border-radius:6px;background:#fff0;box-shadow:0 0 12px #0003}
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
          <input type="number" id="stepTimeInput" min="${MIN_MS}" max="${MAX_MS}" value="${this.state.stepTime}"/>
        </div>
      </div>`;
      this.#cacheRefs();
      this.createSequenceUI();
      this.updateStepControls();
    }
    createSequenceUI() {
      if (!this._stepSlotsDiv) return;
      (this._slotListeners || []).forEach(([el, e, h]) => el.removeEventListener(e, h));
      this._slotListeners = [];
      this._stepSlotsDiv.innerHTML = "";
      this._dragState = { painting: false, mode: null, setTo: null, baseVel: 1, startY: 0, lastIndex: -1 };
      const f = document.createDocumentFragment();
      for (let i = 0; i < this.steps; i++) f.appendChild(this.#createSlot(i));
      this._stepSlotsDiv.appendChild(f);
    }
    updateState(n = {}) {
      if ("steps" in n) {
        const d = _SeqApp.VALID_SIZES.includes(n.steps) ? n.steps : this.steps;
        if (d !== this.steps) return this.#initStateForSteps(d), this.#rebuildAfterSteps();
      }
      Object.assign(this.state, n);
      this.updateSequenceUI();
    }
    updateSequenceUI() {
      if (!this._stepSlotsDiv) return;
      const { sequence: q, velocities: vels, sequencePlaying: sp, stepTime: st } = this.state;
      for (const s of this.#slotEls()) {
        const i = +s.dataset.index, v = q[i], d = s.querySelector(".digit"), b = s.querySelector(".vel-bar"), vel = vels?.[i] ?? 1;
        if (d) d.textContent = v === 0 ? "0" : v ?? "";
        s.classList.toggle("record-mode", this.#isRecordingSlot(i));
        s.classList.toggle("active", this.#isActiveStep(i));
        if (b) b.style.height = `${Math.round(vel * 100)}%`;
        if (!s.title?.startsWith("Velocity:")) this.#setTooltip(s, vel);
      }
      if (this._playBtn) {
        this._playBtn.textContent = sp ? "Stop Sequence" : "Play Sequence";
        this._playBtn.disabled = !sp && !this.hasPopulatedSteps();
      }
      if (this._stepTimeInput && !sp) this._stepTimeInput.value = st;
      this.updateStepControls();
    }
    handleStepClick(i) {
      this.state.isRecording = true;
      this.state.currentRecordSlot = i;
      this.updateSequenceUI();
      this.#dispatch("seq-record-start", { slotIndex: i });
    }
    handleStepRightClick(e, i) {
      e.preventDefault();
      this._pendingEdits ||= [];
      this._pendingEdits.push({ type: "clear", i });
      this.#setSeq(i, null);
      this.updateSequenceUI();
    }
    handlePlayClick() {
      this.state.sequencePlaying ? this.stopSequence() : this.playSequence();
    }
    handleStepTimeChange() {
      const el = this._stepTimeInput;
      if (!el) return;
      const v = parseInt(el.value, 10);
      if (!Number.isFinite(v) || v < _SeqApp.MIN_MS || v > _SeqApp.MAX_MS) return;
      this.state.stepTime = v;
      this.#dispatch("seq-step-time-changed", { stepTime: v });
    }
    handleAddBlock() {
      if (!this.state.sequencePlaying) {
        const nx = this.#nextSize(1);
        nx && this.changeStepCount(nx);
      }
    }
    handleRemoveBlock() {
      if (!this.state.sequencePlaying) {
        const nx = this.#nextSize(-1);
        nx && this.changeStepCount(nx);
      }
    }
    changeStepCount(n) {
      if (!_SeqApp.VALID_SIZES.includes(n)) return;
      this.state.isRecording = false;
      this.state.currentRecordSlot = -1;
      const os = [...this.state.sequence], ov = [...this.state.velocities];
      this.steps = n;
      this.state.sequence = Array(n).fill(null);
      this.state.velocities = Array(n).fill(1);
      for (let i = 0, l = Math.min(os.length, n); i < l; i++) this.state.sequence[i] = os[i], this.state.velocities[i] = ov[i];
      if (this.state.sequenceStepIndex >= n) this.state.sequenceStepIndex = 0;
      this.#rebuildAfterSteps();
      this.#dispatch("seq-steps-changed", { steps: n });
    }
    updateStepControls() {
      if (this._addBlockBtn) this._addBlockBtn.disabled = this.steps >= 64 || this.state.sequencePlaying;
      if (this._removeBlockBtn) this._removeBlockBtn.disabled = this.steps <= 8 || this.state.sequencePlaying;
      if (this._stepInfo) this._stepInfo.textContent = `${this.steps} steps (${this.steps / 8} blocks)`;
    }
    _onWindowKeyDown(e) {
      if (this.state.isRecording && /^[0-9]$/.test(e.key)) this.#recordAt(this.state.currentRecordSlot, parseInt(e.key, 10));
    }
    _onPointerUpGlobal() {
      this._dragState && Object.assign(this._dragState, { painting: false, mode: null, lastIndex: -1 });
    }
    recordStep(n) {
      this.#recordAt(this.state.currentRecordSlot, n);
    }
    hasPopulatedSteps() {
      return this.state.sequence.some((s) => s !== null);
    }
    playSequence() {
      if (this.state.sequencePlaying || !this.hasPopulatedSteps()) return;
      this.state.sequencePlaying = true;
      this.state.sequenceStepIndex = 0;
      this.#dispatch("seq-play-started", { stepTime: this.state.stepTime });
      const tick = () => {
        if (!this.state.sequencePlaying) return;
        this._applyPendingEdits();
        const i = this.state.sequenceStepIndex;
        this.updateSequenceUI();
        const v = this.state.sequence[i], vel = this.#velAt(i), last = this.#next(i) === 0;
        this.#dispatch("seq-step-advance", { stepIndex: i, index: i, value: v, velocity: vel, isLastStep: last });
        this.state.sequenceStepIndex = this.#next(i);
        this._seqTimer = this.state.sequencePlaying ? setTimeout(tick, this.state.stepTime) : null;
      };
      tick();
    }
    stopSequence() {
      this.state.sequencePlaying = false;
      this._seqTimer && (clearTimeout(this._seqTimer), this._seqTimer = null);
      this._tailTimer && (clearTimeout(this._tailTimer), this._tailTimer = null);
      this._applyPendingEdits();
      this.state.sequenceStepIndex = 0;
      this.updateSequenceUI();
      this.#dispatch("seq-play-stopped", {});
      const d = Math.max(20, Math.min(this.state.stepTime, 200));
      this._tailTimer = setTimeout(() => {
        this.#dispatch("seq-step-advance", { stepIndex: -1, index: -1, value: 0, velocity: 1, isLastStep: true });
        this._tailTimer = null;
      }, d);
    }
  };
  if (!customElements.get("seq-app")) customElements.define("seq-app", SeqApp);

  // js/hk-icons.js
  (() => {
    const BADGES = [
      ["o", "O", "hk-toggle-power", null, -90, "Power", "power"],
      ["m", "M", "hk-toggle-mute", null, -45, "Mute", "mute"],
      ["c", "C", "hk-toggle-controls", null, -15, "Controls", "controls"],
      ["q", "Q", "hk-toggle-sequencer", null, 10, "Show/Hide Sequencer", "sequencer"],
      ["p", "P", "hk-toggle-seq-play", null, 35, "Play/Pause Sequence", "seq-play"],
      ["r", "FR", "fr-toggle", null, 60, "Freestyle Recording", "fr-ready"],
      ["R", "PF", "fr-play", null, 85, "Play Freestyle Recording", "fr-playback"],
      ["s", "CALL SIGN", "hk-audio-signature", null, 0, "Signature", "signature"],
      ["S", "S", "hk-toggle-signature", null, 135, "Signature Mode", "sig-mode"],
      ["l", "L", "hk-toggle-loop", null, 180, "Loop", "loop"],
      ["L", "L", "hk-toggle-latch", null, -135, "Latch", "latch"]
    ], STYLE = `.hk-ring{position:absolute;inset:0;pointer-events:none;z-index:40;--scale:1;--badge:calc(60px*var(--scale));--badge-font:calc(28px*var(--scale));--gap:calc(10px*var(--scale));--ring-outset:calc(28px*var(--scale));--cluster-left:calc(-208px*var(--scale));--cluster-right:calc(208px*var(--scale));--cluster-left-sm:calc(-172px*var(--scale));--cluster-right-sm:calc(172px*var(--scale))}
.hk-badge{position:absolute;left:50%;top:50%;width:var(--badge);height:var(--badge);display:flex;align-items:center;justify-content:center;font:700 var(--badge-font)/1 "Courier New",monospace;color:#888;background:rgba(0,0,0,.5);border:1px solid #555;border-radius:999px;box-shadow:0 0 0 1px #000;backdrop-filter:blur(4px);user-select:none;cursor:pointer;letter-spacing:.02em;transition:transform .15s ease-out,box-shadow .15s ease-out,background .15s ease-out,border-color .15s ease-out,opacity .25s ease-out,color .15s ease-out,visibility .25s;transform:translate(-50%,-50%) scale(1);touch-action:manipulation;opacity:0;visibility:hidden;pointer-events:none}
.hk-badge.is-visible{opacity:.6;visibility:visible;pointer-events:auto}
.hk-badge.is-visible:hover{opacity:1;transform:translate(-50%,-50%) scale(1.1)}
.hk-badge.is-visible:active{transform:translate(-50%,-50%) scale(1.05)}
.hk-badge[data-shift="1"]{border-color:#6b7fad}
.hk-badge span{display:inline-block}
.hk-badge.is-power[data-active="true"]{opacity:1;background:#a11221;color:#f0f0f0;border-color:#d34e5a;box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc;text-shadow:0 0 4px #ddd}
.hk-badge.is-mute[data-active="true"]{opacity:1;background:#851020;color:#e0e0e0;border-color:#d0405e;box-shadow:0 0 8px #d0405e55}
.hk-badge[data-active="true"]{opacity:1;background:#1a2f21;color:#ade5c2;border-color:#409060;box-shadow:0 0 8px #40906055}
.hk-badge[data-id="sig-mode"][data-active="true"]{opacity:1;background:#1a253a;border-color:#6a82cc;color:#ced5e0;box-shadow:0 0 12px #6a82cc55}
.hk-badge[data-disabled="1"]{opacity:.25!important;pointer-events:none!important;filter:grayscale(.4)}
.hk-tooltip{position:absolute;top:0;left:0;color:#ccc;background:rgba(20,20,20,.6);border:1px solid rgba(255,255,255,.15);padding:6px 12px;border-radius:6px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:50;opacity:0;white-space:nowrap;pointer-events:none;box-shadow:0 5px 15px rgba(0,0,0,.6);backdrop-filter:blur(12px);transform-origin:center;transform:var(--tooltip-transform,translate(-50%,-100%)) scale(.9);transition:opacity .2s cubic-bezier(.4,0,.2,1),transform .2s cubic-bezier(.4,0,.2,1)}
.hk-tooltip.is-visible{opacity:1;transform:var(--tooltip-transform,translate(-50%,-100%)) scale(1)}
@keyframes shimmer-text{0%{background-position:-200% center}100%{background-position:200% center}}
.hk-badge.is-visible[data-id="signature"]{width:calc(160px*var(--scale));height:calc(72px*var(--scale));margin:0;padding:0;border-radius:calc(18px*var(--scale));background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.3);color:transparent;font-size:calc(40px*var(--scale));font-weight:700;letter-spacing:.05em;box-shadow:0 0 6px rgba(255,255,255,.1);backdrop-filter:blur(6px);overflow:hidden;opacity:.7;z-index:41;position:absolute;left:50%;top:100%;transform:translate(-50%,calc(-100% - var(--gap)));transition:all .2s ease}
.hk-badge.is-visible[data-id="signature"] span{background:linear-gradient(90deg,#ff00de 0%,#00f7ff 25%,#ff00de 50%,#00f7ff 75%,#ff00de 100%);background-size:200% auto;background-clip:text;-webkit-background-clip:text;color:transparent;animation:shimmer-text 4s linear infinite;display:inline-block;width:100%;text-align:center;text-shadow:none}
.hk-badge.is-visible[data-id="signature"][data-active="true"]{opacity:1;border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5)}
.hk-badge.is-visible[data-id="signature"][data-active="true"] span{animation-duration:1.5s;background:linear-gradient(90deg,#ff00de 0%,#00f7ff 30%,#f0f 50%,#00f7ff 70%,#ff00de 100%);background-size:150% auto}
.hk-badge.is-visible[data-id="fr-ready"],.hk-badge.is-visible[data-id="fr-playback"]{left:50%;top:100%;margin:0;transform:translate(calc(-50% + var(--x,0px)),calc(-100% - calc(var(--gap) + 4px)))}
.hk-badge.is-visible[data-id="fr-ready"]{--x:var(--cluster-left)}.hk-badge.is-visible[data-id="fr-playback"]{--x:var(--cluster-right)}
@media (max-width:520px){.hk-badge.is-visible[data-id="fr-ready"]{--x:var(--cluster-left-sm)}.hk-badge.is-visible[data-id="fr-playback"]{--x:var(--cluster-right-sm)}}
.hk-badge.is-tour{opacity:1!important;color:#ddd;border-color:#aaa;box-shadow:0 0 0 1px #000,0 0 12px rgba(255,255,255,.35);transform:translate(-50%,-50%) scale(1.1)}
.hk-badge.is-tour.is-power[data-active="true"]{box-shadow:0 0 12px 2px #d32a3988,0 0 3px #ff7484cc,0 0 12px rgba(255,255,255,.25)}
.hk-badge.is-tour[data-id="signature"]{opacity:1;border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.4),0 0 20px rgba(150,100,255,.5)}
.hk-tooltip.hk-tour{opacity:1;pointer-events:none;transition:none}
`;
    const qs = (r, s) => r.querySelector(s);
    const positionTooltip = (tip, b, r) => {
      const B = b.getBoundingClientRect(), R = r.getBoundingClientRect(), id = b.dataset.id, label = b.textContent?.trim(), above = `${B.top - R.top - 12}px`, below = `${B.top - R.top + B.height + 8}px`;
      tip.style.left = `${B.left - R.left + B.width / 2}px`;
      const top = ["signature", "fr-ready", "fr-playback"].includes(id) ? above : label === "O" ? below : `${B.top - R.top - 8}px`, tr = label === "O" ? "translate(-50%,0)" : "translate(-50%,-100%)";
      tip.style.top = top;
      tip.style.setProperty("--tooltip-transform", tr);
    };
    ready(async () => {
      const app = document.querySelector("osc-app");
      if (!app) return;
      const ok = await waitFor(() => app.shadowRoot?.querySelector("#canvasContainer") && app.shadowRoot?.querySelector("osc-hotkeys"));
      if (!ok) return;
      const sr = app.shadowRoot, canvasContainer = qs(sr, "#canvasContainer"), hotkeysEl = qs(sr, "osc-hotkeys");
      if (getComputedStyle(canvasContainer).position === "static") canvasContainer.style.position = "relative";
      const ring = document.createElement("div");
      ring.className = "hk-ring";
      ring.appendChild(Object.assign(document.createElement("style"), { textContent: STYLE }));
      const tooltip = document.createElement("div");
      tooltip.className = "hk-tooltip";
      const makeBadge = ([, label, type, detail, angle, title, id]) => {
        const b = document.createElement("div");
        b.className = "hk-badge";
        b.dataset.id = id;
        b.dataset.angle = angle;
        if (id === "power") b.classList.add("is-visible", "is-power");
        if (id === "mute") b.classList.add("is-mute");
        if (label === "S" || label === "L" || id === "fr-playback" && label === "R") b.dataset.shift = "1";
        b.appendChild(Object.assign(document.createElement("span"), { textContent: label }));
        on(b, "mouseenter", () => {
          tooltip.textContent = title;
          positionTooltip(tooltip, b, ring);
          tooltip.classList.add("is-visible");
        });
        on(b, "mouseleave", () => tooltip.classList.remove("is-visible"));
        on(b, "click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          hotkeysEl.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
        }, { passive: false });
        return b;
      };
      const frag = document.createDocumentFragment();
      for (const x of BADGES) frag.appendChild(makeBadge(x));
      ring.append(tooltip);
      canvasContainer.appendChild(ring.appendChild(frag) && ring);
      const seqFilled = /* @__PURE__ */ new Set();
      let seqHasData = false;
      const recompute = () => {
        seqHasData = seqFilled.size > 0;
        try {
          app.updateHkIcons?.(app.state);
        } catch {
        }
      };
      on(hotkeysEl, "seq-step-recorded", (e) => {
        const i = e.detail?.slotIndex;
        if (Number.isInteger(i)) seqFilled.add(i);
        recompute();
      });
      on(hotkeysEl, "seq-step-cleared", (e) => {
        const i = e.detail?.slotIndex;
        if (Number.isInteger(i)) seqFilled.delete(i);
        recompute();
      });
      on(hotkeysEl, "seq-steps-changed", () => {
        seqFilled.clear();
        recompute();
      });
      const cleanup = () => {
        try {
          tooltip.classList.remove("is-visible");
        } catch {
        }
        ring.querySelectorAll(".hk-badge.is-tour").forEach((b) => b.classList.remove("is-tour"));
        ring.querySelectorAll(".hk-tooltip.hk-tour").forEach((t) => t.remove());
        app._hkTourTips = [];
        app._hkTourRunning = false;
      };
      app.cleanupHotkeyTour = cleanup;
      const TOUR_ITEMS = BADGES.map(([, , , , , title, id]) => ({ id, title })).filter((x) => x.id);
      const runHotkeyTour = async (opts = {}) => {
        if (app._hkTourRunning) return;
        cleanup();
        app._hkTourRunning = true;
        const step = Math.max(120, Math.min(900, opts.stepMs ?? 260)), hold = Math.max(500, opts.holdMs ?? 1e3), delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const items = TOUR_ITEMS.map(({ id, title }) => {
          const el = ring.querySelector(`.hk-badge[data-id="${id}"]`);
          return el?.classList.contains("is-visible") ? { el, title } : null;
        }).filter(Boolean);
        const tourTip = (el, title) => {
          const t = document.createElement("div");
          t.className = "hk-tooltip hk-tour is-visible";
          t.textContent = title;
          positionTooltip(t, el, ring);
          ring.appendChild(t);
          (app._hkTourTips ??= []).push(t);
          return t;
        };
        try {
          for (const { el, title } of items) {
            el.classList.add("is-tour");
            tourTip(el, title);
            await delay(step);
          }
          await delay(hold);
        } finally {
          cleanup();
        }
      };
      app.runHotkeyTour = runHotkeyTour;
      const setData = (id, k, v) => {
        const b = ring.querySelector(`[data-id="${id}"]`);
        if (!b) return;
        b.dataset[k] = k === "disabled" ? v ? "1" : "" : (!!v).toString();
      };
      const updateIcons = (s = {}) => {
        const onp = !!s.isPlaying;
        if (!onp) {
          try {
            app.cleanupHotkeyTour?.();
          } catch {
          }
        }
        ring.querySelectorAll('.hk-badge:not([data-id="power"])').forEach((b) => b.classList.toggle("is-visible", onp));
        setData("power", "active", onp);
        setData("mute", "active", s.isMuted);
        setData("controls", "active", s.controlsVisible);
        setData("sequencer", "active", s.sequencerVisible);
        setData("seq-play", "active", s.sequencePlaying);
        setData("sig-mode", "active", s.isSequenceSignatureMode);
        setData("loop", "active", s.isLoopEnabled);
        setData("latch", "active", s.isLatchOn);
        const sigPlay = s.isSignaturePlaying || s.signatureActive || false;
        setData("signature", "active", sigPlay);
        setData("fr-ready", "active", !!s.isFreestyleMode);
        setData("fr-playback", "active", !!s.freestylePlayback);
        setData("fr-playback", "disabled", !s.freestyleRecording);
      };
      app.updateHkIcons = updateIcons;
      if (app.state) updateIcons(app.state);
      const getSafe = () => {
        const d = document.createElement("div");
        d.style.cssText = "position:fixed;inset:auto 0 0 0;height:0;padding:env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0);visibility:hidden";
        document.body.appendChild(d);
        const cs = getComputedStyle(d), s = { top: +cs.paddingTop.replace("px", "") || 0, right: +cs.paddingRight.replace("px", "") || 0, bottom: +cs.paddingBottom.replace("px", "") || 0, left: +cs.paddingLeft.replace("px", "") || 0 };
        d.remove();
        return s;
      };
      const adjust = () => {
        try {
          app.cleanupHotkeyTour?.();
        } catch {
        }
        const rect = canvasContainer.getBoundingClientRect();
        if (!rect || rect.width < 100) return;
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, vw = innerWidth, vh = innerHeight, inset = getSafe(), PAD = 10, OUT = 28, baseR = Math.min(rect.width, rect.height) / 2 + OUT;
        const controls2 = sr.querySelector("osc-controls"), cr = controls2 && controls2.offsetParent !== null ? controls2.getBoundingClientRect() : null;
        ring.querySelectorAll(".hk-badge").forEach((el) => {
          const { id } = el.dataset;
          if (["signature", "fr-ready", "fr-playback"].includes(id)) return;
          const ang = +el.dataset.angle || 0, rad = ang * Math.PI / 180, ux = Math.cos(rad), uy = Math.sin(rad), elHalf = 15, minX = inset.left + PAD + elHalf, maxX = vw - inset.right - PAD - elHalf, minY = inset.top + PAD + elHalf, maxY = cr ? Math.max(minY, cr.top - PAD - elHalf) : vh - inset.bottom - PAD - elHalf;
          let r = baseR, maxR = Infinity;
          if (ux > 0) maxR = Math.min(maxR, (maxX - cx) / ux);
          if (ux < 0) maxR = Math.min(maxR, (cx - minX) / -ux);
          if (uy > 0) maxR = Math.min(maxR, (maxY - cy) / uy);
          if (uy < 0) maxR = Math.min(maxR, (cy - minY) / -uy);
          r = Math.max(elHalf + 4, Math.floor(Math.min(r, maxR)));
          const dx = Math.cos(rad) * r, dy = Math.sin(rad) * r;
          el.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%) scale(1)`;
        });
      };
      adjust();
      on(window, "resize", adjust, { passive: true });
      const controls = sr.querySelector("osc-controls");
      if (controls) {
        try {
          new ResizeObserver(adjust).observe(controls);
        } catch {
        }
      }
    });
  })();

  // js/controls-visibility.js
  (() => {
    ready(async () => {
      const app = document.querySelector("osc-app");
      if (!app) return;
      const ok = await waitFor(
        () => app.shadowRoot && app.shadowRoot.querySelector("osc-controls") && app.shadowRoot.querySelector("osc-hotkeys")
      );
      if (!ok) return;
      const sr = app.shadowRoot;
      const controls = sr.querySelector("osc-controls");
      const hotkeys = sr.querySelector("osc-hotkeys");
      controls.style.display = "none";
      const toggleControls = () => {
        const show = controls.style.display === "none";
        controls.style.display = show ? "block" : "none";
        try {
          app._fitLayout?.();
        } catch {
        }
        try {
          controls.dispatchEvent(new Event("controls-resize"));
        } catch {
        }
      };
      hotkeys.addEventListener("hk-toggle-controls", toggleControls);
    });
  })();
})();
