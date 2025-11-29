import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class FMAMSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null;

        this.state = {
            synth: null,
            fx: { filter: null, tremolo: null, chorus: null, delay: null, reverb: null, limiter: null },
            analyser: null,
            activeNotes: [],
            keyboard: null,
            animationId: null
        };

        this.presets = [
            { name: "Init EP", harmonicity: 1, modIndex: 5, detune: 0, cutoff: 3000, env: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 1.0 }, fx: { chorus: 0.2, reverb: 0.2, delay: 0, tremolo: 0 } },
            { name: "Classic DX", harmonicity: 14, modIndex: 2, detune: 5, cutoff: 5000, env: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.4 }, fx: { chorus: 0.5, reverb: 0.3, delay: 0.1, tremolo: 0 } },
            { name: "Glass Bells", harmonicity: 3.5, modIndex: 10, detune: 0, cutoff: 4000, env: { attack: 0.05, decay: 1, sustain: 0.4, release: 3 }, fx: { chorus: 0.1, reverb: 0.6, delay: 0.3, tremolo: 0.5 } },
            { name: "Tine Keys", harmonicity: 4, modIndex: 15, detune: -2, cutoff: 1500, env: { attack: 0.005, decay: 0.5, sustain: 0.3, release: 0.5 }, fx: { chorus: 0.4, reverb: 0.2, delay: 0, tremolo: 0.7 } },
            { name: "Digital Roads", harmonicity: 1, modIndex: 20, detune: 4, cutoff: 800, env: { attack: 0.01, decay: 0.5, sustain: 0.8, release: 0.8 }, fx: { chorus: 0.8, reverb: 0.3, delay: 0.2, tremolo: 0.4 } },
            { name: "Lofi Warp", harmonicity: 0.5, modIndex: 40, detune: 20, cutoff: 600, env: { attack: 0.1, decay: 0.2, sustain: 1, release: 2 }, fx: { chorus: 0, reverb: 0.1, delay: 0.4, tremolo: 0.9 } },
            { name: "Bright FM", harmonicity: 2, modIndex: 8, detune: 10, cutoff: 5000, env: { attack: 0.001, decay: 0.5, sustain: 0.5, release: 0.5 }, fx: { chorus: 0.3, reverb: 0.2, delay: 0, tremolo: 0 } },
            { name: "Deep Pad", harmonicity: 1.01, modIndex: 3, detune: -10, cutoff: 1000, env: { attack: 1.5, decay: 1, sustain: 1, release: 3 }, fx: { chorus: 0.5, reverb: 0.8, delay: 0.4, tremolo: 0.2 } }
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
            } catch(e) { console.warn("ThreeJS load failed"); }
        } else {
            this.THREE = window.THREE;
        }

        await this.initAudio();
        this.initUI();
        this.initVisuals();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => this.onCC(c, v)
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        const s = this.state;
        try {
            if(s.synth) s.synth.dispose();
            if(s.fx.filter) s.fx.filter.dispose();
            if(s.fx.tremolo) s.fx.tremolo.dispose();
            if(s.fx.chorus) s.fx.chorus.dispose();
            if(s.fx.delay) s.fx.delay.dispose();
            if(s.fx.reverb) s.fx.reverb.dispose();
            if(s.analyser) s.analyser.dispose();
        } catch(e) {}

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .fm-wrapper {
            --bg-dark: #121216; --bg-panel: #1e1e24; --accent-main: #00d4ff;
            --accent-glow: #00d4ff88; --accent-sec: #d900ff; --text-main: #e0e0e0;
            --text-dim: #777;
            background-color: var(--bg-dark); color: var(--text-main);
            font-family: 'Courier New', Courier, monospace;
            display: flex; flex-direction: column; width: 100%; height: 100%;
            min-height: 600px;
        }
        .fm-header {
            height: 50px; border-bottom: 1px solid #333; display: flex;
            align-items: center; padding: 0 20px; justify-content: space-between;
            background: #000;
        }
        .fm-header h1 { margin: 0; font-size: 1.2rem; color: var(--accent-main); text-shadow: 0 0 5px var(--accent-glow); }
        .synth-panel {
            flex: 1; display: grid; grid-template-columns: 200px 1fr 250px;
            gap: 2px; background: #000; overflow: hidden;
        }
        @media(max-width: 900px) { .synth-panel { grid-template-columns: 1fr; overflow-y: auto; } }
        .panel-section { background: var(--bg-panel); padding: 15px; display: flex; flex-direction: column; overflow-y: auto; }
        .control-group { border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        .group-title { font-size: 0.7rem; color: var(--accent-main); margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px; }
        .controls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 15px; }
        .knob-container { display: flex; flex-direction: column; align-items: center; }
        .fm-range { -webkit-appearance: none; width: 100%; background: transparent; }
        .fm-range::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: var(--accent-main); cursor: pointer; margin-top: -6px; }
        .fm-range::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #444; border-radius: 2px; }
        .knob-label { font-size: 0.7rem; margin-top: 5px; text-align: center; color: #aaa; }
        .knob-val { font-size: 0.6rem; color: var(--accent-main); }
        #preset-list { list-style: none; padding: 0; margin: 0; }
        .preset-item { padding: 8px; border-bottom: 1px solid #333; cursor: pointer; font-size: 0.8rem; }
        .preset-item:hover { background: #333; }
        .preset-item.active { color: var(--accent-main); border-left: 3px solid var(--accent-main); background: #222; }
        #visualizer-container { width: 100%; height: 120px; background: #000; margin-bottom: 10px; border: 1px solid #333; }
        #keyboard-container { margin-top: 10px; border-top: 4px solid #000; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="fm-wrapper">
            <header class="fm-header">
                <h1>FM / AM <span style="font-size:0.7em; color:#777;">// DX POLY</span></h1>
            </header>

            <div class="synth-panel">
                <!-- LEFT -->
                <div class="panel-section" style="border-right: 1px solid #000;">
                    <div id="visualizer-container"></div>
                    <div class="control-group">
                        <div class="group-title">PATCHES</div>
                        <ul id="preset-list"></ul>
                    </div>
                </div>

                <!-- CENTER -->
                <div class="panel-section">
                    <div class="control-group">
                        <div class="group-title">FM OPERATORS & TIMBRE</div>
                        <div class="controls-grid">
                            <div class="knob-container"><input type="range" class="fm-range" id="harmonicity" min="0.1" max="10" step="0.1" value="1"><span class="knob-label">RATIO</span><span class="knob-val" id="val-harmonicity">1.0</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="modIndex" min="0" max="50" step="0.1" value="10"><span class="knob-label">INDEX</span><span class="knob-val" id="val-modIndex">10</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="detune" min="-100" max="100" value="0"><span class="knob-label">DETUNE</span><span class="knob-val" id="val-detune">0</span></div>
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="group-title">ENVELOPES</div>
                        <div class="controls-grid">
                            <div class="knob-container"><input type="range" class="fm-range" id="envAttack" min="0.001" max="2" step="0.01" value="0.01"><span class="knob-label">ATTACK</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="envDecay" min="0.1" max="5" step="0.1" value="0.5"><span class="knob-label">DECAY</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="envSustain" min="0" max="1" step="0.01" value="0.5"><span class="knob-label">SUSTAIN</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="envRelease" min="0.1" max="5" step="0.1" value="1"><span class="knob-label">RELEASE</span></div>
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="group-title">FILTER</div>
                        <div class="controls-grid">
                            <div class="knob-container"><input type="range" class="fm-range" id="cutoff" min="100" max="5000" step="10" value="2000"><span class="knob-label">CUTOFF</span></div>
                            <div class="knob-container"><input type="range" class="fm-range" id="resonance" min="0" max="20" step="0.5" value="1"><span class="knob-label">RES</span></div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT -->
                <div class="panel-section" style="border-left: 1px solid #000;">
                    <div class="control-group">
                        <div class="group-title">GLOBAL</div>
                        <div class="knob-container"><input type="range" class="fm-range" id="bpm" min="60" max="180" value="120"><span class="knob-label">BPM</span><span class="knob-val" id="val-bpm">120</span></div>
                        <div class="knob-container" style="margin-top:10px;"><input type="range" class="fm-range" id="masterVol" min="-60" max="0" value="-10"><span class="knob-label">VOLUME</span></div>
                    </div>
                    <div class="control-group">
                        <div class="group-title">EFFECTS CHAIN</div>
                        <div class="knob-container"><span class="knob-label">CHORUS DEPTH</span><input type="range" class="fm-range" id="chorusDepth" min="0" max="1" step="0.01" value="0"></div>
                        <div class="knob-container" style="margin-top:5px"><span class="knob-label">TREMOLO RATE</span><input type="range" class="fm-range" id="tremoloRate" min="1" max="16" step="1" value="4"><span class="knob-val" id="val-tremoloRate">4n</span></div>
                        <div class="knob-container" style="margin-top:5px"><span class="knob-label">DELAY MIX</span><input type="range" class="fm-range" id="delayWet" min="0" max="1" step="0.01" value="0"></div>
                        <div class="knob-container" style="margin-top:5px"><span class="knob-label">REVERB MIX</span><input type="range" class="fm-range" id="reverbWet" min="0" max="1" step="0.01" value="0.2"></div>
                    </div>
                </div>
            </div>
            
            <div id="keyboard-container"></div>
        </div>`;
    }

    async initAudio() {
        const T = this.Tone;
        
        const filter = new T.Filter({ type: "lowpass", frequency: 2000, rolloff: -12, Q: 1 });
        const tremolo = new T.Tremolo({ frequency: "4n", depth: 0, spread: 0 }).start();
        const chorus = new T.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0, feedback: 0.1, spread: 180 }).start();
        const delay = new T.FeedbackDelay({ delayTime: "8n.", feedback: 0.3, wet: 0 });
        const reverb = new T.Reverb({ decay: 3, wet: 0.2, preDelay: 0.01 });
        await reverb.generate();
        
        const limiter = new T.Limiter(-1);
        const master = new T.Volume(-10).toDestination();

        this.state.synth = new T.PolySynth(T.FMSynth, {
            maxPolyphony: 10,
            voice: {
                harmonicity: 1, modulationIndex: 10, detune: 0, oscillator: { type: "sine" },
                modulation: { type: "sine" },
                modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 1.0, release: 0.5 },
                envelope: { attack: 0.01, decay: 0.5, sustain: 0.8, release: 1 }
            }
        });

        this.state.synth.chain(filter, tremolo, chorus, delay, reverb, limiter, master);
        this.state.analyser = new T.Analyser("fft", 256);
        master.connect(this.state.analyser);
        
        this.state.fx = { filter, tremolo, chorus, delay, reverb, limiter, master };
    }

    initUI() {
        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard-container', {
            startNote: 48, responsive: true,
            onNoteOn: (m) => this.noteOn(m), onNoteOff: (m) => this.noteOff(m)
        });

        // Presets
        const list = this.container.querySelector('#preset-list');
        this.presets.forEach((p, i) => {
            const li = document.createElement('li');
            li.className = 'preset-item';
            li.innerText = `${i+1}. ${p.name}`;
            li.onclick = () => this.loadPreset(i);
            list.appendChild(li);
        });

        // Binds
        const bind = (id, fn) => {
            const el = this.container.querySelector(`#${id}`);
            if(el) el.oninput = (e) => fn(parseFloat(e.target.value));
        };

        bind('harmonicity', (v) => { this.state.synth.set({ harmonicity: v }); this.updateLabel('val-harmonicity', v); });
        bind('modIndex', (v) => { this.state.synth.set({ modulationIndex: v }); this.updateLabel('val-modIndex', v); });
        bind('detune', (v) => { this.state.synth.set({ detune: v }); this.updateLabel('val-detune', v); });
        
        const setEnv = (param, v) => this.state.synth.set({ envelope: {[param]:v}, modulationEnvelope: {[param]:v} });
        bind('envAttack', v => setEnv('attack', v));
        bind('envDecay', v => setEnv('decay', v));
        bind('envSustain', v => setEnv('sustain', v));
        bind('envRelease', v => setEnv('release', v));

        bind('cutoff', v => this.state.fx.filter.frequency.rampTo(v, 0.1));
        bind('resonance', v => this.state.fx.filter.Q.value = v);
        bind('chorusDepth', v => this.state.fx.chorus.depth = v);
        bind('delayWet', v => this.state.fx.delay.wet.value = v);
        bind('reverbWet', v => this.state.fx.reverb.wet.value = v);
        bind('masterVol', v => this.state.fx.master.volume.value = v);
        bind('bpm', v => { this.Tone.Transport.bpm.value = v; this.updateLabel('val-bpm', v); });

        const tremEl = this.container.querySelector('#tremoloRate');
        const rates = ['1m', '2n', '4n', '4t', '8n', '8t', '16n', '32n'];
        tremEl.max = rates.length - 1;
        tremEl.oninput = (e) => {
            const r = rates[parseInt(e.target.value)];
            this.state.fx.tremolo.frequency.value = r;
            this.updateLabel('val-tremoloRate', r);
        };

        this.loadPreset(0);
    }

    loadPreset(idx) {
        const p = this.presets[idx];
        this.container.querySelectorAll('.preset-item').forEach((el, i) => el.classList.toggle('active', i===idx));
        
        this.state.synth.set({
            harmonicity: p.harmonicity, modulationIndex: p.modIndex, detune: p.detune,
            envelope: p.env, modulationEnvelope: p.env
        });

        const setUI = (id, v) => { const el = this.container.querySelector(`#${id}`); if(el) el.value = v; };
        setUI('harmonicity', p.harmonicity); setUI('modIndex', p.modIndex); setUI('detune', p.detune);
        setUI('envAttack', p.env.attack); setUI('envDecay', p.env.decay); setUI('envSustain', p.env.sustain); setUI('envRelease', p.env.release);
        setUI('cutoff', p.cutoff); setUI('chorusDepth', p.fx.chorus); setUI('delayWet', p.fx.delay); setUI('reverbWet', p.fx.reverb ?? p.fx.fx_reverb);

        this.state.fx.filter.frequency.rampTo(p.cutoff, 0.1);
        this.state.fx.chorus.depth = p.fx.chorus;
        if(this.state.fx.tremolo.depth.rampTo) this.state.fx.tremolo.depth.rampTo(p.fx.tremolo, 0.1); else this.state.fx.tremolo.depth.value = p.fx.tremolo;
        this.state.fx.delay.wet.value = p.fx.delay;
        this.state.fx.reverb.wet.value = p.fx.reverb ?? p.fx.fx_reverb;

        this.updateLabel('val-harmonicity', p.harmonicity);
        this.updateLabel('val-modIndex', p.modIndex);
        this.updateLabel('val-detune', p.detune);
    }

    updateLabel(id, val) {
        const el = this.container.querySelector(`#${id}`);
        if(el) el.innerText = val;
    }

    noteOn(midi, velocity=1) {
        if(this.state.activeNotes.includes(midi)) return;
        this.state.activeNotes.push(midi);
        this.state.synth.triggerAttack(this.Tone.Frequency(midi, "midi"), this.Tone.now(), velocity);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== midi);
        this.state.synth.triggerRelease(this.Tone.Frequency(midi, "midi"));
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    onCC(cc, val) {
        const norm = val; 
        if(cc === 1) this.state.fx.tremolo.depth.value = norm;
        if(cc === 74) {
            const f = 100 + (norm * 5000);
            this.state.fx.filter.frequency.rampTo(f, 0.1);
            this.container.querySelector('#cutoff').value = f;
        }
    }

    initVisuals() {
        const container = this.container.querySelector('#visualizer-container');
        if(this.THREE) {
            const THREE = this.THREE;
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            const geometry = new THREE.BufferGeometry();
            const count = 256;
            const positions = new Float32Array(count * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.LineBasicMaterial({ color: 0x00d4ff });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            camera.position.z = 2;

            const loop = () => {
                this.state.animationId = requestAnimationFrame(loop);
                const values = this.state.analyser.getValue();
                const pos = line.geometry.attributes.position.array;
                for(let i=0; i<count; i++) {
                    const v = values[i] === -Infinity ? -100 : values[i];
                    const y = (v + 60) * 0.02; 
                    pos[i*3] = (i / count) * 4 - 2; pos[i*3 + 1] = y; pos[i*3 + 2] = 0; 
                }
                line.geometry.attributes.position.needsUpdate = true;
                renderer.render(scene, camera);
            };
            loop();
        } else {
            // Canvas Fallback
            const canvas = document.createElement('canvas');
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            const loop = () => {
                this.state.animationId = requestAnimationFrame(loop);
                canvas.width = container.clientWidth; canvas.height = container.clientHeight;
                const values = this.state.analyser.getValue();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.beginPath();
                const slice = canvas.width/values.length; let x=0;
                for(let i=0; i<values.length; i++) {
                    const v = (values[i]+100)/100; const y = canvas.height - (v*canvas.height/2);
                    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); x+=slice;
                }
                ctx.stroke();
            };
            loop();
        }
    }
}
