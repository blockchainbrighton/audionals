/**
 * @file SynthEngine.js
 * @description Schema-driven, core audio synthesis engine for BOP Synth.
 * This version uses a robust, multi-stage initialization process and an intelligent
 * setParameter function to prevent timing and type errors.
 */

// This engine is designed to be instantiated with a dynamically loaded Tone.js object.

// =========================================================================
//  NODE & PARAMETER SCHEMAS
// =========================================================================
const NODE_MAP = {
    master:     { className: 'Gain' },
    limiter:    { className: 'Limiter' },
    reverb:     { className: 'Reverb' },
    delay:      { className: 'FeedbackDelay' },
    filter:     { className: 'Filter' },
    chorus:     { className: 'Chorus' },
    distortion: { className: 'Distortion' },
    phaser:     { className: 'Phaser' },
    tremolo:    { className: 'Tremolo' },
    vibrato:    { className: 'Vibrato' },
    compressor: { className: 'Compressor' },
    bitCrusher: { className: 'BitCrusher' },
    filterLFO:  { className: 'LFO' },
    phaserLFO:  { className: 'LFO' },
    tremoloLFO: { className: 'LFO' },
    vibratoLFO: { className: 'LFO' },
};

const PARAM_MAP = {
    'master.volume':      { node: 'master',      param: 'gain',        isSignal: true,  default: 0.7  },
    'limiter.threshold':  { node: 'limiter',     param: 'threshold',   isSignal: true,  default: -3   },
    'oscillator.type':    { node: 'oscillator',  param: 'type',        isSignal: false, default: 'sawtooth' },
    'oscillator.detune':  { node: 'oscillator',  param: 'detune',      isSignal: false, default: 0    },
    'envelope.attack':    { node: 'envelope',    param: 'attack',      isSignal: false, default: 0.01 },
    'envelope.decay':     { node: 'envelope',    param: 'decay',       isSignal: false, default: 0.1  },
    'envelope.sustain':   { node: 'envelope',    param: 'sustain',     isSignal: false, default: 0.7  },
    'envelope.release':   { node: 'envelope',    param: 'release',     isSignal: false, default: 0.3  },
    'filter.frequency':   { node: 'filter',      param: 'frequency',   isSignal: true,  default: 5000 },
    'filter.Q':           { node: 'filter',      param: 'Q',           isSignal: true,  default: 1    },
    'filter.type':        { node: 'filter',      param: 'type',        isSignal: false, default: 'lowpass' },
    'reverb.wet':         { node: 'reverb',      param: 'wet',         isSignal: true,  default: 0.3  },
    'reverb.decay':       { node: 'reverb',      param: 'decay',       isSignal: true,  default: 2    },
    'reverb.preDelay':    { node: 'reverb',      param: 'preDelay',    isSignal: true,  default: 0    },
    'delay.wet':          { node: 'delay',       param: 'wet',         isSignal: true,  default: 0.2  },
    'delay.delayTime':    { node: 'delay',       param: 'delayTime',   isSignal: true,  default: 0.25 },
    'delay.feedback':     { node: 'delay',       param: 'feedback',    isSignal: true,  default: 0.3  },
    'chorus.wet':         { node: 'chorus',      param: 'wet',         isSignal: true,  default: 0.5  },
    'chorus.frequency':   { node: 'chorus',      param: 'frequency',   isSignal: true,  default: 1.5  },
    'chorus.delayTime':   { node: 'chorus',      param: 'delayTime',   isSignal: false, default: 3.5  }, // Corrected: isSignal false
    'chorus.depth':       { node: 'chorus',      param: 'depth',       isSignal: true,  default: 0.7  },
    'phaser.wet':         { node: 'phaser',      param: 'wet',         isSignal: true,  default: 0.5  },
    'phaser.frequency':   { node: 'phaser',      param: 'frequency',   isSignal: true,  default: 0.5  },
    'phaser.octaves':     { node: 'phaser',      param: 'octaves',     isSignal: true,  default: 3    },
    'phaser.baseFrequency':{ node: 'phaser',     param: 'baseFrequency',isSignal: true, default: 350  },
    'tremolo.wet':        { node: 'tremolo',     param: 'wet',         isSignal: true,  default: 0.7  },
    'tremolo.frequency':  { node: 'tremolo',     param: 'frequency',   isSignal: true,  default: 10   },
    'tremolo.depth':      { node: 'tremolo',     param: 'depth',       isSignal: true,  default: 0.5  },
    'vibrato.wet':        { node: 'vibrato',     param: 'wet',         isSignal: true,  default: 0.8  },
    'vibrato.frequency':  { node: 'vibrato',     param: 'frequency',   isSignal: true,  default: 5    },
    'vibrato.depth':      { node: 'vibrato',     param: 'depth',       isSignal: true,  default: 0.1  },
    'distortion.wet':     { node: 'distortion',  param: 'wet',         isSignal: true,  default: 0.3  },
    'distortion.distortion':{ node: 'distortion',  param: 'distortion',  isSignal: true,  default: 0.4  },
    'distortion.oversample':{ node: 'distortion',  param: 'oversample',  isSignal: false, default: 'none' },
    'compressor.threshold':{ node: 'compressor', param: 'threshold',   isSignal: true,  default: -24  },
    'compressor.ratio':   { node: 'compressor',  param: 'ratio',       isSignal: true,  default: 12   },
    'compressor.attack':  { node: 'compressor',  param: 'attack',      isSignal: true,  default: 0.003},
    'compressor.release': { node: 'compressor',  param: 'release',     isSignal: true,  default: 0.25 },
    'compressor.knee':    { node: 'compressor',  param: 'knee',        isSignal: true,  default: 30   },
    'bitCrusher.bits':    { node: 'bitCrusher',  param: 'bits',        isSignal: true,  default: 4    },
    'filterLFO.frequency':{ node: 'filterLFO',   param: 'frequency',   isSignal: true,  default: 0.5  },
    'filterLFO.depth':    { node: 'filterLFO',   param: 'amplitude',   isSignal: true,  default: 0    },
    'filterLFO.min':      { node: 'filterLFO',   param: 'min',         isSignal: false, default: 200  },
    'filterLFO.max':      { node: 'filterLFO',   param: 'max',         isSignal: false, default: 2000 },
    'phaserLFO.frequency':{ node: 'phaserLFO',   param: 'frequency',   isSignal: true,  default: 0.3  },
    'phaserLFO.depth':    { node: 'phaserLFO',   param: 'amplitude',   isSignal: true,  default: 0    },
    'tremoloLFO.frequency':{ node: 'tremoloLFO',  param: 'frequency',   isSignal: true,  default: 4    },
    'tremoloLFO.depth':   { node: 'tremoloLFO',  param: 'amplitude',   isSignal: true,  default: 0    },
    'vibratoLFO.frequency':{ node: 'vibratoLFO',  param: 'frequency',   isSignal: true,  default: 6    },
    'vibratoLFO.depth':   { node: 'vibratoLFO',  param: 'amplitude',   isSignal: true,  default: 0    },
};

export class SynthEngine {
    constructor(Tone, config = {}) {
        this.Tone = Tone;
        if (!this.Tone) throw new Error('SynthEngine requires a loaded Tone.js instance.');
        
        this.nodeConfig = NODE_MAP;
        this.paramConfig = PARAM_MAP;
        this.output = config.outputNode || this.Tone.getDestination();
        this.nodes = {};
        this.polySynth = null;
        this._bypassedEffectState = {};
        
        this.init();
    }

    init() {
        this.createAudioNodes();
        this.applyAllDefaults();
        this.connectAudioChain();
        this.startSources();
        
        console.log('[SynthEngine] Schema-driven audio engine created successfully.');
    }

    createAudioNodes() {
        const T = this.Tone;
        
        for(const [name, config] of Object.entries(this.nodeConfig)) {
            const NodeClass = T[config.className];
            if (NodeClass) {
                this.nodes[name] = new NodeClass();
            } else {
                console.error(`[SynthEngine] Tone.js class not found: ${config.className}`);
            }
        }

        this.nodes.oscillator = {};
        this.nodes.envelope = {};
        this.polySynth = new T.PolySynth(T.Synth);
    }
    
    connectAudioChain() {
        this.nodes.filterLFO.connect(this.nodes.filter.frequency);
        this.nodes.phaserLFO.connect(this.nodes.phaser.frequency);
        this.nodes.tremoloLFO.connect(this.nodes.tremolo.depth);
        this.nodes.vibratoLFO.connect(this.nodes.vibrato.depth);

        this.polySynth.chain(
            this.nodes.bitCrusher, this.nodes.distortion, this.nodes.compressor,
            this.nodes.filter, this.nodes.chorus, this.nodes.phaser,
            this.nodes.tremolo, this.nodes.vibrato, this.nodes.delay,
            this.nodes.reverb, this.nodes.limiter, this.nodes.master,
            this.output
        );
    }

    applyAllDefaults() {
        for (const [path, config] of Object.entries(this.paramConfig)) {
            this.setParameter(path, config.default);
        }
        Object.keys(this.paramConfig).filter(p => p.endsWith('.wet')).forEach(p => {
            const effectName = p.split('.')[0];
            this.toggleEffect(effectName, false);
        });
    }

    startSources() {
        ['chorus', 'phaser', 'tremolo', 'filterLFO', 'phaserLFO', 'tremoloLFO', 'vibratoLFO'].forEach(name => {
            const node = this.nodes[name];
            if (node && typeof node.start === 'function') {
                node.start();
            }
        });
    }

    // --- Core State Management ---
    getAllParameters() {
        const params = {};
        for (const [path, config] of Object.entries(this.paramConfig)) {
            const node = this.nodes[config.node];
            if (!node) continue;
            
            const target = config.isSignal ? node[config.param]?.value : node[config.param];
            params[path] = target;
        }
        return params;
    }

    setParameter(path, value) {
        const config = this.paramConfig[path];
        if (!config) return;

        const node = this.nodes[config.node];
        if (!node) return;

        // --- [THE FIX] ---
        // Handle PolySynth state objects first
        if (config.node === 'oscillator' || config.node === 'envelope') {
            node[config.param] = value;
            this.polySynth.set({ [config.node]: node });
            return;
        } 

        // For all other Tone.js nodes, check the parameter's type before setting
        const paramToSet = node[config.param];
        if (paramToSet instanceof this.Tone.Param || paramToSet instanceof this.Tone.Signal) {
            // It's a signal/param object, so set its .value property
            paramToSet.value = value;
        } else {
            // It's a primitive (number, string), so set it directly on the node
            node[config.param] = value;
        }
    }

    toggleEffect(effectName, enabled) {
        const wetPath = `${effectName}.wet`;
        const config = this.paramConfig[wetPath];
        if (!config) return;

        if (enabled) {
            const wetValue = this._bypassedEffectState[effectName] ?? config.default;
            this.setParameter(wetPath, wetValue > 0 ? wetValue : 0.5);
        } else {
            const currentState = this.getAllParameters();
            this._bypassedEffectState[effectName] = currentState[wetPath];
            this.setParameter(wetPath, 0);
        }
    }

    // --- Audio Playback ---
    noteOn(notes, velocity = 1.0) { if (this.polySynth) this.polySynth.triggerAttack(notes, this.Tone.now(), velocity); }
    noteOff(notes) { if (this.polySynth) this.polySynth.triggerRelease(notes, this.Tone.now()); }
    triggerAttackRelease(notes, dur, time, vel) { this.polySynth.triggerAttackRelease(notes, dur, time, vel); }
    releaseAll() { if (this.polySynth) this.polySynth.releaseAll(); }
    
    // --- Cleanup & Accessors ---
    destroy() {
        if (this.polySynth) this.polySynth.dispose();
        Object.values(this.nodes).forEach(node => {
            if (node && typeof node.dispose === 'function') node.dispose();
        });
    }
    getOutputNode() { return this.nodes.master; }
}