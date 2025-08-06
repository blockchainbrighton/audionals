// This scope-canvas implements the oscilloscope visuals for the
// application.  It supports a different set of shapes and respects
// deterministic presets passed down from the orchestrator.  The
// properties `analyser`, `preset`, `shapeKey`, `mode`, `isAudioStarted` and
// `isPlaying` control its behaviour.  A callback `onIndicatorUpdate` can be
// supplied to update UI elements outside of the component.
class ScopeCanvas2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._canvas = document.createElement('canvas');
    // Fixed dimensions similar to the original – the canvas will be
    // sized square.  In the original the canvas resizes with the
    // viewport, but for simplicity we keep it constant here.
    this._canvas.width = 600;
    this._canvas.height = 600;
    this._ctx = this._canvas.getContext('2d');
    this.shadowRoot.appendChild(this._canvas);
    // State properties
    this.analyser = null;
    this.preset = null;
    this.shapeKey = 'circle';
    this.mode = 'seed';
    this.isAudioStarted = false;
    this.isPlaying = false;
    this.onIndicatorUpdate = null;
    this._dummyData = null;
    this._liveBuffer = null;
    this._animId = null;
    // Bind animation method
    this._animate = this._animate.bind(this);
    // Set up drawing functions ported from the original implementation.
    this.drawFuncs = {
      circle: (data, t, pr) => {
        const cw = this._canvas.width;
        const S = 0.8 * cw / 2;
        const c = cw / 2;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const a = (i / data.length) * 2 * Math.PI + t * 0.001;
          const amp = (data[i] + 1) / 2;
          const r = S * amp;
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      },
      square: (data, t, pr) => {
        const cw = this._canvas.width;
        const S = 0.8 * cw / Math.SQRT2;
        const c = cw / 2;
        const o = (cw - S) / 2;
        const ctx = this._ctx;
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
          if (i) ctx.lineTo(fx, fy); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      },
      butterfly: (data, t, pr) => {
        const cw = this._canvas.width;
        const S = 0.4 * cw;
        const c = cw / 2;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const th = (i / data.length) * Math.PI * 24 + t * 0.0003;
          const amp = (data[i] + 1) / 2;
          const scale = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
          const x = Math.sin(th) * scale * S * (0.5 + 0.5 * amp) + c;
          const y = Math.cos(th) * scale * S * (0.5 + 0.5 * amp) + c;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      },
      lissajous: (data, t, pr) => {
        const cw = this._canvas.width;
        const S = 0.8 * cw / 3;
        const c = cw / 2;
        const avg = data.reduce((a, b) => a + Math.abs(b), 0) / data.length;
        const freqX = 3 + Math.sin(t * 0.0003) * 1.5;
        const freqY = 2 + Math.cos(t * 0.0004) * 1.5;
        const phase = t * 0.0005;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const theta = (i / data.length) * 2 * Math.PI;
          const r = avg * (0.5 + 0.5 * data[i]);
          const x = c + Math.sin(freqX * theta + phase) * S * r;
          const y = c + Math.sin(freqY * theta) * S * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      },
      spiro: (data, t, pr) => {
        const cw = this._canvas.width;
        const S = 0.6 * cw / 3;
        const c = cw / 2;
        const inner = 0.3 + Math.sin(t * 0.0002) * 0.2;
        const outer = 0.7;
        const ratio = 0.21 + 0.02 * Math.sin(t * 0.0001);
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const theta = (i / data.length) * 2 * Math.PI;
          const waveAmp = (data[i] + 1) / 2;
          const x = c + (S * (outer - inner) * Math.cos(theta) + S * inner * Math.cos((outer - inner) / inner * theta + t * ratio)) * (0.8 + 0.2 * waveAmp);
          const y = c + (S * (outer - inner) * Math.sin(theta) - S * inner * Math.sin((outer - inner) / inner * theta + t * ratio)) * (0.8 + 0.2 * waveAmp);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      },
      harmonograph: (data, t, pr) => {
        const cw = this._canvas.width, S = 1.3 * cw / 2.6, c = cw / 2;
        const decay = Math.exp(-t * 0.0002);
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const theta = (i / data.length) * 2 * Math.PI;
          const spike = 1 + 0.8 * Math.abs(data[i]);
          const x = c + decay * S * ((Math.sin(3 * theta + t * 0.0003) * 0.7 + Math.sin(5 * theta + t * 0.0004) * 0.3)) * spike;
          const y = c + decay * S * ((Math.sin(4 * theta + t * 0.00035) * 0.6 + Math.sin(6 * theta + t * 0.00025) * 0.4)) * spike;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      },
      
      

  connectedCallback() {
    if (!this._animId) this._animate();
  }

  disconnectedCallback() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  // Generate the dummy seed buffer used when no audio analyser is present.
  _makeSeedBuffer(shape, seed, len = 2048) {
    // A simple deterministic PRNG seeded by the seed string and shape
    const mulberry32 = (a) => {
      return () => {
        a |= 0;
        a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    };
    const h = seed + '_' + shape;
    let a = 0;
    for (let i = 0; i < h.length; i++) a = (a << 5) - a + h.charCodeAt(i);
    const rng = mulberry32(a);
    const arr = new Float32Array(len);
    for (let i = 0; i < len; ++i) {
      const t = i / len;
      const base = Math.sin(2 * Math.PI * t + rng() * 6.28);
      const harm2 = 0.5 * Math.sin(4 * Math.PI * t + rng() * 6.28);
      const harm3 = 0.25 * Math.sin(6 * Math.PI * t + rng() * 6.28);
      arr[i] = 0.6 * base + 0.3 * harm2 + 0.15 * harm3;
    }
    return arr;
  }

  // Main render loop: fetch data, determine colour, draw shape and
  // schedule the next frame.  The preset's colourSpeed controls hue
  // animation.
  _animate() {
    const ctx = this._ctx;
    const now = performance.now();
    let data;
    if (this.isAudioStarted && this.isPlaying && this.analyser) {
      // When audio is playing copy the live time‑domain data into a
      // buffer for drawing.
      if (!this._liveBuffer || this._liveBuffer.length !== this.analyser.fftSize) {
        this._liveBuffer = new Float32Array(this.analyser.fftSize);
      }
      this.analyser.getFloatTimeDomainData(this._liveBuffer);
      data = this._liveBuffer;
    } else {
      // In seed mode we draw the deterministic seed buffer to give the
      // appearance of motion before audio starts.  Use a cached buffer
      // keyed off of the shape and seed contained in the preset if
      // provided.  Otherwise fall back to a simple default sine mix.
      if (this.preset && this.mode === 'seed' && this.preset._seedBuffer) {
        data = this.preset._seedBuffer;
      } else if (this.preset && this.mode === 'seed') {
        // Generate and cache seed buffer
        const seed = this.preset?.seed || 'default';
        const buf = this._makeSeedBuffer(this.shapeKey || 'circle', seed);
        this.preset._seedBuffer = buf;
        data = buf;
      } else {
        if (!this._dummyData) {
          const len = 2048;
          const arr = new Float32Array(len);
          for (let i = 0; i < len; i++) {
            const t = i / len;
            arr[i] = 0.5 * Math.sin(2 * Math.PI * t) + 0.3 * Math.sin(4 * Math.PI * t + Math.PI / 3);
          }
          this._dummyData = arr;
        }
        data = this._dummyData;
      }
    }
    // Determine colour based on preset parameters.  If no preset
    // specified fall back to a sensible default.
    const pr = this.preset || {};
    const colorSpeed = pr.colorSpeed || 0.06;
    const hue = (now * colorSpeed) % 360;
    const sat = 70 + 15;
    const light = 50 + 10;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    ctx.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    // Select appropriate drawing function.
    const draw = this.drawFuncs[this.shapeKey] || this.drawFuncs.circle;
    draw(data, now, pr);
    // Invoke indicator callback if provided.  The second app does not
    // distinguish muted state via indicator, but we still call the
    // callback for consistency.
    if (typeof this.onIndicatorUpdate === 'function') {
      let text;
      let audioActive;
      if (this.isAudioStarted) {
        text = this.isPlaying ? 'Audio Live' : 'Muted';
        audioActive = this.isPlaying;
      } else {
        text = 'Silent Mode';
        audioActive = false;
      }
      this.onIndicatorUpdate(text, audioActive);
    }
    this._animId = requestAnimationFrame(this._animate);
  }
}

customElements.define('scope-canvas', ScopeCanvas2);