        transportEl.appendChild(loadFileInput); // This is hidden
        transportEl.appendChild(saveLoadStatus);
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

   // --- Public API (Enhanced for smaller files and complete state) ---

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

    /** Initiates the enhanced save process. */
    saveState() {
        try {
            console.log('[SaveLoad] Starting condensed save operation...');
            
            // 1. Capture the full, descriptive state object from all modules.
            const fullState = this.captureState();

            // 2. Define a helper to round numbers to 4 decimal places for compactness.
            const round = (num) => typeof num === 'number' ? parseFloat(num.toFixed(4)) : num;

            // 3. Convert the full state to a condensed format using short keys.
            const condensedState = {
                v: '2.0', // version
                e: fullState.envelope, // envelope
                fx: { // effects
                    e: fullState.effects.enabled,
                    p: fullState.effects.parameters
                }, 
                l: fullState.loop, // loop
                o: fullState.oscillator, // oscillator
                t: fullState.transport, // transport
                ui: fullState.ui, // ui
                // Convert sequence of objects to an array of arrays [note, start, dur, vel]
                s: fullState.sequence.map(n => [n.note, round(n.start), round(n.dur), round(n.vel)])
            };

            // 4. Stringify without any extra whitespace for maximum compression.
            const jsonString = JSON.stringify(condensedState);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            this.downloadFile(jsonString, `synth-state-${timestamp}.synthstate-v2.json`);
            this.showStatus('State saved successfully!', 'success');
            console.log(`[SaveLoad] Save completed. Size: ${jsonString.length} bytes`);

        } catch (error) {
            console.error('[SaveLoad] Save error:', error);
            this.showStatus(`Save failed: ${error.message}`, 'error');
        }
    },

    /** Captures the complete synth state from all relevant modules. */
    captureState() {
        console.log('[SaveLoad] Capturing complete application state...');

        // Get state directly from the modules' own methods for robustness.
        const envelopeSettings = EnvelopeManager.getSettings();
        const effectsState = window.EnhancedEffects?.savePreset() || {}; // Use window scope as fallback
        
        const loopSettings = {
            enabled: window.LoopManager?.isLoopEnabled,
            start: window.LoopManager?.loopStart,
            end: window.LoopManager?.loopEnd,
            quantize: window.LoopManager?.quantizeEnabled,
            grid: window.LoopManager?.quantizeGrid,
            swing: window.LoopManager?.swingAmount,
            tempo: {
                original: window.LoopManager?.originalTempo,
                target: window.LoopManager?.targetTempo
            }
        };
        
        // Get the remaining simple values from the DOM/global app state.
        const oscillatorSettings = {
            waveform: this._getElementValue('waveform'),
            detune: parseFloat(this._getElementValue('detune'))
        };
        const transportSettings = {
            bpm: parseFloat(this._getElementValue('bpm'))
        };
        const uiState = {
            currentOctave: window.synthApp.curOct,
            selectedNote: window.synthApp.selNote
        };
        const sequence = window.synthApp.seq || [];

        // Assemble into a single, descriptively-keyed object.
        return {
            envelope: envelopeSettings,
            effects: effectsState,
            loop: loopSettings,
            oscillator: oscillatorSettings,
            transport: transportSettings,
            ui: uiState,
            sequence: sequence
        };
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

    /** Loads the synth state from a JSON string, supporting old and new formats. */
    loadState(jsonString) {
        try {
            console.log('[SaveLoad] Starting load operation...');
            const loadedData = JSON.parse(jsonString);

            // --- BACKWARDS COMPATIBILITY CHECK ---
            if (loadedData.synthState) {
                console.warn('[SaveLoad] Old file format detected. Using legacy loader.');
                return this._legacyLoadState(loadedData);
            }
            
            // --- NEW FORMAT (v2.0) LOADER ---
            if (!loadedData.v || !loadedData.v.startsWith('2.')) {
                throw new Error('Invalid or unsupported state file format');
            }

            // 1. Restore Envelope
            if (loadedData.e) EnvelopeManager.setSettings(loadedData.e);

            // 2. Restore Effects
            if (loadedData.fx && window.EnhancedEffects) window.EnhancedEffects.loadPreset({
                enabled: loadedData.fx.e,
                parameters: loadedData.fx.p
            });
            
            // 3. Restore Loop Settings
            if (loadedData.l && window.LoopManager) {
                const l = loadedData.l;
                window.LoopManager.setLoopEnabled(l.enabled);
                window.LoopManager.setLoopBounds(l.start, l.end);
                window.LoopManager.setQuantization(l.quantize, l.grid);
                window.LoopManager.setSwing(l.swing);
                if (l.tempo) window.LoopManager.setTempoConversion(l.tempo.original, l.tempo.target);
                this._safeCall(window.LoopUI?.updateUI, 'loop UI update');
            }

            // 4. Restore Oscillator and Transport from DOM elements
            if (loadedData.o) {
                this._setElementValue('waveform', loadedData.o.waveform, 'change');
                this._setElementValue('detune', loadedData.o.detune, 'input');
            }
            if (loadedData.t) {
                this._setElementValue('bpm', loadedData.t.bpm, 'change');
            }

            // 5. Restore Sequence by reconstructing objects from arrays
            if (loadedData.s) {
                const sequence = loadedData.s.map(n => ({ note: n[0], start: n[1], dur: n[2], vel: n[3] || 0.8 }));
                this.restoreSequence(sequence);
            }

            // 6. Restore UI State
            if (loadedData.ui) this.restoreUIState(loadedData.ui);

            this.refreshDisplays();
            this._safeCall(window.EnhancedControls?.updateAllDisplayValues, 'enhanced controls update');

            this.showStatus('State loaded!', 'success');
            console.log('[SaveLoad] Load completed successfully');

        } catch (error) {
            console.error('[SaveLoad] Load error:', error);
            this.showStatus(`Load failed: ${error.message}`, 'error');
        }
    },

    /**
     * Private method to handle loading of the original, verbose file format.
     * @param {object} state - The parsed old-format state object.
     */
    _legacyLoadState(state) {
        if (!(state?.version && state?.synthState?.settings && Array.isArray(state?.synthState?.sequence))) {
            throw new Error('Invalid legacy state file format');
        }
        // Restore using the old method of setting DOM elements from a config map.
        this.restoreSettings(state.synthState.settings); 
        this.restoreSequence(state.synthState.sequence);
        this.restoreUIState(state.synthState.ui);
        this.refreshDisplays();
        this.showStatus('Legacy state loaded successfully!', 'success');
        console.log('[SaveLoad] Legacy load completed successfully');
    },

    /** Restores synth settings to the UI. */
    restoreSettings(settings) {
        if (!settings) return;
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
    }
};

export default SaveLoad;