import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class ZeroOneSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.engine = null;
        this.keyboard = null;
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        
        this.engine = new LeadSynth(this.Tone);
        this.initUI();
        
        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => {
                if (c === 1) this.engine.setModWheel(v);
            }
        };
    }

    unmount() {
        if(this.state && this.state.animationId) cancelAnimationFrame(this.state.animationId);
        
        const e = this.engine;
        if(e) {
            try {
                e.synth.dispose();
                e.subOsc.dispose();
                e.subGain.dispose();
                e.vibrato.dispose();
                e.vibratoDepthNode.dispose();
                e.masterFx.forEach(f => f.dispose());
            } catch(err){}
        }

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .zo-wrapper {
            --bg: #121214; --panel: #1e1e24; --accent: #00f0ff; --accent-dim: #007a82;
            --text: #e0e0e0; --knob-bg: #2a2a30;
            font-family: 'Courier New', Courier, monospace; color: var(--text);
            display: flex; flex-direction: column; width: 100%; height: 100%;
        }
        .top-bar { height: 60px; background: #000; border-bottom: 1px solid var(--accent-dim); display: flex; align-items: center; padding: 0 20px; justify-content: space-between; }
        h1 { margin: 0; font-size: 1.2rem; color: var(--accent); text-shadow: 0 0 5px var(--accent-dim); }
        .controls-grid { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 20px; overflow-y: auto; }
        .module { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 4px; padding: 10px; display: flex; flex-direction: column; align-items: center; }
        .module h3 { margin: 0 0 10px 0; font-size: 0.7rem; color: #888; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; width: 100%; text-align: center; }
        .knob-row { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        .knob-container { display: flex; flex-direction: column; align-items: center; width: 50px; }
        .knob { width: 40px; height: 40px; background: var(--knob-bg); border-radius: 50%; position: relative; cursor: ns-resize; border: 2px solid #444; box-shadow: inset 0 0 5px #000; }
        .knob::after { content: ''; position: absolute; top: 10%; left: 50%; width: 2px; height: 40%; background: var(--accent); transform: translateX(-50%); pointer-events: none; }
        .knob-label { font-size: 0.6rem; margin-top: 5px; text-align: center; }
        select { background: #000; color: var(--accent); border: 1px solid var(--accent-dim); padding: 5px; font-family: inherit; font-size: 0.8rem; cursor: pointer; }
        .visualizer-container { width: 100%; height: 40px; background: #000; margin-top: auto; position: relative; overflow: hidden; }
        #bend-bar { position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: var(--accent); transform: translateX(-50%); transition: left 0.1s ease-out; opacity: 0.7; }
        #keyboard { background: #000; border-top: 2px solid var(--accent-dim); padding-top: 5px; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="zo-wrapper">
            <div class="top-bar">
                <h1>ZERO-<span>ONE</span></h1>
                <select id="preset-selector" style="margin-left: 20px;"><option value="" disabled selected>Load Preset...</option></select>
            </div>
            <div class="controls-grid">
                <!-- OSC -->
                <div class="module"><h3>Oscillators</h3><div class="knob-row">
                    <div class="knob-container" data-param="oscMix" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-oscMix"></div><div class="knob-label">Mix 1/2</div></div>
                    <div class="knob-container" data-param="detune" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-detune"></div><div class="knob-label">Detune</div></div>
                    <div class="knob-container" data-param="subLevel" data-min="0" data-max="1" data-value="0"><div class="knob" id="k-subLevel"></div><div class="knob-label">Sub Vol</div></div>
                </div><div style="margin-top: 5px; width: 100%;"><select id="osc-type" style="width:100%; font-size: 0.7rem;"><option value="sawtooth">Sawtooth</option><option value="square">Square</option><option value="triangle">Triangle</option></select></div></div>
                
                <!-- FILTER -->
                <div class="module"><h3>Filter</h3><div class="knob-row">
                    <div class="knob-container" data-param="cutoff" data-min="0" data-max="1" data-value="0.8"><div class="knob" id="k-cutoff"></div><div class="knob-label">Cutoff</div></div>
                    <div class="knob-container" data-param="resonance" data-min="0" data-max="1" data-value="0.1"><div class="knob" id="k-resonance"></div><div class="knob-label">Res</div></div>
                    <div class="knob-container" data-param="drive" data-min="0" data-max="1" data-value="0.2"><div class="knob" id="k-drive"></div><div class="knob-label">Drive</div></div>
                </div></div>

                <!-- ENV -->
                <div class="module"><h3>Envelope</h3><div class="knob-row">
                    <div class="knob-container" data-param="attack" data-min="0" data-max="1" data-value="0.01"><div class="knob" id="k-attack"></div><div class="knob-label">Atk</div></div>
                    <div class="knob-container" data-param="decay" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-decay"></div><div class="knob-label">Dec</div></div>
                    <div class="knob-container" data-param="sustain" data-min="0" data-max="1" data-value="0.8"><div class="knob" id="k-sustain"></div><div class="knob-label">Sus</div></div>
                    <div class="knob-container" data-param="release" data-min="0" data-max="1" data-value="0.3"><div class="knob" id="k-release"></div><div class="knob-label">Rel</div></div>
                </div><div class="knob-row" style="margin-top:5px;"><div class="knob-container" data-param="filterEnv" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-filterEnv"></div><div class="knob-label">Filt. Env</div></div></div></div>

                <!-- MOD -->
                <div class="module"><h3>Mod / LFO</h3><div class="knob-row">
                    <div class="knob-container" data-param="lfoRate" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-lfoRate"></div><div class="knob-label">Rate</div></div>
                    <div class="knob-container" data-param="lfoDepth" data-min="0" data-max="1" data-value="0"><div class="knob" id="k-lfoDepth"></div><div class="knob-label">Depth</div></div>
                    <div class="knob-container" data-param="glide" data-min="0" data-max="1" data-value="0.1"><div class="knob" id="k-glide"></div><div class="knob-label">Glide</div></div>
                </div></div>

                <!-- FX -->
                <div class="module" style="grid-column: span 2;"><h3>Effects Chain</h3><div class="knob-row">
                    <div class="knob-container" data-param="delayWet" data-min="0" data-max="1" data-value="0.1"><div class="knob" id="k-delayWet"></div><div class="knob-label">Delay</div></div>
                    <div class="knob-container" data-param="delayTime" data-min="0" data-max="1" data-value="0.2"><div class="knob" id="k-delayTime"></div><div class="knob-label">Time</div></div>
                    <div class="knob-container" data-param="reverbWet" data-min="0" data-max="1" data-value="0.1"><div class="knob" id="k-reverbWet"></div><div class="knob-label">Reverb</div></div>
                    <div class="knob-container" data-param="width" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-width"></div><div class="knob-label">Width</div></div>
                </div></div>

                <!-- MASTER -->
                <div class="module" style="grid-column: span 2;"><h3>Performance</h3><div class="visualizer-container"><div id="bend-bar"></div></div></div>
            </div>
            <div id="keyboard"></div>
        </div>`;
    }

    initUI() {
        this.keyboard = new SynthKeyboard('keyboard', {
            startNote: 48, responsive: true,
            onNoteOn: (n) => this.noteOn(n, 1), onNoteOff: (n) => this.noteOff(n)
        });

        new KnobControl('.knob', {
            onChange: (id, val) => {
                const knob = this.container.querySelector(`#${id}`);
                const container = knob.closest('.knob-container');
                const param = container.dataset.param;
                this.updateKnobVisual(knob, val, container);
                this.engine.setParam(param, val);
            }
        });

        const sel = this.container.querySelector('#preset-selector');
        Object.keys(this.presets).forEach(k => {
            const opt = document.createElement('option'); opt.value = k; opt.innerText = k; sel.appendChild(opt);
        });
        sel.onchange = (e) => this.loadPreset(e.target.value);
        this.container.querySelector('#osc-type').onchange = (e) => this.engine.setOscType(e.target.value);

        this.loadPreset("Init Lead");
    }

    loadPreset(name) {
        console.log('[ZeroOne] Loading Preset:', name);
        const p = this.presets[name];
        if(!p) return;

        // Default parameters to ensure state reset
        const defaults = {
            cutoff: 0.5, resonance: 0, drive: 0,
            attack: 0.01, decay: 0.1, sustain: 1, release: 0.5,
            lfoRate: 0.5, lfoDepth: 0, glide: 0, detune: 0.5, oscMix: 0.5, subLevel: 0,
            delayWet: 0, delayTime: 0.2, reverbWet: 0, width: 0.5
        };
        
        try {
            this.container.querySelector('#osc-type').value = p.type;
            this.engine.setOscType(p.type);
            
            // Merge defaults with preset values
            const params = { ...defaults, ...p.k };

            for(const [k, v] of Object.entries(params)) {
                const container = this.container.querySelector(`.knob-container[data-param="${k}"]`);
                if(container) {
                    const knob = container.querySelector('.knob');
                    this.updateKnobVisual(knob, v, container);
                }
                // Always set the engine param, even if UI element missing
                this.engine.setParam(k, v);
            }
        } catch(err) {
            console.error('[ZeroOne] Preset Error:', err);
        }
    }

    updateKnobVisual(el, val, container) {
        const min = parseFloat(container.dataset.min) || 0;
        const max = parseFloat(container.dataset.max) || 1;
        const pct = (val - min) / (max - min);
        const deg = -135 + (pct * 270);
        el.style.transform = `rotate(${deg}deg)`;
        el.dataset.value = val;
    }

    noteOn(midi, vel) {
        if(!this.engine) return;
        const note = this.Tone.Frequency(midi, "midi").toNote();
        this.engine.triggerAttack(note, vel);
        if(this.keyboard) this.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        if(!this.engine) return;
        const note = this.Tone.Frequency(midi, "midi").toNote();
        this.engine.triggerRelease(note);
        if(this.keyboard) this.keyboard.triggerVisual(midi, false);
    }

    get presets() {
        return {
            "Init Lead": { type: "sawtooth", k: { cutoff: 0.8, resonance: 0.1, attack: 0.01, decay: 0.5, sustain: 0.8, release: 0.3, lfoDepth: 0.1, delayWet: 0.1, reverbWet: 0.1, drive: 0.2, subLevel: 0.0 } },
            "Saw Lead": { type: "sawtooth", k: { cutoff: 1.0, resonance: 0.2, attack: 0.05, decay: 0.2, sustain: 1.0, release: 0.5, delayWet: 0.3, reverbWet: 0.4, width: 0.7, detune: 0.6, subLevel: 0.2 } },
            "Sync Hook": { type: "square", k: { cutoff: 0.6, resonance: 0.6, attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.2, glide: 0.2, drive: 0.5, subLevel: 0.4 } },
            "Ethereal Keys": { type: "triangle", k: { cutoff: 0.6, resonance: 0.2, attack: 0.1, decay: 1.0, sustain: 0.5, release: 2.0, delayWet: 0.3, reverbWet: 0.5, width: 0.8 } },
            "Silky Solo": { type: "triangle", k: { cutoff: 0.7, resonance: 0.0, glide: 0.3, attack: 0.1, sustain: 0.9, release: 0.5, lfoRate: 0.6, lfoDepth: 0.3, delayWet: 0.4, subLevel: 0.3 } },
            "Brassy Stack": { type: "sawtooth", k: { cutoff: 0.5, resonance: 0.2, attack: 0.1, decay: 0.4, sustain: 0.6, release: 0.4, detune: 0.7, width: 0.8, drive: 0.4 } },
            "Stadium Lead": { type: "sawtooth", k: { cutoff: 0.7, resonance: 0.1, attack: 0.02, decay: 0.3, sustain: 1.0, release: 0.5, detune: 0.4, width: 0.6, reverbWet: 0.3, delayWet: 0.3, drive: 0.1, subLevel: 0.4 } },
            "Soft Glide": { type: "sine", k: { cutoff: 0.3, resonance: 0.0, glide: 0.6, attack: 0.2, sustain: 0.8, release: 0.8, reverbWet: 0.7, delayWet: 0.2 } }
        };
    }
}

class LeadSynth {
    constructor(Tone) {
        this.Tone = Tone;
        this.context = Tone.context;
        
        // Safety path
        this.safetyGain = new Tone.Gain(0.9);
        this.limiter = new Tone.Limiter(-0.5).toDestination();
        
        this.reverb = new Tone.Reverb({ decay: 3, preDelay: 0.01 });
        this.reverb.wet.value = 0.3;
        
        this.delay = new Tone.PingPongDelay("8n", 0.2);
        this.delay.wet.value = 0.2;
        
        this.widener = new Tone.StereoWidener(0.5);
        this.chorus = new Tone.Chorus(4, 2.5, 0.5);
        
        this.masterFx = [this.chorus, this.widener, this.delay, this.reverb, this.safetyGain, this.limiter];

        this.synth = new Tone.MonoSynth({
            volume: -5,
            oscillator: { type: "sawtooth" },
            filter: { Q: 2, type: "lowpass", rolloff: -24 },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0.5, release: 1 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1, baseFrequency: 200, octaves: 2, exponent: 2 }
        });

        this.subOsc = new Tone.Oscillator().start();
        this.subGain = new Tone.Gain(0);
        this.subOsc.connect(this.subGain);
        this.subGain.chain(...this.masterFx);

        this.vibrato = new Tone.LFO(5, -10, 10).start();
        this.vibratoDepthNode = new Tone.Gain(0);
        this.vibrato.connect(this.vibratoDepthNode);
        this.vibratoDepthNode.connect(this.synth.detune);

        this.synth.chain(...this.masterFx);
        this.params = { glide: 0.1, subVol: 0, pitchBendRange: 2 };
        // Track raw values for safe calculation
        this.paramState = { cutoff: 0.5, drive: 0 };
        this.notesHeld = new Set();
    }

    applyFilterSafe() {
        // Calculate desired values
        // Cutoff 0-1 -> 20Hz to 12kHz log scale
        const rawCutoff = this.paramState.cutoff;
        const rawDrive = this.paramState.drive;

        const baseFreq = Math.max(20, Math.min(12000, Math.pow(10, rawCutoff * 3 + 1.5)));
        let octaves = 1 + (rawDrive * 4); // 1 to 5 octaves

        // Safety Check: Peak Frequency
        const peakFreq = baseFreq * Math.pow(2, octaves);
        if (peakFreq > 22000) {
            // If peak exceeds 22kHz, clamp octaves to fit
            // 2^octaves = 22000 / baseFreq
            // octaves = log2(22000 / baseFreq)
            const maxOctaves = Math.log2(22000 / baseFreq);
            octaves = Math.max(0, Math.min(octaves, maxOctaves));
            // console.warn(`[ZeroOne] Clamping Filter: Base ${Math.round(baseFreq)}Hz, Octaves reduced to ${octaves.toFixed(2)}`);
        }

        this.synth.filterEnvelope.baseFrequency = baseFreq;
        this.synth.filterEnvelope.octaves = octaves;
    }

    triggerAttack(note, velocity) {
        console.log('[ZeroOne] NoteOn:', note);
        if(!note || !Number.isFinite(velocity)) return;
        const freq = this.Tone.Frequency(note).toFrequency();
        if(!Number.isFinite(freq)) return;

        this.subOsc.frequency.setValueAtTime(freq / 2, this.context.currentTime);
        if (this.notesHeld.size > 0) {
            this.synth.triggerAttack(note, this.context.currentTime, velocity); 
        } else {
            this.synth.triggerAttack(note, this.context.currentTime, velocity);
            this.subGain.gain.cancelScheduledValues(this.context.currentTime);
            this.subGain.gain.rampTo(this.params.subVol * velocity, 0.1);
        }
        this.notesHeld.add(note);
    }

    triggerRelease(note) {
        this.notesHeld.delete(note);
        if (this.notesHeld.size === 0) {
            this.synth.triggerRelease();
            this.subGain.gain.rampTo(0, 0.2);
        }
    }

    setParam(id, value) {
        if (!Number.isFinite(value)) return;
        const safeVal = (v, min, max) => Math.min(Math.max(v, min), max);

        switch(id) {
            case 'cutoff': 
                this.paramState.cutoff = safeVal(value, 0, 1);
                this.applyFilterSafe();
                break;
            case 'resonance': 
                this.synth.filter.Q.value = safeVal(value * 15, 0, 15); 
                break;
            case 'drive': 
                this.paramState.drive = safeVal(value, 0, 1);
                this.applyFilterSafe();
                break;
            case 'attack': this.synth.envelope.attack = Math.max(0.005, value * 1); break;
            case 'decay': this.synth.envelope.decay = Math.max(0.1, value * 2); break;
            case 'sustain': this.synth.envelope.sustain = safeVal(value, 0, 1); break;
            case 'release': this.synth.envelope.release = Math.max(0.1, value * 3); break;
            case 'lfoRate': this.vibrato.frequency.rampTo(safeVal(value * 20, 0.1, 20), 0.1); break;
            case 'lfoDepth': this.vibratoDepthNode.gain.rampTo(value * 50, 0.1); break;
            case 'glide': 
                const g = safeVal(value, 0, 1);
                this.synth.portamento = g; this.params.glide = g; 
                break;
            case 'detune': this.synth.detune.value = (safeVal(value, 0, 1) - 0.5) * 100; break;
            case 'oscMix': this.chorus.depth = safeVal(value, 0, 1); break; 
            case 'subLevel': 
                this.params.subVol = safeVal(value, 0, 1) * 0.5; 
                if(this.notesHeld.size > 0) this.subGain.gain.rampTo(this.params.subVol, 0.1); 
                break;
            case 'delayWet': this.delay.wet.value = safeVal(value, 0, 0.8); break;
            case 'delayTime': this.delay.delayTime.value = 0.1 + (safeVal(value, 0, 1) * 0.5); break;
            case 'reverbWet': this.reverb.wet.value = safeVal(value, 0, 0.8); break;
            case 'width': this.widener.width.value = safeVal(value, 0, 1); break;
        }
    }

    setOscType(type) { 
        console.log('[ZeroOne] setOscType:', type);
        const valid = ['sawtooth', 'square', 'triangle', 'sine', 'pulse'];
        if(valid.includes(type)) this.synth.oscillator.type = type; 
    }
    
    setModWheel(amount) {
        if (!Number.isFinite(amount)) return;
        const total = Math.max(0, Math.min(amount, 1)) * 100;
        this.vibratoDepthNode.gain.rampTo(total, 0.05);
    }
}
