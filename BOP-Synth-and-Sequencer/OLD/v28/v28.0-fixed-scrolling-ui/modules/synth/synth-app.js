/**
 * @file app.js
 * @description BOP Synth main host application. Handles Tone.js loading and instantiates the BopSynth controllers.
 * This file acts as the "shell" or "host" for the synthesizer application.
 */

import { BopSynthLogic } from './synth-logic.js';
import { BopSynthUI } from './synth-ui.js';
import { renderSynthLayout } from './synth-layout.js';

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[BOP App Host] Starting application...');

// --- Module-level variables ---
let Tone;
let logicController;
let uiController;

// --- Tone.js Loading & Audio Start Flow (Unchanged) ---
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log(`[BOP App Host] Tone.js loaded: ${Tone?.version ?? 'Unknown'}`);
        showAudioPrompt();
    })
    .catch(err => {
        console.error('[BOP App Host] Critical error: Failed to load Tone.js. App cannot start.', err);
    });

// --- Show Overlay and Wait for User Audio Start (Unchanged) ---
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
            if (Tone?.context) {
                try {
                    if (typeof Tone.context.lookAhead === 'number') {
                        Tone.context.lookAhead = 0;
                    }
                    if (typeof Tone.context.updateInterval === 'number') {
                        Tone.context.updateInterval = Math.max(0.002, Math.min(Tone.context.updateInterval, 0.005));
                    } else {
                        Tone.context.updateInterval = 0.005;
                    }
                    if (typeof Tone.context.latencyHint !== 'undefined') {
                        Tone.context.latencyHint = 'interactive';
                    }
                    Tone.context.resume?.();
                } catch (ctxErr) {
                    console.warn('[BOP App Host] Unable to tighten Tone context latency settings.', ctxErr);
                }

                const rawCtx = Tone.context.rawContext ?? Tone.context._context;
                if (rawCtx) {
                    try {
                        if (typeof rawCtx.latencyHint !== 'undefined') {
                            rawCtx.latencyHint = 'interactive';
                        }
                        rawCtx.resume?.();
                    } catch (rawErr) {
                        console.warn('[BOP App Host] Unable to adjust underlying AudioContext latency hint.', rawErr);
                    }
                }
            }
        } catch (err) {
            alert('Audio could not start. Please try again.');
            return;
        }
        overlay.remove();
        appInit();
    };
}

// --- Main Initialization Function (UPDATED) ---
function appInit() {
    console.log('[BOP App Host] Initializing BOP Synth application...');
    
    try {
        // 1. Create the headless logic core. This holds the state and audio engine.
        logicController = new BopSynthLogic(Tone);

        // 2. Render the shared layout and capture UI element references.
        const hostRoot = document.getElementById('synth-app-root');
        if (!hostRoot) {
            throw new Error('Missing #synth-app-root container. Cannot mount UI.');
        }
        const uiElements = renderSynthLayout(hostRoot);

        // 3. Create the UI layer, passing it the logic core and UI element selectors.
        uiController = new BopSynthUI(logicController, uiElements);
        logicController.connectUI(uiController);
        if (typeof logicController.warmupAudioEngine === 'function') {
            logicController.warmupAudioEngine();
        }

        // Make controllers globally accessible for easier debugging
        window.bopSynthLogic = logicController;
        window.bopSynthUI = uiController;

        // The eventBus is on the logic controller, dispatch events from there.
        logicController.eventBus.dispatchEvent(new CustomEvent('tone-ready', {
            detail: { Tone }
        }));
        
        console.log('[BOP App Host] BopSynth application initialized successfully!');
        
        // Setup global event handlers that are part of the host environment.
        setupGlobalEventHandlers();
        
    } catch (e) {
        console.error('[BOP App Host] A fatal error occurred during application initialization:', e);
    }
}

// --- Global Event Handler Setup (UPDATED & SIMPLIFIED) ---
function setupGlobalEventHandlers() {
    // Window resize handler.
    window.onresize = () => {
        if (logicController) {
            const bus = logicController.eventBus;
            bus.dispatchEvent(new CustomEvent('window-resize'));
            bus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        }
    };

    // Global keyboard shortcuts.
    // This now fires a generic event, decoupling the host from the UI implementation.
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const keyMap = { 
                '1': 'reverb', '2': 'delay', '3': 'chorus', '4': 'distortion', '5': 'filter' 
            };
            if (keyMap[e.key]) {
                e.preventDefault();
                const bus = logicController.eventBus;
                // Fire an event that the UI layer (e.g., EnhancedControls) should listen for.
                bus.dispatchEvent(new CustomEvent('shortcut-toggle-effect', {
                    detail: { effectName: keyMap[e.key] }
                }));
            }
        }
    });

    // NOTE: LFO visual updates and their helper functions have been removed.
    // This logic should be moved inside the relevant UI component (e.g., EnhancedControls.js)
    // as it is not the responsibility of the host application.
}


// --- Global Error Handling & Performance (Unchanged) ---
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

// --- Cleanup on page unload (UPDATED) ---
window.addEventListener('beforeunload', () => {
    // Destroy both controllers to ensure proper cleanup of all modules and listeners.
    if (uiController) {
        uiController.destroy();
    }
    if (logicController) {
        logicController.disconnectUI();
        logicController.destroy();
    }
});
