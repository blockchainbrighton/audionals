// <scope-canvas> renders the oscilloscope visuals. It exposes a
// programmatic API: call `start(analyser, visualParams)` with a Web
// Audio AnalyserNode and a set of visual parameters to begin drawing,
// and `stop()` to halt the animation and clear the canvas. All
// drawing logic lives inside this component, isolated from the rest of
// the application.
// <scope-canvas> renders the oscilloscope visuals. It exposes a
// programmatic API: call `start(analyser, visualParams)` with a Web
// Audio AnalyserNode and a set of visual parameters to begin drawing,
// and `stop()` to halt the animation and clear the canvas. All
// drawing logic lives inside this component, isolated from the rest of
// the application.
class ScopeCanvas extends HTMLElement {
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
    // Allocate a single Float32Array buffer for the analyser once per start.  Creating
    // a new typed array on every animation frame would generate unnecessary
    // garbage and could lead to jitter in long‑running sessions.  The
    // analyser's fftSize determines how many samples we need to read – if
    // fftSize changes between starts we simply reallocate.
    if (!this._dataArray || this._dataArray.length !== this._analyser.fftSize) {
      this._dataArray = new Float32Array(this._analyser.fftSize);
    }
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
    // Free the data array on stop to allow for garbage collection when the
    // component is unused.  It will be recreated on the next start() call.
    this._dataArray = null;
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
    // Reuse the pre‑allocated buffer for analyser data.  See start() for allocation.
    const buf = this._dataArray;
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
    },
    spiral(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const maxRadius = 0.4 * this.canvas.width;
      const rotRate = (p.visualLFOs?.[0]?.rate || 0.005) * t;
      const numArms = p.symmetry || 3;
      const armAngle = (2 * Math.PI) / numArms;
      
      for (let arm = 0; arm < numArms; arm++) {
        this.ctx.save();
        this.ctx.rotate(arm * armAngle + rotRate);
        this.ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
          const progress = i / data.length;
          const amp = (data[i] + 1) / 2;
          const radius = progress * maxRadius * (0.7 + 0.3 * amp);
          const angle = progress * 4 * Math.PI; // Two full rotations
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          
          i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
      }
    },
    waveform(data, t, p) {
      const width = this.canvas.width;
      const height = this.canvas.height;
      const centerY = height / 2;
      const scaleX = width / data.length;
      const scaleY = height * 0.4;
      
      this.ctx.beginPath();
      
      for (let i = 0; i < data.length; i++) {
        const x = i * scaleX;
        const y = centerY + data[i] * scaleY;
        
        i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
      }
      
      this.ctx.stroke();
      
      // Add mirror effect below
      this.ctx.save();
      this.ctx.globalAlpha = 0.5;
      this.ctx.setTransform(1, 0, 0, -1, 0, 2 * centerY);
      this.ctx.beginPath();
      
      for (let i = 0; i < data.length; i++) {
        const x = i * scaleX;
        const y = centerY + data[i] * scaleY;
        
        i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
      }
      
      this.ctx.stroke();
      this.ctx.restore();
    },
    starburst(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const radius = 0.4 * this.canvas.width;
      const numRays = p.symmetry || 8;
      const rotRate = (p.visualLFOs?.[0]?.rate || 0.005) * t;
      
      this.ctx.beginPath();
      
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * 2 * Math.PI + rotRate;
        const ampIndex = i % data.length;
        const amp = (data[ampIndex] + 1) / 2;
        const rayLength = radius * (0.7 + 0.5 * amp);
        
        const x1 = cx + Math.cos(angle) * radius * 0.2; // Start from near center
        const y1 = cy + Math.sin(angle) * radius * 0.2;
        const x2 = cx + Math.cos(angle) * rayLength;
        const y2 = cy + Math.sin(angle) * rayLength;
        
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
      }
      
      this.ctx.stroke();
    },
    ripple(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const maxRadius = 0.4 * this.canvas.width;
      const time = t * 2; // Speed up the animation
      
      // Create multiple ripple rings
      const numRipples = 5;
      const rippleSpacing = maxRadius / numRipples;
      
      for (let ripple = 0; ripple < numRipples; ripple++) {
        const baseRadius = (ripple * rippleSpacing) + (time * 30) % rippleSpacing;
        const ampIndex = ripple % data.length;
        const amp = (data[ampIndex] + 1) / 2;
        const radius = baseRadius * (1 + 0.3 * amp);
        
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        this.ctx.globalAlpha = 0.7 - ripple * 0.1;
        this.ctx.stroke();
      }
      
      // Add a central pulse
      const centerAmp = (data[0] + 1) / 2;
      const centerRadius = 10 + 20 * centerAmp;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, centerRadius, 0, 2 * Math.PI);
      this.ctx.globalAlpha = 0.8;
      this.ctx.fill();
    },
    orbit(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const baseRadius = 0.4 * this.canvas.width;
      const numBodies = p.particleCount || 5;
      
      // Initialize particles if needed
      if (!this._particles || this._particles.length !== numBodies) {
        this._particles = Array.from({ length: numBodies }, (_, i) => ({
          angle: (i / numBodies) * 2 * Math.PI,
          radius: baseRadius * (0.3 + 0.4 * Math.random()),
          speed: 0.01 + Math.random() * 0.02,
          size: 3 + Math.random() * 7,
          trail: []
        }));
      }
      
      const time = t * 0.5;
      
      this._particles.forEach(body => {
        // Update position
        body.angle += body.speed;
        const x = cx + Math.cos(body.angle) * body.radius;
        const y = cy + Math.sin(body.angle) * body.radius;
        
        // Add to trail
        body.trail.push({ x, y, time });
        // Keep only recent positions
        while (body.trail.length > 20) body.trail.shift();
        
        // Draw trail
        if (body.trail.length > 1) {
          this.ctx.save();
          this.ctx.globalAlpha = 0.3;
          this.ctx.beginPath();
          this.ctx.moveTo(body.trail[0].x, body.trail[0].y);
          for (let i = 1; i < body.trail.length; i++) {
            const alpha = i / body.trail.length;
            this.ctx.lineTo(body.trail[i].x, body.trail[i].y);
          }
          this.ctx.stroke();
          this.ctx.restore();
        }
        
        // Draw orbit path
        this.ctx.save();
        this.ctx.globalAlpha = 0.2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, body.radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Draw body
        const ampIndex = Math.floor((body.angle / (2 * Math.PI)) * data.length) % data.length;
        const amp = (data[ampIndex] + 1) / 2;
        const glowSize = body.size * (1 + 0.5 * amp);
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, this.ctx.fillStyle);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, glowSize, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Core
        this.ctx.fillStyle = `hsla(${this._parseHue(p.palette[0])}, 90%, 70%, 1)`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, body.size * 0.5, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    },
    fractal(data, t, p) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const size = 0.3 * this.canvas.width;
      const depth = 4; // Recursion depth
      
      // Get amplitude from audio data
      const amp = (data[0] + 1) / 2;
      const variation = 0.2 + 0.3 * amp; // Amount of randomness based on audio
      
      const drawBranch = (x, y, length, angle, generation) => {
        if (generation >= depth) return;
        
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.lineWidth = 3 - generation;
        this.ctx.stroke();
        
        // Branching factor influenced by audio
        const branches = 2 + Math.floor(amp * 3); // 2-5 branches
        const branchAngle = 0.4 + variation;
        
        for (let i = 0; i < branches; i++) {
          const newAngle = angle - branchAngle + (i / (branches - 1 || 1)) * branchAngle * 2;
          const newLength = length * (0.7 + Math.random() * 0.2);
          drawBranch(endX, endY, newLength, newAngle, generation + 1);
        }
      };
      
      // Start with multiple trunks from bottom center
      const numTrunks = 1 + Math.floor(amp * 3); // 1-4 trunks
      const trunkSpread = 0.3 * Math.PI;
      
      for (let i = 0; i < numTrunks; i++) {
        const trunkAngle = -Math.PI/2 - trunkSpread/2 + (i / (numTrunks - 1 || 1)) * trunkSpread;
        drawBranch(cx, cy + size * 0.8, size * 0.3, trunkAngle, 0);
      }
    }
  };
}
customElements.define('scope-canvas', ScopeCanvas);