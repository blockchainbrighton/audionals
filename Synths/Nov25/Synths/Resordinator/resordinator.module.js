import { SynthKeyboard } from '../../shared/keyboard.js';

export default class ResordinatorSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        this.THREE = null;
        
        this.state = {
            audio: { voices: [], voiceIndex: 0, filter: null, delay: null, reverb: null, compressor: null, vol: null },
            visuals: { scene: null, camera: null, renderer: null, strings: [] },
            activeNotes: [],
            keyboard: null,
            animationId: null
        };
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
                if(c===1) this.updateAllVoices('dampening', 6000 - (v*5000));
                if(c===74) {
                    const f = 200 + (v*8000);
                    this.state.audio.filter.frequency.rampTo(f, 0.05);
                    this.container.querySelector('#body-cutoff').value = f;
                }
            }
        };
    }

    unmount() {
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        const a = this.state.audio;
        try {
            a.voices.forEach(v => v.dispose());
            if(a.filter) a.filter.dispose();
            if(a.delay) a.delay.dispose();
            if(a.reverb) a.reverb.dispose();
            if(a.compressor) a.compressor.dispose();
            if(a.vol) a.vol.dispose();
        } catch(e){}
        
        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .res-wrapper {
            --bg-color: #121214; --panel-bg: #1e1e24; --accent: #ff9800;
            --text-main: #e0e0e0; --text-dim: #888;
            background-color: var(--bg-color); color: var(--text-main);
            font-family: 'Courier New', Courier, monospace;
            display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 600px;
        }
        .res-header { height: 150px; position: relative; background: #000; border-bottom: 1px solid var(--panel-bg); }
        #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        .title-overlay { position: absolute; top: 10px; left: 20px; pointer-events: none; text-shadow: 0 0 10px #000; }
        #controls { flex: 1; padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; overflow-y: auto; }
        .panel { background: var(--panel-bg); border: 1px solid #333; border-radius: 4px; padding: 10px; display: flex; flex-direction: column; }
        .panel h3 { margin: 0 0 10px 0; font-size: 0.9rem; color: var(--accent); text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; }
        .control-group { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }
        .param { display: flex; flex-direction: column; align-items: center; width: 60px; }
        .param label { font-size: 0.7rem; margin-top: 5px; color: var(--text-dim); text-align: center; }
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: var(--accent); cursor: pointer; margin-top: -6px; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 2px; cursor: pointer; background: #555; }
        select { background: #000; color: var(--text-main); border: 1px solid #444; padding: 5px; width: 100%; font-family: inherit; }
        #keyboard { background: #111; border-top: 2px solid var(--panel-bg); margin-top: 10px; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="res-wrapper">
            <header class="res-header">
                <div id="canvas-container"></div>
                <div class="title-overlay"><h1>RESORDINATOR</h1><small>Physical Model</small></div>
            </header>
            <div id="controls">
                <div class="panel" style="flex-grow: 0;">
                    <h3>Library</h3>
                    <select id="preset-selector">
                        <option value="init">Init Pluck</option><option value="nylon">Nylon Guitar</option><option value="steel">Steel String</option>
                        <option value="kalimba">Kalimba</option><option value="marimba">Wooden Mallet</option><option value="glass">Glass Bells</option>
                        <option value="muted">Muted Tele</option><option value="ethereal">Ethereal Pad</option>
                    </select>
                    <div class="param" style="width: 100%; margin-top: 10px;"><label>Tempo</label><input type="range" id="bpm" min="60" max="200" value="120"></div>
                </div>
                <div class="panel">
                    <h3>Physics Model</h3>
                    <div class="control-group">
                        <div class="param"><input type="range" id="dampening" min="100" max="8000" value="4000"><label>Damping</label></div>
                        <div class="param"><input type="range" id="resonance" min="0.8" max="0.99" step="0.001" value="0.9"><label>Resonance</label></div>
                        <div class="param"><input type="range" id="attack" min="0.1" max="2.0" step="0.1" value="1.0"><label>Pluck Force</label></div>
                    </div>
                </div>
                <div class="panel">
                    <h3>Body Tone</h3>
                    <div class="control-group">
                        <div class="param"><input type="range" id="body-cutoff" min="200" max="10000" value="2000"><label>Brightness</label></div>
                        <div class="param"><input type="range" id="body-res" min="0" max="20" value="1"><label>Body Q</label></div>
                    </div>
                </div>
                <div class="panel">
                    <h3>Space & Time</h3>
                    <div class="control-group">
                        <div class="param"><input type="range" id="delay-wet" min="0" max="1" step="0.01" value="0.2"><label>Delay Mix</label></div>
                        <div class="param"><input type="range" id="delay-fb" min="0" max="0.9" step="0.01" value="0.4"><label>Feedback</label></div>
                        <div class="param"><input type="range" id="reverb-wet" min="0" max="1" step="0.01" value="0.3"><label>Verb Mix</label></div>
                        <div class="param"><input type="range" id="reverb-size" min="0.1" max="0.9" step="0.01" value="0.7"><label>Room Size</label></div>
                    </div>
                </div>
            </div>
            <div id="keyboard"></div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;
        const filter = new Tone.Filter({ frequency: 2000, type: "lowpass", Q: 1, rolloff: -12 });
        const delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.3, wet: 0.2 });
        const reverb = new Tone.Reverb({ decay: 3, preDelay: 0.01, wet: 0.3 });
        const compressor = new Tone.Compressor({ threshold: -20, ratio: 3, attack: 0.05, release: 0.1 });
        const vol = new Tone.Volume(0);

        filter.chain(delay, reverb, compressor, vol, Tone.Destination);

        const voices = [];
        for(let i=0; i<12; i++) {
            const v = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.92, release: 2 });
            v.connect(filter);
            voices.push(v);
        }

        this.state.audio = { voices, voiceIndex: 0, filter, delay, reverb, compressor, vol };
        Tone.Transport.bpm.value = 120; Tone.Transport.start();
    }

    initUI() {
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 48, responsive: true,
            onNoteOn: (m) => this.noteOn(m, 1.0), onNoteOff: (m) => this.noteOff(m)
        });

        const bind = (id, fn) => this.container.querySelector(`#${id}`).addEventListener('input', e => fn(parseFloat(e.target.value)));
        
        bind('dampening', v => this.updateAllVoices('dampening', v));
        bind('resonance', v => this.updateAllVoices('resonance', v));
        bind('attack', v => this.updateAllVoices('attackNoise', v));
        bind('body-cutoff', v => this.state.audio.filter.frequency.rampTo(v, 0.1));
        bind('body-res', v => this.state.audio.filter.Q.value = v);
        bind('delay-wet', v => this.state.audio.delay.wet.value = v);
        bind('delay-fb', v => this.state.audio.delay.feedback.value = v);
        bind('reverb-wet', v => this.state.audio.reverb.wet.value = v);
        bind('bpm', v => this.Tone.Transport.bpm.value = v);

        this.container.querySelector('#preset-selector').addEventListener('change', e => this.setPreset(e.target.value));
    }

    updateAllVoices(param, val) {
        this.state.audio.voices.forEach(v => v.set({ [param]: val }));
    }

    noteOn(midi, velocity=0.8) {
        if(!this.state.activeNotes.includes(midi)) {
            this.state.activeNotes.push(midi);
            this.playNote(midi, velocity);
            if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
        }
    }

    noteOff(midi) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== midi);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    playNote(midi, velocity) {
        const a = this.state.audio;
        if(!a.voices.length) return;
        const voice = a.voices[a.voiceIndex];
        a.voiceIndex = (a.voiceIndex + 1) % a.voices.length;
        
        voice.volume.value = (velocity * 20) - 20;
        voice.triggerAttack(this.Tone.Frequency(midi, "midi"), this.Tone.now());
        this.triggerVisualString(midi, velocity);
    }

    setPreset(name) {
        const presets = {
            'init': { damp: 4000, res: 0.9, noise: 1.0, cut: 3000, dWet: 0.2, rWet: 0.2 },
            'nylon': { damp: 2000, res: 0.96, noise: 0.8, cut: 1500, dWet: 0.1, rWet: 0.3 },
            'steel': { damp: 7000, res: 0.98, noise: 1.5, cut: 6000, dWet: 0.3, rWet: 0.2 },
            'kalimba': { damp: 3000, res: 0.85, noise: 0.5, cut: 1200, dWet: 0.4, rWet: 0.1 },
            'marimba': { damp: 1000, res: 0.92, noise: 0.3, cut: 800, dWet: 0.1, rWet: 0.3 },
            'glass': { damp: 8000, res: 0.99, noise: 0.2, cut: 9000, dWet: 0.5, rWet: 0.8 },
            'muted': { damp: 800, res: 0.5, noise: 1.2, cut: 1000, dWet: 0.3, rWet: 0.05 },
            'ethereal': { damp: 5000, res: 0.98, noise: 0.1, cut: 4000, dWet: 0.6, rWet: 0.7 }
        };
        const p = presets[name] || presets['init'];
        this.updateAllVoices('dampening', p.damp);
        this.updateAllVoices('resonance', p.res);
        this.updateAllVoices('attackNoise', p.noise);
        this.state.audio.filter.frequency.rampTo(p.cut, 0.1);
        this.state.audio.delay.wet.rampTo(p.dWet, 0.1);
        this.state.audio.reverb.wet.rampTo(p.rWet, 0.1);
        
        const setVal = (id, v) => { const el = this.container.querySelector(`#${id}`); if(el) el.value = v; };
        setVal('dampening', p.damp); setVal('resonance', p.res); setVal('attack', p.noise);
        setVal('body-cutoff', p.cut); setVal('delay-wet', p.dWet); setVal('reverb-wet', p.rWet);
    }

    triggerVisualString(midi, velocity) {
        if(!this.THREE || !this.state.visuals.strings.length) return;
        const idx = Math.max(0, Math.min(23, midi - 48));
        const str = this.state.visuals.strings[idx];
        if(str) str.userData.amp = velocity * 1.5;
    }

    initVisuals() {
        if(!this.THREE) return;
        const THREE = this.THREE;
        const container = this.container.querySelector('#canvas-container');
        const w = container.clientWidth; const h = container.clientHeight;
        const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x000000, 0.02);
        const camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 100); camera.position.z = 20;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setSize(w, h);
        container.appendChild(renderer.domElement);

        const strings = [];
        const material = new THREE.LineBasicMaterial({ color: 0xff9800, transparent: true, opacity: 0.6 });
        const startX = -(24 * 1.5) / 2;

        for(let i=0; i<24; i++) {
            const points = [];
            for(let j=0; j<=20; j++) points.push(new THREE.Vector3(startX + i*1.5, j-10, 0));
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
            line.userData = { baseX: startX + i*1.5, amp: 0 };
            scene.add(line);
            strings.push(line);
        }
        this.state.visuals = { scene, camera, renderer, strings };

        const loop = () => {
            this.state.animationId = requestAnimationFrame(loop);
            const time = Date.now() * 0.01;
            strings.forEach(line => {
                if(line.userData.amp > 0.01) {
                    line.userData.amp *= 0.95;
                    const pos = line.geometry.attributes.position.array;
                    for(let j=0; j<=20; j++) {
                        const y = j-10;
                        const vib = Math.sin(y*0.5 + time*2) * line.userData.amp * Math.sin((j/20)*Math.PI);
                        pos[j*3] = line.userData.baseX + vib;
                    }
                    line.geometry.attributes.position.needsUpdate = true;
                    line.material.opacity = 0.4 + line.userData.amp * 2;
                } else {
                    if(line.userData.amp !== 0) { line.userData.amp = 0; line.material.opacity = 0.3; }
                }
            });
            renderer.render(scene, camera);
        };
        loop();
    }
}
