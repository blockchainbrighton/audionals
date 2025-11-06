/**
 * @file BopSynthLogic.js
 * @description The "headless" core logic controller for the BOP Synthesizer.
 * Manages state, the audio engine, recording, and presets. It is UI-agnostic.
 */

import { SynthEngine } from './synth-engine.js';
import { SaveLoad } from './synth-save-load.js'; 
import { EnhancedRecorder } from './synth-enhanced-recorder.js';
import { ArpeggiatorEngine } from './synth-arpeggiator.js';
import LoopManager from './synth-loop-manager.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone; // Receives the main Tone.js object
        this.eventBus = document.createElement('div');
        this.uiController = null;

        this.state = {
            seq: [],
            seqMeta: { recordBpm: 120 },
            curOct: 4,
            activeNotes: new Set(),
            activeNoteIds: new Map(),
            isRec: false,
            isArmed: false,
            isPlaying: false,
            recStart: 0,
            selNote: null,
            synth: null,
            recorder: null,
            arpeggiator: null,
            mode: 'recorder'
        };

        this.modules = {};
        this.init();
    }

    init() {
        // [THE FIX] Pass the `this.Tone` object to the SynthEngine constructor.
        this.modules.synthEngine = new SynthEngine(this.Tone); 
        
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus); 
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.arpeggiator = new ArpeggiatorEngine(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;
        this.state.arpeggiator = this.modules.arpeggiator;
        this.state.loopManager = this.modules.loopManager;

        this.wireUpEvents();
        console.log('[BopSynthLogic] Headless logic core initialized.');
    }

    connectUI(uiController) {
        this.uiController = uiController;
    }

    disconnectUI() {
        this.uiController = null;
    }

    getFullState() {
        // This assumes your SaveLoad module is also updated to use synthEngine.getAllParameters()
        const logicState = this.modules.saveLoad.getFullState(); 
        const uiState = this.uiController ? this.uiController.getUIState() : {};

        const fullState = {
            ...logicState,
            version: '3.1-schema-fixed',
            uiState: uiState
        };
        return fullState;
    }

    loadFullState(state) {
        if (!state) return;
        this.modules.saveLoad.loadState(state);
        if (state.uiState && this.uiController) {
            this.uiController.applyUIState(state.uiState);
        }
    }
    
    wireUpEvents() {
        const bus = this.eventBus;
        const recorder = this.modules.recorder;
        const arpeggiator = this.modules.arpeggiator;
        const synthEngine = this.modules.synthEngine;

        const handleNoteOn = (note, velocity = 0.9) => {
            if (this.state.mode === 'arpeggiator') {
                arpeggiator.handleNoteOn(note, velocity);
                this.state.activeNotes.add(note);
                synthEngine.noteOn?.(note, velocity);
                this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: true } }));
            } else {
                recorder.playNote(note, velocity);
            }
        };

        const handleNoteOff = (note) => {
            if (this.state.mode === 'arpeggiator') {
                arpeggiator.handleNoteOff(note);
                this.state.activeNotes.delete(note);
                synthEngine.noteOff?.(note);
                this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: false } }));
            } else {
                recorder.releaseNote(note);
            }
        };

        bus.addEventListener('keyboard-note-on', e => handleNoteOn(e.detail.note, e.detail.velocity));
        bus.addEventListener('keyboard-note-off', e => handleNoteOff(e.detail.note));
        bus.addEventListener('midi-note-on', e => handleNoteOn(e.detail.note, e.detail.velocity));
        bus.addEventListener('midi-note-off', e => handleNoteOff(e.detail.note));
        bus.addEventListener('note-preview', e => {
            const { note, duration, velocity } = e.detail;
            this.modules.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
        });
        bus.addEventListener('transport-play', e => {
            if (this.state.mode === 'arpeggiator') arpeggiator.startPlayback(e.detail);
            else recorder.startPlayback(e.detail);
        });
        bus.addEventListener('transport-stop', () => {
            if (this.state.mode === 'arpeggiator') arpeggiator.stopPlayback();
            else recorder.stopAll();
        });
        bus.addEventListener('transport-record', () => {
            if (this.state.mode === 'arpeggiator') arpeggiator.toggleArm();
            else recorder.toggleRecording();
        });
        bus.addEventListener('transport-clear', () => {
            if (this.state.mode === 'arpeggiator') arpeggiator.clear();
            else recorder.clearSequence();
        });
        bus.addEventListener('emergency-stop', () => {
            recorder.stopAll();
            arpeggiator.stopPlayback();
            this.modules.synthEngine.releaseAll();
        });
        bus.addEventListener('recording-state-changed', e => {
            Object.assign(this.state, e.detail);
            if (e.detail?.activeEngine) this.state.activeEngine = e.detail.activeEngine;
        });
        bus.addEventListener('octave-change', e => { this.state.curOct = e.detail.octave; });
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveStateToFile());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadState(e.detail.data));
        bus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; });
        bus.addEventListener('note-edited', e => {
            if (this.state.mode === 'arpeggiator') {
                arpeggiator.editNote?.(e.detail.noteIndex, e.detail.note || e.detail.changes);
            } else if (recorder.editNote) {
                recorder.editNote(e.detail.noteIndex, e.detail.changes || e.detail.note);
            }
        });
        bus.addEventListener('note-delete', e => {
            if (this.state.mode === 'arpeggiator') {
                arpeggiator.deleteNote?.(e.detail.noteIndex);
            }
        });
        bus.addEventListener('effect-toggle', e => {
            this.modules.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled);
        });
        bus.addEventListener('parameter-change', e => {
            this.modules.synthEngine.setParameter(e.detail.parameter, e.detail.value);
        });
        bus.addEventListener('arp-mode-toggle', e => {
            const enabled = !!e.detail?.enabled;
            this.state.mode = enabled ? 'arpeggiator' : 'recorder';
            arpeggiator.setEnabled(enabled);
            const activeEngine = enabled ? 'arpeggiator' : 'recorder';
            bus.dispatchEvent(new CustomEvent('recording-state-changed', {
                detail: {
                    activeEngine,
                    isRecording: false,
                    isArmed: enabled ? arpeggiator.isArmed : recorder.isArmed,
                    isPlaying: enabled ? arpeggiator.isPlaying : recorder.isPlaying,
                    hasSequence: enabled ? !!arpeggiator.sequence.length : !!this.state.seq?.length
                }
            }));
            bus.dispatchEvent(new CustomEvent('status-update', {
                detail: { message: `Mode: ${enabled ? 'Arpeggiator' : 'Recorder'}`, type: 'info' }
            }));
        });
        bus.addEventListener('arp-setting-change', e => {
            if (!e.detail) return;
            arpeggiator.setSettings(e.detail);
        });
        bus.addEventListener('arp-clear', () => {
            if (this.state.mode === 'arpeggiator') arpeggiator.clear();
        });
    }

    destroy() {
        if (this.modules.synthEngine) this.modules.synthEngine.destroy();
        Object.values(this.modules).forEach(module => {
            if (module?.destroy) module.destroy();
        });
    }
}
