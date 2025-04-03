/**
 * Generates an HTML file content string with embedded Base64 image and audio.
 * The generated HTML displays an image that plays a sound when clicked.
 *
 * @param {string} imageBase64Data - The pure Base64 encoded string for the JPEG image (NO 'data:image/jpeg;base64,' prefix).
 * @param {string} audioBase64Data - The pure Base64 encoded string for the Opus audio (NO 'data:audio/opus;base64,' prefix).
 * @returns {string} A string containing the complete HTML document.
 */
function generateHtml(imageBase64Data, audioBase64Data) {
    // Validate inputs slightly (ensure they are strings, basic check)
    if (typeof imageBase64Data !== 'string' || typeof audioBase64Data !== 'string') {
      console.error("Error: Both imageBase64Data and audioBase64Data must be strings.");
      // Return a basic error HTML or throw an error
      return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error generating template: Invalid input data type.</h1></body></html>`;
    }
  
    // Use template literals (backticks `` ` ``) to embed the HTML structure
    // and inject the provided Base64 data into the correct places.
    const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Clickable Image with Sound</title>
      <style>
          /* --- CSS Styling Zone --- */
          html, body {
              height: 100%; margin: 0; padding: 0; overflow: hidden; box-sizing: border-box;
          }
          body {
              display: flex; justify-content: center; align-items: center; background-color: #f0f0f0;
          }
          #clickableImage {
              height: 80vh; width: 80vh; object-fit: cover; cursor: pointer;
              border: 2px solid black; box-shadow: 3px 3px 8px rgba(0,0,0,0.3);
          }
          #clickSoundPlayer { /* Changed ID slightly for clarity */
              display: none;
          }
          /* --- End CSS Styling Zone --- */
      </style>
  </head>
  <body>
  
      <!-- --- Embedded Base64 Data Zone (as JS variables) --- -->
      <script>
          // --- Base64 data injected by the template function ---
          const imageBase64 = \`${imageBase64Data}\`; // Injected Image Data
          const audioBase64_Opus = \`${audioBase64Data}\`; // Injected Audio Data
      </script>
      <!-- --- End Embedded Base64 Data Zone --- -->
  
  
      <!-- --- HTML Elements Zone --- -->
      <img id="clickableImage" alt="Clickable Image">
      <audio id="clickSoundPlayer">
          Your browser does not support the audio element.
      </audio>
      <!-- --- End HTML Elements Zone --- -->
  
  
      <script>
          /* --- JavaScript Logic Zone --- */
  
          // Get references to the HTML elements
          const imageElement = document.getElementById('clickableImage');
          const audioElement = document.getElementById('clickSoundPlayer');
          let audioObjectUrl = null; // To keep track of the blob URL
  
          console.log("DOM loaded. Initializing...");
  
          /**
           * Converts a Base64 string to an ArrayBuffer.
           * Returns null if the Base64 string is invalid.
           */
          function base64ToArrayBuffer(base64) {
              try {
                  // Added check for empty string which can cause issues
                  if (!base64 || base64.trim() === '') {
                      console.error("Error decoding Base64 string: Input is empty or whitespace.");
                      alert("Failed to decode Base64 data because it was empty. Please check the input data.");
                      return null;
                  }
                  const binaryString = window.atob(base64);
                  const len = binaryString.length;
                  const bytes = new Uint8Array(len);
                  for (let i = 0; i < len; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                  }
                  return bytes.buffer;
              } catch (e) {
                  console.error("Error decoding Base64 string:", e);
                  // Check if the error is due to invalid characters
                  if (e instanceof DOMException && e.name === 'InvalidCharacterError') {
                       alert("Failed to decode Base64 data. The data contains invalid characters and is likely corrupted or not valid Base64. Please check the input data (especially the audio data).");
                  } else {
                      alert("An unexpected error occurred while decoding Base64 data. Check console for details.");
                  }
                  return null;
              }
          }
  
          // --- Initialize Image ---
          // Check if imageBase64 variable exists and has content
          if (typeof imageBase64 !== 'undefined' && imageElement && imageBase64 && imageBase64.trim() !== '') {
              // Use direct data URI for the image
              imageElement.src = \`data:image/jpeg;base64,\${imageBase64}\`;
              console.log("Image source set.");
          } else {
              console.error("Image element or image Base64 data missing or empty.");
              if (imageElement) imageElement.alt = "Error loading image data.";
               // Display an error message to the user
               const errorDiv = document.createElement('div');
               errorDiv.textContent = 'Error: Image data is missing or invalid.';
               errorDiv.style.color = 'red';
               errorDiv.style.position = 'absolute';
               errorDiv.style.top = '10px';
               errorDiv.style.left = '10px';
               document.body.appendChild(errorDiv);
          }
  
          // --- Initialize Audio using Blob URL ---
          // Check if audioBase64_Opus variable exists and has content
          if (typeof audioBase64_Opus !== 'undefined' && audioElement && audioBase64_Opus && audioBase64_Opus.trim() !== '') {
              console.log("Attempting to process audio Base64 data...");
              const audioBuffer = base64ToArrayBuffer(audioBase64_Opus);
  
              if (audioBuffer) {
                  console.log("Base64 decoded successfully. Creating Blob...");
                  try {
                      // Create a Blob with the correct MIME type for Opus
                      const audioBlob = new Blob([audioBuffer], { type: 'audio/opus' });
                      console.log(\`Blob created. Type: \${audioBlob.type}, Size: \${audioBlob.size} bytes\`);
  
                      // Clean up previous object URL if one exists
                      if (audioObjectUrl) {
                          URL.revokeObjectURL(audioObjectUrl);
                          console.log("Revoked previous audio Object URL.");
                      }
  
                      // Create an Object URL from the Blob
                      audioObjectUrl = URL.createObjectURL(audioBlob);
                      console.log("Created new audio Object URL:", audioObjectUrl);
  
                      // Set the audio element's source to the Object URL
                      audioElement.src = audioObjectUrl;
                      console.log("Audio src set to Object URL.");
  
                      // Optional: Add listeners for more detailed audio state debugging
                      audioElement.onloadedmetadata = () => {
                           console.log("Audio metadata loaded successfully. Duration:", audioElement.duration);
                      };
                      audioElement.onerror = (e) => {
                          console.error("Audio Element Error:", audioElement.error);
                          let errorMsg = "Unknown audio error.";
                          // Ensure MediaError exists before accessing its properties
                          if (window.MediaError) {
                              switch (audioElement.error.code) {
                                  case MediaError.MEDIA_ERR_ABORTED: errorMsg = "Playback aborted."; break;
                                  case MediaError.MEDIA_ERR_NETWORK: errorMsg = "Network error caused audio download to fail."; break;
                                  case MediaError.MEDIA_ERR_DECODE: errorMsg = "Audio decoding error. The file might be corrupt or in an unsupported format (Opus). Check browser compatibility."; break;
                                  case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = "Audio source format not supported. Check Blob type ('audio/opus') and browser Opus support."; break;
                                  default: errorMsg = \`An unknown error occurred (Code: \${audioElement.error.code})\`;
                              }
                          } else {
                             errorMsg = "MediaError codes not available. Could not determine specific audio error."
                          }
                           console.error("Detailed Audio Error Message:", errorMsg);
                           alert(\`Error loading audio: \${errorMsg}\`);
                      };
  
                  } catch (blobError) {
                      console.error("Error creating Blob or Object URL:", blobError);
                      alert("Error processing audio data after decoding. Could not create Blob/URL.");
                  }
              } else {
                  // Error handled within base64ToArrayBuffer
                  console.error("Audio setup failed due to Base64 decoding error.");
                    // Display an error message to the user
                   const errorDiv = document.createElement('div');
                   errorDiv.textContent = 'Error: Audio data is missing or invalid.';
                   errorDiv.style.color = 'red';
                   errorDiv.style.position = 'absolute';
                   errorDiv.style.top = '30px'; // Position below image error
                   errorDiv.style.left = '10px';
                   document.body.appendChild(errorDiv);
              }
          } else {
              console.error("Audio element or audio Base64 data missing or empty.");
          }
  
          // --- Setup Click Listener ---
          if (imageElement && audioElement) {
              imageElement.addEventListener('click', () => {
                  console.log('Image clicked!');
  
                  // Check if audio source is set and seems valid (uses blob URL)
                  if (!audioElement.src || !audioElement.src.startsWith('blob:')) {
                      console.warn("Audio source is not set or invalid. Cannot play.");
                      alert("Audio is not ready to play (invalid source). Check console errors.");
                      return;
                  }
  
                   // Check if audio is ready (readyState >= 2 means enough data to play)
                  if (audioElement.readyState < 2) { // HAVE_CURRENT_DATA or higher
                       console.warn(\`Audio is not ready yet (readyState=\${audioElement.readyState}). Attempting to play anyway...\`);
                       // Display a temporary message if needed
                       // alert("Audio is loading, please wait a moment and click again.");
                       // return; // Optionally prevent playing if not ready
                  }
  
  
                  // Reset audio to the beginning
                  audioElement.currentTime = 0;
  
                  // Play the sound
                  console.log("Attempting to play audio...");
                  const playPromise = audioElement.play();
  
                  if (playPromise !== undefined) {
                      playPromise.then(_ => {
                          console.log('Audio playback started.');
                      }).catch(error => {
                          console.error("Audio playback failed:", error);
                          // Provide more specific feedback if possible
                          if (error.name === 'NotAllowedError') {
                               alert("Audio playback was blocked by the browser. Ensure you clicked the image first.");
                          } else if (error.name === 'NotSupportedError') {
                              alert("The audio format (Opus) might not be supported by your browser or there was an issue with the audio source.");
                          }
                           else {
                              alert("Could not play audio. Error: " + error.message + ". Check browser console for more details.");
                          }
                      });
                  }
              });
              console.log("Click listener added to image.");
  
          } else {
              console.error("Could not set up click listener because image or audio element was not found.");
          }
  
          // Optional: Clean up the Object URL when the page is closed/navigated away
          window.addEventListener('pagehide', () => { // 'pagehide' is often more reliable than 'unload'
              if (audioObjectUrl) {
                  URL.revokeObjectURL(audioObjectUrl);
                  console.log("Revoked audio Object URL on page hide.");
                  audioObjectUrl = null; // Prevent trying to revoke again
              }
          });
  
          /* --- End JavaScript Logic Zone --- */
      </script>
  
  </body>
  </html>
  `; // End of template literal
  
    return htmlContent;
  }
  
  // --- HOW TO USE THIS TEMPLATE ---
  
  /*
  1.  Save this code as `template.js`.
  2.  In another JavaScript file (or a Node.js script), import or require this function.
      Example (Node.js): const { generateHtml } = require('./template.js');
      Example (ES Module in Browser/Node): import { generateHtml } from './template.js';
  
  3.  Get your pure Base64 image data (JPEG, without prefix) and pure Base64 audio data (Opus, without prefix).
      ```javascript
      const myImageData = "iVBORw0KGgoAAAANSUhEUgAAAAUA..."; // Your actual LONG base64 image string
      const myAudioData = "T2dnUwACAAAAAAAAAABnHAAAAAAAAAAAAAAA..."; // Your actual LONG base64 audio string
      ```
  4.  Call the function to generate the HTML content:
      ```javascript
      const fullHtml = generateHtml(myImageData, myAudioData);
      ```
  5.  Use the `fullHtml` string:
      *   **Node.js:** Write it to a file:
          ```javascript
          const fs = require('fs');
          fs.writeFileSync('output.html', fullHtml, 'utf8');
          console.log('output.html file generated!');
          ```
      *   **Browser:** You could potentially set the content of an iframe or open a new window, but directly manipulating the current page's full document is usually not done this way. This template is more geared towards *generating* HTML files offline.
          ```javascript
          // Example: Create a download link in the browser
          function downloadHtml(filename, htmlContent) {
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = filename;
              link.click();
              URL.revokeObjectURL(link.href); // Clean up
          }
          // Assuming you are running this in a browser context after getting the data
          // const fullHtml = generateHtml(myImageData, myAudioData);
          // downloadHtml('my_clickable_image.html', fullHtml);
          ```
  */
  
  // --- Example Usage (for testing in Node.js) ---
  if (typeof module !== 'undefined' && module.exports) { // Basic check if running in Node.js
     // Export the function for use in other modules
     module.exports = { generateHtml };
  
     // Example of how to run it directly from Node.js for testing:
     // node template.js > test_output.html
     if (require.main === module) {
         console.log("Running template generation example...");
         // Provide short, valid placeholder Base64 data for testing
         // (Replace these with REAL data for actual use)
         // Placeholder 1x1 red pixel JPEG
         const placeholderImageBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+f+iiigD/2Q==";
         // Placeholder very short silent Opus file
         const placeholderAudioBase64 = "T2dnUwACAAAAAAAAAABnHAAAAAAAAAAAAAAAABP+L29wdXNIZWFkAQEIAAAAAABPZ2dTAAAAAAAAAAAAAABnHAEAAAAAAAAR/i9PcHVzVGFncx8AAABMYXZmNjAuMy4xMDAgbGlidm9wLXVzIDEuMy4xAAAA";
  
         const generatedHtml = generateHtml(placeholderImageBase64, placeholderAudioBase64);
          // Output to console (can be redirected to a file)
         // console.log(generatedHtml); // Use this if redirecting output: node template.js > output.html
          // Or write directly to a file (more robust):
         const fs = require('fs');
         fs.writeFileSync('example_output.html', generatedHtml, 'utf8');
         console.log("Generated example_output.html");
     }
  }


  /*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: OB1_Template.js</summary>

**Purpose:** Defines a function (`generateHtml`) that dynamically creates the complete HTML source code for a standalone "Audional OB1" file. This generated HTML file embeds Base64 encoded image and audio data and includes JavaScript logic to make the image playable (clicking it plays the embedded audio).

**Key Functions:**
*   `generateHtml(imageBase64Data, audioBase64Data)`: Takes *pure* Base64 strings (no data URI prefixes) for an image (JPEG) and audio (Opus) as input and returns a single string containing the full HTML document.
*   **(Internal to generated HTML):** The generated HTML includes JavaScript with functions like `base64ToArrayBuffer` for decoding, event listeners for the click-to-play functionality, audio loading/playback logic using Blobs and Object URLs, error handling, and cleanup (`revokeObjectURL`).

**Dependencies:**
*   None external for the `generateHtml` function itself.
*   The *output* HTML relies on standard browser APIs (DOM, Audio, Blob, URL, atob).

**Global Variables:**
*   Exports `generateHtml` using Node.js `module.exports` pattern (and likely intended for ES Module import). Contains example/test code runnable via Node.js.

**Notes:**
*   This is the core template generator for the final output file.
*   It strictly requires *pure* Base64 data as input.
*   The generated HTML is self-contained and includes inline CSS and JavaScript.
*   The internal JavaScript within the template is quite robust, handling Base64 decoding, Blob creation, audio playback promises, error reporting (via `alert` and `console`), and Object URL management.
*   Assumes the image format is JPEG (`image/jpeg`) and audio format is Opus (`audio/opus`) when creating data URIs/Blobs in the generated code.
</details>
-->
*/