// js/main.js

/**
 * Main entry point for the application bundle.
 * The order of imports matters here. We import `setup.js` first
 * to ensure all initial DOM manipulation and styling is complete
 * before the application modules load.
 */

// Import the setup script to run first
import './setup.js';

// Import the rest of the application modules
import './osc-hotkeys.js';
import './worklet/aw-bridge.js';
import './engine.js';
import './shapes.js';
import './scope-canvas.js';
import './osc-app.js';
import './seq-app.js';
import './hk-icons.js';
import './controls-visibility.js';