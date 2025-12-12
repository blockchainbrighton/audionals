import { Controls } from './controls.js';
import { Keyboard } from './keyboard.js';
import { MidiManager } from './midi.js';
import { SamplerUI } from './sampler.js';
import { Visualizer } from './visualizer.js';
import { SequencerManager } from './sequencer_core.js';

export const BVST = {
    init: function(config) {
        const containerId = config.containerId || 'app-container';
        
        // Audio Context Sharing
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

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
                    else if (id === 'reverse') this.sampler.updateParam('reverse', val > 0.5);
                    
                    if (config.sampler && config.sampler.onControlChange) {
                        config.sampler.onControlChange(id, val, this.sampler);
                    }
                }

                if (id === 'btn-power' && val === 1) {
                    window.parent.postMessage({ type: 'BVST_POWER' }, '*');
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    // Reset button visual after short delay?
                    setTimeout(() => controls.setValue('btn-power', 0), 200);
                }

                if (this.sequencer) {
                    // Transport
                    if (id === 'btn-play' && val === 1) this.sequencer.start();
                    if (id === 'btn-stop' && val === 1) this.sequencer.stop();
                    if (id === 'bpm') this.sequencer.setBpm(val);
                    if (id === 'swing') this.sequencer.setSwing(val);
                    
                    // Arp Params
                    if (id === 'arp_dir') this.sequencer.setArpDir(val);
                    else if (id === 'arp_rate') this.sequencer.setArpRate(parseFloat(val));
                    else if (id === 'arp_oct') this.sequencer.setArpOctaves(val);
                    else if (id === 'arp_enable') this.sequencer.setArpActive(val === 1);
                }
            }
        });

        const uiRefs = controls.buildUI(containerId, config);

        if (config.visualizer) {
            this._initVisualizer(config.visualizer);
        }

        if (config.sequencer) {
            this._initSequencer(config.sequencer);
        }

        if (config.sampler && config.sampler.enabled !== false) {
            this._initSampler(config.sampler);
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
                onNoteOn: (midiVal, freq, vel) => {
                    console.log(`PluginCore: onNoteOn ${midiVal}`);
                    // Check Arp Interception
                    if (this.sequencer && this.sequencer.type === 'arp' && this.sequencer.arp.active) {
                        this.sequencer.onNoteOn(midiVal);
                        return;
                    }

                    // Standard Logic
                    // Use explicit message if possible, falling back to params if needed?
                    // Actually, sending NOTE_ON message is safer for polyphony/velocity.
                    window.parent.postMessage({ 
                        type: 'NOTE_ON', 
                        note: midiVal, 
                        velocity: vel !== undefined ? vel : 1.0 
                    }, '*');
                    
                    // Legacy Param Fallback (Optional, but keeping for compatibility with old synths?)
                    // If the synth doesn't handle NOTE_ON message (old build), we still need params.
                    // But duplicates might trigger twice?
                    // Let's send params ONLY if we assume legacy.
                    // BUT, current UniversalSynth handles params too.
                    // If we send both, we might re-trigger.
                    // UniversalSynth `note_on` resets envelopes.
                    // Processor_glue checks `if (typeof this.synth.note_on === 'function')`.
                    // If it is, it calls it.
                    // If we ALSO send params, handle_event might call it again.
                    // Let's stick to NOTE_ON message. It's the modern BVST 7 way.
                    // But to be safe for old synths that ONLY look at params, we should probably check capabilities?
                    // We don't know capabilities here.
                    // Compromise: Send NOTE_ON message. Most new synths will use it.
                    // Old synths ignore 'NOTE_ON' type in processor?
                    // Old processor_glue didn't have 'NOTE_ON' handler.
                    // If using old processor_glue, this message does nothing.
                    // So we MUST send params for legacy support OR assume new build system.
                    // Since we updated the build system, all new builds use new glue.
                    // So NOTE_ON is safe.
                    
                    // For Sampler:
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

                    window.parent.postMessage({ type: 'NOTE_OFF', note: midiVal }, '*');
                    
                    if (this.sampler) {
                        this.sampler.release();
                    }
                }
            });

            if (config.keyboard && config.keyboard.onNoteOn) {
                const origOn = this.keyboard.onNoteOn;
                this.keyboard.onNoteOn = (n, f, v) => { origOn(n,f,v); config.keyboard.onNoteOn(n, f, v); };
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

        if (!this._listenerAdded) {
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'BVST_READY') {
                    this.syncAllParams();
                }
            });
            this._listenerAdded = true;
        }
        
        this.controls = controls;
        console.log(`BVST Plugin '${config.name}' Initialized.`);
    },

    destroy: function() {
        if (this.sequencer) this.sequencer.stop();
        // if (this.midi) this.midi.close(); // MidiManager doesn't expose close yet
        // Remove global listeners?
        console.log("BVST Destroyed (Partial)");
    },

    _initVisualizer: function(mode) {
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

    _initSequencer: function(seqConfig) {
        // Pass shared AudioContext
        seqConfig.audioContext = this.audioContext;
        
        this.sequencer = new SequencerManager(
            seqConfig, 
            (id, val) => this.sendParam(id, val),
            this.controls
        );
        
        if (seqConfig.type === 'arp') return;

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
        
        // Pass Element directly
        this.sequencer.init(seqContainer);
    },

    _initSampler: function(samplerConfig) {
        this.sampler = new SamplerUI({
            audioContext: this.audioContext, // Share context
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

        const appRoot = document.getElementById('bvst-app-root');
        const wrapper = document.createElement('div');
        
        // Pass Element directly
        this.sampler.buildUI(wrapper);
        
        // Insert
        if(appRoot) {
            const topBar = appRoot.querySelector('.bvst-top-bar');
            const viz = document.getElementById('bvst-viz-container');
            const target = viz ? viz.nextSibling : (topBar ? topBar.nextSibling : appRoot.firstChild);
            appRoot.insertBefore(wrapper.firstElementChild, target);
        }

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
