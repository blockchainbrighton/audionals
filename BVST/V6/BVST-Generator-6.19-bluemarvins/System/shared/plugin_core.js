import { Controls } from './controls.js';
import { Keyboard } from './keyboard.js';
import { MidiManager } from './midi.js';
import { SamplerUI } from './sampler.js';
import { Visualizer } from './visualizer.js';
import { SequencerManager } from './sequencer_core.js';

export const BVST = {
    init: function(config) {
        const containerId = config.containerId || 'app-container';
        
        const midiMap = { note: 26, gate: 27, ...config.midiMap };

        const controls = new Controls({
            onChange: (id, val) => {
                const el = document.getElementById(id);
                if(el && el.dataset.param) {
                    this.sendParam(parseInt(el.dataset.param), val);
                }
                
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

                if (this.sequencer) {
                    // Transport
                    if (id === 'btn-play' && val === 1) this.sequencer.start();
                    if (id === 'btn-stop' && val === 1) this.sequencer.stop();
                    if (id === 'bpm') this.sequencer.setBpm(val);
                    
                    // Arp Params
                    if (id === 'arp_dir') this.sequencer.setArpDir(val); // Val is 'up', 'down' etc from Select
                    else if (id === 'arp_rate') this.sequencer.setArpRate(parseFloat(val));
                    else if (id === 'arp_oct') this.sequencer.setArpOctaves(val);
                    else if (id === 'arp_enable') this.sequencer.setArpActive(val === 1); // Button toggle? Or explicit ON/OFF
                    // If arp_enable is a button that toggles state in UI (Controls doesn't handle toggle state well for button, usually momentary)
                    // ArpOne used a button that toggled text.
                    // We might need a 'switch' or 'toggle' button type in Controls?
                    // ArpOne implemented custom logic.
                    // We can map 'arp_enable' (switch) to setActive.
                }
            }
        });

        const uiRefs = controls.buildUI(containerId, config);

        if (config.visualizer) {
            this._initVisualizer(config.visualizer, containerId);
        }

        if (config.sequencer) {
            this._initSequencer(config.sequencer, containerId);
        }

        if (config.sampler && config.sampler.enabled !== false) {
            this._initSampler(config.sampler, containerId);
        }

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

        if (config.keyboard !== false) {
             const kbConfig = config.keyboard || {};
             const startNote = kbConfig.startNote || 24;
             const numKeys = kbConfig.numKeys || 25;

             this.keyboard = new Keyboard('piano', {
                startNote: startNote,
                numKeys: numKeys,
                responsive: true,
                onNoteOn: (midiVal, freq) => {
                    // Check Arp Interception
                    if (this.sequencer && this.sequencer.type === 'arp' && this.sequencer.arp.active) {
                        this.sequencer.onNoteOn(midiVal);
                        return;
                    }

                    // Standard Logic
                    if (midiMap.note === 128) {
                        this.sendParam(midiMap.note, midiVal);
                    } else {
                        this.sendParam(midiMap.note, freq);
                    }
                    
                    if (midiMap.gate !== 129) {
                        this.sendParam(midiMap.gate, 1.0);
                    }
                    
                    if (this.sampler) {
                        this.sampler.updateParam('note', midiVal);
                        this.sampler.trigger(); 
                    }
                },
                onNoteOff: (midiVal) => {
                    if (this.sequencer && this.sequencer.type === 'arp' && this.sequencer.arp.active) {
                        this.sequencer.onNoteOff(midiVal);
                        return;
                    }

                    if (midiMap.gate === 129) {
                         this.sendParam(midiMap.gate, midiVal);
                    } else {
                         this.sendParam(midiMap.gate, 0.0);
                    }
                    
                    if (this.sampler) {
                        this.sampler.release();
                    }
                }
            });

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

        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'BVST_READY') {
                this.syncAllParams();
            }
        });
        
        this.controls = controls;
        console.log(`BVST Plugin '${config.name}' Initialized.`);
    },

    _initVisualizer: function(mode, rootId) {
        this.visualizer = new Visualizer({ mode: mode });
        const appRoot = document.getElementById('bvst-app-root');
        if (!appRoot) return;
        const vizDiv = document.createElement('div');
        vizDiv.style.height = '100px';
        vizDiv.style.width = '100%';
        vizDiv.style.borderBottom = '1px solid #333';
        vizDiv.id = 'bvst-viz-container';
        const topBar = appRoot.querySelector('.bvst-top-bar');
        if (topBar) appRoot.insertBefore(vizDiv, topBar.nextSibling);
        else appRoot.prepend(vizDiv);
        this.visualizer.buildUI('bvst-viz-container');
    },

    _initSequencer: function(seqConfig, rootId) {
        this.sequencer = new SequencerManager(
            seqConfig, 
            (id, val) => this.sendParam(id, val),
            this.controls
        );
        
        // If Type is Arp, we don't inject a grid/step UI.
        if (seqConfig.type === 'arp') {
            // No UI injection needed, controls are in the main CONFIG modules.
            return;
        }

        const tempId = 'bvst-seq-temp-' + Date.now();
        const tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        document.body.appendChild(tempDiv);
        
        this.sequencer.init(tempId);
        
        const appRoot = document.getElementById('bvst-app-root');
        const seqContainer = document.createElement('div');
        seqContainer.id = 'bvst-sequencer-container';
        seqContainer.style.marginTop = '10px';
        seqContainer.style.background = 'rgba(0,0,0,0.3)';
        seqContainer.style.borderRadius = '4px';
        seqContainer.style.padding = '10px';
        
        const kbContainer = document.getElementById('keyboard-container');
        if (kbContainer) appRoot.insertBefore(seqContainer, kbContainer);
        else appRoot.appendChild(seqContainer);
        
        this.sequencer.init('bvst-sequencer-container');
        tempDiv.remove();
    },

    // ... (rest same) ...
    _initSampler: function(samplerConfig, rootId) {
        this.sampler = new SamplerUI({
            onSampleLoad: (data) => {
                window.parent.postMessage({ type: 'BVST_LOAD_SAMPLE_FROM_GUI', samples: data }, '*');
                if (samplerConfig.onLoad) samplerConfig.onLoad(data);
            },
            onSeek: (pct) => {
                if (samplerConfig.onSeek) samplerConfig.onSeek(pct);
                else this.sendParam(30, pct);
                this.sampler.updateParam('grainPos', pct); 
                this.controls.setValue('pos', pct);
            },
            onPreviewTrigger: (active) => {
                if (samplerConfig.onPreview) samplerConfig.onPreview(active);
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
            const viz = document.getElementById('bvst-viz-container');
            const target = viz ? viz.nextSibling : (topBar ? topBar.nextSibling : appRoot.firstChild);
            appRoot.insertBefore(samplerNode, target);
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