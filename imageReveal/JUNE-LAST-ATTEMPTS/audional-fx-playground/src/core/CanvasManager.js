/**
 * Canvas Manager
 * Handles canvas operations and buffer management
 */

import { CanvasUtils, ImageUtils } from '../utils/index.js';
import { Config } from '../config/index.js';

export class CanvasManager {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.bufferA = null;
    this.bufferB = null;
    this.bufferCtxA = null;
    this.bufferCtxB = null;
    this.width = 0;
    this.height = 0;
  }

  /**
   * Initialize canvas manager
   */
  initialize() {
    // Canvas manager is initialized when setCanvas is called
  }

  /**
   * Set the main canvas element
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;
    this.ensureBuffers();
  }

  /**
   * Resize canvas and buffers
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    if (!this.canvas) return;

    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ensureBuffers();
  }

  /**
   * Ensure buffer canvases are properly sized
   * @private
   */
  ensureBuffers() {
    if (this.bufferA && this.bufferA.width === this.width && this.bufferA.height === this.height) {
      return;
    }

    if (!this.bufferA) {
      const bufferOptions = { 
        alpha: true, 
        willReadFrequently: Config.app.performance.bufferOptimization 
      };
      
      const bufferAData = CanvasUtils.createCanvas(this.width, this.height, bufferOptions);
      const bufferBData = CanvasUtils.createCanvas(this.width, this.height, bufferOptions);
      
      this.bufferA = bufferAData.canvas;
      this.bufferCtxA = bufferAData.context;
      this.bufferB = bufferBData.canvas;
      this.bufferCtxB = bufferBData.context;
    } else {
      this.bufferA.width = this.width;
      this.bufferA.height = this.height;
      this.bufferB.width = this.width;
      this.bufferB.height = this.height;
    }
  }

  /**
   * Draw image to canvas with proper fitting
   * @param {HTMLImageElement} image - Image to draw
   * @param {CanvasRenderingContext2D} ctx - Target context (optional, defaults to main context)
   */
  drawImage(image, ctx = this.context) {
    if (!image || !ctx) return;

    ImageUtils.drawImageFitted(
      ctx, 
      image, 
      this.width, 
      this.height, 
      'contain', 
      Config.app.canvas.backgroundColor
    );
  }

  /**
   * Clear canvas
   * @param {CanvasRenderingContext2D} ctx - Context to clear (optional, defaults to main context)
   */
  clear(ctx = this.context) {
    if (ctx) {
      ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Get canvas dimensions
   * @returns {Object} Width and height
   */
  getDimensions() {
    return {
      width: this.width,
      height: this.height
    };
  }

  /**
   * Get all contexts
   * @returns {Object} All canvas contexts
   */
  getContexts() {
    return {
      mainCtx: this.context,
      initialCtx: this.bufferCtxA,
      bufferCtxA: this.bufferCtxA,
      bufferCtxB: this.bufferCtxB
    };
  }

  /**
   * Get main canvas element
   * @returns {HTMLCanvasElement} Main canvas
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Get main context
   * @returns {CanvasRenderingContext2D} Main context
   */
  getContext() {
    return this.context;
  }

  /**
   * Save canvas as image
   * @param {string} filename - Filename for download
   * @param {string} format - Image format
   * @param {number} quality - Image quality
   */
  async saveAsImage(filename = 'audional-fx-output.png', format = 'image/png', quality = 0.92) {
    if (!this.canvas) return;
    
    await ImageUtils.downloadCanvas(this.canvas, filename, format, quality);
  }

  /**
   * Get canvas data URL
   * @param {string} format - Image format
   * @param {number} quality - Image quality
   * @returns {string} Data URL
   */
  toDataURL(format = 'image/png', quality = 0.92) {
    if (!this.canvas) return '';
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Create snapshot of current canvas state
   * @returns {ImageData} Canvas image data
   */
  createSnapshot() {
    if (!this.context) return null;
    return this.context.getImageData(0, 0, this.width, this.height);
  }

  /**
   * Restore canvas from snapshot
   * @param {ImageData} snapshot - Image data to restore
   */
  restoreSnapshot(snapshot) {
    if (!this.context || !snapshot) return;
    this.context.putImageData(snapshot, 0, 0);
  }

  /**
   * Apply filter to canvas
   * @param {string} filter - CSS filter string
   * @param {Function} drawFunction - Function to execute with filter applied
   */
  applyFilter(filter, drawFunction) {
    if (!this.context) return;
    
    const originalFilter = this.context.filter;
    this.context.filter = filter;
    drawFunction();
    this.context.filter = originalFilter;
  }

  /**
   * Set canvas smoothing
   * @param {boolean} enabled - Whether to enable smoothing
   */
  setSmoothing(enabled) {
    if (this.context) {
      this.context.imageSmoothingEnabled = enabled;
    }
    if (this.bufferCtxA) {
      this.bufferCtxA.imageSmoothingEnabled = enabled;
    }
    if (this.bufferCtxB) {
      this.bufferCtxB.imageSmoothingEnabled = enabled;
    }
  }

  /**
   * Get performance information
   * @returns {Object} Performance metrics
   */
  getPerformanceInfo() {
    return {
      canvasSize: `${this.width}x${this.height}`,
      bufferCount: 2,
      memoryUsage: this.width * this.height * 4 * 3 // 3 canvases, 4 bytes per pixel
    };
  }
}

export default CanvasManager;

