// Scope canvas for the third application.  It renders a rotating
// oscilloscope pattern that reacts to live audio and randomly
// generated presets.  The element accepts properties: `analyser`,
// `preset`, `shapeKey`, `isAudioStarted` and `isPlaying`.  When no
// analyser is present or the audio is stopped it falls back to a zero
// buffer.  An `onIndicatorUpdate` callback can be provided to update
// external UI elements.
class ScopeCanvas3 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._canvas = document.createElement('canvas');
    this._canvas.width = 600;
    this._canvas.height = 600;
    this._ctx = this._canvas.getContext('2d');
    this.shadowRoot.appendChild(this._canvas);
    // State
    this.analyser = null;
    this.preset = null;
    this.shapeKey = 'circle';
    this.isAudioStarted = false;
    this.isPlaying = false;
    this.onIndicatorUpdate = null;
    this._animId = null;
    // Animation state
    this._animationTime = 0;
    this._hueOffset = 0;
    // Bind animate
    this._animate = this._animate.bind(this);
    // Drawing functions (ported from original)
    this.drawFuncs = {
      circle: (data, params) => {
        const { baseTime, rotationOffset, scaleMod } = params;
        const S = 0.8 * this._canvas.width / 2 * scaleMod;
        const cx = 300, cy = 300;
        const t = baseTime * 0.5 + rotationOffset;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const a = (i / data.length) * 2 * Math.PI + t;
          const amp = (data[i] + 1) / 2;
          const r = S * amp;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      },
      square: (data, params) => {
        const { baseTime, rotationOffset, scaleMod } = params;
        const baseS = 0.8 * this._canvas.width / Math.SQRT2;
        const S = baseS * scaleMod;
        const c = 300;
        const o = (600 - S) / 2;
        const t = baseTime * 0.3 + rotationOffset;
        const cosT = Math.cos(t), sinT = Math.sin(t);
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
          const rx = c + (dx * cosT - dy * sinT);
          const ry = c + (dx * sinT + dy * cosT);
          const drx = rx - c;
          const dry = ry - c;
          const fx = c + drx * (0.8 + 0.2 * amp);
          const fy = c + dry * (0.8 + 0.2 * amp);
          if (i) ctx.lineTo(fx, fy); else ctx.moveTo(fx, fy);
        }
        ctx.closePath(); ctx.stroke();
      },
      butterfly: (data, params) => {
        const { baseTime, rotationOffset, scaleMod } = params;
        const baseS = 0.4 * this._canvas.width;
        const S = baseS * scaleMod;
        const cx = 300, cy = 300;
        const t = baseTime * 0.1 + rotationOffset;
        const cosT = Math.cos(t), sinT = Math.sin(t);
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const th = (i / data.length) * Math.PI * 24 * 2;
          const amp = (data[i] + 1) / 2;
          const scale = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
          let x = Math.sin(th) * scale;
          let y = Math.cos(th) * scale;
          x *= S * (0.3 + 0.7 * amp);
          y *= S * (0.3 + 0.7 * amp);
          const rx = x * cosT - y * sinT;
          const ry = x * sinT + y * cosT;
          x = rx + cx;
          y = ry + cy;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      },
      lissajous: (data, params) => {
        const { baseTime, rotationOffset, scaleMod } = params;
        const S = 0.4 * this._canvas.width * scaleMod;
        const cx = 300, cy = 300;
        const a_ratio = 1 + 0.1 * Math.sin(baseTime * 0.05);
        const b_ratio = 2 + 0.1 * Math.cos(baseTime * 0.07);
        const delta = rotationOffset * 0.5;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const tParam = (i / data.length) * Math.PI * 2 * 10;
          const amp = (data[i] + 1) / 2;
          const modAmp = 0.5 + 0.5 * amp;
          const x = cx + S * Math.sin(a_ratio * tParam + delta) * modAmp;
          const y = cy + S * Math.sin(b_ratio * tParam) * modAmp;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
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
  _animate() {
    const ctx = this._ctx;
    let data;
    if (this.isAudioStarted && this.isPlaying && this.analyser) {
      if (!this._buffer || this._buffer.length !== this.analyser.fftSize) {
        this._buffer = new Float32Array(this.analyser.fftSize);
      }
      this.analyser.getFloatTimeDomainData(this._buffer);
      data = this._buffer;
    } else {
      // fallback to zero buffer to draw a static shape
      if (!this._zeroBuffer) {
        this._zeroBuffer = new Float32Array(2048);
      }
      data = this._zeroBuffer;
    }
    const vis = this.preset?.visual || {};
    const baseRotSpeed = vis.baseRotationSpeed ?? 0.1;
    const scaleModDepth = vis.scaleModDepth ?? 0.1;
    const hueShiftSpeed = vis.hueShiftSpeed ?? 0.05;
    const lineWidth = vis.lineWidth ?? 2;
    const useAlpha = vis.useAlpha ?? false;
    this._animationTime += 0.016;
    this._hueOffset += hueShiftSpeed;
    // Compute average amplitude for scaling and brightness
    const avgAmp = data.reduce((sum, v) => sum + Math.abs(v), 0) / data.length;
    const brightness = 50 + avgAmp * 30;
    const hue = (this._hueOffset + performance.now() * 0.01) % 360;
    const alpha = useAlpha ? 0.7 : 1.0;
    ctx.clearRect(0, 0, 600, 600);
    ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = ctx.lineCap = 'round';
    const timeParams = {
      baseTime: performance.now() / 1000,
      rotationOffset: this._animationTime * baseRotSpeed,
      scaleMod: 1 + avgAmp * scaleModDepth
    };
    const draw = this.drawFuncs[this.shapeKey] || this.drawFuncs.circle;
    draw(data, timeParams);
    // Invoke indicator callback
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
customElements.define('scope-canvas', ScopeCanvas3);