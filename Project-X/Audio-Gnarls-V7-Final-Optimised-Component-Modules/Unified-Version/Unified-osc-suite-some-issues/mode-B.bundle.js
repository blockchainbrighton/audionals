// Mode B bundle: registers all custom elements from version B.
// Import shared utilities and Tone loader once.
import './util.js';
import './tone-loader.js';

// Import Mode B components. These modules register their own custom
// elements with the 'mode-b-*' prefix.
import './mode-b/osc-controls.js';
import './mode-b/scope-canvas.js';
import './mode-b/osc-app.js';