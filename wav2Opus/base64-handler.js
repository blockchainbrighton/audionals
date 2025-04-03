// base64-handler.js

/**
 * Converts a Blob to a Base64 encoded string (without the data URI prefix).
 * @param {Blob} blob - The blob to convert.
 * @returns {Promise<string>} A promise resolving with the Base64 string.
 */
const convertBlobToBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // Find the comma and take the part after it
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex !== -1 && commaIndex < dataUrl.length - 1) {
        resolve(dataUrl.substring(commaIndex + 1));
      } else {
        reject(new Error('Invalid Data URL format during Base64 conversion.'));
      }
    };
    reader.onerror = (e) => reject(new Error(`Error reading blob as Data URL: ${e.message || 'Unknown error'}`));
    reader.onabort = () => reject(new Error('Blob reading for Base64 conversion was aborted.'));
  
    try {
        reader.readAsDataURL(blob);
    } catch(err) {
        reject(new Error(`Failed to initiate Blob reading: ${err.message}`));
    }
  });
  
  /**
   * Sets up the Base64 output section with the converted audio.
   * @param {Blob} audioBlob - The converted audio blob.
   * @param {string} outputFormat - 'mp3' or 'opus'.
   * @param {string} originalNameBase - The base filename of the original input.
   */
  const setupBase64DisplayAndActions = async (audioBlob, outputFormat, originalNameBase) => {
    if (!base64Container || !base64Output || !base64Result || !copyBase64Btn || !downloadBase64Btn) {
        console.error("Base64 UI elements not found.");
        return;
    }
  
    try {
      updateStatus('Converting audio to Base64...');
      base64String = await convertBlobToBase64(audioBlob); // Update state
      base64Container.style.display = 'block';
      base64Output.textContent = base64String; // Display the string
  
      // Clear previous player and create a new one for the Base64 audio (optional but good for verification)
      base64Result.innerHTML = ''; // Clear previous results
      const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus';
      const base64PlayerContainer = createAudioPlayer(audioBlob, mimeType, 'Base64 Audio'); // Reuse the original blob
      base64Result.appendChild(base64PlayerContainer);
      // If using observer in createAudioPlayer: base64PlayerContainer.startObserving(base64Result);
  
      // Setup Copy Button
      copyBase64Btn.onclick = () => {
        if (!navigator.clipboard) {
            alert('Clipboard API not available. Try copying manually.');
            return;
        }
        navigator.clipboard.writeText(base64String)
          .then(() => {
            const origText = copyBase64Btn.textContent;
            copyBase64Btn.textContent = 'Copied!';
            copyBase64Btn.disabled = true;
            setTimeout(() => {
                copyBase64Btn.textContent = origText;
                copyBase64Btn.disabled = false;
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy base64:', err);
            alert('Failed to copy to clipboard. Check browser permissions (requires HTTPS or localhost).');
          });
      };
      copyBase64Btn.disabled = false; // Ensure enabled
  
      // Setup Download Button
      downloadBase64Btn.onclick = () => {
        try {
          const txtBlob = new Blob([base64String], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(txtBlob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `${originalNameBase}.${outputFormat}.base64.txt` // e.g., myaudio.mp3.base64.txt
          });
          document.body.appendChild(a); // Required for Firefox
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url); // Clean up URL
        } catch (dlError) {
            console.error("Error creating/downloading base64 txt file:", dlError);
            alert("Failed to prepare base64 text file for download.");
        }
      };
      downloadBase64Btn.disabled = false; // Ensure enabled
  
      // Update download button text with size
      const base64TextSizeBytes = base64String.length; // Size of the string representation (approx byte size)
      downloadBase64Btn.textContent = `Download as TXT (${formatBytes(base64TextSizeBytes)})`;
  
      updateStatus('Base64 conversion complete!');
  
    } catch (e) {
      updateStatus(`Base64 processing failed: ${e.message || 'Unknown error'}`, true);
      console.error("Base64 Processing Error:", e);
      base64Container.style.display = 'none'; // Hide section on error
      base64String = null; // Clear state
      base64Result.innerHTML = ''; // Clear any partial results
      copyBase64Btn.disabled = true;
      downloadBase64Btn.disabled = true;
    }
  };

 // Add this to the end of your base64-handler.js file

/**
 * Add this to your existing setupBase64DisplayAndActions function
 * Right after the line where base64String is set from convertBlobToBase64
 * For example:
 * 
 * base64String = await convertBlobToBase64(audioBlob); // Update state
 * 
 * // Add this code right below that line:
 * // Update OB1 generator with the audio base64 data
 * if (typeof window.updateAudioBase64 === 'function') {
 *   window.updateAudioBase64(base64String);
 * }
 */

// Specifically, modify the setupBase64DisplayAndActions function as follows:

// Original:
// try {
//   updateStatus('Converting audio to Base64...');
//   base64String = await convertBlobToBase64(audioBlob); // Update state
//   base64Container.style.display = 'block';
//   ...

// Modified:
// try {
//   updateStatus('Converting audio to Base64...');
//   base64String = await convertBlobToBase64(audioBlob); // Update state
//   
//   // Update OB1 generator with the audio base64 data
//   if (typeof window.updateAudioBase64 === 'function') {
//     window.updateAudioBase64(base64String);
//   }
//   
//   base64Container.style.display = 'block';
//   ...