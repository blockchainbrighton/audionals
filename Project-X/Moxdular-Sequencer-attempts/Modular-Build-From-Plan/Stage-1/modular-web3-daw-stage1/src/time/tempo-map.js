/**
 * @fileoverview TempoMap for managing tempo changes over time.
 */

/**
 * A simple TempoMap that stores tempo changes at specific times.
 */
export class TempoMap {
  constructor() {
    /**
     * @type {Array<{time: number, bpm: number}>}
     */
    this.points = [{ time: 0, bpm: 120 }]; // Default starting tempo
  }

  /**
   * Adds a tempo change point.
   * @param {number} timeInSeconds
   * @param {number} bpm
   */
  addTempoPoint(timeInSeconds, bpm) {
    this.points.push({ time: timeInSeconds, bpm: bpm });
    this.points.sort((a, b) => a.time - b.time);
  }

  /**
   * Gets the tempo at a given time.
   * @param {number} timeInSeconds
   * @returns {number}
   */
  getTempoAtTime(timeInSeconds) {
    let currentBpm = 120; // Default if no points before timeInSeconds
    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].time <= timeInSeconds) {
        currentBpm = this.points[i].bpm;
      } else {
        break;
      }
    }
    return currentBpm;
  }

  /**
   * Gets all tempo points.
   * @returns {Array<{time: number, bpm: number}>}
   */
  getTempoPoints() {
    return [...this.points];
  }
}


