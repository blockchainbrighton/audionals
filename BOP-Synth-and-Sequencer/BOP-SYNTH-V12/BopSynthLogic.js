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
        
        // --- REFACTOR 1: Use a proper EventTarget instead of a DOM element ---
        // This is a modern, non-UI-related way to create an event bus.
        this.eventBus = new EventTarget();

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
            synth: null,    // Will hold the SynthEngine instance
            recorder: null  // Will hold the EnhancedRecorder instance
        };

        this.modules = {};
        this.init();
    }

    init() {
        // --- REFACTOR 2: CORRECT DEPENDENCY INJECTION (THE CORE FIX) ---

        // 1. Instantiate modules that don't depend on other custom modules first.
        this.modules.synthEngine = new SynthEngine(this.Tone);
        
        // 2. Instantiate modules that depend on the state, bus, or other modules.
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);

        // 3. THIS IS THE FIX: Pass the `state` object and `eventBus` to SaveLoad.
        // The original `new SaveLoad(this)` was incorrect. SaveLoad's constructor
        // expects `(state, eventBus)`, not the entire logic controller.
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus);
        
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        // 4. This part is correct: Populate the shared state object with references.
        // Now, when SaveLoad checks `this.state.synth`, it will find the real SynthEngine.
        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;

        this.wireUpEvents();
        console.log('[BopSynthLogic] Headless logic core initialized correctly.');
    }
    
    // --- REFACTOR 3: REMOVE REDUNDANT HOST API ---
    // The host application (instrument.js) is already designed to access modules
    // directly (e.g., `logic.modules.saveLoad.getFullState()`). These wrapper
    // methods were confusing, redundant, and contained a bug (`getStateObject` did not exist).
    // Removing them makes the public API of this class cleaner. The host interacts
    // via the `modules` object, which is a clear and direct pattern.
    /*
        getFullState() { ... }
        loadFullState(stateObject) { ... }
    */

    /**
     * Wires up internal event listeners for standalone functionality.
     * The host application can also dispatch these events on the eventBus.
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

        // Save/Load events for STANDALONE UI buttons (e.g., if you run the synth by itself).
        // The host application (sequencer) will use `logic.modules.saveLoad.getFullState()` directly.
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveState());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadState(e.detail.data));
        
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

    /**
     * Cleans up resources, especially audio nodes and event listeners.
     */
    destroy() {
        if (this.modules.synthEngine) {
            this.modules.synthEngine.destroy();
        }
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        // You would typically remove listeners here if they were attached to a global object,
        // but since they are on a local eventBus that will be garbage collected, it's okay.
        console.log('[BopSynthLogic] Logic core destroyed.');
    }
}