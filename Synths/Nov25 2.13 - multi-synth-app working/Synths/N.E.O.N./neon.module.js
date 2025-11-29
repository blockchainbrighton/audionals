import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class NeonSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null;

        this.state = {
            synth: null,
            fx: { chorus: null, delay: null, reverb: null, limiter: null, analyzer: null },
            arp: { enabled: false, latch: false, pattern: null, heldNotes: new Set(), latchedNotes: [], tempo: 120 },
            visuals: { scene: null, camera: null, renderer: null, mesh: null },
            activeNotes: [],
            keyboard: null,
            animationId: null
        };

        this.presets = [
            { name: "NEON NIGHTS", osc: "fatsawtooth", detune: 0, sub: -10, pwm: 0, glide: 0.05, filter: { cut: 2500, res: 2, env: 3000 }, env: { a: 0.05, d: 2, s: 0.4, r: 1.5 }, fx: { ch: 0.6, del: 0.3, dt: "8n.", rev: 0.4, rd: 4 } },
            { name: "BLADE PAD", osc: "fatsawtooth", detune: 10, sub: -5, pwm: 0, glide: 0.2, filter: { cut: 800, res: 0.5, env: 500 }, env: { a: 1.5, d: 3, s: 0.8, r: 4 }, fx: { ch: 0.8, del: 0.5, dt: "4n", rev: 0.7, rd: 6 } },
            { name: "CHROME BASS", osc: "fatsquare", detune: -5, sub: 0, pwm: 0.5, glide: 0, filter: { cut: 400, res: 4, env: 2000 }, env: { a: 0.01, d: 0.4, s: 0.2, r: 0.2 }, fx: { ch: 0.2, del: 0.1, dt: "16n", rev: 0.1, rd: 1.5 } },
            { name: "DREAMWAVE", osc: "triangle", detune: 5, sub: -60, pwm: 0, glide: 0.1, filter: { cut: 4000, res: 0, env: 0 }, env: { a: 0.5, d: 1, s: 1, r: 2 }, fx: { ch: 1, del: 0.6, dt: "4n", rev: 0.6, rd: 8 } },
            { name: "RETRO PLUCK", osc: "square", detune: 2, sub: -15, pwm: 0.2, glide: 0, filter: { cut: 100, res: 5, env: 3000 }, env: { a: 0.01, d: 0.3, s: 0, r: 0.4 }, fx: { ch: 0.4, del: 0.4, dt: "8n", rev: 0.3, rd: 2 } },
            { name: "LASER KEYS", osc: "sawtooth", detune: 0, sub: -60, pwm: 0, glide: 0, filter: { cut: 8000, res: 1, env: 0 }, env: { a: 0.01, d: 0.2, s: 0.6, r: 0.2 }, fx: { ch: 0.2, del: 0.2, dt: "16n", rev: 0.2, rd: 2 } },
            { name: "VHS STRINGS", osc: "pwm", detune: 15, sub: -10, pwm: 0.8, glide: 0.1, filter: { cut: 1200, res: 0, env: 200 }, env: { a: 2, d: 1, s: 0.9, r: 3 }, fx: { ch: 1, del: 0.2, dt: "4n", rev: 0.6, rd: 5 } },
            { name: "HORIZON LEAD", osc: "fatsawtooth", detune: 0, sub: -5, pwm: 0, glide: 0.2, filter: { cut: 5000, res: 3, env: 1000 }, env: { a: 0.05, d: 0.5, s: 0.5, r: 0.5 }, fx: { ch: 0.5, del: 0.6, dt: "8n", rev: 0.4, rd: 3 } }
        ];
        this.currentPresetIndex = 0;
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

        this.initAudio();
        this.initUI();
        if(this.THREE) this.initVisuals();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => {
                if(c===1) this.updateKnobUI('chorusDepth', v);
                if(c===74) this.updateKnobUI('cutoff', 20 + v*8000);
            }
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        if(this.state.arp.pattern) this.state.arp.pattern.dispose();
        
        const s = this.state.synth;
        const f = this.state.fx;
        try {
            if(s) s.dispose();
            if(f.chorus) f.chorus.dispose();
            if(f.delay) f.delay.dispose();
            if(f.reverb) f.reverb.dispose();
            if(f.limiter) f.limiter.dispose();
            if(f.analyzer) f.analyzer.dispose();
        } catch(e){}

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .neon-wrapper {
            --bg-dark: #050510; --panel-bg: #111118; --neon-pink: #ff00ff; --neon-cyan: #00ffff;
            --neon-yellow: #ffee00; --text-color: #e0e0e0; --knob-size: 50px;
            background-color: var(--bg-dark); color: var(--text-color); font-family: 'Courier New', monospace;
            position: relative; width: 100%; height: 100%; min-height: 700px;
        }
        #visualizer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; opacity: 0.6; }
        #synth-container {
            position: relative; width: 90%; max-width: 1100px; margin: 0 auto; z-index: 10;
            display: flex; flex-direction: column; gap: 10px; height: 100%; justify-content: center;
        }
        .panel {
            background: rgba(17, 17, 24, 0.85); border: 1px solid var(--neon-cyan);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.1); backdrop-filter: blur(5px);
            padding: 20px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; border-radius: 4px;
        }
        @media(max-width: 1000px) { .panel { display: flex; flex-wrap: wrap; } .section { flex: 1 1 150px; } }
        .section {
            border: 1px solid #333; border-radius: 4px; padding: 10px;
            display: flex; flex-direction: column; align-items: center; position: relative;
        }
        .section-title { position: absolute; top: -10px; background: var(--panel-bg); padding: 0 5px; font-size: 0.7rem; color: var(--neon-pink); text-transform: uppercase; letter-spacing: 1px; }
        .controls-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; margin-top: 10px; }
        .knob-container { display: flex; flex-direction: column; align-items: center; }
        .knob {
            width: 40px; height: 40px; border-radius: 50%;
            background: conic-gradient(var(--neon-cyan) 0%, var(--neon-cyan) 0%, #333 0%, #333 100%);
            position: relative; cursor: ns-resize; box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        }
        .knob::after {
            content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%;
        }
        .knob-label { font-size: 0.6rem; margin-top: 5px; color: #aaa; text-align: center; }
        .screen-section { grid-column: span 1; display: flex; flex-direction: column; gap: 10px; min-width: 160px; }
        #lcd-display {
            background: #121212; border: 2px solid #333; height: 80px; border-radius: 4px; padding: 10px;
            color: var(--neon-yellow); font-family: 'Courier New', monospace;
            display: flex; flex-direction: column; justify-content: space-between;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.8); text-shadow: 0 0 5px var(--neon-yellow);
        }
        #patch-name { font-size: 1rem; font-weight: bold; }
        .preset-nav { display: flex; gap: 5px; }
        .btn { background: #222; border: 1px solid #444; color: #fff; padding: 5px 10px; cursor: pointer; font-size: 0.7rem; flex: 1; }
        .btn:hover { background: #333; border-color: var(--neon-cyan); }
        .btn.active { background: var(--neon-cyan); color: #000; }
        #keyboard-container { position: relative; z-index: 2; background: #000; border-top: 5px solid var(--neon-pink); box-shadow: 0 -5px 20px rgba(255, 0, 255, 0.2); margin-top: 10px; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="neon-wrapper">
            <div id="visualizer"></div>
            <div id="synth-container">
                <div class="panel">
                    <div class="screen-section">
                        <div id="lcd-display">
                            <div id="patch-name">INIT PAD</div>
                            <div id="status-text">READY</div>
                        </div>
                        <div class="preset-nav">
                            <button class="btn" id="prev-preset">&lt;</button>
                            <button class="btn" id="next-preset">&gt;</button>
                        </div>
                        <div style="margin-top: 10px; display: flex; gap:5px;">
                            <button class="btn" id="arp-toggle">ARP: OFF</button>
                            <button class="btn" id="latch-toggle">LATCH</button>
                        </div>
                    </div>

                    <!-- OSC -->
                    <div class="section">
                        <div class="section-title">Oscillator</div>
                        <div class="controls-grid">
                            <div class="knob-container"><div class="knob" data-param="detune" data-min="-50" data-max="50" data-value="0"></div><div class="knob-label">Detune</div></div>
                            <div class="knob-container"><div class="knob" data-param="subLevel" data-min="-60" data-max="0" data-value="-10"></div><div class="knob-label">Sub Osc</div></div>
                            <div class="knob-container"><div class="knob" data-param="pulseWidth" data-min="0" data-max="1" data-value="0.5"></div><div class="knob-label">PWM</div></div>
                            <div class="knob-container"><div class="knob" data-param="glide" data-min="0" data-max="1" data-value="0"></div><div class="knob-label">Glide</div></div>
                        </div>
                    </div>

                    <!-- FILTER -->
                    <div class="section">
                        <div class="section-title">VCF</div>
                        <div class="controls-grid">
                            <div class="knob-container"><div class="knob" data-param="cutoff" data-min="20" data-max="10000" data-value="2000" data-scale="log"></div><div class="knob-label">Cutoff</div></div>
                            <div class="knob-container"><div class="knob" data-param="resonance" data-min="0" data-max="20" data-value="1"></div><div class="knob-label">Reso</div></div>
                            <div class="knob-container"><div class="knob" data-param="filterEnv" data-min="0" data-max="7000" data-value="2000"></div><div class="knob-label">Env Amt</div></div>
                        </div>
                    </div>

                    <!-- ENV -->
                    <div class="section">
                        <div class="section-title">Envelope</div>
                        <div class="controls-grid">
                            <div class="knob-container"><div class="knob" data-param="attack" data-min="0.01" data-max="2" data-value="0.1"></div><div class="knob-label">Attack</div></div>
                            <div class="knob-container"><div class="knob" data-param="decay" data-min="0.1" data-max="5" data-value="1"></div><div class="knob-label">Decay</div></div>
                            <div class="knob-container"><div class="knob" data-param="sustain" data-min="0" data-max="1" data-value="0.5"></div><div class="knob-label">Sustain</div></div>
                            <div class="knob-container"><div class="knob" data-param="release" data-min="0.1" data-max="8" data-value="1"></div><div class="knob-label">Release</div></div>
                        </div>
                    </div>

                    <!-- FX -->
                    <div class="section">
                        <div class="section-title">Modulation</div>
                        <div class="controls-grid">
                            <div class="knob-container"><div class="knob" data-param="chorusDepth" data-min="0" data-max="1" data-value="0.5"></div><div class="knob-label">Chorus</div></div>
                            <div class="knob-container"><div class="knob" data-param="delayMix" data-min="0" data-max="1" data-value="0.3"></div><div class="knob-label">Delay</div></div>
                        </div>
                    </div>

                    <!-- FX 2 -->
                    <div class="section">
                        <div class="section-title">Ambience</div>
                        <div class="controls-grid">
                            <div class="knob-container"><div class="knob" data-param="reverbMix" data-min="0" data-max="1" data-value="0.3"></div><div class="knob-label">Reverb</div></div>
                            <div class="knob-container"><div class="knob" data-param="volume" data-min="-40" data-max="0" data-value="-6"></div><div class="knob-label">Master</div></div>
                        </div>
                    </div>
                </div>
                <div id="keyboard-container"></div>
            </div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;
        this.state.synth = new Tone.PolySynth(Tone.MonoSynth, {
            maxPolyphony: 10, volume: -6,
            oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 1 },
            filter: { Q: 1, type: "lowpass", rolloff: -24 },
            filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1, baseFrequency: 200, octaves: 4, exponent: 2 }
        });

        this.state.fx.chorus = new Tone.Chorus(4, 2.5, 0.5).toDestination().start();
        this.state.fx.delay = new Tone.PingPongDelay("8n", 0.3).toDestination();
        this.state.fx.reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
        this.state.fx.limiter = new Tone.Limiter(-1).toDestination();
        this.state.fx.analyzer = new Tone.Analyser('fft', 64);

        this.state.synth.chain(this.state.fx.chorus, this.state.fx.delay, this.state.fx.reverb, this.state.fx.limiter, this.state.fx.analyzer);

        this.state.arp.pattern = new Tone.Pattern((time, noteMidi) => { 
            const note = this.Tone.Frequency(noteMidi, "midi").toNote();
            this.state.synth.triggerAttackRelease(note, "16n", time);
            if(this.state.keyboard) {
                this.state.keyboard.triggerVisual(noteMidi, true);
                this.Tone.Draw.schedule(() => this.state.keyboard.triggerVisual(noteMidi, false), time + this.Tone.Time("16n").toSeconds());
            } 
        }, [], "up");
        this.state.arp.pattern.interval = "16n";
        this.Tone.Transport.bpm.value = 110; 
        this.Tone.Transport.start();
    }

    initUI() {
        this.state.keyboard = new SynthKeyboard('keyboard-container', {
            startNote: 48, responsive: true,
            onNoteOn: (m) => this.noteOn(m, 1), onNoteOff: (m) => this.noteOff(m)
        });

        // Knobs
        this.container.querySelectorAll('.knob').forEach(knob => {
            const param = knob.dataset.param;
            // Initialize Knob Control Manually or wrap
            // Since we have custom CSS for these knobs, I'll adapt the logic.
            // Actually, let's use KnobControl but map the visual update to this specific CSS
            // Wait, KnobControl assumes rotation transform. This CSS uses conic-gradient.
            // I will implement a simple drag handler here instead of KnobControl to match the visual style exactly.
            
            let isDragging = false; let startY; let startVal;
            knob.addEventListener('mousedown', (e) => { isDragging = true; startY = e.clientY; startVal = parseFloat(knob.dataset.value); document.body.style.cursor = 'ns-resize'; });
            window.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = 'default'; });
            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return; e.preventDefault();
                const delta = startY - e.clientY; 
                const min = parseFloat(knob.dataset.min); const max = parseFloat(knob.dataset.max); 
                const scale = knob.dataset.scale || 'linear';
                
                let currentPct = (scale === 'log') ? Math.log(startVal / min) / Math.log(max / min) : (startVal - min) / (max - min);
                let newPct = Math.max(0, Math.min(1, currentPct + (delta / 200)));
                let newVal = (scale === 'log') ? min * Math.pow(max / min, newPct) : min + newPct * (max - min);
                
                this.updateKnobVisual(knob, newVal);
                this.updateSynthParam(param, newVal);
            });
        });

        this.container.querySelector('#prev-preset').onclick = () => { this.currentPresetIndex = (this.currentPresetIndex - 1 + this.presets.length) % this.presets.length; this.loadPreset(this.currentPresetIndex); };
        this.container.querySelector('#next-preset').onclick = () => { this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presets.length; this.loadPreset(this.currentPresetIndex); };

        const arpBtn = this.container.querySelector('#arp-toggle');
        arpBtn.onclick = () => {
            this.state.arp.enabled = !this.state.arp.enabled; 
            arpBtn.innerText = `ARP: ${this.state.arp.enabled ? 'ON' : 'OFF'}`; 
            arpBtn.classList.toggle('active');
            if(!this.state.arp.enabled) { this.state.arp.pattern.stop(); this.state.arp.latchedNotes = []; }
        };

        const latchBtn = this.container.querySelector('#latch-toggle');
        latchBtn.onclick = () => { 
            this.state.arp.latch = !this.state.arp.latch; 
            latchBtn.classList.toggle('active'); 
            if(!this.state.arp.latch) this.state.arp.latchedNotes = []; 
        };

        this.loadPreset(0);
    }

    updateKnobVisual(knob, val) {
        const min = parseFloat(knob.dataset.min); const max = parseFloat(knob.dataset.max); const scale = knob.dataset.scale || 'linear';
        let pct = (scale === 'log') ? Math.log(val / min) / Math.log(max / min) : (val - min) / (max - min);
        if(pct < 0) pct = 0; if(pct > 1) pct = 1;
        knob.style.background = `conic-gradient(var(--neon-cyan) ${pct*270}deg, #333 0deg)`;
        knob.dataset.value = val;
    }

    // Helper to update from code (MIDI/Preset)
    updateKnobUI(param, val) {
        const knob = this.container.querySelector(`.knob[data-param="${param}"]`);
        if(knob) {
            this.updateKnobVisual(knob, val);
            this.updateSynthParam(param, val);
        }
    }

    loadPreset(index) {
        const p = this.presets[index];
        this.container.querySelector('#patch-name').innerText = p.name;
        this.state.synth.set({ oscillator: { type: p.osc }, envelope: { attack: p.env.a, decay: p.env.d, sustain: p.env.s, release: p.env.r }, filterEnvelope: { baseFrequency: p.filter.cut, octaves: p.filter.env > 0 ? 4 : 0 } });
        this.state.synth.options.detune = p.detune; 
        this.state.synth.set({ portamento: p.glide });

        const f = this.state.fx;
        if (f.chorus.depth && typeof f.chorus.depth.value !== 'undefined') f.chorus.depth.value = p.fx.ch; else f.chorus.depth = p.fx.ch;
        f.delay.wet.value = p.fx.del; f.delay.delayTime.value = p.fx.dt; f.reverb.wet.value = p.fx.rev; f.reverb.decay = p.fx.rd;

        const k = (id, v) => { const el = this.container.querySelector(`.knob[data-param="${id}"]`); if(el) this.updateKnobVisual(el, v); };
        k('detune', p.detune); k('cutoff', p.filter.cut); k('resonance', p.filter.res); k('filterEnv', p.filter.env);
        k('attack', p.env.a); k('decay', p.env.d); k('sustain', p.env.s); k('release', p.env.r);
        k('chorusDepth', p.fx.ch); k('delayMix', p.fx.del); k('reverbMix', p.fx.rev);
        k('glide', p.glide); k('subLevel', p.sub);
    }

    updateSynthParam(param, value) {
        const s = this.state.synth; const f = this.state.fx;
        switch(param) {
            case 'cutoff': s.set({ filter: { frequency: value }, filterEnvelope: { baseFrequency: value } }); break;
            case 'resonance': s.set({ filter: { Q: value } }); break;
            case 'filterEnv': s.set({ filterEnvelope: { octaves: value > 100 ? 4 : 0 } }); break;
            case 'attack': s.set({ envelope: { attack: value } }); break;
            case 'decay': s.set({ envelope: { decay: value } }); break;
            case 'sustain': s.set({ envelope: { sustain: value } }); break;
            case 'release': s.set({ envelope: { release: value } }); break;
            case 'detune': s.set({ detune: value }); break;
            case 'chorusDepth': if (f.chorus.depth && typeof f.chorus.depth.value !== 'undefined') f.chorus.depth.value = value; else f.chorus.depth = value; break;
            case 'delayMix': f.delay.wet.value = value; break;
            case 'reverbMix': f.reverb.wet.value = value; break;
            case 'volume': s.volume.value = value; break;
            case 'glide': s.set({ portamento: value }); break;
        }
    }

    noteOn(midi, velocity=1) {
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
        if(this.state.arp.enabled) {
            this.state.arp.heldNotes.add(midi);
            this.updateArp();
        } else {
            const note = this.Tone.Frequency(midi, "midi").toNote();
            this.state.synth.triggerAttack(note, this.Tone.now(), velocity);
        }
    }

    noteOff(midi) {
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
        if(this.state.arp.enabled) {
            this.state.arp.heldNotes.delete(midi);
            this.updateArp();
        } else {
            const note = this.Tone.Frequency(midi, "midi").toNote();
            this.state.synth.triggerRelease(note);
        }
    }

    updateArp() {
        const arp = this.state.arp; 
        let notes = Array.from(arp.heldNotes).sort((a,b) => a - b);
        if (notes.length > 0) { 
            if(arp.latch) arp.latchedNotes = notes; 
            arp.pattern.values = notes; 
            if(arp.pattern.state !== "started") arp.pattern.start(); 
        } else if (!arp.latch) arp.pattern.stop();
    }

    initVisuals() {
        const container = this.container.querySelector('#visualizer');
        const THREE = this.THREE;
        if(THREE) {
            const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x050510, 0.0025);
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000); camera.position.z = 5; camera.position.y = 1;
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setSize(container.clientWidth, container.clientHeight); container.appendChild(renderer.domElement);
            
            const geometry = new THREE.PlaneGeometry(100, 100, 40, 40);
            const material = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.3 });
            const plane = new THREE.Mesh(geometry, material); plane.rotation.x = -Math.PI / 2; plane.position.y = -1; scene.add(plane);
            
            const loop = () => {
                this.state.animationId = requestAnimationFrame(loop);
                if(this.state.fx.analyzer) { const values = this.state.fx.analyzer.getValue(); const bass = values[0]; material.opacity = 0.2 + ((bass + 100) / 200); }
                plane.position.z = (Date.now() * 0.005) % 2; renderer.render(scene, camera);
            };
            loop();
        }
    }
}
