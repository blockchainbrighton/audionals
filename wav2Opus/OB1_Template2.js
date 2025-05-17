// OB1_Template2.js (Option 1: Classic Script)

/**
 * Generates a streamlined HTML file content string that embeds Base64 data
 * and user-provided metadata.
 *
 * @param {string} title - The title for the Audional.
 * @param {string} instrument - The instrument name provided by the user.
 * @param {string} note - The note value provided by the user.
 * @param {string} frequency - The frequency value provided by the user.
 * @param {boolean} isLoop - Whether the audio is a loop.
 * @param {string} bpm - The BPM if it's a loop.
 * @param {string} audioBase64Data - The pure Base64 encoded string for the Opus audio (NO prefix).
 * @param {string} imageBase64Data - The pure Base64 encoded string for the image (NO prefix). Can be empty.
 * @returns {string} A string containing the complete, streamlined HTML document.
 */
function OB1_Template2(title, instrument, note, frequency, isLoop, bpm, audioBase64Data, imageBase64Data) {
    if (typeof audioBase64Data !== 'string' || audioBase64Data.trim() === '') {
      console.error("OB1_Template2 Error: audioBase64Data must be a non-empty string.");
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating Audional: Invalid or missing audio data.</h1></body></html>`;
    }

    const metaTitle = title || 'Audional Player';
    const metaInstrument = instrument || 'N/A';
    const metaNote = note || 'N/A';
    const metaFrequency = frequency || 'N/A';
    const metaIsLoop = isLoop ? 'Yes' : 'No';
    const metaBPM = isLoop && bpm ? bpm : 'N/A';

    const hasImage = typeof imageBase64Data === 'string' && imageBase64Data.trim() !== '';

    let playerScripts = '';
    if (hasImage) {
        playerScripts = `
    <script type="module" src="app.js" defer><\/script>
    <script type="module" src="main.js" defer><\/script>`;
    } else {
        // playButton.js is included as a classic script, ensure it's deferred
        // so it runs after the DOM and the inline data script.
        playerScripts = `
    <script src="playButton.js" defer><\/script>
    <!-- app.js and main.js are assumed not to be needed for the no-image standalone button scenario -->`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaTitle}</title>
    <link rel="stylesheet" href="style.css"> <!-- Common style for both player types -->
    <style>
        /* Minimal fallback styles if style.css is missing */
        body { margin: 0; background-color: #1a1a1a; color: #e0e0e0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 10px; box-sizing: border-box; }
        #app { border: 1px solid #333; background-color: #282828; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%; margin-bottom: 20px; }
        .audio-metadata { font-size: 0.9em; color: #b0b0b0; margin-top: 15px; }
        .audio-metadata p { margin: 4px 0; }
        .audio-metadata span { font-weight: bold; color: #f0f0f0; }
        /* Ensure playButton.js styles are distinct or complementary */
    </style>
</head>
<body>
    <!-- Container for dynamic content -->
    <div id="app">
        <!-- Content for #app will be populated by main.js (if image) or playButton.js (if no image) -->
    </div>

    <!-- Static Audio Metadata Section (Always present, styled by style.css or fallback) -->
    <div class="audio-metadata">
        <p>Title: <span id="audio-meta-title">${metaTitle}</span></p>
        <p>Instrument: <span id="audio-meta-instrument">${metaInstrument}</span></p>
        <p>Note: <span id="audio-meta-note">${metaNote}</span> (<span id="audio-meta-frequency">${metaFrequency} Hz</span>)</p>
        <p>Loop: <span id="audio-meta-loop">${metaIsLoop}</span>${isLoop ? `, BPM: <span id="audio-meta-bpm">${metaBPM}</span>` : ''}</p>
    </div>

    <!-- --- Embedded Base64 Data Zone (as JS global variables) --- -->
    <script>
        // These variables are intended for the player scripts (app.js/main.js or playButton.js)
        const imageBase64 = \`${imageBase64Data || ''}\`;
        const audioBase64_Opus = \`${audioBase64Data}\`;
    <\/script>
    <!-- --- End Embedded Base64 Data Zone --- -->

    <!-- Load the JS that builds the layout and adds interactivity -->
    ${playerScripts}
</body>
</html>
`;
    return htmlContent;
}

// Renamed function to OB1_Template2 to match its usage in ob1-generator.js
// Ensure ob1-generator.js calls OB1_Template2 with all necessary arguments.
// The arguments in the function signature have been updated to include all metadata.