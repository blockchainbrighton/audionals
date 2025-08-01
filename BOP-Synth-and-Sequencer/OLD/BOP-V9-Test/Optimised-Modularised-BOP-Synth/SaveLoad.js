/**
 * @file SaveLoad.js
 * @description Save/load module for the BOP Synthesizer component.
 * Handles saving and loading synthesizer state as a singleton object.
 */

// Import other modules this one needs to interact with
import { LoopUI } from './loop-ui.js';
import LoopManager from './LoopManager.js';
import PianoRoll from './PianoRoll.js';
import Keyboard from './keyboard.js';

const SaveLoad = {
    version: '2.0',
    _statusTimeout: null,

    init() {
        console.log('[SaveLoad] Initializing save-load module...');
        this.addUI();
        this.bindEvents();
    },

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
    },

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
    },

    saveState() {
        try {
            console.log('[SaveLoad] Starting state save operation...');
            const state = this.captureState();
            const jsonString = JSON.stringify(state);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `bop-patch-${timestamp}.json`);
            this.showStatus('State saved successfully!', 'success');
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
        }
    },

    captureState() {
        if (!window.synthApp.synth) {
            throw new Error("Synth Engine not ready.");
        }
        
        const synthPatch = window.synthApp.synth.getPatch();

        return {
            version: this.version,
            patch: synthPatch,
            sequence: window.synthApp.seq || [],
            loop: {
                enabled: LoopManager.isLoopEnabled,
                start: LoopManager.loopStart,
                end: LoopManager.loopEnd,
                quantize: LoopManager.quantizeEnabled,
                grid: LoopManager.quantizeGridValue,
                swing: LoopManager.swingAmount,
            },
            ui: {
                currentOctave: window.synthApp.curOct,
            }
        };
    },

    triggerLoad() {
        document.getElementById('loadFileInput')?.click();
    },

    handleFileLoad(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => this.loadState(e.target.result);
        reader.onerror = () => this.showStatus('Failed to read file', 'error');
        reader.readAsText(file);
        event.target.value = '';
    },

    loadState(jsonString) {
        try {
            console.log('[SaveLoad] Starting load operation...');
            const state = JSON.parse(jsonString);

            if (!state.version || !state.patch || !state.sequence) {
                throw new Error('Invalid or unsupported state file format.');
            }
            
            window.synthApp.synth.setPatch(state.patch);
            window.synthApp.seq = state.sequence || [];
            
            if (state.loop) {
                LoopManager.setLoopEnabled(state.loop.enabled);
                LoopManager.setLoopBounds(state.loop.start, state.loop.end);
                LoopManager.setQuantization(state.loop.quantize, state.loop.grid);
                LoopManager.setSwing(state.loop.swing || 0);
            }

            if (state.ui) {
                window.synthApp.curOct = state.ui.currentOctave || 4;
            }

            this.refreshAllUIs();
            this.showStatus('State loaded!', 'success');

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
        }
    },
    
    refreshAllUIs() {
        console.log('[SaveLoad] Refreshing all UIs...');
        
        LoopUI.updateUI();
        Keyboard.draw();
        PianoRoll.draw();

        // --- THIS IS THE FIX ---
        // Tell the EnhancedRecorder to update the transport buttons based on the new state.
        if (window.synthApp && window.synthApp.recorder) {
            console.log('[SaveLoad] Triggering transport button state update.');
            window.synthApp.recorder.updateButtonStates();
        }
        // --- END OF FIX ---

        const octaveLabel = document.getElementById('octaveLabel');
        if (octaveLabel) {
            octaveLabel.textContent = `Octave: ${window.synthApp.curOct}`;
        }
        
        console.log('[SaveLoad] All UIs refreshed.');
    },
    
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
    },
    
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
    }
};

export default SaveLoad;