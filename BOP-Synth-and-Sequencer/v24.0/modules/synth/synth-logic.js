/**
 * @file BopSynthLogic.js
 * @description The "headless" core logic controller for the BOP Synthesizer.
 * Manages state, the audio engine, recording, and presets. It is UI-agnostic.
 */

import { SynthEngine } from './synth-engine.js';
import { SaveLoad } from './synth-save-load.js'; 
import { EnhancedRecorder } from './synth-enhanced-recorder.js';
import LoopManager from './synth-loop-manager.js';
import { getPresetById, createRandomPreset } from './synth-presets.js';

export class BopSynthLogic {
    constructor(Tone) {
        this.Tone = Tone; // Receives the main Tone.js object
        this.eventBus = document.createElement('div');
        this.uiController = null;
        this.lastPresetMeta = { id: null, name: 'Custom' };

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
            recorder: null
        };

        this.modules = {};
        this.init();
    }

    init() {
        // [THE FIX] Pass the `this.Tone` object to the SynthEngine constructor.
        this.modules.synthEngine = new SynthEngine(this.Tone); 
        
        this.modules.saveLoad = new SaveLoad(this.state, this.eventBus); 
        this.modules.recorder = new EnhancedRecorder(this.state, this.modules.synthEngine, this.eventBus);
        this.modules.loopManager = new LoopManager(this.state, this.eventBus);

        this.state.synth = this.modules.synthEngine;
        this.state.recorder = this.modules.recorder;

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

        bus.addEventListener('keyboard-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('keyboard-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('midi-note-on', e => recorder.playNote(e.detail.note, e.detail.velocity));
        bus.addEventListener('midi-note-off', e => recorder.releaseNote(e.detail.note));
        bus.addEventListener('note-preview', e => {
            const { note, duration, velocity } = e.detail;
            this.modules.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
        });
        bus.addEventListener('transport-play', e => recorder.startPlayback(e.detail));
        bus.addEventListener('transport-stop', () => recorder.stopAll());
        bus.addEventListener('transport-record', () => recorder.toggleRecording());
        bus.addEventListener('transport-clear', () => recorder.clearSequence());
        bus.addEventListener('emergency-stop', () => {
            recorder.stopAll();
            this.modules.synthEngine.releaseAll();
        });
        bus.addEventListener('recording-state-changed', e => {
            Object.assign(this.state, e.detail);
        });
        bus.addEventListener('octave-change', e => { this.state.curOct = e.detail.octave; });
        bus.addEventListener('save-project', () => this.modules.saveLoad.saveStateToFile());
        bus.addEventListener('load-project', e => this.modules.saveLoad.loadState(e.detail.data));
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

        bus.addEventListener('preset-select', e => {
            const presetId = e.detail?.presetId;
            const preset = presetId ? getPresetById(presetId) : null;
            if (!preset) return;
            this.applyPreset(preset.values, { id: preset.id, name: preset.name });
        });

        bus.addEventListener('preset-randomize', () => {
            const randomPreset = createRandomPreset();
            this.applyPreset(randomPreset.values, { id: null, name: randomPreset.name });
        });
    }

    destroy() {
        if (this.modules.synthEngine) this.modules.synthEngine.destroy();
        Object.values(this.modules).forEach(module => {
            if (module?.destroy) module.destroy();
        });
    }

    applyPreset(presetValues, meta = {}) {
        if (!presetValues || !this.modules?.synthEngine) return;

        const patch = { ...presetValues };
        for (const [path, value] of Object.entries(patch)) {
            this.modules.synthEngine.setParameter(path, value);
        }

        const name = meta.name || 'Custom';
        const id = meta.id ?? null;
        this.lastPresetMeta = { id, name };

        this.eventBus.dispatchEvent(new CustomEvent('preset-loaded', {
            detail: {
                preset: patch,
                id,
                name,
                applyToEngine: false
            }
        }));
    }
}
