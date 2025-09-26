// BOP-SYNTH-V14/BopSynthUI.js

import { Keyboard } from './synth-keyboard.js';
import Transport from './synth-transport.js';
import PianoRoll from './synth-piano-roll.js';
import EnhancedControls from './synth-enhanced-controls.js';
import { MidiControl } from './synth-midi.js';
import { LoopUI } from './synth-loop-ui.js';
import ArpUI from './synth-arp-ui.js';


const statefulModules = ['pianoRoll', 'enhancedControls', 'loopUI'];

/**
 * Default no-op destroy for UI modules
 */
function ensureDestroy(module) {
    if (!module.destroy) module.destroy = () => {};
    return module;
}
/**
 * Default no-op for getUIState/applyUIState
 */
function ensureUIStateContract(module) {
    if (!module.getUIState) module.getUIState = () => undefined;
    if (!module.applyUIState) module.applyUIState = () => {};
    return module;
}

export class BopSynthUI {
    constructor(logicController, uiElements) {
        this.logic = logicController;
        this.Tone = logicController.Tone;
        this.state = logicController.state;
        this.eventBus = logicController.eventBus;
        this.uiElements = uiElements;
        this.modules = {};
        this.init();
    }

    init() {
        this.modules.keyboard = ensureDestroy(new Keyboard(
            this.uiElements.keyboard, this.eventBus, this.state, this.Tone
        ));
        this.modules.transport = ensureDestroy(new Transport(
            this.uiElements.transport, this.eventBus
        ));
        this.modules.pianoRoll = ensureUIStateContract(ensureDestroy(new PianoRoll(
            this.uiElements.pianoRoll, this.eventBus, this.state
        )));
        this.modules.enhancedControls = ensureUIStateContract(ensureDestroy(new EnhancedControls(
            this.uiElements.controls, this.eventBus, this.logic.modules.synthEngine
        )));
        this.modules.midiControl = ensureDestroy(new MidiControl(this.eventBus));
        this.modules.loopUI = ensureUIStateContract(ensureDestroy(new LoopUI(
            this.uiElements.loopControls, this.eventBus
        )));
        if (this.uiElements.arpControls) {
            this.modules.arpUI = ensureDestroy(new ArpUI(
                this.uiElements.arpControls, this.eventBus, this.state
            ));
        }

        this.wireUpEvents();

        // Sync UI with logic (eg. loop/quantize state)
        this.eventBus.dispatchEvent(new CustomEvent('request-loop-state'));

        console.log('[BopSynthUI] UI layer initialized.');
    }

   /**
     * Synth UI State Shape:
     * {
     *   keyboard: { ... },
     *   transport: { ... },
     *   pianoRoll: { ... },
     *   enhancedControls: { ... },
     *   loopUI: { ... }
     * }
     */

    /**
     * Attempts to get UI state from a module, with a warning if fallback is used.
     */
    tryGetUIState(module, key) {
        if (module && typeof module.getUIState === 'function') {
            return module.getUIState();
        } else {
            console.warn(`[BopSynthUI] getUIState fallback used for module "${key}". Please implement getUIState().`);
            return undefined;
        }
    }

    /**
     * Attempts to apply UI state to a module, with a warning if fallback is used.
     */
    tryApplyUIState(module, key, state) {
        if (module && typeof module.applyUIState === 'function') {
            module.applyUIState(state);
        } else {
            if (state !== undefined) {
                console.warn(`[BopSynthUI] applyUIState fallback used for module "${key}". Please implement applyUIState().`);
            }
        }
    }

   // Only capture layout UI state, not parameters!
    getUIState() {
        const uiState = {};
        statefulModules.forEach(key => {
            const mod = this.modules[key];
            if (mod && typeof mod.getUIState === 'function') {
                const state = mod.getUIState();
                if (state !== undefined) uiState[key] = state;
            }
        });
        return uiState;
    }

    // Restore UI layout (zoom, panel collapse), then sync parameters from engine to UI.
    applyUIState(uiState) {
        if (!uiState) return;
        statefulModules.forEach(key => {
            const mod = this.modules[key];
            if (mod && typeof mod.applyUIState === 'function' && uiState[key] !== undefined) {
                mod.applyUIState(uiState[key]);
            }
        });
        // Always sync EnhancedControls after state is loaded from patch
        if (this.modules.enhancedControls && typeof this.modules.enhancedControls.syncControlsWithEngine === 'function') {
            this.modules.enhancedControls.syncControlsWithEngine();
        }
        this.eventBus.dispatchEvent(new CustomEvent('request-loop-state'));
    }

    /**
     * Event wiring (relay table to DRY repeated patterns)
     */
    wireUpEvents() {
        const bus = this.eventBus;

        // Relay logic: { listen: eventName, forward: eventName }
        [
            { listen: 'recording-state-changed', forward: 'transport-state-update' },
            { listen: 'sequence-changed', forward: 'pianoroll-redraw' },
            { listen: 'note-visual-change', forward: 'keyboard-note-visual' },
            { listen: 'octave-change', forward: 'keyboard-redraw' }
        ].forEach(({ listen, forward }) => {
            bus.addEventListener(listen, e => bus.dispatchEvent(
                new CustomEvent(forward, { detail: e.detail })
            ));
        });

        // Status update handler
        bus.addEventListener('status-update', e => {
            this.updateStatus(e.detail.message, e.detail.type);
        });
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
        console.log(`[BopSynthUI] Status: ${message}`);
    }

    destroy() {
        Object.values(this.modules).forEach(mod => {
            if (mod && typeof mod.destroy === 'function') mod.destroy();
        });
        console.log('[BopSynthUI] UI layer destroyed.');
    }
}
