import { Controls } from './controls.js';
import { Keyboard } from './keyboard.js';
import { MidiManager } from './midi.js';

export const BVST = {
    /**
     * Initialize the Plugin UI and Logic
     * @param {Object} config - The plugin configuration object (name, modules, etc.)
     * @param {Object} [config.keyboard] - Optional: Configuration for keyboard { startNote: 24, numKeys: 25 }
     * @param {string} [config.containerId='app-container'] - ID of the container element
     */
    init: function(config) {
        const containerId = config.containerId || 'app-container';
        
        // Initialize Controls (UI Builder)
        const controls = new Controls({
            onChange: (id, val) => {
                const el = document.getElementById(id);
                if(el && el.dataset.param) {
                    this.sendParam(parseInt(el.dataset.param), val);
                }
            }
        });

        // Build the actual HTML UI
        controls.buildUI(containerId, config);

        // Handle Presets
        if (config.presets) {
            const selector = document.getElementById('preset-selector');
            if (selector) {
                // Clear existing options first (except placeholder if logic requires, but buildUI adds placeholder)
                // Actually buildUI adds "Load Preset..." disabled option. Keep it.
                
                Object.keys(config.presets).forEach(k => {
                    const o = document.createElement('option');
                    o.value = k;
                    o.innerText = k;
                    selector.appendChild(o);
                });

                selector.addEventListener('change', (e) => {
                    const p = config.presets[e.target.value];
                    if (p) {
                        for (const [id, val] of Object.entries(p)) {
                            controls.setValue(id, val);
                            const el = document.getElementById(id);
                            if (el && el.dataset.param) {
                                this.sendParam(parseInt(el.dataset.param), val);
                            }
                        }
                    }
                });
            }
        }

        // Optional: Initialize Keyboard & MIDI if requested
        let kb = null;
        let midi = null;

        if (config.keyboard) {
             // 'piano' id is currently hardcoded in controls.js buildUI footer
             // If config.keyboard is just 'true', use defaults
             const startNote = config.keyboard.startNote || 24;
             const numKeys = config.keyboard.numKeys || 25;

             kb = new Keyboard('piano', {
                startNote: startNote,
                numKeys: numKeys,
                responsive: true,
                onNoteOn: (midiVal, freq) => {
                    // Standard Protocol: Param 26 = Frequency, 27 = Gate (1.0)
                    this.sendParam(26, freq);
                    this.sendParam(27, 1.0);
                },
                onNoteOff: (midiVal) => {
                    // Standard Protocol: Param 27 = Gate (0.0)
                    this.sendParam(27, 0.0);
                }
            });

            midi = new MidiManager({
                deviceSelectorId: 'midi-in', // Standard ID from controls.js
                statusElementId: 'midi-led', // Standard ID from controls.js
                onNoteOn: (n) => kb._handleNoteOn(n),
                onNoteOff: (n) => kb._handleNoteOff(n)
            });
        }

        // Listen for "Ready" signal from Host to sync initial parameter state
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'BVST_READY') {
                this.syncAllParams();
            }
        });
        
        // Store references
        this.controls = controls;
        this.keyboard = kb;
        this.midi = midi;
        
        console.log(`BVST Plugin '${config.name}' Initialized.`);
    },

    /**
     * Send a parameter update to the Host/WASM
     */
    sendParam: function(id, value) {
        window.parent.postMessage({ type: 'BVST_PARAM', id: id, value: value }, '*');
    },

    /**
     * Send all current UI values to the Host (useful on load)
     */
    syncAllParams: function() {
        document.querySelectorAll('[data-param]').forEach(el => {
            const p = parseInt(el.dataset.param);
            // prefer current dataset.val (number) over value (string)
            const v = parseFloat(el.dataset.val !== undefined ? el.dataset.val : el.dataset.value);
            if (!isNaN(p) && !isNaN(v)) {
                this.sendParam(p, v);
            }
        });
    }
};
