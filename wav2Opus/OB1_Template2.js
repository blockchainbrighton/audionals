// OB1_Template2.js

/**
 * Generates a streamlined HTML file content string that embeds Base64 data
 * as global JS variables and links to external CSS and JS modules for
 * rendering and interactivity (based on the OB1 - Audional Art structure).
 *
 * @param {string} imageBase64Data - The pure Base64 encoded string for the image (NO prefix).
 * @param {string} audioBase64Data - The pure Base64 encoded string for the Opus audio (NO prefix).
 * @returns {string} A string containing the complete, streamlined HTML document.
 */
function generateHtml(imageBase64Data, audioBase64Data) { // Maybe rename
    // Input validation remains the same...
    if (typeof imageBase64Data !== 'string' || typeof audioBase64Data !== 'string') {
      console.error("Error: Both imageBase64Data and audioBase64Data must be strings.");
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating template: Invalid input data type.</h1></body></html>`;
    }

    // Use template literals for the NEW modular HTML structure
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OB1 - Audional Art</title> 
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- --- Embedded Base64 Data Zone (as JS global variables) --- -->
    <script>
        // These variables will exist in the global scope (window)
        // and are intended for use by app.js / main.js
        const imageBase64 = \`${imageBase64Data}\`; // Injected Image Data
        const audioBase64_Opus = \`${audioBase64Data}\`; // Injected Audio Data
    </script>
    <!-- --- End Embedded Base64 Data Zone --- -->

    <!-- Container for dynamic content -->
    <div id="app">
        <!-- Static Audio Metadata Section (as per example) -->
        <div class="audio-metadata">
            <span id="audio-meta-instrument">Steel Drum Hit</span>
            <span id="audio-meta-note">C6</span>
            <span id="audio-meta-frequency">1050 Hz</span>
          
        </div>
        <!-- The rest of the layout will be inserted here by app.js -->
    </div>

    <!-- Load the JS modules that build the layout and add interactivity -->
    <script type="module" src="app.js"></script>
    <script type="module" src="main.js"></script>
</body>
</html>
`; // End of template literal

    return htmlContent;
}

// --- REMEMBER ---
// The generated HTML file now *requires* the following files
// to be present and correctly referenced:
// 1. style.css (containing all necessary CSS rules)
// 2. app.js     (containing JS to build the UI, likely creating img/audio elements)
// 3. main.js    (containing JS for interactivity, using the global Base64 vars)