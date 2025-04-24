// js/main.js

/**
 * @file Main entry point for the BAM-Patchbay application.
 * Orchestrates the loading and initialization of different modules.
 * Uses ES Modules for modular structure.
 */

// --- Module Imports ---
// Import core functionalities needed for startup and basic operation.
import { logDebug } from './debug.js';
import { checkLibraries } from './libraryChecker.js';
import { initializeApp } from './app.js';
import { setupUI } from './ui.js';
import { initPatching } from './patchCable.js'; // <--- IMPORT THE NEW PATCHING MODULE


/*
 * --- How to Add a New Module ---
 * 1. Create your new module file (e.g., js/myNewModule.js) and use 'export'
 *    to expose its main initialization function (e.g., export function initMyModule() { ... }).
 * 2. Import the function here:
 *    import { initMyModule } from './myNewModule.js';
 * 3. Call the imported function within the 'try' block of 'startApplication',
 *    after 'initializeApp()', in the desired initialization order:
 *    initMyModule();
 */

// Example placeholder imports for future modules:
// import { createVisualizer } from './visualizer.js';

// --- Application Startup Logic ---

/**
 * Asynchronous function to coordinate the application's startup sequence.
 * 1. Logs the start of the process.
 * 2. Waits for essential libraries (Tone.js, Three.js) to be verified.
 * 3. Initializes the main application logic (e.g., Tone/Three setup).
 * 4. Sets up the static UI grid elements.
 * 5. Initializes the interactive patch cable system.
 * 6. Initializes any other registered modules.
 * 7. Handles and logs any critical errors during startup.
 */
async function startApplication() {
    logDebug("Main script loaded via type=module. Starting application sequence...", 'info');

    try {
        // Step 1: Verify that required external libraries (Tone, THREE) are loaded and accessible.
        logDebug("Awaiting library checks...", 'info');
        await checkLibraries();
        logDebug("Library checks passed.", 'success');

        // Step 2: Initialize the core application logic.
        // This might involve setting up basic Tone.js or Three.js objects.
        logDebug("Initializing core application module (app.js)...", 'info');
        initializeApp();
        logDebug("Core application module initialized.", 'success');

        // Step 3: Set up the UI grid structure.
        // This creates the panels and jacks in the DOM.
        logDebug("Setting up UI grid (ui.js)...", 'info');
        setupUI();
        logDebug("UI grid setup complete.", 'success');

        // Step 4: Initialize the Patch Cable system.
        // This adds event listeners to jacks and sets up the SVG layer for drawing cables.
        // IMPORTANT: This must run *after* setupUI() so the jack elements exist.
        logDebug("Initializing Patch Cable module (patchCable.js)...", 'info');
        initPatching();
        logDebug("Patch Cable module initialized.", 'success');

        // Step 5: Initialize other modules in the desired order.
        // Example:
        // logDebug("Initializing Visualizer module...", 'info');
        // const visualizer = createVisualizer(Tone.context); // Example passing dependencies
        // logDebug("Visualizer module initialized.", 'success');


        // Final success message after all initializations are done
        logDebug("All modules initialized successfully. BAM-Patchbay is ready.", 'success');

    } catch (error) {
        // Catch any error thrown during the try block (e.g., library check failure, module init error).
        logDebug(`❌ CRITICAL STARTUP ERROR: ${error.message}`, 'error');
        console.error("Full startup error details:", error); // Log the full error object for devs

        // Optionally, display a user-friendly message on the page indicating failure.
        displayStartupError("Failed to initialize required components. Please check the console (F12) for details.");
    }
}

/**
 * Helper function to display a startup error message in the UI.
 * @param {string} message - The message to display to the user.
 */
function displayStartupError(message) {
    const container = document.getElementById('debug-container'); // Reuse existing container
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        // Apply more robust styling than inline styles if possible (e.g., via CSS class)
        errorDiv.style.color = 'red';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.border = '1px solid red';
        errorDiv.style.padding = '10px';
        errorDiv.style.marginTop = '15px';
        errorDiv.style.backgroundColor = '#ffebeb';
        // Prepend error message within the container for visibility
        if (container.firstChild) {
            container.insertBefore(errorDiv, container.firstChild);
        } else {
            container.appendChild(errorDiv);
        }
    } else {
        // Fallback if the debug container itself isn't found
        console.error("Debug container not found, cannot display UI error message.");
        alert(message); // Use alert as a last resort
    }
}


// --- Event Listener ---

// Wait for the entire page to load, including assets like scripts and images.
window.addEventListener('load', startApplication);

logDebug("Main.js parsed, waiting for window load event...", 'info');