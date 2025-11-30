import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class JmsTenSynth {
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
        
        // Engine
        this.engine = new JmsEngine(this.Tone.context.rawContext);
        
        this.initUI();
        this.initMidi();
    }

    unmount() {
        if(this.engine) this.engine.panic();
        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    initMidi() {
        this.midiHandler = {
            noteOn: (n, v) => {
                this.engine.triggerNote(n, v);
                if(this.keyboard) this.keyboard.triggerVisual(n, true);
            },
            noteOff: (n) => {
                this.engine.releaseNote(n);
                if(this.keyboard) this.keyboard.triggerVisual(n, false);
            },
            cc: (cc, val) => {
                if(cc === 74) this.updateParamUI('filterCutoff', 20 + (val*19000));
                if(cc === 1) this.updateParamUI('lfoFilterAmount', val);
            }
        };
    }

    injectStyles() {
        const css = `
        .jms-wrapper {
            --main-bg-color: #1a1a1a; --panel-bg-color: #2a2a2a; --knob-color: #333; --knob-indicator: #ccc;
            --knob-active: #ff7700; --text-color: #eee; --label-color: #aaa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: var(--text-color);
            display: flex; flex-direction: column; width: 100%; height: 100%;
        }
        .synth-header { background: #111; padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; }
        .synth-header h1 { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #fff; text-shadow: 0 0 8px rgba(255, 119, 0, 0.4); }
        .preset-bar { background: #222; padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; border-bottom: 1px solid #444; }
        .preset-button { background: #333; border: 1px solid #555; color: #ccc; padding: 6px 12px; font-size: 11px; text-transform: uppercase; cursor: pointer; border-radius: 3px; }
        .preset-button.active { background: var(--knob-active); color: #000; border-color: var(--knob-active); }
        .synth-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; padding: 20px; flex: 1; overflow-y: auto; }
        .module { background: rgba(0, 0, 0, 0.2); border: 1px solid #3a3a3a; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; box-shadow: inset 0 0 10px rgba(0,0,0,0.3); }
        .module-title { font-size: 11px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #444; padding-bottom: 5px; }
        .controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 5px; align-items: start; }
        .control-wrapper { display: flex; flex-direction: column; align-items: center; }
        .knob-container { position: relative; width: 50px; height: 50px; margin-bottom: 5px; }
        .knob { width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(var(--knob-active) 0deg, var(--knob-color) 0deg); position: relative; cursor: ns-resize; box-shadow: 0 4px 6px rgba(0,0,0,0.5); transform: rotate(-135deg); }
        .knob::after { content: ''; position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; background: linear-gradient(to bottom, #444, #1a1a1a); border-radius: 50%; }
        .knob::before { content: ''; position: absolute; top: 5px; left: 50%; width: 2px; height: 12px; background: var(--knob-indicator); transform: translateX(-50%); z-index: 2; }
        .knob-label { font-size: 10px; color: var(--label-color); text-align: center; margin-top: 2px; }
        select.dropdown { background: #111; color: #ccc; border: 1px solid #444; font-size: 10px; padding: 3px; border-radius: 3px; outline: none; }
        .switch-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
        .toggle-switch { appearance: none; width: 30px; height: 16px; background: #444; border-radius: 10px; position: relative; outline: none; cursor: pointer; }
        .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: #ccc; border-radius: 50%; transition: 0.2s; }
        .toggle-switch:checked { background: var(--knob-active); }
        .toggle-switch:checked::after { transform: translateX(14px); background: #fff; }
        #keyboard { margin-top: 10px; background: #111; padding-top: 5px; border-top: 2px solid #333; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="jms-wrapper">
            <div class="synth-header"><h1>JMS-TEN<span>+</span></h1></div>
            <div class="preset-bar" id="preset-bar"></div>
            <div class="synth-panel">
                <!-- VCO -->
                <div class="module"><div class="module-title">VCO</div><div class="controls-grid">
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-footage" data-param="footage" data-min="0" data-max="3" data-step="1" data-value="1"></div></div><div class="knob-label">Footage</div></div>
                    <div class="control-wrapper"><select class="dropdown" id="ctrl-waveform" data-param="waveform"><option value="triangle">Tri</option><option value="sawtooth" selected>Saw</option><option value="square">Pulse</option></select><div class="knob-label">Waveform</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-pulsewidth" data-param="pulseWidth" data-min="0.05" data-max="0.95" data-value="0.5"></div></div><div class="knob-label">PW</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-noise" data-param="noiseLevel" data-min="0" data-max="0.5" data-value="0"></div></div><div class="knob-label">Noise</div></div>
                </div></div>
                <!-- VCF -->
                <div class="module"><div class="module-title">VCF</div><div class="controls-grid">
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-cutoff" data-param="filterCutoff" data-min="20" data-max="20000" data-log="true" data-value="2000"></div></div><div class="knob-label">Cutoff</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-resonance" data-param="filterResonance" data-min="0" data-max="25" data-value="1"></div></div><div class="knob-label">Peak</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-filtermod" data-param="filterModAmount" data-min="0" data-max="1" data-value="0.5"></div></div><div class="knob-label">EG Mod</div></div>
                    <div class="switch-wrap"><input type="checkbox" class="toggle-switch" id="ctrl-hp" data-param="hpFilter"><div class="knob-label">HPF</div></div>
                </div></div>
                <!-- MOD -->
                <div class="module"><div class="module-title">LFO</div><div class="controls-grid">
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-lforate" data-param="lfoRate" data-min="0.1" data-max="20" data-log="true" data-value="5"></div></div><div class="knob-label">Freq</div></div>
                    <div class="control-wrapper"><select class="dropdown" id="ctrl-lfotype" data-param="lfoType"><option value="triangle" selected>Tri</option><option value="square">Sqr</option><option value="sawtooth">Saw</option></select><div class="knob-label">Wave</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-pitchmod" data-param="pitchModAmount" data-min="0" data-max="1" data-value="0"></div></div><div class="knob-label">P Mod</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-lfo-filter" data-param="lfoFilterAmount" data-min="0" data-max="1" data-value="0"></div></div><div class="knob-label">F Mod</div></div>
                </div></div>
                <!-- ENV -->
                <div class="module"><div class="module-title">EG</div><div class="controls-grid">
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-attack" data-param="attack" data-min="0.005" data-max="3" data-log="true" data-value="0.01"></div></div><div class="knob-label">A</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-decay" data-param="decay" data-min="0.005" data-max="3" data-log="true" data-value="0.2"></div></div><div class="knob-label">D</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-sustain" data-param="sustain" data-min="0" data-max="1" data-value="0.6"></div></div><div class="knob-label">S</div></div>
                    <div class="control-wrapper"><div class="knob-container"><div class="knob" id="ctrl-release" data-param="release" data-min="0.005" data-max="5" data-log="true" data-value="0.3"></div></div><div class="knob-label">R</div></div>
                </div></div>
                <!-- OUT -->
                <div class="module"><div class="module-title">OUT</div><div class="control-wrapper">
                    <div class="knob-container"><div class="knob" id="ctrl-volume" data-param="masterVolume" data-min="0" data-max="1" data-value="0.5"></div></div>
                    <div class="knob-label">Vol</div>
                </div></div>
            </div>
            <div id="keyboard"></div>
        </div>`;
    }

    initUI() {
        // Keyboard
        this.keyboard = new SynthKeyboard('keyboard', {
            startNote: 48,
            responsive: true,
            onNoteOn: (n) => this.engine.triggerNote(n, 1),
            onNoteOff: (n) => this.engine.releaseNote(n)
        });

        // Knobs
        new KnobControl('.knob', {
            onChange: (id, val) => {
                const knob = this.container.querySelector(`#${id}`);
                const param = knob.dataset.param;
                this.updateKnobVisual(knob, val);
                this.engine.updateParam(param, val);
            }
        });

        // Selects
        this.container.querySelectorAll('select[data-param]').forEach(s => {
            s.onchange = (e) => this.engine.updateParam(s.dataset.param, e.target.value);
        });
        // Switches
        this.container.querySelectorAll('input[type="checkbox"]').forEach(c => {
            c.onchange = (e) => this.engine.updateParam(c.dataset.param, e.target.checked);
        });

        // Presets
        const PRESETS = [
            { name: "BASS LEAD", params: { footage: 0, waveform: 'sawtooth', filterCutoff: 180, filterResonance: 4, filterModAmount: 0.6, attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2 } },
            { name: "PLUCK", params: { footage: 1, waveform: 'square', filterCutoff: 1500, filterResonance: 2, filterModAmount: 0.8, attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 } },
            { name: "SWEEP", params: { footage: 2, waveform: 'sawtooth', filterCutoff: 100, filterResonance: 15, filterModAmount: 0.9, attack: 1.5, decay: 0.5, sustain: 0.8, release: 1.5, lfoFilterAmount:0.2, lfoRate:4 } },
            { name: "ORGAN", params: { footage: 1, waveform: 'triangle', filterCutoff: 8000, filterResonance: 0, filterModAmount: 0, attack: 0.05, decay: 0.1, sustain: 1.0, release: 0.05, pitchModAmount:0.02, lfoRate:6 } },
            { name: "LASER FX", params: { footage: 1, waveform: 'sawtooth', filterCutoff: 500, filterResonance: 20, filterModAmount: 1, attack: 0.005, decay: 0.2, sustain: 0, release: 0.1, pitchModAmount:0.8, lfoRate:15, lfoType:'sawtooth', hpFilter:true } }
        ];

        const bar = this.container.querySelector('#preset-bar');
        PRESETS.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'preset-button';
            btn.innerText = p.name;
            btn.onclick = () => this.loadPreset(p);
            bar.appendChild(btn);
        });
        this.loadPreset(PRESETS[0]);
    }

    loadPreset(p) {
        Object.keys(p.params).forEach(key => {
            const val = p.params[key];
            const knob = this.container.querySelector(`.knob[data-param="${key}"]`);
            if(knob) { knob.dataset.value = val; this.updateKnobVisual(knob, val); }
            const sel = this.container.querySelector(`select[data-param="${key}"]`);
            if(sel) sel.value = val;
            const chk = this.container.querySelector(`input[type="checkbox"][data-param="${key}"]`);
            if(chk) chk.checked = val;
            this.engine.updateParam(key, val);
        });
        this.container.querySelectorAll('.preset-button').forEach(b => b.classList.toggle('active', b.innerText === p.name));
    }

    updateKnobVisual(knob, val) {
        const min = parseFloat(knob.dataset.min); const max = parseFloat(knob.dataset.max);
        const log = knob.dataset.log === "true";
        let pct;
        if (log) {
            const minLog = Math.log(min), maxLog = Math.log(max), valLog = Math.log(val);
            pct = (valLog - minLog) / (maxLog - minLog);
        } else {
            pct = (val - min) / (max - min);
        }
        const deg = -135 + (pct * 270);
        knob.style.transform = `rotate(${deg}deg)`;
        const fillDeg = pct * 270; 
        knob.style.background = `conic-gradient(var(--knob-active) ${fillDeg}deg, var(--knob-color) 0deg)`;
    }

    updateParamUI(param, val) {
        const knob = this.container.querySelector(`.knob[data-param="${param}"]`);
        if(knob) {
            knob.dataset.value = val;
            this.updateKnobVisual(knob, val);
            this.engine.updateParam(param, val);
        }
    }
}

class JmsEngine {
    constructor(ctx) {
        this.ctx = ctx;
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.limiter = ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -3; this.limiter.ratio.value = 12;
        this.masterGain.connect(this.limiter); this.limiter.connect(ctx.destination);
        this.activeNotes = new Map();
        this.params = { waveform: 'sawtooth', footage: 1, pulseWidth: 0.5, noiseLevel: 0, filterCutoff: 2000, filterResonance: 1, filterModAmount: 0.5, hpFilter: false, lfoRate: 5, lfoType: 'triangle', pitchModAmount: 0, lfoFilterAmount: 0, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3, masterVolume: 0.5 };
        this.lfo = ctx.createOscillator(); this.lfo.start();
        this.noiseBuffer = this._createNoiseBuffer();
    }
    _createNoiseBuffer() {
        const size = this.ctx.sampleRate * 2; const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0); for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }
    updateParam(key, value) {
        this.params[key] = value;
        if (key === 'lfoRate') this.lfo.frequency.setValueAtTime(value, this.ctx.currentTime);
        if (key === 'lfoType') this.lfo.type = value;
        if (key === 'masterVolume') this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
        this.activeNotes.forEach(note => {
            if(key === 'filterCutoff') note.filter.frequency.setTargetAtTime(value, this.ctx.currentTime, 0.1);
            if(key === 'filterResonance') note.filter.Q.setTargetAtTime(value, this.ctx.currentTime, 0.1);
        });
    }
    triggerNote(noteId, velocity = 1) {
        const osc = this.ctx.createOscillator(); osc.type = this.params.waveform;
        const shifts = [-2, -1, 0, 1]; const shift = shifts[Math.floor(this.params.footage)] || 0;
        osc.frequency.value = 440 * Math.pow(2, (noteId - 69 + (shift * 12)) / 12);
        
        const noiseSrc = this.ctx.createBufferSource(); noiseSrc.buffer = this.noiseBuffer; noiseSrc.loop = true;
        const noiseGain = this.ctx.createGain(); noiseGain.gain.value = this.params.noiseLevel; noiseSrc.connect(noiseGain);
        
        const filter = this.ctx.createBiquadFilter(); filter.type = this.params.hpFilter ? 'highpass' : 'lowpass';
        filter.frequency.value = this.params.filterCutoff; filter.Q.value = this.params.filterResonance;
        
        const vca = this.ctx.createGain(); vca.gain.value = 0;
        osc.connect(filter); noiseSrc.start(); noiseGain.connect(filter); filter.connect(vca); vca.connect(this.masterGain);
        
        const pitchModGain = this.ctx.createGain(); pitchModGain.gain.value = this.params.pitchModAmount * 100; this.lfo.connect(pitchModGain); pitchModGain.connect(osc.detune);
        const filterLfoGain = this.ctx.createGain(); filterLfoGain.gain.value = this.params.lfoFilterAmount * 1000; this.lfo.connect(filterLfoGain); filterLfoGain.connect(filter.frequency);
        
        const now = this.ctx.currentTime; const { attack, decay, sustain } = this.params;
        vca.gain.cancelScheduledValues(now); vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(velocity, now + attack); vca.gain.exponentialRampToValueAtTime(Math.max(0.01, velocity * sustain), now + attack + decay);
        
        filter.frequency.cancelScheduledValues(now); filter.frequency.setValueAtTime(this.params.filterCutoff, now);
        if (this.params.filterModAmount > 0) {
            const peak = Math.min(22000, this.params.filterCutoff + (this.params.filterModAmount * 4000));
            const sus = Math.min(22000, this.params.filterCutoff + (this.params.filterModAmount * 4000 * sustain));
            filter.frequency.linearRampToValueAtTime(peak, now + attack); filter.frequency.exponentialRampToValueAtTime(Math.max(20, sus), now + attack + decay);
        }
        osc.start(now);
        this.activeNotes.set(noteId, { osc, noiseSrc, noiseGain, filter, vca, pitchModGain, filterLfoGain });
    }
    releaseNote(noteId) {
        const note = this.activeNotes.get(noteId); if (!note) return;
        const now = this.ctx.currentTime; const { release } = this.params;
        note.vca.gain.cancelScheduledValues(now); note.vca.gain.setValueAtTime(note.vca.gain.value, now); note.vca.gain.exponentialRampToValueAtTime(0.001, now + release);
        note.filter.frequency.cancelScheduledValues(now); note.filter.frequency.setValueAtTime(note.filter.frequency.value, now); note.filter.frequency.exponentialRampToValueAtTime(this.params.filterCutoff, now + release);
        note.osc.stop(now + release + 0.1); note.noiseSrc.stop(now + release + 0.1);
        setTimeout(() => { note.pitchModGain.disconnect(); note.filterLfoGain.disconnect(); }, (release + 0.2) * 1000);
        this.activeNotes.delete(noteId);
    }
    panic() { this.activeNotes.forEach(n => { try{n.osc.stop(); n.noiseSrc.stop();}catch(e){} }); this.activeNotes.clear(); }
}
