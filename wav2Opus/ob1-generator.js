// ob1-generator.js - Handles OB1 generation using the generateHtml template function

// State variables to track the base64 data
let audioBase64 = null;
let imageBase64 = null;

// DOM element references for the modal
const generateOB1Button = document.getElementById('generateOB1Button');
const metadataModal = document.getElementById('metadataModal');
const metadataForm = document.getElementById('metadataForm');
const cancelMetadataBtn = document.getElementById('cancelMetadataBtn');
const instrumentInput = document.getElementById('instrumentInput'); // Get input fields
const noteInput = document.getElementById('noteInput');
const frequencyInput = document.getElementById('frequencyInput');

/**
 * Helper function to strip the data URI prefix
 * (Keep this function as it is)
 */
function stripDataURIPrefix(dataString) {
  if (typeof dataString !== 'string') return '';
  const commaIndex = dataString.indexOf(',');
  if (commaIndex !== -1) {
    return dataString.substring(commaIndex + 1);
  }
  return dataString;
}

/**
 * Initialize the OB1 generator
 */
function initOB1Generator() {
  if (!generateOB1Button || !metadataModal || !metadataForm || !cancelMetadataBtn || !instrumentInput || !noteInput || !frequencyInput) {
    console.error("OB1 Generator or Modal elements not found! Check HTML IDs.");
    if (generateOB1Button) generateOB1Button.disabled = true; // Disable button if modal is broken
    return;
  }

  // --- Event Listeners ---
  // 1. Main Generate Button: Shows the modal
  generateOB1Button.addEventListener('click', showMetadataModal);

  // 2. Modal Form Submission: Gathers data and triggers actual generation
  metadataForm.addEventListener('submit', handleMetadataSubmit);

  // 3. Modal Cancel Button: Hides the modal
  cancelMetadataBtn.addEventListener('click', hideMetadataModal);

  // 4. Listen for base64 data updates (Keep these)
  document.addEventListener('audioBase64Generated', function(e) {
    console.log("Received audioBase64Generated event");
    updateAudioBase64(e.detail.base64Data);
  });
  document.addEventListener('imageBase64Generated', function(e) {
    console.log("Received imageBase64Generated event");
    updateImageBase64(e.detail.base64Data);
  });

  checkGenerateButtonState(); // Check initial button state
  console.log("OB1 Generator Initialized with Modal Logic");
}

/**
 * Shows the metadata input modal.
 */
function showMetadataModal() {
    // Optional: Pre-fill form with defaults or last used values if needed
    // instrumentInput.value = instrumentInput.value || 'Default Instrument'; // Example
    metadataModal.classList.remove('hidden');
}

/**
 * Hides the metadata input modal.
 */
function hideMetadataModal() {
    metadataModal.classList.add('hidden');
}

/**
 * Handles the submission of the metadata form.
 * @param {Event} event - The form submission event.
 */
function handleMetadataSubmit(event) {
    event.preventDefault(); // Prevent default page reload on form submit
    console.log("Metadata form submitted.");

    // 1. Get values from the modal form
    const instrument = instrumentInput.value.trim();
    const note = noteInput.value.trim();
    const frequency = frequencyInput.value.trim();

    // Basic validation (can be expanded)
    if (!instrument || !note || !frequency) {
        alert("Please fill in all metadata fields.");
        return;
    }

    // 2. Hide the modal
    hideMetadataModal();

    // 3. Call the actual generation function with the collected metadata
    generateOB1File(instrument, note, frequency);
}


/**
 * Updates the internal audio base64 data state.
 * (Keep this function as it is)
 */
function updateAudioBase64(base64Data) {
  audioBase64 = base64Data;
  console.log("Audio Base64 state updated.");
  checkGenerateButtonState();
}

/**
 * Updates the internal image base64 data state.
 * (Keep this function as it is)
 */
function updateImageBase64(base64Data) {
  imageBase64 = base64Data;
  console.log("Image Base64 state updated.");
  checkGenerateButtonState();
}

/**
 * Checks if both audio and image base64 data are available
 * and enables/disables the generate button accordingly.
 * (Keep this function as it is)
 */
function checkGenerateButtonState() {
    const audioReady = typeof audioBase64 === 'string' && audioBase64.trim() !== '';
    const imageReady = typeof imageBase64 === 'string' && imageBase64.trim() !== '';

    if (audioReady && imageReady) {
        generateOB1Button.disabled = false;
        console.log("OB1 Generate button ENABLED.");
    } else {
        generateOB1Button.disabled = true;
        // console.log("OB1 Generate button remains disabled.");
    }
}

/**
 * Generates the OB1 HTML file using the generateHtml function and triggers download.
 * NOW takes metadata as arguments.
 * @param {string} instrument - The instrument name.
 * @param {string} note - The note value.
 * @param {string} frequency - The frequency value.
 */
function generateOB1File(instrument, note, frequency) { // Renamed from generateOB1 to avoid confusion
  console.log("Starting OB1 file generation with metadata:", { instrument, note, frequency });

  // 1. Final check if base64 data exists (already checked by button state, but good safeguard)
  if (!audioBase64 || !imageBase64) {
    console.error("Cannot generate OB1: Missing audio or image Base64 data.");
    alert("Error: Missing audio or image Base64 data. Please ensure both have been generated.");
    return;
  }

  // 2. Ensure the generateHtml function is available
  if (typeof generateHtml !== 'function') {
      console.error("CRITICAL ERROR: generateHtml function not found. Make sure OB1_Template2.js loaded correctly.");
      alert("Error: HTML template generation function is missing. Cannot create file.");
      return;
  }

  // 3. Strip potential data URI prefixes
  const pureAudioBase64 = stripDataURIPrefix(audioBase64);
  const pureImageBase64 = stripDataURIPrefix(imageBase64);

  // 4. Validate pure data
   if (!pureAudioBase64 || !pureImageBase64) {
    console.error("Error extracting pure Base64 data.");
    alert("Error: Could not prepare Base64 data. Please check the console.");
    return;
  }

  console.log("Calling generateHtml with pure base64 data and metadata...");

  // 5. Call the imported generateHtml function WITH METADATA
  const htmlContent = generateHtml(
      pureImageBase64,
      pureAudioBase64,
      instrument,
      note,
      frequency
  );

  // 6. Check if HTML generation failed
  if (htmlContent.includes("Error generating template")) {
      console.error("generateHtml function reported an error.");
      // Alert is likely shown by generateHtml itself
      return;
  }

  // --- Download Logic (Keep this logic as it is) ---
  try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Audional_OB1_Clickable_${timestamp}.html`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      console.log(`Successfully generated and triggered download for: ${filename}`);
  } catch (error) {
      console.error("Error during Blob creation or download:", error);
      alert("An error occurred while trying to create or download the HTML file.");
  }
}

// Initialize the OB1 generator when the DOM is loaded
document.addEventListener('DOMContentLoaded', initOB1Generator);