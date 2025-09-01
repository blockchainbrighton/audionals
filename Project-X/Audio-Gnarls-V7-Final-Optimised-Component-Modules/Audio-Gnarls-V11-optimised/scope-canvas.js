

/**
 * =============================================================================
 * ScopeCanvas2 – Oscilloscope Visual Renderer
 * =============================================================================
 *
 * PURPOSE:
 * --------
 * This custom element <scope-canvas> renders oscilloscope-inspired visuals for
 * the application. It can display a variety of mathematical and generative
 * shapes, driven either by live audio data or deterministic pseudo-random
 * "seed" buffers. It acts as the visual layer of the orchestrator's preset
 * system.
 *
 * CONTROL INTERFACE:
 * ------------------
 * The following properties are externally controlled by the orchestrator:
 *
 *   - `analyser` (AudioAnalyser|null):
 *       Web Audio API analyser node. When present AND when audio is started &
 *       playing, this provides live Float32 time-domain samples for rendering.
 *
 *   - `preset` (Object|null):
 *       Object describing the current deterministic preset. May include:
 *         • `seed`       – string used for deterministic PRNG generation
 *         • `colorSpeed` – number, controls hue rotation speed
 *       Presets may be augmented at runtime with a cached `_seedBuffer` for
 *       performance.
 *
 *   - `shapeKey` (string):
 *       Selects the drawing function. Supported keys include:
 *       "circle", "square", "butterfly", "lissajous", "spiro",
 *       "harmonograph", "rose", "hypocycloid", "epicycloid", "hum"
 *       (more can be added in `this.drawFuncs`).
 *
 *   - `mode` (string):
 *       Either "seed" (deterministic buffer before audio starts) or "live".
 *
 *   - `isAudioStarted` (boolean):
 *       Indicates whether the audio context has been unlocked by user gesture.
 *
 *   - `isPlaying` (boolean):
 *       Indicates whether audio is actively running (vs. muted/paused).
 *
 *   - `onIndicatorUpdate` (function|null):
 *       Optional callback `(text: string, active: boolean)` invoked each frame.
 *       Used by the UI to show indicator text ("Audio Live", "Muted", etc).
 *
 *
 * INTERNAL BEHAVIOR:
 * ------------------
 * - RENDER LOOP:
 *   The `_animate()` method runs every frame via `requestAnimationFrame`.
 *   It:
 *     1. Selects input data:
 *        • Live audio samples from `analyser` if available & playing.
 *        • A deterministic seed buffer (generated via `_makeSeedBuffer`) if in
 *          seed mode.
 *        • A static dummy waveform otherwise.
 *     2. Chooses stroke color based on time & preset’s `colorSpeed`.
 *     3. Delegates drawing to the appropriate shape function.
 *     4. Invokes `onIndicatorUpdate` callback, if provided.
 *
 * - SHAPE FUNCTIONS:
 *   Stored in `this.drawFuncs`. Each receives `(data, t, preset)` and draws
 *   directly onto the canvas context. Shapes combine live/seed data with time
 *   to produce organic animations.
 *
 * - SEED BUFFERS:
 *   Generated via `_makeSeedBuffer(shape, seed, len)`. Uses a Mulberry32 PRNG
 *   seeded by `preset.seed + shapeKey` to ensure deterministic repeatable
 *   waveforms. Cached on `preset._seedBuffer` for reuse.
 *
 * - CANVAS SIZING:
 *   The canvas is fixed at 600x600 px for simplicity (not responsive). Unlike
 *   the original implementation, it does not resize with viewport.
 *
 *
 * LIFECYCLE:
 * ----------
 * - `connectedCallback()`:
 *     Starts the animation loop.
 *
 * - `disconnectedCallback()`:
 *     Cancels animation frame and cleans up.
 *
 *
 * EXTENDING / MODIFYING:
 * ----------------------
 * • To add new visual styles:
 *   Implement a new function in `this.drawFuncs` and set its key as a valid
 *   `shapeKey`. Keep inputs consistent with `(data, t, pr)`.
 *
 * • To change color logic:
 *   Edit the hue/saturation/lightness calculation in `_animate()`.
 *
 * • To alter seed buffer behavior:
 *   Modify `_makeSeedBuffer()`. Be cautious: changes affect all presets relying
 *   on deterministic seeding.
 *
 * • Do NOT forget:
 *   - Ensure `cancelAnimationFrame` is called on disconnect.
 *   - Maintain deterministic behavior in seed mode for reproducibility.
 *   - Use `ctx.save()/ctx.restore()` inside shape funcs if modifying global
 *     canvas state (alpha, transforms, etc).
 *
 *
 * NOTES / GOTCHAS:
 * ----------------
 * - If `preset` changes, previously cached `_seedBuffer` may persist; clear it
 *   if regeneration is desired.
 * - The visual output is stroke-only (no fill). Line style is set once per
 *   frame before shape draw.
 * - Live data arrays may vary in length (based on analyser.fftSize). Shape
 *   functions should gracefully handle any `data.length`.
 *
 * =============================================================================
 */

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
      // Power Hum: Soft, glowing, minimal radial sine pulse
        hum: (data, t, pr) => {
          const cw = this._canvas.width;
          const c = cw / 2;
          const ctx = this._ctx;
          const baseRadius = 0.33 * cw + Math.sin(t * 0.0002) * 5; // Very gentle slow throb
          ctx.save();
          ctx.globalAlpha = 0.23 + 0.14 * Math.abs(Math.sin(t * 0.0004)); // gentle shimmer
          ctx.beginPath();
          // Draw faint main ring
          ctx.arc(c, c, baseRadius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.strokeStyle = `hsl(195, 80%, 62%)`; // Cyan glow

          ctx.globalAlpha = 0.36;
          // Draw sine-wave "breath" around the ring
          ctx.beginPath();
          const segs = 128;
          for (let i = 0; i < segs; ++i) {
            const theta = (i / segs) * 2 * Math.PI;
            // Subtle pulsing ripple
            const ripple = 12 * Math.sin(theta * 3 + t * 0.00045) + 6 * Math.sin(theta * 6 - t * 0.00032);
            // Optionally modulate with live data (if available)
            let amp = 0;
            if (data && data.length === segs) amp = data[i] * 7;
            else if (data) amp = (data[i % data.length] || 0) * 7;
            const r = baseRadius + ripple + amp;
            const x = c + Math.cos(theta) * r;
            const y = c + Math.sin(theta) * r;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        },
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
        const cw = this._canvas.width;
        const S = 0.7 * cw / 4;
        const c = cw / 2;
        const decay = Math.exp(-t * 0.0002);
        const avg = (data.reduce((a, b) => a + b, 0) / data.length + 1) * 0.5;
        const ctx = this._ctx;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const theta = (i / data.length) * 2 * Math.PI;
          const x = c +  S * ((Math.sin(3 * theta + t * 0.0003) * 0.7 + Math.sin(5 * theta + t * 0.0004) * 0.3)) * (0.5 + 0.5 * data[i]);
          const y = c +  S * ((Math.sin(4 * theta + t * 0.00035) * 0.6 + Math.sin(6 * theta + t * 0.00025) * 0.4)) * (0.5 + 0.5 * data[i]);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      },

// Rose (rhodonea/rows): r = cos(k*theta)
  rose: (data, t, pr) => {
    const cw = this._canvas.width;
    const S = 0.42 * cw;
    const c = cw / 2;
    const k = 3 + Math.round(Math.abs(Math.sin(t * 0.00025)) * 4); // 3–7 petals
    const ctx = this._ctx;
    ctx.beginPath();
    for (let i = 0; i < data.length; ++i) {
      const theta = (i / data.length) * 2 * Math.PI + t * 0.00035;
      const amp = (data[i] + 1) / 2;
      const r = S * Math.cos(k * theta) * (0.65 + 0.35 * amp);
      const x = c + Math.cos(theta) * r;
      const y = c + Math.sin(theta) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },

  // Hypocycloid: classic star curves (like astroids, deltoids)
  hypocycloid: (data, t, pr) => {
    const cw = this._canvas.width;
    const S = 0.39 * cw;
    const c = cw / 2;
    // Number of cusps: 3–6
    const n = 3 + Math.round(3 * Math.abs(Math.cos(t * 0.00023))); // 3–6
    const ctx = this._ctx;
    ctx.beginPath();
    for (let i = 0; i < data.length; ++i) {
      const theta = (i / data.length) * 2 * Math.PI + t * 0.0004;
      // Hypocycloid parametric (R = 1, r = 1/n):
      const R = 1, r = 1 / n;
      const amp = (data[i] + 1) / 2;
      const x = c + S * ((R - r) * Math.cos(theta) + r * Math.cos((R - r) / r * theta)) * (0.7 + 0.3 * amp);
      const y = c + S * ((R - r) * Math.sin(theta) - r * Math.sin((R - r) / r * theta)) * (0.7 + 0.3 * amp);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  },

  // Epicycloid: like a classic spirograph gear flower
  epicycloid: (data, t, pr) => {
    const cw = this._canvas.width;
    const S = 0.36 * cw;
    const c = cw / 2;
    // Number of cusps: 4–7
    const n = 4 + Math.round(3 * Math.abs(Math.sin(t * 0.00021 + 0.5))); // 4–7
    const ctx = this._ctx;
    ctx.beginPath();
    for (let i = 0; i < data.length; ++i) {
      const theta = (i / data.length) * 2 * Math.PI + t * 0.00038;
      // Epicycloid parametric (R = 1, r = 1/n):
      const R = 1, r = 1 / n;
      const amp = (data[i] + 1) / 2;
      const x = c + S * ((R + r) * Math.cos(theta) - r * Math.cos((R + r) / r * theta)) * (0.7 + 0.3 * amp);
      const y = c + S * ((R + r) * Math.sin(theta) - r * Math.sin((R + r) / r * theta)) * (0.7 + 0.3 * amp);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
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



/**
 * =============================================================================
 * ScopeCanvas2 – Oscilloscope Visual Renderer
 * =============================================================================
 *
 * PURPOSE:
 * --------
 * This custom element <scope-canvas> renders oscilloscope-inspired visuals for
 * the application. It can display a variety of mathematical and generative
 * shapes, driven either by live audio data or deterministic pseudo-random
 * "seed" buffers. It acts as the visual layer of the orchestrator's preset
 * system.
 *
 * CONTROL INTERFACE:
 * ------------------
 * The following properties are externally controlled by the orchestrator:
 *
 *   - `analyser` (AudioAnalyser|null):
 *       Web Audio API analyser node. When present AND when audio is started &
 *       playing, this provides live Float32 time-domain samples for rendering.
 *
 *   - `preset` (Object|null):
 *       Object describing the current deterministic preset. May include:
 *         • `seed`       – string used for deterministic PRNG generation
 *         • `colorSpeed` – number, controls hue rotation speed
 *       Presets may be augmented at runtime with a cached `_seedBuffer` for
 *       performance.
 *
 *   - `shapeKey` (string):
 *       Selects the drawing function. Supported keys include:
 *       "circle", "square", "butterfly", "lissajous", "spiro",
 *       "harmonograph", "rose", "hypocycloid", "epicycloid", "hum"
 *       (more can be added in `this.drawFuncs`).
 *
 *   - `mode` (string):
 *       Either "seed" (deterministic buffer before audio starts) or "live".
 *
 *   - `isAudioStarted` (boolean):
 *       Indicates whether the audio context has been unlocked by user gesture.
 *
 *   - `isPlaying` (boolean):
 *       Indicates whether audio is actively running (vs. muted/paused).
 *
 *   - `onIndicatorUpdate` (function|null):
 *       Optional callback `(text: string, active: boolean)` invoked each frame.
 *       Used by the UI to show indicator text ("Audio Live", "Muted", etc).
 *
 *
 * INTERNAL BEHAVIOR:
 * ------------------
 * - RENDER LOOP:
 *   The `_animate()` method runs every frame via `requestAnimationFrame`.
 *   It:
 *     1. Selects input data:
 *        • Live audio samples from `analyser` if available & playing.
 *        • A deterministic seed buffer (generated via `_makeSeedBuffer`) if in
 *          seed mode.
 *        • A static dummy waveform otherwise.
 *     2. Chooses stroke color based on time & preset’s `colorSpeed`.
 *     3. Delegates drawing to the appropriate shape function.
 *     4. Invokes `onIndicatorUpdate` callback, if provided.
 *
 * - SHAPE FUNCTIONS:
 *   Stored in `this.drawFuncs`. Each receives `(data, t, preset)` and draws
 *   directly onto the canvas context. Shapes combine live/seed data with time
 *   to produce organic animations.
 *
 * - SEED BUFFERS:
 *   Generated via `_makeSeedBuffer(shape, seed, len)`. Uses a Mulberry32 PRNG
 *   seeded by `preset.seed + shapeKey` to ensure deterministic repeatable
 *   waveforms. Cached on `preset._seedBuffer` for reuse.
 *
 * - CANVAS SIZING:
 *   The canvas is fixed at 600x600 px for simplicity (not responsive). Unlike
 *   the original implementation, it does not resize with viewport.
 *
 *
 * LIFECYCLE:
 * ----------
 * - `connectedCallback()`:
 *     Starts the animation loop.
 *
 * - `disconnectedCallback()`:
 *     Cancels animation frame and cleans up.
 *
 *
 * EXTENDING / MODIFYING:
 * ----------------------
 * • To add new visual styles:
 *   Implement a new function in `this.drawFuncs` and set its key as a valid
 *   `shapeKey`. Keep inputs consistent with `(data, t, pr)`.
 *
 * • To change color logic:
 *   Edit the hue/saturation/lightness calculation in `_animate()`.
 *
 * • To alter seed buffer behavior:
 *   Modify `_makeSeedBuffer()`. Be cautious: changes affect all presets relying
 *   on deterministic seeding.
 *
 * • Do NOT forget:
 *   - Ensure `cancelAnimationFrame` is called on disconnect.
 *   - Maintain deterministic behavior in seed mode for reproducibility.
 *   - Use `ctx.save()/ctx.restore()` inside shape funcs if modifying global
 *     canvas state (alpha, transforms, etc).
 *
 *
 * NOTES / GOTCHAS:
 * ----------------
 * - If `preset` changes, previously cached `_seedBuffer` may persist; clear it
 *   if regeneration is desired.
 * - The visual output is stroke-only (no fill). Line style is set once per
 *   frame before shape draw.
 * - Live data arrays may vary in length (based on analyser.fftSize). Shape
 *   functions should gracefully handle any `data.length`.
 *
 *
 * =============================================================================
 * DEVELOPER QUICK REFERENCE
 * =============================================================================
 *
 * Example usage in an app:
 *
 *   const scope = document.createElement('scope-canvas');
 *   scope.shapeKey = 'lissajous';
 *   scope.mode = 'seed';
 *   scope.preset = { seed: 'alpha123', colorSpeed: 0.05 };
 *   scope.isAudioStarted = false;
 *   scope.isPlaying = false;
 *   scope.onIndicatorUpdate = (txt, active) => {
 *     console.log(`[Scope] ${txt} (active=${active})`);
 *   };
 *   document.body.appendChild(scope);
 *
 *   // Later, attach an AudioAnalyser:
 *   scope.analyser = audioCtx.createAnalyser();
 *   scope.isAudioStarted = true;
 *   scope.isPlaying = true;
 *
 *
 * ShapeKey Catalog (current):
 * ---------------------------
 *   - "hum"          : soft glowing radial sine pulse
 *   - "circle"       : radial waveform around a circle
 *   - "square"       : waveform mapped to square perimeter
 *   - "butterfly"    : classic butterfly curve (chaotic symmetry)
 *   - "lissajous"    : X/Y sine cross pattern
 *   - "spiro"        : spirograph-like looping curves
 *   - "harmonograph" : decaying pendulum-like orbits
 *   - "rose"         : rhodonea flower (cos(kθ) petals)
 *   - "hypocycloid"  : star curves (cusped interiors)
 *   - "epicycloid"   : gear-like flower curves
 *
 * To test a new shape quickly:
 *   scope.shapeKey = 'rose';
 *   scope.preset = { seed: 'devtest', colorSpeed: 0.1 };
 *   scope.mode = 'seed';
 *
 * =============================================================================
 */



