// main.js
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
import { createModule } from './module_factory/module_factory.js';
import { clearAllModules } from './module_factory/module_manager.js'; // Adjust path if needed


document.addEventListener('DOMContentLoaded', () => {
  console.log("Audio Modular Synthesizer Initializing...");

  const clearAllButton = document.getElementById('clear-all-btn');
  if (clearAllButton) {
    clearAllButton.addEventListener('click', () => {
      if (confirm("Are you sure you want to remove ALL modules from the canvas?")) {
        clearAllModules();
      }
    });
  }


  // This function will be called by drag_drop_manager when a module is dropped
  // It's now async to await the createModule call
  const handleModuleCreationRequest = async (type, x, y) => {
    if (type && x !== undefined && y !== undefined) {
      try {
        // Await the module creation, as createModule is now async
        const newModuleData = await createModule(type, x, y); // newModuleData is the object from shared_state
        if (newModuleData) {
          console.log(`Module ${newModuleData.type} (ID: ${newModuleData.id}) created at ${x}, ${y}`);
        } else {
          console.warn(`Failed to create module of type: ${type}`);
        }
      } catch (error) {
        console.error(`Error creating module of type ${type}:`, error);
      }
    } else {
        console.error("Invalid parameters for module creation request:", type, x, y);
    }
  };

  // Pass the handler to the drag and drop initializer
  initPaletteAndCanvasDragDrop(handleModuleCreationRequest);

  console.log("Initialization Complete.");
});