/* eslint-disable no-underscore-dangle */
class PathRecApp extends HTMLElement {
  #dispatch = (t, d = {}) => this.dispatchEvent(new CustomEvent(t, { detail: d, bubbles: true, composed: true }));

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this.state = {
      isArmed: false,
      isRecording: false,
      isPlaying: false,
      recording: null, // { points: Array<{x, y, t, type:'down'|'move'|'up'}>, duration: number }
      playbackStartTime: 0,
      playbackAnimationId: null,
      currentPlaybackIndex: 0
    };

    // Bind methods
    this.arm = this.arm.bind(this);
    this.disarm = this.disarm.bind(this);
    this.clear = this.clear.bind(this);
    this.getRecording = this.getRecording.bind(this);
    this.play = this.play.bind(this);
    this.stop = this.stop.bind(this);
    this.renderOverlay = this.renderOverlay.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this._playbackTick = this._playbackTick.bind(this);

    // Recording state
    this._recordingStartTime = 0;
    this._recordingPoints = [];
    this._lastRecordedTime = 0;
    this._throttleInterval = 16; // ~60fps throttling for move events
  }

  connectedCallback() {
    // No UI needed - this is a headless component
    this.shadowRoot.innerHTML = '<div style="display:none;"></div>';
  }

  disconnectedCallback() {
    this.stop();
  }

  // Public API methods
  arm() {
    if (this.state.isRecording || this.state.isPlaying) return;
    this.state.isArmed = true;
    this.#dispatch('fr-armed');
  }

  disarm() {
    if (this.state.isRecording) this._stopRecording();
    this.state.isArmed = false;
    this.#dispatch('fr-disarmed');
  }

  clear() {
    this.stop();
    this.state.recording = null;
    this.#dispatch('fr-cleared');
  }

  getRecording() {
    return this.state.recording;
  }

  play() {
    if (!this.state.recording || this.state.isPlaying || this.state.isRecording) return;
    
    this.state.isPlaying = true;
    this.state.playbackStartTime = performance.now();
    this.state.currentPlaybackIndex = 0;
    this.#dispatch('fr-play-started');
    this._playbackTick();
  }

  stop() {
    if (this.state.isRecording) {
      this._stopRecording();
    }
    
    if (this.state.isPlaying) {
      this.state.isPlaying = false;
      if (this.state.playbackAnimationId) {
        cancelAnimationFrame(this.state.playbackAnimationId);
        this.state.playbackAnimationId = null;
      }
      this.#dispatch('fr-play-stopped');
    }
  }

  // Pointer event handlers (to be called from parent)
  handlePointerDown(normalizedX, normalizedY) {
    if (!this.state.isArmed || this.state.isRecording || this.state.isPlaying) return false;
    
    this._startRecording(normalizedX, normalizedY);
    return true; // Indicate we handled the event
  }

  handlePointerMove(normalizedX, normalizedY) {
    if (!this.state.isRecording) return false;
    
    this._recordPoint(normalizedX, normalizedY, 'move');
    return true;
  }

  handlePointerUp(normalizedX, normalizedY) {
    if (!this.state.isRecording) return false;
    
    this._recordPoint(normalizedX, normalizedY, 'up');
    this._stopRecording();
    return true;
  }

  handlePointerCancel() {
    if (this.state.isRecording) {
      this._stopRecording();
      return true;
    }
    return false;
  }

  // Private methods
  _startRecording(x, y) {
    this.state.isRecording = true;
    this._recordingStartTime = performance.now();
    this._recordingPoints = [];
    this._lastRecordedTime = 0;
    
    // Record the initial down point
    this._recordPoint(x, y, 'down');
    this.#dispatch('fr-record-started');
  }

  _recordPoint(x, y, type) {
    const now = performance.now();
    const t = now - this._recordingStartTime;
    
    // Throttle move events to avoid too many points
    if (type === 'move' && (t - this._lastRecordedTime) < this._throttleInterval) {
      return;
    }
    
    this._recordingPoints.push({
      x: Math.max(0, Math.min(1, x)), // Clamp to [0,1]
      y: Math.max(0, Math.min(1, y)), // Clamp to [0,1]
      t,
      type
    });
    
    this._lastRecordedTime = t;
  }

  _stopRecording() {
    if (!this.state.isRecording) return;
    
    this.state.isRecording = false;
    
    // Create the recording object
    const duration = this._recordingPoints.length > 0 
      ? this._recordingPoints[this._recordingPoints.length - 1].t 
      : 0;
    
    this.state.recording = {
      points: [...this._recordingPoints],
      duration
    };
    
    this._recordingPoints = [];
    this.#dispatch('fr-record-stopped');
  }

  _playbackTick() {
    if (!this.state.isPlaying || !this.state.recording) return;
    
    const now = performance.now();
    const elapsed = now - this.state.playbackStartTime;
    const points = this.state.recording.points;
    
    // Find the current point(s) to interpolate between
    let currentIndex = this.state.currentPlaybackIndex;
    
    // Advance to the next point if we've passed its time
    while (currentIndex < points.length - 1 && elapsed >= points[currentIndex + 1].t) {
      currentIndex++;
    }
    
    this.state.currentPlaybackIndex = currentIndex;
    
    // Check if playback is complete
    if (elapsed >= this.state.recording.duration) {
      this.stop();
      return;
    }
    
    // Continue playback
    this.state.playbackAnimationId = requestAnimationFrame(this._playbackTick);
  }

  // Get current playback position for rendering
  getCurrentPlaybackPosition() {
    if (!this.state.isPlaying || !this.state.recording) return null;
    
    const now = performance.now();
    const elapsed = now - this.state.playbackStartTime;
    const points = this.state.recording.points;
    
    if (points.length === 0) return null;
    
    // Find current point
    let currentIndex = 0;
    while (currentIndex < points.length - 1 && elapsed >= points[currentIndex + 1].t) {
      currentIndex++;
    }
    
    // If we're at the last point or there's only one point
    if (currentIndex >= points.length - 1) {
      return points[points.length - 1];
    }
    
    // Interpolate between current and next point
    const current = points[currentIndex];
    const next = points[currentIndex + 1];
    const progress = (elapsed - current.t) / (next.t - current.t);
    
    return {
      x: current.x + (next.x - current.x) * progress,
      y: current.y + (next.y - current.y) * progress,
      t: elapsed,
      type: 'interpolated'
    };
  }

  // Render overlay on canvas
  renderOverlay(ctx, canvasWidth, canvasHeight) {
    if (!ctx) return;
    
    // Render recorded path if it exists and we're not recording
    if (this.state.recording && !this.state.isRecording) {
      this._renderRecordedPath(ctx, canvasWidth, canvasHeight);
    }
    
    // Render live recording path
    if (this.state.isRecording && this._recordingPoints.length > 1) {
      this._renderLiveRecordingPath(ctx, canvasWidth, canvasHeight);
    }
    
    // Render playback cursor
    if (this.state.isPlaying) {
      this._renderPlaybackCursor(ctx, canvasWidth, canvasHeight);
    }
  }

  _renderRecordedPath(ctx, canvasWidth, canvasHeight) {
    const points = this.state.recording.points;
    if (points.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const first = points[0];
    ctx.moveTo(first.x * canvasWidth, first.y * canvasHeight);
    
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
    }
    
    ctx.stroke();
    ctx.restore();
  }

  _renderLiveRecordingPath(ctx, canvasWidth, canvasHeight) {
    if (this._recordingPoints.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const first = this._recordingPoints[0];
    ctx.moveTo(first.x * canvasWidth, first.y * canvasHeight);
    
    for (let i = 1; i < this._recordingPoints.length; i++) {
      const point = this._recordingPoints[i];
      ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
    }
    
    ctx.stroke();
    ctx.restore();
  }

  _renderPlaybackCursor(ctx, canvasWidth, canvasHeight) {
    const pos = this.getCurrentPlaybackPosition();
    if (!pos) return;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    
    const x = pos.x * canvasWidth;
    const y = pos.y * canvasHeight;
    const radius = 8;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

customElements.define('path-rec-app', PathRecApp);
export { PathRecApp };

