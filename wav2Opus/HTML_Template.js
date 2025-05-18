// HTML_Template.js

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
 * @param {string} audionalBase64Data - The pure Base64 encoded string for the Opus audio (NO prefix).
 * @param {string} audionalVisualBase64Data - The pure Base64 encoded string for the image (NO prefix). Can be empty.
 * @returns {string} A string containing the complete, streamlined HTML document.
 */
function HTML_Template(title, instrument, note, frequency, isLoop, bpm, audionalBase64Data, audionalVisualBase64Data) {
    if (typeof audionalBase64Data !== 'string' || audionalBase64Data.trim() === '') {
      console.error("HTML_Template Error: audionalBase64Data must be a non-empty string.");
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating Audional: Invalid or missing audio data.</h1></body></html>`;
    }

    const metaTitle = title || 'Audional Player';
    const metaInstrument = instrument || 'N/A';
    const metaNote = note || 'N/A';
    const metaFrequency = frequency || 'N/A'; // frequency should already be a string like "XX.XX Hz"
    const metaIsLoop = isLoop ? 'Yes' : 'No';
    const metaBPM = isLoop && bpm ? bpm : 'N/A';

    const hasImage = typeof audionalVisualBase64Data === 'string' && audionalVisualBase64Data.trim() !== '';

    // Determine player scripts based on whether an image is present
    // This logic assumes your player scripts (app.js, main.js, playButton.js) are in the same directory
    // as the generated HTML file and are named accordingly.
    let playerScripts = '';
    if (hasImage) {
        // Assumes app.js and main.js are for the image-based player
        playerScripts = `
    <script type="module" src="main.js" defer><\/script>`;
    } else {
        // Assumes playButton.js is for the audio-only player
        playerScripts = `
    <script src="playButton.js" defer><\/script>`;
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
    </style>
</head>
<body>
    <div id="app">
        <!-- Player content will be injected here by the respective JS -->
    </div>

    <div class="audio-metadata">
        <p>Title: <span id="audio-meta-title">${metaTitle}</span></p>
        <p>Instrument: <span id="audio-meta-instrument">${metaInstrument}</span></p>
        <p>Note: <span id="audio-meta-note">${metaNote}</span> (<span id="audio-meta-frequency">${metaFrequency}</span>)</p> <!-- Frequency already includes " Hz" -->
        <p>Loop: <span id="audio-meta-loop">${metaIsLoop}</span>${isLoop && metaBPM !== 'N/A' ? `, BPM: <span id="audio-meta-bpm">${metaBPM}</span>` : ''}</p>
    </div>

    <script>
        window.audionalBase64_Opus = \`${audionalBase64Data}\`;
    <\/script>
    
    <script>
        window.audionalVisualBase64 = \`${audionalVisualBase64Data || ''}\`;
    <\/script>

    ${playerScripts}
</body>
</html>
`;
    return htmlContent;
}

// Make it available on the window object if HTML_Template.js is loaded as a separate script tag
window.HTML_Template = HTML_Template;