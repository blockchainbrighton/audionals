import { presets } from './presets.js';
import { patterns } from './patterns.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const DOMElements = {
        playStopBtn: document.getElementById('play-stop'),
        bpmInput: document.getElementById('bpm'),
        tapTempoBtn: document.getElementById('tap-tempo'),
        swingSlider: document.getElementById('swing'),
        noteDivisionSelect: document.getElementById('note-division'),
        presetSelector: document.getElementById('preset-selector'),
        prevPresetBtn: document.getElementById('prev-preset'),
        nextPresetBtn: document.getElementById('next-preset'),
        pads: document.querySelectorAll('.pad'),
        cutoffKnob: document.getElementById('cutoff'),
        resonanceKnob: document.getElementById('resonance'),
        lfoRateKnob: document.getElementById('lfo-rate'),
        lfoSyncBtn: document.getElementById('lfo-sync'),
        lfoDepthKnob: document.getElementById('lfo-depth'),
        driveKnob: document.getElementById('drive'),
        patternSelector: document.getElementById('pattern-selector'),
        randomizeBtn: document.getElementById('randomize'),
        resetBtn: document.getElementById('reset'),
        outputMeter: document.getElementById('output-meter'),
        limiterToggle: document.getElementById('limiter-toggle'),
    };

    // --- Web Audio API Setup ---
    let audioCtx;
    let mainGain, limiter, analyser;
    let osc1, osc2, subOsc, noise;
    let filter, drive, chorus, delay, reverb;
    let ampEnv, modEnv;
    let lfo, lfoGain;

    // --- State ---
    const state = {
        isPlaying: false,
        bpm: 174,
        swing: 0,
        noteDivision: 8,
        currentStep: 0,
        activePad: 0,
        currentPreset: 0,
        lfoSynced: true,
        limiterOn: true,
        lastTap: 0,
        tapTimes: [],
        noteTime: 0.0,
        startTime: 0.0,
    };

    // --- Initialization ---
    function init() {
        populatePresets();
        populatePatterns();
        loadPreset(state.currentPreset);
        setupEventListeners();
        updateUI();
        requestAnimationFrame(drawMeter);
    }

    function setupAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Master Chain
        mainGain = audioCtx.createGain();
        limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.005;
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        mainGain.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        // Synth Nodes
        osc1 = audioCtx.createOscillator();
        osc2 = audioCtx.createOscillator();
        subOsc = audioCtx.createOscillator();
        noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        noise.loop = true;

        filter = audioCtx.createBiquadFilter();
        drive = audioCtx.createWaveShaper();
        ampEnv = audioCtx.createGain();
        modEnv = audioCtx.createGain();
        lfo = audioCtx.createOscillator();
        lfoGain = audioCtx.createGain();

        // FX (stubs for future implementation)
        chorus = audioCtx.createGain();
        delay = audioCtx.createGain();
        reverb = audioCtx.createGain();

        // Routing
        const oscGain = audioCtx.createGain();
        osc1.connect(oscGain);
        osc2.connect(oscGain);
        subOsc.connect(oscGain);
        noise.connect(oscGain);
        
        oscGain.connect(drive);
        drive.connect(filter);
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        filter.connect(ampEnv);
        ampEnv.connect(chorus);
        chorus.connect(delay);
        delay.connect(reverb);
        reverb.connect(mainGain);

        osc1.start();
        osc2.start();
        subOsc.start();
        noise.start();
        lfo.start();
    }

    // --- Preset & Pattern Handling ---
    function populatePresets() {
        presets.forEach((p, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i + 1}. [${p.category}] ${p.name}`;
            DOMElements.presetSelector.appendChild(option);
        });
    }

    function populatePatterns() {
        patterns.forEach((p, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = p.name;
            DOMElements.patternSelector.appendChild(option);
        });
    }

    function loadPreset(index) {
        state.currentPreset = parseInt(index);
        const p = presets[state.currentPreset];

        // Oscillators
        osc1.type = p.osc.osc1.type;
        osc1.detune.value = p.osc.osc1.detune;
        osc2.type = p.osc.osc2.type;
        osc2.detune.value = p.osc.osc2.detune;
        subOsc.frequency.value = getNoteFrequency(p.baseNote) / 2;
        
        // Filter
        filter.type = p.filter.type;
        DOMElements.cutoffKnob.value = p.filter.cutoff;
        DOMElements.resonanceKnob.value = p.filter.resonance;

        // LFO
        lfo.type = p.lfo.shape;
        state.lfoSynced = p.lfo.sync;
        DOMElements.lfoRateKnob.value = p.lfo.rate;
        DOMElements.lfoDepthKnob.value = p.lfo.depth;
        
        // Drive
        DOMElements.driveKnob.value = p.fx.drive;

        updateAllParams();
        updateUI();
    }

    function getNoteFrequency(note) {
        const a4 = 440;
        const semitones = note - 69;
        return a4 * Math.pow(2, semitones / 12);
    }

    // --- Transport & Scheduling ---
    function scheduler() {
        while (state.noteTime < audioCtx.currentTime + 0.1) {
            playStep(state.currentStep);
            nextStep();
        }
        window.setTimeout(scheduler, 50.0);
    }
    
    function nextStep() {
        const secondsPerBeat = 60.0 / state.bpm;
        const noteDuration = (4.0 / state.noteDivision) * secondsPerBeat;
        
        state.noteTime += noteDuration;
    
        state.currentStep++;
        if (state.currentStep >= patterns[DOMElements.patternSelector.value].gate.length) {
            state.currentStep = 0;
        }
    }

    function playStep(step) {
        const pattern = patterns[DOMElements.patternSelector.value];
        const gate = pattern.gate[step];
        if (gate > 0) {
            triggerNote(audioCtx.currentTime);
        }
    }
    
    function triggerNote(time) {
        const p = presets[state.currentPreset];
        ampEnv.gain.cancelScheduledValues(time);
        ampEnv.gain.setValueAtTime(0, time);
        ampEnv.gain.linearRampToValueAtTime(1, time + p.ampEnv.a);
        ampEnv.gain.linearRampToValueAtTime(p.ampEnv.s, time + p.ampEnv.a + p.ampEnv.d);
        ampEnv.gain.setValueAtTime(p.ampEnv.s, time + 0.2) // Note length
        ampEnv.gain.linearRampToValueAtTime(0, time + 0.2 + p.ampEnv.r);
    }

    function togglePlay() {
        state.isPlaying = !state.isPlaying;
        if (state.isPlaying) {
            setupAudio();
            audioCtx.resume();
            state.currentStep = 0;
            state.noteTime = audioCtx.currentTime;
            scheduler();
            DOMElements.playStopBtn.textContent = 'Stop';
            DOMElements.playStopBtn.classList.add('playing');
        } else {
            audioCtx.suspend();
            DOMElements.playStopBtn.textContent = 'Play';
            DOMElements.playStopBtn.classList.remove('playing');
        }
    }
    
    function tapTempo() {
        const now = performance.now();
        if (state.lastTap > 0) {
            state.tapTimes.push(now - state.lastTap);
            if (state.tapTimes.length > 3) state.tapTimes.shift();
            const avg = state.tapTimes.reduce((a, b) => a + b, 0) / state.tapTimes.length;
            state.bpm = Math.round(60000 / avg);
            DOMElements.bpmInput.value = state.bpm;
        }
        state.lastTap = now;
    }

    // --- UI & Event Handling ---
    function setupEventListeners() {
        DOMElements.playStopBtn.addEventListener('click', togglePlay);
        DOMElements.bpmInput.addEventListener('change', e => state.bpm = e.target.value);
        DOMElements.tapTempoBtn.addEventListener('click', tapTempo);
        DOMElements.swingSlider.addEventListener('input', e => state.swing = e.target.value / 100);
        DOMElements.noteDivisionSelect.addEventListener('change', e => state.noteDivision = e.target.value);

        DOMElements.presetSelector.addEventListener('change', e => loadPreset(e.target.value));
        DOMElements.prevPresetBtn.addEventListener('click', () => navigatePreset(-1));
        DOMElements.nextPresetBtn.addEventListener('click', () => navigatePreset(1));
        
        DOMElements.pads.forEach(pad => {
            pad.addEventListener('click', () => activatePad(pad.dataset.pad));
        });

        DOMElements.cutoffKnob.addEventListener('input', e => updateParam('cutoff', e.target.value));
        DOMElements.resonanceKnob.addEventListener('input', e => updateParam('resonance', e.target.value));
        DOMElements.lfoRateKnob.addEventListener('input', e => updateParam('lfoRate', e.target.value));
        DOMElements.lfoSyncBtn.addEventListener('click', toggleLfoSync);
        DOMElements.lfoDepthKnob.addEventListener('input', e => updateParam('lfoDepth', e.target.value));
        DOMElements.driveKnob.addEventListener('input', e => updateParam('drive', e.target.value));

        DOMElements.randomizeBtn.addEventListener('click', randomizeParams);
        DOMElements.resetBtn.addEventListener('click', () => loadPreset(state.currentPreset));
        DOMElements.limiterToggle.addEventListener('click', toggleLimiter);

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
            if (e.key >= '1' && e.key <= '8') activatePad(parseInt(e.key) - 1);
            if (e.key === 'r') randomizeParams();
            if (e.key === '0') loadPreset(state.currentPreset);
        });
    }

    function updateUI() {
        DOMElements.presetSelector.value = state.currentPreset;
        DOMElements.bpmInput.value = state.bpm;
        DOMElements.swingSlider.value = state.swing * 100;
        DOMElements.noteDivisionSelect.value = state.noteDivision;
        DOMElements.lfoSyncBtn.classList.toggle('active', state.lfoSynced);
        DOMElements.limiterToggle.classList.toggle('active', state.limiterOn);
        
        DOMElements.pads.forEach((pad, i) => {
            pad.classList.toggle('active', i == state.activePad);
        });
    }
    
    function navigatePreset(direction) {
        let newIndex = state.currentPreset + direction;
        if (newIndex < 0) newIndex = presets.length - 1;
        if (newIndex >= presets.length) newIndex = 0;
        loadPreset(newIndex);
    }
    
    function activatePad(padIndex) {
        state.activePad = parseInt(padIndex);
        const p = presets[state.currentPreset];
        const scene = p.scenes[state.activePad];
        
        if (scene.patternId !== undefined) {
            DOMElements.patternSelector.value = scene.patternId;
        }
        if (scene.cutoff) DOMElements.cutoffKnob.value = scene.cutoff;
        if (scene.lfoRate) DOMElements.lfoRateKnob.value = scene.lfoRate;
        if (scene.lfoDepth) DOMElements.lfoDepthKnob.value = scene.lfoDepth;
        if (scene.drive) DOMElements.driveKnob.value = scene.drive;
        
        updateAllParams();
        updateUI();
    }
    
    function toggleLfoSync() {
        state.lfoSynced = !state.lfoSynced;
        updateAllParams();
        updateUI();
    }
    
    function toggleLimiter() {
        state.limiterOn = !state.limiterOn;
        if (state.limiterOn) {
            mainGain.disconnect();
            mainGain.connect(limiter);
        } else {
            mainGain.disconnect();
            mainGain.connect(analyser);
        }
        updateUI();
    }

    // --- Parameter Updates & Sound Generation ---
    function updateAllParams() {
        updateParam('cutoff', DOMElements.cutoffKnob.value);
        updateParam('resonance', DOMElements.resonanceKnob.value);
        updateParam('lfoRate', DOMElements.lfoRateKnob.value);
        updateParam('lfoDepth', DOMElements.lfoDepthKnob.value);
        updateParam('drive', DOMElements.driveKnob.value);
    }

    function updateParam(param, value) {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const p = presets[state.currentPreset];
        
        switch(param) {
            case 'cutoff':
                const freq = parseFloat(value);
                filter.frequency.setTargetAtTime(freq, now, 0.01);
                break;
            case 'resonance':
                filter.Q.setTargetAtTime(parseFloat(value), now, 0.01);
                break;
            case 'lfoRate':
                if (state.lfoSynced) {
                    const beatRate = state.bpm / 60;
                    lfo.frequency.setTargetAtTime(beatRate * parseFloat(value), now, 0.01);
                } else {
                    lfo.frequency.setTargetAtTime(parseFloat(value), now, 0.01);
                }
                break;
            case 'lfoDepth':
                lfoGain.gain.setTargetAtTime(parseFloat(value), now, 0.01);
                break;
            case 'drive':
                const amount = parseFloat(value);
                const k = amount * 100;
                const curve = new Float32Array(256);
                const deg = Math.PI / 180;
                for (let i = 0; i < 256; i++) {
                    const x = i * 2 / 256 - 1;
                    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                }
                drive.curve = curve;
                break;
        }
    }

    function randomizeParams() {
        DOMElements.cutoffKnob.value = 200 + Math.random() * 5000;
        DOMElements.resonanceKnob.value = Math.random() * 20;
        DOMElements.lfoRateKnob.value = 0.5 + Math.random() * 16;
        DOMElements.lfoDepthKnob.value = Math.random() * 5000;
        DOMElements.driveKnob.value = Math.random() * 0.5;
        updateAllParams();
    }

    function drawMeter() {
        if (state.isPlaying && analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const val = (dataArray[i] - 128) / 128;
                sum += val * val;
            }
            const rms = Math.sqrt(sum / bufferLength);
            DOMElements.outputMeter.style.width = (rms * 100 * 2) + '%';
        } else {
            DOMElements.outputMeter.style.width = '0%';
        }
        requestAnimationFrame(drawMeter);
    }

    init();
});

// Dummy preset and pattern files for modularity
// In a real scenario, these would be in separate files as imported.

const presets = [
    {
        name: "Classic Reese",
        category: "Reese",
        baseNote: 40,
        osc: {
            osc1: { type: 'sawtooth', detune: -7 },
            osc2: { type: 'sawtooth', detune: 7 },
        },
        filter: { type: 'lowpass', cutoff: 800, resonance: 5 },
        ampEnv: { a: 0.02, d: 0.8, s: 0.7, r: 0.3 },
        lfo: { shape: 'sine', rate: 4, depth: 300, sync: true },
        fx: { drive: 0.1 },
        scenes: [
            { patternId: 0, cutoff: 800 }, { patternId: 1, cutoff: 1200 },
            { patternId: 2, lfoRate: 8 }, { patternId: 3, lfoDepth: 800 },
            { patternId: 4, drive: 0.3 }, { patternId: 5, cutoff: 600 },
            { patternId: 6, lfoRate: 2 }, { patternId: 7, cutoff: 1500, lfoDepth: 1000 },
        ]
    },
    // ... Add 87 more presets here
];

const patterns = [
    { name: "Straight 16ths", gate: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Classic DnB", gate: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
    // ... Add more patterns
];