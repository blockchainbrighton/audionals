/**
 * Converts a Base64 string (potentially with data URI prefix) to an ArrayBuffer.
 * @param {string} base64 The Base64 string.
 * @returns {ArrayBuffer} The corresponding ArrayBuffer.
 * @throws {Error} If the Base64 string is invalid.
 */
export function base64ToArrayBuffer(base64) {
    try {
        // Remove data URI prefix if present (e.g., "data:audio/opus;base64,")
        const base64Clean = base64.split(',')[1] ?? base64;
        const binaryString = window.atob(base64Clean);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error("Error decoding Base64 string:", e);
        throw new Error("Failed to decode Base64 data.");
    }
}

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Checks if the event target is an input element where shortcuts should be ignored.
 * @param {EventTarget} target - The event target element.
 * @returns {boolean} True if the target is an input type, false otherwise.
 */
export function _isInputFocused(target) {
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}