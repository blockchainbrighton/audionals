// Wait for the entire page and resources to load
window.addEventListener('load', () => {

    const debugList = document.getElementById('debug-messages');

    // Function to add messages to the debug UI
    function logDebug(message, type = 'info') {
        const listItem = document.createElement('li');
        listItem.textContent = message;
        listItem.classList.add(type); // 'info', 'success', or 'error'
        debugList.appendChild(listItem);
        // Also log to console for developer tools
        switch(type) {
            case 'success': console.log(message); break;
            case 'error': console.error(message); break;
            default: console.info(message);
        }
    }

    logDebug("Page loaded. Starting library checks...");

    // --- Check for Tone.js ---
    try {
        if (typeof Tone !== 'undefined' && Tone && typeof Tone.start === 'function') {
            // Check for a specific property/method that confirms it's Tone.js
            logDebug(`✅ SUCCESS: Tone.js found and seems correctly loaded. Version: ${Tone.version || 'unknown'}`, 'success');
            // You could potentially even try a very basic Tone operation here, like:
             logDebug(`   Tone.js context state (initial): ${Tone.context.state}`, 'info');
        } else {
            logDebug('❌ ERROR: Global `Tone` object not found or is not the expected type. Check library inclusion.', 'error');
        }
    } catch (error) {
        logDebug(`❌ ERROR: An error occurred while checking Tone.js: ${error.message}`, 'error');
        console.error(error); // Log full error object to console
    }

    // --- Check for Three.js ---
    try {
        if (typeof THREE !== 'undefined' && THREE && THREE.REVISION) {
             // Check for a specific property/method that confirms it's Three.js
             logDebug(`✅ SUCCESS: Three.js found and seems correctly loaded. Revision: ${THREE.REVISION}`, 'success');
             // You could try creating a basic object (but not rendering yet):
             const checkGeo = new THREE.BoxGeometry(1, 1, 1);
             logDebug(`   Three.js object creation test (BoxGeometry): ${checkGeo ? 'Passed' : 'Failed'}`, 'info');
        } else {
            logDebug('❌ ERROR: Global `THREE` object not found or is not the expected type. Check library inclusion.', 'error');
        }
    } catch (error) {
         logDebug(`❌ ERROR: An error occurred while checking Three.js: ${error.message}`, 'error');
         console.error(error); // Log full error object to console
    }

    logDebug("Library checks complete.", 'info');

    // --- Next Steps Placeholder ---
    // If both libraries loaded successfully, you can proceed here.
    // For example:
    // if (typeof Tone !== 'undefined' && typeof THREE !== 'undefined') {
    //     initializeApp(); // Call your main application function
    // } else {
    //     logDebug("Initialization aborted due to library loading errors.", 'error');
    // }

});

// Example of a function you might call later
// function initializeApp() {
//     logDebug("Both libraries confirmed. Ready to initialize BAM-Patchbay main logic.", 'success');
//     // Start creating your Tone.js synths and Three.js scenes here...
// }