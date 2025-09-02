/**
 * =============================================================================
 * ScopeCanvas – Oscilloscope Visual Renderer
 * =============================================================================
 *
 * PURPOSE:
 *   <scope-canvas> renders oscilloscope-style visuals driven by live audio or
 *   deterministic seed buffers. It’s the visual layer for the preset system.
 *
 * CONTROL INTERFACE (public API preserved):
 *   - analyser: AudioAnalyser|null
 *   - preset: { seed?: string, colorSpeed?: number, _seedBuffer?: Float32Array }|null
 *   - shapeKey: string ("circle","square","butterfly","lissajous","spiro","harmonograph","rose","hypocycloid","epicycloid","hum")
 *   - mode: "seed"|"live"
 *   - isAudioStarted: boolean
 *   - isPlaying: boolean
 *   - onIndicatorUpdate: ((text: string, active: boolean) => void)|null
 *
 * INTERNAL:
 *   - _animate(): main loop
 *   - _makeSeedBuffer(shape, seed, len?): deterministic PRNG buffer
 *
 * NOTES:
 *   - Canvas is fixed 600x600.
 *   - Stroke-only visuals; shapes must handle any data.length.
 * =============================================================================
 */

class ScopeCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Canvas setup (fixed-size square)
    this._canvas = document.createElement('canvas');
    this._canvas.width = 600;
    this._canvas.height = 600;
    this.shadowRoot.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    // Public state (names preserved)
    this.analyser = null;
    this.preset = null;
    this.shapeKey = 'circle';
    this.mode = 'seed';
    this.isAudioStarted = false;
    this.isPlaying = false;
    this.onIndicatorUpdate = null;

    // Internal caches
    this._dummyData = null;
    this._liveBuffer = null;
    this._animId = null;

    // Bind
    this._animate = this._animate.bind(this);

    // === Shared constants & mini-helpers (kept internal) ===
    this._TAU = Math.PI * 2;

    // Returns { ctx, cw, c } frequently needed by shape functions
    this._g = () => {
      const cw = this._canvas.width;
      return { ctx: this._ctx, cw, c: cw / 2 };
    };

    // Trace a polyline over data using a point-mapper fn(i, len) -> [x,y]
    this._trace = (data, point, { close = false } = {}) => {
      const { ctx } = this._g();
      ctx.beginPath();
      const n = data.length;
      for (let i = 0; i < n; i++) {
        const [x, y] = point(i, n);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (close) ctx.closePath();
      ctx.stroke();
    };

    // Safe sample accessor that tolerates length mismatches
    this._samp = (arr, i) => (arr ? arr[i % arr.length] ?? 0 : 0);

    // === Drawing functions (keys & behavior preserved) ===
    this.drawFuncs = {
      // Power Hum: soft, glowing, minimal radial sine pulse
      hum: (data, t) => {
        const { ctx, cw, c } = this._g();
        const baseRadius = 0.33 * cw + Math.sin(t * 0.0002) * 5;
        ctx.save();
        ctx.globalAlpha = 0.23 + 0.14 * Math.abs(Math.sin(t * 0.0004));
        ctx.beginPath();
        ctx.arc(c, c, baseRadius, 0, this._TAU);
        ctx.stroke();

        ctx.strokeStyle = 'hsl(195, 80%, 62%)';
        ctx.globalAlpha = 0.36;

        const segs = 128;
        ctx.beginPath();
        for (let i = 0; i < segs; i++) {
          const theta = (i / segs) * this._TAU;
          const ripple = 12 * Math.sin(theta * 3 + t * 0.00045) + 6 * Math.sin(theta * 6 - t * 0.00032);
          const amp = this._samp(data, i) * 7;
          const r = baseRadius + ripple + amp;
          const x = c + Math.cos(theta) * r;
          const y = c + Math.sin(theta) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      },

      circle: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.8 * cw / 2;
        this._trace(data, (i, n) => {
          const a = (i / n) * this._TAU + t * 0.001;
          const amp = (data[i] + 1) / 2;
          const r = S * amp;
          return [c + Math.cos(a) * r, c + Math.sin(a) * r];
        }, { close: true });
      },

      square: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.8 * cw / Math.SQRT2;
        const o = (cw - S) / 2;
        this._trace(data, (i, n) => {
          const p = i / n;
          const amp = (data[i] + 1) / 2;
          let x, y;
          if (p < 0.25) [x, y] = [o + S * (p / 0.25), o];
          else if (p < 0.5) [x, y] = [o + S, o + S * ((p - 0.25) / 0.25)];
          else if (p < 0.75) [x, y] = [o + S - S * ((p - 0.5) / 0.25), o + S];
          else [x, y] = [o, o + S - S * ((p - 0.75) / 0.25)];
          const dx = x - c, dy = y - c;
          const fx = c + dx * (0.8 + 0.2 * amp) + Math.sin(t * 0.0005) * 10;
          const fy = c + dy * (0.8 + 0.2 * amp) + Math.cos(t * 0.0006) * 10;
          // Note: original movedTo(x,y) on first point; rendering identical with fx/fy after
          return i ? [fx, fy] : [x, y];
        }, { close: true });
      },

      butterfly: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.22 * cw;                      // intentionally small
        const tSpeed = 0.00035;                   // a touch quicker
        this._trace(data, (i, n) => {
          const th = (i / n) * Math.PI * 28 + t * tSpeed;
          const amp = ((this._samp(data, i) + 1) / 2) ** 1.25;
          // tweak the classic butterfly to add finer “veins”
          const scale =
            Math.exp(0.85 * Math.cos(th)) - 1.6 * Math.cos(5.0 * th) + Math.pow(Math.sin(th / 10), 7);
          const r = scale * S * (0.5 + 0.5 * amp);
          return [c + Math.sin(th) * r, c + Math.cos(th) * r];
        }, { close: true });
      },

      lissajous: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.8 * cw / 3;
        const avg = data.reduce((a, b) => a + Math.abs(b), 0) / data.length;
        const fx = 3 + Math.sin(t * 0.0003) * 1.5;
        const fy = 2 + Math.cos(t * 0.0004) * 1.5;
        const phase = t * 0.0005;
        this._trace(data, (i, n) => {
          const theta = (i / n) * this._TAU;
          const r = avg * (0.5 + 0.5 * data[i]);
          return [c + Math.sin(fx * theta + phase) * S * r,
                  c + Math.sin(fy * theta) * S * r];
        });
      },

      spiro: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.6 * cw / 3;
        const inner = 0.3 + Math.sin(t * 0.0002) * 0.2;
        const outer = 0.7;
        const ratio = 0.21 + 0.02 * Math.sin(t * 0.0001);
        this._trace(data, (i, n) => {
          const theta = (i / n) * this._TAU;
          const waveAmp = (data[i] + 1) / 2;
          const co = (outer - inner) / inner;
          const M = (0.8 + 0.2 * waveAmp);
          const x = (S * (outer - inner) * Math.cos(theta) + S * inner * Math.cos(co * theta + t * ratio)) * M;
          const y = (S * (outer - inner) * Math.sin(theta) - S * inner * Math.sin(co * theta + t * ratio)) * M;
          return [c + x, c + y];
        });
      },

      harmonograph: (data, t) => {
        // (decay & avg computed in original; avg not used in coordinates beyond data[i])
        const { cw, c } = this._g();
        const S = 0.7 * cw / 4;
        void Math.exp(-t * 0.0002); // keep side-effect parity (no-op)
        this._trace(data, (i, n) => {
          const th = (i / n) * this._TAU;
          const x = S * ((Math.sin(3 * th + t * 0.0003) * 0.7 + Math.sin(5 * th + t * 0.0004) * 0.3)) * (0.5 + 0.5 * data[i]);
          const y = S * ((Math.sin(4 * th + t * 0.00035) * 0.6 + Math.sin(6 * th + t * 0.00025) * 0.4)) * (0.5 + 0.5 * data[i]);
          return [c + x, c + y];
        });
      },

      // Rose (rhodonea): r = cos(k*theta)
      rose: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.42 * cw;
        const k = 3 + Math.round(Math.abs(Math.sin(t * 0.00025)) * 4);
        this._trace(data, (i, n) => {
          const th = (i / n) * this._TAU + t * 0.00035;
          const amp = (data[i] + 1) / 2;
          const r = S * Math.cos(k * th) * (0.65 + 0.35 * amp);
          return [c + Math.cos(th) * r, c + Math.sin(th) * r];
        }, { close: true });
      },

      // Hypocycloid
      hypocycloid: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.39 * cw;
        const n = 3 + Math.round(3 * Math.abs(Math.cos(t * 0.00023))); // 3–6
        const R = 1, r = 1 / n, coef = (R - r) / r;
        this._trace(data, (i, nPts) => {
          const th = (i / nPts) * this._TAU + t * 0.0004;
          const amp = (data[i] + 1) / 2;
          const M = 0.7 + 0.3 * amp;
          const x = S * ((R - r) * Math.cos(th) + r * Math.cos(coef * th)) * M;
          const y = S * ((R - r) * Math.sin(th) - r * Math.sin(coef * th)) * M;
          return [c + x, c + y];
        }, { close: true });
      },

      // Epicycloid
      epicycloid: (data, t) => {
        const { cw, c } = this._g();
        const S = 0.36 * cw;
        const n = 4 + Math.round(3 * Math.abs(Math.sin(t * 0.00021 + 0.5))); // 4–7
        const R = 1, r = 1 / n, coef = (R + r) / r;
        this._trace(data, (i, nPts) => {
          const th = (i / nPts) * this._TAU + t * 0.00038;
          const amp = (data[i] + 1) / 2;
          const M = 0.7 + 0.3 * amp;
          const x = S * ((R + r) * Math.cos(th) - r * Math.cos(coef * th)) * M;
          const y = S * ((R + r) * Math.sin(th) - r * Math.sin(coef * th)) * M;
          return [c + x, c + y];
        }, { close: true });
      },
    };
  }

  connectedCallback() {
    if (!this._animId) this._animate();
  }

  disconnectedCallback() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  // inside scope-canvas.js
  _getSeed() {
    if (this.preset?.seed) return this.preset.seed;
    const osc = this.closest?.('osc-app');
    if (osc?.getAttribute('seed')) return osc.getAttribute('seed');
    const htmlSeed = document.documentElement?.dataset?.seed;
    return htmlSeed || 'default';
  }


  // Deterministic seed buffer using Mulberry32 PRNG seeded by (seed + shape)
  _makeSeedBuffer(shape, seed, len = 2048) {
    const str = `${seed}_${shape}`;
    let a = 0;
    for (let i = 0; i < str.length; i++) a = (a << 5) - a + str.charCodeAt(i);

    const rng = (() => {
      let s = a | 0;
      return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const out = new Float32Array(len);
    const TAU = this._TAU;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const base = Math.sin(TAU * t + rng() * 6.28);
      const h2 = 0.5 * Math.sin(TAU * 2 * t + rng() * 6.28);
      const h3 = 0.25 * Math.sin(TAU * 3 * t + rng() * 6.28);
      out[i] = 0.6 * base + 0.3 * h2 + 0.15 * h3;
    }
    return out;
  }

  // --- Main loop: gather data, color, draw, schedule next frame ---
  _animate() {
    const now = performance.now();
    const ctx = this._ctx;

    // 1) Select input data
    let data;
    if (this.isAudioStarted && this.isPlaying && this.analyser) {
      const need = this.analyser.fftSize;
      if (!this._liveBuffer || this._liveBuffer.length !== need) {
        this._liveBuffer = new Float32Array(need);
      }
      this.analyser.getFloatTimeDomainData(this._liveBuffer);
      data = this._liveBuffer;
    } else if (this.preset && this.mode === 'seed') {
      const seed = this.preset?.seed ?? 'default';
      const sk = this.shapeKey || 'circle';
      this.preset._seedBuffers ||= {};
      data = this.preset._seedBuffers[sk] ||= this._makeSeedBuffer(sk, seed);
    } else {
      if (!this._dummyData) {
        const len = 2048, arr = new Float32Array(len), TAU = this._TAU;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          arr[i] = 0.5 * Math.sin(TAU * t) + 0.3 * Math.sin(TAU * 2 * t + Math.PI / 3);
        }
        this._dummyData = arr;
      }
      data = this._dummyData;
    }

    // 2) Color decision (same behavior: 85% sat, 60% light)
    const pr = this.preset ?? {};
    const hue = (now * (pr.colorSpeed ?? 0.06)) % 360;

    // 3) Clear & stroke setup, then draw selected shape
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    ctx.strokeStyle = `hsl(${hue},85%,60%)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = ctx.lineCap = 'round';

    (this.drawFuncs[this.shapeKey] || this.drawFuncs.circle)(data, now, pr);

    // 4) Indicator callback
    if (typeof this.onIndicatorUpdate === 'function') {
      const started = this.isAudioStarted;
      const active = started && this.isPlaying;
      this.onIndicatorUpdate(started ? (active ? 'Audio Live' : 'Muted') : 'Silent Mode', !!active);
    }

    // 5) Next frame
    this._animId = requestAnimationFrame(this._animate);
  }
}

customElements.define('scope-canvas', ScopeCanvas);
