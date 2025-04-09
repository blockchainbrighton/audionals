// --- START OF FILE imageAnimation.js ---

// --- Configuration ---
const IMAGE_ID = 'main-image';          // The ID of the image element to animate
// --- UPDATED: Use the new CSS class name ---
const ANIMATION_CLASS = 'shake-all-directions-animation'; // The CSS class to add/remove for animation
// --- Duration matches the CSS animation (0.15s = 150ms) ---
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
 * (WITHOUT 'infinite') to create the visual effect.
 */
export function triggerAnimation() {
    // Only proceed if the element was found
    if (!imageElement) {
        return;
    }

    // Prevent re-triggering if animation is already technically running
    // (though the timeout usually handles cleanup)
    if (imageElement.classList.contains(ANIMATION_CLASS)) {
        // Optional: Could force a restart by removing/re-adding, but
        // simpler to just let the current one finish.
        // console.log("Animation already in progress, skipping trigger.");
        return;
    }

    // Add the class to start the CSS animation/transition
    imageElement.classList.add(ANIMATION_CLASS);
    // console.log('Added animation class'); // For debugging

    // Set a timer to remove the class after the specified duration.
    // This allows the animation to be triggered again later.
    setTimeout(() => {
        // Check element still exists just in case it was removed from DOM
        if (document.getElementById(IMAGE_ID)) { // Re-check by ID is safest
             imageElement.classList.remove(ANIMATION_CLASS);
             // console.log('Removed animation class'); // For debugging
        }
    }, ANIMATION_DURATION_MS);
}

// --- END OF FILE imageAnimation.js ---