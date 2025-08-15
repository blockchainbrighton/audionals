const Tone = require('../tone');

/**
 * StepSequencerCore maintains a grid of steps organised by channel
 * and step index. Each cell may contain note information or be
 * empty (null). The sequencer schedules a loop on the transport
 * that iterates over each step and invokes registered callbacks
 * whenever an active cell is encountered.
 */
class StepSequencerCore {
  constructor(numChannels = 1, stepsPerBar = 16) {
    this.numChannels = numChannels;
    this.stepsPerBar = stepsPerBar;
    // patterns[channel][step] = cell data or null
    this.patterns = Array.from({ length: numChannels }, () =>
      Array.from({ length: stepsPerBar }, () => null)
    );
    this.stepCallbacks = [];
    this.loop = null;
  }

  /**
   * Factory method to create a new sequencer. Provided for symmetry
   * with the specification.
   */
  static create(numChannels, stepsPerBar) {
    return new StepSequencerCore(numChannels, stepsPerBar);
  }

  /**
   * Toggle a step on or off. If value is undefined the state is
   * inverted; otherwise a truthy value turns the step on and a
   * falsy value turns it off. When turned on, a simple object is
   * stored which can later be extended with velocity, pitch, etc.
   */
  toggleStep(channel, step, value) {
    const current = this.patterns[channel][step];
    if (typeof value === 'undefined') {
      this.patterns[channel][step] = current ? null : { on: true };
    } else {
      this.patterns[channel][step] = value ? { on: true } : null;
    }
  }

  /**
   * Replace the entire pattern for a given channel.
   */
  setPattern(channel, patternArray) {
    this.patterns[channel] = patternArray;
  }

  /**
   * Register a callback to be invoked whenever a step is reached.
   * The callback receives an object containing channel, step, cell
   * data and the time at which the step occurred.
   */
  onStep(callback) {
    this.stepCallbacks.push(callback);
  }

  /**
   * Schedule the sequencer on the transport. Internally a
   * Tone.Loop is created which iterates over the grid at a
   * uniform interval. The interval is one division of a bar
   * (quarter note by default). Each iteration advances the
   * current step index and triggers callbacks for active cells.
   */
  schedule() {
    // Determine the length of each step in seconds relative to
    // transport time. A bar is 4 beats; divide by steps per bar.
    const stepDuration = 4 / this.stepsPerBar;
    let stepIndex = 0;
    this.loop = new Tone.Loop((time) => {
      // For each channel, if the current cell is on, invoke callbacks
      for (let ch = 0; ch < this.numChannels; ch++) {
        const cell = this.patterns[ch][stepIndex];
        if (cell) {
          this.stepCallbacks.forEach((cb) =>
            cb({ channel: ch, step: stepIndex, cell, time })
          );
        }
      }
      stepIndex = (stepIndex + 1) % this.stepsPerBar;
    }, stepDuration);
    this.loop.start();
  }

  /**
   * Clear all patterns to their default (off) state.
   */
  clear() {
    this.patterns = Array.from({ length: this.numChannels }, () =>
      Array.from({ length: this.stepsPerBar }, () => null)
    );
  }

  /**
   * Serialize the internal state to a JSON string. This is useful
   * for saving patterns and later reloading them.
   */
  serialize() {
    return JSON.stringify({
      numChannels: this.numChannels,
      stepsPerBar: this.stepsPerBar,
      patterns: this.patterns,
    });
  }

  /**
   * Restore state from a serialized representation.
   */
  deserialize(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    this.numChannels = obj.numChannels;
    this.stepsPerBar = obj.stepsPerBar;
    this.patterns = obj.patterns;
  }
}

module.exports = StepSequencerCore;