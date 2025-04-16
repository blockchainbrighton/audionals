// // --- layoutBuilder.js ---

// // --- Imports ---
// import { createElement } from './utils.js'; // Corrected import path
// import { createControlsColumn } from './controlsColumn.js';

// --- layoutBuilder.js ---

// --- Imports ---
// Original: import { createElement } from './utils.js'; // Corrected import path
import { createElement } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0'; // Step 1 ID

// Original: import { createControlsColumn } from './controlsColumn.js';
import { createControlsColumn } from '/content/3e32adf217d579d2bb799eb5d887da79a2f0107f1b7d2ad2f7b50528e3c25289i0'; // Step 2 ID



/**
 * Builds the main application layout and appends it to the target container.
 * Moves the existing audio metadata into the correct column.
 * @param {HTMLElement} targetElement - The DOM element to append the layout to.
 */
export function buildLayout(targetElement) {
    if (!targetElement) {
        console.error('Layout Builder: Target element not provided or invalid.');
        throw new Error('Layout Builder requires a valid target element.');
    }

    // --- Find Existing Elements within the Target ---
    const audioMetadataDiv = targetElement.querySelector('.audio-metadata');
    if (!audioMetadataDiv) {
        console.warn('Layout Builder: .audio-metadata element not found within target. It will not be included.');
    } else {
        console.log("Layout Builder: Found existing .audio-metadata element.");
        // Detach it temporarily to prevent issues if targetElement is cleared
        // and to ensure it's moved correctly later.
        audioMetadataDiv.remove();
    }

    // Optional: Clear the target container before building (use if necessary)
    // targetElement.innerHTML = '';

    // --- Create Column 1: Controls (using the imported function) ---
    const controlsColumn = createControlsColumn();
    console.log("Layout Builder: Controls column created via controlsColumn.js.");

    // --- Create Column 2: Image (using imported createElement) ---
    const imageArea = createElement('div', { className: 'image-area' }, [
        createElement('img', {
            id: 'main-image',
            src: '#', // Set initial src (or placeholder)
            alt: 'Audional Art OB1 Visual',
            title: 'Click to toggle tempo loop'
            // Visibility is handled by uiUpdater after src is properly set
        })
    ]);

    // --- Create Column 3: Reference (using imported createElement) ---
    const referenceColumn = createElement('div', { className: 'reference-column hidden' }, [
        createElement('div', { id: 'reference-panel', className: 'reference-panel' }) // Content populated later
    ]);

    // --- Assemble Main Layout ---
    const mainLayout = createElement('div', { className: 'main-layout' }, [
        controlsColumn,
        imageArea,
        referenceColumn
    ]);

    // --- Move Existing Metadata (if found) ---
    if (audioMetadataDiv) {
        // Find the placeholder *within the newly created controls column*
        const placeholder = controlsColumn.querySelector('.metadata-placeholder');
        if (placeholder) {
            // Replace placeholder with the actual metadata div
            placeholder.parentNode.replaceChild(audioMetadataDiv, placeholder);
            console.log("Layout Builder: Moved audio metadata into placeholder.");
        } else {
            // Fallback if placeholder is missing in controlsColumn.js (shouldn't happen)
            console.error('Layout Builder: .metadata-placeholder not found within the created controls column. Metadata could not be placed.');
            // Insert somewhere reasonable as fallback, e.g., after title bar
            const titleBar = controlsColumn.querySelector('.title-bar');
            if (titleBar && titleBar.nextSibling) {
                 controlsColumn.insertBefore(audioMetadataDiv, titleBar.nextSibling);
            } else {
                 controlsColumn.appendChild(audioMetadataDiv); // Append at end if all else fails
            }
        }
    }

    // --- Append to Target ---
    targetElement.appendChild(mainLayout);

    console.log("Layout built successfully using modular components.");
}

// --- END OF FILE layoutBuilder.js ---