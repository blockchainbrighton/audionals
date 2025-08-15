const EventEmitter = require('events');
const Tone = require('../tone');

/**
 * AudioContextManager wraps the Tone.js context and transport to provide
 * lifecycle control. It ensures that the Tone context is started only
 * after an explicit user gesture (start() call) and re‑emits transport
 * state changes. Consumers should call init() once at application
 * startup and then use the singleton instance.
 */
class AudioContextManager extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.started = false;
  }

  /**
   * Initialise the audio context. Accepts optional context options
   * which are ignored by the stub but provided for future compatibility.
   * Returns a promise which resolves immediately.
   */
  async init(contextOptions = {}) {
    if (this.initialized) return;
    this.initialized = true;
    // In a real implementation you might create a new AudioContext
    // here. Our Tone stub has a single global transport, so nothing
    // additional is required.
    // Re‑emit transport state changes
    Tone.Transport.on('start', () => this.emit('running'));
    Tone.Transport.on('stop', () => this.emit('stopped'));
    return;
  }

  /**
   * Start the audio context and transport. Tone.js requires a user
   * gesture to begin audio playback; this method wraps Tone.start()
   * and returns a promise which resolves when the context is ready.
   */
  async start() {
    if (!this.initialized) {
      await this.init();
    }
    if (this.started) return;
    await Tone.start();
    Tone.Transport.start();
    this.started = true;
  }

  /**
   * Stop the transport. This does not destroy the context; calling
   * start() again will resume playback.
   */
  stop() {
    Tone.Transport.stop();
    this.started = false;
  }

  /**
   * Set the transport tempo in beats per minute. The bpm property
   * is a Signal in Tone.js; here we simply assign the value.
   */
  setBpm(bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  /**
   * Return the current context time in seconds.
   */
  now() {
    return Tone.Transport.now();
  }

  /**
   * Expose the underlying transport for advanced scheduling.
   */
  getTransport() {
    return Tone.Transport;
  }
}

// Export a singleton instance so that all modules share the same
// transport and context. This mirrors Tone.js's single global context.
module.exports = new AudioContextManager();