import { Controls } from './controls.js';
import { Keyboard } from './keyboard.js';
import { MidiManager } from './midi.js';
import { SamplerUI } from './sampler.js';

export const BVST = {
    /**
     * Initialize the Plugin UI and Logic
     * @param {Object} config - The plugin configuration object
     * @param {Object} [config.keyboard] - Optional: Configuration for keyboard { startNote: 24, numKeys: 25 } or false to disable
     * @param {Object} [config.sampler] - Optional: Configuration for SamplerUI { enabled: true, onSeek: (pct) => ... }
     * @param {string} [config.containerId='app-container'] - ID of the container element
     */
    init: function(config) {
        const containerId = config.containerId || 'app-container';
        
        // 1. Initialize Controls (UI Builder)
        // We use a custom onChange to support Sampler hooks
        const controls = new Controls({
            onChange: (id, val) => {
                const el = document.getElementById(id);
                // 1. Send to WASM Engine
                if(el && el.dataset.param) {
                    this.sendParam(parseInt(el.dataset.param), val);
                }
                
                // 2. Update SamplerUI state if active
                if (this.sampler) {
                    // Standard Mappings
                    // speed -> playSpeed
                    // loop_start -> loopStart
                    // loop_end -> loopEnd
                    // loop_enable -> loopEnabled (0=off, 1=on)
                    // pos -> grainPos
                    // spread -> grainSize (val * 2.0)
                    
                    if (id === 'speed') this.sampler.updateParam('playSpeed', val);
                    else if (id === 'loop_start') this.sampler.updateParam('loopStart', val);
                    else if (id === 'loop_end') this.sampler.updateParam('loopEnd', val);
                    else if (id === 'loop_enable') this.sampler.updateParam('loopEnabled', val > 0.5);
                    else if (id === 'pos') this.sampler.updateParam('grainPos', val);
                    else if (id === 'spread') this.sampler.updateParam('grainSize', val * 2.0);
                    
                    // Allow custom hooks if provided in config
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
                        // Trigger change logic
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
                    // Default Protocol: 26=Freq, 27=Gate
                    this.sendParam(26, freq);
                    this.sendParam(27, 1.0);
                },
                onNoteOff: (midiVal) => {
                    this.sendParam(27, 0.0);
                }
            });

            this.midi = new MidiManager({
                deviceSelectorId: 'midi-in', 
                statusElementId: 'midi-led', 
                onNoteOn: (n) => this.keyboard._handleNoteOn(n),
                onNoteOff: (n) => this.keyboard._handleNoteOff(n)
            });
        } else {
            // Clean up the placeholder if keyboard is disabled
            const kbContainer = document.getElementById('keyboard-container');
            if(kbContainer) kbContainer.style.display = 'none';
        }

        // 6. Listen for "Ready" signal
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'BVST_READY') {
                this.syncAllParams();
            }
        });
        
        // Store references
        this.controls = controls;
        console.log(`BVST Plugin '${config.name}' Initialized.`);
    },

    /**
     * Internal Sampler Initialization
     */
    _initSampler: function(samplerConfig, rootId) {
        // Create Instance
        this.sampler = new SamplerUI({
            onSampleLoad: (data) => {
                // Default: Send to Host
                window.parent.postMessage({ type: 'BVST_LOAD_SAMPLE_FROM_GUI', samples: data }, '*');
                if (samplerConfig.onLoad) samplerConfig.onLoad(data);
            },
            onSeek: (pct) => {
                // Default: Send to Param 30 (Standard Seek) if not overridden
                // Check if user provided override
                if (samplerConfig.onSeek) {
                    samplerConfig.onSeek(pct);
                } else {
                    // Default Seek Param is often 30 or 0 depending on plugin. 
                    // Safest to rely on config.onSeek or implement a standard param.
                    // Let's assume standard seek param is 30 for samplers.
                    this.sendParam(30, pct);
                }
                
                // Update internal state
                this.sampler.updateParam('grainPos', pct); 
                
                // If there's a knob for 'pos', update it
                this.controls.setValue('pos', pct);
            },
            onPreviewTrigger: (active) => {
                if (samplerConfig.onPreview) {
                    samplerConfig.onPreview(active);
                }
            }
        });

        // Inject DOM
        // We create a temp container, build, then move.
        const tempId = 'bvst-sampler-temp-' + Date.now();
        const tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        document.body.appendChild(tempDiv);
        
        this.sampler.buildUI(tempId);
        
        // Move to App Root
        const appRoot = document.getElementById('bvst-app-root');
        const samplerNode = tempDiv.firstElementChild;
        if(appRoot && samplerNode) {
            const topBar = appRoot.querySelector('.bvst-top-bar');
            const grid = appRoot.querySelector('.bvst-controls-grid');
            
            // Insert between Top Bar and Grid
            if (topBar && grid) appRoot.insertBefore(samplerNode, grid);
            else if (topBar) appRoot.appendChild(samplerNode);
            else appRoot.prepend(samplerNode);
        }
        
        tempDiv.remove();

        // Initial State Defaults
        if (samplerConfig.defaults) {
            Object.entries(samplerConfig.defaults).forEach(([k, v]) => {
                this.sampler.updateParam(k, v);
            });
        }
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
            const v = parseFloat(el.dataset.val !== undefined ? el.dataset.val : el.dataset.value);
            if (!isNaN(p) && !isNaN(v)) {
                this.sendParam(p, v);
            }
        });
    }
};