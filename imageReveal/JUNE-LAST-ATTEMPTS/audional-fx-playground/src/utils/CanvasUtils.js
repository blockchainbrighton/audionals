/**
 * Canvas Utilities
 * Helper functions for canvas operations and rendering
 */

export const CanvasUtils = {
  /**
   * Clear canvas and draw source canvas to destination
   * @param {CanvasRenderingContext2D} dst - Destination context
   * @param {CanvasRenderingContext2D} src - Source context
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  clearAndDraw: (dst, src, width, height) => {
    dst.clearRect(0, 0, width, height);
    dst.drawImage(src.canvas, 0, 0, width, height);
  },

  /**
   * Get canvas from context
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @returns {HTMLCanvasElement} Canvas element
   */
  canvasFromContext: ctx => ctx?.canvas,

  /**
   * Set global property temporarily and execute function
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} property - Property name
   * @param {*} value - Property value
   * @param {Function} fn - Function to execute
   */
  setGlobalTemporary: (ctx, property, value, fn) => {
    const original = ctx[property];
    ctx[property] = value;
    fn();
    ctx[property] = (property === 'globalCompositeOperation') ? 'source-over' : 
                    (property === 'globalAlpha') ? 1 : original;
  },

  /**
   * Create a new canvas with specified dimensions
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Canvas context options
   * @returns {Object} Object with canvas and context
   */
  createCanvas: (width, height, options = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', options);
    return { canvas, context };
  },

  /**
   * Resize canvas and maintain content
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   * @param {boolean} preserveContent - Whether to preserve existing content
   */
  resizeCanvas: (canvas, newWidth, newHeight, preserveContent = false) => {
    if (preserveContent) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
  },

  /**
   * Get pixel data from canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width of area
   * @param {number} height - Height of area
   * @returns {ImageData} Pixel data
   */
  getPixelData: (ctx, x = 0, y = 0, width = ctx.canvas.width, height = ctx.canvas.height) => {
    return ctx.getImageData(x, y, width, height);
  },

  /**
   * Put pixel data to canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {ImageData} imageData - Pixel data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  putPixelData: (ctx, imageData, x = 0, y = 0) => {
    ctx.putImageData(imageData, x, y);
  },

  /**
   * Create radial gradient
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x0 - Start circle x
   * @param {number} y0 - Start circle y
   * @param {number} r0 - Start circle radius
   * @param {number} x1 - End circle x
   * @param {number} y1 - End circle y
   * @param {number} r1 - End circle radius
   * @param {Array} colorStops - Array of {offset, color} objects
   * @returns {CanvasGradient} Gradient object
   */
  createRadialGradient: (ctx, x0, y0, r0, x1, y1, r1, colorStops) => {
    const gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    colorStops.forEach(stop => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  },

  /**
   * Create linear gradient
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x0 - Start x
   * @param {number} y0 - Start y
   * @param {number} x1 - End x
   * @param {number} y1 - End y
   * @param {Array} colorStops - Array of {offset, color} objects
   * @returns {CanvasGradient} Gradient object
   */
  createLinearGradient: (ctx, x0, y0, x1, y1, colorStops) => {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    colorStops.forEach(stop => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  },

  /**
   * Apply blur filter with padding to avoid edge artifacts
   * @param {CanvasRenderingContext2D} srcCtx - Source context
   * @param {CanvasRenderingContext2D} dstCtx - Destination context
   * @param {number} radius - Blur radius
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  applyBlurWithPadding: (srcCtx, dstCtx, radius, width, height) => {
    if (radius < 0.1) {
      dstCtx.clearRect(0, 0, width, height);
      if (srcCtx.canvas !== dstCtx.canvas) {
        dstCtx.drawImage(srcCtx.canvas, 0, 0, width, height);
      }
      if (dstCtx.filter !== 'none') {
        dstCtx.filter = 'none';
      }
      return;
    }

    const pad = Math.max(0, Math.ceil(radius * 2) + 2);
    if (pad === 0) {
      dstCtx.clearRect(0, 0, width, height);
      dstCtx.filter = `blur(${radius}px)`;
      if (srcCtx.canvas !== dstCtx.canvas) {
        dstCtx.drawImage(srcCtx.canvas, 0, 0, width, height);
      }
      dstCtx.filter = 'none';
      return;
    }

    // Create temporary canvas with padding
    const tempWidth = width + 2 * pad;
    const tempHeight = height + 2 * pad;
    const { canvas: tempCanvas, context: tempCtx } = CanvasUtils.createCanvas(tempWidth, tempHeight);

    const prevSmoothing = tempCtx.imageSmoothingEnabled;
    tempCtx.imageSmoothingEnabled = false;

    // Draw main image with padding
    tempCtx.clearRect(0, 0, tempWidth, tempHeight);
    tempCtx.drawImage(srcCtx.canvas, pad, pad, width, height);

    // Fill padding areas by extending edges
    if (height > 0) {
      tempCtx.drawImage(srcCtx.canvas, 0, 0, width, 1, pad, 0, width, pad);
      tempCtx.drawImage(srcCtx.canvas, 0, height - 1, width, 1, pad, height + pad, width, pad);
    }
    if (width > 0) {
      tempCtx.drawImage(srcCtx.canvas, 0, 0, 1, height, 0, pad, pad, height);
      tempCtx.drawImage(srcCtx.canvas, width - 1, 0, 1, height, width + pad, pad, pad, height);
    }
    if (width > 0 && height > 0) {
      tempCtx.drawImage(srcCtx.canvas, 0, 0, 1, 1, 0, 0, pad, pad);
      tempCtx.drawImage(srcCtx.canvas, width - 1, 0, 1, 1, width + pad, 0, pad, pad);
      tempCtx.drawImage(srcCtx.canvas, 0, height - 1, 1, 1, 0, height + pad, pad, pad);
      tempCtx.drawImage(srcCtx.canvas, width - 1, height - 1, 1, 1, width + pad, height + pad, pad, pad);
    }

    tempCtx.imageSmoothingEnabled = prevSmoothing;

    // Apply blur and draw back
    dstCtx.clearRect(0, 0, width, height);
    dstCtx.filter = `blur(${radius}px)`;
    dstCtx.drawImage(tempCanvas, -pad, -pad, tempWidth, tempHeight);
    dstCtx.filter = 'none';
  }
};

export default CanvasUtils;

