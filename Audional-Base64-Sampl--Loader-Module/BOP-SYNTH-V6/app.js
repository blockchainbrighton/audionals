// app.js

// --- Module Imports ---
import SaveLoad from './save-load.js';
import PianoRoll from './piano-roll.js';
import EnhancedRecorder from './enhanced-recorder.js';
import EnhancedControls from './enhanced-controls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';
import Keyboard from './keyboard.js';
import Transport from './transport.js';

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[Audionauts Enhanced] Starting enhanced app...');

// --- Global State ---
// This central state object is used by many modules.
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
    synth: null,
    enhancedEffects: null,
};
let Tone;

// --- Tone.js Loading ---
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log('[Audionauts Enhanced] Tone.js loaded:', Tone?.version ?? Tone);
        boot();
    })
    .catch(err => {
        console.error('[Audionauts Enhanced] Failed to load Tone.js:', err);
    });

// --- Application Bootstrapping ---
function boot() {
    console.log('[Audionauts Enhanced] Booting enhanced app after Tone.js load...');

    // Assign modules to the window object for legacy access (e.g., save-load, debugging)
    // and global event handlers. This is a deliberate choice to maintain compatibility.
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
    console.log('[Audionauts Enhanced] DOMContentLoaded, initializing all modules...');
    try {
        // Initialize UI and logic modules in a specific order
        EnhancedControls.init();
        Keyboard.init();
        Transport.init();
        EnhancedRecorder.init();
        MidiControl.init();
        PianoRoll.init();
        SaveLoad.init();
        LoopUI.init();

        console.log('[Audionauts Enhanced] All modules initialized successfully!');
    } catch (e) {
        console.error('[Audionauts Enhanced] Error during module initialization:', e);
    }

    // Attach all window-level and document-level event listeners
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
                catch (e) { console.error('[Audionauts Enhanced] Error in PianoRoll.draw:', e); }
            }
        };
    });

    // Redraw keyboard on window resize
    window.onresize = () => {
        try { Keyboard.draw(); } 
        catch (e) { console.error('[Audionauts Enhanced] Error in Keyboard.draw (resize):', e); }
    };

    // Resume AudioContext on first user interaction
    const resumeAudio = () => {
        if (Tone?.context.state !== 'running') {
            Tone.context.resume();
            console.log('[Audionauts Enhanced] AudioContext resumed.');
        }
        // Remove listener after first successful resume
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

    // Visual feedback for LFOs
    setInterval(updateEffectsVisualFeedback, 100);
}

function toggleEffectByKey(effectName) {
    const toggle = document.getElementById(effectName + 'Enable');
    if (toggle) {
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change'));
        console.log(`[Audionauts Enhanced] Toggled ${effectName} via keyboard shortcut`);
    }
}

function updateEffectsVisualFeedback() {
    const lfoEffects = ['filterLFO', 'tremolo', 'vibrato', 'phaser'];
    lfoEffects.forEach(effectName => {
        const checkboxId = `${effectName}Enable`;
        const toggle = document.getElementById(checkboxId);
        // The original code had a bug looking for a label for "filterLFOEnable"
        // Correctly, it should be the label for the parent effect, e.g., "filterEnable"
        const label = document.querySelector(`label[for="${checkboxId}"]`);
        if (toggle && label) {
            label.classList.toggle('lfo-active', toggle.checked);
        }
    });
}

// --- Global Error Handling & Performance ---
window.addEventListener('error', (e) => {
    console.error('[Audionauts Enhanced] Global unhandled error:', e.error);
});

if (window.performance?.mark) {
    window.performance.mark('audionauts-enhanced-start');
    window.addEventListener('load', () => {
        window.performance.mark('audionauts-enhanced-loaded');
        window.performance.measure('audionauts-enhanced-load-time', 'audionauts-enhanced-start', 'audionauts-enhanced-loaded');
        const measure = window.performance.getEntriesByName('audionauts-enhanced-load-time')[0];
        if (measure) {
            console.log(`[Audionauts Enhanced] Load time: ${measure.duration.toFixed(2)}ms`);
        }
    });
}