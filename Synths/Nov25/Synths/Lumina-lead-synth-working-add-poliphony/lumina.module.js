import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class LuminaSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null; // Dynamic load
        
        this.state = {
            synth: null,
            fx: {
                distortion: null, delay: null, reverb: null,
                widener: null, vibrato: null, filter: null
            },
            waveform: null,
            keyboard: null,
            currentPresetIdx: 0,
            animationId: null
        };

        this.presets = [
            {
                name: "Init Lead", oscType: "sawtooth", attack: 0.01, release: 0.1,
                cutoff: 20000, res: 0, delay: 0, reverb: 0, width: 0, drive: 0,
                glide: 0, vibDepth: 0, vibRate: 5
            },
            {
                name: "Saw Lead", oscType: "fatsawtooth", attack: 0.01, release: 0.4,
                cutoff: 4000, res: 2, delay: 0.3, reverb: 0.2, width: 0.5, drive: 0.2,
                glide: 0.05, vibDepth: 0.1, vibRate: 6
            },
            {
                name: "Sync Hook", oscType: "pulse", attack: 0.001, release: 0.2,
                cutoff: 3000, res: 5, delay: 0.2, reverb: 0.1, width: 0.2, drive: 0.8,
                glide: 0, vibDepth: 0.05, vibRate: 8
            },
            {
                name: "Shimmer", oscType: "square", attack: 0.01, release: 2,
                cutoff: 1200, res: 4, delay: 0.5, reverb: 0.6, width: 0.8, drive: 0,
                glide: 0, vibDepth: 0.2, vibRate: 4
            },
            {
                name: "EDM Stack", oscType: "fatsawtooth", attack: 0.01, release: 0.3,
                cutoff: 8000, res: 0, delay: 0.4, reverb: 0.4, width: 1, drive: 0.4,
                glide: 0, vibDepth: 0, vibRate: 0
            }
        ];
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        
        // Load Three.js dynamically if not present
        if (!window.THREE) {
            try {
                const threeModule = await import('https://ordinals.com/content/0d013bb60fc5bf5a6c77da7371b07dc162ebc7d7f3af0ff3bd00ae5f0c546445i0');
                this.THREE = window.THREE || threeModule;
            } catch (e) { console.warn("ThreeJS load failed", e); }
        } else {
            this.THREE = window.THREE;
        }

        this.initAudio();
        this.initUI();
        if(this.THREE) this.initVisuals();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => {} // Implemented if needed
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        
        // Cleanup Audio
        const s = this.state;
        try {
            if(s.synth) s.synth.dispose();
            Object.values(s.fx).forEach(n => n && n.dispose());
            if(s.waveform) s.waveform.dispose();
        } catch(e) { console.warn(e); }

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .lumina-wrapper {
            --bg: #111216; --panel: #1a1c23; --accent: #00f0ff; --accent-dim: #007a82;
            --text: #e0e6ed; --text-dim: #8b9bb4; --knob-bg: #2a2d35;
            --keys-white: #e0e0e0; --keys-black: #111; --led-off: #333; --led-on: #0f0;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: var(--text);
            display: flex; flex-direction: column; gap: 15px;
            max-width: 1000px; width: 100%;
        }
        .header-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: var(--panel); padding: 15px; border-radius: 8px; border-bottom: 2px solid var(--accent);
        }
        .brand { font-size: 1.8rem; font-weight: bold; color: var(--text); letter-spacing: 4px; }
        .brand span { color: var(--accent); }
        .preset-bar {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px;
            background: var(--panel); padding: 10px; border-radius: 8px;
        }
        .preset-btn {
            background: var(--knob-bg); border: 1px solid #444; color: var(--text-dim);
            padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; text-align: center;
        }
        .preset-btn:hover { border-color: var(--accent); color: var(--text); }
        .preset-btn.active { background: var(--accent-dim); border-color: var(--accent); color: #fff; }
        .controls-area { display: grid; grid-template-columns: 1fr 1fr 1fr 240px; gap: 15px; }
        @media(max-width: 800px) { .controls-area { grid-template-columns: 1fr 1fr; } }
        .module {
            background: var(--panel); border-radius: 8px; padding: 15px;
            display: flex; flex-direction: column; border: 1px solid #333;
        }
        .module-title {
            font-size: 0.9rem; text-transform: uppercase; color: var(--text-dim);
            border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 15px; letter-spacing: 1px;
        }
        .knob-group { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; align-items: center; flex: 1; }
        .knob-container { display: flex; flex-direction: column; align-items: center; width: 60px; }
        .knob-dial {
            width: 50px; height: 50px; border-radius: 50%; background: var(--knob-bg);
            position: relative; border: 2px solid #444; cursor: ns-resize;
        }
        .knob-dial::after {
            content: ''; position: absolute; top: 0; left: 50%;
            width: 2px; height: 50%; background: var(--accent);
            transform: translateX(-50%); pointer-events: none;
        }
        .knob-label { font-size: 0.7rem; margin-top: 8px; color: var(--text-dim); }
        .knob-val { font-size: 0.7rem; color: var(--accent); margin-top: 2px; opacity: 1; }
        .vis-module {
            position: relative; display: flex; flex-direction: column;
            background: #000; border: 1px solid #333; border-radius: 8px; overflow: hidden; min-height: 150px;
        }
        #c { width: 100%; height: 100%; display: block; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="lumina-wrapper">
            <div class="header-bar">
                <div class="brand">L<span>UMINA</span></div>
            </div>

            <div class="preset-bar" id="preset-container"></div>

            <div class="controls-area">
                <!-- OSC -->
                <div class="module">
                    <div class="module-title">Source & Env</div>
                    <div class="knob-group">
                        <div class="knob-container" data-param="oscType" data-type="select">
                            <div class="knob-label">WAVE</div>
                        </div>
                        <div class="knob-container" data-param="portamento" data-min="0" data-max="1"><div class="knob-dial"></div><div class="knob-label">GLIDE</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="attack" data-min="0.001" data-max="2"><div class="knob-dial"></div><div class="knob-label">ATTACK</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="release" data-min="0.01" data-max="5"><div class="knob-dial"></div><div class="knob-label">RELEASE</div><div class="knob-val"></div></div>
                    </div>
                </div>
                <!-- FILTER -->
                <div class="module">
                    <div class="module-title">Filter & Mod</div>
                    <div class="knob-group">
                        <div class="knob-container" data-param="cutoff" data-min="100" data-max="10000"><div class="knob-dial"></div><div class="knob-label">CUTOFF</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="resonance" data-min="0" data-max="10"><div class="knob-dial"></div><div class="knob-label">RES</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="vibDepth" data-min="0" data-max="0.5"><div class="knob-dial"></div><div class="knob-label">VIB DEPTH</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="vibRate" data-min="1" data-max="20"><div class="knob-dial"></div><div class="knob-label">VIB RATE</div><div class="knob-val"></div></div>
                    </div>
                </div>
                <!-- FX -->
                <div class="module">
                    <div class="module-title">Effects</div>
                    <div class="knob-group">
                        <div class="knob-container" data-param="delayAmt" data-min="0" data-max="1"><div class="knob-dial"></div><div class="knob-label">DELAY</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="reverbAmt" data-min="0" data-max="1"><div class="knob-dial"></div><div class="knob-label">REVERB</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="width" data-min="0" data-max="1"><div class="knob-dial"></div><div class="knob-label">WIDTH</div><div class="knob-val"></div></div>
                        <div class="knob-container" data-param="drive" data-min="0" data-max="1"><div class="knob-dial"></div><div class="knob-label">DRIVE</div><div class="knob-val"></div></div>
                    </div>
                </div>
                <!-- VIS -->
                <div class="vis-module"><canvas id="c"></canvas></div>
            </div>
            <div id="keyboard"></div>
        </div>`;
    }

    initAudio() {
        const T = this.Tone;
        const fx = this.state.fx;
        
        fx.widener = new T.Chorus(4, 2.5, 0.5).toDestination().start();
        fx.delay = new T.PingPongDelay("8n", 0.2).connect(fx.widener);
        fx.reverb = new T.Freeverb({ roomSize: 0.7, dampening: 3000 }).connect(fx.delay);
        const limiter = new T.Limiter(-1).connect(fx.reverb);
        fx.filter = new T.Filter(20000, "lowpass", -12).connect(limiter);
        fx.distortion = new T.Distortion(0).connect(fx.filter);

        this.state.synth = new T.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1 },
            filterEnvelope: { attack: 0.01, decay: 0.5, sustain: 1, release: 2, baseFrequency: 20000, octaves: 0 },
            volume: -6
        });
        this.state.synth.disconnect();
        this.state.synth.connect(fx.distortion);

        fx.vibrato = new T.LFO(5, -50, 50).start();
        fx.vibrato.connect(this.state.synth.detune);
        fx.vibrato.amplitude.value = 0;

        this.state.waveform = new T.Waveform(256);
        limiter.connect(this.state.waveform);
    }

    initUI() {
        // Presets
        const pContainer = this.container.querySelector('#preset-container');
        this.presets.forEach((p, i) => {
            const btn = document.createElement('div');
            btn.className = 'preset-btn';
            btn.innerText = p.name;
            btn.onclick = () => this.loadPreset(i);
            pContainer.appendChild(btn);
        });

        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 48,
            responsive: true,
            onNoteOn: (m) => this.noteOn(m),
            onNoteOff: (m) => this.noteOff(m)
        });

        // Knobs
        this.container.querySelectorAll('.knob-container').forEach((k, idx) => {
            const dial = k.querySelector('.knob-dial');
            if(dial) {
                dial.id = `lumina-dial-${idx}`;
                if(k.dataset.min) dial.dataset.min = k.dataset.min;
                if(k.dataset.max) dial.dataset.max = k.dataset.max;
                if(k.dataset.step) dial.dataset.step = k.dataset.step;
            }
        });

        new KnobControl('.knob-dial', {
            onChange: (id, val) => {
                const dial = this.container.querySelector(`#${id}`);
                if(!dial) return;
                const container = dial.closest('.knob-container');
                const param = container.dataset.param;
                const valDisplay = container.querySelector('.knob-val');
                
                this.setParam(param, val);
                if(valDisplay) valDisplay.innerText = val.toFixed(2);
            }
        });

        // Waveform Toggle
        const waveKnob = this.container.querySelector('.knob-container[data-param="oscType"]');
        if(waveKnob) {
            waveKnob.onclick = () => {
                const types = ['sawtooth', 'square', 'triangle', 'sine', 'pulse', 'fatsawtooth'];
                let current = this.state.synth.oscillator.type;
                let idx = types.indexOf(current);
                let next = types[(idx + 1) % types.length];
                this.state.synth.oscillator.type = next;
                waveKnob.querySelector('.knob-label').innerText = next.toUpperCase();
            };
        }

        this.loadPreset(0);
    }

    loadPreset(idx) {
        const p = this.presets[idx];
        this.state.currentPresetIdx = idx;
        
        this.container.querySelectorAll('.knob-container').forEach(k => {
            const param = k.dataset.param;
            if(p.hasOwnProperty(param)) {
                const val = p[param];
                // Set Param
                this.setParam(param, val);

                // Set Visual
                if(k.dataset.type === 'select') {
                    k.querySelector('.knob-label').innerText = val.toUpperCase();
                } else {
                    const dial = k.querySelector('.knob-dial');
                    if(dial) {
                        dial.dataset.val = val;
                        const min = parseFloat(k.dataset.min);
                        const max = parseFloat(k.dataset.max);
                        const percent = (val - min) / (max - min);
                        const angle = -135 + (percent * 270);
                        dial.style.transform = `rotate(${angle}deg)`;
                    }
                    const disp = k.querySelector('.knob-val');
                    if(disp) disp.innerText = val.toFixed(2);
                }
            }
        });
        
        this.container.querySelectorAll('.preset-btn').forEach((b, i) => {
             b.classList.toggle('active', i === idx);
        });
    }

    setParam(param, val) {
        const s = this.state.synth;
        const fx = this.state.fx;
        if(!s) return;
        
        switch(param) {
            case 'portamento': s.portamento = val; break;
            case 'attack': s.envelope.attack = val; break;
            case 'release': s.envelope.release = val; break;
            case 'cutoff': fx.filter.frequency.rampTo(val, 0.1); break;
            case 'resonance': fx.filter.Q.value = val; break;
            case 'vibDepth': fx.vibrato.amplitude.rampTo(val, 0.1); break;
            case 'vibRate': fx.vibrato.frequency.rampTo(val, 0.1); break;
            case 'delayAmt': fx.delay.wet.value = val; break;
            case 'reverbAmt': fx.reverb.wet.value = val; break;
            case 'width': fx.widener.wet.value = val; break;
            case 'drive': fx.distortion.distortion = val; break;
        }
    }

    noteOn(midi, velocity=1) {
        const freq = this.Tone.Frequency(midi, "midi");
        this.state.synth.triggerAttack(freq, this.Tone.now(), velocity);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        this.state.synth.triggerRelease(this.Tone.now());
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    initVisuals() {
        if(!this.THREE) return;
        const THREE = this.THREE;
        const canvas = this.container.querySelector('#c');
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
        camera.position.z = 2.5;

        const geometry = new THREE.IcosahedronGeometry(1, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
        const visMesh = new THREE.Mesh(geometry, material);
        scene.add(visMesh);

        const loop = (t) => {
            this.state.animationId = requestAnimationFrame(loop);
            const w = canvas.clientWidth; const h = canvas.clientHeight;
            if(canvas.width !== w || canvas.height !== h) {
                renderer.setSize(w, h, false);
                camera.aspect = w/h; camera.updateProjectionMatrix();
            }
            
            visMesh.rotation.x = t * 0.0007;
            visMesh.rotation.y = t * 0.0011;

            if(this.state.waveform && this.Tone) {
                const buffer = this.state.waveform.getValue();
                let sum = 0;
                for(let i=0; i<buffer.length; i+=10) sum += Math.abs(buffer[i]);
                const avg = sum / (buffer.length/10);
                const scale = 1 + (avg * 1.5);
                visMesh.scale.set(scale, scale, scale);
            }
            renderer.render(scene, camera);
        };
        loop(0);
    }
}
