// =============================================================
// File: path-rec-app.js
// Custom Element: <path-rec-app>
// Purpose: Freestyle path recorder + playback with overlay rendering.
// =============================================================

class PathRecApp extends HTMLElement {
  constructor() {
    super();
    this._armed = false;
    this._isRecording = false;
    this._isPlaying = false;
    this._recording = null; // { points: [...], duration }
    this._startTime = 0; // perf baseline for recording

    // Playback state
    this._playStart = 0; // perf baseline for playback
    this._playhead = 0; // ms since play start
    this._raf = null;

    // Render cache
    this._cachedPath2D = null; // Path2D built from normalized points

    // Draw style (kept simple to mirror existing scope style)
    this.strokeStyle = 'white';
    this.lineWidth = 2;
    this.lineCap = 'round';
    this.lineJoin = 'round';
  }

  // --- Lifecycle ---
  connectedCallback() {}
  disconnectedCallback() { this.stop(); }

  // --- Public API ---
  arm() {
    if (this._armed) return;
    this._armed = true;
    this.dispatchEvent(new CustomEvent('fr-armed', { bubbles: true, composed: true }));
  }
  disarm() {
    if (!this._armed) return;
    this._armed = false;
    // Visibility rule: hide overlay when disarmed (we'll just not render)
    this.dispatchEvent(new CustomEvent('fr-disarmed', { bubbles: true, composed: true }));
  }
  clear() {
    this._recording = null;
    this._cachedPath2D = null;
    this.stop();
    this.dispatchEvent(new CustomEvent('fr-cleared', { bubbles: true, composed: true }));
  }
  getRecording() {
    return this._recording ? { points: [...this._recording.points], duration: this._recording.duration } : null;
  }

  /**
   * Begin playback of a recording (or the last one) using original timing.
   * During playback this element emits fr-play-started and fr-play-stopped.
   */
  play(recording) {
    if (this._isPlaying) this.stop();
    const rec = recording || this._recording;
    if (!rec || !rec.points || rec.points.length === 0) return;

    this._isPlaying = true;
    this._playStart = performance.now();
    this._playhead = 0;

    this.dispatchEvent(new CustomEvent('fr-play-started', { bubbles: true, composed: true }));

    // Drive a frame loop for interpolation + synthetic input events
    const tick = () => {
      if (!this._isPlaying) return;
      const now = performance.now();
      this._playhead = now - this._playStart;

      // stop when we surpass duration (ensure we deliver final 'up')
      if (this._playhead >= rec.duration) {
        // Emit a synthetic final up to host
        this._emitSynthetic('up', rec.points[rec.points.length - 1]);
        this.stop();
        return;
      }

      // Interpolate current position along the recorded timeline
      const p = this._interpolateAtTime(rec.points, this._playhead);
      if (p) {
        // On the very first frame, send a 'down' at the first point's time
        if (this._playhead === 0) {
          this._emitSynthetic('down', rec.points[0]);
        }
        this._emitSynthetic('move', p);
      }

      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._isPlaying) {
      this._isPlaying = false;
      this.dispatchEvent(new CustomEvent('fr-play-stopped', { bubbles: true, composed: true }));
    }
  }

  /**
   * Render overlay: path (always when armed or when reviewing), and during playback a cursor.
   * ctx: CanvasRenderingContext2D mapped 1:1 to canvas pixels. Points are normalized [0,1].
   */
  renderOverlay(ctx, now = performance.now()) {
    // Hide when disarmed per spec.
    if (!this._armed && !this._isRecording && !this._isPlaying) return;

    const rec = this._isRecording ? this._live : this._recording;
    if (!rec || !rec.points || rec.points.length === 0) {
      // During playback, we may still want to draw cursor if interpolate works even w/o path.
      if (this._isPlaying && this._recording && this._recording.points.length) {
        this._drawCursor(ctx, this._interpolateAtTime(this._recording.points, this._playhead));
      }
      return;
    }

    // Build (or reuse) Path2D for static polyline when not recording
    if (!this._isRecording && this._recording === rec && !this._cachedPath2D) {
      this._cachedPath2D = this._buildPath2D(rec.points, ctx.canvas.width, ctx.canvas.height);
    }

    ctx.save();
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;
    ctx.strokeStyle = this.strokeStyle;

    const path = (this._isRecording || rec !== this._recording) ?
      this._buildPath2D(rec.points, ctx.canvas.width, ctx.canvas.height) :
      this._cachedPath2D;

    if (path) ctx.stroke(path);

    // Cursor during playback
    if (this._isPlaying && this._recording === rec) {
      const p = this._interpolateAtTime(rec.points, this._playhead);
      this._drawCursor(ctx, p);
    }
    ctx.restore();
  }

  // --- Host integration helpers ---
  /**
   * Forward normalized pointer samples while armed.
   * type: 'down' | 'move' | 'up'
   * x,y: normalized [0,1]
   * t: optional timestamp (ms). If omitted, uses performance.now().
   */
  ingest(type, x, y, t /* ms */) {
    if (!this._armed) return;
    const now = (t != null) ? t : performance.now();

    if (type === 'down') {
      this._beginLive(now);
      this._pushPoint('down', x, y, 0);
      this._isRecording = true;
      this.dispatchEvent(new CustomEvent('fr-record-started', { bubbles: true, composed: true }));
      return;
    }
    if (!this._isRecording) return; // ignore moves/ups until first down

    const dt = now - this._startTime;
    if (type === 'move') {
      this._pushPoint('move', x, y, dt);
      return;
    }
    if (type === 'up') {
      this._pushPoint('up', x, y, dt);
      // finalize
      const duration = Math.max(0, dt);
      this._recording = { points: this._live.points, duration };
      this._cachedPath2D = null; // rebuild on next render
      this._isRecording = false;
      this._live = null;
      this.dispatchEvent(new CustomEvent('fr-record-stopped', { bubbles: true, composed: true, detail: { duration } }));
    }
  }

  // --- Internal recording helpers ---
  _beginLive(now) {
    this._startTime = now;
    this._live = { points: [], duration: 0 };
    this._lastSampleT = 0;
  }

  _pushPoint(type, x, y, t) {
    // Dwell sampling: ensure samples at ~16ms intervals even if unchanged
    // The host should call ingest on every pointermove; we defensively add
    // extra samples if too long elapsed without movement.
    const pts = this._live ? this._live.points : (this._recording ? this._recording.points : null);
    if (!pts) return;
    const last = pts[pts.length - 1];

    // Insert intermediate dwell samples if needed
    if (last && type === 'move') {
      const gap = t - last.t;
      if (gap > 16) {
        const steps = Math.floor(gap / 16);
        for (let i = 1; i < steps; i++) {
          // repeat last position to encode hold
          pts.push({ x: last.x, y: last.y, t: last.t + 16 * i, type: 'move' });
        }
      }
    }

    pts.push({ x: this._clamp01(x), y: this._clamp01(y), t: Math.max(0, t), type });
  }

  // --- Path building & interpolation ---
  _buildPath2D(points, w, h) {
    if (!points || points.length === 0) return null;
    const p2d = new Path2D();
    const first = points[0];
    p2d.moveTo(first.x * w, first.y * h);
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      p2d.lineTo(p.x * w, p.y * h);
    }
    return p2d;
  }

  _drawCursor(ctx, p) {
    if (!p) return;
    const x = p.x * ctx.canvas.width;
    const y = p.y * ctx.canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = this.strokeStyle;
    ctx.fill();
  }

  _interpolateAtTime(points, t) {
    if (!points || points.length === 0) return null;
    if (t <= points[0].t) return { x: points[0].x, y: points[0].y, t };
    if (t >= points[points.length - 1].t) return { x: points[points.length - 1].x, y: points[points.length - 1].y, t };

    // binary search for segment containing t
    let lo = 0, hi = points.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid].t < t) lo = mid + 1; else hi = mid - 1;
    }
    const i1 = Math.max(1, lo);
    const p0 = points[i1 - 1];
    const p1 = points[i1];
    const span = Math.max(1, p1.t - p0.t);
    const u = (t - p0.t) / span;
    return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u, t };
  }

  _clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // --- Synthetic event bridge back to host (osc-app) ---
  /**
   * The host listens for these to simulate live input during playback.
   * detail: { x, y, type, t }
   */
  _emitSynthetic(type, p) {
    this.dispatchEvent(new CustomEvent('fr-synth-input', {
      bubbles: true,
      composed: true,
      detail: { type, x: p.x, y: p.y, t: p.t }
    }));
  }
}

customElements.define('path-rec-app', PathRecApp);


// =============================================================
// File: osc-app.js (patches)
// Notes: below are additive patches you can apply to your existing file.
// Search for indicated anchors and insert accordingly.
// =============================================================

/* 1) State additions (extend defaultState) */
// Find defaultState() and add:
// isFreestyleMode: false,
// isFreestyleRecording: false,
// freestyleRecording: null,
// freestylePlayback: false,

/* 2) DOM: instantiate the module */
// Somewhere in osc-app template init/connectedCallback (sibling to <seq-app>):
// this._pathRec = this.querySelector('#pathRec') || (() => {
//   const el = document.createElement('path-rec-app');
//   el.id = 'pathRec';
//   this.appendChild(el);
//   return el;
// })();

/* 3) Wire module events */
// In connectedCallback():
// this._pathRec.addEventListener('fr-armed', () => { this.state.isFreestyleMode = true; this._updateControls(); });
// this._pathRec.addEventListener('fr-disarmed', () => { this.state.isFreestyleMode = false; this._updateControls(); this.requestRender(); });
// this._pathRec.addEventListener('fr-record-started', () => { this.state.isFreestyleRecording = true; this._updateControls(); });
// this._pathRec.addEventListener('fr-record-stopped', (ev) => {
//   this.state.isFreestyleRecording = false;
//   this.state.freestyleRecording = this._pathRec.getRecording();
//   this._updateControls();
//   this.requestRender();
// });
// this._pathRec.addEventListener('fr-cleared', () => { this.state.freestyleRecording = null; this._updateControls(); this.requestRender(); });
// this._pathRec.addEventListener('fr-play-started', () => { this.state.freestylePlayback = true; this._updateControls(); });
// this._pathRec.addEventListener('fr-play-stopped', () => { this.state.freestylePlayback = false; this._updateControls(); this.requestRender(); });

/* 3b) Playback drives synth as if live input */
// this._pathRec.addEventListener('fr-synth-input', (ev) => {
//   const { type, x, y } = ev.detail;
//   // Map normalized (x,y) back to grid/cell and reuse your existing press/move/release flow.
//   // Assuming you have helpers: cellFromNorm(x,y) mirroring cellFromEvent.
//   const cell = this.cellFromNorm ? this.cellFromNorm(x, y) : this._cellFromNormalized(x, y);
//   if (!cell) return;
//   if (type === 'down') this.pressCell(cell.row, cell.col, { source: 'freestyle' });
//   else if (type === 'move') this.moveCell(cell.row, cell.col, { source: 'freestyle' });
//   else if (type === 'up') this.releaseCell(cell.row, cell.col, { source: 'freestyle' });
// });

/* 4) Controls: add buttons (in OscControls init or render) */
// In your OscControls construction where other buttons exist, add:
// <button id="frReadyBtn" class="toggle" aria-pressed="false" title="Freestyle Record-Ready (R)">FR Ready</button>
// <button id="frPlayBtn" class="" disabled title="Play Freestyle (Shift+R)">FR Play</button>
// Style hint: mirror green-ish look used by loop/latch when pressed.

/* 5) Controls wiring (in osc-app) */
// addEvents(this._controls, [
//   ['click', '#frReadyBtn', (ev) => this._onFreestyleReadyToggle(ev)],
//   ['click', '#frPlayBtn', (ev) => this._onFreestylePlay(ev)],
// ]);

// _updateControls() additions:
// setPressed(this._controls.querySelector('#frReadyBtn'), !!this.state.isFreestyleMode);
// setDisabledAll([this._controls.querySelector('#frPlayBtn')], !this.state.freestyleRecording || this.state.isFreestyleRecording || this.state.freestylePlayback);

// Handlers:
// this._onFreestyleReadyToggle = () => {
//   if (this.state.isSequencerMode) return; // ignore when sequencer is on
//   if (this.state.isFreestyleMode) this._pathRec.disarm(); else this._pathRec.arm();
// };
// this._onFreestylePlay = () => {
//   if (!this.state.freestyleRecording) return;
//   if (this.state.freestylePlayback) this._pathRec.stop(); else this._pathRec.play(this.state.freestyleRecording);
// };

/* 6) Pointer routing (core) */
// In _onCanvasPointerDown(ev):
// if (this.state.isFreestyleMode && !this.state.isSequencerMode) {
//   const { x, y } = this._normFromEvent(ev); // [0,1] mapping using same logic as cellFromEvent
//   // Ensure armed, auto-starts on first down
//   this._pathRec.arm();
//   this._pathRec.ingest('down', x, y, performance.now());
// }
// // Continue existing press flow (so audio triggers live)
// ... existing pressCell logic ...

// In _onCanvasPointerMove(ev):
// if (this.state.isFreestyleMode && this.state.isFreestyleRecording && !this.state.isSequencerMode) {
//   const { x, y } = this._normFromEvent(ev);
//   this._pathRec.ingest('move', x, y, performance.now());
// }
// ... existing move handling ...

// In _onCanvasPointerUp(ev):
// if (this.state.isFreestyleMode && !this.state.isSequencerMode) {
//   const { x, y } = this._normFromEvent(ev);
//   this._pathRec.ingest('up', x, y, performance.now());
// }
// ... existing release flow ...

/* 7) Overlay render pass (after scope draw) */
// In your render/tick after drawing the oscilloscope visuals:
// this._pathRec.renderOverlay(this._ctx, performance.now());

/* 8) Hotkeys (optional) in osc-hotkeys.js */
// R -> toggle ready, Shift+R -> play/stop
// if (evt.key === 'r' && !evt.shiftKey) this._onFreestyleReadyToggle();
// if (evt.key === 'R' && evt.shiftKey) this._onFreestylePlay();

/* 9) Utils needed in osc-app (helper shown inline) */
// _normFromEvent(ev) example using your existing cellFromEvent mapping:
// _normFromEvent(ev) {
//   const rect = this._canvas.getBoundingClientRect();
//   const x = (ev.clientX - rect.left) / rect.width;
//   const y = (ev.clientY - rect.top) / rect.height;
//   return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
// }

/* 10) Sequencer interaction */
// Ensure that when isSequencerMode becomes true, you disarm/stop freestyle:
// if (this.state.isSequencerMode && this.state.isFreestyleMode) {
//   this._pathRec.stop();
//   this._pathRec.disarm();
// }

/* 11) Edge cases */
// - On pointercancel/blur: if recording, call this._pathRec.ingest('up', lastX, lastY, performance.now())
// - On resize: no action needed since points are normalized


// =============================================================
// File: osc-controls.html/js (patches – add buttons in your controls template)
// =============================================================
// <button id="frReadyBtn" class="toggle" aria-pressed="false" data-tip="Freestyle Record-Ready (R)">FR Ready</button>
// <button id="frPlayBtn" class="" disabled data-tip="Play Freestyle (Shift+R)">FR Play</button>
// Mirror your theming for active state (green-ish when aria-pressed="true").

