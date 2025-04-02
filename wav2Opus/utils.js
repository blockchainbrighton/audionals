// utils.js

/**
 * Formats bytes into a human-readable string (KB, MB, etc.).
 * @param {number} bytes - The number of bytes.
 * @param {number} [dec=2] - The number of decimal places.
 * @returns {string} The formatted string.
 */
const formatBytes = (bytes, dec = 2) =>
  bytes <= 0 ? '0 Bytes' : (bytes / Math.pow(1024, Math.floor(Math.log(bytes) / Math.log(1024)))).toFixed(dec) +
  ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4)];

/**
 * Extracts the filename without the extension.
 * @param {string} fullFilename - The full filename (e.g., "audio.wav").
 * @returns {string} The base name (e.g., "audio").
 */
const getBaseFilename = (fullFilename) => {
    const parts = fullFilename.split('.');
    if (parts.length > 1) {
        parts.pop(); // Remove the last part (extension)
        return parts.join('.'); // Join the remaining parts
    }
    return fullFilename; // Return original if no extension found
}