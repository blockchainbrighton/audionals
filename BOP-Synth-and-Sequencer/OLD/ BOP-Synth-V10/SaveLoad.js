/**
 * @file SaveLoad.js
 * @description Save/load module for the BOP Synthesizer component.
 * Refactored to use dependency injection and event-driven communication.
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
        this.addUI();
        this.bindEvents();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for save/load requests from other modules
        this.eventBus.addEventListener('save-project', () => {
            this.saveState();
        });
        
        this.eventBus.addEventListener('load-project', (e) => {
            const { data } = e.detail;
            this.loadState(data);
        });
    }

    addUI() {
        const transportEl = document.getElementById('transport-controls');
        if (!transportEl) {
            console.error('[SaveLoad] Transport controls container not found');
            return;
        }

        if (document.getElementById('saveBtn')) return;

        transportEl.insertAdjacentHTML('beforeend', `
            <button id="saveBtn" class="transport-button save-button"><span>💾</span>Save State</button>
            <button id="loadBtn" class="transport-button load-button"><span>📁</span>Load State</button>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="display: none;"></div>
        `);
    }

    bindEvents() {
        document.getElementById('saveBtn')?.addEventListener('click', () => this.saveState());
        document.getElementById('loadBtn')?.addEventListener('click', () => this.triggerLoad());
        document.getElementById('loadFileInput')?.addEventListener('change', (e) => this.handleFileLoad(e));

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.repeat) {
                if (e.key === 's') { e.preventDefault(); this.saveState(); }
                if (e.key === 'o') { e.preventDefault(); this.triggerLoad(); }
            }
        });
    }

    saveState() {
        try {
            console.log('[SaveLoad] Starting state save operation...');
            const state = this.captureState();
            const jsonString = JSON.stringify(state);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `bop-patch-${timestamp}.json`);
            this.showStatus('State saved successfully!', 'success');
            
            // Emit save completed event
            this.eventBus.dispatchEvent(new CustomEvent('save-completed', {
                detail: { filename: `bop-patch-${timestamp}.json` }
            }));
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
            
            // Emit save error event
            this.eventBus.dispatchEvent(new CustomEvent('save-error', {
                detail: { error: error.message }
            }));
        }
    }

    captureState() {
        if (!this.state.synth) {
            throw new Error("Synth Engine not ready.");
        }
        
        const synthPatch = this.state.synth.getPatch();

        return {
            version: this.version,
            patch: synthPatch,
            sequence: this.state.seq || [],
            loop: {
                enabled: false, // Will be updated by LoopManager
                start: 0,
                end: 4,
                quantize: false,
                grid: 16,
                swing: 0,
            },
            ui: {
                currentOctave: this.state.curOct,
            }
        };
    }

    triggerLoad() {
        document.getElementById('loadFileInput')?.click();
    }

    handleFileLoad(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => this.loadState(e.target.result);
        reader.onerror = () => this.showStatus('Failed to read file', 'error');
        reader.readAsText(file);
        event.target.value = '';
    }

    loadState(jsonString) {
        try {
            console.log('[SaveLoad] Starting load operation...');
            const state = JSON.parse(jsonString);

            if (!state.version || !state.patch || !state.sequence) {
                throw new Error('Invalid or unsupported state file format.');
            }
            
            // Load synth patch
            this.state.synth.setPatch(state.patch);
            
            // Load sequence
            this.state.seq = state.sequence || [];
            
            // Load loop settings via events
            if (state.loop) {
                this.eventBus.dispatchEvent(new CustomEvent('loop-settings-load', {
                    detail: state.loop
                }));
            }

            // Load UI settings
            if (state.ui) {
                this.state.curOct = state.ui.currentOctave || 4;
                this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                    detail: { octave: this.state.curOct }
                }));
            }

            // Emit events to refresh all UIs
            this.refreshAllUIs();
            this.showStatus('State loaded!', 'success');
            
            // Emit load completed event
            this.eventBus.dispatchEvent(new CustomEvent('load-completed', {
                detail: { state }
            }));

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
            
            // Emit load error event
            this.eventBus.dispatchEvent(new CustomEvent('load-error', {
                detail: { error: error.message }
            }));
        }
    }
    
    refreshAllUIs() {
        console.log('[SaveLoad] Refreshing all UIs...');
        
        // Emit events to refresh all UI components
        this.eventBus.dispatchEvent(new CustomEvent('loop-ui-refresh'));
        this.eventBus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        this.eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                isRecording: this.state.isRec,
                isArmed: this.state.isArmed,
                isPlaying: this.state.isPlaying,
                hasSequence: this.state.seq && this.state.seq.length > 0
            }
        }));
        
        // Update octave label
        const octaveLabel = document.getElementById('octaveLabel');
        if (octaveLabel) {
            octaveLabel.textContent = `Octave: ${this.state.curOct}`;
        }
        
        console.log('[SaveLoad] All UIs refreshed.');
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
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.style.display = 'block';
        const colors = { success: '#4caf50', error: '#f44336', info: '#2196f3' };
        statusEl.style.backgroundColor = colors[type] || colors.info;
        
        clearTimeout(this._statusTimeout);
        this._statusTimeout = setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
        
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

