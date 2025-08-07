// Web component responsible for rendering the oscilloscope visuals.  It owns
// its own canvas and animation loop and supports both a deterministic
// seed-based display and live audio data sourced from a Web Audio analyser.

class ScopeCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Create canvas element. Dimensions are fixed to mirror the original app.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 600;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d');
    // Internal state controlling the draw behaviour.
    this._params = {
      shape: 'circle',
      seed: 'seed',
      preset: null,
      analyser: null,
      mode: 'seed',
    };
    this._animationId = null;
    // Inject component‑specific styling into the shadow root.  These styles
    // recreate the look of the original #scope element without polluting
    // global CSS.
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        border-radius: 12px;
        border: 1px solid #333;
        background: #000;
        box-shadow: 0 0 30px #0008;
        width: 600px;
        height: 600px;
      }
      canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    `;
    this.shadowRoot.append(style, this.canvas);
    // Bind draw method once to avoid re-binding on every frame.
    this._draw = this._draw.bind(this);
  }

  connectedCallback() {
    // Begin the animation loop when the component is added to the document.
    this.start();
  }

  disconnectedCallback() {
    // Clean up the animation loop when the component is removed.
    this.stop();
  }

  /**
   * Merge new parameters into the drawing configuration.  Callers should
   * provide whichever fields need updating.  Parameters include:
   *  - shape: string indicating which draw function to use
   *  - seed: string used for deterministic PRNG
   *  - preset: object containing colour speed and other modifiers
   *  - analyser: Web Audio analyser node for live data
   *  - mode: 'seed' or 'live'
   *
   * @param {Object} params
   */
  setParams(params = {}) {
    this._params = Object.assign({}, this._params, params);
  }

  /**
   * Start the animation loop if it is not already running.
   */
  start() {
    if (this._animationId == null) {
      this._animationId = requestAnimationFrame(this._draw);
    }
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    if (this._animationId != null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  /**
   * PRNG implementation from the original app.  It produces a deterministic
   * sequence of pseudo‑random numbers in the range [0, 1) based on the
   * supplied seed string.
   * @param {string} seed
   */
  mulberry32(seed) {
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i = 0; i < seed.length; ++i) {
      a = Math.imul(a ^ seed.charCodeAt(i), 0x10001);
    }
    return () => {
      a = Math.imul(a ^ (a >>> 15), 1 | a);
      return ((a >>> 16) & 0xffff) / 0x10000;
    };
  }

  /**
   * Generate a deterministic buffer for the silent visual seed mode.  This
   * matches the original implementation used to display a waveform before
   * audio is started.
   * @param {string} shape
   * @param {string} seed
   * @param {number} len
   */
  makeSeedBuffer(shape, seed, len = 2048) {
    const rng = this.mulberry32(`${seed}_${shape}`);
    const arr = new Float32Array(len);
    for (let i = 0; i < len; ++i) {
      const t = i / len;
      const base = Math.sin(2 * Math.PI * t + rng() * Math.PI * 2);
      const harm2 = 0.5 * Math.sin(4 * Math.PI * t + rng() * Math.PI * 2);
      const harm3 = 0.25 * Math.sin(6 * Math.PI * t + rng() * Math.PI * 2);
      arr[i] = 0.6 * base + 0.3 * harm2 + 0.15 * harm3;
    }
    return arr;
  }

  /**
   * Core animation loop.  Fetches time domain data from the analyser when
   * available or falls back to a deterministic buffer.  Delegates drawing
   * duties to the appropriate function based on the selected shape.
   * @param {DOMHighResTimeStamp} timestamp
   */
  _draw(timestamp) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { shape, seed, preset, analyser, mode } = this._params;
    const pr = preset || {};
    const t = performance.now();
    // Compute colour based on the preset's colour speed.  Average amplitude
    // contribution is kept constant (0.5) to mirror the original behaviour.
    const avg = 0.5;
    const hue = ((t * (pr.colorSpeed || 0.1)) % 360 + 360) % 360;
    const sat = 70 + avg * 30;
    const light = 50 + avg * 20;
    ctx.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    // Determine the buffer to render.  Use live audio when available; otherwise
    // fall back to a deterministic seed buffer.
    let buf;
    if (mode === 'live' && analyser) {
      const length = analyser.fftSize || 2048;
      buf = new Float32Array(length);
      analyser.getFloatTimeDomainData(buf);
    } else {
      buf = this.makeSeedBuffer(shape, seed);
    }
    // Delegate to the appropriate drawing function.
    const fn = this.drawFuncs[shape] || this.drawFuncs.circle;
    fn.call(this, buf, t, pr);
    this._animationId = requestAnimationFrame(this._draw);
  }

  /**
   * A collection of parametric draw functions adapted from the original app.
   * Each function draws a different oscilloscope pattern based on the input
   * buffer, current time and preset.  They reference `this.ctx` and
   * `this.canvas` for drawing, so they must be bound to the component
   * instance.
   */
  drawFuncs = {
    circle(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.8 * canvas.width / 2;
      const c = canvas.width / 2;
      ctx.beginPath();
      for (let i = 0; i < data.length; ++i) {
        const a = (i / data.length) * 2 * Math.PI + t * 0.001;
        const amp = (data[i] + 1) / 2;
        const r = S * amp;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    },
    square(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.8 * canvas.width / Math.SQRT2;
      const c = canvas.width / 2;
      const o = (canvas.width - S) / 2;
      ctx.beginPath();
      for (let i = 0; i < data.length; ++i) {
        const p = i / data.length;
        const amp = (data[i] + 1) / 2;
        let x, y;
        if (p < 0.25) [x, y] = [o + S * (p / 0.25), o];
        else if (p < 0.5) [x, y] = [o + S, o + S * ((p - 0.25) / 0.25)];
        else if (p < 0.75) [x, y] = [o + S - S * ((p - 0.5) / 0.25), o + S];
        else [x, y] = [o, o + S - S * ((p - 0.75) / 0.25)];
        const dx = x - c;
        const dy = y - c;
        const fx = c + dx * (0.8 + 0.2 * amp) + Math.sin(t * 0.0005) * 10;
        const fy = c + dy * (0.8 + 0.2 * amp) + Math.cos(t * 0.0006) * 10;
        if (i) ctx.lineTo(fx, fy);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    },
    butterfly(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.4 * canvas.width;
      const c = canvas.width / 2;
      ctx.beginPath();
      for (let i = 0; i < data.length; ++i) {
        const th = (i / data.length) * Math.PI * 24 + t * 0.0003;
        const amp = (data[i] + 1) / 2;
        const scale = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
        const x = Math.sin(th) * scale * S * (0.5 + 0.5 * amp) + c;
        const y = Math.cos(th) * scale * S * (0.5 + 0.5 * amp) + c;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    },
    lissajous(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.8 * canvas.width / 3;
      const c = canvas.width / 2;
      // Average magnitude influences radial distance.  The original uses
      // absolute values only for amplitude modulation but here we keep it
      // simple.
      const avg = data.reduce((a, b) => a + Math.abs(b), 0) / data.length;
      const freqX = 3 + Math.sin(t * 0.0003) * 1.5;
      const freqY = 2 + Math.cos(t * 0.0004) * 1.5;
      const phase = t * 0.0005;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const theta = (i / data.length) * 2 * Math.PI;
        const r = avg * (0.5 + 0.5 * data[i]);
        const x = c + Math.sin(freqX * theta + phase) * S * r;
        const y = c + Math.sin(freqY * theta) * S * r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    },
    spiro(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.6 * canvas.width / 3;
      const c = canvas.width / 2;
      const inner = 0.3 + Math.sin(t * 0.0002) * 0.2;
      const outer = 0.7;
      const ratio = 0.21 + 0.02 * Math.sin(t * 0.0001);
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const theta = (i / data.length) * 2 * Math.PI;
        const waveAmp = (data[i] + 1) / 2;
        const x =
          c +
          (S * (outer - inner) * Math.cos(theta) +
            S * inner * Math.cos(((outer - inner) / inner) * theta + t * ratio)) *
            (0.8 + 0.2 * waveAmp);
        const y =
          c +
          (S * (outer - inner) * Math.sin(theta) -
            S * inner * Math.sin(((outer - inner) / inner) * theta + t * ratio)) *
            (0.8 + 0.2 * waveAmp);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    },
    harmonograph(data, t, pr) {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const S = 0.7 * canvas.width / 4;
      const c = canvas.width / 2;
      const decay = Math.exp(-t * 0.0002);
      const avg = (data.reduce((a, b) => a + b, 0) / data.length + 1) * 0.5;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const theta = (i / data.length) * 2 * Math.PI;
        const x =
          c +
          decay *
            S *
            (Math.sin(3 * theta + t * 0.0003) * 0.7 + Math.sin(5 * theta + t * 0.0004) * 0.3) *
            (0.5 + 0.5 * data[i]);
        const y =
          c +
          decay *
            S *
            (Math.sin(4 * theta + t * 0.00035) * 0.6 +
              Math.sin(6 * theta + t * 0.00025) * 0.4) *
            (0.5 + 0.5 * data[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    },
  };
}

customElements.define('scope-canvas', ScopeCanvas);