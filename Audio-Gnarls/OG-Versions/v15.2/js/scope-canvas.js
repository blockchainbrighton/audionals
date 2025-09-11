/**
 * =============================================================================
 * ScopeCanvas – Oscilloscope Visual Renderer (DPR + pixel-perfect center)
 * =============================================================================
 * Public API (unchanged):
 *   - analyser: AudioAnalyser|null
 *   - preset: { seed?: string, colorSpeed?: number, _seedBuffers?: Record<string,Float32Array> }|null
 *   - shapeKey: string
 *   - mode: "seed"|"live"
 *   - isAudioStarted: boolean
 *   - isPlaying: boolean
 *   - onIndicatorUpdate: ((text: string, active: boolean) => void)|null
 * Internal:
 *   - _animate(): main loop
 *   - _makeSeedBuffer(shape, seed, len?): deterministic PRNG buffer
 * Notes:
 *   - Canvas bitmap auto-resizes to CSS size × devicePixelRatio.
 *   - Drawing uses CSS-space units; context is DPR-scaled and center aligned to a device pixel.
 *   - Stroke-only visuals; shapes must handle any data.length.
 * =============================================================================
 */
(function registerScopeCanvas () {
  // ---- Math + small helpers ----
  const { sin, cos, abs, PI, pow, SQRT2, imul } = Math;
  const TAU = PI * 2;
  const theta = (i, n, phase = 0) => (i / n) * TAU + phase;
  const norm = v => (v + 1) * 0.5;

  // Seed buffer params
  const SHAPE_PARAMS = {
    circle:       { freq: 1.0, harmonics: [1, 0.5, 0.25],               complexity: 0.3 },
    square:       { freq: 1.5, harmonics: [1, 0.3, 0.7, 0.2],           complexity: 0.6 },
    butterfly:    { freq: 2.2, harmonics: [1, 0.4, 0.6, 0.3, 0.2],      complexity: 0.8 },
    lissajous:    { freq: 1.8, harmonics: [1, 0.6, 0.4],                complexity: 0.5 },
    spiro:        { freq: 3.1, harmonics: [1, 0.3, 0.5, 0.2, 0.4],      complexity: 0.9 },
    harmonograph: { freq: 2.5, harmonics: [1, 0.7, 0.5, 0.3, 0.2, 0.1], complexity: 1.0 },
    rose:         { freq: 1.7, harmonics: [1, 0.4, 0.3, 0.2],           complexity: 0.4 },
    hypocycloid:  { freq: 2.8, harmonics: [1, 0.5, 0.3, 0.4],           complexity: 0.7 },
    epicycloid:   { freq: 2.9, harmonics: [1, 0.4, 0.5, 0.3],           complexity: 0.7 },
    spiral:       { freq: 1.3, harmonics: [1, 0.3, 0.2],                complexity: 0.4 },
    star:         { freq: 2.1, harmonics: [1, 0.6, 0.4, 0.2],           complexity: 0.6 },
    flower:       { freq: 1.9, harmonics: [1, 0.5, 0.3, 0.4],           complexity: 0.5 },
    wave:         { freq: 1.1, harmonics: [1, 0.4, 0.2],                complexity: 0.3 },
    mandala:      { freq: 3.5, harmonics: [1, 0.3, 0.4, 0.2, 0.3, 0.1], complexity: 1.2 },
    infinity:     { freq: 1.6, harmonics: [1, 0.5, 0.3],                complexity: 0.4 },
    dna:          { freq: 2.7, harmonics: [1, 0.4, 0.3, 0.5, 0.2],      complexity: 0.8 },
    tornado:      { freq: 3.2, harmonics: [1, 0.3, 0.6, 0.2, 0.4],      complexity: 1.1 },
    hum:          { freq: 0.8, harmonics: [1, 0.2, 0.1],                complexity: 0.2 },
  };

  class ScopeCanvas extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        :host { display:block; width:100%; height:100%; }
        canvas { display:block; width:100%; height:100%; }
      `;
      root.append(style);

      this._canvas = document.createElement('canvas');
      root.append(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Public state
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

      // Sizing cache (CSS pixels + DPR)
      this._cssW = 0; this._cssH = 0; this._dpr = 1;

      // Bindings
      this._animate = this._animate.bind(this);
      this._resizeCanvas = this._resizeCanvas.bind(this);

      // Fast data helpers
      this._samp = (arr, i) => (arr ? arr[i % arr.length] ?? 0 : 0);
      this._ampAt = (data, i) => norm(this._samp(data, i));
      this._avgAbs = (data) => {
        let s = 0; for (let i = 0; i < data.length; i++) s += abs(data[i]); return s / data.length;
      };

      // ctx, width (CSS), and pixel-perfect center (CSS units)
      this._withCtx = (fn) => {
        const cw = this._cssW || this._canvas.clientWidth || this._canvas.width;
        const cxDev = Math.round(this._canvas.width  / 2);
        const cyDev = Math.round(this._canvas.height / 2);
        const c = Math.min(cxDev, cyDev) / (this._dpr || 1);
        return fn(this._ctx, cw, c);
      };

      this._traceParam = (data, mapPoint, { close = false } = {}) =>
        this._withCtx((ctx, cw, c) => {
          ctx.beginPath();
          const n = data.length;
          for (let i = 0; i < n; i++) {
            const [x, y] = mapPoint(i, n, cw, c);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          if (close) ctx.closePath();
          ctx.stroke();
        });

      this._tracePolar = (data, rFn, { phase = 0, close = false } = {}) =>
        this._traceParam(
          data,
          (i, n, cw, c) => {
            const th = theta(i, n, phase);
            const r = rFn(i, n, th, cw, c);
            return [c + cos(th) * r, c + sin(th) * r];
          },
          { close }
        );

      this._prepareStroke = (hue) => {
        const ctx = this._ctx;
        ctx.clearRect(0, 0, this._cssW, this._cssH); // CSS coordinates (context is DPR-scaled)
        ctx.strokeStyle = `hsl(${hue},85%,60%)`;
        ctx.lineWidth = 2;
        ctx.lineJoin = ctx.lineCap = 'round';
      };

      // === Drawing registry (math unchanged) ===
      const cycloidFactory = (kind /* 'epi' | 'hypo' */) => (data, t) =>
        this._withCtx((ctx, cw, c) => {
          const epi = kind === 'epi' ? 1 : -1;
          const S = (kind === 'epi' ? 0.36 : 0.39) * cw;
          const n = (kind === 'epi'
            ? 4 + Math.round(3 * abs(sin(t * 0.00021 + 0.5)))
            : 3 + Math.round(3 * abs(cos(t * 0.00023))));
          const R = 1, r = 1 / n, coef = (R + epi * r) / r;
          const ph = kind === 'epi' ? t * 0.00038 : t * 0.0004;

          this._traceParam(
            data,
            (i, N) => {
              const th = theta(i, N, ph);
              const M = 0.7 + 0.3 * this._ampAt(data, i);
              const x = S * ((R + epi * r) * cos(th) - epi * r * cos(coef * th)) * M;
              const y = S * ((R + epi * r) * sin(th) - r * sin(coef * th)) * M;
              return [c + x, c + y];
            },
            { close: true }
          );
        });

      this.drawFuncs = {
        hum: (data, t) => this._withCtx((ctx, cw, c) => {
          const baseRadius = 0.33 * cw + sin(t * 0.0002) * 5;
          ctx.save();
          ctx.globalAlpha = 0.23 + 0.14 * abs(sin(t * 0.0004));
          ctx.beginPath(); ctx.arc(c, c, baseRadius, 0, TAU); ctx.stroke();

          ctx.strokeStyle = 'hsl(195, 80%, 62%)';
          ctx.globalAlpha = 0.36;

          const segs = 128;
          ctx.beginPath();
          for (let i = 0; i < segs; i++) {
            const th = (i / segs) * TAU;
            const ripple = 12 * sin(th * 3 + t * 0.00045) + 6 * sin(th * 6 - t * 0.00032);
            const amp = this._samp(data, i) * 7;
            const r = baseRadius + ripple + amp;
            const x = c + cos(th) * r, y = c + sin(th) * r;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.closePath(); ctx.stroke(); ctx.restore();
        }),

        circle: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.8 * cw / 2;
          this._traceParam(data, (i, n) => {
            const th = theta(i, n, t * 0.001);
            const r = S * this._ampAt(data, i);
            return [c + cos(th) * r, c + sin(th) * r];
          }, { close: true });
        }),

        square: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.8 * cw / SQRT2, o = (cw - S) / 2;
          const jigX = sin(t * 0.0005) * 10, jigY = cos(t * 0.0006) * 10;
          const seg = (p) =>
            p < .25 ? [o + S * (p / .25), o]
          : p < .5  ? [o + S, o + S * ((p - .25) / .25)]
          : p < .75 ? [o + S - S * ((p - .5) / .25), o + S]
                    : [o, o + S - S * ((p - .75) / .25)];
          this._traceParam(data, (i, n) => {
            const p = i / n;
            const [x, y] = seg(p);
            if (!i) return [x, y];
            const A = 0.8 + 0.2 * this._ampAt(data, i);
            return [c + (x - c) * A + jigX, c + (y - c) * A + jigY];
          }, { close: true });
        }),

        butterfly: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.22 * cw, sp = 0.00035;
          this._traceParam(data, (i, n) => {
            const th = (i / n) * PI * 28 + t * sp;
            const amp = pow(this._ampAt(data, i), 1.25);
            const scale = Math.exp(0.85 * cos(th)) - 1.6 * cos(5 * th) + pow(sin(th / 10), 7);
            const r = scale * S * (0.5 + 0.5 * amp);
            return [c + sin(th) * r, c + cos(th) * r];
          }, { close: true });
        }),

        lissajous: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.8 * cw / 3;
          const avg = this._avgAbs(data);
          const fx = 3 + sin(t * 0.0003) * 1.5;
          const fy = 2 + cos(t * 0.0004) * 1.5;
          const ph = t * 0.0005;
          this._traceParam(data, (i, n) => {
            const th = theta(i, n);
            const r = avg * (0.5 + 0.5 * this._samp(data, i));
            return [c + sin(fx * th + ph) * S * r, c + sin(fy * th) * S * r];
          });
        }),

        spiro: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.6 * cw / 3;
          const inner = 0.3 + sin(t * 0.0002) * 0.2;
          const outer = 0.7;
          const ratio = 0.21 + 0.02 * sin(t * 0.0001);
          const co = (outer - inner) / inner;
          this._traceParam(data, (i, n) => {
            const th = theta(i, n);
            const w = this._ampAt(data, i);
            const M = 0.8 + 0.2 * w;
            const x = (S * (outer - inner) * cos(th) + S * inner * cos(co * th + t * ratio)) * M;
            const y = (S * (outer - inner) * sin(th) - S * inner * sin(co * th + t * ratio)) * M;
            return [c + x, c + y];
          });
        }),

        harmonograph: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.7 * cw / 4;
          this._traceParam(data, (i, n) => {
            const th = theta(i, n);
            const x = S * (sin(3 * th + t * 0.0003) * 0.7 + sin(5 * th + t * 0.0004) * 0.3) * (0.5 + 0.5 * this._samp(data, i));
            const y = S * (sin(4 * th + t * 0.00035) * 0.6 + sin(6 * th + t * 0.00025) * 0.4) * (0.5 + 0.5 * this._samp(data, i));
            return [c + x, c + y];
          });
        }),

        rose: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.42 * cw;
          const k = 3 + Math.round(abs(sin(t * 0.00025)) * 4);
          this._tracePolar(data, (i, n, th) => {
            const amp = this._ampAt(data, i);
            return S * cos(k * th) * (0.65 + 0.35 * amp);
          }, { phase: t * 0.00035, close: true });
        }),

        hypocycloid: cycloidFactory('hypo'),
        epicycloid:  cycloidFactory('epi'),

        spiral: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.4 * cw;
          this._traceParam(data, (i, n) => {
            const th = (i / n) * TAU * 8 + t * 0.0003;
            const r = S * (i / n) * (0.6 + 0.4 * this._ampAt(data, i));
            return [c + cos(th) * r, c + sin(th) * r];
          });
        }),

        star: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.45 * cw;
          const points = 5 + Math.round(3 * abs(sin(t * 0.0002)));
          this._tracePolar(data, (i, n, th) => {
            const starR = sin(points * th) * 0.5 + 0.5;
            return S * starR * (0.7 + 0.3 * this._ampAt(data, i));
          }, { phase: t * 0.0004, close: true });
        }),

        flower: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.4 * cw;
          const petals = 6 + Math.round(2 * abs(cos(t * 0.00015)));
          this._tracePolar(data, (i, n, th) => {
            const petal = cos(petals * th) * 0.3 + 0.7;
            return S * petal * (0.6 + 0.4 * this._ampAt(data, i));
          }, { phase: t * 0.0003, close: true });
        }),

        wave: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.6 * cw, n = data.length;
          this._traceParam(data, (i) => {
            const x = (i / n) * S - S / 2;
            const freq = 3 + sin(t * 0.0002) * 2;
            const y = sin((x * freq) / 50 + t * 0.001) * S * 0.3 * this._ampAt(data, i);
            return [c + x, c + y];
          });
        }),

        mandala: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.35 * cw;
          this._tracePolar(data, (i, n, th) => {
            const layer1 = cos(6 * th) * 0.3;
            const layer2 = sin(12 * th) * 0.2;
            const layer3 = cos(18 * th) * 0.1;
            const base = 0.8 + layer1 + layer2 + layer3;
            return S * base * (0.7 + 0.3 * this._ampAt(data, i));
          }, { phase: t * 0.0002, close: true });
        }),

        infinity: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.4 * cw;
          this._traceParam(data, (i, n) => {
            const th = theta(i, n, t * 0.0003);
            const scale = 0.7 + 0.3 * this._ampAt(data, i);
            const denom = 1 + sin(th) * sin(th);
            const x = S * cos(th) / denom * scale;
            const y = S * sin(th) * cos(th) / denom * scale;
            return [c + x, c + y];
          });
        }),

        dna: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.3 * cw, n = data.length, H = cw * 0.8;
          const helix = (phase) => {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
              const z = (i / n) * 4 * PI + phase + t * 0.001;
              const amp = 0.7 + 0.3 * this._ampAt(data, i);
              const x = c + cos(z) * S * amp;
              const y = c + (i / n - 0.5) * H;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
          };
          helix(0); helix(PI);
        }),

        tornado: (data, t) => this._withCtx((ctx, cw, c) => {
          const S = 0.4 * cw;
          this._traceParam(data, (i, n) => {
            const p = i / n;
            const th = p * TAU * 6 + t * 0.0005;
            const radius = S * (1 - p) * (0.6 + 0.4 * this._ampAt(data, i));
            return [c + cos(th) * radius, c + (p - 0.5) * cw * 0.7];
          });
        }),
      };
    }

    listShapes() { return Object.keys(this.drawFuncs).filter(k => k !== 'hum'); }

    connectedCallback() {
      if (!this._animId) this._animId = requestAnimationFrame(this._animate);
      try {
        this._ro = new ResizeObserver(this._resizeCanvas);
        this._ro.observe(this);
      } catch { this._resizeCanvas(); } // older browsers
      this._resizeCanvas();
    }

    disconnectedCallback() {
      if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
      if (this._ro) { try { this._ro.disconnect(); } catch {} this._ro = null; }
    }

    // Sync the canvas bitmap to CSS size and DPR; keep drawing in CSS units.
    _resizeCanvas() {
      const { width, height } = this.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(width));
      const cssH = Math.max(1, Math.floor(height));
      const dpr  = Math.min(4, Math.max(1, window.devicePixelRatio || 1));

      if (cssW === this._cssW && cssH === this._cssH && dpr === this._dpr) return;

      this._cssW = cssW; this._cssH = cssH; this._dpr = dpr;

      const devW = Math.max(1, Math.round(cssW * dpr));
      const devH = Math.max(1, Math.round(cssH * dpr));
      if (this._canvas.width !== devW)  this._canvas.width  = devW;
      if (this._canvas.height !== devH) this._canvas.height = devH;

      const ctx = this._ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, devW, devH);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _getSeed() {
      if (this.preset?.seed) return this.preset.seed;
      const attrSeed = this.closest?.('osc-app')?.getAttribute?.('seed');
      return attrSeed ?? document.documentElement?.dataset?.seed ?? 'default';
    }

    // Deterministic seed buffer (Mulberry32-like), audio-ish shaping
    _makeSeedBuffer(shape, seed, len = 2048) {
      const str = `${seed}_${shape}`;
      let a = 0; for (let i = 0; i < str.length; i++) a = (a << 5) - a + str.charCodeAt(i);
      let s = a | 0;
      const rng = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = imul(s ^ (s >>> 15), 1 | s);
        t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      const out = new Float32Array(len);
      const p = SHAPE_PARAMS[shape] || SHAPE_PARAMS.circle;

      for (let i = 0; i < len; i++) {
        const tt = i / len;
        let sig = 0;
        for (let h = 0; h < p.harmonics.length; h++) {
          const freq = p.freq * (h + 1);
          sig += p.harmonics[h] * sin(TAU * freq * tt + rng() * TAU);
        }
        const modulation = p.complexity * (rng() - 0.5) * 0.3;
        const envelope = 0.5 + 0.5 * sin(TAU * tt * 0.1 + rng() * TAU);
        out[i] = (sig + modulation) * envelope * 0.7;
      }
      return out;
    }

    _selectData(now) {
      // live
      if (this.isAudioStarted && this.isPlaying && this.analyser) {
        const need = this.analyser.fftSize;
        if (!this._liveBuffer || this._liveBuffer.length !== need) this._liveBuffer = new Float32Array(need);
        this.analyser.getFloatTimeDomainData(this._liveBuffer);
        return this._liveBuffer;
      }
      // seeded
      if (this.preset && this.mode === 'seed') {
        const seed = this.preset?.seed ?? this._getSeed();
        const key = this.shapeKey || 'circle';
        (this.preset._seedBuffers ||= {});
        return (this.preset._seedBuffers[key] ||= this._makeSeedBuffer(key, seed));
      }
      // fallback dummy
      if (!this._dummyData) {
        const len = 2048;
        const arr = new Float32Array(len);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          arr[i] = 0.5 * sin(TAU * t) + 0.3 * sin(TAU * 2 * t + PI / 3);
        }
        this._dummyData = arr;
      }
      return this._dummyData;
    }

    // --- Main loop ---
    _animate() {
      const now = performance.now();
      this._resizeCanvas(); // guard

      const data = this._selectData(now);

      const { colorSpeed = 0.06 } = this.preset ?? {};
      const hue = (now * colorSpeed) % 360;

      this._prepareStroke(hue);
      (this.drawFuncs[this.shapeKey] || this.drawFuncs.circle)(data, now, this.preset ?? {});

      if (typeof this.onIndicatorUpdate === 'function') {
        const started = this.isAudioStarted;
        const active = started && this.isPlaying;
        this.onIndicatorUpdate(started ? (active ? 'Audio Live' : 'Muted') : 'Silent Mode', !!active);
      }

      this._animId = requestAnimationFrame(this._animate);
    }
  }

  customElements.define('scope-canvas', ScopeCanvas);
})();
