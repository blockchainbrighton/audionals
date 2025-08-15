/**
 * A tiny assertion library used by the unit tests. Provides
 * assert() and assertEqual() functions along with a spy helper
 * for counting invocations of object methods.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

/**
 * Create a spy on a method of an object. The original method is
 * wrapped so that calls are recorded. The returned object
 * includes a list of calls and a restore() method to revert
 * the spying.
 */
function spy(target, methodName) {
  const original = target[methodName];
  const calls = [];
  target[methodName] = function (...args) {
    calls.push(args);
    if (typeof original === 'function') {
      return original.apply(this, args);
    }
  };
  return {
    calls,
    restore() {
      target[methodName] = original;
    },
  };
}

module.exports = { assert, assertEqual, spy };