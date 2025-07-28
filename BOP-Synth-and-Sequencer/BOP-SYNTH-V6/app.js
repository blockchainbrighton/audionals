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
function setupGlobalEventHandlers() {
    // Tab switching functionality
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'midi') {
                try { PianoRoll.draw(); } 
                catch (e) { console.error('[BOP App Host] Error in PianoRoll.draw:', e); }
            }
        };
    });

    // Redraw keyboard on window resize
    window.onresize = () => {
        try { Keyboard.draw(); } 
        catch (e) { console.error('[BOP App Host] Error in Keyboard.draw (resize):', e); }
    };

    // Resume AudioContext on first user interaction.
    // This is required by modern browsers.
    const resumeAudio = () => {
        if (Tone?.context.state !== 'running') {
            Tone.context.resume().then(() => {
                console.log('[BOP App Host] AudioContext resumed by user interaction.');
            });
        }
        window.removeEventListener('click', resumeAudio);
        window.removeEventListener('touchstart', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);

    // Keyboard shortcuts for effects
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const keyMap = { '1': 'reverb', '2': 'delay', '3': 'chorus', '4': 'distortion', '5': 'filter' };
            if (keyMap[e.key]) {
                e.preventDefault();
                toggleEffectByKey(keyMap[e.key]);
            }
        }
    });

    // Visual feedback for LFOs.
    // NOTE: This could be further refactored into the control modules themselves.
    setInterval(updateLFOVisuals, 100);
}

/**
 * Toggles an effect's enabled state by simulating a click on its checkbox.
 * The actual logic is handled by the event listener in `EnhancedControls`.
 * @param {string} effectName - The base name of the effect (e.g., "reverb").
 */
function toggleEffectByKey(effectName) {
    const toggle = document.getElementById(effectName + 'Enable');
    if (toggle) {
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change')); // Trigger the listener in the control module
        console.log(`[BOP App Host] Toggled ${effectName} via keyboard shortcut.`);
    }
}

/**
 * Provides simple visual feedback for active LFOs by toggling a class on their label.
 */
function updateLFOVisuals() {
    const lfoEffects = ['filter', 'tremolo', 'vibrato', 'phaser'];
    lfoEffects.forEach(effectName => {
        const checkboxId = `${effectName}Enable`;
        const toggle = document.getElementById(checkboxId);
        const label = document.querySelector(`label[for="${checkboxId}"]`);
        if (toggle && label) {
            // Assumes the "lfo-active" class creates a pulsing or glowing effect.
            // The logic for filter is slightly different as its LFO is the AutoFilter itself.
            let isActive = toggle.checked;
            if (effectName === 'filter' && window.synthApp.synth) {
                isActive = toggle.checked && window.synthApp.synth.nodes.filter.state === 'started';
            }
            label.classList.toggle('lfo-active', isActive);
        }
    });
}

// --- Global Error Handling & Performance ---
window.addEventListener('error', (e) => {
    console.error('[BOP App Host] Global unhandled error:', e.error);
});

if (window.performance?.mark) {
    window.performance.mark('bop-app-start');
    window.addEventListener('load', () => {
        window.performance.mark('bop-app-loaded');
        window.performance.measure('bop-app-load-time', 'bop-app-start', 'bop-app-loaded');
        const measure = window.performance.getEntriesByName('bop-app-load-time')[0];
        if (measure) {
            console.log(`[BOP App Host] Page load time: ${measure.duration.toFixed(2)}ms`);
        }
    });
}