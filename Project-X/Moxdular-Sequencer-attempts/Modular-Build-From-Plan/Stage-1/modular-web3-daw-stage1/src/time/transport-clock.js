/**
 * @fileoverview TransportClock for managing musical time.
 */

/**
 * A mock TransportClock for managing musical time.
 */
export class TransportClock {
  constructor() {
    this.currentTime = 0; // in seconds
    this.tempo = 120; // in BPM
    this.isPlaying = false;
  }

  /**
   * Starts the clock.
   */
  start() {
    this.isPlaying = true;
    console.log("TransportClock started.");
  }

  /**
   * Stops the clock.
   */
  stop() {
    this.isPlaying = false;
    console.log("TransportClock stopped.");
  }

  /**
   * Sets the current time of the clock.
   * @param {number} timeInSeconds
   */
  seek(timeInSeconds) {
    this.currentTime = timeInSeconds;
    console.log(`TransportClock seeked to ${timeInSeconds} seconds.`);
  }

  /**
   * Sets the tempo of the clock.
   * @param {number} bpm
   */
  setTempo(bpm) {
    this.tempo = bpm;
    console.log(`TransportClock tempo set to ${bpm} BPM.`);
  }

  /**
   * Advances the clock by a given delta time.
   * @param {number} deltaTimeInSeconds
   */
  advance(deltaTimeInSeconds) {
    if (this.isPlaying) {
      this.currentTime += deltaTimeInSeconds;
    }
  }

  /**
   * Returns the current time in seconds.
   * @returns {number}
   */
  getCurrentTime() {
    return this.currentTime;
  }

  /**
   * Returns the current tempo in BPM.
   * @returns {number}
   */
  getTempo() {
    return this.tempo;
  }
}


