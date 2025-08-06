// Mode A bundle: registers all custom elements from version A.
// Import shared utilities and Tone loader once.
import './util.js';
import './tone-loader.js';

// Import Mode A components. The modules themselves define and register
// custom elements with unique tag names to avoid clashing with other modes.
import './mode-a/osc-controls.js';
import './mode-a/scope-canvas.js';
import './mode-a/osc-app.js';