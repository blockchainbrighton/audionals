/**
 * Main Application Entry Point
 * Initializes and starts the Audional FX Playground
 */

import { Application } from './core/index.js';
import { playback } from './audio/index.js';

// Global application instance
let app = null;

/**
 * Initialize the application
 * @param {Object} options - Initialization options
 */
async function init(options = {}) {
  try {
    // Create application instance
    app = new Application();
    
    // Initialize application
    await app.initialize(options);
    
    // Setup legacy playback compatibility
    playback.init(app.audioManager);
    
    // Expose to global scope for compatibility
    window.playback = playback;
    
    console.log('[Main] Application initialized successfully');
    
  } catch (error) {
    console.error('[Main] Application initialization failed:', error);
    throw error;
  }
}

/**
 * Get the application instance
 * @returns {Application|null} Application instance
 */
function getApp() {
  return app;
}

/**
 * Destroy the application
 */
function destroy() {
  if (app) {
    app.destroy();
    app = null;
  }
}

// Expose init function globally for HTML compatibility
window.__fxInit = init;

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for any image composition to complete
    setTimeout(init, 100);
  });
} else {
  // DOM already loaded, initialize immediately
  setTimeout(init, 100);
}

// Export for module usage
export { init, getApp, destroy };
export default { init, getApp, destroy };

