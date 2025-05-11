// main.js
import { audioCtx } from './audio_context.js'; // <<<--- ADD THIS IMPORT
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
import { createModule } from './module_factory/module_factory.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("Audio Modular Synthesizer Initializing...");

  // Ensure the button exists in your HTML, e.g.:
  // <button id="startAudioButton" style="position:fixed; top:10px; left:10px; z-index: 10000;">Start Audio</button>
  const startAudioButton = document.getElementById('startAudioButton');
  if (startAudioButton) { // Check if the button exists to avoid errors if it's removed from HTML
    startAudioButton.addEventListener('click', () => {
      if (audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => {
              console.log("AudioContext resumed by global button.");
              startAudioButton.style.display = 'none'; // Hide after click
          }).catch(e => console.error("Global button resume failed:", e));
      } else {
          console.log("AudioContext already running.");
          startAudioButton.style.display = 'none';
      }
    });
  } else {
    console.warn("Start Audio Button not found in HTML. AudioContext might require other user interaction to start if suspended.");
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