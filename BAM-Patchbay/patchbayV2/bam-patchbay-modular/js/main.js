// main.js
import { initPaletteAndCanvasDragDrop } from './drag_drop_manager.js';
import { createModule } from './module_factory/module_factory.js';
import { clearAllModules } from './module_manager.js';
import { applyZoom, resetZoom, tidyModules } from './canvas_controls.js';
import { state, getMasterBpm, setMasterBpm } from './shared_state.js'; // For accessing state.currentZoom
import { audioCtx } from './audio_context.js';


document.addEventListener('DOMContentLoaded', () => {
  console.log("Audio Modular Synthesizer Initializing...");

  // Get references to key DOM elements once
  const canvasEl = document.getElementById('canvas'); // The large, scalable canvas
  // const canvasContainerEl = document.getElementById('canvas-container'); // The scrollable viewport (drop target)

  // New: Apply initial zoom based on shared state
  if (canvasEl) {
    canvasEl.style.transform = `scale(${state.currentZoom})`;
    console.log(`Initial canvas zoom set to: ${state.currentZoom.toFixed(2)}`);
  } else {
    console.error("Initialization Error: Main #canvas element not found in DOM.");
  }

  // Canvas Actions
  const clearAllButton = document.getElementById('clear-all-btn');
  if (clearAllButton) {
    clearAllButton.addEventListener('click', () => {
      if (confirm("Are you sure you want to remove ALL modules from the canvas?")) {
        clearAllModules();
      }
    });
  }

  const zoomInButton = document.getElementById('zoom-in-btn');
  if (zoomInButton) {
    zoomInButton.addEventListener('click', () => applyZoom(0.1));
  }

  const zoomOutButton = document.getElementById('zoom-out-btn');
  if (zoomOutButton) {
    zoomOutButton.addEventListener('click', () => applyZoom(-0.1));
  }

  const resetZoomButton = document.getElementById('reset-zoom-btn');
  if (resetZoomButton) {
    resetZoomButton.addEventListener('click', resetZoom);
  }

  const tidyGridButton = document.getElementById('tidy-grid-btn');
  if (tidyGridButton) {
    tidyGridButton.addEventListener('click', tidyModules);
  }

  const masterBpmInput = document.getElementById('master-bpm-input');

    if (masterBpmInput) {
        // Initialize the input field with the current master BPM from the state
        masterBpmInput.value = getMasterBpm();

        masterBpmInput.addEventListener('input', (event) => {
            const newBpmValue = event.target.value;
            const validatedBpm = setMasterBpm(newBpmValue);
            // If validation changed the value (e.g., clamped it or reverted), update the input field
            if (parseFloat(newBpmValue) !== validatedBpm && event.target.value !== validatedBpm.toString()) {
                event.target.value = validatedBpm;
            }
        });

        // Optional: Add a 'blur' event to re-validate or reset if the user leaves an invalid value
        masterBpmInput.addEventListener('blur', (event) => {
            const currentVal = parseInt(event.target.value, 10);
            const minBpm = parseInt(masterBpmInput.min, 10);
            const maxBpm = parseInt(masterBpmInput.max, 10);

            if (isNaN(currentVal) || currentVal < minBpm || currentVal > maxBpm) {
                // If value is invalid after leaving the field, reset to current master BPM
                event.target.value = getMasterBpm();
                // No need to call setMasterBpm again if it resets to the already set masterBpm
            } else {
                // If value is valid but different (e.g. user typed 120.5, input event might have set 120)
                // ensure it's correctly set in state. The 'input' event should mostly handle this.
                setMasterBpm(event.target.value);
            }
        });
    } else {
        console.error("Master BPM input element ('master-bpm-input') not found!");
    }

  /**
   * The final step: creates a module at the given UNCALED x, y coordinates.
   * This function expects x and y to be coordinates on the large, unscaled canvas.
   */
  const handleModuleCreationRequest = async (type, x, y) => {
    if (type && x !== undefined && y !== undefined) {
      try {
        const newModuleData = await createModule(type, x, y);
        if (newModuleData) {
          console.log(`Module ${newModuleData.type} (ID: ${newModuleData.id}) created at ${x.toFixed(0)}, ${y.toFixed(0)} (unscaled)`);
        } else {
          console.warn(`Failed to create module of type: ${type}`);
        }
      } catch (error) {
        console.error(`Error creating module of type ${type}:`, error);
      }
    } else {
        console.error("Invalid parameters for module creation request:", { type, x, y });
    }
  };

  /**
   * Handles the drop event on the canvas area (likely #canvas-container).
   * Calculates the correct unscaled coordinates on the #canvas element,
   * accounting for zoom and scroll, then requests module creation.
   *
   * This function should be called by initPaletteAndCanvasDragDrop
   * with the module type and the raw DOM drop event.
   *
   * @param {string} type - The type of module to create (e.g., "oscillator").
   * @param {DragEvent} event - The raw DOM drop event object.
   */
  const handleDropAndCalculatePosition = (type, event) => {
    if (!type || !event) {
        console.error("handleDropAndCalculatePosition: Missing module type or event object.", {type, event});
        return;
    }
    if (!canvasEl) { // canvasEl is already defined in the outer scope
        console.error("handleDropAndCalculatePosition: The main #canvas element was not found in the DOM.");
        return;
    }

    event.preventDefault(); // Important to prevent default drop behavior

    // Get the current on-screen position and dimensions of the large #canvas element.
    // getBoundingClientRect() accounts for transforms (like scale) and parent scrolling.
    const canvasRect = canvasEl.getBoundingClientRect();

    // Mouse position relative to the viewport (browser window)
    const mouseX_viewport = event.clientX;
    const mouseY_viewport = event.clientY;

    // Calculate mouse position relative to the #canvas element's own top-left corner.
    // This gives us coordinates on the *scaled* canvas.
    const mouseX_on_scaled_canvas = mouseX_viewport - canvasRect.left;
    const mouseY_on_scaled_canvas = mouseY_viewport - canvasRect.top;

    // Convert these scaled coordinates to *unscaled* coordinates on the large canvas.
    // These are the coordinates that module.style.left and module.style.top will use.
    const finalX = mouseX_on_scaled_canvas / state.currentZoom;
    const finalY = mouseY_on_scaled_canvas / state.currentZoom;

    console.log(`Drop details: Type=${type}, ViewportXY=(${mouseX_viewport},${mouseY_viewport}), CanvasRectLR=(${canvasRect.left.toFixed(2)},${canvasRect.top.toFixed(2)}), OnScaledCanvasXY=(${mouseX_on_scaled_canvas.toFixed(2)},${mouseY_on_scaled_canvas.toFixed(2)}), Zoom=${state.currentZoom.toFixed(2)}, FinalUnscaledXY=(${finalX.toFixed(2)},${finalY.toFixed(2)})`);

    // Now, call the function that actually creates the module with the correct unscaled coordinates.
    handleModuleCreationRequest(type, finalX, finalY);
  };

  // Initialize palette and canvas drag-and-drop functionality.
  initPaletteAndCanvasDragDrop(handleDropAndCalculatePosition);

  console.log("Initialization Complete.");
});