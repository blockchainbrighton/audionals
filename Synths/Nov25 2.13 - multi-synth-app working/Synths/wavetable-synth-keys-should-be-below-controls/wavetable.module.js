import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class WavetableSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null;

        this.state = {
            synth: null, filter: null, fx: {}, lfo: {},
            visuals: { scene: null, camera: null, renderer: null, mesh: null, active: false },
            analysis: { waveform: null },
            activeNotes: [],
            keyboard: null,
            animationId: null
        };

        this.presets = [
            { name: "Slow Horizon", macro1: 0.3, macro2: 0.1, macro3: 0.6, morph: 2, harm: 1, detune: 5, cutoff: 800, res: 2, att: 2.0, rel: 4.0, lfoRate: "2n", lfoDepth: 300, chorus: 0.6, delay: 0.4, reverb: 0.8 },
            { name: "Glass Fields", macro1: 0.8, macro2: 0.2, macro3: 0.4, morph: 10, harm: 3.0, detune: 15, cutoff: 4000, res: 0.5, att: 0.1, rel: 2.5, lfoRate: "4n", lfoDepth: 100, chorus: 0.3, delay: 0.5, reverb: 0.6 },
            { name: "Deep Drone", macro1: 0.1, macro2: 0.5, macro3: 0.5, morph: 1, harm: 0.5, detune: 20, cutoff: 200, res: 4, att: 4.0, rel: 6.0, lfoRate: "1n", lfoDepth: 100, chorus: 0.8, delay: 0.2, reverb: 0.9 }
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
        if(this.THREE) this.initVisuals();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => this.handleCC(c, v)
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        const s = this.state;
        try {
            if(s.synth) s.synth.dispose();
            if(s.filter) s.filter.dispose();
            Object.values(s.fx).forEach(x => x.dispose());
            Object.values(s.lfo).forEach(x => x.dispose());
            if(s.analysis.waveform) s.analysis.waveform.dispose();
        } catch(e) {}

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .wt-wrapper {
            --bg-color: #0b0c10; --panel-bg: #1f2833; --accent: #66fcf1; --accent-dim: #45a29e;
            --text-main: #c5c6c7;
            background-color: var(--bg-color); color: var(--text-main);
            font-family: 'Courier New', Courier, monospace;
            display: flex; flex-direction: column; width: 100%; height: 100%;
        }
        #viz-container { flex: 1; position: relative; background: radial-gradient(circle at center, #1a1a2e 0%, #000 100%); overflow: hidden; min-height: 200px; }
        #controls {
            height: 340px; background: var(--panel-bg); border-top: 2px solid var(--accent-dim);
            padding: 10px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; overflow-y: auto;
        }
        .module { background: rgba(0,0,0,0.3); border: 1px solid #333; border-radius: 4px; padding: 10px; display: flex; flex-direction: column; }
        .module h3 { margin: 0 0 10px 0; font-size: 0.8rem; color: var(--accent); text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 5px; }
        .control-group { margin-bottom: 8px; display: flex; flex-direction: column; }
        label { font-size: 0.7rem; margin-bottom: 4px; display: flex; justify-content: space-between; }
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 4px; background: #444; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--accent); border-radius: 50%; cursor: pointer; }
        select { background: #222; color: var(--accent); border: 1px solid #444; padding: 4px; font-family: inherit; font-size: 0.8rem; }
        #keyboard { background: #000; padding: 10px 0; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="wt-wrapper">
            <div id="viz-container"></div>
            <div id="controls">
                <div class="module">
                    <h3>Global</h3>
                    <div class="control-group"><label>Preset</label><select id="preset-select"></select></div>
                    <div class="control-group"><label>Macro 1</label><input type="range" id="macro1" min="0" max="1" step="0.01" value="0.5"></div>
                    <div class="control-group"><label>Macro 2</label><input type="range" id="macro2" min="0" max="1" step="0.01" value="0.2"></div>
                    <div class="control-group"><label>Macro 3</label><input type="range" id="macro3" min="0" max="1" step="0.01" value="0.4"></div>
                </div>
                <div class="module">
                    <h3>Oscillator</h3>
                    <div class="control-group"><label>Morph</label><input type="range" id="osc-morph" min="0" max="20" step="0.1" value="3"></div>
                    <div class="control-group"><label>Harmonicity</label><input type="range" id="osc-harmonicity" min="0.1" max="5" step="0.1" value="1"></div>
                    <div class="control-group"><label>Detune</label><input type="range" id="osc-detune" min="0" max="50" step="1" value="10"></div>
                </div>
                <div class="module">
                    <h3>Filter & Env</h3>
                    <div class="control-group"><label>Cutoff</label><input type="range" id="filter-cutoff" min="100" max="10000" step="10" value="2000"></div>
                    <div class="control-group"><label>Resonance</label><input type="range" id="filter-res" min="0" max="10" step="0.1" value="1"></div>
                    <div class="control-group"><label>Attack</label><input type="range" id="env-attack" min="0.1" max="5" step="0.1" value="1"></div>
                    <div class="control-group"><label>Release</label><input type="range" id="env-release" min="0.5" max="10" step="0.1" value="3"></div>
                </div>
                <div class="module">
                    <h3>LFO</h3>
                    <div class="control-group"><label>BPM</label><input type="range" id="bpm" min="60" max="140" value="90"></div>
                    <div class="control-group"><label>Rate</label><select id="lfo-rate"><option value="1n">1n</option><option value="4n" selected>4n</option><option value="8n">8n</option></select></div>
                    <div class="control-group"><label>Depth</label><input type="range" id="lfo-depth" min="0" max="2000" step="10" value="500"></div>
                </div>
                <div class="module">
                    <h3>FX</h3>
                    <div class="control-group"><label>Chorus</label><input type="range" id="fx-chorus" min="0" max="1" step="0.01" value="0.5"></div>
                    <div class="control-group"><label>Delay</label><input type="range" id="fx-delay" min="0" max="1" step="0.01" value="0.3"></div>
                    <div class="control-group"><label>Reverb</label><input type="range" id="fx-reverb" min="0" max="1" step="0.01" value="0.7"></div>
                    <div class="control-group"><label>Volume</label><input type="range" id="master-vol" min="-40" max="0" value="-10"></div>
                </div>
            </div>
            <div id="keyboard"></div>
        </div>`;
    }

    async initAudio() {
        const T = this.Tone;
        this.state.synth = new T.PolySynth(T.FMSynth, {
            maxPolyphony: 8, voice: T.FMSynth, volume: -10,
            oscillator: { type: "sine" }, modulation: { type: "triangle" },
            envelope: { attack: 1, decay: 1, sustain: 0.8, release: 3 },
            modulationEnvelope: { attack: 1, decay: 0, sustain: 1, release: 3 }
        });

        this.state.filter = new T.Filter({ type: "lowpass", frequency: 2000, rolloff: -12, Q: 1 });
        this.state.fx.chorus = new T.Chorus(4, 2.5, 0.5).start();
        this.state.fx.delay = new T.PingPongDelay({ delayTime: "8n.", feedback: 0.4, wet: 0.3 });
        this.state.fx.reverb = new T.Reverb({ decay: 5, preDelay: 0.1, wet: 0.5 });
        await this.state.fx.reverb.generate();
        this.state.fx.limiter = new T.Limiter(-1);

        this.state.lfo.filterLfo = new T.LFO({ frequency: "4n", min: 200, max: 1000, type: "sine" }).start();
        this.state.lfo.filterLfo.connect(this.state.filter.frequency);

        this.state.analysis.waveform = new T.Waveform(512);

        this.state.synth.chain(this.state.filter, this.state.fx.chorus, this.state.fx.delay, this.state.fx.reverb, this.state.fx.limiter, T.Destination);
        T.Destination.connect(this.state.analysis.waveform);

        T.Transport.bpm.value = 90; T.Transport.start();
    }

    initUI() {
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36, responsive: true,
            onNoteOn: (m) => this.noteOn(m, 1), onNoteOff: (m) => this.noteOff(m)
        });

        const bind = (id, cb) => this.container.querySelector(`#${id}`).addEventListener('input', (e) => cb(parseFloat(e.target.value)));
        
        bind('macro1', () => this.updateMacros());
        bind('macro2', () => this.updateMacros());
        bind('macro3', () => this.updateMacros());
        
        bind('osc-morph', v => this.state.synth.set({ modulationIndex: v }));
        bind('osc-harmonicity', v => this.state.synth.set({ harmonicity: v }));
        bind('osc-detune', v => this.state.synth.set({ detune: v }));
        
        bind('filter-cutoff', v => {
            this.state.filter.frequency.linearRampTo(Math.max(20, v), 0.1);
            this.updateLFO(v, parseFloat(this.container.querySelector('#lfo-depth').value));
        });
        bind('filter-res', v => this.state.filter.Q.value = v);
        bind('env-attack', v => this.state.synth.set({ envelope: { attack: v } }));
        bind('env-release', v => this.state.synth.set({ envelope: { release: v } }));
        
        bind('bpm', v => this.Tone.Transport.bpm.rampTo(v, 0.1));
        this.container.querySelector('#lfo-rate').onchange = (e) => this.state.lfo.filterLfo.frequency.value = e.target.value;
        bind('lfo-depth', v => this.updateLFO(parseFloat(this.container.querySelector('#filter-cutoff').value), v));
        
        bind('fx-chorus', v => this.state.fx.chorus.wet.value = v);
        bind('fx-delay', v => this.state.fx.delay.wet.value = v);
        bind('fx-reverb', v => this.state.fx.reverb.wet.value = v);
        bind('master-vol', v => this.Tone.Destination.volume.rampTo(v, 0.1));

        const sel = this.container.querySelector('#preset-select');
        this.presets.forEach((p, i) => { const o = document.createElement('option'); o.value=i; o.innerText=p.name; sel.appendChild(o); });
        sel.onchange = (e) => this.loadPreset(e.target.value);
        
        this.loadPreset(0);
    }

    loadPreset(idx) {
        const p = this.presets[idx];
        const set = (id, v) => { 
            const el = this.container.querySelector(`#${id}`); 
            if(el) { el.value = v; el.dispatchEvent(new Event('input')); } 
        };
        set('macro1', p.macro1); set('macro2', p.macro2); set('macro3', p.macro3);
        set('osc-morph', p.morph); set('osc-harmonicity', p.harm); set('osc-detune', p.detune);
        set('filter-cutoff', p.cutoff); set('filter-res', p.res); set('env-attack', p.att); set('env-release', p.rel);
        set('lfo-depth', p.lfoDepth); 
        this.container.querySelector('#lfo-rate').value = p.lfoRate; this.container.querySelector('#lfo-rate').dispatchEvent(new Event('change'));
        set('fx-chorus', p.chorus); set('fx-delay', p.delay); set('fx-reverb', p.reverb);
        this.updateMacros();
    }

    updateMacros() {
        const m1 = parseFloat(this.container.querySelector('#macro1').value);
        const m2 = parseFloat(this.container.querySelector('#macro2').value);
        const m3 = parseFloat(this.container.querySelector('#macro3').value);
        
        const cut = parseFloat(this.container.querySelector('#filter-cutoff').value);
        const targetFreq = Math.max(20, Math.min(20000, cut + m1*5000));
        this.state.filter.frequency.linearRampTo(targetFreq, 0.1);
        
        this.state.synth.set({ modulationIndex: parseFloat(this.container.querySelector('#osc-morph').value) + m1*5 });
        
        this.state.fx.chorus.wet.value = Math.min(1, parseFloat(this.container.querySelector('#fx-chorus').value) + m2*0.3);
        this.state.fx.reverb.wet.value = Math.min(1, parseFloat(this.container.querySelector('#fx-reverb').value) + m3*0.3);
    }

    updateLFO(cut, depth) {
        this.state.lfo.filterLfo.min = Math.max(20, cut - depth);
        this.state.lfo.filterLfo.max = Math.min(20000, cut + depth);
    }

    noteOn(midi, vel) {
        if(this.state.activeNotes.includes(midi)) return;
        this.state.activeNotes.push(midi);
        this.state.synth.triggerAttack(this.Tone.Frequency(midi, "midi"), this.Tone.now(), vel);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== midi);
        this.state.synth.triggerRelease(this.Tone.Frequency(midi, "midi"));
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    handleCC(cc, val) {
        if(cc === 1) { this.container.querySelector('#macro1').value = val; this.updateMacros(); }
        if(cc === 2) { this.container.querySelector('#macro2').value = val; this.updateMacros(); }
        if(cc === 3) { this.container.querySelector('#macro3').value = val; this.updateMacros(); }
    }

    initVisuals() {
        if(!this.THREE) return;
        const THREE = this.THREE;
        const container = this.container.querySelector('#viz-container');
        const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x000000, 0.02);
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth/container.clientHeight, 0.1, 1000); camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const geo = new THREE.IcosahedronGeometry(2, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x66fcf1, wireframe: true, transparent: true, opacity: 0.5 });
        const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
        mesh.geometry.userData = { orig: mesh.geometry.attributes.position.array.slice() };

        const loop = () => {
            this.state.animationId = requestAnimationFrame(loop);
            const wave = this.state.analysis.waveform.getValue();
            mesh.rotation.x += 0.001; mesh.rotation.y += 0.002;
            
            const pos = mesh.geometry.attributes.position;
            const orig = mesh.geometry.userData.orig;
            for(let i=0; i<pos.count; i++) {
                const idx = Math.floor((i/pos.count)*wave.length);
                const amp = 1 + (wave[idx]||0)*0.5;
                pos.array[i*3] = orig[i*3]*amp; pos.array[i*3+1] = orig[i*3+1]*amp; pos.array[i*3+2] = orig[i*3+2]*amp;
            }
            pos.needsUpdate = true;
            renderer.render(scene, camera);
        };
        loop();
    }
}
