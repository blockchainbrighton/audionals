/**
 * Utilities Module Exports
 * Central export point for all utility modules
 */

import MathUtils from './MathUtils.js';
import CanvasUtils from './CanvasUtils.js';
import ImageUtils from './ImageUtils.js';
import PerformanceUtils from './PerformanceUtils.js';

export { MathUtils, CanvasUtils, ImageUtils, PerformanceUtils };

// Combined utilities object for convenience
const Utils = {
  math: MathUtils,
  canvas: CanvasUtils,
  image: ImageUtils,
  performance: PerformanceUtils
};

// Legacy compatibility - export math utils directly as 'utils'
const utils = MathUtils;

export { Utils, utils };
export default Utils;

