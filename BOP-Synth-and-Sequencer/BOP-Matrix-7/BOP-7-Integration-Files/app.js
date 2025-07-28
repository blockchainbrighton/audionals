/**
 * @file app.js
 * @description The main application host/controller for the BOP Synth.
 * This file is responsible for loading Tone.js, instantiating the SynthEngine,
 * initializing all UI/logic modules, and setting up global event handlers.
 * It does NOT contain any direct audio synthesis logic itself.
 */

// --- Module Imports ---
import { SynthEngine } from './synth-engine.js';
import SaveLoad from './save-load.js';
import PianoRoll from './piano-roll.js';
import EnhancedRecorder from './enhanced-recorder.js';
import EnhancedControls from './enhanced-controls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';
import Keyboard from './keyboard.js';
import Transport from './transport.js';

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[BOP App Host] Starting application...');

// --- Global State ---
// This central state object is used by all modules. The `synth` property
// will hold the instance of our decoupled SynthEngine.
window.synthApp = {
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
    synth: null, // <-- The single source of truth for audio.
};
let Tone; // Will be assigned after dynamic import.

// --- Tone.js Loading ---
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log(`[BOP App Host] Tone.js loaded: ${Tone?.version ?? 'Unknown'}`);
        boot();
    })
    .catch(err => {
        console.error('[BOP App Host] Critical error: Failed to load Tone.js. App cannot start.', err);
    });

// --- Application Bootstrapping ---
function boot() {
    console.log('[BOP App Host] Booting application after Tone.js load...');

    // Assign modules to the window object for legacy access or debugging.
    window.Keyboard = Keyboard;
    window.PianoRoll = PianoRoll;
    window.EnhancedRecorder = EnhancedRecorder;
    window.EnhancedControls = EnhancedControls;
    
    // Defer main initialization until the DOM is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appInit);
    } else {
        appInit();
    }
}

// --- Main Initialization Function ---
function appInit() {
    console.log('[BOP App Host] DOMContentLoaded, initializing all modules...');
    try {
        // 1. Instantiate the audio engine first. This is the most critical step.
        // All other modules depend on `window.synthApp.synth` being available.
        const synthEngine = new SynthEngine(Tone);
        window.synthApp.synth = synthEngine;
        console.log('[BOP App Host] SynthEngine instantiated and is ready.');

        // 2. Initialize all UI and logic modules in order.
        EnhancedControls.init();
        Keyboard.init();
        Transport.init();
        EnhancedRecorder.init();
        MidiControl.init();
        PianoRoll.init();
        SaveLoad.init();
        LoopUI.init();

        console.log('[BOP App Host] All modules initialized successfully!');
    } catch (e) {
        console.error('[BOP App Host] A fatal error occurred during module initialization:', e);
    }

    // 3. Attach all window-level and document-level event listeners.
    setupGlobalEventHandlers();
}

// --- Event Handler Setup ---