/**
 * @file BopSynthLogic.js
 * @description The "headless" core logic controller for the BOP Synthesizer.
 * Manages state, the audio engine, recording, and presets. It is UI-agnostic.
 */

import { SynthEngine } from './SynthEngine.js';
import { SaveLoad } from './SaveLoad.js'; 
import { EnhancedRecorder } from './EnhancedRecorder.js';
import LoopManager from './LoopManager.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = document.createElement('div');
        this.uiController = null; // To hold a reference to the UI

        this.state = {
            seq: [],
            curOct: 4,
            activeNotes: new Set(),
            activeNoteIds: new Map(),
            isRec: false,
            isArmed: false,
            isPlaying: false,
            recStart: 0,
            selNote: null,
            synth: null,
            recorder: null
        };

        this.modules = {};
        this.init();
    }

    init() {
        this.modules.synthEngine = new SynthEngine(this.Tone);
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus); 
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;

        this.wireUpEvents();
        console.log('[BopSynthLogic] Headless logic core initialized.');
    }

    /**
     * Connects the logic core to its UI controller.
     * @param {BopSynthUI} uiController - The instance of the UI controller.
     */
    connectUI(uiController) {
        this.uiController = uiController;
        console.log('[BopSynthLogic] UI controller connected.');
    }

    /**
     * Disconnects the UI controller, breaking the reference.
     */
    disconnectUI() {
        this.uiController = null;
        console.log('[BopSynthLogic] UI controller disconnected.');
    }

    /**
     * Gathers the full state, including logic and UI, for saving.
     * @returns {object} The complete state object.
     */
    getFullState() {
        const logicState = this.modules.saveLoad.getFullState(); 
        const uiState = this.uiController ? this.uiController.getUIState() : {};

        const fullState = {
            ...logicState,
            version: '2.2',
            uiState: uiState
        };

        console.log('[BopSynthLogic] getFullState (v2.2) created:', JSON.parse(JSON.stringify(fullState)));
        return fullState;
    }

    /**
     * Loads a complete state object, applying logic and UI states.
     * @param {object} state - The state object to load.
     */
    loadFullState(state) {
        if (!state) return;
        console.log('[BopSynthLogic] loadFullState called with:', state);

        // Load the core logic state (synth params, sequence, etc.)
        this.modules.saveLoad.loadState(state);

        // If a UI is connected, tell it to apply its portion of the state.
        if (state.uiState && this.uiController) {
            this.uiController.applyUIState(state.uiState);
        }
    }
    
    wireUpEvents() {
        const bus = this.eventBus;
        const recorder = this.modules.recorder;

        bus.addEventListener('keyboard-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('keyboard-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('midi-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('midi-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('note-preview', e => {
            const { note, duration, velocity } = e.detail;
            this.modules.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
        });

        bus.addEventListener('transport-play', e => {
            recorder.startPlayback(e.detail?.startTime);
        });
        
        bus.addEventListener('transport-stop', () => recorder.stopAll());
        bus.addEventListener('transport-record', () => recorder.toggleRecording());
        bus.addEventListener('transport-clear', () => recorder.clearSequence());
        bus.addEventListener('emergency-stop', () => {
            recorder.stopAll();
            this.modules.synthEngine.releaseAll();
        });

        bus.addEventListener('recording-state-changed', e => {
            const { isRecording, isArmed, isPlaying } = e.detail;
            this.state.isRec = isRecording;
            this.state.isArmed = isArmed;
            this.state.isPlaying = isPlaying;
        });
        bus.addEventListener('octave-change', e => {
            this.state.curOct = e.detail.octave;
        });

        bus.addEventListener('save-project', () => this.modules.saveLoad.saveStateToFile());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadStateFromFile(e.detail.data));

        bus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; });
        bus.addEventListener('note-edited', e => {
            if (recorder.editNote) { recorder.editNote(e.detail.noteIndex, e.detail.changes); }
        });

        bus.addEventListener('effect-toggle', e => {
            this.modules.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled);
        });
        bus.addEventListener('parameter-change', e => {
            this.modules.synthEngine.setParameter(e.detail.parameter, e.detail.value);
        });

        bus.addEventListener('loop-toggle', () => this.modules.loopManager.toggleLoop());
        bus.addEventListener('loop-clear', () => this.modules.loopManager.clearLoop());
    }

    destroy() {
        if (this.modules.synthEngine) {
            this.modules.synthEngine.destroy();
        }
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        console.log('[BopSynthLogic] Logic core destroyed.');
    }
}