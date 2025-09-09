// path-rec-app.js
// Freestyle Path Recorder module
// Captures pointer paths with timing, renders an overlay and plays back recordings.

import { clamp01 } from './utils.js';

class PathRecApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:none}</style>';
    this._showOverlay = true;   // controls whether lines are drawn

    // internal state
    this._armed = false;
    this._isRecording = false;
    this._isPlaying = false;
    this._loop = false;
    this._recording = null;
    this._points = [];
    this._t0 = 0;
    this._lastSampleT = 0;
    this._playIdx = 0;
    this._playT0 = 0;
    this._raf = 0;

    // bind methods
    this.play = this.play.bind(this);
    this.stop = this.stop.bind(this);
    this.arm = this.arm.bind(this);
    this.disarm = this.disarm.bind(this);
    this.clear = this.clear.bind(this);
    this.getRecording = this.getRecording.bind(this);
    this.inputPointer = this.inputPointer.bind(this);
    this.renderOverlay = this.renderOverlay.bind(this);
    this.setLoop = this.setLoop.bind(this);
  }

  // -------------------- public API --------------------

  arm() {
    // Enter record-ready; DO NOT affect playback.
    if (this._armed) return;
    this._armed = true;
    this._showOverlay = true;   // show lines while record-ready
    this._dispatch('fr-armed');
  }

  disarm() {
    // Leave record-ready; DO NOT stop playback.
    if (!this._armed) return;

    // If we were recording, finalize the take gracefully.
    if (this._isRecording) {
      try { this._endRecording(performance.now()); } catch {}
    }

    this._armed = false;
    this._showOverlay = false;  // hide lines when record-ready is off
    this._dispatch('fr-disarmed');
  }

  clear() {
    // Clearing explicitly stops playback/recording and forgets the take.
    this.stop();
    this._recording = null;
    this._points = [];
    this._dispatch('fr-cleared');
  }

  getRecording() {
    return this._recording
      ? { points: this._recording.points.slice(), duration: this._recording.duration }
      : null;
  }

  play(recording, opts = {}) {
    // opts: { loop?: boolean }
    this._loop = !!(opts && opts.loop);
    if (this._isPlaying) return;

    const rec = recording || this._recording;
    if (recording) this._recording = recording; // keep overlay in sync
    if (!rec || !rec.points || !rec.points.length) return;

    this._isPlaying = true;
    this._playIdx = 0;
    this._playT0 = performance.now();
    this._dispatch('fr-play-started');

    const step = () => {
      if (!this._isPlaying) return;
      const now = performance.now();
      const et = now - this._playT0;
      const pts = rec.points;

      // emit any points up to current time
      while (this._playIdx < pts.length && pts[this._playIdx].t <= et) {
        const p = pts[this._playIdx++];
        this._emitPlayInput(p);
      }

      // interpolate position between points for smooth cursor
      if (this._playIdx > 0 && this._playIdx < pts.length) {
        const a = pts[this._playIdx - 1];
        const b = pts[this._playIdx];
        if (b.t > a.t) {
          const u = (et - a.t) / Math.max(1, (b.t - a.t));
          const x = a.x + (b.x - a.x) * u;
          const y = a.y + (b.y - a.y) * u;
          this._emitPlayInput({ x, y, t: et, type: 'move', _interp: true });
        }
      }

      if (et >= rec.duration) {
        // ensure final up event if not present
        const last = pts[pts.length - 1];
        if (last && last.type !== 'up') {
          const end = { x: last.x, y: last.y, t: rec.duration, type: 'up' };
          this._emitPlayInput(end);
        }

        if (this._loop) {
          this._dispatch('fr-play-loop'); // optional hook
          // restart seamlessly
          this._playIdx = 0;
          this._playT0 = performance.now();
          const first = pts[0];
          if (first) {
            this._emitPlayInput({ x: first.x, y: first.y, t: 0, type: first.type || 'down' });
          }
          this._raf = requestAnimationFrame(step);
          return;
        }

        this.stop();
        return;
      }

      this._raf = requestAnimationFrame(step);
    };

    this._raf = requestAnimationFrame(step);
  }

  stop() {
    if (!this._isPlaying) return;
    cancelAnimationFrame(this._raf);
    this._isPlaying = false;
    this._dispatch('fr-play-stopped');
  }

  setLoop(v) { this._loop = !!v; }

  // Input pointer samples: type = 'down'|'move'|'up'
  inputPointer(type, x, y, t) {
    // Only capture input while armed (record-ready). Playback is unaffected by this gate.
    if (!this._armed) return;
    x = clamp01(x);
    y = clamp01(y);

    if (type === 'down' && !this._isRecording) {
      this._beginRecording(t);
    }
    if (!this._isRecording) return;

    const now = t ?? performance.now();
    const rel = now - this._t0;
    this._points.push({ x, y, t: rel, type });
    this._lastSampleT = rel;

    if (type === 'up') {
      this._endRecording(now);
    }
  }

  renderOverlay(ctx, now = performance.now()) {
    // Hide path lines when overlay is disabled (e.g., FR Ready toggled off)
    if (!this._showOverlay) {
      // Optionally still render the playback cursor; comment out to hide it too.
      if (this._isPlaying && this._recording) {
        const et = now - this._playT0;
        const pos = this._interpAtTime(this._recording, et);
        if (pos) {
          const cx = pos.x * ctx.canvas.width;
          const cy = pos.y * ctx.canvas.height;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'white';
          ctx.fill();
        }
      }
      return;
    }

    // Choose current source of points for drawing
    const rec = this._isRecording ? { points: this._points } : this._recording;
    if (!rec || !rec.points || !rec.points.length) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.beginPath();

    const pts = rec.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const cx = p.x * ctx.canvas.width;
      const cy = p.y * ctx.canvas.height;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Playback cursor (kept even with overlay on)
    if (this._isPlaying && this._recording) {
      const et = now - this._playT0;
      const pos = this._interpAtTime(this._recording, et);
      if (pos) {
        const cx = pos.x * ctx.canvas.width;
        const cy = pos.y * ctx.canvas.height;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // -------------------- private helpers --------------------

  _beginRecording(tAbs) {
    // Starting a new recording does not stop playback automatically,
    // but typical callers arm() before capturing, which is fine.
    this.stop(); // ensure we don't mix playback with capture emission
    this._isRecording = true;
    this._points = [];
    this._t0 = tAbs ?? performance.now();
    this._lastSampleT = 0;
    this._dispatch('fr-record-started');
  }

  _endRecording(tAbs) {
    if (!this._isRecording) return;
    const now = tAbs ?? performance.now();
    let duration = Math.max(0, Math.round(now - this._t0));
    if (duration === 0) duration = 1; // avoid zero-length loop

    // handle zero-move holds by adding a single point
    if (this._points.length === 0) {
      this._points.push({ x: 0.5, y: 0.5, t: 0, type: 'down' });
    }

    const last = this._points[this._points.length - 1];
    if (!last || last.type !== 'up') {
      this._points.push({
        x: last ? last.x : 0.5,
        y: last ? last.y : 0.5,
        t: duration,
        type: 'up',
      });
    }

    this._recording = { points: this._points.slice(), duration };
    this._isRecording = false;
    this._dispatch('fr-record-stopped', { duration });
  }

  _interpAtTime(rec, t) {
    const pts = rec.points;
    if (!pts || !pts.length) return null;
    if (t <= pts[0].t) return { x: pts[0].x, y: pts[0].y };
    if (t >= rec.duration) {
      const last = pts[pts.length - 1];
      return { x: last.x, y: last.y };
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (t <= b.t) {
        const u = (t - a.t) / Math.max(1, (b.t - a.t));
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    const last = pts[pts.length - 1];
    return { x: last.x, y: last.y };
  }

  _emitPlayInput(p) {
    this._dispatch('fr-play-input', { x: p.x, y: p.y, t: p.t, type: p.type });
  }

  _dispatch(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

customElements.define('path-rec-app', PathRecApp);
export { PathRecApp };
