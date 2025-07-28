// app.js

import SaveLoad from './save-load.js';
import LoopManager from './loop-manager.js'; 
import PianoRoll from './piano-roll.js'; 
import EnhancedRecorder from './enhanced-recorder.js';
import EnhancedControls from './enhanced-controls.js';
import { MidiControl } from './midi.js';
import { LoopUI } from './loop-ui.js';


const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[Audionauts Enhanced] Starting enhanced app...');
let Tone;
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log('[Audionauts Enhanced] Tone.js loaded:', Tone?.version ?? Tone);
        boot();
    })
    .catch(err => {
        console.error('[Audionauts Enhanced] Failed to load Tone.js:', err);
    });

function boot() {
    console.log('[Audionauts Enhanced] Booting enhanced app after Tone.js load...');

    
   





   // --- from keyboard.js ---
const Keyboard = {
    WHITE_NOTES: ['C','D','E','F','G','A','B'],
    BLACKS: { 0:'C#', 1:'D#', 3:'F#', 4:'G#', 5:'A#' },

    init() {
        this.keyboard = document.getElementById('keyboard');
        document.getElementById('octaveUp').onclick   = () => {
            if (synthApp.curOct < 7) {
                synthApp.curOct++;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + synthApp.curOct;
                this.draw();
            }
        };
        document.getElementById('octaveDown').onclick = () => {
            if (synthApp.curOct > 0) {
                synthApp.curOct--;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + synthApp.curOct;
                this.draw();
            }
        };
        this.draw();
    },
    draw() {
        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = this.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const midi = Tone.Frequency(`${wn}${synthApp.curOct + octaveOffset}`).toMidi();
            const note = Tone.Frequency(midi, "midi").toNote();

            const wkey = document.createElement('div');
            wkey.className = 'key-white';
            wkey.dataset.note = note;
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';
            wkey.tabIndex = 0;
            this.addKeyHandlers(wkey, note);

            if (wn === "C" || wn === "F") {
                const lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.keyboard.appendChild(wkey);
            whiteIndex++;
        }
        // Black keys
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex % 7)) {
                const wn = this.WHITE_NOTES[whiteIndex % 7];
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNote = this.BLACKS[whiteIndex % 7] + (synthApp.curOct + octaveOffset);
                const midi = Tone.Frequency(blackNote).toMidi();
                const bkey = document.createElement('div');
                bkey.className = 'key-black';
                bkey.dataset.note = Tone.Frequency(midi, "midi").toNote();
                const leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW * 0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                bkey.tabIndex = 0;
                this.addKeyHandlers(bkey, bkey.dataset.note);
                this.keyboard.appendChild(bkey);
            }
            whiteIndex++;
        }
    },
    addKeyHandlers(el, note) {
        el.onmousedown   = () => EnhancedRecorder.playNote(note);
        el.onmouseup     = () => EnhancedRecorder.releaseNote(note);
        el.onmouseleave  = () => EnhancedRecorder.releaseNote(note);
        el.ontouchstart  = e => { e.preventDefault(); EnhancedRecorder.playNote(note); }
        el.ontouchend    = e => { e.preventDefault(); EnhancedRecorder.releaseNote(note); }
    },
    updateKeyVisual(note, on) {
        this.keyboard.querySelectorAll('.key-white,.key-black').forEach(k => {
            if (k.dataset.note === note) k.classList.toggle('active', !!on);
        });
    }
};





    
    // // --- from loop-ui.js ---
    // const LoopUI = {
    //     elements: {},

    //     init() {
    //         console.log('[LoopUI] Initializing loop controls...');
    //         this.createUI();
    //         this.bindEvents();
    //         this.updateUI();
    //     },

    //     createUI() {
    //         const el = id => document.getElementById(id);
    //         const container = el('loop-controls');
    //         if (!container) return console.error('[LoopUI] Loop controls container not found');

    //         container.innerHTML = `
    //         <div class="loop-panel">
    //             <div class="loop-section" style="display:flex;gap:32px;">
    //                 <div class="loop-toggle-section">
    //                     <label class="loop-checkbox-label">
    //                         <input type="checkbox" id="loopEnabled" class="loop-checkbox">
    //                         <span class="loop-checkbox-text">Enable Loop</span>
    //                     </label>
    //                     <div class="loop-status" id="loopStatus">Loop: Disabled</div>
    //                 </div>
    //                 <div class="quantize-toggle-section">
    //                     <label class="loop-checkbox-label">
    //                         <input type="checkbox" id="quantizeEnabled" class="loop-checkbox">
    //                         <span class="loop-checkbox-text">Enable Quantization</span>
    //                     </label>
    //                 </div>
    //             </div>
    //             <div id="loopSettingsSection" style="display:none">
    //                 <div class="loop-section">
    //                     <h4 class="loop-section-title">Loop Boundaries</h4>
    //                     <div class="loop-bounds-controls">
    //                         <div class="loop-bound-control">
    //                             <label for="loopStart">Start (s):</label>
    //                             <input type="number" id="loopStart" min="0" step="0.1" value="0" class="loop-input">
    //                         </div>
    //                         <div class="loop-bound-control">
    //                             <label for="loopEnd">End (s):</label>
    //                             <input type="number" id="loopEnd" min="0" step="0.1" value="4" class="loop-input">
    //                         </div>
    //                         <button id="autoDetectBounds" class="loop-button">Auto-Detect</button>
    //                     </div>
    //                 </div>
    //                 <div class="loop-section">
    //                     <h4 class="loop-section-title">Loop Settings</h4>
    //                     <div class="loop-settings-controls">
    //                         <div class="loop-setting-control">
    //                             <label for="maxLoops">Max Loops:</label>
    //                             <select id="maxLoops" class="loop-select">
    //                                 <option value="-1">Infinite</option>
    //                                 <option value="1">1</option>
    //                                 <option value="2">2</option>
    //                                 <option value="4">4</option>
    //                                 <option value="8">8</option>
    //                                 <option value="16">16</option>
    //                             </select>
    //                         </div>
    //                     </div>
    //                 </div>
    //             </div>
    //             <div id="quantizeSettingsSection" style="display:none">
    //                 <div class="loop-section">
    //                     <h4 class="loop-section-title">Quantization Settings</h4>
    //                     <div class="quantize-controls">
    //                         <div class="quantize-grid-control">
    //                             <label for="quantizeGrid">Grid:</label>
    //                             <select id="quantizeGrid" class="loop-select">
    //                                 <option value="whole">Whole Note</option>
    //                                 <option value="half">Half Note</option>
    //                                 <option value="quarter">Quarter Note</option>
    //                                 <option value="eighth">Eighth Note</option>
    //                                 <option value="sixteenth">Sixteenth Note</option>
    //                                 <option value="thirtysecond" selected>Thirty-second Note</option>
    //                             </select>
    //                         </div>
    //                         <div class="swing-control">
    //                             <label for="swingAmount">Swing:</label>
    //                             <input type="range" id="swingAmount" min="0" max="100" value="0" class="loop-slider">
    //                             <span id="swingValue" class="loop-value">0%</span>
    //                         </div>
    //                     </div>
    //                 </div>
    //             </div>
    //             <div class="loop-section">
    //                 <h4 class="loop-section-title">Tempo Conversion</h4>
    //                 <div class="tempo-controls">
    //                     <div class="tempo-control">
    //                         <label for="originalTempo">Original BPM:</label>
    //                         <input type="number" id="originalTempo" min="60" max="200" value="120" class="loop-input">
    //                     </div>
    //                     <div class="tempo-control">
    //                         <label for="targetTempo">Target BPM:</label>
    //                         <input type="number" id="targetTempo" min="60" max="200" value="120" class="loop-input">
    //                     </div>
    //                     <div class="tempo-ratio">
    //                         <span id="tempoRatio">Ratio: 1.00x</span>
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     `;
    //         this.elements = {
    //             loopEnabled: el('loopEnabled'),
    //             loopStatus: el('loopStatus'),
    //             loopStart: el('loopStart'),
    //             loopEnd: el('loopEnd'),
    //             autoDetectBounds: el('autoDetectBounds'),
    //             maxLoops: el('maxLoops'),
    //             quantizeEnabled: el('quantizeEnabled'),
    //             quantizeGrid: el('quantizeGrid'),
    //             swingAmount: el('swingAmount'),
    //             swingValue: el('swingValue'),
    //             originalTempo: el('originalTempo'),
    //             targetTempo: el('targetTempo'),
    //             tempoRatio: el('tempoRatio'),
    //             loopSettingsSection: el('loopSettingsSection'),
    //             quantizeSettingsSection: el('quantizeSettingsSection')
    //         };
    //     },

    //     bindEvents() {
    //         const els = this.elements;
    //         this._on(els.loopEnabled, 'change', e => {
    //             LoopManager.setLoopEnabled(e.target.checked);
    //             this._toggleSection(els.loopSettingsSection, e.target.checked);
    //             this.updateLoopStatus();
    //         });
    //         this._on(els.quantizeEnabled, 'change', e => {
    //             LoopManager.setQuantization(e.target.checked, LoopManager.quantizeGrid);
    //             this._toggleSection(els.quantizeSettingsSection, e.target.checked);
    //         });
    //         this._on(els.loopStart, 'change', e => LoopManager.setLoopBounds(+e.target.value, +els.loopEnd.value));
    //         this._on(els.loopEnd, 'change', e => LoopManager.setLoopBounds(+els.loopStart.value, +e.target.value));
    //         this._on(els.autoDetectBounds, 'click', () => {
    //             const b = LoopManager.autoDetectLoopBounds();
    //             els.loopStart.value = b.start.toFixed(1);
    //             els.loopEnd.value = b.end.toFixed(1);
    //         });
    //         this._on(els.maxLoops, 'change', e => LoopManager.setMaxLoops(+e.target.value));
    //         this._on(els.quantizeGrid, 'change', e => LoopManager.setQuantizationGrid(e.target.value));
    //         this._on(els.swingAmount, 'input', e => {
    //             const v = +e.target.value;
    //             LoopManager.setSwing(v / 100);
    //             els.swingValue.textContent = `${v}%`;
    //         });
    //         this._on(els.originalTempo, 'change', () => this.updateTempoConversion());
    //         this._on(els.targetTempo, 'change', () => this.updateTempoConversion());
    //     },

    //     _on(el, ev, fn) { el && el.addEventListener(ev, fn); },
    //     _toggleSection(el, show) { el && (el.style.display = show ? '' : 'none'); },

    //     updateTempoConversion() {
    //         const { originalTempo, targetTempo, tempoRatio } = this.elements;
    //         const orig = +originalTempo.value, tgt = +targetTempo.value;
    //         LoopManager.setTempoConversion(orig, tgt);
    //         tempoRatio.textContent = `Ratio: ${(tgt / orig).toFixed(2)}x`;
    //     },

    //     updateLoopStatus() {
    //         const { loopStatus } = this.elements, s = LoopManager.getLoopStatus();
    //         if (s.enabled) {
    //             loopStatus.textContent = s.active ? `Loop: Active (${s.duration.toFixed(1)}s)` : `Loop: Ready (${s.duration.toFixed(1)}s)`;
    //             loopStatus.className = `loop-status ${s.active ? 'active' : 'ready'}`;
    //         } else {
    //             loopStatus.textContent = 'Loop: Disabled';
    //             loopStatus.className = 'loop-status disabled';
    //         }
    //     },

    //     updateUI() {
    //         const e = this.elements, m = LoopManager;
    //         e.loopEnabled.checked = m.isLoopEnabled;
    //         this._toggleSection(e.loopSettingsSection, m.isLoopEnabled);
    //         e.quantizeEnabled.checked = m.quantizeEnabled;
    //         this._toggleSection(e.quantizeSettingsSection, m.quantizeEnabled);
    //         e.loopStart.value = m.loopStart.toFixed(1);
    //         e.loopEnd.value = m.loopEnd.toFixed(1);
    //         e.maxLoops.value = m.maxLoops.toString();
    //         e.quantizeGrid.value = m.getQuantizeGridKey();
    //         e.swingAmount.value = (m.swingAmount * 100).toString();
    //         e.swingValue.textContent = (m.swingAmount * 100).toFixed(0) + '%';
    //         e.originalTempo.value = m.originalTempo.toString();
    //         e.targetTempo.value = m.targetTempo.toString();
    //         this.updateLoopStatus();
    //         this.updateTempoConversion();
    //     },

    //     onPlaybackStateChange() { this.updateLoopStatus(); }
    // };





    // --- from transport.js ---
    const Transport = {
        init() {
            console.log('Transport controls initializing...');

            const el = document.getElementById('transport-controls');
            el.innerHTML = `
            <button id="recordBtn" class="transport-button"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button"><span>🗑</span>Clear</button>
        `;

            // Wire up events to EnhancedRecorder module
            document.getElementById('recordBtn').onclick = EnhancedRecorder.onRecord;
            document.getElementById('stopBtn').onclick   = EnhancedRecorder.onStop;
            document.getElementById('playBtn').onclick   = EnhancedRecorder.onPlay;
            document.getElementById('clearBtn').onclick  = EnhancedRecorder.onClear;

            // Store references for state updates
            EnhancedRecorder.buttons = {
                record: document.getElementById('recordBtn'),
                stop:   document.getElementById('stopBtn'),
                play:   document.getElementById('playBtn'),
                clear:  document.getElementById('clearBtn'),
            };
        }
    };
    



    // =================================================================
    // END: COMBINED JAVASCRIPT MODULES
    // =================================================================

    // --- Main Application Logic ---

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
        reverb: null, 
        delay: null, 
        filter: null,
        enhancedEffects: null,
    };

    // Store module references globally for save-load access
    window.Keyboard = Keyboard;
    window.PianoRoll = PianoRoll;
    window.EnhancedRecorder = EnhancedRecorder;
    window.EnhancedControls = EnhancedControls;

    // Robust DOMContentLoaded handling
    function appInit() {
        console.log('[Audionauts Enhanced] DOMContentLoaded, initializing enhanced modules...');
        try {
            // Initialize enhanced controls first (includes effects initialization)
            EnhancedControls.init(); 
            console.log('[Audionauts Enhanced] Enhanced Controls initialized');
            
            Keyboard.init(); 
            console.log('[Audionauts Enhanced] Keyboard initialized');
            
            Transport.init(); 
            console.log('[Audionauts Enhanced] Transport initialized');
            
            // Use enhanced recorder instead of original
            EnhancedRecorder.init(); 
            console.log('[Audionauts Enhanced] Enhanced Recorder initialized');
            
            MidiControl.init(); 
            console.log('[Audionauts Enhanced] MIDI Control initialized');
            
            PianoRoll.init(); 
            console.log('[Audionauts Enhanced] Piano Roll initialized');
            
            SaveLoad.init(); 
            console.log('[Audionauts Enhanced] Save/Load initialized');

            LoopUI.init(); 
            console.log('[Audionauts Enhanced] Loop UI initialized');
            
            console.log('[Audionauts Enhanced] All enhanced modules initialized successfully!');
            
        } catch(e) {
            console.error('[Audionauts Enhanced] Error during enhanced module init:', e);
        }

        // Tab switching functionality
        document.querySelectorAll('.tab-button').forEach(btn => btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            let tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'midi') {
                try { 
                    PianoRoll.draw(); 
                    console.log('[Audionauts Enhanced] PianoRoll.draw() called'); 
                } catch(e) { 
                    console.error('[Audionauts Enhanced] Error in PianoRoll.draw:', e); 
                }
            }
        });

        // Window event handlers
        window.onresize = () => { 
            try { 
                Keyboard.draw(); 
                console.log('[Audionauts Enhanced] Keyboard.draw() called on resize'); 
            } catch(e) { 
                console.error('[Audionauts Enhanced] Error in Keyboard.draw (resize):', e); 
            }
        };
        
        window.onclick = () => { 
            if (Tone && Tone.context && Tone.context.state !== 'running') {
                Tone.context.resume();
                console.log('[Audionauts Enhanced] Tone.context.resume() called');
            }
        };

        // Add keyboard shortcuts for effects
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        toggleEffectByKey('reverb');
                        break;
                    case '2':
                        e.preventDefault();
                        toggleEffectByKey('delay');
                        break;
                    case '3':
                        e.preventDefault();
                        toggleEffectByKey('chorus');
                        break;
                    case '4':
                        e.preventDefault();
                        toggleEffectByKey('distortion');
                        break;
                    case '5':
                        e.preventDefault();
                        toggleEffectByKey('filter');
                        break;
                }
            }
        });

        function toggleEffectByKey(effectName) {
            const toggle = document.getElementById(effectName + 'Enable');
            if (toggle) {
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change'));
                console.log(`[Audionauts Enhanced] Toggled ${effectName} via keyboard shortcut`);
            }
        }

        // Add visual feedback for enhanced effects
        setInterval(() => {
            updateEffectsVisualFeedback();
        }, 100);

        function updateEffectsVisualFeedback() {
            // Update LFO indicators
            const lfoEffects = ['filterLFO', 'tremoloLFO', 'vibratoLFO', 'phaserLFO'];
            lfoEffects.forEach(lfoName => {
                const toggle = document.getElementById(lfoName.replace('LFO', '') + 'LFOEnable');
                const label = document.querySelector(`label[for="${lfoName.replace('LFO', '') + 'LFOEnable'}"]`);
                if (toggle && label && toggle.checked) {
                    label.classList.add('lfo-active');
                } else if (label) {
                    label.classList.remove('lfo-active');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appInit);
    } else {
        appInit();
    }
}

// Global error handler for enhanced features
window.addEventListener('error', (e) => {
    console.error('[Audionauts Enhanced] Global error:', e.error);
});

// Performance monitoring
if (window.performance && window.performance.mark) {
    window.performance.mark('audionauts-enhanced-start');
    window.addEventListener('load', () => {
        window.performance.mark('audionauts-enhanced-loaded');
        window.performance.measure('audionauts-enhanced-load-time', 'audionauts-enhanced-start', 'audionauts-enhanced-loaded');
        const measure = window.performance.getEntriesByName('audionauts-enhanced-load-time')[0];
        console.log(`[Audionauts Enhanced] Load time: ${measure.duration.toFixed(2)}ms`);
    });
}
// *** END OF CHUNK 5 ***