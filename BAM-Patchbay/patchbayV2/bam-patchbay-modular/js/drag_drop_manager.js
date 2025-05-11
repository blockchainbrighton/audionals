// drag_drop_manager.js
import { canvas, paletteItems } from './dom_elements.js';
import { state, getModule } from './shared_state.js';
// Removed: import { createModule } from './module_factory.js';
import { refreshLinesForModule } from './connection_manager.js';

/**
 * Initializes drag-from-palette and drop-onto-canvas functionality.
 * @param {function(string, number, number): void} onModuleCreateRequested - Callback to execute when a module drop event occurs.
 */
export function initPaletteAndCanvasDragDrop(onModuleCreateRequested) {
  paletteItems.forEach(item => {
    item.addEventListener('dragstart', e => {
      state.dragType = item.dataset.type;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
      }
    });
    item.addEventListener('dragend', () => {
        state.dragType = null;
    });
  });

  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  canvas.addEventListener('drop', e => {
    e.preventDefault();
    if (state.dragType && typeof onModuleCreateRequested === 'function') {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Call the provided callback instead of createModule directly
      onModuleCreateRequested(state.dragType, x, y);
      state.dragType = null;
    }
  });
}

/**
 * Enables dragging for an individual module element.
 */
export function enableModuleDrag(moduleElement, moduleId) {
  moduleElement.addEventListener('mousedown', e => {
    // Ignore right-clicks & clicks on connectors or other interactive elements like sliders
    if (e.button !== 0 || e.target.classList.contains('connector') || e.target.tagName === 'INPUT') {
      return;
    }
    const rect = moduleElement.getBoundingClientRect();
    state.dragState.id = moduleId;
    state.dragState.offsetX = e.clientX - rect.left;
    state.dragState.offsetY = e.clientY - rect.top;
    moduleElement.style.zIndex = '1000'; // Float on top while dragging
  });
}

/**
 * Handles moving of modules on the canvas.
 */
function handleModuleMouseMove(e) {
  if (!state.dragState.id) return;

  const moduleData = getModule(state.dragState.id);
  if (!moduleData) return;

  const modElement = moduleData.element;
  const canvasRect = canvas.getBoundingClientRect();

  let x = e.clientX - canvasRect.left - state.dragState.offsetX;
  let y = e.clientY - canvasRect.top - state.dragState.offsetY;

  // Keep module inside canvas bounds
  x = Math.max(0, Math.min(canvasRect.width - modElement.offsetWidth, x));
  y = Math.max(0, Math.min(canvasRect.height - modElement.offsetHeight, y));

  modElement.style.left = x + 'px';
  modElement.style.top = y + 'px';

  refreshLinesForModule(state.dragState.id); // Keep cables glued
}

/**
 * Handles releasing a dragged module.
 */
function handleModuleMouseUp() {
  if (!state.dragState.id) return;

  const moduleData = getModule(state.dragState.id);
  if (moduleData) {
    moduleData.element.style.zIndex = '';
  }
  state.dragState.id = null;
}

// Attach global listeners for module dragging
document.addEventListener('mousemove', handleModuleMouseMove);
document.addEventListener('mouseup', handleModuleMouseUp);