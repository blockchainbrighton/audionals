// js/debug.js

// Get the debug list element once
const debugList = document.getElementById('debug-messages');
let hasWarned = false; // Prevent console spam if element isn't found

/**
 * Adds messages to the debug UI and console.
 * @param {string} message - The message to log.
 * @param {'info'|'success'|'error'|'warn'} [type='info'] - The type of message.
 */
export function logDebug(message, type = 'info') {
    if (!debugList) {
        if (!hasWarned) {
             console.warn("Debug list element (#debug-messages) not found. Logging to console only.");
             hasWarned = true;
        }
        // Use appropriate console method based on type
        switch (type) {
            case 'error': console.error(message); break;
            case 'warn': console.warn(message); break; // Added console.warn
            case 'success': console.log(message); break; // Keep success as log for clarity
            case 'info':
            default: console.info(message); break;
        }
        return;
    }

    const listItem = document.createElement('li');
    listItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`; // Add timestamp
    listItem.classList.add(type); // 'info', 'success', 'error', or 'warn'

    // Add to top and limit messages (optional)
    debugList.insertBefore(listItem, debugList.firstChild);
    const maxMessages = 100; // Limit number of messages
    while (debugList.children.length > maxMessages) {
        debugList.removeChild(debugList.lastChild);
    }


    // Also log to console for developer tools
    switch (type) {
        case 'error': console.error(message); break;
        case 'warn': console.warn(message); break;
        case 'success': console.log(message); break; // Or console.info if preferred
        default: console.info(message);
    }
}

// Example of initializing debugging settings if needed
// export function initializeDebugging(options) {
//     logDebug(`Debugging Initialized with level: ${options?.level || 'default'}`, 'info');
// }

// Initial message can be logged from main.js after DOM load
// logDebug("Debug module loaded.", 'info');