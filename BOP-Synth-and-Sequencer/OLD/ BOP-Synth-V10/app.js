/**
 * @file app.js
 * @description BOP Synth main host application. Handles Tone.js loading and BopSynth instantiation.
 * Refactored to use the new component-based architecture with BopSynth controller.
 */

import BopSynth from './BopSynth.js';

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[BOP App Host] Starting application...');

let Tone;
let bopSynth;

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
    console.log('[BOP App Host] Initializing BOP Synth application...');
    
    try {
        // Define UI element selectors for the BopSynth controller
        const uiElements = {
            keyboard: '#keyboard',
            pianoRoll: '#rollGrid',
            transport: '#transport-controls',
            controls: '#control-panel'
        };
        
        // Create the main BopSynth controller instance
        bopSynth = new BopSynth(Tone, uiElements);
        
        // Make it globally accessible for debugging (optional)
        window.bopSynth = bopSynth;
        
        // Emit Tone ready event for modules that need it
        bopSynth.eventBus.dispatchEvent(new CustomEvent('tone-ready', {
            detail: { Tone }
        }));
        
        console.log('[BOP App Host] BopSynth application initialized successfully!');
        
        // Setup global event handlers that don't belong to specific modules
        setupGlobalEventHandlers();
        
    } catch (e) {
        console.error('[BOP App Host] A fatal error occurred during application initialization:', e);
    }
}

// --- Global Event Handler Setup ---
function setupGlobalEventHandlers() {
    // Tab switching functionality
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Emit tab change event for modules that need to respond
                if (bopSynth) {
                    bopSynth.eventBus.dispatchEvent(new CustomEvent('tab-changed', {
                        detail: { tabId }
                    }));
                    
                    // Special handling for MIDI tab to redraw piano roll
                    if (tabId === 'midi') {
                        bopSynth.eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
                    }
                }
            }
        };
    });

    // Window resize handler
    window.onresize = () => {
        if (bopSynth) {
            bopSynth.eventBus.dispatchEvent(new CustomEvent('window-resize'));
            bopSynth.eventBus.dispatchEvent(new CustomEvent('keyboard-redraw'));
        }
    };

    // Global keyboard shortcuts for effects
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const keyMap = { 
                '1': 'reverb', 
                '2': 'delay', 
                '3': 'chorus', 
                '4': 'distortion', 
                '5': 'filter' 
            };
            if (keyMap[e.key]) {
                e.preventDefault();
                toggleEffectByKey(keyMap[e.key]);
            }
        }
    });

    // Start LFO visual updates
    setInterval(updateLFOVisuals, 100);
}

/**
 * Toggles an effect's enabled state by simulating a click on its checkbox.
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
    if (!bopSynth || !bopSynth.synthEngine) return;
    
    const lfoEffects = ['filter', 'tremolo', 'vibrato', 'phaser'];
    lfoEffects.forEach(effectName => {
        const checkboxId = `${effectName}Enable`;
        const toggle = document.getElementById(checkboxId);
        const label = document.querySelector(`label[for="${checkboxId}"]`);
        if (toggle && label) {
            let isActive = toggle.checked;
            if (effectName === 'filter' && bopSynth.synthEngine.nodes.filter) {
                isActive = toggle.checked && bopSynth.synthEngine.nodes.filter.state === 'started';
            }
            label.classList.toggle('lfo-active', isActive);
        }
    });
}

// --- Global Error Handling & Performance ---
window.addEventListener('error', (e) => {
    console.error('[BOP App Host] Global unhandled error:', e.error);
});

// Performance monitoring
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (bopSynth) {
        bopSynth.destroy();
    }
});

