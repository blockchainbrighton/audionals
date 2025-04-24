// js/ui.js
import { logDebug } from './debug.js';
// Import module creation functions and accessors from app.js
import { createSynthModule, createDelayModule, createFilterModule, removeModuleInstance, getModuleInstance } from './app.js';
// Import patchCable functions needed to notify about changes (if any needed)
// import { refreshJacks } from './patchCable.js'; // Example if patchCable needs explicit refresh

// --- State ---
// Keep track of what's loaded in each panel's screen
const panelScreenStates = new Map(); // Map<panelIndex, {type: string, content: HTMLElement|string}>

/**
 * Creates the necessary elements for a single I/O pair (label and jack).
 * Adds required data attributes to the jack element for identification.
 */
function createJackPair(panelIndex, jackType, jackIndex, labelText) {
    // ... (Keep existing createJackPair function - no changes needed here)
    const pair = document.createElement('div');
    pair.className = 'io-pair';

    const label = document.createElement('span');
    label.className = 'io-label';
    label.textContent = labelText;

    const jack = document.createElement('div');
    jack.className = 'jack';
    jack.dataset.jackType = jackType;
    jack.dataset.jackPanel = String(panelIndex); // Ensure it's a string
    jack.dataset.jackIndex = String(jackIndex); // Ensure it's a string
    jack.dataset.jackId = `p${panelIndex}-${jackType}-${jackIndex}`;

    if (jackType === 'in') {
        pair.appendChild(label);
        pair.appendChild(jack);
    } else {
        pair.appendChild(jack);
        pair.appendChild(label);
    }

    return pair;
}


// --- Panel Content and Loading ---

/**
 * Clears the content of a panel's screen and resets its state.
 * @param {number} panelIndex
 * @param {HTMLElement} screenElement
 */
function clearPanelScreen(panelIndex, screenElement) {
    logDebug(`Clearing panel ${panelIndex}`, 'info');
    // Remove the corresponding module instance from app.js registry
    removeModuleInstance(panelIndex);

    screenElement.innerHTML = ''; // Clear current content
    panelScreenStates.delete(panelIndex);

    // Re-add the initial "Load Module" button
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load Module';
    loadButton.className = 'load-module-button'; // Add class for styling
    loadButton.onclick = () => showLoadOptions(panelIndex, screenElement);
    screenElement.appendChild(loadButton);

     // TODO: Notify patchCable.js if jacks associated ONLY with the unloaded module need deactivation
     // For now, assume L/R jacks remain but are disconnected internally by removeModuleInstance
}

/**
 * Displays the loaded module's UI or iframe in the panel screen.
 * @param {number} panelIndex
 * @param {HTMLElement} screenElement
 * @param {string} type - Type of loaded module ('Synth', 'Delay', 'Filter', 'URL', 'File')
 * @param {HTMLElement | string} content - The UI element (for built-ins) or URL/srcdoc (for iframe)
 */
function displayLoadedModule(panelIndex, screenElement, type, content) {
    screenElement.innerHTML = ''; // Clear previous content (like loading options)

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'module-content-wrapper'; // For styling

    if (type === 'URL' || type === 'File') {
        const iframe = document.createElement('iframe');
        iframe.className = 'module-iframe';
        // CRITICAL: Sandbox the iframe to mitigate security risks
        iframe.sandbox = 'allow-scripts allow-same-origin'; // Adjust permissions as needed
        if (type === 'URL') {
            iframe.src = content;
        } else { // type === 'File'
            // Assuming 'content' is the HTML string read from the file
            iframe.srcdoc = content;
        }
        iframe.onerror = () => {
            logDebug(`Error loading iframe content for panel ${panelIndex}`, 'error');
            contentWrapper.innerHTML = `<p style="color: red;">Error loading content.</p>`;
        };
        contentWrapper.appendChild(iframe);
        panelScreenStates.set(panelIndex, { type: type, content: iframe });

    } else { // Built-in module
        contentWrapper.appendChild(content); // 'content' is the module's UI element
        panelScreenStates.set(panelIndex, { type: type, content: contentWrapper }); // Store wrapper
    }

    // Add an "Unload" button
    const unloadButton = document.createElement('button');
    unloadButton.textContent = 'Unload';
    unloadButton.className = 'unload-module-button'; // Add class for styling
    unloadButton.style.marginTop = '5px'; // Basic spacing
    unloadButton.onclick = () => clearPanelScreen(panelIndex, screenElement);

    screenElement.appendChild(contentWrapper);
    screenElement.appendChild(unloadButton);

    logDebug(`Panel ${panelIndex} loaded with ${type}`, 'success');

    // TODO: Notify patchCable.js if new jacks were added or need activation.
    // Example: if (newJacksWereAdded) refreshJacks();
}

/**
 * Handles the actual loading process based on user selection.
 * @param {number} panelIndex
 * @param {HTMLElement} screenElement
 * @param {string} loadType - 'Synth', 'Delay', 'Filter', 'URL', 'File'
 * @param {string | File} [source] - URL string or File object
 */
function loadModule(panelIndex, screenElement, loadType, source) {
    screenElement.innerHTML = '<p>Loading...</p>'; // Provide feedback

    try {
        switch (loadType) {
            case 'Synth': {
                const moduleInstance = createSynthModule(panelIndex);
                displayLoadedModule(panelIndex, screenElement, loadType, moduleInstance.ui);
                break;
            }
            case 'Delay': {
                 const moduleInstance = createDelayModule(panelIndex);
                displayLoadedModule(panelIndex, screenElement, loadType, moduleInstance.ui);
                break;
            }
             case 'Filter': {
                 const moduleInstance = createFilterModule(panelIndex);
                displayLoadedModule(panelIndex, screenElement, loadType, moduleInstance.ui);
                break;
            }
            case 'URL':
                if (source && typeof source === 'string' && source.trim() !== '') {
                    // Basic URL validation (more robust needed for production)
                    if (!source.startsWith('http://') && !source.startsWith('https://')) {
                       logDebug(`Invalid URL provided for panel ${panelIndex}: ${source}`, 'error');
                       clearPanelScreen(panelIndex, screenElement); // Reset on error
                       alert("Invalid URL. Please include http:// or https://");
                       return;
                    }
                    displayLoadedModule(panelIndex, screenElement, loadType, source);
                } else {
                    logDebug(`No valid URL provided for panel ${panelIndex}`, 'warn');
                    clearPanelScreen(panelIndex, screenElement); // Reset if no URL
                }
                break;
            case 'File':
                if (source instanceof File) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const fileContent = e.target.result;
                        // Assuming the file is HTML
                        displayLoadedModule(panelIndex, screenElement, loadType, fileContent);
                    };
                    reader.onerror = (e) => {
                         logDebug(`Error reading file for panel ${panelIndex}: ${e}`, 'error');
                         clearPanelScreen(panelIndex, screenElement); // Reset on error
                         alert("Error reading file.");
                    };
                    reader.readAsText(source); // Read file as text (HTML)
                } else {
                     logDebug(`No valid File provided for panel ${panelIndex}`, 'warn');
                    clearPanelScreen(panelIndex, screenElement); // Reset if no file selected
                }
                break;
            default:
                logDebug(`Unknown load type selected: ${loadType}`, 'warn');
                clearPanelScreen(panelIndex, screenElement); // Reset on unknown type
        }
    } catch (error) {
         logDebug(`Error loading module type ${loadType} for panel ${panelIndex}: ${error}`, 'error');
         console.error(error);
         alert(`Error loading ${loadType}. See console for details.`);
         clearPanelScreen(panelIndex, screenElement); // Reset on error
    }
}


/**
 * Shows the options (dropdown, inputs) for loading a module in a panel.
 * @param {number} panelIndex
 * @param {HTMLElement} screenElement
 */
function showLoadOptions(panelIndex, screenElement) {
    screenElement.innerHTML = ''; // Clear the 'Load Module' button

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '5px'; // Spacing between elements

    // Dropdown for module type
    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'Load:';
    selectLabel.style.fontSize = '0.8em';

    const select = document.createElement('select');
    select.innerHTML = `
        <option value="">-- Select Type --</option>
        <option value="Synth">Built-in: Synth</option>
        <option value="Delay">Built-in: Delay</option>
        <option value="Filter">Built-in: Filter</option>
        <option value="URL">App from URL</option>
        <option value="File">App from Local File</option>
    `;

    // Input fields (initially hidden)
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'https://example.com';
    urlInput.style.display = 'none'; // Hidden initially
    urlInput.style.width = '90%'; // Adjust width

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.html, .htm'; // Accept only HTML files
    fileInput.style.display = 'none'; // Hidden initially
    fileInput.style.width = '90%'; // Adjust width

    // Buttons
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Load';
    confirmButton.disabled = true; // Disabled until type is selected

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => clearPanelScreen(panelIndex, screenElement); // Reset


    // Event listener for dropdown change
    select.onchange = () => {
        const selectedType = select.value;
        urlInput.style.display = selectedType === 'URL' ? 'block' : 'none';
        fileInput.style.display = selectedType === 'File' ? 'block' : 'none';
        confirmButton.disabled = !selectedType; // Enable confirm button if a type is selected
    };

    // Event listener for confirm button
    confirmButton.onclick = () => {
        const selectedType = select.value;
        let source = null;
        if (selectedType === 'URL') {
            source = urlInput.value;
        } else if (selectedType === 'File') {
            source = fileInput.files[0]; // Get the selected file object
        }
        loadModule(panelIndex, screenElement, selectedType, source);
    };

    // Assemble the UI
    container.appendChild(selectLabel);
    container.appendChild(select);
    container.appendChild(urlInput);
    container.appendChild(fileInput);
    container.appendChild(confirmButton);
    container.appendChild(cancelButton);

    screenElement.appendChild(container);
}


/**
 * Creates the complete inner content structure for a single panel.
 * Includes I/O columns, jacks, and the central screen with loading capability.
 * @param {number} panelIndex - The index (0-8) of the panel being created.
 * @returns {HTMLElement} - The populated 'inner-panel' div element.
 */
function createPanelContent(panelIndex) {
    const innerPanel = document.createElement('div');
    innerPanel.className = 'inner-panel';

    // --- Left I/O Column (Inputs) ---
    const leftIO = document.createElement('div');
    leftIO.className = 'io-column left-io';
    ['L IN', 'R IN'].forEach((text, index) => {
        leftIO.appendChild(createJackPair(panelIndex, 'in', index, text));
    });

    // --- Screen Area (Now with initial Load Button) ---
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.dataset.panelIndex = panelIndex; // Store index for reference
    // Initial state: Add the load button
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load Module';
    loadButton.className = 'load-module-button'; // Add class for styling
    // Attach event listener to show loading options when clicked
    loadButton.onclick = () => showLoadOptions(panelIndex, screen);
    screen.appendChild(loadButton);


    // --- Right I/O Column (Outputs) ---
    const rightIO = document.createElement('div');
    rightIO.className = 'io-column right-io';
     ['L OUT', 'R OUT'].forEach((text, index) => {
        rightIO.appendChild(createJackPair(panelIndex, 'out', index, text));
    });

    // --- Assemble Inner Panel ---
    innerPanel.appendChild(leftIO);
    innerPanel.appendChild(screen);
    innerPanel.appendChild(rightIO);

    return innerPanel;
}

/**
 * Sets up the main UI grid by creating and appending panels.
 * Calls helper functions to generate panel content including loading buttons.
 */
export function setupUI() {
    logDebug("Setting up UI grid with module loading capability...", 'info');

    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) {
        logDebug("Grid container element (#grid-container) not found.", 'error');
        return; // Stop execution if container is missing
    }

    gridContainer.innerHTML = ''; // Clear previous content
    panelScreenStates.clear(); // Clear any previous state

    const numberOfPanels = 9;
    logDebug(`Creating ${numberOfPanels} panels...`, 'info');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < numberOfPanels; i++) {
        const panelContainer = document.createElement('div');
        panelContainer.className = 'panel-container';
        panelContainer.dataset.panelId = String(i); // Keep panel identifier

        // Create the inner content, including the screen with its load button
        const innerContent = createPanelContent(i);
        panelContainer.appendChild(innerContent);
        fragment.appendChild(panelContainer);
    }

    gridContainer.appendChild(fragment);
    logDebug("UI grid created. Each panel screen has a 'Load Module' button.", 'success');
}