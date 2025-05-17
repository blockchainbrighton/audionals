// OB1_Template2.js

/**
 * Generates a streamlined HTML file content string that embeds Base64 data
 * and user-provided metadata.
 *
 * @param {string} imageBase64Data - The pure Base64 encoded string for the image (NO prefix). Can be empty.
 * @param {string} audioBase64Data - The pure Base64 encoded string for the Opus audio (NO prefix).
 * @param {string} instrument - The instrument name provided by the user.
 * @param {string} note - The note value provided by the user.
 * @param {string} frequency - The frequency value provided by the user.
 * @param {boolean} hasImage - True if imageBase64Data is present and not empty.
 * @returns {string} A string containing the complete, streamlined HTML document.
 */
function generateHtml(imageBase64Data, audioBase64Data, instrument, note, frequency, hasImage) { // Added hasImage
    if (typeof audioBase64Data !== 'string') { // Image can be empty, audio is required
      console.error("Error: audioBase64Data must be a string.");
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating template: Invalid audio Base64 data type.</h1></body></html>`;
    }
    const metaInstrument = instrument || 'N/A';
    const metaNote = note || 'N/A';
    const metaFrequency = frequency || 'N/A';

    // Scripts for the player UI. Conditionally include playButton.js or app.js/main.js for image player
    let playerScripts = '';
    if (hasImage) {
        playerScripts = `
    <script type="module" src="app.js"></script>
    <script type="module" src="main.js"></script>`;
    } else {
        playerScripts = `
    <script type="module" src="playButton.js"></script>
    <!-- app.js and main.js might not be needed if there's no image,
         or they need to be aware of the no-image scenario.
         For now, playButton.js takes full control of #app if no image. -->`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OB1 - Audional Art</title>
    <link rel="stylesheet" href="style.css"> <!-- Common style for both player types -->
</head>
<body>
    <!-- --- Embedded Base64 Data Zone (as JS global variables) --- -->
    <script>
        const imageBase64 = \`${imageBase64Data || ''}\`; // Injected Image Data (can be empty)
        const audioBase64_Opus = \`${audioBase64Data}\`; // Injected Audio Data
    </script>
    <!-- --- End Embedded Base64 Data Zone --- -->

    <!-- Container for dynamic content -->
    <div id="app">
        <!-- Static Audio Metadata Section (Always present) -->
        <div class="audio-metadata">
            <span id="audio-meta-instrument">${metaInstrument}</span>
            <span id="audio-meta-note">${metaNote}</span>
            <span id="audio-meta-frequency">${metaFrequency}</span>
        </div>
        <!--
            If hasImage is true, app.js will populate this with an image-based player.
            If hasImage is false, playButton.js will populate this with a standalone button.
        -->
    </div>

    <!-- Load the JS modules that build the layout and add interactivity -->
    ${playerScripts}
</body>
</html>
`;
    return htmlContent;
}

// --- REMEMBER ---
// The generated HTML file requires:
// 1. style.css
// 2. EITHER (app.js AND main.js) OR (playButton.js)
// Ensure these files are accessible from the location where the generated HTML is run.