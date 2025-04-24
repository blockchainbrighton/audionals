// js/ui.js
import { logDebug } from './debug.js';

/**
 * Creates the necessary elements for a single I/O pair (label and jack).
 * Adds required data attributes to the jack element for identification.
 *
 * @param {number} panelIndex - The index (0-8) of the panel this pair belongs to.
 * @param {'in'|'out'} jackType - The type of jack ('in' or 'out').
 * @param {number} jackIndex - The index (0 or 1) of the jack within its column (L/R).
 * @param {string} labelText - The text content for the label (e.g., 'L IN', 'R OUT').
 * @returns {HTMLElement} - The fully constructed 'io-pair' div element.
 */
function createJackPair(panelIndex, jackType, jackIndex, labelText) {
    const pair = document.createElement('div');
    pair.className = 'io-pair';

    const label = document.createElement('span');
    label.className = 'io-label';
    label.textContent = labelText;

    const jack = document.createElement('div');
    jack.className = 'jack';
    // --- Add data attributes for identification by patchCable.js ---
    jack.dataset.jackType = jackType;
    jack.dataset.jackPanel = panelIndex;
    jack.dataset.jackIndex = jackIndex;
    // Create a unique ID for easier reference (e.g., "p0-in-0", "p5-out-1")
    jack.dataset.jackId = `p${panelIndex}-${jackType}-${jackIndex}`;

    // Append elements based on type (affects visual order via CSS flexbox 'order')
    if (jackType === 'in') {
        pair.appendChild(label); // Label first for inputs
        pair.appendChild(jack);
    } else { // jackType === 'out'
        pair.appendChild(jack);  // Jack first for outputs
        pair.appendChild(label);
    }

    return pair;
}


/**
 * Creates the complete inner content structure for a single panel,
 * including I/O columns with labeled jacks and a central screen area.
 *
 * @param {number} panelIndex - The index (0-8) of the panel being created.
 * @returns {HTMLElement} - The populated 'inner-panel' div element.
 */
function createPanelContent(panelIndex) {
    const innerPanel = document.createElement('div');
    innerPanel.className = 'inner-panel';

    // --- Left I/O Column (Inputs) ---
    const leftIO = document.createElement('div');
    leftIO.className = 'io-column left-io';
    const inputLabels = ['L IN', 'R IN'];
    inputLabels.forEach((text, index) => {
        const jackPair = createJackPair(panelIndex, 'in', index, text);
        leftIO.appendChild(jackPair);
    });

    // --- Screen Area ---
    const screen = document.createElement('div');
    screen.className = 'screen';
    // screen.textContent = `Panel ${panelIndex}`; // Optional: Add identifier to screen

    // --- Right I/O Column (Outputs) ---
    const rightIO = document.createElement('div');
    rightIO.className = 'io-column right-io';
    const outputLabels = ['L OUT', 'R OUT'];
     outputLabels.forEach((text, index) => {
        const jackPair = createJackPair(panelIndex, 'out', index, text);
        rightIO.appendChild(jackPair);
    });

    // --- Assemble Inner Panel ---
    innerPanel.appendChild(leftIO);
    innerPanel.appendChild(screen);
    innerPanel.appendChild(rightIO);

    return innerPanel;
}

/**
 * Sets up the main UI grid by creating and appending panels.
 * Ensures the grid container exists before proceeding.
 * Calls helper functions to generate panel content.
 */
export function setupUI() {
    logDebug("Setting up UI grid...", 'info');

    const gridContainer = document.getElementById('grid-container');

    if (!gridContainer) {
        logDebug("Grid container element (#grid-container) not found in HTML.", 'error');
        // Consider throwing an error here or providing a more visible failure indicator
        // throw new Error("UI Setup Failed: Cannot find #grid-container.");
        return; // Stop execution if container is missing
    }

    // Clear any previous content (useful for hot-reloading or dynamic updates)
    gridContainer.innerHTML = '';

    const numberOfPanels = 9;
    logDebug(`Creating ${numberOfPanels} panels...`, 'info');

    // Use a document fragment for potentially better performance when adding multiple elements
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < numberOfPanels; i++) {
        const panelContainer = document.createElement('div');
        panelContainer.className = 'panel-container';
        panelContainer.dataset.panelId = i; // Keep panel identifier if needed elsewhere

        // Create the inner content, passing the panel's index
        const innerContent = createPanelContent(i);
        panelContainer.appendChild(innerContent);

        fragment.appendChild(panelContainer); // Add panel to the fragment
    }

    // Append all panels at once from the fragment
    gridContainer.appendChild(fragment);

    logDebug(`UI grid created with ${numberOfPanels} panels. Jacks have data attributes.`, 'success');
    logDebug("UI setup complete.", 'success');
}

// NOTE: CSS is managed externally (e.g., index.html <style> or style.css)