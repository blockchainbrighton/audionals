/**
 * Converts a Base64 string to an ArrayBuffer.
 * Returns null if the Base64 string is invalid or empty.
 */
export function base64ToArrayBuffer(base64) {
    try {
        if (!base64 || base64.trim() === '') {
            console.error("Error decoding Base64 string: Input is empty or whitespace.");
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

/**
 * Creates a Blob URL from an ArrayBuffer and MIME type.
 * Handles cleanup of a previously provided URL.
 *
 * @param {ArrayBuffer} buffer The audio data buffer.
 * @param {string} type The MIME type (e.g., 'audio/opus').
 * @param {string|null} previousUrl Optional: The previous Object URL to revoke.
 * @returns {string|null} The new Object URL or null on error.
 */
export function createBlobUrl(buffer, type, previousUrl = null) {
    if (!buffer) {
        console.error("Cannot create Blob URL: Invalid buffer provided.");
        return null;
    }
    try {
        const blob = new Blob([buffer], { type: type });
        console.log(`Blob created. Type: ${blob.type}, Size: ${blob.size} bytes`);

        // Clean up previous object URL if one exists
        if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
            console.log("Revoked previous Object URL:", previousUrl);
        }

        // Create an Object URL from the Blob
        const newUrl = URL.createObjectURL(blob);
        console.log("Created new Object URL:", newUrl);
        return newUrl;

    } catch (blobError) {
        console.error("Error creating Blob or Object URL:", blobError);
        alert("Error processing data after decoding. Could not create Blob/URL.");
        return null;
    }
}