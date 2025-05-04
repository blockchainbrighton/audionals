// --- app.js ---
console.log("--- app.js evaluating ---");

// Import the layout building function
import { buildLayout } from "/content/f713eefbacf125e64793b9925d7210cf18d0dd823f1c91b636d146a0d0a1854di0"; // From layoutBuilder.js

// --- Initialization ---

// Find the main application container element in the DOM
const appContainer = document.getElementById("app");

// CRITICAL CHECK: Ensure the main container exists
if (!appContainer) {
    // Log error and throw an exception to halt execution if the container is missing
    console.error('app.js: Main container with id="app" not found!');
    throw new Error("Main application container #app missing.");
}

console.log("app.js: Found #app container. Building layout...");

// --- Build Application Layout ---
try {
    // Call the imported function to construct the UI within the app container
    buildLayout(appContainer);
    console.log("app.js: Layout build process initiated by layoutBuilder.js.");
} catch (error) {
    // Handle errors during the layout building process
    console.error("app.js: Error during layout building:", error);
    // Display a fatal error message directly in the app container
    appContainer.innerHTML = '<p style="color:red; padding: 20px;">Fatal Error: Could not build application layout.</p>';
    // Rethrow the error to potentially be caught by higher-level error handlers
    // and prevent further script execution that might depend on the layout.
    throw error;
}