// --- START OF FILE utils.js ---

/**
 * Converts a Base64 string (potentially with data URI prefix) to an ArrayBuffer.
 * @param {string} base64 The Base64 string.
 * @returns {ArrayBuffer} The corresponding ArrayBuffer.
 * @throws {Error} If the Base64 string is invalid.
 */
export function base64ToArrayBuffer(base64) {
    try {
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
    Object.keys(options).forEach(key => {
        if (key === 'className') {
            element.className = options[key];
        } else if (key === 'textContent') {
            element.textContent = options[key];
        } else if (key === 'disabled' && options[key]) { 
            element.disabled = true;
        } else if (key === 'attributes') {
             Object.entries(options[key]).forEach(([attrName, attrValue]) => {
                element.setAttribute(attrName, attrValue);
             });
        } else if (typeof options[key] === 'boolean') {
             if (options[key]) {
                 element.setAttribute(key, '');
             }
        } else {
            element.setAttribute(key, options[key]);
        }
    });
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });
    return element;
}

export function addListener(element, eventName, handler, elementNameForWarn) {
    if (element) {
        element.addEventListener(eventName, handler);
    } else {
        const optionalElements = ['infoToggleBtn', 'referencePanel'];
        if (elementNameForWarn && !optionalElements.includes(elementNameForWarn)) { // Check elementNameForWarn exists
            console.warn(`[setupEventListeners] Element "${elementNameForWarn}" not found. Listener not attached.`);
        }
    }
}

// --- Pitch Slider Mapping Logic ---
export const PITCH_SLIDER_CONFIG = {
    MIN_S: -199, // s_val for P = -1000%
    STOP_S: -100,  // s_val for P = 0%
    NEUTRAL_S: 0,  // s_val for P = 100%
    MAX_S: 90,   // s_val for P = 1000%
    STEP: 1,       // s_val step
};

/**
 * Converts slider value (s_val) to playback percentage (P).
 * @param {number} s_val - The raw value from the pitch slider.
 * @returns {number} Playback percentage P (-1000 to 1000).
 */
export function sValToP(s_val) {
    const { MIN_S, STOP_S, NEUTRAL_S, MAX_S } = PITCH_SLIDER_CONFIG;
    let P;

    // Clamp s_val to ensure it's within the defined range for calculations
    const clamped_s_val = clamp(s_val, MIN_S, MAX_S);

    if (clamped_s_val >= NEUTRAL_S) { // [0, 90] -> P [100, 1000]
        P = 100 + (clamped_s_val - NEUTRAL_S) * 10;
    } else if (clamped_s_val >= STOP_S) { // [-100, -1] -> P [0, 99]
        P = (clamped_s_val - STOP_S);
    } else { // [-199, -101] -> P [-1000, -1]
        // Map s_val from [MIN_S, STOP_S - 1] to abs_P from [1000, 1]
        // Denominator: (STOP_S - 1) - MIN_S ensures non-zero if MIN_S < STOP_S - 1
        const range_s_neg = (STOP_S - 1) - MIN_S;
        if (range_s_neg <= 0) { // Should not happen with current config
            P = (clamped_s_val === MIN_S) ? -1000 : -1; // Fallback
        } else {
            const normalized_s = (clamped_s_val - MIN_S) / range_s_neg; // 0 at MIN_S, 1 at (STOP_S - 1)
            const abs_P = 1000 - normalized_s * 999; // abs_P: 1000 down to 1
            P = -Math.round(abs_P);
        }
    }
    return Math.round(P); // Ensure P is an integer percentage
}

/**
 * Converts playback percentage (P) to slider value (s_val).
 * @param {number} P - Playback percentage P (-1000 to 1000).
 * @returns {number} The raw value for the pitch slider (s_val).
 */
export function pToSVal(P) {
    const { MIN_S, STOP_S, NEUTRAL_S, MAX_S } = PITCH_SLIDER_CONFIG;
    let s_val;
    
    // Clamp P to ensure it's within the defined range for calculations
    const clamped_P = clamp(Math.round(P), -1000, 1000);

    if (clamped_P >= 100) { // P [100, 1000] -> s_val [0, 90]
        s_val = NEUTRAL_S + (clamped_P - 100) / 10;
    } else if (clamped_P >= 0) { // P [0, 99] -> s_val [-100, -1]
        s_val = clamped_P + STOP_S;
    } else { // P [-1000, -1] -> s_val [-199, -101]
        const abs_P = -clamped_P; // abs_P [1, 1000]
        // We want to map abs_P [1, 1000] to s_val [STOP_S - 1, MIN_S] (inverted)
        // normalized_abs_P: 0 for abs_P=1, 1 for abs_P=1000 (approx, due to 999 range)
        if (abs_P === 0) { // Should be covered by P >= 0, but as safeguard
            s_val = STOP_S;
        } else {
            const normalized_abs_P = (abs_P - 1) / 999.0; // Map [1, 1000] to [0, 1]
            const range_s_neg = (STOP_S - 1) - MIN_S;
            s_val = (STOP_S - 1) - normalized_abs_P * Math.abs(range_s_neg); // Map [0,1] to [STOP_S-1, MIN_S]
        }
    }
    // Clamp to actual slider hardware limits just in case, then round.
    return clamp(Math.round(s_val), MIN_S, MAX_S);
}

// --- END OF FILE utils.js ---