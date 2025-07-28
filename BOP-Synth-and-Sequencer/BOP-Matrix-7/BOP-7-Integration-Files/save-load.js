// FIX: Added the '.js' extension to the file path.
import EnvelopeManager from "./envelope-manager.js"; 
 
 // --- save-load.js ---
 const SaveLoad = {
    version: '1.0',

    // --- Private Helpers ---

    /**
     * Safely gets the value of an element by ID.
     * @param {string} id - The element ID.
     * @returns {string|number|null} The value, or null if element not found.
     */
    _getElementValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : null;
    },

    /**
     * Safely sets the value of an element by ID and dispatches an event.
     * @param {string} id - The element ID.
     * @param {any} value - The value to set.
     * @param {string} eventType - The type of event to dispatch (default 'input').
     */
    _setElementValue(id, value, eventType = 'input') {
        const el = document.getElementById(id);
        if (el && value != null) {
            el.value = value;
            this._dispatchEvent(el, eventType);
        }
    },

    /**
     * Dispatches a standard event on an element.
     * @param {Element} el - The DOM element.
     * @param {string} type - The event type.
     */
    _dispatchEvent(el, type) {
        el?.dispatchEvent(new Event(type));
    },

    /**
     * Safely calls a function, logging warnings on error.
     * @param {Function} fn - The function to call.
     * @param {string} context - Context for error logging.
     */
    _safeCall(fn, context) {
        try {
            if (typeof fn === 'function') fn();
        } catch (error) {
            console.warn(`[SaveLoad] Error in ${context}:`, error);
        }
    },

    // --- Lifecycle ---

    /** Initializes the SaveLoad module. */
    init() {
        console.log('[SaveLoad] Initializing save-load module...');
        this.addUI();
        this.bindEvents();
    },

    /** Adds the Save/Load UI elements directly into the transport controls. */
    addUI() {
        const transportEl = document.getElementById('transport-controls');
        if (!transportEl) {
            console.error('[SaveLoad] Transport controls container not found');
            return;
        }

        // Create Save Button
        const saveBtn = document.createElement('button');
        saveBtn.id = 'saveBtn';
        saveBtn.className = 'transport-button save-button';
        saveBtn.innerHTML = '<span>💾</span>Save State';

        // Create Load Button
        const loadBtn = document.createElement('button');
        loadBtn.id = 'loadBtn';
        loadBtn.className = 'transport-button load-button';
        loadBtn.innerHTML = '<span>📁</span>Load State';

        // Create hidden File Input for loading
        const loadFileInput = document.createElement('input');
        loadFileInput.type = 'file';
        loadFileInput.id = 'loadFileInput';
        loadFileInput.accept = '.synthstate,.json';
        loadFileInput.style.display = 'none';

        // Create Status Message Display
        const saveLoadStatus = document.createElement('div');
        saveLoadStatus.id = 'saveLoadStatus';
        saveLoadStatus.className = 'save-load-status';
        saveLoadStatus.style.display = 'none';

        // Append all new elements directly to the main transport container
        transportEl.appendChild(saveBtn);
        transportEl.appendChild(loadBtn);