// Unified oscilloscope canvas
//
// This custom element renders all of the visual shapes from the
// preceding oscilloscope implementations.  It accepts properties for
// the audio analyser, the current preset (containing visual
// parameters), the active shape, and flags indicating whether audio
// has started and is currently playing.  The drawing routines for each
// supported shape are lifted from the original projects and adapted
// into a common API.  The animation loop runs continuously once the
// element is connected and stops when disconnected.

class ScopeCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Create the canvas.  A fixed 600×600 area is used to match the
    // original dimensions across all versions.  The element itself can
    // scale via CSS transforms in the host, but internally coordinates
    // remain consistent.
    this._canvas = document.createElement('canvas');
    this._canvas.width = 600;
    this._canvas.height = 600;
    this._ctx = this._canvas.getContext('2d');
    // Shadow DOM only contains the canvas.  Styles such as border,
    // radius or box shadow can be applied outside this component.
    this.shadowRoot.appendChild(this._canvas);
    // Public properties (assigned by osc-app)
    this.analyser = null;
    this.preset = null;
    this.shapeKey = 'circle';
    this.isAudioStarted = false;
    this.isPlaying = false;
    this.onIndicatorUpdate = null;
    // Internal buffers
    this._buffer = null;
    this._dummyData = null;
    this._zeroData = new Float32Array(2048);
    this._animId = null;
    // Bind animation loop
    this._animate = this._animate.bind(this);
    // Drawing functions for all supported shapes.  Each function
    // receives the audio data array, the current time in seconds and
    // the visual parameter object.  They draw directly onto
    // this._ctx and should not call ctx.save/restore except for
    // temporary transformations.
    const ctx = this._ctx;
    const canvas = this._canvas;
    this.drawFuncs = {
      // Classic circle oscilloscope.  Adapted from V1.  The size,
      // rotationSpeed and stroke modulation parameters come from p.
      circle: (data, t, p) => {
        const S = (p.size ?? 0.8) * 300;
        const c = 300;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const a = (i / data.length) * 2 * Math.PI;
          const amp = (data[i] + 1) / 2;
          const r = S * amp;
          const modA = a + t * (p.rotationSpeed ?? 0.05);
          const x = c + Math.cos(modA) * r;
          const y = c + Math.sin(modA) * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      },
      // Square shape from V1.  Pulses along the edges based on
      // p.pulseSpeed and p.size.  Rotation is achieved by varying the
      // phase on each loop.
      square: (data, t, p) => {
        const S = (p.size ?? 0.8) * 600 / Math.SQRT2;
        const c = 300;
        const o = (600 - S) / 2;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const q = i / data.length;
          const amp = (data[i] + 1) / 2;
          let x, y;
          if (q < 0.25) {
            x = o + S * (q / 0.25);
            y = o;
          } else if (q < 0.5) {
            x = o + S;
            y = o + S * ((q - 0.25) / 0.25);
          } else if (q < 0.75) {
            x = o + S - S * ((q - 0.5) / 0.25);
            y = o + S;
          } else {
            x = o;
            y = o + S - S * ((q - 0.75) / 0.25);
          }
          const dx = x - c;
          const dy = y - c;
          // Pulse edges based on amplitude and optional pulsing speed
          const scale = 0.8 + 0.2 * amp + 0.1 * Math.sin(t * (p.pulseSpeed ?? 0.2));
          const fx = c + dx * scale;
          const fy = c + dy * scale;
          if (i) ctx.lineTo(fx, fy); else ctx.moveTo(fx, fy);
        }
        ctx.closePath();
        ctx.stroke();
      },
      // Butterfly curve from V1.  Draws a parametric butterfly shape
      // modulated by the input data.  Rotation speed set via p.rotationSpeed.
      butterfly: (data, t, p) => {
        const S = (p.size ?? 0.8) * 240;
        const c = 300;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const th = (i / data.length) * Math.PI * 24;
          const amp = (data[i] + 1) / 2;
          const scale = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin(th / 12), 5);
          let x = Math.sin(th) * scale * S * (0.5 + 0.5 * amp);
          let y = Math.cos(th) * scale * S * (0.5 + 0.5 * amp);
          const a = t * (p.rotationSpeed ?? 0.05);
          const nx = x * Math.cos(a) - y * Math.sin(a);
          const ny = x * Math.sin(a) + y * Math.cos(a);
          if (i) ctx.lineTo(nx + c, ny + c); else ctx.moveTo(nx + c, ny + c);
        }
        ctx.closePath();
        ctx.stroke();
      },
      // Lissajous figure from V1.  Uses parameters a, b and delta.
      lissajous: (data, t, p) => {
        const S = (p.size ?? 0.8) * 270;
        const c = 300;
        const a = p.lissaA || 3;
        const b = p.lissaB || 2;
        const dlt = p.lissaDelta || 0;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const prog = i / data.length;
          const amp = (data[i] + 1) / 2;
          const modT = t * (p.rotationSpeed ?? 0.05);
          const x = S * Math.sin(a * modT + prog * 2 * Math.PI + dlt) * amp;
          const y = S * Math.sin(b * modT + prog * 2 * Math.PI) * amp;
          if (i) ctx.lineTo(x + c, y + c); else ctx.moveTo(x + c, y + c);
        }
        ctx.stroke();
      },
      // Spiral shape from V1.  Draws an expanding spiral modulated by
      // audio amplitude.  Parameter turns sets number of rotations.
      spiral: (data, t, p) => {
        const S = (p.size ?? 0.8) * 270;
        const c = 300;
        const turns = p.spiralTurns || 5;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const prog = i / data.length;
          const amp = (data[i] + 1) / 2;
          const a = prog * 2 * Math.PI * turns + t * (p.rotationSpeed ?? 0.05);
          const r = S * prog * amp;
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      },
      // Rose curve from V1.  Parameter k sets number of petals.
      rose: (data, t, p) => {
        const S = (p.size ?? 0.8) * 270;
        const c = 300;
        const k = p.roseK || 3;
        ctx.beginPath();
        for (let i = 0; i < data.length; ++i) {
          const prog = i / data.length;
          const amp = (data[i] + 1) / 2;
          const a = prog * 2 * Math.PI + t * (p.rotationSpeed ?? 0.05);
          const r = S * Math.cos(k * a) * amp;
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      },
      // Radial waves from V2.  Rotates multiple symmetric instances of the
      // waveform around the centre.  p.symmetry controls how many
      // repetitions.  p.visualLFOs can contain rotation LFOs.
      radial: (data, t, p) => {
        const S = 0.4 * canvas.width;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const symmetry = p.symmetry || 6;
        const angStep = (2 * Math.PI) / symmetry;
        // Use the first LFO of type rotation if provided for extra twist
        let rotRate = 0;
        if (p.visualLFOs) {
          for (const lfo of p.visualLFOs) {
            if (lfo.type === 'rotation') {
              rotRate = lfo.depth * Math.sin(t * lfo.rate + (lfo.phase || 0));
              break;
            }
          }
        }
        for (let s = 0; s < symmetry; s++) {
          ctx.save();
          ctx.rotate(s * angStep + rotRate);
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const a = (i / data.length) * 2 * Math.PI;
            const amp = (data[i] + 1) / 2;
            const r = S * (0.5 + 0.5 * amp);
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      },
      // Polygon shape from V2.  Walks along the edges of a regular
      // polygon.  p.symmetry defines how many rotated copies, and
      // p.polygonSides sets the number of sides.
      polygon: (data, t, p) => {
        const S = 0.4 * canvas.width;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const symmetry = p.symmetry || 3;
        const sides = p.polygonSides || 6;
        const angStep = (2 * Math.PI) / symmetry;
        for (let s = 0; s < symmetry; s++) {
          ctx.save();
          ctx.rotate(s * angStep + (p.rotationSpeed ?? 0) * t);
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const q = i / data.length;
            const amp = (data[i] + 1) / 2;
            const sideIdx = Math.floor(q * sides);
            const sideProg = (q * sides) % 1;
            const a1 = (sideIdx / sides) * 2 * Math.PI;
            const a2 = ((sideIdx + 1) / sides) * 2 * Math.PI;
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
            if (i) ctx.lineTo(fx, fy); else ctx.moveTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      },
      // Layered interference shape from V2.  Draws several concentric
      // shapes with slight phase offsets.  p.visualLFOs may introduce
      // rotation modulation.
      layers: (data, t, p) => {
        const layers = 3;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const baseSize = 0.4 * canvas.width;
        for (let l = 0; l < layers; l++) {
          ctx.save();
          ctx.globalAlpha = 0.7 - l * 0.2;
          // Slightly different rotation speed per layer
          ctx.rotate((p.rotationSpeed ?? 0.005) * t * (1 + l * 0.3) + l * 0.05);
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const a = (i / data.length) * 2 * Math.PI;
            const amp = (data[(i + 100 * l) % data.length] + 1) / 2;
            const r = baseSize * (1 - l * 0.15) * (0.8 + 0.2 * amp);
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      },
      // Particle flow from V2.  Emits particles around a circle whose
      // radial distance is modulated by the waveform.  p.particleCount
      // controls the number of particles and p.particleSize their size.
      particles: (data, t, p) => {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const baseRadius = 0.4 * canvas.width;
        // Initialise particle pool on first call or when count changes
        if (!this._particles || this._particles.length !== (p.particleCount || 100)) {
          this._particles = Array.from({ length: p.particleCount || 100 }, (_, i) => ({
            angle: (i / (p.particleCount || 100)) * 2 * Math.PI,
            radius: baseRadius,
            speed: Math.random() * (0.02 - 0.002) + 0.002,
            life: Math.random() * 1000,
            size: (p.particleSize || 2) * (Math.random() * 1 + 0.5)
          }));
        }
        // Rotation modulation from LFO
        let rotRate = 0;
        if (p.visualLFOs) {
          for (const lfo of p.visualLFOs) {
            if (lfo.type === 'rotation') {
              rotRate = lfo.depth * Math.sin(t * lfo.rate + (lfo.phase || 0));
              break;
            }
          }
        }
        this._particles.forEach(pt => {
          pt.life += 0.01;
          const idx = Math.floor((pt.angle / (2 * Math.PI)) * data.length) % data.length;
          const amp = (data[idx] + 1) / 2;
          pt.radius = baseRadius * (0.8 + 0.4 * amp);
          pt.angle += pt.speed;
          const ang = pt.angle + rotRate;
          const x = cx + Math.cos(ang) * pt.radius;
          const y = cy + Math.sin(ang) * pt.radius;
          ctx.beginPath();
          ctx.arc(x, y, pt.size, 0, 2 * Math.PI);
          ctx.fill();
        });
      },
      // Spirograph from V3.  Uses two radii to create hypotrochoid
      // shapes.  Modulates amplitude and radii with audio.
      spiro: (data, t, p) => {
        const cw = canvas.width;
        const S = 0.6 * cw / 3;
        const c = cw / 2;
        const inner = 0.3 + Math.sin(t * 0.2) * 0.2;
        const outer = 0.7;
        const ratio = 0.21 + 0.02 * Math.sin(t * 0.1);
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
      // Harmonograph from V3.  Combines multiple sine waves with
      // exponential decay to produce intricate patterns.  The preset
      // controls colour animation but not shape parameters.
      harmonograph: (data, t, p) => {
        const cw = canvas.width;
        const S = 0.7 * cw / 4;
        const c = cw / 2;
        const decay = Math.exp(-t * 0.2);
        const avg = data.reduce((a, b) => a + Math.abs(b), 0) / data.length;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const theta = (i / data.length) * 2 * Math.PI;
          const x = c + decay * S * ((Math.sin(3 * theta + t * 0.3) * 0.7 + Math.sin(5 * theta + t * 0.4) * 0.3)) * (0.5 + 0.5 * data[i]);
          const y = c + decay * S * ((Math.sin(4 * theta + t * 0.35) * 0.6 + Math.sin(6 * theta + t * 0.25) * 0.4)) * (0.5 + 0.5 * data[i]);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    };
  }

  connectedCallback() {
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

  // Generate a deterministic dummy buffer mixing sine waves.  Used
  // whenever audio isn't playing to keep the visuals lively.
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

  // Main animation loop.  Fetches audio data or dummy data, chooses
  // colours and draws the selected shape.  Also invokes the indicator
  // callback to allow the host to update status messages.
  _animate() {
    const ctx = this._ctx;
    const now = performance.now();
    let data;
    if (this.isAudioStarted && this.isPlaying && this.analyser) {
      // Acquire live audio data from the analyser.  Resize the buffer
      // when necessary to match the FFT size.
      if (!this._buffer || this._buffer.length !== this.analyser.fftSize) {
        this._buffer = new Float32Array(this.analyser.fftSize);
      }
      this.analyser.getFloatTimeDomainData(this._buffer);
      data = this._buffer;
    } else if (this.preset && this.preset._seedBuffer) {
      // Deterministic seed buffer (set by osc-app)
      data = this.preset._seedBuffer;
    } else {
      // Fallback to a dummy waveform
      if (!this._dummyData) {
        this._dummyData = this._generateDummyData();
      }
      data = this._dummyData;
    }
    const visual = this.preset?.visual || {};
    // Compute colour.  Hue drifts based on either colorSpeed or
    // hueShiftSpeed; fallback to a default drift.
    const hueBase = visual.hueBase ?? 200;
    const colorSpeed = visual.colorSpeed ?? (visual.hueShiftSpeed ?? 0.06);
    const hue = (hueBase + (now * 0.001 * colorSpeed * 360)) % 360;
    // Lightness modulated by average amplitude of the waveform to give
    // brighter strokes when the signal is loud.
    let avgAmp = 0;
    for (let i = 0; i < data.length; i++) avgAmp += Math.abs(data[i]);
    avgAmp /= data.length;
    const brightness = 40 + avgAmp * 40;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    // Choose stroke colour.  Some shapes (particles) fill instead of stroke.
    ctx.strokeStyle = `hsl(${hue.toFixed(1)}, 80%, ${brightness}%)`;
    ctx.fillStyle = `hsl(${hue.toFixed(1)}, 80%, ${brightness}%)`;
    ctx.lineWidth = visual.lineWidth ?? 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    // Optional glow/alpha
    const useGlow = visual.useGlow || visual.useAlpha;
    ctx.shadowBlur = useGlow ? 12 : 0;
    ctx.shadowColor = ctx.strokeStyle;
    // Fetch drawing routine
    const draw = this.drawFuncs[this.shapeKey] || this.drawFuncs.circle;
    try {
      draw.call(this, data, now / 1000, visual);
    } catch (err) {
      console.error('Error drawing shape', this.shapeKey, err);
    }
    // Update status indicator
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
      try { this.onIndicatorUpdate(text, audioActive); } catch (_) {}
    }
    this._animId = requestAnimationFrame(this._animate);
  }
}

customElements.define('scope-canvas', ScopeCanvas);