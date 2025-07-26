// modules/save-load.js
// Save and Load functionality for Audionauts Synth
// Captures and restores complete synth state including settings, sequences, and UI state

export const SaveLoad = {
    version: '1.0',
    
    init() {
        console.log('[SaveLoad] Initializing save-load module...');
        this.addUI();
        this.bindEvents();
    },

    addUI() {
        // Add save/load buttons to the transport controls
        const transportEl = document.getElementById('transport-controls');
        if (!transportEl) {
            console.error('[SaveLoad] Transport controls not found');
            return;
        }

        // Create save/load button container
        const saveLoadContainer = document.createElement('div');
        saveLoadContainer.className = 'save-load-controls';
        saveLoadContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #333;
        `;

        saveLoadContainer.innerHTML = `
            <button id="saveBtn" class="transport-button save-button">
                <span>💾</span>Save State
            </button>
            <button id="loadBtn" class="transport-button load-button">
                <span>📁</span>Load State
            </button>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="
                margin-left: 10px;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                display: none;
            "></div>
        `;

        transportEl.appendChild(saveLoadContainer);
    },

    bindEvents() {
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        const fileInput = document.getElementById('loadFileInput');

        if (saveBtn) {
            saveBtn.onclick = () => this.saveState();
        }

        if (loadBtn) {
            loadBtn.onclick = () => this.triggerLoad();
        }

        if (fileInput) {
            fileInput.onchange = (e) => this.handleFileLoad(e);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveState();
                } else if (e.key === 'o') {
                    e.preventDefault();
                    this.triggerLoad();
                }
            }
        });
    },

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('saveLoadStatus');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.style.display = 'block';
        
        // Set color based on type
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            info: '#2196f3',
            warning: '#ff9800'
        };
        statusEl.style.backgroundColor = colors[type] || colors.info;
        statusEl.style.color = 'white';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    },

    saveState() {
        try {
            console.log('[SaveLoad] Starting save operation...');
            
            // Capture current state
            const state = this.captureState();
            
            // Convert to JSON
            const jsonString = JSON.stringify(state, null, 2);
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `synth-state-${timestamp}.synthstate`;
            
            // Trigger download
            this.downloadFile(jsonString, filename);
            
            this.showStatus('State saved successfully!', 'success');
            console.log('[SaveLoad] Save completed successfully');
            
        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus('Save failed: ' + error.message, 'error');
        }
    },

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

    captureSettings() {
        const settings = {
            oscillator: {
                waveform: 'sine',
                detune: 0
            },
            filter: {
                type: 'lowpass',
                frequency: 5000,
                resonance: 1
            },
            effects: {
                reverb: 30,
                delay: 20
            },
            transport: {
                bpm: 120
            }
        };

        try {
            // Capture oscillator settings
            const waveformEl = document.getElementById('waveform');
            const detuneEl = document.getElementById('detune');
            
            if (waveformEl) settings.oscillator.waveform = waveformEl.value;
            if (detuneEl) settings.oscillator.detune = parseFloat(detuneEl.value);

            // Capture filter settings
            const filterTypeEl = document.getElementById('filterType');
            const filterFreqEl = document.getElementById('filterFreq');
            const filterQEl = document.getElementById('filterQ');
            
            if (filterTypeEl) settings.filter.type = filterTypeEl.value;
            if (filterFreqEl) settings.filter.frequency = parseFloat(filterFreqEl.value);
            if (filterQEl) settings.filter.resonance = parseFloat(filterQEl.value);

            // Capture effects settings
            const reverbEl = document.getElementById('reverb');
            const delayEl = document.getElementById('delay');
            
            if (reverbEl) settings.effects.reverb = parseFloat(reverbEl.value);
            if (delayEl) settings.effects.delay = parseFloat(delayEl.value);

            // Capture transport settings
            const bpmEl = document.getElementById('bpm');
            if (bpmEl) settings.transport.bpm = parseFloat(bpmEl.value);

        } catch (error) {
            console.warn('[SaveLoad] Error capturing settings:', error);
        }

        return settings;
    },

    captureSequence() {
        // Deep copy the sequence to avoid references
        if (window.synthApp && window.synthApp.seq) {
            return JSON.parse(JSON.stringify(window.synthApp.seq));
        }
        return [];
    },

    captureUIState() {
        const ui = {
            currentOctave: 4,
            selectedNote: null
        };

        try {
            if (window.synthApp) {
                ui.currentOctave = window.synthApp.curOct || 4;
                ui.selectedNote = window.synthApp.selNote;
            }
        } catch (error) {
            console.warn('[SaveLoad] Error capturing UI state:', error);
        }

        return ui;
    },

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
        
        URL.revokeObjectURL(url);
    },

    triggerLoad() {
        const fileInput = document.getElementById('loadFileInput');
        if (fileInput) {
            fileInput.click();
        }
    },

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                this.loadState(jsonString);
            } catch (error) {
                console.error('[SaveLoad] File read error:', error);
                this.showStatus('Failed to read file: ' + error.message, 'error');
            }
        };

        reader.onerror = () => {
            this.showStatus('Failed to read file', 'error');
        };

        reader.readAsText(file);
        
        // Clear the input so the same file can be loaded again
        event.target.value = '';
    },

    loadState(jsonString) {
        try {
            console.log('[SaveLoad] Starting load operation...');
            
            // Parse JSON
            const state = JSON.parse(jsonString);
            
            // Validate format
            if (!this.validateState(state)) {
                throw new Error('Invalid state file format');
            }
            
            // Restore state
            this.restoreSettings(state.synthState.settings);
            this.restoreSequence(state.synthState.sequence);
            this.restoreUIState(state.synthState.ui);
            
            // Refresh displays
            this.refreshDisplays();
            
            this.showStatus('State loaded successfully!', 'success');
            console.log('[SaveLoad] Load completed successfully');
            
        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus('Load failed: ' + error.message, 'error');
        }
    },

    validateState(state) {
        if (!state || typeof state !== 'object') return false;
        if (!state.version || !state.synthState) return false;
        if (!state.synthState.settings || !Array.isArray(state.synthState.sequence)) return false;
        return true;
    },

    restoreSettings(settings) {
        if (!settings) return;

        try {
            // Restore oscillator settings
            if (settings.oscillator) {
                const waveformEl = document.getElementById('waveform');
                const detuneEl = document.getElementById('detune');
                
                if (waveformEl && settings.oscillator.waveform) {
                    waveformEl.value = settings.oscillator.waveform;
                    waveformEl.dispatchEvent(new Event('change'));
                }
                
                if (detuneEl && typeof settings.oscillator.detune === 'number') {
                    detuneEl.value = settings.oscillator.detune;
                    detuneEl.dispatchEvent(new Event('input'));
                }
            }

            // Restore filter settings
            if (settings.filter) {
                const filterTypeEl = document.getElementById('filterType');
                const filterFreqEl = document.getElementById('filterFreq');
                const filterQEl = document.getElementById('filterQ');
                
                if (filterTypeEl && settings.filter.type) {
                    filterTypeEl.value = settings.filter.type;
                    filterTypeEl.dispatchEvent(new Event('input'));
                }
                
                if (filterFreqEl && typeof settings.filter.frequency === 'number') {
                    filterFreqEl.value = settings.filter.frequency;
                    filterFreqEl.dispatchEvent(new Event('input'));
                }
                
                if (filterQEl && typeof settings.filter.resonance === 'number') {
                    filterQEl.value = settings.filter.resonance;
                    filterQEl.dispatchEvent(new Event('input'));
                }
            }

            // Restore effects settings
            if (settings.effects) {
                const reverbEl = document.getElementById('reverb');
                const delayEl = document.getElementById('delay');
                
                if (reverbEl && typeof settings.effects.reverb === 'number') {
                    reverbEl.value = settings.effects.reverb;
                    reverbEl.dispatchEvent(new Event('input'));
                }
                
                if (delayEl && typeof settings.effects.delay === 'number') {
                    delayEl.value = settings.effects.delay;
                    delayEl.dispatchEvent(new Event('input'));
                }
            }

            // Restore transport settings
            if (settings.transport) {
                const bpmEl = document.getElementById('bpm');
                
                if (bpmEl && typeof settings.transport.bpm === 'number') {
                    bpmEl.value = settings.transport.bpm;
                    bpmEl.dispatchEvent(new Event('change'));
                }
            }

        } catch (error) {
            console.warn('[SaveLoad] Error restoring settings:', error);
        }
    },

    restoreSequence(sequence) {
        if (!Array.isArray(sequence)) return;

        try {
            if (window.synthApp) {
                // Stop any current playback
                if (window.synthApp.isPlaying) {
                    const stopBtn = document.getElementById('stopBtn');
                    if (stopBtn) stopBtn.click();
                }

                // Replace sequence data
                window.synthApp.seq = JSON.parse(JSON.stringify(sequence));
                
                // Update play button state
                const playBtn = document.getElementById('playBtn');
                if (playBtn) {
                    playBtn.disabled = sequence.length === 0;
                }

                console.log(`[SaveLoad] Restored ${sequence.length} notes`);
            }
        } catch (error) {
            console.warn('[SaveLoad] Error restoring sequence:', error);
        }
    },

    restoreUIState(ui) {
        if (!ui) return;

        try {
            // Restore octave
            if (typeof ui.currentOctave === 'number' && window.synthApp) {
                window.synthApp.curOct = Math.max(0, Math.min(7, ui.currentOctave));
                
                const octaveLabel = document.getElementById('octaveLabel');
                if (octaveLabel) {
                    octaveLabel.textContent = `Octave: ${window.synthApp.curOct}`;
                }
            }

            // Restore selected note
            if (window.synthApp) {
                window.synthApp.selNote = ui.selectedNote;
            }

        } catch (error) {
            console.warn('[SaveLoad] Error restoring UI state:', error);
        }
    },

    refreshDisplays() {
        try {
            // Refresh keyboard display
            if (window.Keyboard && typeof window.Keyboard.draw === 'function') {
                window.Keyboard.draw();
            }

            // Refresh piano roll display
            if (window.PianoRoll && typeof window.PianoRoll.draw === 'function') {
                window.PianoRoll.draw();
            }

            console.log('[SaveLoad] Displays refreshed');
        } catch (error) {
            console.warn('[SaveLoad] Error refreshing displays:', error);
        }
    },

    // Utility method to export current state as JSON string (for debugging)
    exportStateJSON() {
        try {
            const state = this.captureState();
            return JSON.stringify(state, null, 2);
        } catch (error) {
            console.error('[SaveLoad] Export error:', error);
            return null;
        }
    },

    // Utility method to import state from JSON string (for debugging)
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

