// --- START OF FILE imageAnimation.js ---

// --- Configuration ---
const IMAGE_ID = 'main-image';          // The ID of the image element to animate
const ANIMATION_CLASS = 'playing';      // The CSS class to add/remove for animation
const ANIMATION_DURATION_MS = 150;    // How long the animation class should stay applied (in milliseconds)

// --- DOM Element Reference ---
// Get the element reference once when the module loads for efficiency.
const imageElement = document.getElementById(IMAGE_ID);

// Optional: Check if the element was found during module load
if (!imageElement) {
    console.warn(`Image animation module could not find element with ID: ${IMAGE_ID}. Animations will not work.`);
}

// --- Core Animation Logic ---

/**
 * Triggers a brief visual animation on the main image element.
 * Assumes a CSS class `ANIMATION_CLASS` is defined in your stylesheet
 * to create the visual effect.
 */
export function triggerAnimation() {
    // Only proceed if the element was found
    if (!imageElement) {
        return;
    }

    // Add the class to start the CSS animation/transition
    imageElement.classList.add(ANIMATION_CLASS);

    // Set a timer to remove the class after the specified duration
    setTimeout(() => {
        // Check element still exists just in case it was removed from DOM
        // (though less likely in this specific app context)
        if (document.getElementById(IMAGE_ID)) { // Re-check by ID is safest
             imageElement.classList.remove(ANIMATION_CLASS);
        }
    }, ANIMATION_DURATION_MS);
}

// --- END OF FILE imageAnimation.js ---