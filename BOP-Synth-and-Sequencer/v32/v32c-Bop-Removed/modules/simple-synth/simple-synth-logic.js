import { SimpleSynthEngine } from './simple-synth-engine.js';
import { EnhancedRecorder } from '../synth/synth-enhanced-recorder.js';

const DEFAULT_SEQ_META = Object.freeze({ recordBpm: 120 });

export class SimpleSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = createEventBus();
        this.uiController = null;
        this.state = {
            seq: [],
            seqMeta: { ...DEFAULT_SEQ_META },
            loopSettings: null,
            curOct: 4,
            activeNotes: new Set(),
            activeNoteIds: new Map(),
            isRec: false,
            isArmed: false,
            isPlaying: false
        };
        this.modules = {};
        this.init();
    }

    init() {
        this.modules.synthEngine = new SimpleSynthEngine(this.Tone);
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;
        this.wireUpEvents();
    }

    wireUpEvents() {
        const bus = this.eventBus;
        const engine = this.modules.synthEngine;
        const recorder = this.modules.recorder;
        if (!bus || !engine || !recorder) return;

        const playHandler = e => {
            const { note, velocity } = e?.detail || {};
            if (note) recorder.playNote(note, velocity ?? 1);
        };
        const releaseHandler = e => {
            const { note } = e?.detail || {};
            if (note) recorder.releaseNote(note);
        };

        bus.addEventListener('keyboard-note-on', playHandler);
        bus.addEventListener('keyboard-note-off', releaseHandler);
        bus.addEventListener('midi-note-on', playHandler);
        bus.addEventListener('midi-note-off', releaseHandler);

        bus.addEventListener('note-preview', e => {
            const detail = e?.detail || {};
            if (!detail.note) return;
            engine.triggerAttackRelease(
                detail.note,
                detail.duration ?? '8n',
                detail.startTime,
                detail.velocity ?? 0.9
            );
        });

        bus.addEventListener('parameter-change', e => {
            const { parameter, value } = e?.detail || {};
            if (parameter) engine.setParameter(parameter, value);
        });

        bus.addEventListener('transport-play', e => recorder.startPlayback(e?.detail));
        bus.addEventListener('transport-stop', () => recorder.stopAll());
        bus.addEventListener('transport-record', () => recorder.toggleRecording());
        bus.addEventListener('transport-clear', () => recorder.clearSequence());

        const emergencyStop = () => {
            recorder.stopAll();
            engine.releaseAll();
        };
        bus.addEventListener('emergency-stop', emergencyStop);

        bus.addEventListener('octave-change', e => {
            const nextOct = e?.detail?.octave;
            if (typeof nextOct === 'number') {
                this.state.curOct = Math.max(0, Math.min(7, Math.round(nextOct)));
            }
        });
        bus.addEventListener('recording-state-changed', e => {
            Object.assign(this.state, e?.detail || {});
        });
        bus.addEventListener('note-selected', e => {
            if (typeof e?.detail?.noteIndex === 'number') {
                this.state.selNote = e.detail.noteIndex;
            }
        });
        bus.addEventListener('note-edited', e => {
            const { noteIndex, changes } = e?.detail || {};
            if (typeof noteIndex === 'number') {
                recorder.editNote(noteIndex, changes);
            }
        });
    }

    connectUI(uiController) {
        this.uiController = uiController;
    }

    disconnectUI() {
        this.uiController = null;
    }

    warmupAudioEngine() {
        this.modules?.synthEngine?.warmup?.();
    }

    getFullState() {
        const rawSequence = this.modules.recorder?.getSequence?.() || { events: [], meta: { ...DEFAULT_SEQ_META } };
        const sequence = {
            events: Array.isArray(rawSequence.events)
                ? rawSequence.events.map(note => ({ ...note }))
                : [],
            meta: { ...rawSequence.meta }
        };
        return {
            version: 'simple-synth-v2',
            engine: this.modules.synthEngine.getState(),
            sequence,
            loopSettings: this.state.loopSettings || null,
            uiState: this.uiController?.getUIState?.() ?? null
        };
    }

    loadFullState(snapshot) {
        if (!snapshot) return;
        if (snapshot.engine) {
            this.modules.synthEngine.loadState(snapshot.engine);
        }
        if (snapshot.sequence) {
            this.modules.recorder?.setSequence(snapshot.sequence);
        }
        if (snapshot.loopSettings) {
            this.state.loopSettings = { ...snapshot.loopSettings };
        }
        if (snapshot.uiState && this.uiController?.applyUIState) {
            this.uiController.applyUIState(snapshot.uiState);
        }
    }

    destroy() {
        this.modules?.recorder?.destroy?.();
        this.modules?.synthEngine?.destroy?.();
    }
}

function createEventBus() {
    if (typeof document !== 'undefined' && document?.createElement) {
        return document.createElement('div');
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.EventTarget === 'function') {
        return new globalThis.EventTarget();
    }
    // Very small fallback shim
    return {
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {}
    };
}
