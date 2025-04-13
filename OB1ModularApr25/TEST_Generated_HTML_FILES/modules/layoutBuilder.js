// layoutBuilder.js

// --- Imports ---
import { createElement } from './utils/domUtils.js'; // Import from utils
import { createControlsColumn } from './controlsColumn.js'; // Import the new function

/**
 * Builds the main application layout and appends it to the target container.
 * Moves the existing audio metadata into the correct column.
 * @param {string|HTMLElement} targetSelectorOrElement - The CSS selector or DOM element to append the layout to.
 */
export function buildLayout(targetSelectorOrElement) {
    const targetElement = typeof targetSelectorOrElement === 'string'
        ? document.querySelector(targetSelectorOrElement)
        : targetSelectorOrElement;

    if (!targetElement) {
        console.error('Layout Builder: Target element not found.');
        return;
    }

    // --- Find Existing Elements ---
    const audioMetadataDiv = targetElement.querySelector('.audio-metadata');
    if (!audioMetadataDiv) {
        console.warn('Layout Builder: .audio-metadata element not found. It will not be included.');
    }

    // Clear the target container if needed (use with caution)
    // targetElement.innerHTML = '';

    // --- Create Column 1: Controls (using the imported function) ---
    const controlsColumn = createControlsColumn();
    console.log("Layout Builder: Controls column created via controlsColumn.js.");

    // --- Create Column 2: Image (using imported createElement) ---
    const imageArea = createElement('div', { className: 'image-area' }, [
        createElement('img', { id: 'main-image', src: '#', alt: 'Audional Art OB1 Visual', title: 'Click to toggle tempo loop' })
    ]);

    // --- Create Column 3: Reference (using imported createElement) ---
    const referenceColumn = createElement('div', { className: 'reference-column hidden' }, [
        createElement('div', { id: 'reference-panel', className: 'reference-panel' }) // Content populated later by JS
    ]);

    // --- Assemble Main Layout ---
    const mainLayout = createElement('div', { className: 'main-layout' }, [
        controlsColumn,
        imageArea,
        referenceColumn
    ]);

     // --- Move Existing Metadata ---
    // This logic MUST remain here to coordinate
    if (audioMetadataDiv) {
        // Find the placeholder *within the column returned by createControlsColumn*
        const placeholder = controlsColumn.querySelector('.metadata-placeholder');
        if (placeholder) {
            // Replace placeholder with the actual metadata div
            placeholder.parentNode.replaceChild(audioMetadataDiv, placeholder);
            console.log("Layout Builder: Moved audio metadata into placeholder.");
        } else {
            // This indicates an issue in createControlsColumn if the placeholder is missing
            console.error('Layout Builder: .metadata-placeholder not found within the created controls column. Metadata not moved.');
            // As a fallback, insert it somewhere, maybe after title bar:
            // controlsColumn.insertBefore(audioMetadataDiv, controlsColumn.children[1]);
        }
    }

    // --- Append to Target ---
    targetElement.appendChild(mainLayout);

    console.log("Layout built successfully using modular components.");
}

// Removed the internal createElement function definition from here