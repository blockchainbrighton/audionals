// keyboardShortcuts.js

document.addEventListener('keydown', function(event) {
    // Define the mapping between number keys and pad numbers
    const keyPadMapping = {
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9'
    };

    const pressedKey = event.key;
    const padNumber = keyPadMapping[pressedKey];

    if (padNumber) {
        // Find the corresponding pad element
        const pad = document.querySelector(`.pad[data-pad="${padNumber}"]`);
        if (pad && pad.dataset.loaded) {
            // Trigger pad playback
            pad.click();
        }
    }
});
