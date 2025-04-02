/**
 * Main module for the image-to-base64 converter
 */

import { imageToBase64, createDownloadableTextFile } from './image-base64-handler.js';

// DOM elements
let fileInput;
let convertButton;
let imagePreview;
let base64Output;
let fileSizeInfo;
let downloadButton;
let originalFileName = '';

/**
 * Initialize the image-to-base64 converter
 */
export function initializeImageConverter() {
  console.log('Initializing image-to-base64 converter...');
  
  // Get DOM elements
  fileInput = document.getElementById('image-file-input');
  convertButton = document.getElementById('convert-image-button');
  imagePreview = document.getElementById('image-preview');
  base64Output = document.getElementById('base64-output');
  fileSizeInfo = document.getElementById('file-size-info');
  downloadButton = document.getElementById('download-base64-button');
  
  // Set up event listeners
  fileInput.addEventListener('change', handleFileSelect);
  convertButton.addEventListener('click', convertImageToBase64);
  downloadButton.addEventListener('click', downloadBase64AsText);
  
  // Initially disable the convert button
  convertButton.disabled = true;
  downloadButton.disabled = true;
}

/**
 * Handle file selection
 * @param {Event} event - The file input change event
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (file) {
    originalFileName = file.name;
    
    // Only accept image files
    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      fileInput.value = '';
      return;
    }
    
    // Display image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Display file info - using global formatFileSize
    fileSizeInfo.textContent = `Original Image: ${window.formatFileSize(file.size)}`;
    
    // Enable convert button
    convertButton.disabled = false;
  }
}

/**
 * Convert the selected image to base64
 */
async function convertImageToBase64() {
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select an image file first');
    return;
  }
  
  try {
    // Show loading state
    convertButton.textContent = 'Converting...';
    convertButton.disabled = true;
    
    // Convert image to base64
    const base64String = await imageToBase64(file);
    
    // Display the base64 string in the output textarea
    base64Output.value = base64String;
    base64Output.style.display = 'block';
    
    // Calculate and display base64 size - using global functions
    const base64Size = window.calculateBase64Size(base64String);
    fileSizeInfo.textContent = `Original Image: ${window.formatFileSize(file.size)} | Base64 Text: ${window.formatFileSize(base64Size)}`;
    
    // Enable download button
    downloadButton.disabled = false;
    
    // Reset convert button
    convertButton.textContent = 'Convert to Base64';
    convertButton.disabled = false;
  } catch (error) {
    console.error('Error converting image:', error);
    alert('Error converting image to base64');
    
    // Reset convert button
    convertButton.textContent = 'Convert to Base64';
    convertButton.disabled = false;
  }
}

/**
 * Download the base64 string as a text file
 */
function downloadBase64AsText() {
  const base64String = base64Output.value;
  
  if (!base64String) {
    alert('No base64 data to download');
    return;
  }
  
  const { url, fileName } = createDownloadableTextFile(base64String, originalFileName);
  
  // Create a temporary link and trigger download
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}