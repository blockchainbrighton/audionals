/**
 * Converts a Base64 string to an ArrayBuffer.
 * Returns null if the Base64 string is invalid or empty.
 */
export function base64ToArrayBuffer(base64) {
    // Use optional chaining and nullish coalescing
    const trimmedBase64 = base64?.trim();
    if (!trimmedBase64) {
        console.error("Error decoding Base64 string: Input is empty or null.");
        return null;
    }

    try {
        // Standard Base64 decoding
        const binaryString = window.atob(trimmedBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        // More efficient loop using charCodeAt directly
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`Base64 decoded successfully to ArrayBuffer (Length: ${bytes.buffer.byteLength})`);
        return bytes.buffer;
    } catch (e) {
        console.error("Error decoding Base64 string:", e);
        // Provide specific feedback for common errors
        if (e instanceof DOMException && e.name === 'InvalidCharacterError') {
             alert("Failed to decode Base64 audio data. It might be corrupted, incomplete, or not valid Base64.");
        } else {
            alert("An unexpected error occurred while decoding Base64 data. Check console.");
        }
        return null; // Return null on any decoding error
    }
}

// --- REMOVED ---
// createBlobUrl - No longer needed as the HTML audio element using Blob URLs is removed.