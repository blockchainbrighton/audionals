// --- START OF FILE app.js ---

console.log("--- app.js evaluating ---");
// alert("APP.JS EXECUTED"); // Use alert for unavoidable visibility

// Import the layout builder
import { buildLayout } from './layoutBuilder.js';

// Get the main container element from the HTML
const appContainer = document.getElementById('app');

if (!appContainer) {
    console.error('app.js: Main container with id="app" not found!');
    // Stop execution if the main container is missing
    throw new Error('Main application container #app missing.');
} else {
    console.log("app.js: Found #app container. Building layout...");
    // --- Build the dynamic layout ---
    // This now handles finding metadata and constructing the DOM
    try {
        buildLayout(appContainer); // Pass the container element directly
        console.log("app.js: Layout build process initiated by layoutBuilder.js.");
    } catch (error) {
        console.error("app.js: Error during layout building:", error);
        // Optionally display an error to the user in a fallback way if layout fails
        appContainer.innerHTML = '<p style="color:red; padding: 20px;">Fatal Error: Could not build application layout.</p>';
        // Re-throw or handle as needed
        throw error;
    }
}

// main.js will handle further initialization once the DOM is ready
// and the layout is built.

// --- END OF FILE app.js ---