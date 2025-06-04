/**
 * Base Effect Class
 * Abstract base class for all visual effects
 */

import { MathUtils } from '../../utils/index.js';

export class BaseEffect {
  /**
   * Create a new effect instance
   * @param {string} name - Effect name
   * @param {Object} defaults - Default parameters
   */
  constructor(name, defaults = {}) {
    this.name = name;
    this.defaults = { ...defaults };
    this.parameters = this.cloneDefaults();
    this.enabled = false;
    this.order = 0;
  }

  /**
   * Clone default parameters
   * @returns {Object} Cloned defaults
   */
  cloneDefaults() {
    return structuredClone(this.defaults);
  }

  /**
   * Reset effect to default state
   */
  reset() {
    this.parameters = this.cloneDefaults();
    this.enabled = false;
  }

  /**
   * Enable the effect
   */
  enable() {
    this.enabled = true;
    this.parameters.active = true;
  }

  /**
   * Disable the effect
   */
  disable() {
    this.enabled = false;
    this.parameters.active = false;
  }

  /**
   * Set effect parameter
   * @param {string} param - Parameter name
   * @param {*} value - Parameter value
   */
  setParameter(param, value) {
    if (this.parameters.hasOwnProperty(param)) {
      this.parameters[param] = value;
    } else {
      console.warn(`[Effect] Unknown parameter '${param}' for effect '${this.name}'`);
    }
  }

  /**
   * Get effect parameter
   * @param {string} param - Parameter name
   * @returns {*} Parameter value
   */
  getParameter(param) {
    return this.parameters[param];
  }

  /**
   * Update effect parameters (for animation)
   * @param {number} currentTime - Current time in seconds
   * @param {Object} elapsed - Elapsed time information
   */
  update(currentTime, elapsed) {
    if (!this.enabled || !this.parameters.active) return;

    // Update progress for effects that use it
    if (this.parameters.hasOwnProperty('progress') && 
        this.parameters.hasOwnProperty('direction') && 
        this.parameters.hasOwnProperty('speed') &&
        !this.parameters.paused) {
      
      const deltaTime = currentTime - (this.lastUpdateTime || currentTime);
      this.lastUpdateTime = currentTime;
      
      this.parameters.progress += this.parameters.direction * this.parameters.speed * deltaTime;
      this.parameters.progress = MathUtils.clamp(this.parameters.progress, 0, 1);
    }

    // Call effect-specific update logic
    this.onUpdate(currentTime, elapsed);
  }

  /**
   * Effect-specific update logic (override in subclasses)
   * @param {number} currentTime - Current time in seconds
   * @param {Object} elapsed - Elapsed time information
   */
  onUpdate(currentTime, elapsed) {
    // Override in subclasses
  }

  /**
   * Render the effect
   * @param {CanvasRenderingContext2D} srcCtx - Source context
   * @param {CanvasRenderingContext2D} dstCtx - Destination context
   * @param {number} currentTime - Current time in seconds
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  render(srcCtx, dstCtx, currentTime, width, height) {
    if (!this.enabled || !this.parameters.active) {
      // Pass through unchanged
      dstCtx.clearRect(0, 0, width, height);
      dstCtx.drawImage(srcCtx.canvas, 0, 0, width, height);
      return;
    }

    // Call effect-specific render logic
    this.onRender(srcCtx, dstCtx, currentTime, width, height);
  }

  /**
   * Effect-specific render logic (must be implemented in subclasses)
   * @param {CanvasRenderingContext2D} srcCtx - Source context
   * @param {CanvasRenderingContext2D} dstCtx - Destination context
   * @param {number} currentTime - Current time in seconds
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  onRender(srcCtx, dstCtx, currentTime, width, height) {
    throw new Error(`Effect '${this.name}' must implement onRender method`);
  }

  /**
   * Get effect metadata for UI generation
   * @returns {Object} Effect metadata
   */
  getMetadata() {
    return {
      name: this.name,
      category: this.category || 'misc',
      description: this.description || '',
      parameters: this.getParameterMetadata()
    };
  }

  /**
   * Get parameter metadata for UI generation
   * @returns {Object} Parameter metadata
   */
  getParameterMetadata() {
    // Override in subclasses to provide UI metadata
    return {};
  }

  /**
   * Serialize effect state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      name: this.name,
      enabled: this.enabled,
      order: this.order,
      parameters: { ...this.parameters }
    };
  }

  /**
   * Deserialize effect state
   * @param {Object} state - Serialized state
   */
  deserialize(state) {
    this.enabled = state.enabled || false;
    this.order = state.order || 0;
    this.parameters = { ...this.defaults, ...state.parameters };
  }

  /**
   * Clone the effect
   * @returns {BaseEffect} Cloned effect
   */
  clone() {
    const cloned = new this.constructor();
    cloned.parameters = structuredClone(this.parameters);
    cloned.enabled = this.enabled;
    cloned.order = this.order;
    return cloned;
  }
}

export default BaseEffect;

