// Domain-agnostic block height monitor + seven-seg canvas renderer.
// Policy:
//   - If OrdJS (same-origin) is present -> use OrdJS, and *optionally* /blockheight.
//   - If OrdJS is NOT present -> enter MOCK mode immediately (no network).
// This avoids any /blockheight request on localhost/static dev, eliminating 404s.

export class BlockHeightClock {
  constructor({
    canvas,
    statusEl = null,
    apiPath = '/blockheight',
    ordInterval = 2000,
    apiInterval = 5000,
    fallbackSeed = 800000
  } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.statusEl = statusEl;
    this.apiPath = apiPath;
    this.ordInterval = ordInterval;
    this.apiInterval = apiInterval;
    this.fallbackSeed = fallbackSeed;

    this.lastKnown = 0;
    this._ordTimer = null;
    this._apiTimer = null;
    this._mockTimer = null;

    this._resizeObserver = new ResizeObserver(() => this._fitCanvas());
    this._resizeObserver.observe(this.canvas);
    this._fitCanvas();
    this._renderSplash('— — — — —');
    this._setStatus('Starting…');
  }

  start() { this._initHeights(); }
  stop() {
    if (this._ordTimer) clearInterval(this._ordTimer);
    if (this._apiTimer) clearInterval(this._apiTimer);
    if (this._mockTimer) clearInterval(this._mockTimer);
    this._ordTimer = this._apiTimer = this._mockTimer = null;
  }

  // -------------------- Monitoring logic --------------------
  async _initHeights() {
    const hasOrdJS = typeof window !== 'undefined' && typeof window.OrdJS === 'function';

    if (hasOrdJS) {
      // --- Hosted/inscription environment path ---
      try {
        const ord = new window.OrdJS(''); // same-origin base
        const h = await ord.getBlockheight();
        if (!Number.isFinite(h) || h <= 0) throw new Error('OrdJS invalid initial height');

        this.lastKnown = h;
        this._renderHeight(h, true);
        this._setStatus(`Height ${h} (OrdJS)`);

        // Poll OrdJS
        this._ordTimer = setInterval(async () => {
          try {
            const cur = await ord.getBlockheight();
            this._maybeUpdate(cur, 'OrdJS');
          } catch {
            this._setStatus('OrdJS error; continuing…');
          }
        }, this.ordInterval);

        // Optionally poll same-origin /blockheight, but ONLY if it is available.
        // We "probe" once; if it fails, we never try again.
        try {
          const seed = await this._fetchSameOriginHeight(); // one-time probe
          // Start API polling only if probe succeeded.
          this._apiTimer = setInterval(async () => {
            try {
              const cur = await this._fetchSameOriginHeight();
              this._maybeUpdate(cur, 'API');
            } catch {
              // silent; API may be temporarily unavailable
            }
          }, this.apiInterval);
          // Also merge initial probe result (could be higher than OrdJS)
          this._maybeUpdate(seed, 'API');
        } catch {
          // Do nothing: host doesn't expose /blockheight; that's fine.
        }

        return; // done
      } catch {
        // If OrdJS is present but fails, we still avoid calling /blockheight unless probe says it exists.
        // Try a single probe; otherwise fall to mock.
        try {
          const seed = await this._fetchSameOriginHeight();
          this.lastKnown = seed;
          this._renderHeight(seed, true);
          this._setStatus(`Height ${seed} (API-only)`);
          this._apiTimer = setInterval(async () => {
            try {
              const cur = await this._fetchSameOriginHeight();
              this._maybeUpdate(cur, 'API');
            } catch { /* keep trying silently */ }
          }, this.apiInterval);
          return;
        } catch {
          // fall through to mock
        }
      }
    }

    // --- Local/static dev path: NO network calls at all ---
    this._enterMockMode();
  }

  async _fetchSameOriginHeight() {
    const res = await fetch(this.apiPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = await res.text();
    const n = parseInt(String(txt).trim(), 10);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Bad height body');
    return n;
  }

  _maybeUpdate(newHeight, source) {
    if (!Number.isFinite(newHeight) || newHeight <= 0) return;
    if (newHeight > this.lastKnown) {
      this.lastKnown = newHeight;
      this._renderHeight(newHeight);
      this._pulse();
      this._setStatus(`Height ${newHeight} (${source})`);
    }
  }

  _enterMockMode() {
    this.lastKnown = this.fallbackSeed;
    this._renderHeight(this.lastKnown, true);
    this._setStatus(`Mock mode: ${this.lastKnown} (no OrdJS; no /blockheight)`);

    // Simulate a "new block" periodically for local visual testing (no network).
    const MOCK_PERIOD_MS = 15000; // 15s
    this._mockTimer = setInterval(() => {
      const jump = 1 + (Math.random() < 0.05 ? 1 : 0);
      this._maybeUpdate(this.lastKnown + jump, 'Mock');
    }, MOCK_PERIOD_MS);
  }

  // -------------------- Rendering --------------------
  _fitCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.lastKnown > 0) this._renderHeight(this.lastKnown, true);
    }
  }

  _renderSplash(text = 'Loading…') {
    this._clear();
    this._drawSevenSegmentText(text, { dim: true });
  }

  _renderHeight(height, immediate = false) {
    if (immediate) {
      this._clear();
      this._drawSevenSegmentText(String(height));
      return;
    }
    this._animateFade(String(height));
  }

  _clear() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.1,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7
    );
    g.addColorStop(0, '#0a0a0a');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  _animateFade(text) {
    const { ctx } = this;
    const start = performance.now();
    const dur = 200;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      this._clear();
      ctx.globalAlpha = 0.3 + 0.7 * t;
      this._drawSevenSegmentText(text);
      ctx.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _pulse() {
    const { ctx, canvas } = this;
    const start = performance.now();
    const dur = 250;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const r = canvas.width * 0.47 * t;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = Math.max(2, canvas.width * 0.01 * (1 - t));
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * (1 - t)) + ')';
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2, r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _setStatus(msg) { if (this.statusEl) this.statusEl.textContent = msg; }

  // -------------------- Seven-seg drawing --------------------
  _drawSevenSegmentText(text, { dim = false } = {}) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;

    const padding = Math.min(W, H) * 0.10;
    const boxW = W - padding * 2;
    const boxH = H - padding * 2;

    const str = String(text);
    const n = str.length;
    const gap = boxW * 0.02;
    const digitW = (boxW - (n - 1) * gap) / n;
    const digitH = Math.min(boxH, digitW * 1.9);

    const baseX = padding;
    const baseY = (H - digitH) / 2;

    for (let i = 0; i < n; i++) {
      const ch = str[i];
      const x = baseX + i * (digitW + gap);
      this._drawDigit(ch, x, baseY, digitW, digitH, dim);
    }
  }

  _drawDigit(ch, x, y, w, h, dim) {
    const { ctx } = this;
    if (!/[0-9]/.test(ch)) ch = '-';

    const seg = {
      a: [[x+0.15*w, y+0.08*h], [x+0.85*w, y+0.08*h]],
      b: [[x+0.90*w, y+0.12*h], [x+0.90*w, y+0.48*h]],
      c: [[x+0.90*w, y+0.52*h], [x+0.90*w, y+0.88*h]],
      d: [[x+0.15*w, y+0.92*h], [x+0.85*w, y+0.92*h]],
      e: [[x+0.10*w, y+0.52*h], [x+0.10*w, y+0.88*h]],
      f: [[x+0.10*w, y+0.12*h], [x+0.10*w, y+0.48*h]],
      g: [[x+0.15*w, y+0.50*h], [x+0.85*w, y+0.50*h]],
    };

    const map = {
      '0': ['a','b','c','d','e','f'],
      '1': ['b','c'],
      '2': ['a','b','g','e','d'],
      '3': ['a','b','g','c','d'],
      '4': ['f','g','b','c'],
      '5': ['a','f','g','c','d'],
      '6': ['a','f','g','e','c','d'],
      '7': ['a','b','c'],
      '8': ['a','b','c','d','e','f','g'],
      '9': ['a','b','c','d','f','g'],
      '-': ['g']
    };

    const on = new Set(map[ch] || []);
    const active = 'rgba(0, 255, 180, 0.92)';
    const glow = 'rgba(0, 255, 180, 0.25)';
    const inactive = dim ? 'rgba(0,0,0,0)' : 'rgba(0, 255, 180, 0.06)';

    this._drawAllSegments(seg, Object.keys(seg), inactive, 10);
    this._drawAllSegments(seg, Array.from(on), glow, 22);
    this._drawAllSegments(seg, Array.from(on), active, 12);
  }

  _drawAllSegments(seg, which, color, thickness) {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    for (const key of which) {
      const [[x1,y1],[x2,y2]] = seg[key];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
