/**
 * @file BopSynth.js
 * @description Main controller class for the BOP Synthesizer application.
 * Manages state, dependencies, and communication between all modules via event bus.
 */

// Imports unchanged
import { SynthEngine } from './SynthEngine.js';
import SaveLoad from './SaveLoad.js';
import PianoRoll from './PianoRoll.js';
import EnhancedRecorder from './EnhancedRecorder.js';
import EnhancedControls from './EnhancedControls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';
import LoopManager from './LoopManager.js';
import { Keyboard } from './Keyboard.js';
import Transport from './Transport.js';

export class BopSynth {
    Tone;
    uiElements;
    eventBus = document.createElement('div');
    state = {
        seq: [],
        curOct: 4,
        activeNotes: new Set(),
        activeNoteIds: new Map(),
        isRec: false,
        isArmed: false,
        isPlaying: false,
        recStart: 0,
        events: [],
        selNote: null,
        synth: null,
        recorder: null
    };
    modules = {};

    constructor(Tone, uiElements = {}) {
        this.Tone = Tone;
        this.uiElements = uiElements;
        this.init();
    }

    init() {
        try {
            // Core logic
            this.synthEngine = new SynthEngine(this.Tone, this.state, this.eventBus);
            this.state.synth = this.synthEngine;
            this.recorder = new EnhancedRecorder(this.state, this.synthEngine, this.eventBus);
            this.state.recorder = this.recorder;
            this.saveLoad = new SaveLoad(this.state, this.eventBus);
            this.loopManager = new LoopManager(this.state, this.eventBus);

            // UI modules
            this.keyboard = new Keyboard(
                this.uiElements.keyboard ?? '#keyboard',
                this.eventBus, this.state, this.Tone
            );
            this.transport = new Transport(
                this.uiElements.transport ?? '#transport-controls',
                this.eventBus
            );
            this.pianoRoll = new PianoRoll(
                this.uiElements.pianoRoll ?? '#rollGrid',
                this.eventBus, this.state
            );
            this.enhancedControls = new EnhancedControls(
                this.uiElements.controls ?? '#control-panel',
                this.eventBus, this.synthEngine
            );
            this.midiControl = new MidiControl(this.eventBus);
            this.loopUI = new LoopUI(this.eventBus);

            this.#wireUpEvents();
            console.log('[BopSynth] All modules initialized successfully!');
        } catch (error) {
            console.error('[BopSynth] Error during initialization:', error);
            throw error;
        }
    }

    #wireUpEvents() {
        // Synth note handlers (keyboard/midi)
        const noteOn = e => this.recorder.playNote(e.detail.note, e.detail.velocity);
        const noteOff = e => this.recorder.releaseNote(e.detail.note);

        this.eventBus.addEventListener('keyboard-note-on', noteOn);
        this.eventBus.addEventListener('keyboard-note-off', noteOff);
        this.eventBus.addEventListener('midi-note-on', noteOn);
        this.eventBus.addEventListener('midi-note-off', noteOff);

        // Octave & redraw
        this.eventBus.addEventListener('octave-change', e => {
            this.state.curOct = e.detail.octave;
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        });

        // Transport
        this.eventBus.addEventListener('transport-play', () => this.recorder.startPlayback());
        this.eventBus.addEventListener('transport-stop', () => this.recorder.stopAll());
        this.eventBus.addEventListener('transport-record', () => this.recorder.toggleRecording());
        this.eventBus.addEventListener('transport-clear', () => this.recorder.clearSequence());
        this.eventBus.addEventListener('transport-arm', () => this.recorder.toggleArm());

        // Recorder state: propagate updates
        this.eventBus.addEventListener('recording-state-changed', e => {
            const { isRecording, isArmed, isPlaying, hasSequence } = e.detail;
            Object.assign(this.state, { isRec: isRecording, isArmed, isPlaying });
            this.eventBus.dispatchEvent(new CustomEvent('transport-state-update', { detail: { isRecording, isArmed, isPlaying, hasSequence } }));
        });

        // Sequence/piano roll
        this.eventBus.addEventListener('sequence-changed', () =>
            this.eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'))
        );
        this.eventBus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; });
        this.eventBus.addEventListener('note-edited', e => this.recorder.editNote(e.detail.noteIndex, e.detail.changes));
        this.eventBus.addEventListener('note-preview', e => {
            if (this.synthEngine)
                this.synthEngine.triggerAttackRelease(e.detail.note, e.detail.duration, undefined, e.detail.velocity);
        });
        this.eventBus.addEventListener('note-visual-change', e =>
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-visual', { detail: e.detail }))
        );

        // Save/Load
        this.eventBus.addEventListener('save-project', () => this.saveLoad.saveState());
        this.eventBus.addEventListener('load-project', e => this.saveLoad.loadState(e.detail.data));
        this.eventBus.addEventListener('load-project-trigger', () => this.saveLoad.triggerLoad());

        // Controls
        this.eventBus.addEventListener('effect-toggle', e => this.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled));
        this.eventBus.addEventListener('parameter-change', e => this.synthEngine.setParameter(e.detail.parameter, e.detail.value));

        // Loop
        this.eventBus.addEventListener('loop-toggle', () => this.loopManager.toggleLoop());
        this.eventBus.addEventListener('loop-clear', () => this.loopManager.clearLoop());

        // Status
        this.eventBus.addEventListener('status-update', e => this.updateStatus(e.detail.message, e.detail.type));

        // Emergency stop
        this.eventBus.addEventListener('emergency-stop', () => {
            this.recorder.stopAll();
            this.synthEngine.releaseAll();
        });

        console.log('[BopSynth] Event handlers wired up successfully');
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
        console.log(`[BopSynth] Status: ${message}`);
    }

    getState() { return { ...this.state }; }

    destroy() {
        this.synthEngine?.destroy();
        Object.values(this.modules).forEach(m => m?.destroy?.());
        this.eventBus.innerHTML = '';
        console.log('[BopSynth] Application destroyed');
    }
}

export default BopSynth;
