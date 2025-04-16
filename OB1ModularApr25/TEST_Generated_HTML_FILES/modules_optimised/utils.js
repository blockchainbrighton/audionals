// --- START OF FILE utils.js ---

/**
 * Converts a Base64 string (with or without data URI prefix) to an ArrayBuffer.
 * @param {string} base64 - The Base64 string.
 * @returns {ArrayBuffer} The corresponding ArrayBuffer.
 * @throws {Error} If decoding fails.
 */
export const base64ToArrayBuffer = base64 => {
    try {
        const base64Clean = base64.split(',')[1] ?? base64;
        const binaryString = window.atob(base64Clean);
        return Uint8Array.from(binaryString, char => char.charCodeAt(0)).buffer;
    } catch (e) {
        console.error("Error decoding Base64 string:", e);
        throw new Error("Failed to decode Base64 data.");
    }
};

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} The clamped value.
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/**
 * Checks if the event target is an input element (or similar) to ignore shortcuts.
 * @param {EventTarget} target - The event target.
 * @returns {boolean} True if target is an input, textarea, select, or contentEditable.
 */
export const _isInputFocused = target => 
    ['input', 'textarea', 'select'].includes(target?.tagName?.toLowerCase()) || target?.isContentEditable;

/**
 * Creates a DOM element with the given tag, options, and children.
 * @param {string} tag - The HTML tag name.
 * @param {object} [options={}] - Attributes/properties (e.g., id, className, textContent, disabled, attributes).
 * @param {(HTMLElement|string)[]} [children=[]] - Child elements or text nodes to append.
 * @returns {HTMLElement} The created element.
 */
export const createElement = (tag, options = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
        if (key === 'className') el.className = value;
        else if (key === 'textContent') el.textContent = value;
        else if (key === 'disabled' && value) el.disabled = true;
        else if (key === 'attributes' && typeof value === 'object') {
            Object.entries(value).forEach(([attr, attrVal]) => el.setAttribute(attr, attrVal));
        } else if (typeof value === 'boolean') {
            if (value) el.setAttribute(key, '');
        } else {
            el.setAttribute(key, value);
        }
    });
    children.forEach(child => {
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (child instanceof HTMLElement) el.appendChild(child);
        // Silently ignore null/undefined children.
    });
    return el;
};

/**
 * Adds an event listener to an element with a fallback warning if the element is missing.
 * @param {HTMLElement|null} element - The target element.
 * @param {string} eventName - The event name.
 * @param {Function} handler - The event handler.
 * @param {string} elementNameForWarn - The element name for warning messages.
 */
export const addListener = (element, eventName, handler, elementNameForWarn) => {
    if (element) element.addEventListener(eventName, handler);
    else if (!['infoToggleBtn', 'referencePanel'].includes(elementNameForWarn))
        console.warn(`[setupEventListeners] Element "${elementNameForWarn}" not found. Listener not attached.`);
};

// --- END OF FILE utils.js ---
