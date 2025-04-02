// ob1-generator.js - Handles OB1 generation functionality

// State variables to track the base64 data
let audioBase64 = null;
let imageBase64 = null;

// DOM element references
const generateOB1Button = document.getElementById('generateOB1Button');

/**
 * Initialize the OB1 generator
 */
function initOB1Generator() {
  // Set up event listeners
  if (generateOB1Button) {
    generateOB1Button.addEventListener('click', generateOB1);
    
    // Check if the button should be enabled
    checkGenerateButton();
    
    console.log('OB1 Generator initialized');
  } else {
    console.error('Generate OB1 button not found in the DOM');
  }
}

/**
 * Updates the audio base64 data and checks if the generate button should be enabled
 * @param {string} base64Data - The base64 audio data
 */
function updateAudioBase64(base64Data) {
  audioBase64 = base64Data;
  checkGenerateButton();
  console.log('Audio base64 data updated');
}

/**
 * Updates the image base64 data and checks if the generate button should be enabled
 * @param {string} base64Data - The base64 image data
 */
function updateImageBase64(base64Data) {
  // If the base64 data includes the data URL prefix, remove it
  if (base64Data.includes(',')) {
    imageBase64 = base64Data.split(',')[1];
  } else {
    imageBase64 = base64Data;
  }
  
  checkGenerateButton();
  console.log('Image base64 data updated');
}

/**
 * Checks if both audio and image base64 data are available and enables/disables the button accordingly
 */
function checkGenerateButton() {
  if (generateOB1Button) {
    if (audioBase64 && imageBase64) {
      generateOB1Button.disabled = false;
      console.log('Generate OB1 button enabled');
    } else {
      generateOB1Button.disabled = true;
    }
  }
}

/**
 * Generates the OB1 HTML file with embedded audio and image
 */
function generateOB1() {
  // Get the template HTML
  const template = document.getElementById('ob1Template');
  
  if (!template) {
    console.error('OB1 template not found in the DOM');
    return;
  }
  
  const templateHTML = template.innerHTML;
  
  // Ensure the base64 data has the correct prefix
  const imageDataWithPrefix = `data:image/png;base64,${imageBase64}`;
      
  // Determine the audio format from appState or use a default
  let audioMimeType = 'audio/opus';
  if (window.appState && window.appState.selectedFormat === 'mp3') {
    audioMimeType = 'audio/mpeg';
  }
  
  const audioDataWithPrefix = `data:${audioMimeType};base64,${audioBase64}`;
  
  // Replace the placeholders with the actual data
  let htmlContent = templateHTML
      .replace('{{IMAGE_BASE64}}', imageDataWithPrefix)
      .replace('{{AUDIO_BASE64}}', audioDataWithPrefix);
  
  // Create a Blob from the HTML content
  const blob = new Blob([htmlContent], { type: 'text/html' });
  
  // Generate a timestamp for the filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  // Get original filenames if available
  let baseName = 'audional';
  if (window.appState) {
    if (window.appState.originalFilename) {
      baseName = getBaseFilename(window.appState.originalFilename);
    }
  }
  
  // Create a download link for the file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${baseName}_ob1_${timestamp}.html`;
  
  // Update status if the function exists
  if (typeof updateStatus === 'function') {
    updateStatus('Generating OB1 HTML file...');
  }
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  
  // Update status if the function exists
  if (typeof updateStatus === 'function') {
    updateStatus('OB1 HTML file generated successfully!');
  } else {
    console.log('OB1 HTML file generated successfully!');
  }
}

// Initialize the OB1 generator when the DOM is loaded
document.addEventListener('DOMContentLoaded', initOB1Generator);

// Export functions for other modules to use
window.updateAudioBase64 = updateAudioBase64;
window.updateImageBase64 = updateImageBase64;
window.checkGenerateButton = checkGenerateButton;