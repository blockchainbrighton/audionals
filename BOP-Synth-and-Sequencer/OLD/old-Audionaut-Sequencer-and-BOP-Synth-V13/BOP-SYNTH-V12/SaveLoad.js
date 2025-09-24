/**
 * @file SaveLoad.js
 * @description Save/load module for the BOP Synthesizer component.
 */

export class SaveLoad {
    constructor(state, eventBus) {
        this.state = state;
        this.eventBus = eventBus;
        this.version = '2.1';
        this._statusTimeout = null;
        this.init();
    }
    
    init() {
        console.log('[SaveLoad] Initializing save-load module...');
        // The BopSynthLogic controller now wires up events.
    }

    /**
     * [UPDATED] Gathers all serializable state into a single object for host applications.
     * @returns {object} A JSON-serializable object representing the full synth patch.
     */
    getStateObject() {
        if (!this.state.synth || !this.state.recorder) {
            throw new Error("Synth or Recorder not available to get state.");
        }
        
        return {
            version: this.version,
            synthEngine: {
                patch: this.state.synth.getPatch(),
                // Store effect states (which effects are enabled/disabled)
                effectState: this.state.synth.effectState || {}
            },
            recorder: {
                sequence: this.state.recorder.getSequence ? this.state.recorder.getSequence() : []
            },
            ui: {
                currentOctave: this.state.curOct,
            },
            // Include loop manager state if available
            loopManager: this.state.loopManager ? this.state.loopManager.getState?.() || {} : {}
        };
    }

    /**
     * [NEW] Alias for getStateObject to maintain compatibility with existing code
     * @returns {object} A JSON-serializable object representing the full synth patch.
     */
    getFullState() {
        return this.getStateObject();
    }

    /**
     * Captures the current state using getFullState and triggers a file download.
     */
    saveState() {
        try {
            const state = this.getFullState();
            const jsonString = JSON.stringify(state, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `bop-patch-${timestamp}.json`);
            this.showStatus('State saved successfully!', 'success');
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
        }
    }

    /**
     * [NEW] Alias for saveState to maintain compatibility
     */
    saveStateToFile() {
        this.saveState();
    }

    /**
     * [NEW] Load state from file data (for standalone UI)
     */
    loadStateFromFile(data) {
        this.loadState(data);
    }

    /**
     * Loads state from a patch object or a JSON string.
     * @param {object|string} data - The state object or JSON string.
     */
    loadState(data) {
        try {
            const state = (typeof data === 'string') ? JSON.parse(data) : data;

            // Handle both old and new state formats
            if (!state.version) {
                throw new Error('Invalid or unsupported state file format - missing version.');
            }
            
            // Handle legacy format (version 2.0 and earlier)
            if (state.patch && state.sequence) {
                // Legacy format - convert to new format
                this.state.synth.setPatch(state.patch);
                if (this.state.recorder.setSequence) {
                    this.state.recorder.setSequence(state.sequence);
                }
            } else {
                // New enhanced format (version 2.1+)
                if (state.synthEngine) {
                    if (state.synthEngine.patch) {
                        this.state.synth.setPatch(state.synthEngine.patch);
                    }
                    if (state.synthEngine.effectState) {
                        this.state.synth.effectState = { ...state.synthEngine.effectState };
                    }
                }
                
                if (state.recorder && state.recorder.sequence) {
                    if (this.state.recorder.setSequence) {
                        this.state.recorder.setSequence(state.recorder.sequence);
                    }
                }
                
                // Load loop manager state if available
                if (state.loopManager && this.state.loopManager && this.state.loopManager.setState) {
                    this.state.loopManager.setState(state.loopManager);
                }
            }
            
            // Load UI state
            if (state.ui) {
                this.state.curOct = state.ui.currentOctave || 4;
            }

            this.refreshAllUIs();
            this.showStatus('State loaded successfully!', 'success');
            this.eventBus.dispatchEvent(new CustomEvent('load-completed'));
            this.eventBus.dispatchEvent(new CustomEvent('synth-state-loaded', { detail: state }));

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
            // Don't throw - allow graceful degradation
        }
    }
    
    refreshAllUIs() {
        // Dispatch high-level events. Other modules are responsible for redrawing themselves.
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
            this._statusTimeout = setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    }
}

export default SaveLoad;