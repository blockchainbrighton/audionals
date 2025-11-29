import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class OrdOneSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.state = {
            engine: {
                osc1: null, osc2: null, noise: null,
                osc1Gain: null, osc2Gain: null, noiseGain: null,
                filter: null, ampEnv: null, filterEnv: null,
                lfo: null, distortion: null, delay: null, reverb: null,
                master: null, analyser: null, limiter: null,
                lfoGain: null, filterEnvGain: null, ampADSR: null
            },
            activeNotes: [],
            keyboard: null,
            params: {}
        };
        
        this.presets = [
            { name: "Init Mono", params: { osc1Width: 0, osc1Oct: 0, osc2Detune: 0, osc2Oct: 0, volOsc1: 1, volOsc2: 0, volNoise: 0, cutoff: 20000, resonance: 0, filterEnvAmt: 0, fAttack: 0.01, fDecay: 0.1, fSustain: 1, fRelease: 0.1, aAttack: 0.01, aDecay: 0.1, aSustain: 1, aRelease: 0.1, lfoRate: 1, lfoDepth: 0, drive: 0, delayAmt: 0, masterVol: -6, glide: 0 }, types: { 'osc1-type': 'sawtooth', 'osc2-type': 'sawtooth', 'lfo-target': 'pitch' } },
            { name: "Warm Lead", params: { osc1Width: 0, osc1Oct: 0, osc2Detune: 15, osc2Oct: 0, volOsc1: 0.8, volOsc2: 0.8, volNoise: 0, cutoff: 2000, resonance: 2, filterEnvAmt: 1000, fAttack: 0.05, fDecay: 0.5, fSustain: 0.2, fRelease: 0.5, aAttack: 0.05, aDecay: 0.2, aSustain: 0.8, aRelease: 0.5, lfoRate: 5, lfoDepth: 10, drive: 0.2, delayAmt: 0.3, masterVol: -6, glide: 0.1 }, types: { 'osc1-type': 'sawtooth', 'osc2-type': 'sawtooth', 'lfo-target': 'pitch' } },
            { name: "Rubbery Bass", params: { osc1Width: 0.5, osc1Oct: -1, osc2Detune: -5, osc2Oct: -1, volOsc1: 1, volOsc2: 0.6, volNoise: 0, cutoff: 400, resonance: 8, filterEnvAmt: 2000, fAttack: 0.01, fDecay: 0.4, fSustain: 0, fRelease: 0.1, aAttack: 0.01, aDecay: 0.2, aSustain: 1, aRelease: 0.1, lfoRate: 1, lfoDepth: 0, drive: 0.4, delayAmt: 0, masterVol: -3, glide: 0 }, types: { 'osc1-type': 'square', 'osc2-type': 'pulse', 'lfo-target': 'cutoff' } },
            { name: "PWM Sweep", params: { osc1Width: 0.5, osc1Oct: 0, osc2Detune: 5, osc2Oct: 0, volOsc1: 1, volOsc2: 0, volNoise: 0, cutoff: 8000, resonance: 1, filterEnvAmt: 0, fAttack: 0.1, fDecay: 0.1, fSustain: 1, fRelease: 1, aAttack: 0.5, aDecay: 0.5, aSustain: 1, aRelease: 1, lfoRate: 0.5, lfoDepth: 200, drive: 0, delayAmt: 0.4, masterVol: -6, glide: 0 }, types: { 'osc1-type': 'pulse', 'osc2-type': 'pulse', 'lfo-target': 'pwm' } },
            { name: "Acidic Bite", params: { osc1Width: 0, osc1Oct: -1, osc2Detune: 0, osc2Oct: -1, volOsc1: 1, volOsc2: 0, volNoise: 0, cutoff: 300, resonance: 15, filterEnvAmt: 3000, fAttack: 0.01, fDecay: 0.2, fSustain: 0, fRelease: 0.1, aAttack: 0.01, aDecay: 0.2, aSustain: 1, aRelease: 0.1, lfoRate: 0.1, lfoDepth: 0, drive: 0.6, delayAmt: 0.2, masterVol: -3, glide: 0.2 }, types: { 'osc1-type': 'sawtooth', 'osc2-type': 'sawtooth', 'lfo-target': 'cutoff' } }
        ];
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        this.initSynth();
        this.initUI();
        this.startVisuals();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => {
                if(c === 74) this.updateParam('cutoff', v * 150 + 20);
                if(c === 1) this.updateParam('lfoDepth', v * 8);
            }
        };
    }

    unmount() {
        const e = this.state.engine;
        try {
            e.osc1.dispose(); e.osc2.dispose(); e.noise.dispose();
            e.osc1Gain.dispose(); e.osc2Gain.dispose(); e.noiseGain.dispose();
            e.filter.dispose(); e.ampEnv.dispose(); e.distortion.dispose();
            e.delay.dispose(); e.reverb.dispose(); e.limiter.dispose();
            e.master.dispose(); e.analyser.dispose();
            e.filterEnv.dispose(); e.filterEnvGain.dispose(); e.ampADSR.dispose();
            e.lfo.dispose(); e.lfoGain.dispose();
        } catch(e){}
        
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .ord-wrapper {
            --bg-color: #1a1a1a; --panel-bg: #2b2b2b; --text-color: #e0e0e0; --accent-color: #ff9800;
            --knob-color: #111; --led-on: #ff3333; --led-off: #441111; --border-style: 1px solid #444;
            font-family: 'Courier New', Courier, monospace; color: var(--text-color);
            display: flex; flex-direction: column; align-items: center;
        }
        #synth-rack {
            display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: auto auto auto 140px;
            gap: 10px; background: #000; padding: 15px; border: 4px solid #333; border-radius: 8px;
            box-shadow: 0 0 40px rgba(0,0,0,0.8); max-width: 1000px; width: 100%;
        }
        .module { background: var(--panel-bg); border: var(--border-style); padding: 10px; position: relative; display: flex; flex-direction: column; }
        .module h3 { margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #555; padding-bottom: 4px; color: #aaa; text-align: center; }
        .controls-row { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 8px; flex: 1; }
        .control-group { display: flex; flex-direction: column; align-items: center; width: 50px; }
        .label { font-size: 0.6rem; margin-top: 4px; text-align: center; color: #888; }
        .knob-container { width: 40px; height: 40px; position: relative; }
        .knob {
            width: 100%; height: 100%; background: radial-gradient(circle, #333 30%, #111 100%);
            border-radius: 50%; border: 2px solid #555; position: relative; transform: rotate(-135deg);
            box-shadow: 0 2px 5px rgba(0,0,0,0.5); cursor: ns-resize;
        }
        .knob::after {
            content: ''; position: absolute; top: 10%; left: 50%; width: 2px; height: 40%;
            background: var(--accent-color); transform: translateX(-50%);
        }
        #display-module { grid-column: span 1; display: flex; flex-direction: column; justify-content: space-between; }
        canvas#oscilloscope { width: 100%; height: 80px; background: #000; border: 1px solid #444; }
        #keyboard { grid-column: span 4; background: #111; border-top: 2px solid #333; padding-top: 5px; }
        select { background: #000; color: #fff; border: 1px solid #555; width: 100%; font-family: inherit; font-size: 0.7rem; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="ord-wrapper">
            <div id="synth-rack">
                <div class="module" id="display-module">
                    <h3>System</h3>
                    <canvas id="oscilloscope"></canvas>
                    <div style="margin-top: 5px;"><div class="label">PRESET</div><select id="preset-selector"></select></div>
                    <div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="glide" data-min="0" data-max="0.5" data-value="0"></div></div><div class="label">GLIDE</div></div></div>
                </div>
                <div class="module" id="osc1"><h3>Oscillator 1</h3><div class="controls-row"><div class="control-group"><select id="osc1-type" style="width: 40px; font-size: 10px; margin-bottom: 5px;"><option value="sawtooth">SAW</option><option value="square">SQR</option><option value="pulse">PLS</option></select><div class="label">WAVE</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="osc1Width" data-min="0" data-max="0.9" data-value="0"></div></div><div class="label">PWM</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="osc1Oct" data-min="-2" data-max="2" data-step="1" data-value="0"></div></div><div class="label">OCT</div></div></div></div>
                <div class="module" id="osc2"><h3>Oscillator 2</h3><div class="controls-row"><div class="control-group"><select id="osc2-type" style="width: 40px; font-size: 10px; margin-bottom: 5px;"><option value="sawtooth">SAW</option><option value="square">SQR</option><option value="pulse">PLS</option><option value="triangle">TRI</option></select><div class="label">WAVE</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="osc2Detune" data-min="-50" data-max="50" data-value="0"></div></div><div class="label">DETUNE</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="osc2Oct" data-min="-2" data-max="2" data-step="1" data-value="0"></div></div><div class="label">OCT</div></div></div></div>
                <div class="module" id="mixer"><h3>Mixer</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="volOsc1" data-min="0" data-max="1" data-value="1"></div></div><div class="label">OSC 1</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="volOsc2" data-min="0" data-max="1" data-value="0"></div></div><div class="label">OSC 2</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="volNoise" data-min="0" data-max="0.6" data-value="0"></div></div><div class="label">NOISE</div></div></div></div>
                <div class="module" id="filter"><h3>VCF (24dB)</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="cutoff" data-min="20" data-max="20000" data-exp="true" data-value="20000"></div></div><div class="label">FREQ</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="resonance" data-min="0" data-max="20" data-value="0"></div></div><div class="label">RES</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="filterEnvAmt" data-min="0" data-max="5000" data-value="0"></div></div><div class="label">ENV</div></div></div></div>
                <div class="module" id="env-filter"><h3>Filter Env</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="fAttack" data-min="0.005" data-max="2" data-value="0.01"></div></div><div class="label">A</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="fDecay" data-min="0.01" data-max="2" data-value="0.1"></div></div><div class="label">D</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="fSustain" data-min="0" data-max="1" data-value="1"></div></div><div class="label">S</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="fRelease" data-min="0.01" data-max="5" data-value="0.1"></div></div><div class="label">R</div></div></div></div>
                <div class="module" id="env-amp"><h3>Amp Env</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="aAttack" data-min="0.005" data-max="2" data-value="0.01"></div></div><div class="label">A</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="aDecay" data-min="0.01" data-max="2" data-value="0.1"></div></div><div class="label">D</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="aSustain" data-min="0" data-max="1" data-value="1"></div></div><div class="label">S</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="aRelease" data-min="0.01" data-max="5" data-value="0.1"></div></div><div class="label">R</div></div></div></div>
                <div class="module" id="lfo"><h3>LFO</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="lfoRate" data-min="0.1" data-max="20" data-value="1"></div></div><div class="label">RATE</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="lfoDepth" data-min="0" data-max="1000" data-value="0"></div></div><div class="label">DEPTH</div></div><div class="control-group"><select id="lfo-target" style="width: 45px; font-size: 9px; margin-bottom: 5px;"><option value="cutoff">VCF</option><option value="pitch" selected>OSC</option><option value="pwm">PWM</option></select><div class="label">DEST</div></div></div></div>
                <div class="module" id="fx-master"><h3>FX / Master</h3><div class="controls-row"><div class="control-group"><div class="knob-container"><div class="knob" id="drive" data-min="0" data-max="0.8" data-value="0"></div></div><div class="label">DRIVE</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="delayAmt" data-min="0" data-max="0.6" data-value="0"></div></div><div class="label">DLY</div></div><div class="control-group"><div class="knob-container"><div class="knob" id="masterVol" data-min="-30" data-max="0" data-value="-6"></div></div><div class="label">VOL</div></div></div></div>
                <div id="keyboard"></div>
            </div>
        </div>`;
    }

    initSynth() {
        const T = this.Tone;
        const e = this.state.engine;
        e.osc1 = new T.OmniOscillator(440, "sawtooth").start();
        e.osc2 = new T.OmniOscillator(440, "sawtooth").start();
        e.noise = new T.Noise("white").start();
        e.osc1Gain = new T.Gain(0.5); e.osc2Gain = new T.Gain(0.5); e.noiseGain = new T.Gain(0);
        
        e.osc1.connect(e.osc1Gain); e.osc2.connect(e.osc2Gain); e.noise.connect(e.noiseGain);
        e.filter = new T.Filter({ type: "lowpass", frequency: 2000, rolloff: -24, Q: 1 });
        e.ampEnv = new T.Gain(0);
        e.distortion = new T.Distortion(0);
        e.delay = new T.FeedbackDelay("8n", 0.5); e.delay.wet.value = 0;
        e.reverb = new T.Reverb({ decay: 2, wet: 0.1 });
        e.limiter = new T.Limiter(-1);
        e.master = new T.Gain(0.8);
        e.analyser = new T.Analyser("waveform", 256);

        e.osc1Gain.connect(e.filter); e.osc2Gain.connect(e.filter); e.noiseGain.connect(e.filter);
        e.filter.connect(e.distortion); e.distortion.connect(e.ampEnv); e.ampEnv.connect(e.delay);
        e.delay.connect(e.reverb); e.reverb.connect(e.limiter); e.limiter.connect(e.master);
        e.master.connect(T.Destination); e.master.connect(e.analyser);

        e.filterEnv = new T.Envelope({ attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 });
        e.filterEnvGain = new T.Gain(2000);
        e.filterEnv.connect(e.filterEnvGain); e.filterEnvGain.connect(e.filter.frequency);

        e.ampADSR = new T.Envelope({ attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 });
        e.ampADSR.connect(e.ampEnv.gain);

        e.lfo = new T.LFO(5, 0, 1).start();
        e.lfoGain = new T.Gain(0); e.lfo.connect(e.lfoGain);
        
        this.updateEngineType('lfo-target', 'pitch');
        this.loadPreset(this.presets[0]);
    }

    initUI() {
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36, responsive: true,
            onNoteOn: (m) => this.noteOn(m), onNoteOff: (m) => this.noteOff(m)
        });

        new KnobControl('.knob', {
            onChange: (id, val) => this.updateParam(id, val)
        });

        ['osc1-type', 'osc2-type', 'lfo-target'].forEach(id => {
            const el = this.container.querySelector(`#${id}`);
            if(el) el.onchange = (e) => this.updateEngineType(id, e.target.value);
        });

        const sel = this.container.querySelector('#preset-selector');
        this.presets.forEach((p, i) => {
            const opt = document.createElement('option'); opt.value = i; opt.innerText = p.name; sel.appendChild(opt);
        });
        sel.onchange = (e) => this.loadPreset(this.presets[e.target.value]);
    }

    loadPreset(p) {
        for(let k in p.types) { 
            const el = this.container.querySelector(`#${k}`);
            if(el) { el.value = p.types[k]; this.updateEngineType(k, p.types[k]); }
        }
        for(let k in p.params) { 
            this.updateParam(k, p.params[k]);
            const el = this.container.querySelector(`#${k}`);
            if(el) {
                el.dataset.value = p.params[k];
                const min=parseFloat(el.dataset.min), max=parseFloat(el.dataset.max);
                const pct=(p.params[k]-min)/(max-min);
                el.style.transform = `rotate(${-135+pct*270}deg)`;
            }
        }
    }

    updateParam(id, val) {
        const e = this.state.engine;
        this.state.params[id] = val;
        if(!e.osc1) return;
        try {
            switch(id) {
                case 'osc1Width': if(e.osc1.width) e.osc1.width.value = val; break;
                case 'volOsc1': e.osc1Gain.gain.rampTo(val, 0.05); break;
                case 'volOsc2': e.osc2Gain.gain.rampTo(val, 0.05); break;
                case 'volNoise': e.noiseGain.gain.rampTo(val, 0.05); break;
                case 'cutoff': e.filter.frequency.rampTo(val, 0.05); break;
                case 'resonance': e.filter.Q.value = val; break;
                case 'filterEnvAmt': e.filterEnvGain.gain.value = val; break;
                case 'fAttack': e.filterEnv.attack = val; break;
                case 'fDecay': e.filterEnv.decay = val; break;
                case 'fSustain': e.filterEnv.sustain = val; break;
                case 'fRelease': e.filterEnv.release = val; break;
                case 'aAttack': e.ampADSR.attack = val; break;
                case 'aDecay': e.ampADSR.decay = val; break;
                case 'aSustain': e.ampADSR.sustain = val; break;
                case 'aRelease': e.ampADSR.release = val; break;
                case 'lfoRate': e.lfo.frequency.value = val; break;
                case 'lfoDepth': e.lfoGain.gain.value = val; break;
                case 'drive': e.distortion.distortion = val; break;
                case 'delayAmt': e.delay.wet.value = val; break;
                case 'masterVol': e.master.gain.value = Math.pow(10, val/20); break;
            }
        } catch(err) {}
    }

    updateEngineType(id, val) {
        const e = this.state.engine;
        if(id === 'osc1-type') e.osc1.type = val;
        if(id === 'osc2-type') e.osc2.type = val;
        if(id === 'lfo-target') {
            e.lfoGain.disconnect();
            if(val === 'cutoff') e.lfoGain.connect(e.filter.frequency);
            if(val === 'pitch') { e.lfoGain.connect(e.osc1.detune); e.lfoGain.connect(e.osc2.detune); }
            if(val === 'pwm') { 
                if(e.osc1.type === 'pulse') e.lfoGain.connect(e.osc1.width); 
                if(e.osc2.type === 'pulse') e.lfoGain.connect(e.osc2.width); 
            }
        }
    }

    triggerNoteOn(freq, velocity = 1) {
        const T = this.Tone;
        const now = T.now();
        const e = this.state.engine;
        const glide = parseFloat(this.state.params['glide'] || 0);
        const osc1Oct = Math.pow(2, this.state.params['osc1Oct'] || 0);
        const osc2Oct = Math.pow(2, this.state.params['osc2Oct'] || 0);
        const osc2Det = 1 + (this.state.params['osc2Detune'] || 0) / 1000;

        e.osc1.frequency.rampTo(freq * osc1Oct, glide, now);
        e.osc2.frequency.rampTo(freq * osc2Oct * osc2Det, glide, now);
        e.ampADSR.triggerAttack(now, velocity);
        e.filterEnv.triggerAttack(now);
    }

    noteOn(noteNumber, velocity=1) {
        const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
        this.state.activeNotes.push({ note: noteNumber, freq: freq, vel: velocity });
        this.triggerNoteOn(freq, velocity);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(noteNumber, true);
    }

    noteOff(noteNumber) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n.note !== noteNumber);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(noteNumber, false);
        if (this.state.activeNotes.length > 0) {
            const last = this.state.activeNotes[this.state.activeNotes.length - 1];
            this.triggerNoteOn(last.freq, last.vel);
        } else {
            const now = this.Tone.now();
            this.state.engine.ampADSR.triggerRelease(now);
            this.state.engine.filterEnv.triggerRelease(now);
        }
    }

    startVisuals() {
        const canvas = this.container.querySelector('#oscilloscope');
        const ctx = canvas.getContext('2d');
        
        const draw = () => {
            this.state.animationId = requestAnimationFrame(draw);
            if(!this.state.engine.analyser) return;
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
            const values = this.state.engine.analyser.getValue();
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#ff9800'; ctx.beginPath();
            const sliceWidth = canvas.width * 1.0 / values.length; let x = 0;
            for (let i = 0; i < values.length; i++) {
                const v = (values[i] + 1) / 2; const y = v * canvas.height;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); x += sliceWidth;
            }
            ctx.stroke();
        };
        draw();
    }
}
