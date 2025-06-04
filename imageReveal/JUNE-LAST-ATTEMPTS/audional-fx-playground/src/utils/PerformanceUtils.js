/**
 * Performance Utilities
 * Functions for monitoring and optimizing application performance
 */

export const PerformanceUtils = {
  /**
   * FPS monitoring state
   */
  _fpsState: {
    frames: 0,
    lastCheck: performance.now(),
    lastFps: 60,
    lastWarn: 0,
    frameSkip: 0,
    autoThrottle: false,
    lastFrameTime: 16
  },

  /**
   * Initialize performance monitoring
   * @param {Object} options - Configuration options
   */
  init: (options = {}) => {
    const state = PerformanceUtils._fpsState;
    state.autoThrottle = options.autoThrottle ?? false;
    state.targetFps = options.targetFps ?? 60;
    state.warningThreshold = options.warningThreshold ?? 30;
    state.maxFrameSkip = options.maxFrameSkip ?? 2;
  },

  /**
   * Update FPS counter and handle throttling
   * @returns {Object} Performance metrics
   */
  updateFPS: () => {
    const state = PerformanceUtils._fpsState;
    const now = performance.now();
    
    state.frames++;
    
    // Calculate FPS every second
    if (now - state.lastCheck >= 1000) {
      state.lastFps = state.frames;
      state.frames = 0;
      state.lastCheck = now;
      
      // Auto-throttling logic
      if (state.autoThrottle) {
        if (state.lastFps < state.warningThreshold) {
          state.frameSkip = Math.min(state.frameSkip + 1, state.maxFrameSkip);
          
          // Warn about performance issues
          if (now - state.lastWarn > 5000) {
            console.warn(`[Performance] Low FPS detected: ${state.lastFps}fps, enabling frame skip: ${state.frameSkip}`);
            state.lastWarn = now;
          }
        } else if (state.lastFps > state.targetFps * 0.9 && state.frameSkip > 0) {
          state.frameSkip = Math.max(state.frameSkip - 1, 0);
        }
      }
    }
    
    // Calculate frame time
    state.lastFrameTime = now - (state.lastFrameCheck || now);
    state.lastFrameCheck = now;
    
    return {
      fps: state.lastFps,
      frameTime: state.lastFrameTime,
      frameSkip: state.frameSkip,
      shouldSkipFrame: state.autoThrottle && (state.frames % (state.frameSkip + 1)) !== 0
    };
  },

  /**
   * Get current performance metrics
   * @returns {Object} Current performance state
   */
  getMetrics: () => {
    const state = PerformanceUtils._fpsState;
    return {
      fps: state.lastFps,
      frameTime: state.lastFrameTime,
      frameSkip: state.frameSkip,
      autoThrottle: state.autoThrottle
    };
  },

  /**
   * Memory usage monitoring
   * @returns {Object} Memory usage information
   */
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  },

  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @param {string} label - Label for the measurement
   * @returns {*} Function result
   */
  measure: (fn, label = 'Operation') => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Measure async function execution time
   * @param {Function} fn - Async function to measure
   * @param {string} label - Label for the measurement
   * @returns {Promise<*>} Function result
   */
  measureAsync: async (fn, label = 'Async Operation') => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Execute immediately on first call
   * @returns {Function} Debounced function
   */
  debounce: (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Request animation frame with fallback
   * @param {Function} callback - Callback function
   * @returns {number} Request ID
   */
  requestFrame: (callback) => {
    return window.requestAnimationFrame || 
           window.webkitRequestAnimationFrame || 
           window.mozRequestAnimationFrame || 
           ((cb) => setTimeout(cb, 16));
  },

  /**
   * Cancel animation frame with fallback
   * @param {number} id - Request ID
   */
  cancelFrame: (id) => {
    const cancel = window.cancelAnimationFrame || 
                   window.webkitCancelAnimationFrame || 
                   window.mozCancelAnimationFrame || 
                   clearTimeout;
    cancel(id);
  },

  /**
   * Check if device has high performance capabilities
   * @returns {boolean} True if high performance device
   */
  isHighPerformanceDevice: () => {
    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 1;
    
    // Check for device memory (if available)
    const memory = navigator.deviceMemory || 4;
    
    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const hasWebGL = !!gl;
    
    return cores >= 4 && memory >= 4 && hasWebGL;
  },

  /**
   * Get recommended performance settings based on device
   * @returns {Object} Recommended settings
   */
  getRecommendedSettings: () => {
    const isHighPerf = PerformanceUtils.isHighPerformanceDevice();
    
    return {
      autoThrottle: !isHighPerf,
      targetFPS: isHighPerf ? 60 : 30,
      maxFrameSkip: isHighPerf ? 1 : 3,
      enableComplexEffects: isHighPerf,
      bufferOptimization: !isHighPerf
    };
  }
};

export default PerformanceUtils;

