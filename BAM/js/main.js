/**
 * main.js
 * Main entry point for the website's JavaScript.
 * Imports and initializes all modules.
 */

// --- Module Imports ---
import { createAudioContext, getAudioContext } from './audioContext.js';
import { generateSampleCards, initFiltering } from './sampleManager.js';
import { initAudioEngine } from './audioEngine.js';
import { initUIEnhancements } from './uiEnhancements.js';
import { initAnimations } from './animations.js';

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing modules...");

    // --- Configuration ---
    const samplesGridSelector = '#kp-loops .samples-grid';
    const filterButtonsSelector = '.category-filter button, .category-filter .btn'; // Combined selector
    const allCardsSelector = `${samplesGridSelector} .sample-card`; // Selector for all generated cards (including placeholders)
    const quantizeToggleId = 'quantize-toggle';
    const bpmInputId = 'bpm-input';

    // --- Initialization ---

    // 1. Initialize Audio Context (attempt early)
    const audioContext = createAudioContext(); // Attempt to create/get the context

    // 2. Initialize general UI enhancements (can run regardless of audio)
    initUIEnhancements();

    // 3. Initialize animations (can run regardless of audio)
    initAnimations();

    // 4. Generate Sample Cards (pass audio availability status)
    // Returns a map of card elements to their initial player state objects.
    const loopPlayersMap = generateSampleCards(samplesGridSelector, !!audioContext);

    // 5. Initialize Category Filtering (after cards are generated)
    initFiltering(filterButtonsSelector, allCardsSelector);

    // 6. Initialize Audio Engine (only if context is available and cards were generated)
    if (audioContext && loopPlayersMap.size > 0) {
        console.log("AudioContext available and samples found, initializing AudioEngine...");
        initAudioEngine(audioContext, loopPlayersMap, quantizeToggleId, bpmInputId);
    } else if (!audioContext) {
        console.warn("AudioContext initialization failed or not supported. AudioEngine will not be initialized.");
        // UI should reflect lack of audio support (handled partly in generateSampleCards)
    } else {
        console.warn("No sample cards with audio sources found. AudioEngine will not be initialized.");
    }

    console.log("End of main.js initialization script.");
}); // === END of DOMContentLoaded ===

// --- Global Error Handling (Optional) ---
window.addEventListener('error', (event) => {
    console.error('Unhandled global error:', event.message, event.filename, event.lineno, event.colno, event.error);
    // Potentially log to a server here
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Potentially log to a server here
});