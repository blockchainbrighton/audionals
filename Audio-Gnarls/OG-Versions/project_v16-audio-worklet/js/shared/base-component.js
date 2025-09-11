/**
 * BaseComponent - Common functionality for all Web Components
 * 
 * Provides:
 * - Automatic method binding
 * - Event listener management with cleanup
 * - State management utilities
 * - Template rendering helpers
 * - Lifecycle management
 */

import { on, off, addEvents, removeEvents } from './utils.js';

export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    
    // Initialize component state
    this._eventListeners = new Map();
    this._boundMethods = new Set();
    this._isConnected = false;
    
    // Auto-bind methods that start with underscore or handle/on
    this._bindMethods();
    
    // Create shadow root if not already created
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
  }

  /**
   * Automatically bind methods for consistent 'this' context
   */
  _bindMethods() {
    const proto = Object.getPrototypeOf(this);
    const methodNames = Object.getOwnPropertyNames(proto)
      .filter(name => {
        if (name === 'constructor') return false;
        const descriptor = Object.getOwnPropertyDescriptor(proto, name);
        return descriptor && typeof descriptor.value === 'function' &&
               (name.startsWith('_') || name.startsWith('handle') || name.startsWith('on'));
      });

    methodNames.forEach(name => {
      if (!this._boundMethods.has(name)) {
        this[name] = this[name].bind(this);
        this._boundMethods.add(name);
      }
    });
  }

  /**
   * Enhanced event listener management with automatic cleanup
   */
  addEventListeners(target, events) {
    if (!target || !events) return;
    
    const listeners = Array.isArray(events) ? events : [events];
    const targetListeners = this._eventListeners.get(target) || [];
    
    listeners.forEach(([type, handler, options]) => {
      on(target, type, handler, options);
      targetListeners.push([type, handler, options]);
    });
    
    this._eventListeners.set(target, targetListeners);
  }

  /**
   * Remove specific event listeners
   */
  removeEventListeners(target, events) {
    if (!target || !events) return;
    
    const listeners = Array.isArray(events) ? events : [events];
    const targetListeners = this._eventListeners.get(target) || [];
    
    listeners.forEach(([type, handler, options]) => {
      off(target, type, handler, options);
      const index = targetListeners.findIndex(
        ([t, h, o]) => t === type && h === handler && o === options
      );
      if (index >= 0) {
        targetListeners.splice(index, 1);
      }
    });
    
    if (targetListeners.length === 0) {
      this._eventListeners.delete(target);
    } else {
      this._eventListeners.set(target, targetListeners);
    }
  }

  /**
   * Dispatch custom events with consistent interface
   */
  emit(type, detail = {}, options = {}) {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true,
      ...options
    });
    return this.dispatchEvent(event);
  }

  /**
   * Create DOM elements with attributes and properties
   */
  createElement(tag, attributes = {}, properties = {}) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, String(value));
      }
    });
    
    // Set properties
    Object.assign(element, properties);
    
    return element;
  }

  /**
   * Query elements within shadow root
   */
  $(selector) {
    return this.shadowRoot?.querySelector(selector) || null;
  }

  /**
   * Query all elements within shadow root
   */
  $$(selector) {
    return Array.from(this.shadowRoot?.querySelectorAll(selector) || []);
  }

  /**
   * Update component state and trigger re-render if needed
   */
  updateState(newState, shouldRender = true) {
    if (!this.state) {
      this.state = {};
    }
    
    const oldState = { ...this.state };
    Object.assign(this.state, newState);
    
    if (shouldRender && this._isConnected) {
      this.onStateChange?.(newState, oldState);
    }
  }

  /**
   * Render template with optional data
   */
  renderTemplate(template, data = {}) {
    if (typeof template === 'function') {
      return template(data);
    }
    
    // Simple template literal replacement
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
      const value = key.split('.').reduce((obj, prop) => obj?.[prop], data);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Set styles on shadow root
   */
  setStyles(styles) {
    if (!this.shadowRoot) return;
    
    let styleElement = this.shadowRoot.querySelector('style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      this.shadowRoot.prepend(styleElement);
    }
    
    styleElement.textContent = styles;
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this._isConnected = true;
    this.onConnected?.();
  }

  /**
   * Lifecycle: Disconnected from DOM
   */
  disconnectedCallback() {
    this._isConnected = false;
    this._cleanup();
    this.onDisconnected?.();
  }

  /**
   * Cleanup all event listeners and resources
   */
  _cleanup() {
    // Remove all event listeners
    this._eventListeners.forEach((listeners, target) => {
      listeners.forEach(([type, handler, options]) => {
        off(target, type, handler, options);
      });
    });
    this._eventListeners.clear();
    
    // Call custom cleanup
    this.onCleanup?.();
  }

  /**
   * Override these methods in subclasses
   */
  onConnected() {}
  onDisconnected() {}
  onCleanup() {}
  onStateChange(newState, oldState) {}
}

