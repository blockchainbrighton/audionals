import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class AnalogSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.state = {
            synth: null,
            activeNotes: [],
            activeKeys: [],
            keyboard: null,
            params: { osc1Oct: 0, osc2Oct: -1, glide: 0 }
        };
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        this.initSynth();
        this.initUI();
        this.startVisualizer();
        
        // MIDI Binding
        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => this.onCC(c, v)
        };
        // Register this synth as the active listener
        // Note: The app shell manages the MidiManager, but we provide the handlers
    }

    unmount() {
        // Cleanup MIDI
        if (this.midiHandler) {
            // Ideally the shell handles unbinding, but we can ensure we stop processing
            this.midiHandler = null;
        }

        // Cleanup Audio
        if (this.state.synth) {
            const s = this.state.synth;
            try {
                s.osc1.dispose(); s.osc2.dispose(); s.noise.dispose();
                s.gain1.dispose(); s.gain2.dispose(); s.gainN.dispose();
                s.filter.dispose(); s.ampEnv.dispose();
                s.filtEnv.dispose(); s.filtEnvScale.dispose();
                s.dist.dispose(); s.delay.dispose(); s.master.dispose();
                s.lfo.dispose(); s.lfoGain.dispose();
                s.wave.dispose();
            } catch(e) { console.warn("Cleanup error", e); }
            this.state.synth = null;
        }

        // Cleanup DOM
        if (this.styleElement) {
            this.styleElement.remove();
        }
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .as-wrapper {
            --bg: #1a1a1a; --panel: #252525; --border: #333;
            --accent: #ff9900; --text: #ddd; --knob: #111;
            font-family: 'Courier New', monospace;
            color: var(--text);
            display: flex; justify-content: center;
            padding: 20px;
        }
        #rack {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
            max-width: 1000px; width: 100%; background: #000;
            padding: 10px; border: 2px solid #444;
            box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }
        .module {
            background: var(--panel); border: 1px solid var(--border);
            padding: 10px; display: flex; flex-direction: column; position: relative;
        }
        .module.wide { grid-column: span 2; }
        .module.full { grid-column: span 4; }
        .header {
            font-size: 0.7rem; color: #888; border-bottom: 1px solid #444;
            margin-bottom: 8px; padding-bottom: 2px; text-transform: uppercase;
            letter-spacing: 1px; display: flex; justify-content: space-between;
        }
        .row { display: flex; justify-content: space-around; align-items: flex-end; gap: 5px; flex: 1; }
        .ctrl { display: flex; flex-direction: column; align-items: center; width: 50px; }
        .ctrl label { font-size: 0.6rem; margin-top: 5px; color: #aaa; text-align: center; }
        
        .knob-wrap { width: 45px; height: 45px; position: relative; }
        .knob {
            width: 100%; height: 100%; border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #444, #111);
            border: 1px solid #555; position: relative; cursor: ns-resize;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .knob::after {
            content: ''; position: absolute; top: 10%; left: 50%;
            width: 2px; height: 40%; background: var(--accent);
            transform: translateX(-50%); pointer-events: none;
        }
        input[type="range"].v-slider {
            -webkit-appearance: slider-vertical; width: 8px; height: 80px; background: transparent;
        }
        select {
            background: #111; color: var(--accent); border: 1px solid #444;
            font-size: 0.7rem; width: 100%; margin-bottom: 5px;
        }
        canvas#scope { width: 100%; height: 60px; background: #000; border: 1px solid #444; }
        #preset-list { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 5px; }
        .p-btn {
            background: #333; border: 1px solid #555; color: #ccc;
            padding: 4px 8px; font-family: inherit; font-size: 0.7rem;
            cursor: pointer; white-space: nowrap;
        }
        .p-btn:hover { border-color: var(--accent); }
        .midi-led {
            width: 8px; height: 8px; background: #300; border-radius: 50%;
            display: inline-block; margin-left: 5px;
        }
        .midi-led.on { background: #f00; box-shadow: 0 0 5px #f00; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="as-wrapper">
            <div id="rack">
                <!-- HEADER -->
                <div class="module full" style="display:flex; flex-direction:row; align-items:center; justify-content:space-between;">
                    <div style="font-weight:bold; font-size:1.2rem; color:var(--accent);">BAM MONO</div>
                    <div style="display:flex; align-items:center; gap:10px; font-size:0.7rem;">
                        MIDI <div id="midi-led" class="midi-led"></div>
                    </div>
                </div>

                <!-- OSC 1 -->
                <div class="module">
                    <div class="header">Oscillator 1</div>
                    <select id="osc1-type">
                        <option value="sawtooth">Sawtooth</option>
                        <option value="square">Square</option>
                        <option value="pulse">Pulse</option>
                        <option value="triangle">Triangle</option>
                    </select>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="osc1-oct" data-min="-2" data-max="2" data-step="1" data-val="0"></div></div><label>Oct</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="osc1-tune" data-min="-1200" data-max="1200" data-val="0"></div></div><label>Tune</label></div>
                    </div>
                </div>

                <!-- OSC 2 -->
                <div class="module">
                    <div class="header">Oscillator 2</div>
                    <select id="osc2-type">
                        <option value="square">Square</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="pulse">Pulse</option>
                        <option value="triangle">Triangle</option>
                    </select>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="osc2-oct" data-min="-2" data-max="2" data-step="1" data-val="-1"></div></div><label>Oct</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="osc2-tune" data-min="-1200" data-max="1200" data-val="7"></div></div><label>Tune</label></div>
                    </div>
                </div>

                <!-- MIXER -->
                <div class="module">
                    <div class="header">Mixer</div>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="mix-osc1" data-min="0" data-max="1" data-val="1"></div></div><label>Osc 1</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="mix-osc2" data-min="0" data-max="1" data-val="0.5"></div></div><label>Osc 2</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="mix-noise" data-min="0" data-max="0.5" data-val="0"></div></div><label>Noise</label></div>
                    </div>
                </div>

                <!-- FILTER -->
                <div class="module">
                    <div class="header">Filter (24dB)</div>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="filt-cut" data-min="50" data-max="12000" data-exp="1" data-val="2000"></div></div><label>Freq</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="filt-res" data-min="0" data-max="20" data-val="1"></div></div><label>Res</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="filt-env-amt" data-min="0" data-max="5000" data-val="2000"></div></div><label>Env</label></div>
                    </div>
                </div>

                <!-- AMP ENV -->
                <div class="module">
                    <div class="header">Amp Env</div>
                    <div class="row">
                        <div class="ctrl"><input type="range" class="v-slider" id="amp-a" min="0.005" max="2" step="0.01" value="0.01"><label>A</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="amp-d" min="0.0" max="2" step="0.01" value="0.1"><label>D</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="amp-s" min="0" max="1" step="0.01" value="1.0"><label>S</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="amp-r" min="0.01" max="4" step="0.01" value="0.1"><label>R</label></div>
                    </div>
                </div>

                <!-- FILT ENV -->
                <div class="module">
                    <div class="header">Filter Env</div>
                    <div class="row">
                        <div class="ctrl"><input type="range" class="v-slider" id="filt-a" min="0.005" max="2" step="0.01" value="0.01"><label>A</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="filt-d" min="0.0" max="2" step="0.01" value="0.2"><label>D</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="filt-s" min="0" max="1" step="0.01" value="0.5"><label>S</label></div>
                        <div class="ctrl"><input type="range" class="v-slider" id="filt-r" min="0.01" max="4" step="0.01" value="0.5"><label>R</label></div>
                    </div>
                </div>

                <!-- MODULATION -->
                <div class="module">
                    <div class="header">Modulation</div>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="lfo-rate" data-min="0.1" data-max="20" data-val="5"></div></div><label>LFO Hz</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="lfo-amt" data-min="0" data-max="1000" data-val="0"></div></div><label>LFO>VCF</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="glide" data-min="0" data-max="0.5" data-val="0"></div></div><label>Glide</label></div>
                    </div>
                </div>

                <!-- FX -->
                <div class="module">
                    <div class="header">Output / FX</div>
                    <div class="row">
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="dist" data-min="0" data-max="1" data-val="0"></div></div><label>Drive</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="delay" data-min="0" data-max="0.6" data-val="0.2"></div></div><label>Delay</label></div>
                        <div class="ctrl"><div class="knob-wrap"><div class="knob" id="vol" data-min="-60" data-max="0" data-val="-10"></div></div><label>Vol</label></div>
                    </div>
                </div>

                <!-- VISUAL & PRESETS -->
                <div class="module full">
                    <div class="header">Visuals & Presets</div>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;"><canvas id="scope"></canvas></div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
                            <div id="preset-list"></div>
                            <div style="font-size: 0.7rem; color: #666;">Click & Drag Keys to Glissando</div>
                        </div>
                    </div>
                </div>

                <!-- KEYBOARD -->
                <div class="module full" style="padding:0; border:none; background:transparent;">
                    <div id="keyboard"></div>
                </div>
            </div>
        </div>`;
    }

    initSynth() {
        const T = this.Tone;
        const s = {};

        // Sources
        s.osc1 = new T.Oscillator(440, "sawtooth").start();
        s.osc2 = new T.Oscillator(440, "square").start();
        s.noise = new T.Noise("pink").start();

        // Gains
        s.gain1 = new T.Gain(0.5);
        s.gain2 = new T.Gain(0.5);
        s.gainN = new T.Gain(0);

        // Filter
        s.filter = new T.Filter({ type: "lowpass", frequency: 2000, rolloff: -24, Q: 1 });

        // VCA & Envelopes
        s.ampEnv = new T.AmplitudeEnvelope({ attack:0.01, decay:0.1, sustain:1, release:0.1 });
        s.filtEnv = new T.Envelope({ attack:0.01, decay:0.2, sustain:0.5, release:0.5 });
        s.filtEnvScale = new T.Gain(2000);

        // FX
        s.dist = new T.Distortion(0);
        s.delay = new T.FeedbackDelay("8n", 0.3); s.delay.wet.value = 0;
        s.master = new T.Volume(-10);
        s.wave = new T.Waveform(1024);

        // Modulators
        s.lfo = new T.LFO(5, 0, 1).start();
        s.lfoGain = new T.Gain(0);

        // Routing
        s.osc1.connect(s.gain1); s.gain1.connect(s.filter);
        s.osc2.connect(s.gain2); s.gain2.connect(s.filter);
        s.noise.connect(s.gainN); s.gainN.connect(s.filter);

        s.filter.connect(s.dist);
        s.dist.connect(s.ampEnv);
        s.ampEnv.connect(s.delay);
        s.delay.connect(s.master);
        s.master.chain(T.Destination, s.wave);

        // Mod Routing
        s.filtEnv.connect(s.filtEnvScale);
        s.filtEnvScale.connect(s.filter.frequency);
        s.lfo.connect(s.lfoGain);
        s.lfoGain.connect(s.filter.frequency);

        this.state.synth = s;
        this.loadPreset(this.presets[0]);
    }

    initUI() {
        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36,
            responsive: true,
            onNoteOn: (m) => this.noteOn(m),
            onNoteOff: (m) => this.noteOff(m)
        });

        // Knobs
        new KnobControl('.knob', {
            onChange: (id, val) => this.updateParam(id, val)
        });

        // Sliders
        this.container.querySelectorAll('input[type="range"]').forEach(s => {
            s.oninput = (e) => this.updateParam(s.id, parseFloat(e.target.value));
        });

        // Selects
        this.container.querySelectorAll('select').forEach(s => {
            if(s.id.startsWith('osc')) {
                s.onchange = (e) => this.updateParam(s.id, e.target.value);
            }
        });

        // Presets
        const pList = this.container.querySelector('#preset-list');
        this.presets.forEach((p) => {
            const btn = document.createElement('button');
            btn.className = 'p-btn';
            btn.innerText = p.name;
            btn.onclick = () => this.loadPreset(p);
            pList.appendChild(btn);
        });
    }

    triggerNote(midi, vel) {
        const s = this.state.synth;
        if (!s) return;
        const T = this.Tone;
        const freq = T.Frequency(midi, "midi").toFrequency();
        const now = T.now();

        const f1 = freq * Math.pow(2, this.state.params.osc1Oct);
        const f2 = freq * Math.pow(2, this.state.params.osc2Oct);

        if (this.state.params.glide > 0 && this.state.activeNotes.length > 0) {
            s.osc1.frequency.rampTo(f1, this.state.params.glide, now);
            s.osc2.frequency.rampTo(f2, this.state.params.glide, now);
        } else {
            s.osc1.frequency.setValueAtTime(f1, now);
            s.osc2.frequency.setValueAtTime(f2, now);
            s.ampEnv.triggerAttack(now, vel);
            s.filtEnv.triggerAttack(now);
        }
    }

    noteOn(midi, vel=1) {
        if(this.state.activeKeys.includes(midi)) return;
        this.state.activeKeys.push(midi);
        this.state.activeNotes.push(midi);
        this.triggerNote(midi, vel);
        if (this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        this.state.activeKeys = this.state.activeKeys.filter(k => k !== midi);
        const idx = this.state.activeNotes.indexOf(midi);
        if(idx > -1) this.state.activeNotes.splice(idx, 1);

        if(this.state.activeNotes.length > 0) {
            const last = this.state.activeNotes[this.state.activeNotes.length-1];
            this.triggerNote(last, 1);
        } else {
            if(this.state.synth) {
                const now = this.Tone.now();
                this.state.synth.ampEnv.triggerRelease(now);
                this.state.synth.filtEnv.triggerRelease(now);
            }
        }
        if (this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    onCC(cc, val) {
        if(cc === 74) { // Cutoff
            const v = 50 + (val * 10000);
            this.updateParam('filt-cut', v);
        }
    }

    updateParam(id, val) {
        const s = this.state.synth;
        if(!s) return;

        switch(id) {
            case 'osc1-type': s.osc1.type = val; break;
            case 'osc1-oct': this.state.params.osc1Oct = val; break;
            case 'osc1-tune': s.osc1.detune.value = val; break;
            
            case 'osc2-type': s.osc2.type = val; break;
            case 'osc2-oct': this.state.params.osc2Oct = val; break;
            case 'osc2-tune': s.osc2.detune.value = val; break;

            case 'mix-osc1': s.gain1.gain.rampTo(val, 0.1); break;
            case 'mix-osc2': s.gain2.gain.rampTo(val, 0.1); break;
            case 'mix-noise': s.gainN.gain.rampTo(val, 0.1); break;

            case 'filt-cut': s.filter.frequency.rampTo(val, 0.1); break;
            case 'filt-res': s.filter.Q.value = val; break;
            case 'filt-env-amt': s.filtEnvScale.gain.value = val; break;

            case 'amp-a': s.ampEnv.attack = val; break;
            case 'amp-d': s.ampEnv.decay = val; break;
            case 'amp-s': s.ampEnv.sustain = val; break;
            case 'amp-r': s.ampEnv.release = val; break;

            case 'filt-a': s.filtEnv.attack = val; break;
            case 'filt-d': s.filtEnv.decay = val; break;
            case 'filt-s': s.filtEnv.sustain = val; break;
            case 'filt-r': s.filtEnv.release = val; break;

            case 'lfo-rate': s.lfo.frequency.value = val; break;
            case 'lfo-amt': s.lfoGain.gain.value = val; break;
            case 'glide': this.state.params.glide = val; break;

            case 'dist': s.dist.distortion = val; break;
            case 'delay': s.delay.wet.value = val; break;
            case 'vol': s.master.volume.value = val; break;
        }
    }

    loadPreset(p) {
        const set = (id, val) => {
            const el = this.container.querySelector('#'+id);
            if(!el) return;
            this.updateParam(id, val);
            if(el.classList.contains('knob')) {
                el.dataset.val = val;
                // Visual update trigger would go here (simplified)
                const min = parseFloat(el.dataset.min);
                const max = parseFloat(el.dataset.max);
                const pct = (val-min)/(max-min); // Rough approx for rebuild
                el.style.transform = `rotate(${-135 + (pct*270)}deg)`;
            } else if(el.tagName === 'SELECT' || el.type === 'range') {
                el.value = val;
            }
        };

        set('osc1-type', p.o1); set('osc2-type', p.o2);
        set('mix-osc1', p.mix1); set('mix-osc2', p.mix2);
        set('filt-cut', p.cut); set('filt-res', p.res); set('filt-env-amt', p.envAmt);
        set('dist', p.dist); set('delay', p.del);
    }

    startVisualizer() {
        const canvas = this.container.querySelector('#scope');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const loop = () => {
            if(!this.state.synth) return; // Stopped
            requestAnimationFrame(loop);
            
            const width = canvas.width = canvas.clientWidth;
            const height = canvas.height = canvas.clientHeight;
            const data = this.state.synth.wave.getValue();
            
            ctx.fillStyle = "#000";
            ctx.fillRect(0,0,width,height);
            ctx.strokeStyle = "#0f0";
            ctx.lineWidth = 2;
            ctx.beginPath();
            const slice = width / data.length;
            let x = 0;
            for(let i=0; i<data.length; i++) {
                const v = data[i];
                const y = (v + 1) / 2 * height;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                x+=slice;
            }
            ctx.stroke();
        };
        loop();
    }
    
    get presets() {
        return [
            { name: "INIT", o1:'sawtooth', o2:'square', mix1:1, mix2:0, cut:2000, res:1, envAmt:1000, dist:0, del:0 },
            { name: "BASS", o1:'square', o2:'triangle', mix1:0.8, mix2:0.8, cut:400, res:5, envAmt:500, dist:0.2, del:0 },
            { name: "LEAD", o1:'sawtooth', o2:'sawtooth', mix1:0.6, mix2:0.6, cut:5000, res:2, envAmt:0, dist:0.4, del:0.3 },
            { name: "ACID", o1:'sawtooth', o2:'square', mix1:1, mix2:0, cut:600, res:15, envAmt:3000, dist:0.8, del:0.2 }
        ];
    }
}
