const Tone = require('../tone');

/**
 * EventScheduler implements a simple look‑ahead scheduling
 * mechanism. It repeatedly checks a list of events and invokes
 * callbacks for those whose scheduled time falls within a
 * configurable ahead window. A separate internal timer drives
 * the scheduling loop.
 */
class EventScheduler {
  constructor() {
    // how often to look ahead, in milliseconds
    this.lookahead = 25;
    // how far ahead to schedule callbacks, in seconds
    this.scheduleAheadTime = 0.1;
    this.events = [];
    this.timerId = null;
  }

  setLookahead(ms) {
    this.lookahead = ms;
  }
  setScheduleAheadTime(sec) {
    this.scheduleAheadTime = sec;
  }

  /**
   * Begin scheduling a list of events. Each event should have a
   * time (transport time in seconds) and a callback function.
   */
  start(events) {
    this.stop();
    // Sort the events by time to ensure correct ordering
    this.events = events.slice().sort((a, b) => a.time - b.time);
    this.timerId = setInterval(() => this._schedule(), this.lookahead);
  }

  /**
   * Internal scheduling routine. It examines the event queue and
   * executes any callbacks whose time is within the look‑ahead
   * window.
   */
  _schedule() {
    const currentTime = Tone.Transport.now();
    const aheadTime = currentTime + this.scheduleAheadTime;
    while (this.events.length && this.events[0].time <= aheadTime) {
      const event = this.events.shift();
      const delay = Math.max(0, (event.time - currentTime) * 1000);
      setTimeout(() => {
        event.callback(event.time);
      }, delay);
    }
  }

  /**
   * Stop scheduling and clear internal timers.
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

module.exports = EventScheduler;