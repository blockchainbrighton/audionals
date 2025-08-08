// modules/timing-clock.js
// Master scheduler based on AudioContext.currentTime with lookahead scheduling.
// Emits step callbacks with absolute AudioContext time for click-free scheduling.

export class TimingClock {
    /**
     * @param {AudioContext} audioContext
     * @param {{bpm:number, stepsPerBar:number, bars:number, lookaheadMs:number, scheduleAheadSec:number}} opts
     */
    constructor(audioContext, {
      bpm = 120,
      stepsPerBar = 16,
      bars = 1,
      lookaheadMs = 25,
      scheduleAheadSec = 0.1
    } = {}) {
      this.ac = audioContext;
      this._bpm = bpm;
      this._stepsPerBar = stepsPerBar;
      this._bars = bars;
      this.lookaheadMs = lookaheadMs;
      this.scheduleAhead = scheduleAheadSec;
  
      this._subscribers = new Set(); // fn({ stepIndex, time })
      this._timerId = null;
      this._running = false;
  
      this._totalSteps = this._stepsPerBar * this._bars;
      this._stepDur = this._secPerBeat() / 4; // 16ths (4 steps per beat)
  
      this._nextStepIndex = 0;
      this._nextStepTime = null;
    }
  
    _secPerBeat() { return 60 / this._bpm; }
    _recalcStepDur() { this._stepDur = this._secPerBeat() / 4; }
  
    onStep(cb) { this._subscribers.add(cb); return () => this._subscribers.delete(cb); }
  
    get bpm() { return this._bpm; }
    setBpm(bpm) {
      if (!Number.isFinite(bpm) || bpm <= 0) return;
      const oldDur = this._stepDur;
      this._bpm = bpm;
      this._recalcStepDur();
      if (this._running && this._nextStepTime !== null) {
        const now = this.ac.currentTime;
        while (this._nextStepTime < now) this._nextStepTime += oldDur;
        // Nudge phase gently so change applies on next step boundary
        const delta = this._stepDur - oldDur;
        this._nextStepTime += delta;
      }
    }
  
    setLoopGeometry({ stepsPerBar, bars }) {
      if (Number.isFinite(stepsPerBar) && stepsPerBar > 0) this._stepsPerBar = stepsPerBar;
      if (Number.isFinite(bars) && bars > 0) this._bars = bars;
      this._totalSteps = this._stepsPerBar * this._bars;
      this._nextStepIndex = 0;
      this._nextStepTime = null;
    }
  
    start(startAtStep = 0) {
      if (this._running) return;
      this._running = true;
      this._recalcStepDur();
      this._nextStepIndex = Math.max(0, startAtStep % this._totalSteps);
      this._nextStepTime = this.ac.currentTime + 0.05; // small guard lead-in
      this._timerId = setInterval(() => this._tick(), this.lookaheadMs);
    }
  
    stop() {
      if (!this._running) return;
      this._running = false;
      if (this._timerId) clearInterval(this._timerId);
      this._timerId = null;
    }
  
    isRunning() { return this._running; }
  
    _emit(stepIndex, time) {
      for (const cb of this._subscribers) {
        try { cb({ stepIndex, time }); } catch (_) {}
      }
      // UI highlight signal, mirrors old behavior
      window.dispatchEvent(new CustomEvent('step', { detail: { stepIndex, time } }));
    }
  
    _tick() {
      if (!this._running) return;
      const now = this.ac.currentTime;
      const horizon = now + this.scheduleAhead;
      while (this._nextStepTime !== null && this._nextStepTime < horizon) {
        this._emit(this._nextStepIndex, this._nextStepTime);
        this._nextStepIndex = (this._nextStepIndex + 1) % this._totalSteps;
        this._nextStepTime += this._stepDur;
      }
    }
  }
  