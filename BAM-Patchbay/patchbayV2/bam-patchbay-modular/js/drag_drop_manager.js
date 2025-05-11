// drag_drop_manager.js
import { paletteItems } from './dom_elements.js'; // Removed canvas import from here for clarity
import { state, getModule, CANVAS_WIDTH, CANVAS_HEIGHT } from './shared_state.js';
import { refreshLinesForModule } from './connection_manager.js';

/**
 * Initializes drag-from-palette and drop-onto-canvas-container functionality.
 * @param {function(string, DragEvent): void} onDropOnCanvasArea - Callback to execute
 * when a module drop event occurs on the canvas area. It receives the module type and the full DragEvent.
 */
export function initPaletteAndCanvasDragDrop(onDropOnCanvasArea) {
  const canvasContainer = document.getElementById('canvas-container'); // Target for drops
  if (!canvasContainer) {
    console.error("DragDropManager: #canvas-container not found!");
    return;
  }

  paletteItems.forEach(item => {
    item.addEventListener('dragstart', e => {
      state.dragType = item.dataset.type; // Store the type of module being dragged
      if (e.dataTransfer) {
        e.dataTransfer.setData('application/x-module-type', item.dataset.type); // Standard practice
        e.dataTransfer.effectAllowed = 'copy';
      }
      // console.log('Drag start from palette:', state.dragType);
    });
    item.addEventListener('dragend', () => {
      // console.log('Drag end from palette:', state.dragType);
      state.dragType = null; // Clear the type after drag ends
    });
  });

  // Dragover on the container (viewport) for the canvas
  canvasContainer.addEventListener('dragover', e => {
    e.preventDefault(); // Necessary to allow dropping
    if (state.dragType && e.dataTransfer) { // Check if dragging a known module type
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  });

  // Drop on the container (viewport) for the canvas
  canvasContainer.addEventListener('drop', e => {
    e.preventDefault();
    const moduleTypeFromDataTransfer = e.dataTransfer.getData('application/x-module-type');

    // Verify that we are indeed dropping a module from the palette
    // (state.dragType is set on dragstart from palette)
    if (state.dragType && moduleTypeFromDataTransfer === state.dragType && typeof onDropOnCanvasArea === 'function') {
      // console.log('Drop on canvas container:', moduleTypeFromDataTransfer, 'Calling main.js callback.');
      
      // Call the callback provided by main.js (handleDropAndCalculatePosition)
      // It expects: moduleType (string), event (DragEvent)
      onDropOnCanvasArea(state.dragType, e); 
    } else {
      console.warn('Drop event on canvas container ignored. state.dragType:', state.dragType, 'callback defined?:', (typeof onDropOnCanvasArea === 'function'));
    }
    state.dragType = null; // Important to clear this after a drop attempt
  });
}

/**
 * Enables dragging for an individual module element.
 * Relies on CSS `transform-origin: top left` on the main canvas.
 */
export function enableModuleDrag(moduleElement, moduleId) {
  const header = moduleElement.querySelector('header');
  if (!header) {
    console.warn(`Module ${moduleId} missing header, cannot enable drag.`);
    return;
  }

  header.addEventListener('mousedown', e => {
    // Only allow left mouse button clicks on the header to initiate drag
    if (e.button !== 0) return;
    // Prevent drag if clicking on interactive elements inside the header (if any)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
        return;
    }

    e.stopPropagation(); // Prevent event from bubbling up to canvas mousedown if any

    const modElementRect = moduleElement.getBoundingClientRect(); // Scaled rect of the module itself
    
    state.dragState.id = moduleId;
    // Store offset of the click relative to the module's top-left, in UNCALED coordinates
    state.dragState.unscaledOffsetX = (e.clientX - modElementRect.left) / state.currentZoom;
    state.dragState.unscaledOffsetY = (e.clientY - modElementRect.top) / state.currentZoom;
    
    moduleElement.style.zIndex = '1000';
    // console.log(`Dragging module ${moduleId} started. Offset X: ${state.dragState.unscaledOffsetX.toFixed(2)}, Y: ${state.dragState.unscaledOffsetY.toFixed(2)}`);
  });
}

/**
 * Handles moving of modules on the canvas.
 * Attached to document to capture mouse movements anywhere after drag starts.
 */
function handleModuleMouseMove(e) {
  if (!state.dragState.id) return; // Not currently dragging a module

  const moduleData = getModule(state.dragState.id);
  if (!moduleData || !moduleData.element) {
    // console.warn("Dragging module not found or element missing:", state.dragState.id);
    state.dragState.id = null; // Clear invalid drag state
    return;
  }

  const modElement = moduleData.element;
  const canvasEl = document.getElementById('canvas'); // The main, large, scalable canvas
  if (!canvasEl) {
      console.error("handleModuleMouseMove: #canvas element not found!");
      return;
  }
  const canvasRect = canvasEl.getBoundingClientRect(); // Scaled rect of the main canvas

  // Mouse position relative to the viewport's top-left
  const mouseX_viewport = e.clientX;
  const mouseY_viewport = e.clientY;

  // Mouse position relative to the main canvas's (scaled) top-left corner
  const mouseX_on_scaled_canvas = mouseX_viewport - canvasRect.left;
  const mouseY_on_scaled_canvas = mouseY_viewport - canvasRect.top;
  
  // Convert this position to UNCALED coordinates on the main canvas
  const unscaled_target_mouseX_on_canvas = mouseX_on_scaled_canvas / state.currentZoom;
  const unscaled_target_mouseY_on_canvas = mouseY_on_scaled_canvas / state.currentZoom;

  // Calculate the new top-left for the module's UNCALED position
  // by subtracting the initial click offset (also unscaled)
  let newUnscaledX = unscaled_target_mouseX_on_canvas - state.dragState.unscaledOffsetX;
  let newUnscaledY = unscaled_target_mouseY_on_canvas - state.dragState.unscaledOffsetY;

  // Constrain the module to stay within the UNCALED canvas bounds
  // modElement.offsetWidth/Height are its unscaled dimensions
  newUnscaledX = Math.max(0, Math.min(CANVAS_WIDTH - modElement.offsetWidth, newUnscaledX));
  newUnscaledY = Math.max(0, Math.min(CANVAS_HEIGHT - modElement.offsetHeight, newUnscaledY));

  modElement.style.left = newUnscaledX + 'px';
  modElement.style.top = newUnscaledY + 'px';

  refreshLinesForModule(state.dragState.id);
}

/**
 * Handles releasing a dragged module.
 * Attached to document to capture mouse up anywhere.
 */
function handleModuleMouseUp(e) {
  if (!state.dragState.id) return;

  const moduleData = getModule(state.dragState.id);
  if (moduleData && moduleData.element) {
    moduleData.element.style.zIndex = ''; // Reset z-index
  }
  // console.log(`Dragging module ${state.dragState.id} ended.`);
  state.dragState.id = null; // Clear drag state
}

// Attach document-level listeners for dragging existing modules
document.addEventListener('mousemove', handleModuleMouseMove);
document.addEventListener('mouseup', handleModuleMouseUp);