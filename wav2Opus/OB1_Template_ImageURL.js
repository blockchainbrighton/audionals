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
    const imageUrl = 'https://ordinals.com/content/01c48d3cceb02215bc3d44f9a2dc7fba63ea63719a2ef1c35d3f0c4db93ab8d5i0'; // Your Image URL
    const audioBase64_Opus = \`${audioBase64Data}\`; // Injected Audio Data
    </script>
    <!-- --- End Embedded Base64 Data Zone --- -->

    <!-- Container for dynamic content -->
    <link rel="stylesheet" href="/content/c93b6ee76c49aa33132dd3394bf6fe7b73b413c2d872945c1c6db53415c8e04bi0">    
    
    <style>
        /* --- Add to the end of style.css --- */
        .touch-controls {position: fixed;bottom: 15px;right: 15px;z-index: 100;display: flex;gap: 10px;}.touch-button {background-color: rgba(51, 51, 51, 0.8);border: 1px solid rgba(100, 100, 100, 0.8);color: #ddd;padding: 8px 12px;border-radius: 50%;cursor: pointer;font-size: 1.1em;font-weight: bold;font-family: monospace;width: 40px;height: 40px;display: flex;justify-content: center;align-items: center;user-select: none;transition: background-color 0.2s;}.touch-button:hover {background-color: rgba(85, 85, 85, 0.9);}.touch-button:active {background-color: rgba(106, 154, 106, 0.9);}@media (hover: hover) and (pointer: fine) {.touch-controls {display: none;}}
    </style>
    <div id="app">
        <!-- Static Audio Metadata Section (NOW DYNAMICALLY FILLED) -->
        <div class="audio-metadata">
            <span id="audio-meta-instrument">Vocal</span>
            <span id="audio-meta-note">C4</span>
            <span id="audio-meta-frequency">261.63 Hz</span>
        </div>
        <!-- The rest of the layout will be inserted here by app.js -->
    </div>

    <!-- Load the JS modules that build the layout and add interactivity -->
    <!-- Make sure these paths (style.css, app.js, main.js) are correct relative -->
    <!-- to where the GENERATED HTML file will be saved/used. -->
    <script type="module" src="/content/e0974fc427a7c54c864ad3c3b2ffbd0fef3c17049c15f3187b58257d628dbc70i0"></script> <!-- app.js -->
    <script type="module" src="/content/9f3a2017003dafeca94621a8b66bc2f0eb7b481c939c7ac50194a0b7685d54cei0"></script> <!-- main.js -->
   
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