// In BOP-SYNTH-V12/BopSynthUI.js


/**
 * @file BopSynthUI.js
 * @description The UI controller for the BOP Synthesizer application.
 * Manages all visual components and their interaction with the logic core via the event bus.
 */

import { Keyboard } from './Keyboard.js';
import Transport from './Transport.js';
import PianoRoll from './PianoRoll.js';
import EnhancedControls from './EnhancedControls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';

export class BopSynthUI {
    constructor(logicController, uiElements) {
        // Dependencies are passed in from the logic controller
        this.logic = logicController;
        this.Tone = logicController.Tone;
        this.state = logicController.state;
        this.eventBus = logicController.eventBus;

        this.uiElements = uiElements;
        this.modules = {};

        this.init();
    }

    init() {
        // --- Initialize all UI Modules ---
        this.modules.keyboard = new Keyboard(
            this.uiElements.keyboard, // Element passed directly
            this.eventBus,
            this.state,
            this.Tone
        );
        this.modules.transport = new Transport(
            this.uiElements.transport, // Element passed directly
            this.eventBus
        );
        this.modules.pianoRoll = new PianoRoll(
            this.uiElements.pianoRoll, // Element passed directly
            this.eventBus,
            this.state
        );
        this.modules.enhancedControls = new EnhancedControls(
            this.uiElements.controls, // Element passed directly
            this.eventBus,
            this.logic.modules.synthEngine
        );
        this.modules.midiControl = new MidiControl(this.eventBus);
        
        // --- FIX: Pass the container element to LoopUI ---
        this.modules.loopUI = new LoopUI(
            this.uiElements.loopControls, // Pass the new element
            this.eventBus
        );

        this.wireUpEvents();
    
        // NEW: Immediately request the current loop/quantize state to sync the UI on creation.
        this.eventBus.dispatchEvent(new CustomEvent('request-loop-state'));
        
        console.log('[BopSynthUI] UI layer initialized.');
    }

    // ADD these two new methods:
    /**
     * NEW: Gathers the state from all UI components.
     * @returns {object} The complete UI state object.
     */
    getUIState() {
        // The "source of truth" for checkbox state is the logic layer (LoopManager).
        const loopStatus = this.logic.modules.loopManager.getLoopStatus();

        return {
            expandedPanels: this.modules.enhancedControls.getExpandedState(),
            loopEnabled: loopStatus.enabled,
            quantizeEnabled: loopStatus.quantizeEnabled
        };
    }

    /**
     * NEW: Applies a loaded state to all UI components.
     * @param {object} uiState - The UI state object from a saved patch.
     */
    applyUIState(uiState) {
        if (!uiState) {
            console.warn('[BopSynthUI] applyUIState called with no state.');
            return;
        }
        
        console.log('[BopSynthUI] Applying UI state:', uiState);

        // Restore expanded panels
        if (uiState.expandedPanels) {
            this.modules.enhancedControls.applyExpandedState(uiState.expandedPanels);
        }
        
        // The core logic for loop/quantize is already loaded into LoopManager.
        // We just need to tell the UI to refresh itself based on that now-loaded state.
        this.eventBus.dispatchEvent(new CustomEvent('request-loop-state'));
    }

    /**
     * Wires up event handlers that bridge the logic core's events to UI updates.
     */
    wireUpEvents() {
        const bus = this.eventBus;

        // --- Listen for Logic Events to Update UI ---

        // When recording state changes, update the transport buttons' appearance
        bus.addEventListener('recording-state-changed', e => {
            const { isRecording, isArmed, isPlaying, hasSequence } = e.detail;
            bus.dispatchEvent(new CustomEvent('transport-state-update', {
                detail: { isRecording, isArmed, isPlaying, hasSequence }
            }));
        });

        // When the note sequence changes (e.g., loaded, cleared, recorded), redraw the piano roll
        bus.addEventListener('sequence-changed', () => {
            bus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
        });
        
        // When a note is played/released by the recorder, update the keyboard visuals
        bus.addEventListener('note-visual-change', e => {
            bus.dispatchEvent(new CustomEvent('keyboard-note-visual', {
                detail: { note: e.detail.note, active: e.detail.active }
            }));
        });
        
        // When the octave changes in the logic, redraw the keyboard
        bus.addEventListener('octave-change', e => {
             bus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        });

        // Listen for generic status updates to display them
        bus.addEventListener('status-update', e => {
            this.updateStatus(e.detail.message, e.detail.type);
        });
    }

    updateStatus(message, type = 'info') {
        // This method directly manipulates the DOM, so it belongs here.
        const statusElement = document.getElementById('status'); // Assuming a status element exists
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
        console.log(`[BopSynthUI] Status: ${message}`);
    }

    destroy() {
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        console.log('[BopSynthUI] UI layer destroyed.');
    }
}