/**
 * @fileoverview Scheduler for timing musical events.
 */

/**
 * A basic event scheduler.
 */
export class Scheduler {
  constructor() {
    this.events = [];
    this.currentTime = 0;
  }

  /**
   * Adds an event to the scheduler.
   * @param {object} event
   * @param {number} event.time - The time in seconds when the event should occur.
   * @param {Function} event.callback - The function to call when the event occurs.
   */
  addEvent(event) {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }

  /**
   * Advances the scheduler's time and executes due events.
   * @param {number} deltaTime - The time in seconds to advance.
   */
  advanceTime(deltaTime) {
    const newTime = this.currentTime + deltaTime;
    while (this.events.length > 0 && this.events[0].time <= newTime) {
      const event = this.events.shift();
      event.callback(event.time);
    }
    this.currentTime = newTime;
  }

  /**
   * Clears all scheduled events.
   */
  clearEvents() {
    this.events = [];
  }
}


