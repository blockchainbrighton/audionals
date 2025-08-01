// eventBus.js

/**
 * @file A lightweight event bus for pub/sub communication.
 * Uses CustomEvent API for event handling.
 */

/**
 * Emits an event with optional data.
 * @param {string} eventType - The type of event to emit.
 * @param {Object} [detail=null] - Optional data to pass with the event.
 */
export function emit(eventType, detail = null) {
    const event = new CustomEvent(eventType, { detail });
    document.dispatchEvent(event);
  }
  
  /**
   * Subscribes to an event type with a handler function.
   * @param {string} eventType - The type of event to listen for.
   * @param {Function} handler - Function to call when event is emitted.
   */
  export function on(eventType, handler) {
    document.addEventListener(eventType, handler);
  }
  
  /**
   * Unsubscribes a handler from an event type.
   * @param {string} eventType - The type of event to stop listening for.
   * @param {Function} handler - The handler function to remove.
   */
  export function off(eventType, handler) {
    document.removeEventListener(eventType, handler);
  }