export class HUD {
    /** @type {import('../core/Engine.js').Engine} */
    engine;

    // Main HUD elements
    /** @type {HTMLButtonElement} */ startPauseButton;
    /** @type {HTMLButtonElement} */ modeToggleButton;
    /** @type {HTMLButtonElement} */ manualDropButton;
    /** @type {HTMLSpanElement} */ savedCountEl;
    /** @type {HTMLSpanElement} */ lostCountEl;
    /** @type {HTMLSpanElement} */ totalCountEl;
    /** @type {HTMLSpanElement} */ selectedCountEl;
    /** @type {HTMLSpanElement} */ gateChordInfoEl;

    // Abilities Panel elements
    /** @type {HTMLButtonElement} */ pitchUpButton;
    /** @type {HTMLButtonElement} */ pitchDownButton;
    /** @type {HTMLButtonElement} */ tempoUpButton;
    /** @type {HTMLButtonElement} */ tempoDownButton;
    /** @type {HTMLButtonElement} */ muteButton;
    /** @type {HTMLButtonElement} */ soloButton;
    /** @type {HTMLInputElement} */ arpeggiatorSlider;
    /** @type {HTMLSpanElement} */ arpeggiatorValueEl;
    /** @type {HTMLButtonElement} */ quantizeButton;
    /** @type {HTMLSelectElement} */ waveformSelect;
    /** @type {HTMLButtonElement} */ globalKeyChangeButton;

    // Environment Panel elements
    /** @type {HTMLButtonElement} */ placeResonanceFieldButton;
    /** @type {HTMLSpanElement} */ resonanceFieldsLeftEl;
    
    // Accessibility Panel elements
    /** @type {HTMLButtonElement} */ assistModeButton;
    /** @type {HTMLButtonElement} */ colorblindButton;
    /** @type {HTMLButtonElement} */ audioContrastButton;


    /** @param {import('../core/Engine.js').Engine} gameEngine */
    constructor(gameEngine) {
        this.engine = gameEngine;
        this.initDOMElements();
        this.bindEvents();
        this.updateAbilitiesPanel(null); // Initialize disabled
    }

    initDOMElements() {
        // Main HUD
        this.startPauseButton = document.getElementById('start-pause-button');
        this.modeToggleButton = document.getElementById('mode-toggle-button');
        this.manualDropButton = document.getElementById('manual-drop-button');
        this.savedCountEl = document.getElementById('saved-count');
        this.lostCountEl = document.getElementById('lost-count');
        this.totalCountEl = document.getElementById('total-count');
        this.selectedCountEl = document.getElementById('selected-count');
        this.gateChordInfoEl = document.getElementById('chord-info');

        // Abilities Panel
        this.pitchUpButton = document.getElementById('pitch-shift-up-button');
        this.pitchDownButton = document.getElementById('pitch-shift-down-button');
        this.tempoUpButton = document.getElementById('tempo-up-button');
        this.tempoDownButton = document.getElementById('tempo-down-button');
        this.muteButton = document.getElementById('mute-button');
        this.soloButton = document.getElementById('solo-button');
        this.arpeggiatorSlider = document.getElementById('arpeggiator-slider');
        this.arpeggiatorValueEl = document.getElementById('arpeggiator-value');
        this.quantizeButton = document.getElementById('quantize-toggle-button');
        this.waveformSelect = document.getElementById('waveform-select');
        this.globalKeyChangeButton = document.getElementById('global-key-change-button');

        // Environment Panel
        this.placeResonanceFieldButton = document.getElementById('place-resonance-field-button');
        this.resonanceFieldsLeftEl = document.getElementById('resonance-fields-left');
        
        // Accessibility
        this.assistModeButton = document.getElementById('assist-mode-toggle');
        this.colorblindButton = document.getElementById('colorblind-palette-toggle');
        this.audioContrastButton = document.getElementById('audio-only-toggle');

        // Ensure all UI panels are pointer-event enabled
        document.querySelectorAll('.panel').forEach(panel => {
            panel.style.pointerEvents = 'auto';
        });
    }

    bindEvents() {
        // Main HUD
        this.startPauseButton.addEventListener('click', () => this.engine.togglePause());
        this.modeToggleButton.addEventListener('click', () => this.engine.toggleGameMode());
        this.manualDropButton.addEventListener('click', () => this.engine.spawnHarmonoid(undefined, undefined, 'standard')); // Example spawn type

        // Abilities
        this.pitchUpButton.addEventListener('click', () => this.engine.pitchShiftSelected(1));
        this.pitchDownButton.addEventListener('click', () => this.engine.pitchShiftSelected(-1));
        this.tempoUpButton.addEventListener('click', () => this.engine.changeTempo(0.25));
        this.tempoDownButton.addEventListener('click', () => this.engine.changeTempo(-0.25));
        this.muteButton.addEventListener('click', () => this.engine.toggleMuteSelected());
        this.soloButton.addEventListener('click', () => this.engine.toggleSoloSelected());
        this.arpeggiatorSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.arpeggiatorValueEl.textContent = value;
            this.engine.applyArpeggiatorSweep(value);
        });
        this.quantizeButton.addEventListener('click', () => this.engine.toggleQuantize());
        this.waveformSelect.addEventListener('change', (e) => this.engine.setWaveformSelected(e.target.value));
        this.globalKeyChangeButton.addEventListener('click', () => this.engine.globalKeyChange(1)); // Example: Shift up by 1 semitone

        // Environment
        this.placeResonanceFieldButton.addEventListener('click', () => this.engine.requestPlaceResonanceField());
        
        // Accessibility
        this.assistModeButton.addEventListener('click', () => this.engine.toggleAssistMode());
        this.colorblindButton.addEventListener('click', () => this.engine.toggleColorblindPalette());
        this.audioContrastButton.addEventListener('click', () => this.engine.toggleAudioOnlyHighContrast());
    }

    /**
     * @param {number} saved
     * @param {number} lost
     * @param {number} total
     * @param {number} selected
     */
    updateStats(saved, lost, total, selected) {
        this.savedCountEl.textContent = saved;
        this.lostCountEl.textContent = lost;
        this.totalCountEl.textContent = total;
        this.selectedCountEl.textContent = selected;
    }

    /** @param {number[]} gateNotes (MIDI intervals or absolute) */
    updateGateChordDisplay(gateNotes) {
        if (!gateNotes || gateNotes.length === 0) {
            this.gateChordInfoEl.textContent = '-';
            return;
        }
        // This needs more info from the gate (isRelative, current key root if relative)
        // For simplicity, just list the numbers
        const displayNotes = gateNotes.map(n => {
            // Assuming relative for now, music logic needs to formalize representation
            return this.engine.musicLogic.getNoteName(this.engine.musicLogic.globalKeyRootNote + n);
        }).join(', ');
        this.gateChordInfoEl.textContent = displayNotes;
    }

    /** @param {import('../entities/Harmonoid.js').Harmonoid | null} selectedHarmonoid */
    updateAbilitiesPanel(selectedHarmonoid) {
        const isHarmonoidSelected = selectedHarmonoid !== null;
        this.pitchUpButton.disabled = !isHarmonoidSelected;
        this.pitchDownButton.disabled = !isHarmonoidSelected;
        this.muteButton.disabled = !isHarmonoidSelected;
        this.soloButton.disabled = !isHarmonoidSelected;
        this.arpeggiatorSlider.disabled = !isHarmonoidSelected;
        this.waveformSelect.disabled = !isHarmonoidSelected;

        if (isHarmonoidSelected) {
            this.muteButton.textContent = selectedHarmonoid.isMuted ? 'Unmute (M)' : 'Mute (M)';
            this.soloButton.textContent = selectedHarmonoid.isSoloed ? 'Unsolo (O)' : 'Solo (O)';
            this.waveformSelect.value = selectedHarmonoid.waveform;
            this.arpeggiatorSlider.value = selectedHarmonoid.arpeggioOffset; // Sync slider
            this.arpeggiatorValueEl.textContent = selectedHarmonoid.arpeggioOffset;
        } else {
             this.muteButton.textContent = 'Mute (M)';
             this.soloButton.textContent = 'Solo (O)';
        }
    }
    
    updateTempoDisplay(tempo) {
        // No specific tempo display element in HTML, but could update button text or a label
        this.tempoUpButton.textContent = `Tempo + (${tempo.toFixed(2)}x)`;
        this.tempoDownButton.textContent = `Tempo - (${tempo.toFixed(2)}x)`;
    }

    updateQuantizeButton(isQuantized) {
        this.quantizeButton.textContent = `Quantize: ${isQuantized ? 'ON' : 'OFF'}`;
    }
    
    updateResonanceFieldsLeft(count) {
        this.resonanceFieldsLeftEl.textContent = count;
        this.placeResonanceFieldButton.disabled = count <= 0 || this.engine.placingResonanceField;
    }

    /**
     * @param {string} buttonId ID of the button element
     * @param {string} text Text to set for the button
     */
    setButtonState(buttonId, text) {
        const button = document.getElementById(buttonId);
        if (button) button.textContent = text;
    }
    
    /**
     * @param {string} buttonId ID of the button element
     * @param {boolean} enabled True to enable, false to disable
     */
    setButtonEnabled(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (button instanceof HTMLButtonElement) button.disabled = !enabled;
    }
}