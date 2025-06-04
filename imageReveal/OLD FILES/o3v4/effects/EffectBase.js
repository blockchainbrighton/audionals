/**
 * @abstract Base class for visual effects.
 */
export default class EffectBase {
  /**
   * Registry of available effects.
   * @type {Array<new (...args:any[])=>EffectBase>}
   */
  static registry = [];

  /**
   * Register an effect so the app can discover it.
   * @param {new (...args:any[])=>EffectBase} cls
   */
  static register(cls) {
    if (!this.registry.includes(cls)) this.registry.push(cls);
  }

  /**
   * @param {HTMLImageElement} image
   * @param {HTMLCanvasElement} canvas
   * @param {number} intensity 0‒1
   */
  constructor(image, canvas, intensity = 1) {
    /** @protected */ this.image = image;
    /** @protected */ this.canvas = canvas;
    /** @protected */ this.ctx = canvas.getContext('2d');
    /** @protected */ this.intensity = intensity;
  }
  /** Lifecycle hook */
  init() {}
  /** @param {number} t 0‒1 progress */
  update(t) {}
  /** Render current frame */
  render() {}
}
