/**
 * @file SaveLoad.js
 * @description Save/load module for the BOP Synthesizer component.
 */

export class SaveLoad {
    constructor(state, eventBus) {
        this.state = state;
        this.eventBus = eventBus;
        this.version = '2.0';
        this._statusTimeout = null;
        
        this.init();
    }
    
    init() {
        console.log('[SaveLoad] Initializing save-load module...');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.addEventListener('save-project', () => this.saveState());
        this.eventBus.addEventListener('load-project', (e) => this.loadState(e.detail.data));
    }

    /**
     * [NEW METHOD] Gathers all serializable state into a single object.
     * This is the "pure" data-gathering method for host applications.
     * @returns {object} A JSON-serializable object representing the full synth patch.
     */
    getFullState() {
        if (!this.state.synth || !this.state.recorder) {
            throw new Error("Synth or Recorder not available to get state.");
        }
        
        return {
            version: this.version,
            patch: this.state.synth.getPatch(),
            sequence: this.state.recorder.getSequence(), // Uses new recorder method
            ui: {
                currentOctave: this.state.curOct,
            }
        };
    }

    /**
     * Captures the current state and triggers a file download.
     * This now uses getFullState() internally.
     */
    saveState() {
        try {
            const state = this.getFullState(); // Use the new pure function
            const jsonString = JSON.stringify(state, null, 2); // Pretty print for readability
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `bop-patch-${timestamp}.json`);
            this.showStatus('State saved successfully!', 'success');
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
        }
    }

    /**
     * Loads state from a patch object or a JSON string.
     * @param {object|string} data - The state object or JSON string.
     */
    loadState(data) {
        try {
            const state = (typeof data === 'string') ? JSON.parse(data) : data;

            if (!state.version || !state.patch || !state.sequence) {
                throw new Error('Invalid or unsupported state file format.');
            }
            
            this.state.synth.setPatch(state.patch);
            this.state.recorder.setSequence(state.sequence); // Uses new recorder method
            
            if (state.ui) {
                this.state.curOct = state.ui.currentOctave || 4;
            }

            this.refreshAllUIs();
            this.showStatus('State loaded!', 'success');
            this.eventBus.dispatchEvent(new CustomEvent('load-completed'));

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
        }
    }
    
    refreshAllUIs() {
        // This method now correctly dispatches events for other modules to handle.
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
            detail: { octave: this.state.curOct }
        }));
    }
    
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('saveLoadStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
            const colors = { success: '#4caf50', error: '#f44336', info: '#2196f3' };
            statusEl.style.backgroundColor = colors[type] || colors.info;
            
            clearTimeout(this._statusTimeout);
            this._statusTimeout = setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
        
        // Also emit status update event
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message, type }
        }));
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        clearTimeout(this._statusTimeout);
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default SaveLoad;

