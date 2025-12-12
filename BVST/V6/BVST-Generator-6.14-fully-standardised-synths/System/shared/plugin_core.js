import { Controls } from './controls.js';
import { Keyboard } from './keyboard.js';
import { MidiManager } from './midi.js';
import { SamplerUI } from './sampler.js';

export const BVST = {
    /**
     * Initialize the Plugin UI and Logic
     * @param {Object} config - The plugin configuration object
     * @param {Object} [config.keyboard] - Optional: Configuration for keyboard { startNote: 24, numKeys: 25 } or false to disable
     * @param {Object} [config.midiMap] - Optional: Override default MIDI param IDs { note: 26, gate: 27 }
     * @param {Object} [config.sampler] - Optional: Configuration for SamplerUI { enabled: true, onSeek: (pct) => ... }
     * @param {string} [config.containerId='app-container'] - ID of the container element
     */
    init: function(config) {
        const containerId = config.containerId || 'app-container';
        
        // Default MIDI Mapping
        const midiMap = {
            note: 26, 
            gate: 27,
            ...config.midiMap // Merge user overrides
        };

        // 1. Initialize Controls (UI Builder)
        const controls = new Controls({
            onChange: (id, val) => {
                const el = document.getElementById(id);
                // 1. Send to WASM Engine
                if(el && el.dataset.param) {
                    this.sendParam(parseInt(el.dataset.param), val);
                }
                
                // 2. Update SamplerUI state if active
                if (this.sampler) {
                    if (id === 'speed') this.sampler.updateParam('playSpeed', val);
                    else if (id === 'loop_start') this.sampler.updateParam('loopStart', val);
                    else if (id === 'loop_end') this.sampler.updateParam('loopEnd', val);
                    else if (id === 'loop_enable') this.sampler.updateParam('loopEnabled', val > 0.5);
                    else if (id === 'pos') this.sampler.updateParam('grainPos', val);
                    else if (id === 'spread') this.sampler.updateParam('grainSize', val * 2.0);
                    
                    if (config.sampler && config.sampler.onControlChange) {
                        config.sampler.onControlChange(id, val, this.sampler);
                    }
                }
            }
        });

        // 2. Build the Core UI
        const uiRefs = controls.buildUI(containerId, config);

        // 3. Initialize SamplerUI if requested
        if (config.sampler && config.sampler.enabled !== false) {
            this._initSampler(config.sampler, containerId);
        }

        // 4. Handle Presets
        if (config.presets && uiRefs.presetSelector) {
            const selector = uiRefs.presetSelector;
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

        // 5. Initialize Keyboard & MIDI (unless explicitly disabled)
        if (config.keyboard !== false) {
             const kbConfig = config.keyboard || {};
             const startNote = kbConfig.startNote || 24;
             const numKeys = kbConfig.numKeys || 25;

             this.keyboard = new Keyboard('piano', {
                startNote: startNote,
                numKeys: numKeys,
                responsive: true,
                onNoteOn: (midiVal, freq) => {
                    // Use Mapped Params
                    // Legacy/Sampler often uses 128 (Note) and 129 (Gate/Off)
                    // Standard uses 26 (Freq) and 27 (Gate)
                    
                    if (midiMap.note === 128) {
                        // Special Case: 128 expects MIDI Note Number (0-127), not Freq
                        this.sendParam(midiMap.note, midiVal);
                    } else {
                        // Standard Case: Expects Frequency
                        this.sendParam(midiMap.note, freq);
                    }
                    
                    // Gate On
                    // If using 129 for Gate Off, we usually just send Note On to 128
                    // But some engines might expect a Gate param?
                    // Legacy 128/129 usually means: 128=NoteOn(val), 129=NoteOff(val)
                    if (midiMap.gate !== 129) {
                        this.sendParam(midiMap.gate, 1.0);
                    }
                    
                    // Sampler Trigger Hook
                    if (this.sampler) {
                        this.sampler.updateParam('note', midiVal);
                        
                        // Slice Logic check
                        // If sliceGrid is active, map note to slice? 
                        // This logic is specific to SliceMaster. 
                        // We can handle generic note trigger here.
                        // Slice logic is better kept in custom onNoteOn hooks if needed, 
                        // BUT config.midiMap is about generic support.
                        
                        // Basic Sampler Trigger
                        this.sampler.trigger(); 
                    }
                },
                onNoteOff: (midiVal) => {
                    if (midiMap.gate === 129) {
                         // Legacy Note Off
                         this.sendParam(midiMap.gate, midiVal);
                    } else {
                         // Standard Gate Off
                         this.sendParam(midiMap.gate, 0.0);
                    }
                    
                    if (this.sampler) {
                        this.sampler.release();
                    }
                }
            });

            // Allow custom hooks to overlay
            if (config.keyboard && config.keyboard.onNoteOn) {
                const origOn = this.keyboard.onNoteOn;
                this.keyboard.onNoteOn = (n, f) => { origOn(n,f); config.keyboard.onNoteOn(n, f); };
            }
            if (config.keyboard && config.keyboard.onNoteOff) {
                const origOff = this.keyboard.onNoteOff;
                this.keyboard.onNoteOff = (n) => { origOff(n); config.keyboard.onNoteOff(n); };
            }

            this.midi = new MidiManager({
                deviceSelectorId: 'midi-in', 
                statusElementId: 'midi-led', 
                onNoteOn: (n) => this.keyboard._handleNoteOn(n),
                onNoteOff: (n) => this.keyboard._handleNoteOff(n)
            });
        } else {
            const kbContainer = document.getElementById('keyboard-container');
            if(kbContainer) kbContainer.style.display = 'none';
        }

        // 6. Listen for "Ready" signal
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'BVST_READY') {
                this.syncAllParams();
            }
        });
        
        this.controls = controls;
        console.log(`BVST Plugin '${config.name}' Initialized.`);
    },

    // ... (Rest of _initSampler and helpers remain unchanged) ...
    _initSampler: function(samplerConfig, rootId) {
        // Create Instance
        this.sampler = new SamplerUI({
            onSampleLoad: (data) => {
                window.parent.postMessage({ type: 'BVST_LOAD_SAMPLE_FROM_GUI', samples: data }, '*');
                if (samplerConfig.onLoad) samplerConfig.onLoad(data);
            },
            onSeek: (pct) => {
                if (samplerConfig.onSeek) {
                    samplerConfig.onSeek(pct);
                } else {
                    this.sendParam(30, pct);
                }
                this.sampler.updateParam('grainPos', pct); 
                this.controls.setValue('pos', pct);
            },
            onPreviewTrigger: (active) => {
                if (samplerConfig.onPreview) {
                    samplerConfig.onPreview(active);
                }
            }
        });

        const tempId = 'bvst-sampler-temp-' + Date.now();
        const tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        document.body.appendChild(tempDiv);
        
        this.sampler.buildUI(tempId);
        
        const appRoot = document.getElementById('bvst-app-root');
        const samplerNode = tempDiv.firstElementChild;
        if(appRoot && samplerNode) {
            const topBar = appRoot.querySelector('.bvst-top-bar');
            const grid = appRoot.querySelector('.bvst-controls-grid');
            if (topBar && grid) appRoot.insertBefore(samplerNode, grid);
            else if (topBar) appRoot.appendChild(samplerNode);
            else appRoot.prepend(samplerNode);
        }
        tempDiv.remove();

        if (samplerConfig.defaults) {
            Object.entries(samplerConfig.defaults).forEach(([k, v]) => {
                this.sampler.updateParam(k, v);
            });
        }
    },

    sendParam: function(id, value) {
        window.parent.postMessage({ type: 'BVST_PARAM', id: id, value: value }, '*');
    },

    syncAllParams: function() {
        document.querySelectorAll('[data-param]').forEach(el => {
            const p = parseInt(el.dataset.param);
            const v = parseFloat(el.dataset.val !== undefined ? el.dataset.val : el.dataset.value);
            if (!isNaN(p) && !isNaN(v)) {
                this.sendParam(p, v);
            }
        });
    }
};
