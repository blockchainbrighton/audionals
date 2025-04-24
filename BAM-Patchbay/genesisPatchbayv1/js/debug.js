// js/debug.js

// Get the debug list element once
const debugList = document.getElementById('debug-messages');

/**
 * Adds messages to the debug UI and console.
 * @param {string} message - The message to log.
 * @param {'info'|'success'|'error'} [type='info'] - The type of message.
 */
export function logDebug(message, type = 'info') {
    if (!debugList) {
        console.warn("Debug list element not found. Logging to console only.");
        console[type === 'error' ? 'error' : (type === 'success' ? 'log' : 'info')](message);
        return;
    }

    const listItem = document.createElement('li');
    listItem.textContent = message;
    listItem.classList.add(type); // 'info', 'success', or 'error'
    debugList.appendChild(listItem);

    // Also log to console for developer tools
    switch (type) {
        case 'success': console.log(message); break;
        case 'error': console.error(message); break;
        default: console.info(message);
    }
}

// Initial message (can be moved to main.js if preferred)
// logDebug("Debug module loaded.", 'info');