import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class SynthwaveSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null;

        this.state = {
            audio: {
                layer1: null, layer2: null, sub: null,
                filter: null, chorus: null, delay: null, reverb: null,
                lfo: null
            },
            arp: { active: false, latch: false, notes: [], step: 0, rate: "8n" },
            activeNotes: [],
            keyboard: null,
            animationId: null
        };

        this.presets = [
            { name: "INIT PAD", o1:"sawtooth", o2:"sawtooth", mix:0.5, det:5, sub:0, cut:2000, res:0, env:1000, att:0.5, dec:1, sus:0.8, rel:1.5, ch:0, del:0, rev:0.1 },
            { name: "NEON NIGHTS", o1:"square", o2:"sawtooth", mix:0.6, det:10, sub:0.3, cut:800, res:2, env:1500, att:0.05, dec:0.2, sus:0.4, rel:0.8, ch:0.6, del:0.3, rev:0.4 },
            { name: "BLADE KEYS", o1:"sawtooth", o2:"fatsawtooth", mix:0.4, det:15, sub:0.1, cut:400, res:0, env:300, att:0.02, dec:0.5, sus:0.2, rel:0.5, ch:0.4, del:0.4, rev:0.8 },
            { name: "CHROME HORIZON", o1:"triangle", o2:"square", mix:0.5, det:5, sub:0.5, cut:1200, res:1, env:500, att:1.0, dec:2.0, sus:0.7, rel:3.0, ch:0.8, del:0.5, rev:0.6 },
            { name: "DREAMWAVE", o1:"sawtooth", o2:"triangle", mix:0.3, det:20, sub:0.0, cut:600, res:0, env:200, att:2.0, dec:3.0, sus:0.8, rel:4.0, ch:0.7, del:0.6, rev:0.9 },
            { name: "RETRO PLUCK", o1:"square", o2:"square", mix:0.8, det:0, sub:0.2, cut:2000, res:4, env:3000, att:0.001, dec:0.2, sus:0, rel:0.2, ch:0.2, del:0.4, rev:0.2 },
            { name: "SLOW TAPE", o1:"sawtooth", o2:"sawtooth", mix:0.5, det:30, sub:0, cut:500, res:0, env:0, att:0.8, dec:0.1, sus:1, rel:1.2, ch:1.0, del:0.1, rev:0.5 },
            { name: "LASER KEYS", o1:"fatsawtooth", o2:"fatsawtooth", mix:0.5, det:50, sub:0.2, cut:5000, res:1, env:2000, att:0.01, dec:0.1, sus:0.8, rel:0.2, ch:0.1, del:0.2, rev:0.3 }
        ];
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();

        if (!window.THREE) {
            try {
                const threeModule = await import('https://ordinals.com/content/0d013bb60fc5bf5a6c77da7371b07dc162ebc7d7f3af0ff3bd00ae5f0c546445i0');
                this.THREE = window.THREE || threeModule;
            } catch(e) { console.warn("ThreeJS load failed", e); }
        } else {
            this.THREE = window.THREE;
        }

        this.initAudio();
        this.initArp();
        this.initUI();
        if (this.THREE) this.initVisuals();

        this.midiHandler = {
            noteOn: (n,v) => this.noteOn(n,v),
            noteOff: (n) => this.noteOff(n),
            cc: (c,v) => {
                const norm = v; // MidiManager normalizes to 0-1
                if(c === 1) this.state.audio.lfo.amplitude.value = norm;
                if(c === 74) this.updateParam('cutoff', 20 + norm * 10000);
            }
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        this.Tone.Transport.cancel(); // Clear arp schedule
        
        const a = this.state.audio;
        try {
            [a.layer1, a.layer2, a.sub, a.filter, a.chorus, a.delay, a.reverb, a.lfo].forEach(n => n && n.dispose());
        } catch(e) { console.warn(e); }

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .sw-wrapper {
            --neon-pink: #ff00ff; --neon-cyan: #00ffff; --bg-dark: #050510; --panel-bg: rgba(20, 20, 30, 0.85);
            --knob-size: 45px; --key-white: #e0e0e0; --key-black: #111;
            background-color: var(--bg-dark); color: var(--neon-cyan); font-family: 'Courier New', monospace;
            position: relative; width: 100%; height: 100%; overflow: hidden;
            display: flex; justify-content: center; align-items: center;
        }
        #canvas-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
        #visualizer { width: 100%; height: 100%; }
        #synth-ui {
            position: relative; width: 960px; background: var(--panel-bg);
            border: 2px solid var(--neon-pink); box-shadow: 0 0 30px rgba(255, 0, 255, 0.2);
            border-radius: 12px; padding: 20px; z-index: 10; backdrop-filter: blur(5px);
            display: flex; flex-direction: column; gap: 15px;
        }
        header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--neon-cyan); padding-bottom: 10px; }
        h1 { font-size: 24px; margin: 0; text-shadow: 2px 2px 0px var(--neon-pink); letter-spacing: 4px; font-style: italic; }
        .patch-display { background: #000; border: 1px solid var(--neon-cyan); color: var(--neon-pink); padding: 5px 20px; font-size: 18px; font-weight: bold; text-shadow: 0 0 5px var(--neon-pink); text-align: center; }
        .controls-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
        .module { border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 6px; padding: 10px; background: rgba(0, 0, 0, 0.3); position: relative; }
        .module-title { position: absolute; top: -10px; left: 10px; background: var(--bg-dark); padding: 0 5px; font-size: 10px; color: #888; text-transform: uppercase; }
        .knob-row { display: flex; flex-wrap: wrap; justify-content: space-around; margin-top: 10px; }
        .knob-container { display: flex; flex-direction: column; align-items: center; margin: 5px; }
        .knob {
            width: var(--knob-size); height: var(--knob-size); border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #333, #000); border: 2px solid #444;
            position: relative; cursor: ns-resize; box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        }
        .knob::after {
            content: ''; position: absolute; top: 10%; left: 50%; width: 2px; height: 40%;
            background: var(--neon-cyan); transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 5px var(--neon-cyan);
        }
        .knob.pink::after { background: var(--neon-pink); box-shadow: 0 0 5px var(--neon-pink); }
        .label { font-size: 9px; margin-top: 5px; color: #aaa; }
        .knob-val { font-size: 9px; color: var(--neon-cyan); margin-top: 2px; }
        .wave-select { width: 100%; background: #000; color: var(--neon-cyan); border: 1px solid #444; margin-bottom: 10px; font-family: inherit; font-size: 11px; }
        .btn-toggle { background: #222; border: 1px solid #444; color: #666; padding: 4px 8px; cursor: pointer; font-size: 10px; width: 100%; margin-top: 5px; transition: all 0.2s; }
        .btn-toggle.active { background: var(--neon-pink); color: #fff; border-color: var(--neon-pink); box-shadow: 0 0 10px var(--neon-pink); }
        .preset-strip { grid-column: span 4; display: flex; gap: 5px; background: rgba(0,0,0,0.5); padding: 5px; overflow-x: auto; }
        .preset-btn { background: #111; border: 1px solid var(--neon-cyan); color: var(--neon-cyan); padding: 5px 10px; cursor: pointer; font-family: inherit; font-size: 11px; white-space: nowrap; }
        .preset-btn.active { background: var(--neon-cyan); color: #000; }
        #keyboard { margin-top: 10px; background: #111; border-top: 2px solid var(--neon-pink); }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="sw-wrapper">
            <div id="canvas-container"><canvas id="visualizer"></canvas></div>
            <div id="synth-ui">
                <header>
                    <h1>NEON HORIZON</h1>
                    <div class="patch-display" id="patch-name">INIT PAD</div>
                </header>
                <div class="controls-grid">
                    <!-- OSC -->
                    <div class="module">
                        <div class="module-title">OSCILLATORS</div>
                        <select id="osc1-type" class="wave-select">
                            <option value="sawtooth">Sawtooth</option><option value="square">Square</option><option value="triangle">Triangle</option><option value="sine">Sine</option>
                        </select>
                        <select id="osc2-type" class="wave-select">
                            <option value="sawtooth">Sawtooth</option><option value="square">Square</option><option value="triangle">Triangle</option><option value="fatsawtooth">Super Saw</option>
                        </select>
                        <div class="knob-row">
                            <div class="knob-container" data-param="mix" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-mix"></div><div class="label">Mix</div><div class="knob-val">0.5</div></div>
                            <div class="knob-container" data-param="detune" data-min="0" data-max="50" data-value="10"><div class="knob pink" id="k-detune"></div><div class="label">Detune</div><div class="knob-val">10</div></div>
                            <div class="knob-container" data-param="sub" data-min="0" data-max="1" data-value="0"><div class="knob" id="k-sub"></div><div class="label">Sub Vol</div><div class="knob-val">0</div></div>
                        </div>
                    </div>
                    <!-- FILTER -->
                    <div class="module">
                        <div class="module-title">VCF & ENV</div>
                        <div class="knob-row">
                            <div class="knob-container" data-param="cutoff" data-min="20" data-max="10000" data-exp="true" data-value="2000"><div class="knob pink" id="k-cutoff"></div><div class="label">Cutoff</div><div class="knob-val">2000</div></div>
                            <div class="knob-container" data-param="res" data-min="0" data-max="10" data-value="0"><div class="knob" id="k-res"></div><div class="label">Res</div><div class="knob-val">0</div></div>
                            <div class="knob-container" data-param="filterEnv" data-min="0" data-max="5000" data-value="1000"><div class="knob" id="k-fenv"></div><div class="label">Env Amt</div><div class="knob-val">1000</div></div>
                        </div>
                        <div class="knob-row" style="border-top:1px solid #333; padding-top:5px;">
                            <div class="knob-container" data-param="attack" data-min="0.01" data-max="2" data-value="0.1"><div class="knob" id="k-att"></div><div class="label">A</div><div class="knob-val">0.1</div></div>
                            <div class="knob-container" data-param="decay" data-min="0.1" data-max="2" data-value="0.2"><div class="knob" id="k-dec"></div><div class="label">D</div><div class="knob-val">0.2</div></div>
                            <div class="knob-container" data-param="sustain" data-min="0" data-max="1" data-value="0.5"><div class="knob" id="k-sus"></div><div class="label">S</div><div class="knob-val">0.5</div></div>
                            <div class="knob-container" data-param="release" data-min="0.1" data-max="5" data-value="1"><div class="knob" id="k-rel"></div><div class="label">R</div><div class="knob-val">1</div></div>
                        </div>
                    </div>
                    <!-- FX -->
                    <div class="module">
                        <div class="module-title">EFFECTS</div>
                        <div class="knob-row">
                            <div class="knob-container" data-param="chorus" data-min="0" data-max="1" data-value="0"><div class="knob pink" id="k-chorus"></div><div class="label">Chorus</div><div class="knob-val">0</div></div>
                            <div class="knob-container" data-param="delay" data-min="0" data-max="0.8" data-value="0"><div class="knob" id="k-delay"></div><div class="label">Delay</div><div class="knob-val">0</div></div>
                            <div class="knob-container" data-param="reverb" data-min="0" data-max="1" data-value="0"><div class="knob pink" id="k-reverb"></div><div class="label">Reverb</div><div class="knob-val">0</div></div>
                        </div>
                         <div class="knob-row">
                            <div class="knob-container" data-param="lfoRate" data-min="0.1" data-max="20" data-value="1"><div class="knob" id="k-lfo-rate"></div><div class="label">LFO Hz</div><div class="knob-val">1</div></div>
                            <div class="knob-container" data-param="lfoDepth" data-min="0" data-max="1000" data-value="0"><div class="knob" id="k-lfo-depth"></div><div class="label">LFO>VCF</div><div class="knob-val">0</div></div>
                        </div>
                    </div>
                    <!-- GLOBAL -->
                    <div class="module">
                        <div class="module-title">GLOBAL / ARP</div>
                        <div class="knob-row">
                            <div class="knob-container" data-param="vol" data-min="-60" data-max="0" data-value="-10"><div class="knob" id="k-vol"></div><div class="label">Master</div><div class="knob-val">-10</div></div>
                            <div class="knob-container" data-param="tempo" data-min="60" data-max="180" data-value="120"><div class="knob" id="k-tempo"></div><div class="label">BPM</div><div class="knob-val">120</div></div>
                        </div>
                        <button class="btn-toggle" id="btn-arp">ARP: OFF</button>
                        <button class="btn-toggle" id="btn-latch">LATCH: OFF</button>
                        <select id="arp-rate" class="wave-select" style="margin-top:5px;"><option value="4n">1/4</option><option value="8n" selected>1/8</option><option value="16n">1/16</option></select>
                    </div>
                    <!-- PRESETS -->
                    <div class="preset-strip" id="preset-strip"></div>
                </div>
                <div id="keyboard"></div>
            </div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;
        const a = this.state.audio;

        const limiter = new Tone.Limiter(-1).toDestination();
        a.reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).connect(limiter);
        a.delay = new Tone.PingPongDelay({ delayTime: "8n", feedback: 0.2, wet: 0.2 }).connect(a.reverb);
        a.chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, type: "sine", spread: 180, wet: 0.3 }).connect(a.delay);
        a.filter = new Tone.Filter({ frequency: 2000, type: "lowpass", rolloff: -24 }).connect(a.chorus);
        
        a.lfo = new Tone.LFO(1, 0, 1000).start();
        a.lfo.connect(a.filter.frequency);

        a.layer1 = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 } }).connect(a.filter);
        a.layer2 = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 } }).connect(a.filter);
        a.sub = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 1 }, volume: -10 }).connect(a.filter);
    }

    initArp() {
        const Tone = this.Tone;
        Tone.Transport.scheduleRepeat((time) => {
            const arp = this.state.arp;
            if(!arp.active || arp.notes.length === 0) return;

            const note = arp.notes[arp.step % arp.notes.length];
            const freq = Tone.Frequency(note, "midi");
            const len = "16n";
            
            this.triggerVoices(freq, len, time, 0.8);

            if(this.state.keyboard) {
                this.state.keyboard.triggerVisual(note, true);
                Tone.Draw.schedule(() => this.state.keyboard.triggerVisual(note, false), time + Tone.Time(len).toSeconds());
            }
            arp.step++;
        }, "8n");
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
        this.container.querySelectorAll('.knob-container').forEach(c => {
            const k = c.querySelector('.knob');
            if(k) {
                k.dataset.min = c.dataset.min; k.dataset.max = c.dataset.max; k.dataset.value = c.dataset.value;
            }
        });

        new KnobControl('.knob', {
            onChange: (id, val) => {
                const knob = this.container.querySelector(`#${id}`);
                const container = knob.parentElement;
                const param = container.dataset.param;
                this.updateParam(param, val);
                const disp = container.querySelector('.knob-val');
                if(disp) disp.innerText = Math.round(val*100)/100;
            }
        });

        // Presets
        const pStrip = this.container.querySelector('#preset-strip');
        this.presets.forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.innerText = p.name;
            btn.onclick = () => this.loadPreset(idx);
            pStrip.appendChild(btn);
        });

        // Toggles/Selects
        this.container.querySelector('#osc1-type').onchange = (e) => this.state.audio.layer1.set({ oscillator: { type: e.target.value } });
        this.container.querySelector('#osc2-type').onchange = (e) => this.state.audio.layer2.set({ oscillator: { type: e.target.value } });
        this.container.querySelector('#arp-rate').onchange = (e) => {
            this.state.arp.rate = e.target.value;
            this.Tone.Transport.cancel();
            this.initArp();
            if(this.Tone.Transport.state === 'started') this.Tone.Transport.start();
        };

        const btnArp = this.container.querySelector('#btn-arp');
        btnArp.onclick = () => {
            this.state.arp.active = !this.state.arp.active;
            btnArp.classList.toggle('active');
            btnArp.innerText = `ARP: ${this.state.arp.active ? 'ON' : 'OFF'}`;
            if(this.state.arp.active) this.Tone.Transport.start();
        };

        const btnLatch = this.container.querySelector('#btn-latch');
        btnLatch.onclick = () => {
            this.state.arp.latch = !this.state.arp.latch;
            btnLatch.classList.toggle('active');
            btnLatch.innerText = `LATCH: ${this.state.arp.latch ? 'ON' : 'OFF'}`;
            if(!this.state.arp.latch) this.state.arp.notes = [];
        };

        this.loadPreset(0);
    }

    loadPreset(idx) {
        const p = this.presets[idx];
        this.container.querySelector('#patch-name').innerText = p.name;
        this.container.querySelector('#osc1-type').value = p.o1;
        this.container.querySelector('#osc2-type').value = p.o2;

        const updateK = (param, val) => {
            const c = this.container.querySelector(`.knob-container[data-param="${param}"]`);
            if(c) {
                const k = c.querySelector('.knob');
                k.dataset.value = val;
                // Visual update
                const min=parseFloat(c.dataset.min), max=parseFloat(c.dataset.max);
                const pct = (val-min)/(max-min);
                k.style.transform = `rotate(${-135 + pct*270}deg)`;
                c.querySelector('.knob-val').innerText = Math.round(val*100)/100;
            }
        };

        updateK('mix', p.mix); updateK('detune', p.det); updateK('sub', p.sub);
        updateK('cutoff', p.cut); updateK('res', p.res); updateK('filterEnv', p.env);
        updateK('attack', p.att); updateK('decay', p.dec); updateK('sustain', p.sus); updateK('release', p.rel);
        updateK('chorus', p.ch); updateK('delay', p.del); updateK('reverb', p.rev);

        this.updateParam('mix', p.mix); this.updateParam('detune', p.det); this.updateParam('sub', p.sub);
        this.updateParam('cutoff', p.cut); this.updateParam('res', p.res); this.updateParam('filterEnv', p.env);
        this.updateParam('attack', p.att); this.updateParam('decay', p.dec); this.updateParam('sustain', p.sus); this.updateParam('release', p.rel);
        this.updateParam('chorus', p.ch); this.updateParam('delay', p.del); this.updateParam('reverb', p.rev);
        
        this.state.audio.layer1.set({ oscillator: { type: p.o1 } });
        this.state.audio.layer2.set({ oscillator: { type: p.o2 } });
        
        this.container.querySelectorAll('.preset-btn').forEach((b, i) => b.classList.toggle('active', i===idx));
    }

    updateParam(param, val) {
        const a = this.state.audio;
        const T = this.Tone;
        switch(param) {
            case 'mix': 
                a.layer1.volume.value = -10 + (val > 0.5 ? (0.5 - val) * 20 : 0);
                a.layer2.volume.value = -10 + (val < 0.5 ? (val - 0.5) * 20 : 0);
                break;
            case 'detune': a.layer2.set({ detune: val }); break;
            case 'sub': a.sub.volume.value = -20 + (val * 20); break;
                    case 'cutoff': a.filter.frequency.linearRampTo(Math.max(20, val), 0.1); break;
                    case 'res': a.filter.Q.value = val; break;
                    case 'filterEnv': a.lfo.amplitude.linearRampTo(val / 5000, 0.1); break;            case 'attack': [a.layer1, a.layer2, a.sub].forEach(s => s.set({ envelope: { attack: val } })); break;
            case 'decay': [a.layer1, a.layer2, a.sub].forEach(s => s.set({ envelope: { decay: val } })); break;
            case 'sustain': [a.layer1, a.layer2, a.sub].forEach(s => s.set({ envelope: { sustain: val } })); break;
            case 'release': [a.layer1, a.layer2, a.sub].forEach(s => s.set({ envelope: { release: val } })); break;
            case 'chorus': a.chorus.wet.value = val; break;
            case 'delay': a.delay.wet.value = val; break;
            case 'reverb': a.reverb.wet.value = val; break;
            case 'lfoRate': a.lfo.frequency.value = val; break;
            case 'lfoDepth': a.lfo.min = -val; a.lfo.max = val; break;
            case 'vol': if(val > -60) T.Destination.volume.value = val; else T.Destination.mute = true; break;
            case 'tempo': T.Transport.bpm.value = val; break;
        }
    }

    noteOn(note, velocity=0.7) {
        if(this.state.activeNotes.includes(note)) return;
        this.state.activeNotes.push(note);
        if(this.state.arp.active) {
            if(!this.state.arp.notes.includes(note)) {
                this.state.arp.notes.push(note);
                this.state.arp.notes.sort((a,b) => a-b);
            }
        } else {
            this.triggerVoices(this.Tone.Frequency(note, "midi"), undefined, this.Tone.now(), velocity);
        }
        if(this.state.keyboard) this.state.keyboard.triggerVisual(note, true);
    }

    noteOff(note) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== note);
        if(this.state.arp.active) {
            if(!this.state.arp.latch) {
                this.state.arp.notes = this.state.arp.notes.filter(n => n !== note);
            }
        } else {
            const freq = this.Tone.Frequency(note, "midi");
            [this.state.audio.layer1, this.state.audio.layer2, this.state.audio.sub].forEach(s => s.triggerRelease(freq, this.Tone.now()));
        }
        if(this.state.keyboard) this.state.keyboard.triggerVisual(note, false);
    }

    triggerVoices(freq, duration, time, vel) {
        const a = this.state.audio;
        if(duration) {
             a.layer1.triggerAttackRelease(freq, duration, time, vel);
             a.layer2.triggerAttackRelease(freq, duration, time, vel);
             a.sub.triggerAttackRelease(this.Tone.Frequency(freq).transpose(-12), duration, time, vel);
        } else {
             a.layer1.triggerAttack(freq, time, vel);
             a.layer2.triggerAttack(freq, time, vel);
             a.sub.triggerAttack(this.Tone.Frequency(freq).transpose(-12), time, vel);
        }
    }

    initVisuals() {
        if(!this.THREE) return;
        const THREE = this.THREE;
        const canvas = this.container.querySelector('#visualizer');
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 5, 20);
        camera.lookAt(0, 0, 0);

        const gridGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
        const gridMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.3 });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.rotation.x = -Math.PI / 2;
        scene.add(grid);

        const sunGeo = new THREE.CircleGeometry(15, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(0, 10, -80);
        scene.add(sun);

        const loop = () => {
            this.state.animationId = requestAnimationFrame(loop);
            const w = this.container.clientWidth;
            const h = this.container.clientHeight; // App container usually
            if(canvas.width !== w || canvas.height !== h) {
                renderer.setSize(w, h, false);
                camera.aspect = w / h; camera.updateProjectionMatrix();
            }

            grid.position.z = (Date.now() * 0.01) % 5;
            renderer.render(scene, camera);
        };
        loop();
    }
}
