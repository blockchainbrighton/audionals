// BOP-SYNTH-V14/app.js  (drop-in)
import { BopSynthLogic } from './synth-logic.js';
import { BopSynthUI } from './synth-ui.js';

console.log('[BOP App Host] Starting application...');
let logicController, uiController;

function appInit() {
    console.log('[BOP App Host] Using global Tone instance:', window.BOP_Tone?.version);

    // 1. Use the singleton created by the sequencer
    const Tone = window.BOP_TONE;
    if (!Tone) throw new Error('Tone.js singleton not found. Sequencer must load first.');

    // 2. Create logic and UI
    logicController = new BopSynthLogic(Tone);
    uiController = new BopSynthUI(logicController, {
        keyboard: document.querySelector('.keyboard-container'),
        transport: document.getElementById('transport-controls'),
        controls: document.getElementById('control-panel'),
        pianoRoll: document.getElementById('rollGrid'),
        loopControls: document.getElementById('loop-controls'),
    });

    window.bopSynthLogic = logicController;
    window.bopSynthUI = uiController;

    logicController.eventBus.dispatchEvent(new CustomEvent('tone-ready', { detail: { Tone } }));
    setupGlobalEventHandlers();
}

function setupGlobalEventHandlers() {
    const bus = logicController.eventBus;
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');
            bus.dispatchEvent(new CustomEvent('tab-changed', { detail: { tabId } }));
            if (tabId === 'midi') bus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
        };
    });

    window.onresize = () => {
        bus.dispatchEvent(new CustomEvent('window-resize'));
        bus.dispatchEvent(new CustomEvent('keyboard-redraw'));
    };

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const keyMap = { '1': 'reverb', '2': 'delay', '3': 'chorus', '4': 'distortion', '5': 'filter' };
            if (keyMap[e.key]) {
                e.preventDefault();
                bus.dispatchEvent(new CustomEvent('shortcut-toggle-effect', {
                    detail: { effectName: keyMap[e.key] }
                }));
            }
        }
    });
}

// --- ENTRY ---
// Wait until sequencer has injected Tone
const checkTone = () => {
    if (window.BOP_TONE) {
        appInit();
    } else {
        setTimeout(checkTone, 30);
    }
};
checkTone();