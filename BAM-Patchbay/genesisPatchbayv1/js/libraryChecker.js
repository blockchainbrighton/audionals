// js/libraryChecker.js
import { logDebug } from './debug.js'; // Import the logger

/**
 * Checks if Tone.js and Three.js are loaded correctly.
 * @returns {Promise<boolean>} A promise that resolves with true if both libs are OK, rejects otherwise.
 */
export function checkLibraries() {
    logDebug("Starting library checks...");
    let toneOK = false;
    let threeOK = false;

    return new Promise((resolve, reject) => {
        // --- Check for Tone.js ---
        try {
            if (typeof Tone !== 'undefined' && Tone && typeof Tone.start === 'function') {
                logDebug(`✅ SUCCESS: Tone.js found. Version: ${Tone.version || 'unknown'}`, 'success');
                logDebug(`   Tone.js context state (initial): ${Tone.context.state}`, 'info');
                toneOK = true;
            } else {
                logDebug('❌ ERROR: Global `Tone` object not found or is not the expected type.', 'error');
            }
        } catch (error) {
            logDebug(`❌ ERROR: An error occurred while checking Tone.js: ${error.message}`, 'error');
            console.error(error);
        }

        // --- Check for Three.js ---
        try {
            if (typeof THREE !== 'undefined' && THREE && THREE.REVISION) {
                logDebug(`✅ SUCCESS: Three.js found. Revision: ${THREE.REVISION}`, 'success');
                const checkGeo = new THREE.BoxGeometry(1, 1, 1); // Basic check
                logDebug(`   Three.js object creation test (BoxGeometry): ${checkGeo ? 'Passed' : 'Failed'}`, 'info');
                threeOK = true;
            } else {
                logDebug('❌ ERROR: Global `THREE` object not found or is not the expected type.', 'error');
            }
        } catch (error) {
            logDebug(`❌ ERROR: An error occurred while checking Three.js: ${error.message}`, 'error');
            console.error(error);
        }

        logDebug("Library checks complete.", 'info');

        if (toneOK && threeOK) {
            resolve(true);
        } else {
            const errorMsg = "One or more critical libraries failed to load.";
            logDebug(errorMsg, 'error');
            reject(new Error(errorMsg)); // Reject the promise
        }
    });
}