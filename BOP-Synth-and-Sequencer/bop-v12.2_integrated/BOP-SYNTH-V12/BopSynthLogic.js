// In BOP-SYNTH-V12/BopSynthLogic.js


/**
 * @file BopSynthLogic.js
 * @description The "headless" core logic controller for the BOP Synthesizer.
 * Manages state, the audio engine, recording, and presets. It is UI-agnostic.
 * v2: Includes direct API methods for host integration.
 */

import { SynthEngine } from './SynthEngine.js';
// We now need to import SaveLoad to access its methods directly
import { SaveLoad } from './SaveLoad.js'; 
import { EnhancedRecorder } from './EnhancedRecorder.js';
import LoopManager from './LoopManager.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = document.createElement('div');

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
            synth: null, // This will hold the SynthEngine instance
            recorder: null // This will hold the EnhancedRecorder instance
        };

        this.modules = {};
        this.init();
    }

    init() {
        this.modules.synthEngine = new SynthEngine(this.Tone);
        // Fix: Pass correct parameters to SaveLoad constructor
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus); 
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;

        this.wireUpEvents();
        console.log('[BopSynthLogic] Headless logic core initialized.');
    }
    
    // =====================================================================
    // --- HOST (SEQUENCER) FACING API ---
    // These methods provide direct, synchronous access for host applications.
    // =====================================================================

    /**
     * Retrieves the complete, serializable state of the synthesizer.
     * Use this in your sequencer's "Save Project" function.
     * @returns {object} A JSON-compatible object representing all synth settings.
     */
    getFullState() {
        // Delegate state retrieval to the specialized SaveLoad module.
        return this.modules.saveLoad.getFullState();
    }

    /**
     * Loads a state object into the synthesizer, updating all settings.
     * Use this in your sequencer's "Load Project" function.
     * @param {object} stateObject A valid state object, typically from getFullState().
     */
    loadFullState(stateObject) {
        // Delegate state loading to the SaveLoad module.
        this.modules.saveLoad.loadState(stateObject);
    }


    // =====================================================================
    // --- STANDALONE UI EVENT WIRING ---
    // This section remains unchanged to preserve standalone functionality.
    // =====================================================================
    
    wireUpEvents() {
        const bus = this.eventBus;
        const recorder = this.modules.recorder;

        // Note Input Events
        bus.addEventListener('keyboard-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('keyboard-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('midi-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('midi-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('note-preview', e => {
            const { note, duration, velocity } = e.detail;
            this.modules.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
        });

        // Transport Events
        bus.addEventListener('transport-play', (e) => recorder.startPlayback(e.detail?.startTime));
        bus.addEventListener('transport-stop', () => recorder.stopAll());
        bus.addEventListener('transport-record', () => recorder.toggleRecording());
        bus.addEventListener('transport-clear', () => recorder.clearSequence());
        bus.addEventListener('emergency-stop', () => {
            recorder.stopAll();
            this.modules.synthEngine.releaseAll();
        });
        
        // State Management Events
        bus.addEventListener('recording-state-changed', e => {
            const { isRecording, isArmed, isPlaying } = e.detail;
            this.state.isRec = isRecording;
            this.state.isArmed = isArmed;
            this.state.isPlaying = isPlaying;
        });
        bus.addEventListener('octave-change', e => {
            this.state.curOct = e.detail.octave;
        });

        // --- UPDATED SAVE/LOAD FOR STANDALONE ---
        // These events are for the standalone UI's buttons.
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveStateToFile());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadStateFromFile(e.detail.data));
        
        // Piano Roll Editing Events
        bus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; });
        bus.addEventListener('note-edited', e => {
             if (recorder.editNote) { recorder.editNote(e.detail.noteIndex, e.detail.changes); }
        });

        // Synth Parameter Events
        bus.addEventListener('effect-toggle', e => this.modules.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled));
        bus.addEventListener('parameter-change', e => this.modules.synthEngine.setParameter(e.detail.parameter, e.detail.value));

        // Loop Events
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