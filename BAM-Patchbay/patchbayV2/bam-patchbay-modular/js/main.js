// main.js
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
import { createModule } from './module_factory/module_factory.js'; // Import createModule here

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log("Audio Modular Synthesizer Initializing...");

  // This function will be called by drag_drop_manager when a module is dropped
  const handleModuleCreationRequest = (type, x, y) => {
    if (type && x !== undefined && y !== undefined) {
      const newModule = createModule(type, x, y);
      if (newModule) {
        console.log(`Module ${newModule.type} created at ${x}, ${y}`);
      } else {
        console.warn(`Failed to create module of type: ${type}`);
      }
    } else {
        console.error("Invalid parameters for module creation request:", type, x, y);
    }
  };

  // Pass the handler to the drag and drop initializer
  initPaletteAndCanvasDragDrop(handleModuleCreationRequest);

  // Example: Pre-load an output module (this still works as intended)
  // handleModuleCreationRequest('output', 500, 100); 
  // or directly:
  // createModule('output', 500, 100);


  console.log("Initialization Complete.");
});