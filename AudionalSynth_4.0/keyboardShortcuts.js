// keyboardShortcuts.js

document.addEventListener('keydown', function(event) {
    const key = event.key; // Get the pressed key
    const padNumber = parseInt(key, 10); // Convert the key to a number

    // Check if the key is a number between 1 and 6
    if (padNumber >= 1 && padNumber <= 6) {
        console.log(`Triggering pad ${padNumber}`);
        // Trigger the pad with the corresponding data-pad attribute
        triggerPad(padNumber);
    }
});

function triggerPad(padNumber) {
    // Find the pad element with the matching data-pad attribute
    const pad = document.querySelector(`.pad[data-pad="${padNumber}"]`);
    if (pad) {
        // Here you can define how the pad should be triggered
        console.log(`Pad ${padNumber} triggered: ${pad.textContent}`);

        // If you have a specific function to play the sound, call it here
        // For example: playSound(padNumber);

        // Or, if triggering involves simulating a click event:
        pad.click();
    }
}
