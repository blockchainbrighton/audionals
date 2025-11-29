import { SynthLoader } from '../shared/synth-loader.js';
import { MidiManager } from '../shared/midi-manager.js';

const SYNTHS = [
    {
        id: 'analog-synth',
        name: 'BAM Mono (Analog)',
        path: '../Synths/Analog-Synth-working/analog-synth.module.js'
    },
    {
        id: 'bassline',
        name: '30RD3 Bassline',
        path: '../Synths/BassLineSynth-working/bassline.module.js'
    },
    {
        id: 'lumina',
        name: 'LUMINA Lead',
        path: '../Synths/Lumina-lead-synth-working-add-poliphony/lumina.module.js'
    },
    {
        id: 'neon',
        name: 'NEON HORIZON',
        path: '../Synths/N.E.O.N./neon.module.js'
    },
    {
        id: 'synthwave',
        name: 'Synthwave Poly',
        path: '../Synths/Synthwave-Synth-working-All-Sounds-Sound_the_Same/synthwave.module.js'
    },
    {
        id: 'fmam',
        name: 'FM / AM Poly',
        path: '../Synths/FMAM/fmam.module.js'
    },
    {
        id: 'bamm',
        name: 'BAMM Groovebox',
        path: '../Synths/BAMM/bamm.module.js'
    },
    {
        id: 'jms-ten',
        name: 'JMS-TEN+',
        path: '../Synths/JMS-TEN/jms-ten.module.js'
    },
    {
        id: 'ord-one',
        name: 'Ord One',
        path: '../Synths/Ord-One/ord-one.module.js'
    },
    {
        id: 'resordinator',
        name: 'Resordinator',
        path: '../Synths/Resordinator/resordinator.module.js'
    },
    {
        id: 'thrord',
        name: 'THRORD Matrix',
        path: '../Synths/THRORD/thrord.module.js'
    },
    {
        id: 'wavetable',
        name: 'Wavetable',
        path: '../Synths/wavetable-synth-keys-should-be-below-controls/wavetable.module.js'
    },
    {
        id: 'zero-one',
        name: 'ZERO-ONE',
        path: '../Synths/Zero-One-Needs-Poly/zero-one.module.js'
    }
];

class App {
    constructor() {
        this.loader = null;
        this.midiManager = null;
        this.Tone = null;
        this.currentSynth = null;
        
        this.elements = {
            selector: document.getElementById('synth-selector'),
            appRoot: document.getElementById('app-root'),
            midiLed: document.getElementById('midi-led')
        };
    }

    async init() {
        // 1. Setup Loader
        this.loader = new SynthLoader({
            loaderId: 'loader-overlay',
            statusId: 'loader-msg',
            startBtnId: 'start-btn'
        });

        // 2. Setup MIDI (Global)
        this.midiManager = new MidiManager({
            deviceSelectorId: 'midi-in',
            statusElementId: 'midi-led',
            // Route all events to current synth
            onNoteOn: (n, v, c) => this.routeMidi('noteOn', n, v, c),
            onNoteOff: (n, c) => this.routeMidi('noteOff', n, c),
            onCC: (cc, v, c) => this.routeMidi('cc', cc, v, c)
        });

        // 3. Wait for user start
        this.loader.load(async ({ Tone }) => {
            this.Tone = Tone;
            await this.midiManager.init();
            
            this.populateSelector();
            this.enableSelector();
            
            // Load default
            if(SYNTHS.length > 0) {
                this.elements.selector.value = SYNTHS[0].id;
                this.loadSynth(SYNTHS[0].id);
            }
        });
    }

    populateSelector() {
        const sel = this.elements.selector;
        sel.innerHTML = '';
        SYNTHS.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            sel.appendChild(opt);
        });
        
        sel.onchange = (e) => this.loadSynth(e.target.value);
    }

    enableSelector() {
        this.elements.selector.disabled = false;
    }

    async loadSynth(id) {
        const config = SYNTHS.find(s => s.id === id);
        if (!config) return;

        // 1. Unmount current
        if (this.currentSynth) {
            console.log('[App] Unmounting current synth...');
            try {
                if(typeof this.currentSynth.unmount === 'function') {
                    this.currentSynth.unmount();
                }
            } catch(e) {
                console.error("Error unmounting:", e);
            }
            this.currentSynth = null;
        }

        // 2. Clear container
        this.elements.appRoot.innerHTML = '<div class="placeholder">Loading Instrument...</div>';

        // 3. Import Module
        try {
            console.log(`[App] Importing ${config.path}...`);
            const module = await import(config.path);
            const SynthClass = module.default;

            if (!SynthClass) throw new Error("Module has no default export");

            // 4. Instantiate
            this.currentSynth = new SynthClass(this.Tone, this.midiManager);

            // 5. Mount
            this.elements.appRoot.innerHTML = ''; 
            await this.currentSynth.mount(this.elements.appRoot);
            console.log(`[App] ${config.name} Mounted.`);

        } catch (err) {
            console.error("Failed to load synth:", err);
            this.elements.appRoot.innerHTML = `<div class="placeholder" style="color:red">Error loading instrument:<br>${err.message}</div>`;
        }
    }

    routeMidi(type, ...args) {
        if (this.currentSynth && this.currentSynth.midiHandler) {
            const handler = this.currentSynth.midiHandler[type];
            if (typeof handler === 'function') {
                handler(...args);
            }
        }
    }
}

// Start
const app = new App();
app.init();