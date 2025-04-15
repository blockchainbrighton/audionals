import { encode } from '@jsquash/avif';

// --- DOM Elements ---
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const convertButton = document.getElementById('convertButton');
const statusElement = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');
const outputSizeElement = document.getElementById('outputSize');
const qualityRange = document.getElementById('qualityRange');
const qualityValue = document.getElementById('qualityValue');
const effortRange = document.getElementById('effortRange');
const effortValue = document.getElementById('effortValue');

let sourceImageData = null; // To store ImageData for conversion
let sourceFileName = 'image'; // Default filename base
let sourceFileSize = 0;

// --- Event Listeners ---

// Update slider value display
qualityRange.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
});
effortRange.addEventListener('input', (e) => {
    effortValue.textContent = e.target.value;
});


// Handle file selection
imageInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        resetUI();
        return;
    }

    sourceFileName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
    sourceFileSize = file.size;
    statusElement.textContent = 'Loading image...';
    convertButton.disabled = true;
    downloadLink.style.display = 'none';
    outputSizeElement.textContent = '';
    previewImage.style.display = 'none';

    try {
        // Display preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Load image data onto canvas (needed for encode function)
        sourceImageData = await loadImageData(file);

        statusElement.textContent = `Ready to convert. Original size: ${formatBytes(sourceFileSize)}`;
        convertButton.disabled = false;

    } catch (error) {
        console.error("Error loading image:", error);
        statusElement.textContent = `Error loading image: ${error.message}`;
        resetUI();
    }
});

// Handle conversion button click
convertButton.addEventListener('click', async () => {
    if (!sourceImageData) {
        statusElement.textContent = 'No image data loaded.';
        return;
    }

    convertButton.disabled = true;
    downloadLink.style.display = 'none';
    outputSizeElement.textContent = '';
    statusElement.textContent = 'Converting to AVIF... (this may take a moment)';

    // --- AVIF Encoding Options ---
    // Map slider values to AVIF options
    // qualityRange (0-100) -> cqLevel (100-0, lower is higher quality for AVIF)
    const cqLevel = 100 - parseInt(qualityRange.value, 10);
    // effortRange (0-10) -> speed (10-0, higher is faster/lower quality)
    const speed = 10 - parseInt(effortRange.value, 10);

    const encodeOptions = {
        cqLevel: cqLevel, // Quantization level (0-63 typical range in libavif, but map 0-100 for UI) -> lower = higher quality
        speed: speed,       // Encoding speed (0-10). Higher is faster, lower quality/compression. 0 = slowest/best.
        // Other options:
        // subample: 0=4:4:4, 1=4:2:2, 2=4:2:0 (default), 3=4:0:0
        // tileRowsLog2: 0-6
        // tileColsLog2: 0-6
        // denoiseLevel: 0-50
        // enableSharpness: false/true
    };

    console.log('Encoding with options:', encodeOptions);

    try {
        const startTime = performance.now();
        // --- Call the AVIF encode function ---
        const avifBuffer = await encode(sourceImageData, encodeOptions);
        const endTime = performance.now();

        const blob = new Blob([avifBuffer], { type: 'image/avif' });
        const url = URL.createObjectURL(blob);

        // --- Update UI with result ---
        downloadLink.href = url;
        downloadLink.download = `${sourceFileName}.avif`;
        downloadLink.style.display = 'inline-block';

        const avifSize = blob.size;
        const sizeReduction = sourceFileSize > 0 ? ((sourceFileSize - avifSize) / sourceFileSize) * 100 : 0;

        statusElement.textContent = `✅ Conversion successful! (${((endTime - startTime) / 1000).toFixed(2)}s)`;
        outputSizeElement.textContent = `AVIF Size: ${formatBytes(avifSize)} (${sizeReduction.toFixed(1)}% smaller)`;

        // Re-enable button for another conversion (if desired) or new file
        convertButton.disabled = false;

    } catch (error) {
        console.error("Error encoding AVIF:", error);
        statusElement.textContent = `Error during conversion: ${error.message}`;
        convertButton.disabled = false; // Re-enable on error
    }
});


// --- Helper Functions ---

/**
 * Loads an image file and draws it onto a canvas to get ImageData.
 * @param {File} file - The image file object.
 * @returns {Promise<ImageData>} - A promise that resolves with the ImageData.
 */
function loadImageData(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectURL = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get 2D canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectURL); // Clean up the object URL
            resolve(imageData);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectURL); // Clean up on error too
            reject(new Error(`Failed to load image: ${err.message}`));
        };

        img.src = objectURL;
    });
}

/**
 * Resets the UI elements to their initial state.
 */
function resetUI() {
    previewImage.style.display = 'none';
    previewImage.src = '#';
    convertButton.disabled = true;
    statusElement.textContent = 'Please select an image file.';
    downloadLink.style.display = 'none';
    downloadLink.href = '#';
    outputSizeElement.textContent = '';
    sourceImageData = null;
    sourceFileName = 'image';
    sourceFileSize = 0;
    // Don't reset sliders, keep user preference
}

/**
 * Formats bytes into a human-readable string (KB, MB).
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initial state
resetUI();