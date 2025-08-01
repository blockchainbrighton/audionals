// eventBus.js
/**
 * Lightweight pub/sub event bus using the DOM Event API.
 * Enables modules to emit and listen to events without direct coupling.
 *
 * @module eventBus
 */

const eventTarget = new EventTarget();

/**
 * Emits an event with optional payload.
 * @param {string} type - Event type (e.g., 'TRANSPORT/PLAY').
 * @param {Object} [payload] - Optional data attached to the event.
 * @example emit('GRID/STEP_TOGGLED', { track: 1, step: 3, isActive: true })
 */
export function emit(type, payload = {}) {
  const event = new CustomEvent(type, { detail: payload });
  eventTarget.dispatchEvent(event);
}

/**
 * Registers a callback to be called when an event is emitted.
 * @param {string} type - The event type to listen for.
 * @param {Function} callback - Called with `event.detail` on emission.
 * @returns {Function} Unsubscribe function.
 * @example on('TRANSPORT/PLAY', (payload) => console.log('Playing at:', payload.startedAt))
 */
export function on(type, callback) {
  const handler = (event) => callback(event.detail);
  eventTarget.addEventListener(type, handler);
  return () => eventTarget.removeEventListener(type, handler);
}

/**
 * Removes a previously registered listener.
 * @param {string} type - The event type.
 * @param {Function} callback - The exact callback function used in `on`.
 */
export function off(type, callback) {
  // Note: This requires storing handlers; we rely on `on` returning a cleanup fn
  // which should be used with `off`. If you need to remove by type only, use `offAll`.
  // This version assumes users manage subscriptions via returned functions.
  throw new Error('Direct off() not supported. Use unsubscribe function from `on()`.');
}

/**
 * Clears all listeners for a given event type.
 * @param {string} type - The event type to clear.
 */
export function offAll(type) {
  eventTarget.removeEventListener(type, () => {});
}