// main.js
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
// Import other initializers if needed, e.g., for pre-loading modules:
// import { createModule } from './module_factory.js';

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log("Audio Modular Synthesizer Initializing...");

  initPaletteAndCanvasDragDrop();

  // Example: Pre-load an output module
  // createModule('output', 500, 100);

  console.log("Initialization Complete.");
});