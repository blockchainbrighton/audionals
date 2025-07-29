/**
 * @file BopSynthLogic.js
 * @description The "headless" core logic controller for the BOP Synthesizer.
 * Manages state, the audio engine, recording, and presets. It is UI-agnostic.
 */

import { SynthEngine } from './SynthEngine.js';
import { SaveLoad } from './SaveLoad.js'; // Ensure correct import name if default export is used
import { EnhancedRecorder } from './EnhancedRecorder.js';
import LoopManager from './LoopManager.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = document.createElement('div');

        // --- FIX: The state object MUST be created INSIDE the constructor. ---
        // This guarantees that every `new BopSynthLogic()` gets its own unique state.
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
        // --- Initialize Core Logic Modules ---
        // Each of these gets a reference to THIS instance's unique state object.
        this.modules.synthEngine = new SynthEngine(this.Tone);
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus);
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;

        this.wireUpEvents();
        console.log('[BopSynthLogic] Headless logic core initialized.');
    }

    /**
     * Wires up event handlers for core logic and state management.
     */
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
        bus.addEventListener('transport-play', (e) => {
            const startTime = e.detail?.startTime; // Get the time from the event
            recorder.startPlayback(startTime); // Pass it to the recorder
        });
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

        // Save/Load Events
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveState());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadState(e.detail.data));
        // The 'load-project-trigger' listener was correctly removed in the previous step.

        // Piano Roll Editing Events
        bus.addEventListener('note-selected', e => {
            this.state.selNote = e.detail.noteIndex;
        });
        // Note: 'note-edited' was missing, adding it back for completeness.
        bus.addEventListener('note-edited', e => {
             if (recorder.editNote) {
                recorder.editNote(e.detail.noteIndex, e.detail.changes);
             }
        });

        // Synth Parameter Events
        bus.addEventListener('effect-toggle', e => {
            if (this.modules.synthEngine.toggleEffect) {
                this.modules.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled);
            }
        });
        bus.addEventListener('parameter-change', e => {
            this.modules.synthEngine.setParameter(e.detail.parameter, e.detail.value);
        });

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