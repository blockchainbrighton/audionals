const SampleLoader = require('../audio/SampleLoader');

/**
 * SamplerChannel represents a channel that plays back audio samples.
 * It wraps a Tone.Player or Tone.Sampler instance, stores gain
 * and pan values and maintains mute/solo flags. Additional
 * effects can be connected to the underlying player.
 */
class SamplerChannel {
  constructor() {
    this.sampleLoader = new SampleLoader();
    this.player = null;
    this.gain = 1;
    this.pan = 0;
    this.mute = false;
    this.solo = false;
    this.effects = [];
  }

  /**
   * Load a sample and assign the resulting player. Returns a promise
   * that resolves with the player instance.
   */
  async loadSample(src) {
    this.player = await this.sampleLoader.loadSample(src);
    return this.player;
  }

  /**
   * Trigger the sample at the given transport time. If the channel
   * is muted the trigger is ignored.
   */
  trigger(time) {
    if (this.mute) return;
    if (this.player && typeof this.player.start === 'function') {
      this.player.start(time);
    }
  }

  setGain(value) {
    this.gain = value;
    if (this.player) {
      this.player.volume = value;
    }
  }
  setPan(value) {
    this.pan = value;
  }

  /**
   * Connect an array of effects (stubs for now). The chain is
   * simply stored; real audio routing would be implemented in a
   * full environment.
   */
  connectEffects(effectsArray) {
    this.effects = effectsArray || [];
  }

  disconnectEffects() {
    this.effects = [];
  }

  /**
   * Serialize the channel settings. The underlying player is not
   * serialized.
   */
  serialize() {
    return JSON.stringify({
      gain: this.gain,
      pan: this.pan,
      mute: this.mute,
      solo: this.solo,
    });
  }

  /**
   * Restore the channel settings from a serialized state.
   */
  deserialize(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    this.gain = obj.gain;
    this.pan = obj.pan;
    this.mute = obj.mute;
    this.solo = obj.solo;
  }
}

module.exports = SamplerChannel;