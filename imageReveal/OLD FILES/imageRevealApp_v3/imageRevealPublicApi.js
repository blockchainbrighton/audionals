// imageRevealPublicApi.js

// Import necessary functions and constants from imageRevealCore.js
// Adjust the path './imageRevealCore.js' if your file structure is different (e.g., '../imageRevealCore.js' or '/js/imageRevealCore.js')
import {
    startEffect,
    resetEffect,
    restartEffect,
    setDirection,
    setEffectParameter,
    setDurationParameter,
    setImage as coreSetImage, // Use 'coreSetImage' to avoid naming conflict with API's loadImage
    EFFECT_PAIRS,
    DUR_MIN,
    DUR_MAX,
    renders as coreRenders // For effect discovery if DOM isn't ready
} from './imageRevealCore.js';

/**
 * Checks if the core ImageReveal UI elements are initialized and ready.
 * @returns {boolean} True if core UI is ready, false otherwise.
 */
function isCoreReady() {
    const requiredIds = ['imageRevealContainer', 'effectSelector', 'durationSlider', 'imageCanvas'];
    for (const id of requiredIds) {
        if (!document.getElementById(id)) {
            console.error(`ImageReveal API: Core UI element #${id} not found. Ensure imageRevealCore.js has initialized.`);
            return false;
        }
    }
    if (!document.getElementById('imageCanvas').getContext('2d')) {
        console.error("ImageReveal API: Canvas 2D context not available.");
        return false;
    }
    // Check if imported functions are available (basic sanity check)
    if (typeof startEffect !== 'function' || typeof coreSetImage !== 'function') {
        console.error("ImageReveal API: Core functions not imported correctly. Check exports in imageRevealCore.js and paths.");
        return false;
    }
    return true;
}

/**
 * Loads an image from the given URL and sets it for the reveal effect.
 * @param {string} imageUrl - The URL of the image to load.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded HTMLImageElement or rejects on error.
 */
export async function loadImage(imageUrl) {
    if (!isCoreReady()) {
        return Promise.reject(new Error("ImageReveal API: Core UI not ready for loadImage."));
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
        console.error("ImageReveal API: Invalid image URL provided to loadImage.");
        coreSetImage(null); // Clear any existing image
        return Promise.reject(new Error("Invalid image URL."));
    }

    return new Promise((resolve, reject) => {
        console.log(`ImageReveal API: Loading image "${imageUrl}"...`);
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Essential for canvas pixel manipulation if source is cross-origin

        img.onload = () => {
            console.log(`ImageReveal API: Image "${imageUrl}" loaded successfully.`);
            try {
                coreSetImage(img); // Set the loaded image in the core module
                resolve(img);
            } catch (e) {
                console.error(`ImageReveal API: Error during coreSetImage for "${imageUrl}".`, e);
                reject(e);
            }
        };

        img.onerror = (errorEvent) => {
            console.error(`ImageReveal API: Failed to load image "${imageUrl}".`, errorEvent);
            try {
                coreSetImage(null); // Inform the core module about the failure
            } catch (e) {
                console.error(`ImageReveal API: Error during coreSetImage(null) for "${imageUrl}".`, e);
            }
            reject(new Error(`Failed to load image: ${imageUrl}`));
        };

        img.src = imageUrl;
    });
}

/**
 * Sets up the image reveal with a specific image, effect, and duration.
 * This function loads the image, then applies the effect and duration settings.
 * @param {string} imageUrl - The URL of the image to load.
 * @param {string} effectName - The name of the effect to apply (e.g., 'fadeIn', 'pixelateFwd').
 * @param {number} durationSeconds - The duration of the effect in seconds.
 * @returns {Promise<void>} A promise that resolves when setup is complete or rejects on error.
 */
export async function setupEffect(imageUrl, effectName, durationSeconds) {
    if (!isCoreReady()) {
        const msg = "ImageReveal API: Core UI not ready for setupEffect.";
        console.error(msg);
        return Promise.reject(new Error(msg));
    }
    try {
        await loadImage(imageUrl); // loadImage already calls coreSetImage
        selectEffect(effectName); // selectEffect checks isCoreReady again, but it's fine
        setEffectDuration(durationSeconds); // Same for setEffectDuration
        console.log(`ImageReveal API: Effect "${effectName}" with duration ${durationSeconds}s configured for image "${imageUrl}".`);
    } catch (error) {
        console.error(`ImageReveal API: setupEffect failed for image "${imageUrl}", effect "${effectName}", duration ${durationSeconds}s.`, error);
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Selects the visual effect to be used.
 * @param {string} effectName - The name of the effect (e.g., 'fadeIn', 'pixelateFwd').
 */
export function selectEffect(effectName) {
    if (!isCoreReady()) return;
    if (typeof effectName !== 'string') {
        console.warn("ImageReveal API: Invalid effect name type provided to selectEffect. Expected string.");
        return;
    }
    setEffectParameter(effectName);
}

/**
 * Sets the duration for the visual effect.
 * @param {number} seconds - The duration in seconds.
 */
export function setEffectDuration(seconds) {
    if (!isCoreReady()) return;
    const parsedSeconds = parseFloat(seconds);
    if (isNaN(parsedSeconds)) {
        console.warn(`ImageReveal API: Invalid duration value "${seconds}" provided to setEffectDuration. Expected number.`);
        return;
    }
    // Clamping will be handled by setDurationParameter in imageRevealCore.js
    setDurationParameter(parsedSeconds);
}

/**
 * Starts the currently configured visual effect.
 */
export function start() {
    if (!isCoreReady()) return;
    startEffect();
}

/**
 * Stops the currently playing visual effect and resets it to its initial state (frame 0).
 */
export function stop() {
    if (!isCoreReady()) return;
    resetEffect();
}

/**
 * Restarts the currently configured visual effect from the beginning.
 */
export function restart() {
    if (!isCoreReady()) return;
    restartEffect();
}

/**
 * Sets the playback direction of the effect.
 * @param {boolean} playInReverse - True to play the effect in reverse, false for forward.
 */
export function setPlaybackDirection(playInReverse) {
    if (!isCoreReady()) return;
    if (typeof playInReverse !== 'boolean') {
        console.warn("ImageReveal API: Invalid value for playInReverse. Expected boolean.");
        return;
    }
    setDirection(playInReverse);
}

/**
 * Retrieves a list of available effects with their display names.
 * @returns {Array<{value: string, text: string}>} An array of effect objects.
 */
export function getAvailableEffects() {
    if (!isCoreReady()) {
        // Fallback if DOM isn't fully ready but core JS is loaded
        console.warn("ImageReveal API: getAvailableEffects - Core UI not fully ready, attempting fallback from coreRenders.");
        return Object.keys(coreRenders || {}).map(key => ({ value: key, text: key }));
    }
    
    const effectSel = document.getElementById('effectSelector');
    if (effectSel && effectSel.options && effectSel.options.length > 0) {
        return Array.from(effectSel.options).map(opt => ({
            value: opt.value,
            text: opt.textContent
        }));
    }
    
    // Fallback if selector exists but has no options yet (shouldn't happen if makeUI ran)
    console.warn("ImageReveal API: getAvailableEffects - effectSelector found but has no options, attempting fallback from coreRenders.");
    return Object.keys(coreRenders || {}).map(key => ({ value: key, text: key }));
}

/**
 * Gets the current effect settings.
 * @returns {{effect: string|null, duration: number|null, minDuration: number, maxDuration: number}}
 *          An object with current effect name, duration, and min/max possible durations.
 */
export function getCurrentSettings() {
    if (!isCoreReady()) {
        return {
            error: "Core UI not ready",
            effect: null,
            duration: null,
            minDuration: DUR_MIN || 0.25, // Fallback if not imported
            maxDuration: DUR_MAX || 600   // Fallback if not imported
        };
    }
    
    const effectSel = document.getElementById('effectSelector');
    const durSlider = document.getElementById('durationSlider');

    return {
        effect: effectSel ? effectSel.value : null,
        duration: durSlider ? parseFloat(durSlider.value) : null,
        minDuration: DUR_MIN,
        maxDuration: DUR_MAX
        // Note: 'isPlaying' status would require exporting 'running' state or a getter from imageRevealCore.js
    };
}

console.log('ImageRevealPublicApi.js loaded and ready.');