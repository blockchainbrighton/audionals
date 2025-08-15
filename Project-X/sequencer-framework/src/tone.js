const EventEmitter = require('events');

/**
 * A very lightweight stub of the Tone.js API used throughout the
 * sequencer framework. This implementation does not generate any
 * audio but provides the shape of the real library so that unit tests
 * can spy on scheduling calls and instrument triggers. Only the
 * methods and properties actually exercised by the framework are
 * implemented here.
 */

class Transport extends EventEmitter {
  constructor() {
    super();
    // BPM is exposed as an object with a value property just like in
    // Tone.js. In the real library this is a Signal which can be
    // automated. Here we simply store the value.
    this.bpm = {
      value: 120,
      set: (v) => {
        this.bpm.value = v;
      },
    };
    this.state = 'stopped';
    // Internal list of scheduled timers so that they can be cleared
    // when the transport is stopped.
    this._scheduled = [];
    this._startTime = null;
  }

  /**
   * Start the transport. In the real Tone.js this method
   * accepts optional parameters to set a start time and offset.
   * For this stub we simply flip the state flag and emit an event.
   */
  start() {
    if (this.state === 'started') return this;
    this.state = 'started';
    this._startTime = Date.now() / 1000;
    this.emit('start');
    return this;
  }

  /**
   * Stop the transport. Clears any scheduled timers and emits the
   * stop event. In Tone.js there is also a pause state which we do
   * not model here.
   */
  stop() {
    if (this.state === 'stopped') return this;
    this.state = 'stopped';
    // clear all scheduled timeouts and intervals
    this._scheduled.forEach((id) => clearTimeout(id));
    this._scheduled.forEach((id) => clearInterval(id));
    this._scheduled = [];
    this.emit('stop');
    return this;
  }

  /**
   * Schedule a callback to occur at a specific transport time.
   * The time argument is in seconds relative to the transport. The
   * callback receives the scheduled time as its only argument.
   */
  schedule(callback, time) {
    const delay = Math.max(0, (time - this.now()) * 1000);
    const id = setTimeout(() => {
      callback(time);
    }, delay);
    this._scheduled.push(id);
    return id;
  }

  /**
   * Return the current transport time in seconds. Tone.js uses its
   * own internal clock; for the purposes of testing we rely on
   * wall‑clock time. Because the transport may be started after
   * instantiation we subtract the start time when available.
   */
  now() {
    if (this._startTime === null) {
      return Date.now() / 1000;
    }
    return Date.now() / 1000 - this._startTime;
  }
}

class Loop {
  /**
   * Create a loop that repeatedly invokes a callback at a given
   * interval (in seconds). The callback receives the current time
   * as its only argument. The loop does not begin until start()
   * is invoked.
   */
  constructor(callback, interval) {
    this.callback = callback;
    this.interval = interval;
    this._id = null;
  }

  /**
   * Start the loop. You can optionally provide a start time but
   * it is ignored in this stub. The callback will be called
   * immediately and then repeatedly after each interval.
   */
  start() {
    if (this._id) return this;
    // call once immediately
    this.callback(Tone.now());
    this._id = setInterval(() => {
      this.callback(Tone.now());
    }, this.interval * 1000);
    // Track the interval so that it can be cleared later
    return this;
  }

  /**
   * Stop the loop and clear any scheduled intervals.
   */
  stop() {
    if (this._id) {
      clearInterval(this._id);
      this._id = null;
    }
    return this;
  }

  /**
   * Alias dispose to stop for convenience.
   */
  dispose() {
    return this.stop();
  }
}

class Sequence {
  /**
   * Create a sequence that iterates over an array of events at a
   * fixed subdivision. On each tick the callback is invoked with
   * the current time and the corresponding event. In this stub
   * sequence, start() must be called manually to begin iteration.
   */
  constructor(callback, events, interval) {
    this.callback = callback;
    this.events = Array.isArray(events) ? events : [];
    this.interval = interval || 0;
    this._id = null;
    this._index = 0;
  }

  start() {
    if (this._id) return this;
    this._id = setInterval(() => {
      const event = this.events[this._index % this.events.length];
      const time = Tone.now();
      this.callback(time, event);
      this._index += 1;
    }, this.interval * 1000);
    return this;
  }

  stop() {
    if (this._id) {
      clearInterval(this._id);
      this._id = null;
    }
    return this;
  }
}

class Player extends EventEmitter {
  constructor(urlOrOptions) {
    super();
    if (typeof urlOrOptions === 'string') {
      this.url = urlOrOptions;
    } else if (urlOrOptions && typeof urlOrOptions === 'object') {
      this.url = urlOrOptions.url;
    }
    this.autostart = false;
  }
  connect(dest) {
    this.destination = dest;
    return this;
  }
  /**
   * Start playback of the buffer. In the real library the time
   * parameter schedules playback; here we simply emit an event so
   * that tests can spy on it.
   */
  start(time = 0) {
    this.emit('start', time);
  }
  stop() {}
}

class Sampler extends EventEmitter {
  constructor(samples) {
    super();
    this.samples = samples || {};
  }
  connect(dest) {
    this.destination = dest;
    return this;
  }
  triggerAttack(note, time = 0, velocity = 1) {
    this.emit('trigger', note, time, velocity);
  }
  triggerRelease(note, time = 0) {
    this.emit('release', note, time);
  }
  triggerAttackRelease(note, duration, time = 0, velocity = 1) {
    this.emit('trigger', note, time, velocity);
  }
}

class Synth extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
    this.type = 'synth';
  }
  connect(dest) {
    this.destination = dest;
    return this;
  }
  triggerAttack(note, time = 0, velocity = 1) {
    this.emit('triggerAttack', note, time, velocity);
  }
  triggerRelease(note, time = 0) {
    this.emit('triggerRelease', note, time);
  }
  triggerAttackRelease(note, duration, time = 0, velocity = 1) {
    this.emit('triggerAttackRelease', note, duration, time, velocity);
  }
}

class FMSynth extends Synth {
  constructor(options) {
    super(options);
    this.type = 'fm';
  }
}

class AMSynth extends Synth {
  constructor(options) {
    super(options);
    this.type = 'am';
  }
}

class PolySynth extends Synth {
  constructor(options) {
    super(options);
    this.type = 'poly';
  }
}

const Tone = {
  /** The global transport instance used for scheduling. */
  Transport: new Transport(),
  /** Stub for Tone.start(), which resolves immediately in our tests. */
  start: () => Promise.resolve(),
  /** Return the current global time in seconds. */
  now: () => Date.now() / 1000,
  Loop,
  Sequence,
  Player,
  Sampler,
  Synth,
  FMSynth,
  AMSynth,
  PolySynth,
  /** The default audio destination. For our purposes this does nothing. */
  destination: {
    connect() {
      /* no‑op for tests */
    },
  },
};

module.exports = Tone;