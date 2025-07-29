/**
 * @file BopSynth.js
 * @description Main controller class for the BOP Synthesizer application.
 * Manages state, dependencies, and communication between all modules via event bus.
 * Eliminates the need for global window.synthApp state.
 */

import { SynthEngine } from './SynthEngine.js';
import SaveLoad from './SaveLoad.js';
import PianoRoll from './PianoRoll.js';
import EnhancedRecorder from './EnhancedRecorder.js';
import EnhancedControls from './EnhancedControls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';
import LoopManager from './LoopManager.js';
import Keyboard from './Keyboard.js';
import Transport from './Transport.js';

export class BopSynth {
    constructor(Tone, uiElements = {}) {
        this.Tone = Tone;
        this.uiElements = uiElements;
        
        // Create event bus for module communication
        this.eventBus = document.createElement('div');
        
        // Initialize application state (formerly window.synthApp)
        this.state = {
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
        
        // Module instances
        this.modules = {};
        
        this.init();
    }
    
    /**
     * Initialize all modules and wire up event handlers
     */
    init() {
        try {
            // Initialize core synth engine
            this.synthEngine = new SynthEngine(this.Tone, this.state, this.eventBus);
            this.state.synth = this.synthEngine;
            
            // Initialize logic modules with dependency injection
            this.recorder = new EnhancedRecorder(this.state, this.synthEngine, this.eventBus);
            this.state.recorder = this.recorder;
            
            this.saveLoad = new SaveLoad(this.state, this.eventBus);
            this.loopManager = new LoopManager(this.state, this.eventBus);
            
            // Initialize UI modules with event bus and DOM elements
            this.keyboard = new Keyboard(
                this.uiElements.keyboard || '#keyboard',
                this.eventBus,
                this.state
            );
            
            this.transport = new Transport(
                this.uiElements.transport || '#transport-controls',
                this.eventBus
            );
            
            this.pianoRoll = new PianoRoll(
                this.uiElements.pianoRoll || '#rollGrid',
                this.eventBus,
                this.state
            );
            
            this.enhancedControls = new EnhancedControls(
                this.uiElements.controls || '#control-panel',
                this.eventBus,
                this.synthEngine
            );
            
            // Initialize MIDI and Loop UI
            this.midiControl = new MidiControl(this.eventBus);
            this.loopUI = new LoopUI(this.eventBus);
            
            // Wire up all event handlers
            this.wireUpEvents();
            
            console.log('[BopSynth] All modules initialized successfully!');
        } catch (error) {
            console.error('[BopSynth] Error during initialization:', error);
            throw error;
        }
    }
    
    /**
     * Wire up event handlers for module communication
     * This is the central nervous system of the application
     */
    wireUpEvents() {
        // Keyboard events
        this.eventBus.addEventListener('keyboard-note-on', (e) => {
            const { note, velocity } = e.detail;
            this.recorder.playNote(note, velocity);
        });
        
        this.eventBus.addEventListener('keyboard-note-off', (e) => {
            const { note } = e.detail;
            this.recorder.releaseNote(note);
        });
        
        this.eventBus.addEventListener('octave-change', (e) => {
            const { octave } = e.detail;
            this.state.curOct = octave;
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        });
        
        // Transport events
        this.eventBus.addEventListener('transport-play', (e) => {
            this.recorder.startPlayback();
        });
        
        this.eventBus.addEventListener('transport-stop', (e) => {
            this.recorder.stopAll();
        });
        
        this.eventBus.addEventListener('transport-record', (e) => {
            this.recorder.toggleRecording();
        });
        
        this.eventBus.addEventListener('transport-clear', (e) => {
            this.recorder.clearSequence();
        });
        
        this.eventBus.addEventListener('transport-arm', (e) => {
            this.recorder.toggleArm();
        });
        
        // Recorder events
        this.eventBus.addEventListener('recording-state-changed', (e) => {
            const { isRecording, isArmed, isPlaying } = e.detail;
            this.state.isRec = isRecording;
            this.state.isArmed = isArmed;
            this.state.isPlaying = isPlaying;
            
            // Update transport UI
            this.eventBus.dispatchEvent(new CustomEvent('transport-state-update', {
                detail: { isRecording, isArmed, isPlaying }
            }));
        });
        
        this.eventBus.addEventListener('sequence-changed', (e) => {
            // Update piano roll when sequence changes
            this.eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
        });
        
        this.eventBus.addEventListener('note-visual-change', (e) => {
            const { note, active } = e.detail;
            this.eventBus.dispatchEvent(new CustomEvent('keyboard-note-visual', {
                detail: { note, active }
            }));
        });
        
        // Save/Load events - Fixed method names
        this.eventBus.addEventListener('save-project', (e) => {
            this.saveLoad.saveState();
        });
        
        this.eventBus.addEventListener('load-project', (e) => {
            const { data } = e.detail;
            this.saveLoad.loadState(data);
        });
        
        this.eventBus.addEventListener('load-project-trigger', (e) => {
            this.saveLoad.triggerLoad();
        });
        
        // Piano roll events
        this.eventBus.addEventListener('note-selected', (e) => {
            const { noteIndex } = e.detail;
            this.state.selNote = noteIndex;
        });
        
        this.eventBus.addEventListener('note-edited', (e) => {
            const { noteIndex, changes } = e.detail;
            this.recorder.editNote(noteIndex, changes);
        });
        
        this.eventBus.addEventListener('note-preview', (e) => {
            const { note, duration, velocity } = e.detail;
            if (this.synthEngine) {
                this.synthEngine.triggerAttackRelease(note, duration, undefined, velocity);
            }
        });
        
        // Control events
        this.eventBus.addEventListener('effect-toggle', (e) => {
            const { effectName, enabled } = e.detail;
            this.synthEngine.toggleEffect(effectName, enabled);
        });
        
        this.eventBus.addEventListener('parameter-change', (e) => {
            const { parameter, value } = e.detail;
            this.synthEngine.setParameter(parameter, value);
        });
        
        // Loop events
        this.eventBus.addEventListener('loop-toggle', (e) => {
            this.loopManager.toggleLoop();
        });
        
        this.eventBus.addEventListener('loop-clear', (e) => {
            this.loopManager.clearLoop();
        });
        
        // MIDI events
        this.eventBus.addEventListener('midi-note-on', (e) => {
            const { note, velocity } = e.detail;
            this.recorder.playNote(note, velocity);
        });
        
        this.eventBus.addEventListener('midi-note-off', (e) => {
            const { note } = e.detail;
            this.recorder.releaseNote(note);
        });
        
        // Status update events
        this.eventBus.addEventListener('status-update', (e) => {
            const { message, type } = e.detail;
            this.updateStatus(message, type);
        });
        
        // Emergency stop event
        this.eventBus.addEventListener('emergency-stop', (e) => {
            this.recorder.stopAll();
            this.synthEngine.releaseAll();
        });
        
        console.log('[BopSynth] Event handlers wired up successfully');
    }
    
    /**
     * Update status display
     */
    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
        console.log(`[BopSynth] Status: ${message}`);
    }
    
    /**
     * Get current application state (read-only)
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Cleanup method for proper disposal
     */
    destroy() {
        // Stop all audio
        if (this.synthEngine) {
            this.synthEngine.destroy();
        }
        
        // Clean up modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        // Clear event listeners
        this.eventBus.innerHTML = '';
        
        console.log('[BopSynth] Application destroyed');
    }
}

export default BopSynth;

