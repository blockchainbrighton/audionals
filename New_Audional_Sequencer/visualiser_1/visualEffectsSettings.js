//visualEffectsSettings.js
// Ensure these are defined or accessible in this scope
let visualTime = 0;  // Ensure this is accessible here
let maxDistance;  // Declare this at the top
let currentTime = performance.now();
let elapsedTime = (currentTime - startTime) / 1000.0; // Convert ms to seconds
let lastPaletteShift = 0; // Keep track of the last time the palette shifted
let reverseDirection = false; // Variable to control direction of time
let timeSpeedMultiplier = 1; // Increase to speed up, decrease to slow down
let cursorSpeedMultiplier = 1; // Increase for more sensitivity, decrease for less
let palettePhase = 0; // Start from the first phase

function updateCursorPosition(clientX, clientY) {
    const dx = clientX - canvasCenterX;
    const dy = clientY - canvasCenterY;
    const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
    cursorPosition = 0.5 + 2.0 * ((maxDistance - distanceToCenter) / maxDistance);
}

function handleMouseMove(e) {
    updateCursorPosition(e.clientX, e.clientY);
}

function handleTouchMove(e) {
    let touch = e.touches[0];
    updateCursorPosition(touch.clientX, touch.clientY);
}

// Additional logic to update visual effects based on user interaction or time
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('resize', function() {
        maxDistance = Math.sqrt(canvasCenterX * canvasCenterX + canvasCenterY * canvasCenterY);
        resizeCanvas(); // This function is defined in visualEffect.js
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    canvas.addEventListener('click', function() {
        console.log("Canvas clicked. Reverse direction: ", !reverseDirection);
        reverseDirection = !reverseDirection;
    });
});

function updateVisuals() {
    // Calculate elapsed time since the last frame
    currentTime = performance.now();
    let frameTime = (currentTime - startTime) / 1000.0; // Convert ms to seconds

    // Update visual time based on reverseDirection and timeSpeedMultiplier
    visualTime += (reverseDirection ? -1 : 1) * frameTime * timeSpeedMultiplier;

    // Update phaseTimer and check if it's time to update the palette
    phaseTimer += frameTime;
    if (phaseTimer >= 4) { // More than 4 seconds since the last shift
        phaseTimer -= 4; // Reset the phase timer by subtracting 4 seconds
        palettePhase = (palettePhase + 1) % 7; // Cycle through 7 phases
    }
}

// Call updateVisuals in the render loop of visualEffect.js
