import { SynthKeyboard } from '../../shared/keyboard.js';

export default class ThrordSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        
        this.state = {
            synth: null, dist: null, vol: null, compressor: null, analyser: null,
            seqLoop: null, isPlaying: false, isRecording: false,
            currentStep: 0, recordStepIdx: 0, focusedStepIdx: null,
            presets: [], currentPresetIdx: 0,
            gridData: Array(16).fill(0).map(() => ({ note: 'C2', active: false, accent: false, slide: false })),
            activeNotes: [], keyboard: null, animationId: null,
            midiMap: { 1:'flt-cut', 74:'flt-cut', 71:'flt-res', 73:'flt-env', 75:'flt-dec', 76:'amp-dec', 77:'fx-dist', 70:'osc-tune', 7:'main-vol' }
        };
        
        this.presets = [
            { name: "INIT BASS", params: { type: false, tune: 0, cut: 1000, res: 1, env: 2000, fDec: 0.3, aDec: 0.5, dist: 0 } },
            { name: "ACID SAW", params: { type: false, tune: 0, cut: 400, res: 12, env: 3000, fDec: 0.2, aDec: 0.2, dist: 0.4 } },
            { name: "SQUARE SUB", params: { type: true, tune: -1200, cut: 600, res: 2, env: 1000, fDec: 0.5, aDec: 0.8, dist: 0.1 } },
            { name: "PUNCHY", params: { type: false, tune: 0, cut: 800, res: 4, env: 4000, fDec: 0.1, aDec: 0.3, dist: 0.2 } },
            { name: "DEEP ROLLER", params: { type: true, tune: -1200, cut: 300, res: 0, env: 500, fDec: 1.0, aDec: 1.5, dist: 0.8 } }
        ];
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        this.initAudio();
        this.initUI();
        this.startVisualizer();

        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => this.handleCC(c, v)
        };
    }

    unmount() {
        if(this.state.seqLoop) this.state.seqLoop.dispose();
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);
        
        const s = this.state;
        try {
            if(s.synth) s.synth.dispose();
            if(s.dist) s.dist.dispose();
            if(s.vol) s.vol.dispose();
            if(s.compressor) s.compressor.dispose();
            if(s.analyser) s.analyser.dispose();
        } catch(e){}

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .thrord-wrapper {
            --bg-dark: #1a1a1a; --bg-panel: #2b2b2b; --text-main: #e0e0e0; --accent: #ffcc00;
            --knob-size: 50px; --border: 1px solid #444;
            background-color: #121212; color: var(--text-main);
            font-family: 'Courier New', Courier, monospace;
            display: flex; justify-content: center; align-items: center;
            width: 100%; height: 100%; overflow-y: auto; padding: 20px;
        }
        #app { width: 900px; background: var(--bg-dark); border: 2px solid #555; box-shadow: 0 0 20px rgba(0,0,0,0.8); padding: 10px; border-radius: 4px; }
        .header { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #000; border-bottom: 2px solid var(--accent); margin-bottom: 15px; }
        h1 { margin: 0; font-size: 24px; color: var(--accent); letter-spacing: 2px; }
        .panel-row { display: flex; gap: 10px; margin-bottom: 15px; }
        .module { background: var(--bg-panel); border: var(--border); padding: 10px; flex: 1; display: flex; flex-direction: column; align-items: center; }
        .module-title { font-size: 12px; font-weight: bold; color: #888; margin-bottom: 10px; width: 100%; text-align: center; border-bottom: 1px solid #444; padding-bottom: 5px; }
        .controls-flex { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
        .control-group { display: flex; flex-direction: column; align-items: center; width: 50px; }
        .control-label { font-size: 10px; margin-top: 5px; text-align: center; }
        input[type=range] { -webkit-appearance: none; width: 10px; height: 100px; background: #000; outline: none; border-radius: 5px; writing-mode: bt-lr; -webkit-appearance: slider-vertical; }
        .switch { position: relative; display: inline-block; width: 40px; height: 20px; margin: 10px 0; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: var(--accent); }
        input:focus + .slider { box-shadow: 0 0 1px var(--accent); }
        input:checked + .slider:before { transform: translateX(20px); }
        .display-screen { background: #220; color: var(--accent); padding: 10px; font-family: 'Courier New', monospace; border: 2px inset #444; width: 150px; text-align: center; margin-bottom: 10px; text-transform: uppercase; }
        .btn { background: #444; color: white; border: 1px solid #666; padding: 5px 10px; cursor: pointer; font-size: 10px; }
        .btn:hover { background: #666; }
        .btn.active { background: var(--accent); color: black; }
        .sequencer-container { background: #222; padding: 10px; border: var(--border); overflow-x: auto; }
        .seq-grid { display: grid; grid-template-columns: 80px repeat(16, 1fr); gap: 2px; }
        .seq-row-label { font-size: 10px; display: flex; align-items: center; color: #888; }
        .step-col { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 25px; }
        .seq-btn { width: 20px; height: 20px; background: #333; border: 1px solid #555; cursor: pointer; }
        .seq-btn.active { background: var(--accent); box-shadow: 0 0 5px var(--accent); }
        .seq-btn.current { border-color: #fff; }
        .seq-note-select { width: 24px; font-size: 9px; background: #111; color: #fff; border: none; -webkit-appearance: none; text-align: center; }
        #keyboard { margin-top: 10px; }
        canvas { width: 100%; height: 60px; background: #000; border: 1px solid #333; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="thrord-wrapper">
            <div id="app">
                <div class="header">
                    <h1>THRORD</h1>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div class="display-screen" id="preset-display">INIT</div>
                    </div>
                </div>
                <div class="panel-row">
                    <div class="module"><div class="module-title">OSCILLATOR</div><div class="controls-flex">
                        <div class="control-group"><label class="switch"><input type="checkbox" id="osc-type"><span class="slider"></span></label><div class="control-label">SAW/SQR</div></div>
                        <div class="control-group"><input type="range" id="osc-tune" min="-1200" max="1200" value="0"><div class="control-label">TUNE</div></div>
                    </div></div>
                    <div class="module"><div class="module-title">FILTER</div><div class="controls-flex">
                        <div class="control-group"><input type="range" id="flt-cut" min="100" max="10000" step="10" value="1000"><div class="control-label">CUTOFF</div></div>
                        <div class="control-group"><input type="range" id="flt-res" min="0" max="20" step="0.1" value="1"><div class="control-label">RES</div></div>
                        <div class="control-group"><input type="range" id="flt-env" min="0" max="5000" step="10" value="2000"><div class="control-label">ENV MOD</div></div>
                        <div class="control-group"><input type="range" id="flt-dec" min="0.1" max="2" step="0.05" value="0.3"><div class="control-label">DECAY</div></div>
                    </div></div>
                    <div class="module"><div class="module-title">AMP & FX</div><div class="controls-flex">
                        <div class="control-group"><input type="range" id="amp-dec" min="0.1" max="2" step="0.05" value="0.5"><div class="control-label">DECAY</div></div>
                        <div class="control-group"><input type="range" id="fx-dist" min="0" max="1" step="0.01" value="0"><div class="control-label">DRIVE</div></div>
                        <div class="control-group"><input type="range" id="main-vol" min="-30" max="0" value="-10"><div class="control-label">VOL</div></div>
                    </div></div>
                </div>
                <div class="panel-row" style="background: #222; padding: 5px; justify-content: space-between;">
                    <div style="display:flex; gap: 10px;">
                        <button class="btn" id="btn-play">PLAY</button>
                        <button class="btn" id="btn-stop">STOP</button>
                        <div class="control-group" style="width: auto; flex-direction: row; gap: 5px;"><span style="font-size:10px;">BPM</span><input type="number" id="bpm-val" value="120" style="width: 40px; background:#000; color:var(--accent); border:1px solid #444;"></div>
                        <button class="btn" id="btn-clear">CLEAR SEQ</button>
                        <button class="btn" id="btn-rec" style="color: #f00;">STEP REC</button>
                    </div>
                    <div><button class="btn" id="btn-prev-pre">&lt;</button><button class="btn" id="btn-next-pre">&gt;</button></div>
                </div>
                <div class="sequencer-container"><div class="seq-grid" id="sequencer-grid"></div></div>
                <div class="panel-row" style="margin-top:10px;">
                    <div style="flex: 2;"><div id="keyboard"></div></div>
                    <div style="flex: 1;"><canvas id="scope"></canvas></div>
                </div>
            </div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;
        this.state.synth = new Tone.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.1 },
            filter: { Q: 1, type: "lowpass", rollover: -24 },
            filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0, baseFrequency: 200, octaves: 4 }
        });
        this.state.dist = new Tone.Distortion(0.0).toDestination();
        this.state.vol = new Tone.Volume(-10).toDestination();
        this.state.compressor = new Tone.Compressor(-20, 3);
        this.state.analyser = new Tone.Waveform(256);
        this.state.synth.chain(this.state.dist, this.state.compressor, this.state.vol, this.state.analyser, Tone.Destination);

        this.state.seqLoop = new Tone.Loop((time) => {
            const stepIdx = this.state.currentStep % 16;
            const stepData = this.state.gridData[stepIdx];
            Tone.Draw.schedule(() => this.updateSequencerHighlight(stepIdx), time);
            
            if (stepData.active) {
                const vel = stepData.accent ? 0.9 : 0.5;
                const env = parseFloat(this.container.querySelector('#flt-env').value);
                this.state.synth.filterEnvelope.octaves = stepData.accent ? 5 : (env/1000);
                
                if(stepData.slide) {
                    this.state.synth.portamento = 0.2;
                    this.state.synth.triggerAttack(stepData.note, time, vel);
                } else {
                    this.state.synth.portamento = 0;
                    this.state.synth.triggerAttackRelease(stepData.note, "16n", time, vel);
                }
            } else {
                this.state.synth.triggerRelease(time);
            }
            this.state.currentStep++;
        }, "16n");
        
        Tone.Transport.bpm.value = 120;
        this.loadPreset(0);
    }

    initUI() {
        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36, responsive: true,
            onNoteOn: (m) => this.noteOn(m), onNoteOff: (m) => this.noteOff(m)
        });

        // Sequencer Grid
        const grid = this.container.querySelector('#sequencer-grid');
        ['NOTE', 'GATE', 'ACC', 'SLIDE'].forEach(lbl => {
            const d = document.createElement('div'); d.className = 'seq-row-label'; d.innerText = lbl; grid.appendChild(d);
            for(let i=0; i<16; i++) {
                const cell = document.createElement('div'); cell.className = 'step-col'; cell.dataset.step = i;
                if(lbl === 'NOTE') {
                    const sel = document.createElement('input'); sel.type="text"; sel.className='seq-note-select'; sel.value="C2";
                    sel.onchange = (e) => this.state.gridData[i].note = e.target.value.toUpperCase();
                    sel.onfocus = () => this.state.focusedStepIdx = i;
                    sel.onblur = () => this.state.focusedStepIdx = null;
                    cell.appendChild(sel);
                } else {
                    const btn = document.createElement('div'); btn.className='seq-btn';
                    const prop = lbl === 'GATE' ? 'active' : (lbl === 'ACC' ? 'accent' : 'slide');
                    btn.onclick = () => {
                        this.state.gridData[i][prop] = !this.state.gridData[i][prop];
                        btn.classList.toggle('active', this.state.gridData[i][prop]);
                    };
                    cell.appendChild(btn);
                    if(lbl === 'GATE') cell.id = `thrord-led-${i}`;
                }
                grid.appendChild(cell);
            }
        });

        // Listeners
        const get = id => this.container.querySelector('#'+id);
        get('btn-play').onclick = () => { this.Tone.Transport.start(); this.state.seqLoop.start(0); get('btn-play').classList.add('active'); };
        get('btn-stop').onclick = () => { this.Tone.Transport.stop(); this.state.seqLoop.stop(); this.state.currentStep = 0; get('btn-play').classList.remove('active'); this.updateSequencerHighlight(-1); };
        get('btn-clear').onclick = () => {
            this.state.gridData.forEach(s => {s.active=false; s.accent=false; s.slide=false;});
            this.container.querySelectorAll('.seq-btn').forEach(b => b.classList.remove('active'));
        };
        
        get('btn-rec').onclick = () => {
            this.state.isRecording = !this.state.isRecording;
            get('btn-rec').style.color = this.state.isRecording ? '#fff' : '#f00';
            get('btn-rec').classList.toggle('active');
            if(this.state.isRecording) this.state.recordStepIdx = 0;
        };

        get('btn-prev-pre').onclick = () => { this.state.currentPresetIdx = (this.state.currentPresetIdx - 1 + this.presets.length)%this.presets.length; this.loadPreset(this.state.currentPresetIdx); };
        get('btn-next-pre').onclick = () => { this.state.currentPresetIdx = (this.state.currentPresetIdx + 1)%this.presets.length; this.loadPreset(this.state.currentPresetIdx); };

        ['osc-type', 'osc-tune', 'flt-cut', 'flt-res', 'flt-env', 'flt-dec', 'amp-dec', 'fx-dist', 'main-vol'].forEach(id => {
            get(id).oninput = () => this.updateAudioParams();
        });
    }

    loadPreset(idx) {
        this.state.currentPresetIdx = idx;
        const p = this.presets[idx];
        this.container.querySelector('#preset-display').innerText = p.name;
        const get = id => this.container.querySelector('#'+id);
        get('osc-type').checked = p.params.type;
        get('osc-tune').value = p.params.tune;
        get('flt-cut').value = p.params.cut;
        get('flt-res').value = p.params.res;
        get('flt-env').value = p.params.env;
        get('flt-dec').value = p.params.fDec;
        get('amp-dec').value = p.params.aDec;
        get('fx-dist').value = p.params.dist;
        this.updateAudioParams();
    }

    updateAudioParams() {
        if(!this.state.synth) return;
        const get = id => this.container.querySelector('#'+id);
        const s = this.state.synth;
        s.oscillator.type = get('osc-type').checked ? "square" : "sawtooth";
        s.detune.value = parseFloat(get('osc-tune').value);
        s.filter.Q.value = parseFloat(get('flt-res').value);
        s.filterEnvelope.baseFrequency = parseFloat(get('flt-cut').value);
        s.filterEnvelope.octaves = parseFloat(get('flt-env').value) / 1000;
        s.filterEnvelope.decay = parseFloat(get('flt-dec').value);
        s.envelope.decay = parseFloat(get('amp-dec').value);
        this.state.dist.distortion = parseFloat(get('fx-dist').value);
        this.state.vol.volume.value = parseFloat(get('main-vol').value);
    }

    updateSequencerHighlight(step) {
        this.container.querySelectorAll('.seq-btn.current').forEach(e => e.classList.remove('current'));
        if(step === -1) return;
        const col = this.container.querySelector(`.step-col[data-step="${step}"]`);
        // Not efficient but works for now
        this.container.querySelectorAll(`.step-col[data-step="${step}"] .seq-btn`).forEach(b => b.classList.add('current'));
    }

    noteOn(midi, velocity=1) {
        if(!this.state.activeNotes.includes(midi)) {
            this.state.activeNotes.push(midi);
            if(this.state.isRecording) {
                const s = this.state.recordStepIdx;
                this.state.gridData[s].note = this.Tone.Frequency(midi, "midi").toNote();
                this.state.gridData[s].active = true;
                this.updateStepUI(s);
                this.state.recordStepIdx = (s+1)%16;
            } else {
                this.state.synth.triggerAttack(this.Tone.Frequency(midi, "midi"), this.Tone.now(), velocity);
            }
            if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
        }
    }

    noteOff(midi) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== midi);
        if(!this.state.isRecording) this.state.synth.triggerRelease(this.Tone.now());
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }

    updateStepUI(step) {
        const data = this.state.gridData[step];
        const col = this.container.querySelector(`.step-col[data-step="${step}"]`);
        col.querySelector('.seq-note-select').value = data.note;
        this.container.querySelector(`#thrord-led-${step} .seq-btn`).classList.toggle('active', data.active);
    }

    handleCC(cc, val) {
        const get = id => this.container.querySelector('#'+id);
        if(this.state.midiMap[cc]) {
            const id = this.state.midiMap[cc];
            const el = get(id);
            if(el) {
                const min = parseFloat(el.min); const max = parseFloat(el.max);
                el.value = min + (val * (max-min));
                this.updateAudioParams();
            }
        }
    }

    startVisualizer() {
        const canvas = this.container.querySelector('#scope');
        const ctx = canvas.getContext('2d');
        const draw = () => {
            this.state.animationId = requestAnimationFrame(draw);
            if(!this.state.analyser) return;
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
            const val = this.state.analyser.getValue();
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.strokeStyle = '#ffcc00'; ctx.lineWidth=2; ctx.beginPath();
            const w = canvas.width/val.length;
            for(let i=0; i<val.length; i++) {
                const y = (val[i]*0.9 + 1)/2 * canvas.height;
                if(i===0) ctx.moveTo(0,y); else ctx.lineTo(i*w, y);
            }
            ctx.stroke();
        };
        draw();
    }
}
