// <scope-canvas> renders the oscilloscope visuals. It exposes a
// programmatic API: call `start(analyser, visualParams)` with a Web
// Audio AnalyserNode and a set of visual parameters to begin drawing,
// and `stop()` to halt the animation and clear the canvas. All
// drawing logic lives inside this component, isolated from the rest of
// the application.
class ModeBCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._analyser = null;
    this._visualParams = null;
    this._animId = null;
    this._particles = [];
    this._render();
  }

  _render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = `
      canvas {
        width: 600px;
        height: 600px;
        border-radius: 12px;
        border: 1px solid #444;
        background: #000;
        box-shadow: 0 0 20px rgba(100, 100, 255, 0.1);
        display: block;
      }
    `;
    shadow.appendChild(style);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 600;
    this.canvas.height = 600;
    shadow.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Start drawing using the supplied analyser and visual parameters. Any
   * existing animation loop is cancelled beforehand. If either
   * parameter is missing the call is ignored.
   * @param {AnalyserNode} analyser
   * @param {Object} visualParams
   */
  start(analyser, visualParams) {
    if (!analyser || !visualParams) return;
    this.stop();
    this._analyser = analyser;
    this._visualParams = visualParams;
    this._animate();
  }

  /**
   * Stop the current animation and clear the canvas. Resets internal
   * state to allow reuse.
   */
  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this._analyser = null;
    this._visualParams = null;
    this._particles = [];
  }

  /**
   * The animation loop. It pulls data from the analyser, applies
   * time-based LFOs and delegates shape rendering to one of the draw
   * functions based on the current mode. The loop continues until
   * stop() is called.
   */
  _animate = () => {
    const ana = this._analyser;
    const v = this._visualParams;
    if (!ana || !v) return;
    const buf = new Float32Array(ana.fftSize);
    ana.getFloatTimeDomainData(buf);
    const now = performance.now();
    // Clear background
    this.ctx.fillStyle = v.bgColor || '#111';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Compute rotation and hue shift from visual LFOs.
    let rotation = 0;
    let hueShift = 0;
    (v.visualLFOs || []).forEach(lfo => {
      const val = Math.sin(now * lfo.rate + lfo.phase);
      if (lfo.type === 'rotation') rotation = val * lfo.depth;
      if (lfo.type === 'hueShift') hueShift = val * lfo.depth;
    });
    // Base colour handling
    const baseColor = v.palette[0];
    const baseHue = this._parseHue(baseColor);
    const shiftedHue = (baseHue + hueShift + 360) % 360;
    this.ctx.strokeStyle = `hsla(${shiftedHue},90%,65%,0.9)`;
    this.ctx.fillStyle = `hsla(${shiftedHue},90%,65%,0.7)`;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    // Apply global rotation
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(rotation);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    // Select drawing routine
    const func = this._drawFuncs[v.baseShape] || this._drawFuncs.radial;
    func.call(this, buf, now / 1000, v);
    this.ctx.restore();
    // Schedule next frame
    this._animId = requestAnimationFrame(this._animate);
  };

  /**
   * Extracts the hue channel from an hsl/hsla colour string. Falls back
   * to 0 if parsing fails.
   * @param {string} c
   * @returns {number}
   */
  _parseHue(c) {
    const m = /hsla?\(([^,]+)/.exec(c);
    return m ? parseFloat(m[1]) : 0;
  }

  /**
   * Collection of shape drawing functions ported from the original
   * implementation. Each function operates in the context of this
   * component (using its canvas and particles array).
   */
  _drawFuncs = {
    radial(data, t, p) {
      const S = 0.4 * this.canvas.width;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const angStep = (2 * Math.PI) / p.symmetry;
      const rotRate = (p.visualLFOs?.[0]?.rate || 0.005) * t;
      for (let s = 0; s < p.symmetry; s++) {
        this.ctx.save();
        this.ctx.rotate(s * angStep + rotRate);
        this.ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const a = (i / data.length) * 2 * Math.PI;
          const amp = (data[i] + 1) / 2;
          const r = S * (0.5 + 0.5 * amp);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    },
    polygon(data, t, p) {
      const S = 0.4 * this.canvas.width;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const angStep = (2 * Math.PI) / p.symmetry;
      const rotRate = (p.visualLFOs?.[0]?.rate || 0.005) * t;
      for (let s = 0; s < p.symmetry; s++) {
        this.ctx.save();
        this.ctx.rotate(s * angStep + rotRate);
        this.ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const q = i / data.length;
          const amp = (data[i] + 1) / 2;
          const sideIdx = Math.floor(q * p.polygonSides);
          const sideProg = (q * p.polygonSides) % 1;
          const a1 = (sideIdx / p.polygonSides) * 2 * Math.PI;
          const a2 = ((sideIdx + 1) / p.polygonSides) * 2 * Math.PI;
          const x1 = Math.cos(a1) * S;
          const y1 = Math.sin(a1) * S;
          const x2 = Math.cos(a2) * S;
          const y2 = Math.sin(a2) * S;
          const x = x1 + (x2 - x1) * sideProg;
          const y = y1 + (y2 - y1) * sideProg;
          const len = Math.hypot(x, y);
          const modLen = len * (0.7 + 0.3 * amp);
          const fx = cx + (x / len) * modLen;
          const fy = cy + (y / len) * modLen;
          i ? this.ctx.lineTo(fx, fy) : this.ctx.moveTo(fx, fy);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    },
    layers(data, t, p) {
      const layers = 3;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const baseSize = 0.4 * this.canvas.width;
      for (let l = 0; l < layers; l++) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.7 - l * 0.2;
        this.ctx.rotate((p.visualLFOs?.[0]?.rate || 0.005) * t * (1 + l * 0.3) + l * 0.05);
        this.ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const a = (i / data.length) * 2 * Math.PI;
          const amp = (data[(i + 100 * l) % data.length] + 1) / 2;
          const r = baseSize * (1 - l * 0.15) * (0.8 + 0.2 * amp);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    },
    particles(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const baseRadius = 0.4 * this.canvas.width;
      // Initialise particle pool if necessary or if count changed.
      if (!this._particles || this._particles.length !== p.particleCount) {
        this._particles = Array.from({ length: p.particleCount }, (_, i) => ({
          angle: (i / p.particleCount) * 2 * Math.PI,
          radius: baseRadius,
          speed: Math.random() * (0.01 - 0.001) + 0.001,
          life: Math.random() * 1000,
          size: p.particleSize * (Math.random() * (1.5 - 0.5) + 0.5)
        }));
      }
      const rotRate = (p.visualLFOs?.[0]?.rate || 0.002) * t;
      this._particles.forEach(pt => {
        pt.life += 0.01;
        const idx = Math.floor((pt.angle / (2 * Math.PI)) * data.length) % data.length;
        const amp = (data[idx] + 1) / 2;
        pt.radius = baseRadius * (0.8 + 0.4 * amp);
        pt.angle += pt.speed;
        const ang = pt.angle + rotRate;
        const x = cx + Math.cos(ang) * pt.radius;
        const y = cy + Math.sin(ang) * pt.radius;
        this.ctx.beginPath();
        this.ctx.arc(x, y, pt.size, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }
  };
}

customElements.define('mode-b-canvas', ModeBCanvas);