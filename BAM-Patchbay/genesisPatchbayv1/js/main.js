// js/main.js
import { logDebug } from './debug.js';
import { checkLibraries } from './libraryChecker.js';
import { initializeApp } from './app.js';
// *** Add imports for NEW modules here in the future ***
// import { setupUI } from './ui.js'; // Example for later
// import { createVisualizer } from './visualizer.js'; // Example for later

// Function to start the application flow
async function startApplication() {
    logDebug("Main script loaded. Starting application sequence...", 'info');

    try {
        // Wait for library checks to complete
        await checkLibraries();

        // Libraries are OK, proceed with app initialization
        initializeApp();

        // *** Initialize other imported modules here ***
        // setupUI(); // Example
        // const visualizer = createVisualizer(Tone.context); // Example
        // logDebug("All modules initialized.", 'success');

    } catch (error) {
        // checkLibraries() rejected or another critical error occurred
        logDebug(`Application initialization failed: ${error.message}`, 'error');
        // Optionally display a user-friendly message on the page
        const container = document.getElementById('debug-container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = "Failed to load required components. Please check the console for details.";
            errorDiv.style.color = 'red';
            errorDiv.style.fontWeight = 'bold';
            errorDiv.style.marginTop = '10px';
            container.appendChild(errorDiv);
        }
    }
}

// Wait for the DOM to be fully loaded before running checks and initialization
// Using 'load' ensures external resources like libraries are potentially loaded too,
// although module execution order relative to classic scripts can be complex.
// Using 'DOMContentLoaded' is often sufficient if libraries are guaranteed loaded before the module script.
// 'load' is safer given the current structure relies on global library objects.
window.addEventListener('load', startApplication);