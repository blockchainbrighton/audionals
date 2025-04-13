// --- START OF FILE utils.js ---

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

/**
 * Creates a DOM element with specified tag, options, and children.
 * @param {string} tag - The HTML tag name.
 * @param {object} [options={}] - Attributes and properties (id, className, textContent, etc.).
 * @param {(HTMLElement|string)[]} [children=[]] - Child elements or text nodes to append.
 * @returns {HTMLElement} The created element.
 */
export function createElement(tag, options = {}, children = []) {
    const element = document.createElement(tag);

    // Apply attributes and properties
    Object.keys(options).forEach(key => {
        if (key === 'className') {
            element.className = options[key];
        } else if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'disabled' && options[key]) { // Handle disabled explicitly
            element.disabled = true;
        } else if (key === 'attributes') { // Handle data-* or other special attributes
             Object.entries(options[key]).forEach(([attrName, attrValue]) => {
                element.setAttribute(attrName, attrValue);
             });
        } else if (typeof options[key] === 'boolean') { // Handle boolean attributes better
             if (options[key]) {
                 element.setAttribute(key, ''); // Set empty string for true boolean attributes
             }
        } else {
            element.setAttribute(key, options[key]); // Set other attributes
        }
    });

    // Append children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
        // Ignore null/undefined children silently
    });

    return element;
}

// --- END OF FILE utils.js ---