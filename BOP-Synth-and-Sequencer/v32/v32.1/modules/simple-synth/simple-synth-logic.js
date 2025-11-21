import { SimpleSynthEngine } from './simple-synth-engine.js';

export class SimpleSynthLogic {
    constructor(Tone) {
        this.Tone = Tone;
        this.eventBus = createEventBus();
        this.uiController = null;
        this.state = {
            curOct: 4
        };
        this.modules = {};
        this.init();
    }

    init() {
        this.modules.synthEngine = new SimpleSynthEngine(this.Tone);
        this.wireUpEvents();
    }

    wireUpEvents() {
        const bus = this.eventBus;
        const engine = this.modules.synthEngine;
        if (!bus || !engine) return;

        bus.addEventListener('keyboard-note-on', e => {
            const detail = e?.detail || {};
            if (detail.note) engine.triggerAttack(detail.note, detail.velocity ?? 1);
        });
        bus.addEventListener('keyboard-note-off', e => {
            const detail = e?.detail || {};
            if (detail.note) engine.triggerRelease(detail.note);
        });
        bus.addEventListener('note-preview', e => {
            const detail = e?.detail || {};
            if (detail.note) {
                engine.triggerAttackRelease(
                    detail.note,
                    detail.duration ?? '8n',
                    detail.startTime,
                    detail.velocity ?? 0.9
                );
            }
        });
        bus.addEventListener('parameter-change', e => {
            const { parameter, value } = e?.detail || {};
            if (parameter) engine.setParameter(parameter, value);
        });
        const stopAll = () => engine.releaseAll();
        bus.addEventListener('transport-stop', stopAll);
        bus.addEventListener('emergency-stop', stopAll);
        bus.addEventListener('octave-change', e => {
            const nextOct = e?.detail?.octave;
            if (typeof nextOct === 'number') {
                this.state.curOct = Math.max(0, Math.min(7, Math.round(nextOct)));
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
        return {
            version: 'simple-synth-v1',
            engine: this.modules.synthEngine.getState(),
            uiState: this.uiController?.getUIState?.() ?? null
        };
    }

    loadFullState(snapshot) {
        if (!snapshot) return;
        if (snapshot.engine) {
            this.modules.synthEngine.loadState(snapshot.engine);
        }
        if (snapshot.uiState && this.uiController?.applyUIState) {
            this.uiController.applyUIState(snapshot.uiState);
        }
    }

    destroy() {
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
