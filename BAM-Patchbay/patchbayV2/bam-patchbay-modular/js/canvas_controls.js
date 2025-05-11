// js/canvas_controls.js
import { canvas } from './dom_elements.js';
import { state, getModule, CANVAS_WIDTH, CANVAS_HEIGHT } from './shared_state.js';
import { refreshAllLines } from './connection_manager.js';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

/**
 * Applies a zoom transformation to the canvas.
 * @param {number} zoomChange - The amount to change the zoom by (e.g., 0.1 or -0.1).
 */
export function applyZoom(zoomChange) {
    let newZoom = state.currentZoom + zoomChange;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)); // Clamp zoom level

    if (newZoom !== state.currentZoom) {
        state.currentZoom = newZoom;
        canvas.style.transform = `scale(${state.currentZoom})`;
        refreshAllLines(); // Redraw lines as connector positions appear to change
        console.log(`Canvas zoomed to: ${state.currentZoom.toFixed(1)}`);
    }
}

/**
 * Resets the canvas zoom to its default (1.0).
 */
export function resetZoom() {
    if (state.currentZoom !== 1.0) {
        state.currentZoom = 1.0;
        canvas.style.transform = `scale(${state.currentZoom})`;
        refreshAllLines();
        console.log("Canvas zoom reset.");
    }
}

/**
 * Arranges all modules on the canvas into a tidy grid.
 */
export function tidyModules() {
    const modules = Object.values(state.modules).filter(m => m.element);
    if (modules.length === 0) {
        console.log("No modules to tidy.");
        return;
    }

    // Optional: sort modules for a more predictable layout
    modules.sort((a, b) => {
        const yA = parseFloat(a.element.style.top) || 0;
        const yB = parseFloat(b.element.style.top) || 0;
        if (yA !== yB) return yA - yB; // Primary sort by current Y
        const xA = parseFloat(a.element.style.left) || 0;
        const xB = parseFloat(b.element.style.left) || 0;
        return xA - xB; // Secondary sort by current X
    });

    const PADDING = 20; // Unscaled pixels for padding between modules
    let currentX = PADDING;
    let currentY = PADDING;
    let maxRowHeight = 0;

    for (const moduleData of modules) {
        const modWidth = moduleData.element.offsetWidth; // Unscaled width
        const modHeight = moduleData.element.offsetHeight; // Unscaled height

        // Check if module fits in current row or if it's the first module in a new row
        if (currentX > PADDING && (currentX + modWidth + PADDING > CANVAS_WIDTH)) {
            // Move to next row
            currentX = PADDING;
            currentY += maxRowHeight + PADDING;
            maxRowHeight = 0;
        }

        moduleData.element.style.left = currentX + 'px';
        moduleData.element.style.top = currentY + 'px';

        currentX += modWidth + PADDING;
        maxRowHeight = Math.max(maxRowHeight, modHeight);
    }

    refreshAllLines(); // Update connection lines after all modules are moved
    console.log("Modules tidied into a grid.");
}