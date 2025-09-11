// path-rec-app.js
// Freestyle Path Recorder module — Enhanced with neon visuals and smooth animations
// Captures pointer paths with timing, renders an overlay, and plays back recordings.

import { clamp01 } from './utils.js';

class PathRecApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:none}</style>';

    // State
    this._armed = false;
    this._isRecording = false;
    this._isPlaying = false;
    this._loop = false;
    this._showOverlay = true;
    this._recording = null;
    this._points = [];
    this._t0 = 0;
    this._lastSampleT = 0;
    this._playIdx = 0;
    this._playT0 = 0;
    this._raf = 0;

    // Bind methods
    this.arm = this.arm.bind(this);
    this.disarm = this.disarm.bind(this);
    this.clear = this.clear.bind(this);
    this.play = this.play.bind(this);
    this.stop = this.stop.bind(this);
    this.getRecording = this.getRecording.bind(this);
    this.inputPointer = this.inputPointer.bind(this);
    this.renderOverlay = this.renderOverlay.bind(this);
    this.setLoop = this.setLoop.bind(this);
  }

  // -------------------- Public API --------------------

  arm() {
    if (this._armed) return;
    this._armed = true;
    this._showOverlay = true;
    this._dispatch('fr-armed');
  }

  disarm() {
    if (!this._armed) return;

    if (this._isRecording) {
      this._endRecording(performance.now());
    }

    this._armed = false;
    this._showOverlay = false;
    this._dispatch('fr-disarmed');
  }

  clear() {
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
    this._loop = !!opts.loop;
    if (this._isPlaying) return;

    const rec = recording || this._recording;
    if (!rec || !rec.points?.length) return;

    if (recording) this._recording = recording;

    this._isPlaying = true;
    this._playIdx = 0;
    this._playT0 = performance.now();
    this._dispatch('fr-play-started');

    const firstPoint = rec.points[0];
    if (firstPoint) {
      this._emitPlayInput({ x: firstPoint.x, y: firstPoint.y, t: 0, type: firstPoint.type || 'down' });
    }

    const step = () => {
      if (!this._isPlaying) return;

      const now = performance.now();
      const et = now - this._playT0;
      const pts = rec.points;

      // Emit all events up to current time
      while (this._playIdx < pts.length && pts[this._playIdx].t <= et) {
        this._emitPlayInput(pts[this._playIdx++]);
      }

      // Interpolate for smooth cursor movement
      const pos = this._interpAtTime(rec, et);
      if (pos) {
        this._emitPlayInput({ x: pos.x, y: pos.y, t: et, type: 'move', _interp: true });
      }

      // End of playback
      if (et >= rec.duration) {
        const last = pts[pts.length - 1];
        if (last.type !== 'up') {
          this._emitPlayInput({ x: last.x, y: last.y, t: rec.duration, type: 'up' });
        }

        if (this._loop) {
          this._dispatch('fr-play-loop');
          this._playIdx = 0;
          this._playT0 = performance.now();
          const first = pts[0];
          if (first) {
            this._emitPlayInput({ x: first.x, y: first.y, t: 0, type: first.type || 'down' });
          }
          this._raf = requestAnimationFrame(step);
        } else {
          this.stop();
        }
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

  setLoop(value) {
    this._loop = !!value;
  }

  inputPointer(type, x, y, t) {
    if (!this._armed) return;
    x = clamp01(x);
    y = clamp01(y);

    const now = t ?? performance.now();

    if (type === 'down' && !this._isRecording) {
      this._beginRecording(now);
    }

    if (!this._isRecording) return;

    const rel = now - this._t0;
    this._points.push({ x, y, t: rel, type });
    this._lastSampleT = rel;

    if (type === 'up') {
      this._endRecording(now);
    }
  }

  renderOverlay(ctx, now = performance.now()) {
    if (!this._showOverlay && !(this._isPlaying && this._recording)) return;

    const rec = this._isRecording ? { points: this._points } : this._recording;
    const hasPoints = rec?.points?.length > 0;
    const canvas = ctx.canvas;

    ctx.save();

    // Draw path only if we have points and overlay is visible
    if (this._showOverlay && hasPoints) {
      // Neon glow effect: multiple blurred strokes
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Outer glow (soft blur)
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff80'; // semi-transparent cyan
      ctx.strokeStyle = '#00ffff';
      ctx.beginPath();
      this._drawPath(ctx, rec.points, canvas);
      ctx.stroke();

      // Inner bright line
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#00ffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw playback cursor if playing
    if (this._isPlaying && this._recording) {
      const et = now - this._playT0;
      const pos = this._interpAtTime(this._recording, et);
      if (pos) {
        const cx = pos.x * canvas.width;
        const cy = pos.y * canvas.height;

        // Pulsate size and brightness
        const pulse = 0.8 + 0.2 * Math.sin(now / 100); // 0.8 → 1.0 scale
        const glow = 0.7 + 0.3 * Math.sin(now / 150); // breathing glow

        ctx.beginPath();
        ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);

        // Neon pink fill with pulsing intensity
        ctx.fillStyle = `hsl(300, 100%, ${70 + 10 * glow}%)`; // bright pink
        ctx.fill();

        // Outer glow
        ctx.shadowBlur = 15 * glow;
        ctx.shadowColor = '#ff00ff'; // magenta glow
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // -------------------- Private Helpers --------------------

  _beginRecording(tAbs) {
    this.stop(); // avoid overlap
    this._isRecording = true;
    this._points = [];
    this._t0 = tAbs;
    this._lastSampleT = 0;
    this._dispatch('fr-record-started');
  }

  _endRecording(tAbs) {
    if (!this._isRecording) return;

    const duration = Math.max(1, Math.round(tAbs - this._t0));

    if (this._points.length === 0) {
      this._points.push({ x: 0.5, y: 0.5, t: 0, type: 'down' });
    }

    const last = this._points[this._points.length - 1];
    if (last.type !== 'up') {
      this._points.push({
        x: last.x,
        y: last.y,
        t: duration,
        type: 'up',
      });
    }

    this._recording = { points: this._points.slice(), duration };
    this._isRecording = false;
    this._dispatch('fr-record-stopped', { duration });

    // Auto-exit record-ready: hide overlay + disarm so playback view is clean.
    if (this._armed) {
      this._armed = false;
      this._showOverlay = false;
      this._dispatch('fr-disarmed');
    }

    // Instantly audition what was just recorded.
    // Important: pass { loop: this._loop } so we respect the existing loop setting.
    this.play(this._recording, { loop: this._loop });
  }


  _drawPath(ctx, points, canvas) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const cx = p.x * canvas.width;
      const cy = p.y * canvas.height;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
  }

  _interpAtTime(rec, t) {
    const pts = rec.points;
    if (!pts.length) return null;
    if (t <= pts[0].t) return { x: pts[0].x, y: pts[0].y };
    if (t >= rec.duration) {
      const last = pts[pts.length - 1];
      return { x: last.x, y: last.y };
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (t <= b.t) {
        const u = (t - a.t) / (b.t - a.t || 1);
        return {
          x: a.x + (b.x - a.x) * u,
          y: a.y + (b.y - a.y) * u,
        };
      }
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
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