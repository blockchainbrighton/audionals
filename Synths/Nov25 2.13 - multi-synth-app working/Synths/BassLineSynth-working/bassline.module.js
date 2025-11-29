import { SynthKeyboard } from '../../shared/keyboard.js';
import { KnobControl } from '../../shared/knob-control.js';

export default class BassLineSynth {
    constructor(toneInstance, midiManager) {
        this.Tone = toneInstance;
        this.midiManager = midiManager;
        this.container = null;
        this.styleElement = null;
        
        this.state = {
            synth: null,
            subSynth: null,
            dist: null,
            comp: null,
            analyser: null,
            isPlaying: false,
            keyboard: null,
            sequence: Array(16).fill().map(() => ({
                active: false,
                note: 'C2',
                accent: false,
                slide: false
            })),
            params: {
                volume: -10,
                waveform: 0, // 0=saw, 1=square
                subVol: 0,
                cutoff: 400,
                resonance: 5,
                envMod: 2000,
                decay: 0.4,
                accent: 50,
                drive: 0,
                compThresh: -20,
                bpm: 120,
                glide: 0.1
            },
            loop: null,
            animationId: null
        };

        this.presets = {
            'Init Bass': { waveform: 0, cutoff: 600, resonance: 2, envMod: 1000, decay: 0.4, drive: 0, subVol: 0 },
            'Acid Saw': { waveform: 0, cutoff: 300, resonance: 12, envMod: 3000, decay: 0.3, drive: 20, subVol: 0 },
            'Square Sub': { waveform: 1, cutoff: 200, resonance: 0, envMod: 500, decay: 0.8, drive: 10, subVol: 50 },
            'Punchy Pluck': { waveform: 1, cutoff: 800, resonance: 5, envMod: 4000, decay: 0.1, drive: 5, subVol: 0 },
            'Deep Roller': { waveform: 0, cutoff: 150, resonance: 4, envMod: 800, decay: 0.5, drive: 50, subVol: 80 },
            'Dirty Drive': { waveform: 0, cutoff: 1000, resonance: 8, envMod: 2000, decay: 0.3, drive: 100, subVol: 0 },
            'Minimal Groove': { waveform: 1, cutoff: 300, resonance: 1, envMod: 200, decay: 0.1, drive: 0, subVol: 20 },
            'Electro Zap': { waveform: 0, cutoff: 2000, resonance: 15, envMod: 5000, decay: 0.2, drive: 30, subVol: 0 }
        };
    }

    async mount(container) {
        this.container = container;
        this.injectStyles();
        this.renderUI();
        this.initAudio();
        this.initSequencer();
        this.initUI();
        this.startVisualizer();

        // MIDI Binding
        this.midiHandler = {
            noteOn: (n, v) => this.noteOn(n, v),
            noteOff: (n) => this.noteOff(n),
            cc: (c, v) => this.onCC(c, v)
        };
    }

    unmount() {
        // Stop Transport
        if(this.state.loop) this.state.loop.dispose();
        this.Tone.Transport.stop();
        cancelAnimationFrame(this.state.animationId);

        // Cleanup Audio
        try {
            if(this.state.synth) this.state.synth.dispose();
            if(this.state.subSynth) this.state.subSynth.dispose();
            if(this.state.dist) this.state.dist.dispose();
            if(this.state.comp) this.state.comp.dispose();
            if(this.state.analyser) this.state.analyser.dispose();
        } catch(e) { console.warn(e); }

        // Remove Styles
        if(this.styleElement) this.styleElement.remove();
        this.container.innerHTML = '';
    }

    injectStyles() {
        const css = `
        .bl-wrapper {
            --bg-color: #1a1a1a; --panel-color: #252525; --text-color: #e0e0e0;
            --accent-color: #ff3333; --led-off: #440000; --led-on: #ff0000;
            --knob-bg: #111; --knob-fg: #ddd; --highlight: #4a90e2;
            font-family: 'Courier New', monospace;
            color: var(--text-color);
            display: flex; flex-direction: column; gap: 10px;
            max-width: 900px; width: 100%;
        }
        .synth-panel {
            background: var(--panel-color); border: 2px solid #444;
            border-radius: 8px; padding: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;
        }
        .logo { font-weight: bold; font-size: 1.5rem; color: var(--text-color); }
        .logo span { color: var(--accent-color); }
        .top-controls { display: flex; gap: 15px; align-items: center; }
        select { background: #333; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 4px; }
        #oscilloscope { width: 120px; height: 40px; background: #000; border: 1px solid #555; border-radius: 4px; }
        .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .control-group { border: 1px solid #444; padding: 10px; border-radius: 4px; background: #2a2a2a; }
        .group-title { font-size: 0.8rem; color: #888; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px; }
        .knob-wrapper { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; }
        .knob {
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(145deg, #222, #333); border: 2px solid #111;
            position: relative; cursor: ns-resize; box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
        }
        .knob::after {
            content: ''; position: absolute; top: 5px; left: 50%;
            width: 2px; height: 12px; background: var(--knob-fg);
            transform: translateX(-50%); transform-origin: bottom center; pointer-events: none;
        }
        .knob-label { font-size: 0.7rem; margin-top: 5px; color: #aaa; }
        .knob-value { font-size: 0.65rem; color: var(--highlight); height: 10px; }
        .sequencer-section { background: #222; padding: 10px; border-radius: 4px; border: 1px solid #444; }
        .seq-grid { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; }
        .step-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .led { width: 8px; height: 8px; background: var(--led-off); border-radius: 50%; margin-bottom: 5px; border: 1px solid #000; }
        .led.active { background: var(--led-on); box-shadow: 0 0 5px var(--led-on); }
        .led.current { background: #ffff00; box-shadow: 0 0 8px #ffff00; }
        .seq-btn {
            width: 100%; height: 20px; border: 1px solid #444; background: #333;
            cursor: pointer; font-size: 0.6rem; display: flex; justify-content: center; align-items: center; color: #888;
        }
        .seq-btn.active { background: #666; color: #fff; border-color: #888; }
        .seq-btn.accent.active { background: var(--accent-color); color: #000; }
        .seq-btn.slide.active { background: var(--highlight); color: #000; }
        .note-select { width: 100%; font-size: 0.6rem; background: #111; color: #ccc; border: 1px solid #333; -webkit-appearance: none; padding: 0; text-align: center; }
        .transport-controls { display: flex; gap: 10px; margin-top: 10px; align-items: center; }
        .btn-main { background: #444; color: #fff; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn-main:hover { background: #555; }
        .btn-main.playing { background: #0f0; color: #000; }
        #keyboard { margin-top: 15px; background: #111; border-top: 2px solid #444; }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    renderUI() {
        this.container.innerHTML = `
        <div class="bl-wrapper">
            <div class="header">
                <div class="logo"><span>30RD3</span></div>
                <div class="top-controls">
                    <canvas id="oscilloscope"></canvas>
                    <select id="preset-select"></select>
                    <div class="knob-wrapper">
                        <div class="knob" id="knob-volume" data-min="-30" data-max="0" data-value="-10"></div>
                        <div class="knob-label">VOL</div>
                    </div>
                </div>
            </div>

            <div class="synth-panel">
                <div class="controls-grid">
                    <!-- OSC -->
                    <div class="control-group">
                        <div class="group-title">OSC</div>
                        <div style="display:flex; justify-content:center; gap:10px;">
                            <div class="knob-wrapper">
                                <div class="knob" id="knob-wave" data-min="0" data-max="1" data-step="1" data-value="0"></div>
                                <div class="knob-label">WAVE</div>
                                <div class="knob-value">SAW</div>
                            </div>
                            <div class="knob-wrapper">
                                <div class="knob" id="knob-sub" data-min="0" data-max="100" data-value="0"></div>
                                <div class="knob-label">SUB</div>
                            </div>
                        </div>
                    </div>
                    <!-- FILTER -->
                    <div class="control-group">
                        <div class="group-title">FILTER</div>
                        <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">
                            <div class="knob-wrapper"><div class="knob" id="knob-cutoff" data-min="50" data-max="10000" data-value="400" data-log="true"></div><div class="knob-label">CUTOFF</div></div>
                            <div class="knob-wrapper"><div class="knob" id="knob-res" data-min="0" data-max="20" data-value="5"></div><div class="knob-label">RES</div></div>
                            <div class="knob-wrapper"><div class="knob" id="knob-envmod" data-min="0" data-max="5000" data-value="2000"></div><div class="knob-label">ENV AMT</div></div>
                            <div class="knob-wrapper"><div class="knob" id="knob-decay" data-min="0.1" data-max="2.0" data-value="0.4"></div><div class="knob-label">DECAY</div></div>
                            <div class="knob-wrapper"><div class="knob" id="knob-accent" data-min="0" data-max="100" data-value="50"></div><div class="knob-label">ACCENT</div></div>
                        </div>
                    </div>
                    <!-- FX -->
                    <div class="control-group">
                        <div class="group-title">FX</div>
                        <div style="display:flex; justify-content:center; gap:10px;">
                            <div class="knob-wrapper"><div class="knob" id="knob-drive" data-min="0" data-max="100" data-value="0"></div><div class="knob-label">DRIVE</div></div>
                            <div class="knob-wrapper"><div class="knob" id="knob-comp" data-min="-60" data-max="0" data-value="-20"></div><div class="knob-label">COMP</div></div>
                        </div>
                    </div>
                </div>

                <!-- SEQUENCER -->
                <div class="sequencer-section">
                    <div class="group-title">BASS SEQUENCER</div>
                    <div class="transport-controls" style="margin-bottom: 10px; justify-content: flex-start;">
                        <button id="btn-play" class="btn-main">PLAY</button>
                        <button id="btn-stop" class="btn-main">STOP</button>
                        <div class="knob-wrapper" style="margin-left: 20px;">
                            <div class="knob" id="knob-bpm" data-min="60" data-max="180" data-value="120"></div>
                            <div class="knob-label">BPM</div>
                            <div class="knob-value" id="val-bpm">120</div>
                        </div>
                        <div class="knob-wrapper">
                            <div class="knob" id="knob-glide" data-min="0" data-max="0.5" data-value="0.1"></div>
                            <div class="knob-label">GLIDE</div>
                        </div>
                    </div>
                    <div class="seq-grid" id="seq-grid"></div>
                </div>

                <div id="keyboard"></div>
            </div>
        </div>`;
    }

    initAudio() {
        const Tone = this.Tone;

        const limiter = new Tone.Limiter(-1).toDestination();
        this.state.analyser = new Tone.Analyser('waveform', 128);
        this.state.analyser.connect(limiter);
        this.state.comp = new Tone.Compressor(-20, 3).connect(this.state.analyser);
        this.state.dist = new Tone.Distortion(0).connect(this.state.comp);

        this.state.synth = new Tone.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
            filterEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1, baseFrequency: 200, octaves: 4, exponent: 2 },
            filter: { type: "lowpass", Q: 5, rolloff: -24 }
        }).connect(this.state.dist);

        this.state.subSynth = new Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
        }).connect(this.state.dist);
        this.state.subSynth.volume.value = -100;

        this.updateSynthParams();
    }

    initSequencer() {
        const Tone = this.Tone;
        this.state.loop = new Tone.Sequence((time, col) => {
            Tone.Draw.schedule(() => this.drawStep(col), time);
            const step = this.state.sequence[col];
            if (step.active) {
                const vel = step.accent ? 1.0 : 0.6;
                const nextStep = this.state.sequence[(col + 1) % 16];
                let duration = "16n";
                if (step.slide && nextStep.active) {
                    duration = Tone.Time("16n").toSeconds() + 0.05;
                } else {
                    duration = Tone.Time("16n").toSeconds() * 0.6;
                }

                const freq = Tone.Frequency(step.note);
                this.state.synth.triggerAttackRelease(freq, duration, time, vel);
                const subNote = freq.transpose(-12);
                this.state.subSynth.triggerAttackRelease(subNote, duration, time, vel);

                Tone.Draw.schedule(() => {
                    if(this.state.keyboard) this.state.keyboard.triggerVisual(freq.toMidi(), true);
                }, time);
                Tone.Draw.schedule(() => {
                    if(this.state.keyboard) this.state.keyboard.triggerVisual(freq.toMidi(), false);
                }, time + Tone.Time(duration).toSeconds());
            }
        }, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], "16n");

        this.state.loop.start(0);
        Tone.Transport.bpm.value = this.state.params.bpm;
    }

    initUI() {
        // Keyboard
        this.state.keyboard = new SynthKeyboard('keyboard', {
            startNote: 36,
            responsive: true,
            onNoteOn: (m) => this.noteOn(m),
            onNoteOff: (m) => this.noteOff(m)
        });

        new KnobControl('.knob', {
            onChange: (id, val) => this.updateParam(id, val)
        });

        // Presets
        const presetSel = this.container.querySelector('#preset-select');
        Object.keys(this.presets).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k; opt.text = k; presetSel.appendChild(opt);
        });
        presetSel.onchange = (e) => this.loadPreset(e.target.value);

        // Transport
        const playBtn = this.container.querySelector('#btn-play');
        const stopBtn = this.container.querySelector('#btn-stop');
        playBtn.onclick = () => {
            this.Tone.start();
            this.Tone.Transport.start();
            playBtn.classList.add('playing');
        };
        stopBtn.onclick = () => {
            this.Tone.Transport.stop();
            playBtn.classList.remove('playing');
            this.container.querySelectorAll('.led.current').forEach(l => l.classList.remove('current'));
        };

        // Grid
        const grid = this.container.querySelector('#seq-grid');
        grid.innerHTML = '';
        for(let i=0; i<16; i++) {
            const col = document.createElement('div');
            col.className = 'step-col';
            
            col.innerHTML = `<div class="led" id="led-${i}"></div>`;
            
            const btnActive = document.createElement('div');
            btnActive.className = 'seq-btn';
            btnActive.innerText = 'ON';
            btnActive.onclick = () => this.toggleStepParam(i, 'active', btnActive);
            col.appendChild(btnActive);

            const noteSel = document.createElement('select');
            noteSel.className = 'note-select';
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach((n) => {
                [1,2,3].forEach(oct => {
                    const opt = document.createElement('option');
                    opt.value = n + oct; opt.text = n + oct;
                    if (n+oct === 'C2') opt.selected = true;
                    noteSel.appendChild(opt);
                });
            });
            noteSel.onchange = (e) => this.state.sequence[i].note = e.target.value;
            col.appendChild(noteSel);

            const btnAcc = document.createElement('div');
            btnAcc.className = 'seq-btn accent';
            btnAcc.innerText = 'ACC';
            btnAcc.onclick = () => this.toggleStepParam(i, 'accent', btnAcc);
            col.appendChild(btnAcc);

            const btnSlide = document.createElement('div');
            btnSlide.className = 'seq-btn slide';
            btnSlide.innerText = 'SLD';
            btnSlide.onclick = () => this.toggleStepParam(i, 'slide', btnSlide);
            col.appendChild(btnSlide);

            grid.appendChild(col);
        }

        this.loadPreset('Init Bass');
        // Default Pattern
        [0, 4, 8, 12].forEach(i => this.toggleStepParam(i, 'active', grid.children[i].querySelector('.seq-btn')));
    }

    toggleStepParam(idx, param, el) {
        const val = !this.state.sequence[idx][param];
        this.state.sequence[idx][param] = val;
        if (val) el.classList.add('active'); else el.classList.remove('active');
    }

    drawStep(col) {
        const prev = (col === 0) ? 15 : col - 1;
        this.container.querySelector(`#led-${prev}`)?.classList.remove('current');
        this.container.querySelector(`#led-${col}`)?.classList.add('current');
    }

    loadPreset(name) {
        const p = this.presets[name];
        if(!p) return;
        
        this.updateKnobUI('knob-wave', p.waveform);
        this.updateKnobUI('knob-cutoff', p.cutoff);
        this.updateKnobUI('knob-res', p.resonance);
        this.updateKnobUI('knob-envmod', p.envMod);
        this.updateKnobUI('knob-decay', p.decay);
        this.updateKnobUI('knob-drive', p.drive);
        this.updateKnobUI('knob-sub', p.subVol);
        
        this.state.params = { ...this.state.params, ...p };
        this.updateSynthParams();
    }

    updateKnobUI(id, val) {
        const el = this.container.querySelector(`#${id}`);
        if(!el) return;
        el.dataset.value = val;
        const min = parseFloat(el.dataset.min);
        const max = parseFloat(el.dataset.max);
        const log = el.dataset.log === "true";
        let pct;
        if (log) {
            const minLog = Math.log(min), maxLog = Math.log(max), valLog = Math.log(val);
            pct = (valLog - minLog) / (maxLog - minLog);
        } else {
            pct = (val - min) / (max - min);
        }
        const deg = -135 + (pct * 270);
        el.style.transform = `rotate(${deg}deg)`;
        if(id === 'knob-wave') {
            const t = el.parentNode.querySelector('.knob-value');
            if(t) t.innerText = val < 0.5 ? "SAW" : "SQR";
        }
    }

    updateParam(id, val) {
        const p = this.state.params;
        if(id === 'knob-volume') p.volume = val;
        if(id === 'knob-wave') p.waveform = val;
        if(id === 'knob-sub') p.subVol = val;
        if(id === 'knob-cutoff') p.cutoff = val;
        if(id === 'knob-res') p.resonance = val;
        if(id === 'knob-envmod') p.envMod = val;
        if(id === 'knob-decay') p.decay = val;
        if(id === 'knob-accent') p.accent = val;
        if(id === 'knob-drive') p.drive = val;
        if(id === 'knob-comp') p.compThresh = val;
        if(id === 'knob-bpm') {
            p.bpm = val;
            if(this.Tone) this.Tone.Transport.bpm.value = val;
        }
        if(id === 'knob-glide') p.glide = val;
        
        if(id === 'knob-bpm') {
            const t = this.container.querySelector('#val-bpm');
            if(t) t.innerText = Math.round(val);
        }

        this.updateSynthParams();
    }

    updateSynthParams() {
        if(!this.state.synth) return;
        const p = this.state.params;
        const T = this.Tone;

        this.state.synth.oscillator.type = p.waveform < 0.5 ? 'sawtooth' : 'square';
        this.state.subSynth.volume.value = p.subVol > 0 ? T.gainToDb(p.subVol/100) : -100;
        
        this.state.synth.filter.Q.value = p.resonance;
        this.state.synth.filterEnvelope.baseFrequency = p.cutoff;
        
        const octaves = Math.log2((p.cutoff + p.envMod) / p.cutoff);
        this.state.synth.filterEnvelope.octaves = Math.max(0, octaves);
        
        this.state.synth.envelope.decay = p.decay;
        this.state.synth.filterEnvelope.decay = p.decay;
        this.state.subSynth.envelope.decay = p.decay;

        this.state.synth.portamento = p.glide;
        this.state.subSynth.portamento = p.glide;

        this.state.dist.distortion = p.drive / 100;
        this.state.comp.threshold.value = p.compThresh;
        this.state.synth.volume.value = p.volume;
    }

    noteOn(midi, velocity=1) {
        const freq = this.Tone.Frequency(midi, "midi");
        this.state.synth.triggerAttack(freq, this.Tone.now(), velocity);
        const subNote = freq.transpose(-12);
        this.state.subSynth.triggerAttack(subNote, this.Tone.now(), velocity);
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, true);
    }

    noteOff(midi) {
        this.state.synth.triggerRelease(this.Tone.now());
        this.state.subSynth.triggerRelease(this.Tone.now());
        if(this.state.keyboard) this.state.keyboard.triggerVisual(midi, false);
    }
    
    onCC(cc, val) {
        if (cc === 1) {
            const v = 50 + val * 9950;
            this.updateKnobUI('knob-cutoff', v);
            this.updateParam('knob-cutoff', v);
        }
        if (cc === 71) {
            const v = val * 20;
            this.updateKnobUI('knob-res', v);
            this.updateParam('knob-res', v);
        }
    }

    startVisualizer() {
        const canvas = this.container.querySelector('#oscilloscope');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const loop = () => {
            if(!this.state.analyser) return;
            this.state.animationId = requestAnimationFrame(loop);
            
            const width = canvas.width = canvas.clientWidth;
            const height = canvas.height = canvas.clientHeight;
            const values = this.state.analyser.getValue();
            
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#0f0'; ctx.beginPath();
            
            const sliceWidth = width * 1.0 / values.length;
            let x = 0;
            for(let i=0; i<values.length; i++) {
                const v = values[i];
                const y = (v * height / 2) + height / 2;
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                x += sliceWidth;
            }
            ctx.stroke();
        };
        loop();
    }
}
