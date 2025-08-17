/**
 * @fileoverview Mock Engine for testing purposes.
 */

export class MockEngine {
  constructor() {
    this.events = [];
  }

  /**
   * Mocks the emit method.
   * @param {string} eventName
   * @param {any} data
   */
  emit(eventName, data) {
    this.events.push({ eventName, data });
  }

  /**
   * Gets all emitted events.
   * @returns {Array<{eventName: string, data: any}>}
   */
  getEvents() {
    return this.events;
  }

  /**
   * Clears all emitted events.
   */
  clearEvents() {
    this.events = [];
  }
}


