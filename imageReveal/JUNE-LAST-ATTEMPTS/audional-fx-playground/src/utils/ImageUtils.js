/**
 * Image Utilities
 * Helper functions for image loading, processing, and manipulation
 */

export const ImageUtils = {
  /**
   * Load an image from URL with Promise support
   * @param {string} url - Image URL
   * @param {string} crossOrigin - Cross-origin setting
   * @returns {Promise<HTMLImageElement>} Promise that resolves to loaded image
   */
  loadImage: (url, crossOrigin = 'anonymous') => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = crossOrigin;
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  },

  /**
   * Load multiple images concurrently
   * @param {Array<string>} urls - Array of image URLs
   * @param {string} crossOrigin - Cross-origin setting
   * @returns {Promise<Array<HTMLImageElement>>} Promise that resolves to array of loaded images
   */
  loadImages: async (urls, crossOrigin = 'anonymous') => {
    const promises = urls.map(url => ImageUtils.loadImage(url, crossOrigin));
    return Promise.all(promises);
  },

  /**
   * Compose PFP with badge overlay
   * @param {HTMLImageElement} pfpImage - Main profile image
   * @param {HTMLImageElement} badgeImage - Badge image to overlay
   * @param {Object} badgeRect - Badge position and size {x, y, w, h} (normalized 0-1)
   * @param {number} outputSize - Output canvas size (default 1024)
   * @returns {string} Data URL of composed image
   */
  composePFPWithBadge: (pfpImage, badgeImage, badgeRect = { x: 0.42, y: 0.18, w: 0.17, h: 0.17 }, outputSize = 1024) => {
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    
    // Draw main image
    ctx.drawImage(pfpImage, 0, 0, outputSize, outputSize);
    
    // Draw badge if provided
    if (badgeImage) {
      ctx.drawImage(
        badgeImage,
        badgeRect.x * outputSize,
        badgeRect.y * outputSize,
        badgeRect.w * outputSize,
        badgeRect.h * outputSize
      );
    }
    
    return canvas.toDataURL();
  },

  /**
   * Create image from data URL
   * @param {string} dataUrl - Data URL string
   * @returns {Promise<HTMLImageElement>} Promise that resolves to image
   */
  createImageFromDataURL: (dataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  },

  /**
   * Get image aspect ratio
   * @param {HTMLImageElement} image - Image element
   * @returns {number} Aspect ratio (width/height)
   */
  getAspectRatio: (image) => {
    return image.naturalWidth / image.naturalHeight;
  },

  /**
   * Calculate fitted dimensions for image within container
   * @param {HTMLImageElement} image - Image element
   * @param {number} containerWidth - Container width
   * @param {number} containerHeight - Container height
   * @param {string} fit - Fit mode ('contain' or 'cover')
   * @returns {Object} Object with {width, height, x, y} for positioning
   */
  calculateFittedDimensions: (image, containerWidth, containerHeight, fit = 'contain') => {
    const aspectRatio = ImageUtils.getAspectRatio(image);
    const containerAspectRatio = containerWidth / containerHeight;
    
    let width, height;
    
    if (fit === 'contain') {
      if (aspectRatio > containerAspectRatio) {
        width = containerWidth;
        height = containerWidth / aspectRatio;
      } else {
        width = containerHeight * aspectRatio;
        height = containerHeight;
      }
    } else if (fit === 'cover') {
      if (aspectRatio > containerAspectRatio) {
        width = containerHeight * aspectRatio;
        height = containerHeight;
      } else {
        width = containerWidth;
        height = containerWidth / aspectRatio;
      }
    }
    
    const x = (containerWidth - width) / 2;
    const y = (containerHeight - height) / 2;
    
    return { width, height, x, y };
  },

  /**
   * Draw image fitted within canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {HTMLImageElement} image - Image to draw
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @param {string} fit - Fit mode ('contain' or 'cover')
   * @param {string} backgroundColor - Background color
   */
  drawImageFitted: (ctx, image, canvasWidth, canvasHeight, fit = 'contain', backgroundColor = '#000') => {
    // Clear and fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate fitted dimensions
    const { width, height, x, y } = ImageUtils.calculateFittedDimensions(
      image, canvasWidth, canvasHeight, fit
    );
    
    // Draw image
    ctx.drawImage(image, x, y, width, height);
  },

  /**
   * Convert canvas to blob
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} type - MIME type (default 'image/png')
   * @param {number} quality - Quality for lossy formats (0-1)
   * @returns {Promise<Blob>} Promise that resolves to blob
   */
  canvasToBlob: (canvas, type = 'image/png', quality = 0.92) => {
    return new Promise(resolve => {
      canvas.toBlob(resolve, type, quality);
    });
  },

  /**
   * Download canvas as image file
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} filename - Download filename
   * @param {string} type - MIME type
   * @param {number} quality - Quality for lossy formats
   */
  downloadCanvas: async (canvas, filename = 'image.png', type = 'image/png', quality = 0.92) => {
    const blob = await ImageUtils.canvasToBlob(canvas, type, quality);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
};

export default ImageUtils;

