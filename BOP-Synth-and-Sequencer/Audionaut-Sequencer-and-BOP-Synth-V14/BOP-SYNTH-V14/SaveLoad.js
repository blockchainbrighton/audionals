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
    }

    getFullState() {
        if (!this.state.synth || !this.state.recorder) {
            throw new Error("Synth or Recorder not available to get state.");
        }
        return {
            version: this.version,
            synthEngine: {
                patch: this.state.synth.getPatch(),
                effectState: this.state.synth.effectState || {}
            },
            recorder: {
                sequence: this.state.recorder.getSequence ? this.state.recorder.getSequence() : []
            },
            ui: {
                currentOctave: this.state.curOct,
            },
            loopManager: this.state.loopManager ? this.state.loopManager.getState?.() || {} : {}
        };
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

    // **The only public load function now!**
    loadState(data) {
        try {
            const state = (typeof data === 'string') ? JSON.parse(data) : data;
            if (!state.version) throw new Error('Invalid or unsupported state file format - missing version.');

            if (state.synthEngine) {
                if (state.synthEngine.patch) this.state.synth.setPatch(state.synthEngine.patch);
                if (state.synthEngine.effectState) this.state.synth.effectState = { ...state.synthEngine.effectState };
            }
            if (state.recorder && state.recorder.sequence && this.state.recorder.setSequence) {
                this.state.recorder.setSequence(state.recorder.sequence);
            }
            if (state.loopManager && this.state.loopManager && this.state.loopManager.setState) {
                this.state.loopManager.setState(state.loopManager);
            }
            if (state.ui) this.state.curOct = state.ui.currentOctave || 4;

            this.refreshAllUIs();
            this.showStatus('State loaded successfully!', 'success');
            this.eventBus.dispatchEvent(new CustomEvent('load-completed'));
            this.eventBus.dispatchEvent(new CustomEvent('synth-state-loaded', { detail: state }));

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
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
