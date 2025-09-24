// synth-logic.js  (drop-in)
import { SynthEngine } from './synth-engine.js';
import { SaveLoad } from './synth-save-load.js';
import { EnhancedRecorder } from './synth-enhanced-recorder.js';
import LoopManager from './synth-loop-manager.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = document.createElement('div');
        this.uiController = null;
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

    connectUI(uiController) { this.uiController = uiController; }
    disconnectUI() { this.uiController = null; }

    getFullState() {
        const logicState = this.modules.saveLoad.getFullState();
        const uiState = this.uiController ? this.uiController.getUIState() : {};
        return { ...logicState, version: '3.3-synced', uiState };
    }

    loadFullState(state) {
        if (!state) return;
        this.modules.saveLoad.loadState(state);
        if (state.uiState && this.uiController) this.uiController.applyUIState(state.uiState);
    }

    wireUpEvents() {
        const bus = this.eventBus, rec = this.modules.recorder;
        bus.addEventListener('keyboard-note-on', e => rec.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('keyboard-note-off', e => rec.releaseNote(e.detail.note));
        bus.addEventListener('midi-note-on', e => rec.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('midi-note-off', e => rec.releaseNote(e.detail.note));
        bus.addEventListener('note-preview', e => {
            const { note, duration, velocity } = e.detail;
            this.modules.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
        });
        bus.addEventListener('transport-play', e => rec.startPlayback(e.detail?.startTime));
        bus.addEventListener('transport-stop', () => rec.stopAll());
        bus.addEventListener('transport-record', () => rec.toggleRecording());
        bus.addEventListener('transport-clear', () => rec.clearSequence());
        bus.addEventListener('emergency-stop', () => { rec.stopAll(); this.modules.synthEngine.releaseAll(); });
        bus.addEventListener('recording-state-changed', e => Object.assign(this.state, e.detail));
        bus.addEventListener('octave-change', e => { this.state.curOct = e.detail.octave; });
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveStateToFile());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadState(e.detail.data));
        bus.addEventListener('note-selected', e => { this.state.selNote = e.detail.noteIndex; });
        bus.addEventListener('note-edited', e => rec.editNote?.(e.detail.noteIndex, e.detail.changes));
        bus.addEventListener('effect-toggle', e =>
            this.modules.synthEngine.toggleEffect(e.detail.effectName, e.detail.enabled));
        bus.addEventListener('parameter-change', e =>
            this.modules.synthEngine.setParameter(e.detail.parameter, e.detail.value));
    }

    destroy() {
        Object.values(this.modules).forEach(m => m.destroy?.());
    }
}