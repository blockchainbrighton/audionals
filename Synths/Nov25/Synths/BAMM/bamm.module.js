import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class BAMMSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        
        this.state = {
            instruments: {},
            effects: {},
            mixer: {},
            sequencer: {
                steps: 16,
                currentStep: 0,
                grid: [], 
                bassPattern: []
            },
            isPlaying: false,
            activeNotes: [],
            keyboard: null
        };

        this.DRUM_NAMES = ["Kick", "Snare", "Closed Hat", "Open Hat"];
        this.presets = [
            { name: "Init Kit", bpm: 120, grid: [[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]], bassParams: { cutoff: 800, res: 0.1, dist: 0.0 } },
            { name: "Techno Roller", bpm: 130, grid: [[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0], [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]], bassParams: { cutoff: 400, res: 0.7, dist: 0.4 } },
            { name: "Acid House", bpm: 124, grid: [[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0], [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], [1,1,1,0, 1,1,1,0, 1,1,1,0, 1,0,0,1], [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]], bassParams: { cutoff: 1200, res: 0.9, dist: 0.6 } },
            { name: "Broken Beat", bpm: 110, grid: [[1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0], [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0], [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,1,1], [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]], bassParams: { cutoff: 300, res: 0.2, dist: 0.1 } }
        ];
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        this.initAudio();
        this.initSequencer();
        this.initUI();
        this.startVisualizer();

        this.midiHandler = {
            noteOn: (n, v) => this.handleMidiNoteOn(n, v),
            noteOff: (n) => this.handleMidiNoteOff(n),
            cc: (c, v) => this.handleCC(c, v)
        };
    }

    unmount() {
        this.Tone.Transport.stop();
        this.Tone.Transport.cancel(); // Clear sequencer schedule
        if(this.state.animationId) cancelAnimationFrame(this.state.animationId);

        // Cleanup
        const s = this.state;
        try {
             Object.values(s.instruments).forEach(i => i.dispose());
             Object.values(s.effects).forEach(e => e.dispose());
             Object.values(s.mixer).forEach(m => m.dispose && m.dispose());
        } catch(e) {}

        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .bamm-wrapper {
            --bg-color: #1a1a1a; --panel-bg: #2b2b2b; --text-color: #e0e0e0; --accent-color: #ff9800;
            --step-on: #ff4444; --step-off: #444; --knob-track: #111; --knob-val: #00bcd4;
            background-color: var(--bg-color); color: var(--text-color); font-family: 'Courier New', monospace;
            display: flex; justify-content: center; align-items: center; height: 100%; width: 100%; overflow-y: auto;
        }
        #app-container {
            background: var(--panel-bg); border: 4px solid #444; border-radius: 8px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.7); width: 100%; max-width: 900px;
            display: flex; flex-direction: column; padding: 15px; gap: 15px; margin: 20px;
        }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #444; padding-bottom: 10px; }
        .title { font-weight: bold; font-size: 1.2rem; color: #888; letter-spacing: 2px; }
        .transport-controls { display: flex; gap: 10px; align-items: center; }
        .btn { background: #444; color: #fff; border: 1px solid #666; padding: 5px 12px; cursor: pointer; font-family: inherit; font-size: 0.9rem; }
        .btn.active { background: var(--accent-color); color: #000; }
        .bpm-display { display: flex; align-items: center; gap: 5px; }
        .bpm-val { width: 50px; text-align: center; background: #000; color: var(--accent-color); border: none; font-family: inherit; padding: 4px; }
        .preset-select { background: #000; color: var(--text-color); border: 1px solid #555; padding: 5px; font-family: inherit; }
        .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 15px; }
        @media (max-width: 768px) { .main-grid { grid-template-columns: 1fr; } }
        .section-box { background: #222; border: 1px solid #444; padding: 10px; border-radius: 4px; }
        .section-title { font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; }
        .sequencer-row { display: flex; align-items: center; margin-bottom: 8px; }
        .track-label { width: 60px; font-size: 0.8rem; color: #aaa; }
        .steps-container { display: flex; flex: 1; gap: 4px; }
        .step { flex: 1; height: 25px; background: var(--step-off); border: 1px solid #333; cursor: pointer; box-shadow: inset 0 0 2px #000; }
        .step.active { background: var(--step-on); box-shadow: 0 0 5px var(--step-on); }
        .step.playing { border-color: #fff; background-color: #777; }
        .step.active.playing { background-color: #ff8888; }
        .controls-row { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px; }
        .control-group { display: flex; flex-direction: column; align-items: center; }
        .control-label { font-size: 0.7rem; color: #777; margin-bottom: 2px; }
        input[type=range] { -webkit-appearance: none; width: 80px; height: 4px; background: var(--knob-track); outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--knob-val); border-radius: 50%; cursor: pointer; border: 2px solid #000; }
        #keyboard { margin-top: 15px; }
        .mixer-container { display: flex; justify-content: space-around; }
        .fader-group { display: flex; flex-direction: column; align-items: center; height: 120px; }
        input[type=range].vertical { transform: rotate(-90deg); width: 80px; margin-top: 40px; }
        canvas { width: 100%; height: 60px; background: #111; border: 1px solid #333; margin-top: 5px; }
        .helper-text { font-size: 0.7rem; color: #666; margin-top: 5px; font-style: italic; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="bamm-wrapper">
            <div id="app-container">
                <div class="header">
                    <div class="title">BAMM <span style="font-size:0.6em; color:#555;">v1.0</span></div>
                    <div class="transport-controls">
                        <select id="preset-selector" class="preset-select"></select>
                        <div class="bpm-display">
                            <label style="font-size:0.8rem">BPM</label>
                            <input type="number" id="bpm-input" class="bpm-val" value="125" min="60" max="200">
                        </div>
                        <button id="play-btn" class="btn">PLAY</button>
                        <button id="stop-btn" class="btn">STOP</button>
                    </div>
                </div>

                <div class="main-grid">
                    <div class="section-box">
                        <div class="section-title"><span>Rhythm Core</span><span id="step-indicator" style="color:var(--accent-color)">01</span></div>
                        <div id="sequencer-grid"></div>
                        <div class="helper-text">Click steps to program. Rows: Kick, Snare, CH, OH.</div>
                    </div>
                    <div class="section-box">
                        <div class="section-title">Bassline (303-ish)</div>
                        <div class="controls-row">
                            <div class="control-group"><span class="control-label">Cutoff</span><input type="range" id="bass-cutoff" min="100" max="5000" value="800"></div>
                            <div class="control-group"><span class="control-label">Res</span><input type="range" id="bass-res" min="0" max="0.95" step="0.01" value="0.5"></div>
                            <div class="control-group"><span class="control-label">Env Mod</span><input type="range" id="bass-env" min="0" max="3000" value="1000"></div>
                            <div class="control-group"><span class="control-label">Drive</span><input type="range" id="bass-dist" min="0" max="1" step="0.01" value="0.2"></div>
                        </div>
                        <div id="keyboard"></div>
                        <div class="helper-text" style="margin-top:5px; text-align:center;">Click & Drag for Glissando</div>
                    </div>
                </div>

                <div class="section-box">
                    <div class="section-title">Mixer & Global FX</div>
                    <div class="mixer-container">
                        <div class="fader-group"><span class="control-label">Kick</span><input type="range" class="vertical" id="vol-kick" min="-60" max="6" value="0"></div>
                        <div class="fader-group"><span class="control-label">Snare</span><input type="range" class="vertical" id="vol-snare" min="-60" max="6" value="-2"></div>
                        <div class="fader-group"><span class="control-label">Hats</span><input type="range" class="vertical" id="vol-hats" min="-60" max="6" value="-4"></div>
                        <div class="fader-group"><span class="control-label">Bass</span><input type="range" class="vertical" id="vol-bass" min="-60" max="6" value="-2"></div>
                        <div style="width:1px; background:#444; margin:0 10px;"></div>
                        <div class="fader-group"><span class="control-label">Delay</span><input type="range" class="vertical" id="send-delay" min="0" max="1" step="0.01" value="0.2"></div>
                        <div class="fader-group"><span class="control-label">Reverb</span><input type="range" class="vertical" id="send-reverb" min="0" max="1" step="0.01" value="0.3"></div>
                    </div>
                    <canvas id="visualizer"></canvas>
                </div>
            </div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;
        const limiter = new Tone.Limiter(-1).toDestination();
        const masterVol = new Tone.Volume(0).connect(limiter);
        
        const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.5 }).connect(masterVol);
        const delay = new Tone.FeedbackDelay("8n", 0.4).connect(masterVol);
        reverb.generate();

        // Instruments
        const kickSynth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 10, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 } });
        const kickVol = new Tone.Volume(0).connect(masterVol); kickSynth.connect(kickVol);

        const snareSynth = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
        const snareVol = new Tone.Volume(-2).connect(masterVol); snareSynth.connect(snareVol);
        const snareSend = new Tone.Gain(0.2).connect(reverb); snareSynth.connect(snareSend);

        const chSynth = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } });
        const chFilter = new Tone.Filter(8000, "highpass");
        const hatsVol = new Tone.Volume(-4).connect(masterVol); chSynth.connect(chFilter); chFilter.connect(hatsVol);

        const ohSynth = new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.3, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 });
        ohSynth.connect(hatsVol);

        // Bass
        const bassDist = new Tone.Distortion(0.2);
        const bassFilter = new Tone.Filter(800, "lowpass", -24);
        const bassVol = new Tone.Volume(-2).connect(masterVol);
        
        const bassSynth = new Tone.MonoSynth({
            oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, baseFrequency: 200, octaves: 3, exponent: 2 }
        });
        
        bassSynth.connect(bassFilter); bassFilter.connect(bassDist); bassDist.connect(bassVol);
        const delaySend = new Tone.Gain(0); const reverbSend = new Tone.Gain(0);
        bassDist.connect(delaySend); delaySend.connect(delay);
        bassDist.connect(reverbSend); reverbSend.connect(reverb);

        const analyser = new Tone.Analyser("waveform", 256);
        masterVol.connect(analyser);

        this.state.instruments = { kick: kickSynth, snare: snareSynth, ch: chSynth, oh: ohSynth, bass: bassSynth };
        this.state.effects = { bassFilter, bassDist, reverb, delay };
        this.state.mixer = { kick: kickVol, snare: snareVol, hats: hatsVol, bass: bassVol, delaySend, reverbSend, analyser };
    }

    initSequencer() {
        const Tone = this.Tone;
        for(let i=0; i<4; i++) this.state.sequencer.grid.push(new Array(16).fill(0));
        let stepCounter = 0;
        
        Tone.Transport.scheduleRepeat((time) => {
            const step = stepCounter % 16;
            this.state.sequencer.currentStep = step;
            const grid = this.state.sequencer.grid;
            if (grid[0][step]) this.state.instruments.kick.triggerAttackRelease("C1", "8n", time);
            if (grid[1][step]) this.state.instruments.snare.triggerAttackRelease("8n", time);
            if (grid[2][step]) this.state.instruments.ch.triggerAttackRelease("16n", time);
            if (grid[3][step]) this.state.instruments.oh.triggerAttackRelease("8n", time, 0.6);

            Tone.Draw.schedule(() => { this.updateSequencerUI(step); }, time);
            stepCounter++;
        }, "16n");
        Tone.Transport.bpm.value = 125;
    }

    initUI() {
        // Grid
        const gridContainer = this.container.querySelector('#sequencer-grid');
        gridContainer.innerHTML = '';
        this.DRUM_NAMES.forEach((name, trackIdx) => {
            const row = document.createElement('div');
            row.className = 'sequencer-row';
            const label = document.createElement('div'); label.className = 'track-label'; label.innerText = name;
            const stepsDiv = document.createElement('div'); stepsDiv.className = 'steps-container';
            for(let i=0; i<16; i++) {
                const btn = document.createElement('div'); btn.className = 'step';
                if (i % 4 === 0) btn.style.borderLeft = '2px solid #666'; 
                btn.onclick = () => {
                    const current = this.state.sequencer.grid[trackIdx][i];
                    const newVal = current ? 0 : 1;
                    this.state.sequencer.grid[trackIdx][i] = newVal;
                    if(newVal) btn.classList.add('active'); else btn.classList.remove('active');
                };
                stepsDiv.appendChild(btn);
            }
            row.appendChild(label); row.appendChild(stepsDiv); gridContainer.appendChild(row);
        });

        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36, responsive: true,
            onNoteOn: (m) => this.handleMidiNoteOn(m), onNoteOff: (m) => this.handleMidiNoteOff(m)
        });

        // Presets
        const presetSel = this.container.querySelector('#preset-selector');
        this.presets.forEach((p, i) => { const opt = document.createElement('option'); opt.value = i; opt.innerText = p.name; presetSel.appendChild(opt); });
        presetSel.onchange = (e) => this.loadPreset(e.target.value);

        // Controls
        this.container.querySelector('#play-btn').onclick = () => { this.Tone.Transport.start(); this.container.querySelector('#play-btn').classList.add('active'); this.container.querySelector('#stop-btn').classList.remove('active'); };
        this.container.querySelector('#stop-btn').onclick = () => { this.Tone.Transport.stop(); this.updateSequencerUI(-1); this.container.querySelector('#play-btn').classList.remove('active'); this.container.querySelector('#stop-btn').classList.add('active'); };
        this.container.querySelector('#bpm-input').oninput = (e) => this.Tone.Transport.bpm.value = parseFloat(e.target.value);

        // Bass Params
        const bind = (id, fn) => this.container.querySelector(`#${id}`).oninput = (e) => fn(parseFloat(e.target.value));
        bind('bass-cutoff', v => this.state.effects.bassFilter.frequency.rampTo(v, 0.1));
        bind('bass-res', v => this.state.effects.bassFilter.Q.value = v * 20);
        bind('bass-env', v => this.state.instruments.bass.filterEnvelope.baseFrequency = v);
        bind('bass-dist', v => this.state.effects.bassDist.distortion = v);
        bind('vol-kick', v => this.state.mixer.kick.volume.rampTo(v, 0.1));
        bind('vol-snare', v => this.state.mixer.snare.volume.rampTo(v, 0.1));
        bind('vol-hats', v => this.state.mixer.hats.volume.rampTo(v, 0.1));
        bind('vol-bass', v => this.state.mixer.bass.volume.rampTo(v, 0.1));
        bind('send-delay', v => this.state.mixer.delaySend.gain.rampTo(v, 0.1));
        bind('send-reverb', v => this.state.mixer.reverbSend.gain.rampTo(v, 0.1));

        this.loadPreset(0);
    }

    loadPreset(index) {
        const p = this.presets[index];
        this.container.querySelector('#bpm-input').value = p.bpm; this.Tone.Transport.bpm.value = p.bpm;
        for(let t=0; t<4; t++) this.state.sequencer.grid[t] = [...p.grid[t]];
        const rows = this.container.querySelectorAll('.sequencer-row');
        rows.forEach((row, tIdx) => {
            const steps = row.querySelectorAll('.step');
            steps.forEach((step, sIdx) => {
                if(this.state.sequencer.grid[tIdx][sIdx]) step.classList.add('active'); else step.classList.remove('active');
            });
        });
        const params = p.bassParams;
        this.container.querySelector('#bass-cutoff').value = params.cutoff; this.state.effects.bassFilter.frequency.value = params.cutoff;
        this.container.querySelector('#bass-res').value = params.res; this.state.effects.bassFilter.Q.value = params.res * 20;
        this.container.querySelector('#bass-dist').value = params.dist; this.state.effects.bassDist.distortion = params.dist;
    }

    updateSequencerUI(currentStep) {
        this.container.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
        if(currentStep === -1) return;
        const rows = this.container.querySelectorAll('.sequencer-row');
        rows.forEach(row => {
            const steps = row.querySelectorAll('.step');
            if(steps[currentStep]) steps[currentStep].classList.add('playing');
        });
        const indicator = this.container.querySelector('#step-indicator');
        if(indicator) indicator.innerText = (currentStep + 1).toString().padStart(2, '0');
    }

    handleMidiNoteOn(midi, velocity=1) {
        if(!this.state.activeNotes.includes(midi)) {
            this.state.activeNotes.push(midi);
            const freq = this.Tone.Frequency(midi, "midi");
            this.state.instruments.bass.triggerAttack(freq, this.Tone.now(), velocity);
            if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
        }
    }
    handleMidiNoteOff(midi) {
        this.state.activeNotes = this.state.activeNotes.filter(n => n !== midi);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
        if (this.state.activeNotes.length > 0) {
            const last = this.state.activeNotes[this.state.activeNotes.length - 1];
            this.state.instruments.bass.triggerAttack(this.Tone.Frequency(last, "midi"));
        } else {
            this.state.instruments.bass.triggerRelease();
        }
    }
    handleCC(cc, val) {
        const norm = val;
        if(cc === 74) { this.container.querySelector('#bass-cutoff').value = 5000*norm; this.state.effects.bassFilter.frequency.rampTo(5000*norm, 0.05); }
        if(cc === 71) { this.container.querySelector('#bass-res').value = norm; this.state.effects.bassFilter.Q.value = norm * 20; }
    }

    startVisualizer() {
        const canvas = this.container.querySelector('#visualizer');
        const ctx = canvas.getContext('2d');
        const analyser = this.state.mixer.analyser;
        
        const draw = () => {
            this.state.animationId = requestAnimationFrame(draw);
            if(!analyser) return;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width; canvas.height = rect.height;
            const values = analyser.getValue();
            ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#00bcd4'; ctx.beginPath();
            const sliceWidth = canvas.width / values.length; let x = 0;
            for(let i = 0; i < values.length; i++) {
                const v = (values[i] + 1) / 2; const y = v * canvas.height;
                if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
        }
        draw();
    }
}
