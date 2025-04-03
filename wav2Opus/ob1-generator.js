// ob1-generator.js - Handles OB1 generation using the generateHtml template function

// State variables to track the base64 data (might include data URI prefix initially)
let audioBase64 = null;
let imageBase64 = null;

// DOM element reference
const generateOB1Button = document.getElementById('generateOB1Button');

/**
 * Helper function to strip the data URI prefix (e.g., "data:image/jpeg;base64,")
 * Returns the pure Base64 string.
 * @param {string} dataString - The string potentially containing a data URI prefix.
 * @returns {string} The pure Base64 string, or the original string if no prefix found.
 */
function stripDataURIPrefix(dataString) {
  if (typeof dataString !== 'string') return ''; // Handle non-string input
  const commaIndex = dataString.indexOf(',');
  if (commaIndex !== -1) {
    return dataString.substring(commaIndex + 1);
  }
  // If no comma found, assume it's already pure or invalid - return as is for generateHtml validation
  return dataString;
}


/**
 * Initialize the OB1 generator
 */
function initOB1Generator() {
  if (!generateOB1Button) {
    console.error("Generate OB1 button not found!");
    return;
  }

  // Set up event listeners
  generateOB1Button.addEventListener('click', generateOB1);

  // Check initial button state
  checkGenerateButtonState(); // Use a more descriptive name

  // Listen for custom events from the audio and image converters
  // Assumes events 'audioBase64Generated' and 'imageBase64Generated' are dispatched
  // with the base64 data (potentially with prefix) in event.detail.base64Data
  document.addEventListener('audioBase64Generated', function(e) {
    console.log("Received audioBase64Generated event");
    updateAudioBase64(e.detail.base64Data);
  });

  document.addEventListener('imageBase64Generated', function(e) {
    console.log("Received imageBase64Generated event");
    updateImageBase64(e.detail.base64Data);
  });

  console.log("OB1 Generator Initialized");
}

/**
 * Updates the internal audio base64 data state.
 * @param {string} base64Data - The base64 audio data (may include prefix).
 */
function updateAudioBase64(base64Data) {
  audioBase64 = base64Data;
  console.log("Audio Base64 state updated."); // Add length check if needed: , length:", base64Data?.length);
  checkGenerateButtonState();
}

/**
 * Updates the internal image base64 data state.
 * @param {string} base64Data - The base64 image data (may include prefix).
 */
function updateImageBase64(base64Data) {
  imageBase64 = base64Data;
  console.log("Image Base64 state updated."); // Add length check if needed: , length:", base64Data?.length);
  checkGenerateButtonState();
}

/**
 * Checks if both audio and image base64 data are available (exist and are non-empty strings)
 * and enables/disables the generate button accordingly.
 */
function checkGenerateButtonState() {
    // Check if both internal variables hold non-empty string data
    const audioReady = typeof audioBase64 === 'string' && audioBase64.trim() !== '';
    const imageReady = typeof imageBase64 === 'string' && imageBase64.trim() !== '';

    if (audioReady && imageReady) {
        generateOB1Button.disabled = false;
        console.log("OB1 Generate button ENABLED.");
    } else {
        generateOB1Button.disabled = true;
        // console.log("OB1 Generate button remains disabled."); // Keep console less noisy
    }
}

/**
 * Generates the OB1 HTML file using the generateHtml function and triggers download.
 */
function generateOB1() {
  console.log("Generate OB1 button clicked.");

  // 1. Final check if data exists
  if (!audioBase64 || !imageBase64) {
    console.error("Cannot generate OB1: Missing audio or image Base64 data in internal state.");
    alert("Error: Missing audio or image Base64 data. Please ensure both have been generated successfully above.");
    return;
  }

  // 2. Ensure the generateHtml function is available (loaded from OB1_Template.js)
  if (typeof generateHtml !== 'function') {
      console.error("CRITICAL ERROR: generateHtml function not found. Make sure OB1_Template.js loaded correctly BEFORE ob1-generator.js.");
      alert("Error: HTML template generation function is missing. Cannot create file. Check browser console for errors.");
      return;
  }

  // 3. Strip potential data URI prefixes to get PURE base64
  //    The generateHtml function explicitly requires PURE data.
  const pureAudioBase64 = stripDataURIPrefix(audioBase64);
  const pureImageBase64 = stripDataURIPrefix(imageBase64);

  // 4. Validate pure data (basic check - generateHtml does more)
   if (!pureAudioBase64 || !pureImageBase64) {
    console.error("Error extracting pure Base64 data. Check original data format.", { audio: audioBase64?.substring(0,50), image: imageBase64?.substring(0,50) });
    alert("Error: Could not prepare Base64 data. Please check the console.");
    return;
  }

  console.log("Calling generateHtml with pure base64 data...");
  // 5. Call the imported generateHtml function
  const htmlContent = generateHtml(pureImageBase64, pureAudioBase64); // Note: Image first, then Audio

  // 6. Check if HTML generation failed (generateHtml might return an error HTML)
  if (htmlContent.includes("Error generating template")) {
      console.error("generateHtml function reported an error.");
      // Alert is likely shown by generateHtml itself or its sub-functions
      return;
  }

  // --- Download Logic (remains largely the same) ---
  try {
      // 7. Create a Blob from the generated HTML content
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });

      // 8. Generate a timestamp for the filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Audional_OB1_Clickable_${timestamp}.html`;

      // 9. Create a download link and trigger click
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;

      document.body.appendChild(link); // Append link to body
      link.click(); // Programmatically click the link to trigger download
      document.body.removeChild(link); // Remove the link from the DOM

      // 10. Clean up the Object URL
      URL.revokeObjectURL(link.href);

      console.log(`Successfully generated and triggered download for: ${filename}`);
      // Optional: Provide user feedback on the page
      // alert(`Generated HTML file: ${filename}`);

  } catch (error) {
      console.error("Error during Blob creation or download:", error);
      alert("An error occurred while trying to create or download the HTML file. Check the console for details.");
  }
}

// Initialize the OB1 generator when the DOM is loaded
// Using DOMContentLoaded ensures the button element exists
document.addEventListener('DOMContentLoaded', initOB1Generator);

// No need to export via window if other scripts use the events or if this is self-contained.
// If other modules NEED to call these functions directly (less ideal than events),
// you would use proper ES Module exports `export { functionName };`
// and import them where needed: `import { functionName } from './ob1-generator.js';`
// For now, removing the window exports as the event-driven approach seems intended.
// window.updateAudioBase64 = updateAudioBase64; // Remove unless needed elsewhere
// window.updateImageBase64 = updateImageBase64; // Remove unless needed elsewhere
// window.checkGenerateButton = checkGenerateButtonState; // Remove unless needed elsewhere

// CRITICAL: Remove the duplicate generateHtml function definition from the end of this file.
// It should only exist in OB1_Template.js