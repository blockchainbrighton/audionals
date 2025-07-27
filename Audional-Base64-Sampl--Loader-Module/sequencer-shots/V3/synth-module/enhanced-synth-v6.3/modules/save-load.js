// modules/save-load.js
// Save and Load functionality for Audionauts Synth
// Captures and restores complete synth state including settings, sequences, and UI state

/**
 * Configuration for capturing and restoring settings.
 * Maps UI element IDs to state object paths.
 * @type {Object.<string, {section: string, key: string, type: 'value'|'float'}>}
 */
const SETTINGS_CONFIG = {
    // Oscillator
    waveform: { section: 'oscillator', key: 'waveform', type: 'value' },
    detune: { section: 'oscillator', key: 'detune', type: 'float' },
    // Filter
    filterType: { section: 'filter', key: 'type', type: 'value' },
    filterFreq: { section: 'filter', key: 'frequency', type: 'float' },
    filterQ: { section: 'filter', key: 'resonance', type: 'float' },
    // Effects
    reverb: { section: 'effects', key: 'reverb', type: 'float' },
    delay: { section: 'effects', key: 'delay', type: 'float' },
    // Transport
    bpm: { section: 'transport', key: 'bpm', type: 'float' },
};

export const SaveLoad = {
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

    /** Adds the Save/Load UI elements to the DOM. */
    addUI() {
        const transportEl = document.getElementById('transport-controls');
        if (!transportEl) {
            console.error('[SaveLoad] Transport controls not found');
            return;
        }

        const saveLoadContainer = document.createElement('div');
        saveLoadContainer.className = 'save-load-controls';
        saveLoadContainer.style.cssText = `
            display: flex; gap: 8px; margin-top: 10px;
            padding-top: 10px; border-top: 1px solid #333;
        `;
        saveLoadContainer.innerHTML = `
            <button id="saveBtn" class="transport-button save-button">
                <span>💾</span>Save State
            </button>
            <button id="loadBtn" class="transport-button load-button">
                <span>📁</span>Load State
            </button>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="display: none;"></div>
        `;
        transportEl.appendChild(saveLoadContainer);
    },

    /** Binds event listeners for UI and keyboard shortcuts. */
    bindEvents() {
        document.getElementById('saveBtn')?.addEventListener('click', () => this.saveState());
        document.getElementById('loadBtn')?.addEventListener('click', () => this.triggerLoad());
        document.getElementById('loadFileInput')?.addEventListener('change', (e) => this.handleFileLoad(e));

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.repeat) {
                if (e.key === 's') { e.preventDefault(); this.saveState(); }
                else if (e.key === 'o') { e.preventDefault(); this.triggerLoad(); }
            }
        });
    },

    // --- Public API (Preserved) ---

    /** Displays a temporary status message. */
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('saveLoadStatus');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.style.display = 'block';
        statusEl.style.backgroundColor = {
            success: '#4caf50', error: '#f44336', info: '#2196f3', warning: '#ff9800'
        }[type] ?? '#2196f3';
        statusEl.style.color = 'white';

        clearTimeout(this._statusTimeout);
        this._statusTimeout = setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    },

    /** Initiates the save process. */
    saveState() {
        try {
            console.log('[SaveLoad] Starting save operation...');
            const jsonString = JSON.stringify(this.captureState(), null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `synth-state-${timestamp}.synthstate`);
            this.showStatus('State saved successfully!', 'success');
            console.log('[SaveLoad] Save completed successfully');
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
        }
    },

    /** Captures the complete synth state. */
    captureState() {
        const state = {
            version: this.version,
            timestamp: new Date().toISOString(),
            synthState: {
                settings: this.captureSettings(),
                sequence: this.captureSequence(),
                ui: this.captureUIState()
            }
        };
        console.log('[SaveLoad] Captured state:', state);
        return state;
    },

    /** Captures synth settings from the UI. */
    captureSettings() {
        const settings = {};
        try {
            for (const [id, config] of Object.entries(SETTINGS_CONFIG)) {
                if (!settings[config.section]) settings[config.section] = {};
                let value = this._getElementValue(id);
                if (value != null && config.type === 'float') {
                    value = parseFloat(value);
                }
                settings[config.section][config.key] = value;
            }
        } catch (error) {
            console.warn('[SaveLoad] Error capturing settings:', error);
        }
        return settings;
    },

    /** Captures the current sequence. */
    captureSequence() {
        return window.synthApp?.seq ? JSON.parse(JSON.stringify(window.synthApp.seq)) : [];
    },

    /** Captures relevant UI state. */
    captureUIState() {
        const ui = { currentOctave: 4, selectedNote: null };
        try {
            if (window.synthApp) {
                ui.currentOctave = window.synthApp.curOct ?? ui.currentOctave;
                ui.selectedNote = window.synthApp.selNote;
            }
        } catch (error) {
            console.warn('[SaveLoad] Error capturing UI state:', error);
        }
        return ui;
    },

    /** Triggers a file download. */
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);
    },

    /** Triggers the file input dialog. */
    triggerLoad() {
        document.getElementById('loadFileInput')?.click();
    },

    /** Handles the file input change event. */
    handleFileLoad(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.loadState(e.target.result);
            } catch (error) {
                console.error('[SaveLoad] File read error:', error);
                this.showStatus(`Failed to read file: ${error.message}`, 'error');
            }
        };
        reader.onerror = () => this.showStatus('Failed to read file', 'error');
        reader.readAsText(file);
        event.target.value = ''; // Reset input for re-loading same file
    },

    /** Loads the synth state from a JSON string. */
    loadState(jsonString) {
        try {
            console.log('[SaveLoad] Starting load operation...');
            const state = JSON.parse(jsonString);
            if (!this.validateState(state)) {
                throw new Error('Invalid state file format');
            }
            this.restoreSettings(state.synthState.settings);
            this.restoreSequence(state.synthState.sequence);
            this.restoreUIState(state.synthState.ui);
            this.refreshDisplays();
            this.showStatus('State loaded successfully!', 'success');
            console.log('[SaveLoad] Load completed successfully');
        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
        }
    },

    /** Validates the structure of a loaded state object. */
    validateState(state) {
        return state?.version && state?.synthState?.settings && Array.isArray(state?.synthState?.sequence);
    },

    /** Restores synth settings to the UI. */
    restoreSettings(settings) {
        if (!settings) return;
        try {
            for (const [id, config] of Object.entries(SETTINGS_CONFIG)) {
                const sectionData = settings[config.section];
                if (sectionData) {
                    const value = sectionData[config.key];
                    if (value != null) {
                        this._setElementValue(id, value, config.section === 'oscillator' || config.section === 'transport' ? 'change' : 'input');
                    }
                }
            }
        } catch (error) {
            console.warn('[SaveLoad] Error restoring settings:', error);
        }
    },

    /** Restores the sequence data. */
    restoreSequence(sequence) {
        if (!Array.isArray(sequence) || !window.synthApp) return;
        try {
            if (window.synthApp.isPlaying) {
                document.getElementById('stopBtn')?.click();
            }
            window.synthApp.seq = JSON.parse(JSON.stringify(sequence));
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.disabled = sequence.length === 0;
            console.log(`[SaveLoad] Restored ${sequence.length} notes`);
        } catch (error) {
            console.warn('[SaveLoad] Error restoring sequence:', error);
        }
    },

    /** Restores UI state like octave and selected note. */
    restoreUIState(ui) {
        if (!ui || !window.synthApp) return;
        try {
            if (typeof ui.currentOctave === 'number') {
                window.synthApp.curOct = Math.max(0, Math.min(7, ui.currentOctave));
                const octaveLabel = document.getElementById('octaveLabel');
                if (octaveLabel) octaveLabel.textContent = `Octave: ${window.synthApp.curOct}`;
            }
            window.synthApp.selNote = ui.selectedNote;
        } catch (error) {
            console.warn('[SaveLoad] Error restoring UI state:', error);
        }
    },

    /** Refreshes visual displays. */
    refreshDisplays() {
        this._safeCall(window.Keyboard?.draw, 'keyboard draw');
        this._safeCall(window.PianoRoll?.draw, 'piano roll draw');
        console.log('[SaveLoad] Displays refreshed');
    },

    /** Utility to export state as JSON string (for debugging). */
    exportStateJSON() {
        try {
            return JSON.stringify(this.captureState(), null, 2);
        } catch (error) {
            console.error('[SaveLoad] Export error:', error);
            return null;
        }
    },

    /** Utility to import state from JSON string (for debugging). */
    importStateJSON(jsonString) {
        try {
            this.loadState(jsonString);
            return true;
        } catch (error) {
            console.error('[SaveLoad] Import error:', error);
            return false;
        }
    }
};
