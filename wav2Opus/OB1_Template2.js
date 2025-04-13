// OB1_Template2.js

/**
 * Generates a streamlined HTML file content string that embeds Base64 data
 * and user-provided metadata.
 *
 * @param {string} imageBase64Data - The pure Base64 encoded string for the image (NO prefix).
 * @param {string} audioBase64Data - The pure Base64 encoded string for the Opus audio (NO prefix).
 * @param {string} instrument - The instrument name provided by the user.
 * @param {string} note - The note value provided by the user.
 * @param {string} frequency - The frequency value provided by the user.
 * @returns {string} A string containing the complete, streamlined HTML document.
 */
function generateHtml(imageBase64Data, audioBase64Data, instrument, note, frequency) { // Added metadata params
    // Input validation for Base64 (keep as is)
    if (typeof imageBase64Data !== 'string' || typeof audioBase64Data !== 'string') {
      console.error("Error: Both imageBase64Data and audioBase64Data must be strings.");
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating template: Invalid Base64 data type.</h1></body></html>`;
    }
    // Basic validation/defaults for metadata (optional but good)
    const metaInstrument = instrument || 'N/A';
    const metaNote = note || 'N/A';
    const metaFrequency = frequency || 'N/A';

    // Use template literals for the NEW modular HTML structure
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OB1 - Audional Art</title>
</head>
<body>
    <!-- --- Embedded Base64 Data Zone (as JS global variables) --- -->
    <script>
        const imageBase64 = \`${imageBase64Data}\`; // Injected Image Data
        const audioBase64_Opus = \`${audioBase64Data}\`; // Injected Audio Data
    </script>
    <!-- --- End Embedded Base64 Data Zone --- -->

    <!-- Container for dynamic content -->
    <link rel="stylesheet" href="style.css">
    <div id="app">
        <!-- Static Audio Metadata Section (NOW DYNAMICALLY FILLED) -->
        <div class="audio-metadata">
            <span id="audio-meta-instrument">${metaInstrument}</span>
            <span id="audio-meta-note">${metaNote}</span>
            <span id="audio-meta-frequency">${metaFrequency}</span>
        </div>
        <!-- The rest of the layout will be inserted here by app.js -->
    </div>

    <!-- Load the JS modules that build the layout and add interactivity -->
    <!-- Make sure these paths (style.css, app.js, main.js) are correct relative -->
    <!-- to where the GENERATED HTML file will be saved/used. -->
    <!-- Consider using absolute paths if deploying: /path/to/style.css -->
    <script type="module" src="app.js"></script>
    <script type="module" src="main.js"></script>
</body>
</html>
`; // End of template literal

    return htmlContent;
}

// --- REMEMBER ---
// The generated HTML file requires:
// 1. style.css
// 2. app.js
// 3. main.js
// Ensure these files are accessible from the location where the generated HTML is run.