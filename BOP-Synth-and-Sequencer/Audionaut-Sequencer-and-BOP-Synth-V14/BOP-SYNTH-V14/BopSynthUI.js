// BOP-SYNTH-V12/BopSynthUI.js

import { Keyboard } from './Keyboard.js';
import Transport from './Transport.js';
import PianoRoll from './PianoRoll.js';
import EnhancedControls from './EnhancedControls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';

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

    /**
     * Gathers state from all UI modules, using fallbacks with warnings.
     */
    getUIState() {
        const uiState = {};
        Object.entries(this.modules).forEach(([key, mod]) => {
            // EnhancedControls uses a richer structure for UI state (expanded panels + control values)
            if (key === 'enhancedControls' && typeof mod.getUIState === 'function') {
                uiState[key] = mod.getUIState();
            }
            // Any other module with getUIState support
            else if (typeof mod.getUIState === 'function') {
                const state = mod.getUIState();
                if (state !== undefined) uiState[key] = state;
            }
            // Fallback for debugging, in case a module lacks getUIState
            else {
                console.warn(`[BopSynthUI] Module "${key}" missing getUIState() method, fallback used.`);
            }
        });
        return uiState;
    }
    

    /**
     * Applies loaded UI state to all modules, with fallback warnings.
     */
    applyUIState(uiState) {
        if (!uiState) {
            console.warn('[BopSynthUI] applyUIState called with no state.');
            return;
        }
        this.tryApplyUIState(this.modules.keyboard, 'keyboard', uiState.keyboard);
        this.tryApplyUIState(this.modules.transport, 'transport', uiState.transport);
        this.tryApplyUIState(this.modules.pianoRoll, 'pianoRoll', uiState.pianoRoll);
        this.tryApplyUIState(this.modules.enhancedControls, 'enhancedControls', uiState.enhancedControls);
        this.tryApplyUIState(this.modules.loopUI, 'loopUI', uiState.loopUI);

        // Always resync loop/quantize with logic
        this.eventBus.dispatchEvent(new CustomEvent('request-loop-state'));
        console.log('[BopSynthUI] Applied UI state:', uiState);
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
