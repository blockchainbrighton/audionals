// <scope-canvas> is responsible for drawing oscilloscope visuals.  It owns its
// own Shadow DOM and keeps an internal animation loop.  External state such as
// the analyser node, current shape and visual parameters are passed via
// properties on the element.  A callback can be provided via the
// `onIndicatorUpdate` property which will be invoked each frame with the
// current status text ("Audio Live", "Muted" or "Silent Mode") and a
// boolean flag indicating whether audio is currently active.
class ModeACanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Create canvas and prepare drawing context.  Fixed dimensions are used
    // because the original application draws into a 600×600 region.
    this._canvas = document.createElement('canvas');
    this._canvas.width = 600;
    this._canvas.height = 600;
    this._ctx = this._canvas.getContext('2d');
    this.shadowRoot.appendChild(this._canvas);
    // Internal state
    this.analyser = null;
    this.shapeKey = 'circle';
    this.visualParams = {};
    this.isAudioStarted = false;
    this.isPlaying = false;
    this.onIndicatorUpdate = null;
    this._dummyData = null;
    this._liveBuffer = null;
    this._animId = null;
    // Define drawing functions for supported shapes.  These functions are
    // ported directly from the original application and accept the data
    // buffer, current time (in seconds) and the visual parameter object.
    this.baseShapes = {
      circle: {
        name: 'Circle',
        draw: (d, t, p) => {
          const S = p.size * 300;
          const c = 300;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const a = (i / d.length) * 2 * Math.PI;
            const amp = (d[i] + 1) / 2;
            const r = S * amp;
            const modA = a + t * (p.rotationSpeed ?? 0.05);
            const x = c + Math.cos(modA) * r;
            const y = c + Math.sin(modA) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      },
      square: {
        name: 'Square',
        draw: (d, t, p) => {
          const S = p.size * 424.26;
          const c = 300;
          const o = (600 - S) / 2;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const q = i / d.length;
            const amp = (d[i] + 1) / 2;
            let x, y;
            if (q < 0.25) {
              [x, y] = [o + S * (q / 0.25), o];
            } else if (q < 0.5) {
              [x, y] = [o + S, o + S * ((q - 0.25) / 0.25)];
            } else if (q < 0.75) {
              [x, y] = [o + S - S * ((q - 0.5) / 0.25), o + S];
            } else {
              [x, y] = [o, o + S - S * ((q - 0.75) / 0.25)];
            }
            const dx = x - c;
            const dy = y - c;
            const scale = 0.8 + 0.2 * amp + 0.1 * Math.sin(t * (p.pulseSpeed ?? 0.2));
            const fx = c + dx * scale;
            const fy = c + dy * scale;
            if (i) ctx.lineTo(fx, fy); else ctx.moveTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      },
      butterfly: {
        name: 'Butterfly',
        draw: (d, t, p) => {
          const S = p.size * 240;
          const c = 300;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const th = (i / d.length) * Math.PI * 24;
            const amp = (d[i] + 1) / 2;
            const scale = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
            let x = Math.sin(th) * scale * S * (0.5 + 0.5 * amp);
            let y = Math.cos(th) * scale * S * (0.5 + 0.5 * amp);
            const a = t * (p.rotationSpeed ?? 0.05);
            const nx = x * Math.cos(a) - y * Math.sin(a);
            const ny = x * Math.cos(a) + y * Math.sin(a);
            if (i) ctx.lineTo(nx + c, ny + c); else ctx.moveTo(nx + c, ny + c);
          }
          ctx.closePath();
          ctx.stroke();
        }
      },
      lissajous: {
        name: 'Lissajous',
        draw: (d, t, p) => {
          const S = p.size * 270;
          const c = 300;
          const a = p.lissaA || 3;
          const b = p.lissaB || 2;
          const dlt = p.lissaDelta || 0;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const prog = i / d.length;
            const amp = (d[i] + 1) / 2;
            const modT = t * (p.rotationSpeed ?? 0.05);
            const x = S * Math.sin(a * modT + prog * 2 * Math.PI + dlt) * amp;
            const y = S * Math.sin(b * modT + prog * 2 * Math.PI) * amp;
            if (i) ctx.lineTo(x + c, y + c); else ctx.moveTo(x + c, y + c);
          }
          ctx.stroke();
        }
      },
      spiral: {
        name: 'Spiral',
        draw: (d, t, p) => {
          const S = p.size * 270;
          const c = 300;
          const turns = p.spiralTurns || 5;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const prog = i / d.length;
            const amp = (d[i] + 1) / 2;
            const a = prog * 2 * Math.PI * turns + t * (p.rotationSpeed ?? 0.05);
            const r = S * prog * amp;
            const x = c + Math.cos(a) * r;
            const y = c + Math.sin(a) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      },
      rose: {
        name: 'Rose',
        draw: (d, t, p) => {
          const S = p.size * 270;
          const c = 300;
          const k = p.roseK || 3;
          const ctx = this._ctx;
          ctx.beginPath();
          for (let i = 0; i < d.length; ++i) {
            const prog = i / d.length;
            const amp = (d[i] + 1) / 2;
            const a = prog * 2 * Math.PI + t * (p.rotationSpeed ?? 0.05);
            const r = S * Math.cos(k * a) * amp;
            const x = c + Math.cos(a) * r;
            const y = c + Math.sin(a) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    };
    // Default visual parameters used when none are provided.
    this.defaultVisual = {
      hueBase: 200,
      hueRange: 100,
      lineWidth: 2,
      rotationSpeed: 0.05,
      pulseSpeed: 0.2,
      size: 0.8,
      useGlow: true
    };
    // Bind the animation loop so that `this` remains the class instance.
    this._animate = this._animate.bind(this);
  }

  connectedCallback() {
    // Begin the animation loop immediately upon insertion into the DOM.
    if (!this._animId) {
      this._animate();
    }
  }

  disconnectedCallback() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  // Generate a deterministic dummy buffer once.  When audio isn't
  // available the dummy buffer produces a pleasing composite waveform.
  _generateDummyData() {
    const len = 2048;
    const d = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = 0.4 * Math.sin(t * 6 * Math.PI) +
              0.3 * Math.sin(t * 14 * Math.PI + Math.PI / 3) +
              0.2 * Math.sin(t * 22 * Math.PI + Math.PI / 6) +
              0.1 * Math.sin(t * 34 * Math.PI);
    }
    return d;
  }

  // Animation loop: fetches a buffer from the analyser when playing or
  // falls back to dummy data, computes stroke styles and invokes the
  // shape drawing routine.  After drawing the frame the indicator
  // callback is invoked if provided.
  _animate() {
    const ctx = this._ctx;
    const time = performance.now() / 1000;
    let data;
    if (this.isAudioStarted && this.isPlaying && this.analyser) {
      // Live audio data
      if (!this._liveBuffer || this._liveBuffer.length !== this.analyser.fftSize) {
        this._liveBuffer = new Float32Array(this.analyser.fftSize);
      }
      this.analyser.getFloatTimeDomainData(this._liveBuffer);
      data = this._liveBuffer;
    } else {
      // Static dummy waveform
      if (!this._dummyData) {
        this._dummyData = this._generateDummyData();
      }
      data = this._dummyData;
    }
    const p = this.visualParams || this.defaultVisual;
    const shapeKey = this.shapeKey || 'circle';
    const shape = this.baseShapes[shapeKey];
    // Clear previous frame
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    // Compute hue, saturation and lightness.  The hue drifts with
    // time while saturation and lightness oscillate to provide the
    // shimmering look of the original app.
    const hue = ((p.hueBase ?? 200) + time * 15) % 360;
    const sat = 80 + 15 * Math.sin(time * 0.4);
    const light = 50 + 25 * Math.sin(time * 0.25);
    ctx.strokeStyle = `hsl(${hue},${sat}%,${light}%)`;
    ctx.lineWidth = p.lineWidth ?? 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.shadowBlur = p.useGlow ? 12 : 0;
    ctx.shadowColor = ctx.strokeStyle;
    // Draw the selected shape.
    if (shape && typeof shape.draw === 'function') {
      shape.draw(data, time, p);
    }
    // Update visual indicator via callback if supplied.
    if (typeof this.onIndicatorUpdate === 'function') {
      let text;
      let audioActive;
      if (this.isAudioStarted) {
        if (this.isPlaying) {
          text = 'Audio Live';
          audioActive = true;
        } else {
          text = 'Muted';
          audioActive = false;
        }
      } else {
        text = 'Silent Mode';
        audioActive = false;
      }
      this.onIndicatorUpdate(text, audioActive);
    }
    // Queue the next frame.
    this._animId = requestAnimationFrame(this._animate);
  }
}

customElements.define('mode-a-canvas', ModeACanvas);