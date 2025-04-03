/**
 * Handles the conversion of image files to base64 strings
 */

/**
 * Converts an image file to a base64 string
 * @param {File} imageFile - The image file to convert
 * @returns {Promise<string>} A promise that resolves with the base64 string
 */
export function imageToBase64(imageFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = event.target.result;
        
        // Extract just the base64 data without the prefix
        const base64Data = base64String.split(',')[1];
        
        // Update OB1 generator with the base64 image data
        if (typeof window.updateImageBase64 === 'function') {
          window.updateImageBase64(base64Data);
          console.log('Image base64 data sent to OB1 generator');
        } else {
          console.warn('updateImageBase64 function not found on window object');
        }
        
        resolve(base64String);
      };
      
      reader.onerror = (error) => {
        reject(new Error('Error converting image to base64: ' + error));
      };
      
      reader.readAsDataURL(imageFile);
    });
  }
  
  /**
   * Creates a downloadable text file from a base64 string
   * @param {string} base64String - The base64 string
   * @param {string} originalFileName - Original file name to derive the text file name
   * @returns {string} The URL for downloading the text file
   */
  export function createDownloadableTextFile(base64String, originalFileName) {
    // Create a text file with the base64 content
    const blob = new Blob([base64String], { type: 'text/plain' });
    
    // Generate filename by replacing the original extension with .txt
    const fileName = originalFileName.replace(/\.[^/.]+$/, '') + '_base64.txt';
    
    return {
      url: URL.createObjectURL(blob),
      fileName: fileName
    };
  }
  
  /**
   * Initialize the image converter with OB1 integration
   * Add this function to your module or modify your existing initialization
   */
  export function initializeImageConverter() {
    const fileInput = document.getElementById('image-file-input');
    const convertButton = document.getElementById('convert-image-button');
    const imagePreview = document.getElementById('image-preview');
    const base64Output = document.getElementById('base64-output');
    const downloadButton = document.getElementById('download-base64-button');
    const fileSizeInfo = document.getElementById('file-size-info');
    
    let selectedFile = null;
    
    // Event listeners
    if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
        selectedFile = event.target.files[0];
        
        if (selectedFile) {
          // Display file info
          if (fileSizeInfo) {
            // Use the window.formatBytes function instead of formatFileSize
            // This accesses the utility function that's attached to the window object
            fileSizeInfo.textContent = `File: ${selectedFile.name} (${window.formatBytes(selectedFile.size)})`;
          }
          
          // Preview image
          const reader = new FileReader();
          reader.onload = (e) => {
            if (imagePreview) {
              imagePreview.src = e.target.result;
              imagePreview.style.display = 'block';
            }
          };
          reader.readAsDataURL(selectedFile);
          
          // Enable convert button
          if (convertButton) {
            convertButton.disabled = false;
          }
        }
      });
    }
    
    if (convertButton) {
      convertButton.addEventListener('click', async () => {
        if (selectedFile) {
          try {
            const base64Result = await imageToBase64(selectedFile);
            const base64Data = base64Result.split(',')[1]; // Remove the data URL prefix
            
            // Display base64 output
            if (base64Output) {
              base64Output.value = base64Data;
              base64Output.style.display = 'block';
            }
            
            // Enable download button
            if (downloadButton) {
              downloadButton.disabled = false;
            }
            
            // Make sure to explicitly call updateImageBase64 again with the extracted data
            // This ensures it gets called even if the implementation changes
            if (typeof window.updateImageBase64 === 'function') {
              window.updateImageBase64(base64Data);
              console.log('Image base64 data sent to OB1 generator after conversion');
            }
            
          } catch (error) {
            console.error('Error converting image:', error);
            alert('Failed to convert image to base64.');
          }
        }
      });
    }
    
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        if (base64Output && base64Output.value && selectedFile) {
          const downloadInfo = createDownloadableTextFile(base64Output.value, selectedFile.name);
          
          const link = document.createElement('a');
          link.href = downloadInfo.url;
          link.download = downloadInfo.fileName;
          link.click();
          
          URL.revokeObjectURL(downloadInfo.url);
        }
      });
    }
    
    // Check if OB1 generator is initialized on the window
    if (typeof window.checkGenerateButton !== 'function') {
      console.warn('OB1 generator functions not found. Make sure ob1-generator.js is loaded.');
    }
  }