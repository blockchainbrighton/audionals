/**
 * @fileoverview Simple assertion library for testing.
 */

export const assert = {
  /**
   * Asserts that a condition is true.
   * @param {boolean} condition
   * @param {string} message
   */
  ok(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  },

  /**
   * Asserts that two values are strictly equal.
   * @param {any} actual
   * @param {any} expected
   * @param {string} message
   */
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
  },

  /**
   * Asserts that two values are deeply equal.
   * @param {any} actual
   * @param {any} expected
   * @param {string} message
   */
  deepEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Assertion failed: ${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },

  /**
   * Asserts that a function throws an error.
   * @param {Function} fn
   * @param {string} message
   */
  throws(fn, message) {
    let thrown = false;
    try {
      fn();
    } catch (e) {
      thrown = true;
    }
    if (!thrown) {
      throw new Error(`Assertion failed: ${message}. Function did not throw.`);
    }
  },

  /**
   * Asserts that a value is approximately equal to another within a tolerance.
   * @param {number} actual
   * @param {number} expected
   * @param {number} tolerance
   * @param {string} message
   */
  approx(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`Assertion failed: ${message}. Expected ${actual} to be approx ${expected} (tolerance ${tolerance})`);
    }
  }
};


