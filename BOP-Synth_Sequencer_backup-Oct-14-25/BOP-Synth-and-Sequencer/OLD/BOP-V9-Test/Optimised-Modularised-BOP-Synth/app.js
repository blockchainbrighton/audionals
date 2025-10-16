/**
 * @file app.js
 * @description BOP Synth main host/controller. Handles Tone.js loading, SynthEngine instantiation,
 * initializes all modules/UI, and sets up global handlers. All Tone/audio code runs *after* user gesture.
 */

// --- Module Imports ---
import { SynthEngine } from './SynthEngine.js';
import SaveLoad from './SaveLoad.js';
import PianoRoll from './PianoRoll.js';
import EnhancedRecorder from './EnhancedRecorder.js';
import EnhancedControls from './EnhancedControls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';
import LoopManager from './LoopManager.js';
import Keyboard from './keyboard.js';
import Transport from './transport.js';

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[BOP App Host] Starting application...');

// --- Global State ---
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
    recorder: EnhancedRecorder, // Make the recorder globally accessible
};

let Tone;

// --- Tone.js Loading & Audio Start Flow ---
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log(`[BOP App Host] Tone.js loaded: ${Tone?.version ?? 'Unknown'}`);
        showAudioPrompt();
    })
    .catch(err => {
        console.error('[BOP App Host] Critical error: Failed to load Tone.js. App cannot start.', err);
    });

// --- Show Overlay and Wait for User Audio Start ---
function showAudioPrompt() {
    const overlay = document.createElement('div');
    overlay.id = 'audio-prompt';
    overlay.style = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        display:flex;align-items:center;justify-content:center;
        z-index:9999;background:rgba(0,0,0,0.87);`;
    overlay.innerHTML = `
        <button style="
            padding:2em 3em;font-size:1.5em;
            background:#1e1e28;color:#fff;
            border:none;border-radius:16px;
            box-shadow:0 8px 24px #0008;
            cursor:pointer;">Click to Start Audio</button>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('button').onclick = async () => {
        try {
            await Tone.start();
            console.log('[BOP App Host] Tone.js started by user interaction.');
        } catch (err) {
            alert('Audio could not start. Please try again.');
            return;
        }
        overlay.remove();
        appInit();
    };
}

// --- Main Initialization Function (runs *after* audio is ready) ---
function appInit() {
    console.log('[BOP App Host] DOMContentLoaded, initializing all modules...');
    try {
        const synthEngine = new SynthEngine(Tone);
        window.synthApp.synth = synthEngine;
        console.log('[BOP App Host] SynthEngine instantiated and is ready.');

        // Initialize all UI and logic modules in order.
        EnhancedControls.init(); 
        Keyboard.init();
        Transport.init(); // This will initialize the recorder via registerButtons
        // EnhancedRecorder.init(); // <-- THIS LINE IS REMOVED. IT IS THE FIX.
        MidiControl.init();
        LoopManager.init();
        LoopUI.init();
        PianoRoll.init();
        SaveLoad.init();

        console.log('[BOP App Host] All modules initialized successfully!');
    } catch (e) {
        console.error('[BOP App Host] A fatal error occurred during module initialization:', e);
    }

    setupGlobalEventHandlers();
}

// --- Event Handler Setup (Unchanged) ---
function setupGlobalEventHandlers() {
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

    window.onresize = () => {
        try { Keyboard.draw(); } 
        catch (e) { console.error('[BOP App Host] Error in Keyboard.draw (resize):', e); }
    };

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const keyMap = { '1': 'reverb', '2': 'delay', '3': 'chorus', '4': 'distortion', '5': 'filter' };
            if (keyMap[e.key]) {
                e.preventDefault();
                toggleEffectByKey(keyMap[e.key]);
            }
        }
    });

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
        toggle.dispatchEvent(new Event('change'));
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
