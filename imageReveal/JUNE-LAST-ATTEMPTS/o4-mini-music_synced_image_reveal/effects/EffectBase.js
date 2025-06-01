/**
 * @fileoverview Abstract base class for all effects
 */

export class EffectBase {
  /**
   * @param {Object} options
   * @param {number} options.seed - Seed for deterministic randomness
   * @param {number} options.intensity - Effect intensity from 0 to 1
   */
  constructor({ seed = Date.now(), intensity = 0.5 } = {}) {
    this.seed = seed;
    this.intensity = intensity;
    this.prng = this._createPRNG(seed);
  }

  /**
   * Create a simple mulberry32 PRNG based on seed
   * @param {number} seed
   * @returns {function(): number}
   */
  _createPRNG(seed) {
    return function() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Initialize effect with image data or other precomputed features
   * @param {ImageBitmap} image
   */
  init(image) {
    // Optional override
  }

  /**
   * Render the effect for a given progress [0, 1]
   * @param {CanvasRenderingContext2D} ctx
   * @param {ImageBitmap} image
   * @param {number} progress
   */
  render(ctx, image, progress) {
    throw new Error('render() must be implemented in subclass');
  }
}
