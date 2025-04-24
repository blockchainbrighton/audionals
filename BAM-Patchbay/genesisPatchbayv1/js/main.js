// js/main.js

/**
 * @file Main entry point for the BAM-Patchbay application.
 * Orchestrates the loading and initialization of different modules.
 */

// --- Module Imports ---
import { logDebug } from './debug.js';
import { checkLibraries } from './libraryChecker.js';
import { initializeApp } from './app.js'; // Sets up base Tone context etc.
import { setupUI } from './ui.js'; // Creates panels, jacks, load buttons
import { initPatching } from './patchCable.js'; // Initializes click listeners, SVG layer

// --- Application Startup Logic ---

async function startApplication() {
    logDebug("Starting application sequence...", 'info');

    try {
        // Step 1: Verify Libs
        logDebug("Awaiting library checks...", 'info');
        await checkLibraries();
        logDebug("Library checks passed.", 'success');

        // Step 2: Initialize core app (e.g., Tone.start() on click)
        logDebug("Initializing core application module (app.js)...", 'info');
        initializeApp();
        logDebug("Core application module initialized.", 'success');

        // Step 3: Set up the UI grid structure (Creates panels, jacks, load buttons)
        logDebug("Setting up UI grid (ui.js)...", 'info');
        setupUI();
        logDebug("UI grid setup complete.", 'success');

        // Step 4: Initialize the Patch Cable system
        // (Adds listeners to jacks created by setupUI, prepares SVG)
        logDebug("Initializing Patch Cable module (patchCable.js)...", 'info');
        initPatching();
        logDebug("Patch Cable module initialized.", 'success');

        // Step 5: Further initializations if needed...

        logDebug("All modules initialized successfully. BAM-Patchbay is ready for interaction.", 'success');

    } catch (error) {
        logDebug(`❌ CRITICAL STARTUP ERROR: ${error.message}`, 'error');
        console.error("Full startup error details:", error);
        displayStartupError("Failed to initialize required components. Check console (F12).");
    }
}

// Helper function (no change)
function displayStartupError(message) {
    const container = document.getElementById('debug-container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = message;
        errorDiv.style.color = 'red';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.border = '1px solid red';
        errorDiv.style.padding = '10px';
        errorDiv.style.marginTop = '15px';
        errorDiv.style.backgroundColor = '#ffebeb';
        if (container.firstChild) {
            container.insertBefore(errorDiv, container.firstChild);
        } else {
            container.appendChild(errorDiv);
        }
    } else {
        console.error("Debug container not found, cannot display UI error message.");
        alert(message);
    }
}

// --- Event Listener ---
window.addEventListener('load', startApplication);
logDebug("Main.js parsed, waiting for window load event...", 'info');