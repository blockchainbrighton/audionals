/**
 * @file app.js
 * @description BOP Synth main host application. Handles Tone.js loading and instantiates the BopSynth controllers.
 * This file acts as the "shell" or "host" for the synthesizer application.
 */

import { BopSynthLogic } from './synth-logic.js';
import { BopSynthUI } from './synth-ui.js';

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
        
        // 2. Define UI element selectors for the visual layer.
        const uiElements = {
            keyboard: document.querySelector('.keyboard-container'),   // Not '#keyboard' (unless your HTML uses id="keyboard")
            pianoRoll: document.getElementById('rollGrid'),
            transport: document.getElementById('transport-controls'),
            controls: document.getElementById('control-panel'),
            loopControls: document.getElementById('loop-controls')     // If required by LoopUI
        };
        
        
        // 3. Create the UI layer, passing it the logic core and UI element selectors.
        uiController = new BopSynthUI(logicController, uiElements);
        
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
    // The event bus is the single point of communication.
    const eventBus = logicController.eventBus;

    // Tab switching functionality is a host-level UI concern.
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Notify modules about the tab change.
                eventBus.dispatchEvent(new CustomEvent('tab-changed', {
                    detail: { tabId }
                }));
                
                // If the MIDI tab is opened, specifically request a redraw of the piano roll.
                if (tabId === 'midi') {
                    eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
                }
            }
        };
    });

    // Window resize handler.
    window.onresize = () => {
        if (logicController) {
            eventBus.dispatchEvent(new CustomEvent('window-resize'));
            eventBus.dispatchEvent(new CustomEvent('keyboard-redraw')); // Specific redraw for keyboard
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
                // Fire an event that the UI layer (e.g., EnhancedControls) should listen for.
                eventBus.dispatchEvent(new CustomEvent('shortcut-toggle-effect', {
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
        logicController.destroy();
    }
});