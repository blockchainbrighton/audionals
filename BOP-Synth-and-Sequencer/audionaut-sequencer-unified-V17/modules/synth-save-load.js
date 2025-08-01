/**
 * @file SaveLoad.js
 * @description Manages saving and loading the complete state of the synthesizer,
 * aligning with the new schema-driven SynthEngine.
 */
export class SaveLoad {
    constructor(state, eventBus) {
        this.state = state;
        this.eventBus = eventBus;
        this.version = '3.2-schema'; // Updated version for the new save format
        this._statusTimeout = null;
        this.init();
    }

    init() {
        console.log('[SaveLoad] Initializing save-load module...');
    }

    /**
     * [THE FIX] Gathers the full state using the new engine's methods.
     * The structure is now flatter and more logical.
     */
    getFullState() {
        if (!this.state.synth || !this.state.recorder) {
            throw new Error("Synth or Recorder not available to get state.");
        }
        
        // Get all parameters directly from the synth engine. This is the new "patch".
        const synthParams = this.state.synth.getAllParameters();

        return {
            version: this.version,
            // All synth parameters are stored at the top level.
            ...synthParams, 
            
            // Non-synth state is stored in namespaced objects.
            recorderState: {
                sequence: this.state.recorder.getSequence ? this.state.recorder.getSequence() : []
            },
            uiState: {
                currentOctave: this.state.curOct,
            },
            loopManagerState: this.state.loopManager ? this.state.loopManager.getState?.() || {} : {}
        };
    }

    /**
     * [THE FIX] Loads a state object by iterating through its parameters
     * and setting them one-by-one on the new engine.
     */
    loadState(data) {
        try {
            const state = (typeof data === 'string') ? JSON.parse(data) : data;
            if (!state.version || !state.version.startsWith('3')) {
                throw new Error('Invalid or unsupported state file format.');
            }

            // --- Restore Synth Engine State ---
            // Iterate over every key in the loaded state object.
            for (const [key, value] of Object.entries(state)) {
                // If the key exists in the synth's parameter map, set it.
                // This robustly handles loading older patches or ignoring irrelevant data.
                if (this.state.synth.paramConfig && this.state.synth.paramConfig[key]) {
                    this.state.synth.setParameter(key, value);
                }
            }
            
            // --- Restore other modules' state ---
            if (state.recorderState && state.recorderState.sequence && this.state.recorder.setSequence) {
                this.state.recorder.setSequence(state.recorderState.sequence);
            }
            if (state.loopManagerState && this.state.loopManager && this.state.loopManager.setState) {
                this.state.loopManager.setState(state.loopManagerState);
            }
            if (state.uiState) {
                this.state.curOct = state.uiState.currentOctave || 4;
            }

            this.refreshAllUIs();
            this.showStatus('State loaded successfully!', 'success');
            this.eventBus.dispatchEvent(new CustomEvent('load-completed'));
            this.eventBus.dispatchEvent(new CustomEvent('synth-state-loaded', { detail: state }));

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
        }
    }

    saveStateToFile() {
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

    refreshAllUIs() {
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