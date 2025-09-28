import { PRESETS } from './presets.js';
import { PATTERNS } from './patterns.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- AUDIO CONTEXT & MASTER CHAIN SETUP ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioCtx.createGain();
    const driveNode = audioCtx.createWaveShaper();
    const compressor = audioCtx.createDynamicsCompressor();
    const limiter = audioCtx.createDynamicsCompressor();
    const analyser = audioCtx.createAnalyser();

    // Initial setup: Drive -> Compressor -> Limiter -> Analyser -> Master Gain -> Destination
    driveNode.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    
    // Safety Limiter setup
    limiter.threshold.value = -1.0;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;

    // Compressor default (DnB friendly)
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    analyser.fftSize = 256;
    const meterBuffer = new Float32Array(analyser.fftSize);

    // --- DOM ELEMENT REFERENCES ---
    const DOMElements = {
        playStopButton: document.getElementById('play-stop-button'),
        bpmInput: document.getElementById('bpm-input'),
        tapTempoButton: document.getElementById('tap-tempo-button'),
        swingKnob: document.getElementById('swing-knob'),
        swingValue: document.getElementById('swing-value'),
        limiterToggle: document.getElementById('limiter-toggle'),
        outputMeter: document.getElementById('output-meter'),
        presetDisplay: document.getElementById('preset-display'),
        presetNumber: document.getElementById('preset-number'),
        presetName: document.getElementById('preset-name'),
        presetCategory: document.getElementById('preset-category'),
        prevPreset: document.getElementById('prev-preset'),
        nextPreset: document.getElementById('next-preset'),
        pads: document.querySelectorAll('.pad'),
        cutoffKnob: document.getElementById('cutoff-knob'),
        resonanceKnob: document.getElementById('resonance-knob'),
        lfoRateKnob: document.getElementById('lfo-rate-knob'),
        lfoSyncToggle: document.getElementById('lfo-sync-toggle'),
        lfoDepthKnob: document.getElementById('lfo-depth-knob'),
        driveKnob: document.getElementById('drive-knob'),
        patternSelect: document.getElementById('pattern-select'),
        randomizeButton: document.getElementById('randomize-button'),
        resetButton: document.getElementById('reset-button'),
        exportButton: document.getElementById('export-button'),
        importButton: document.getElementById('import-button'),
    };

    // --- GLOBAL STATE ---
    let state = {
        isPlaying: false,
        bpm: 174,
        swing: 0, // 0-60
        currentStep: 0,
        nextNoteTime: 0.0,
        activePad: 0,
        presetIndex: 0,
        isLimiterOn: true,
        knobValues: {}, // Will be populated on init
    };

    let schedulerTimeoutId;
    let voice = {}; // Holds the current active audio nodes

    // --- PATTERN ENGINE ---
    const scheduleNote = () => {
        const secondsPerStep = 60.0 / state.bpm / 4; // 16th notes
        const currentPattern = PATTERNS[getCurrentPatternId()];
        
        while (state.nextNoteTime < audioCtx.currentTime + 0.1) {
            // Apply swing
            let stepTime = state.nextNoteTime;
            if (state.currentStep % 2 !== 0 && state.swing > 0) {
                 const swingOffset = (secondsPerStep * state.swing / 100);
                 stepTime += swingOffset;
            }

            const stepData = currentPattern.steps[state.currentStep];
            if (stepData.gate) {
                triggerNote(stepTime, stepData);
            }

            state.nextNoteTime += secondsPerStep;
            state.currentStep = (state.currentStep + 1) % 16;
        }

        schedulerTimeoutId = setTimeout(scheduleNote, 25);
    };
    
    // --- SYNTHESIS ENGINE ---
    const triggerNote = (time, stepData) => {
        killVoice(); // Prevent overlapping notes/clicks
        
        const preset = PRESETS[state.presetIndex];
        const macro = preset.macros[state.activePad];
        const noteLength = 60 / state.bpm * 0.5; // default duration

        const ampEnv = audioCtx.createGain();
        ampEnv.gain.value = 0;
        ampEnv.connect(driveNode);
        
        // OSCILLATORS
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const subOsc = audioCtx.createOscillator();
        osc1.type = preset.osc.osc1.type;
        osc2.type = preset.osc.osc2.type;
        subOsc.type = 'sine';
        
        const spread = preset.osc.spread;
        osc1.detune.value = -spread / 2;
        osc2.detune.value = spread / 2;
        subOsc.frequency.value = osc1.frequency.value / 2;

        const osc1Gain = audioCtx.createGain();
        const osc2Gain = audioCtx.createGain();
        const subGain = audioCtx.createGain();
        osc1Gain.gain.value = preset.osc.osc1.level;
        osc2Gain.gain.value = preset.osc.osc2.level;
        subGain.gain.value = preset.osc.subLevel;

        osc1.connect(osc1Gain);
        osc2.connect(osc2Gain);
        subOsc.connect(subGain);
        
        // NOISE
        let noiseNode, noiseGain;
        if(preset.osc.noise > 0){
            noiseNode = audioCtx.createBufferSource();
            const bufferSize = audioCtx.sampleRate * 2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            let data = buffer.getChannelData(0);
            for(let i=0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            noiseNode.buffer = buffer;
            noiseNode.loop = true;
            noiseGain = audioCtx.createGain();
            noiseGain.gain.value = preset.osc.noise;
            noiseNode.connect(noiseGain);
        }

        // FILTER
        const filter = audioCtx.createBiquadFilter();
        filter.type = preset.filter.type;
        const baseCutoff = Math.pow(DOMElements.cutoffKnob.valueAsNumber / 1000, 2) * 1000; // Logarithmic scaling
        filter.frequency.value = baseCutoff;
        filter.Q.value = DOMElements.resonanceKnob.valueAsNumber;
        
        osc1Gain.connect(filter);
        osc2Gain.connect(filter);
        subGain.connect(filter);
        if(noiseGain) noiseGain.connect(filter);
        filter.connect(ampEnv);

        // LFO
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.type = preset.lfo.shape;

        const isSync = DOMElements.lfoSyncToggle.classList.contains('active');
        const lfoRateVal = DOMElements.lfoRateKnob.valueAsNumber;
        if(isSync){
             const syncRates = [8, 4, 2, 1, 0.5, 0.25, 1/3, 0.125];
             lfo.frequency.value = state.bpm / 60 / syncRates[Math.floor(lfoRateVal / 12.5)];
        } else {
             lfo.frequency.value = (lfoRateVal/100) * 20; // 0-20 Hz
        }

        const lfoDepth = (DOMElements.lfoDepthKnob.valueAsNumber / 100) * (preset.lfo.depth || 5000);
        lfoGain.gain.value = lfoDepth + (stepData.mod * 4000); // mod lane adds depth
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // AMP ENVELOPE (ADSR)
        const { a, d, s, r } = preset.ampEnv;
        ampEnv.gain.cancelScheduledValues(time);
        ampEnv.gain.setValueAtTime(0, time);
        ampEnv.gain.linearRampToValueAtTime(stepData.accent, time + a);
        ampEnv.gain.linearRampToValueAtTime(s * stepData.accent, time + a + d);
        ampEnv.gain.setValueAtTime(s * stepData.accent, time + noteLength - r);
        ampEnv.gain.linearRampToValueAtTime(0, time + noteLength);

        // Start Oscillators
        [osc1, osc2, subOsc, lfo, noiseNode].forEach(node => node && node.start(time));

        // Stop Oscillators gracefully
        [osc1, osc2, subOsc, noiseNode].forEach(node => node && node.stop(time + noteLength));
        lfo.stop(time+noteLength);

        voice = { osc1, osc2, subOsc, lfo, ampEnv, noiseNode };
    };
    
    const killVoice = () => {
        if(voice.ampEnv) {
            voice.ampEnv.gain.cancelScheduledValues(audioCtx.currentTime);
            voice.ampEnv.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
        }
    };
    
    // --- UI WIRING & EVENT HANDLERS ---
    
    function updateKnob(knobId, value, formatFn) {
         if(!DOMElements[knobId+'Knob']) return;
         DOMElements[knobId+'Knob'].value = value;
         state.knobValues[knobId] = value;
         if(formatFn && DOMElements[knobId+'Value']) {
             DOMElements[knobId+'Value'].textContent = formatFn(value);
         }
         updateURLHash();
    }
    
    function setupUI() {
        // Transport
        DOMElements.playStopButton.addEventListener('click', togglePlay);
        DOMElements.bpmInput.addEventListener('change', e => updateBPM(e.target.value));
        DOMElements.tapTempoButton.addEventListener('click', handleTapTempo);
        DOMElements.swingKnob.addEventListener('input', e => {
            state.swing = parseInt(e.target.value, 10);
            DOMElements.swingValue.textContent = state.swing;
        });

        // Presets
        DOMElements.prevPreset.addEventListener('click', () => changePreset(-1));
        DOMElements.nextPreset.addEventListener('click', () => changePreset(1));
        
        // Pads
        DOMElements.pads.forEach((pad, i) => pad.addEventListener('click', () => selectPad(i)));

        // Knobs
        DOMElements.cutoffKnob.addEventListener('input', e => updateKnob('cutoff', e.target.value, v => `${Math.round(v)} Hz`));
        DOMElements.resonanceKnob.addEventListener('input', e => updateKnob('resonance', e.target.value, v => parseFloat(v).toFixed(1)));
        DOMElements.lfoRateKnob.addEventListener('input', e => updateKnob('lfoRate', e.target.value));
        DOMElements.lfoDepthKnob.addEventListener('input', e => updateKnob('lfoDepth', e.target.value, v => `${v}%`));
        DOMElements.driveKnob.addEventListener('input', e => {
             updateKnob('drive', e.target.value, v => `${v}%`);
             setDriveAmount(e.target.value);
        });
        DOMElements.lfoSyncToggle.addEventListener('click', (e) => e.target.classList.toggle('active'));

        // Patterns
        PATTERNS.forEach((p, i) => {
           const option = document.createElement('option');
           option.value = i;
           option.textContent = p.name;
           DOMElements.patternSelect.appendChild(option);
        });

        // Utils
        DOMElements.randomizeButton.addEventListener('click', randomize);
        DOMElements.resetButton.addEventListener('click', () => loadPreset(state.presetIndex, true));
        DOMElements.limiterToggle.addEventListener('click', toggleLimiter);
        DOMElements.exportButton.addEventListener('click', exportState);
        DOMElements.importButton.addEventListener('click', importState);

        // Keyboard shortcuts
        window.addEventListener('keydown', handleKeyPress);
    }
    
    // --- CONTROL LOGIC ---
    
    function togglePlay() {
        if(audioCtx.state === 'suspended') { audioCtx.resume(); }

        state.isPlaying = !state.isPlaying;
        if(state.isPlaying) {
            state.currentStep = 0;
            state.nextNoteTime = audioCtx.currentTime;
            scheduleNote();
            DOMElements.playStopButton.textContent = "STOP";
            DOMElements.playStopButton.classList.add('playing');
        } else {
            clearTimeout(schedulerTimeoutId);
            killVoice();
            DOMElements.playStopButton.textContent = "PLAY";
            DOMElements.playStopButton.classList.remove('playing');
        }
    }
    
    let lastTap = 0;
    const tapTimes = [];
    function handleTapTempo() {
        const now = audioCtx.currentTime;
        if(now - lastTap > 2) { // Reset after 2 seconds
            tapTimes.length = 0;
        }
        lastTap = now;
        tapTimes.push(now);
        if(tapTimes.length > 3) tapTimes.shift();
        if(tapTimes.length > 1) {
            const avgInterval = (tapTimes[tapTimes.length-1] - tapTimes[0]) / (tapTimes.length -1);
            updateBPM(Math.round(60 / avgInterval));
        }
    }

    function updateBPM(newBPM) {
        state.bpm = Math.max(20, Math.min(220, newBPM));
        DOMElements.bpmInput.value = state.bpm;
    }
    
    function changePreset(delta) {
        let newIndex = state.presetIndex + delta;
        if (newIndex < 0) newIndex = PRESETS.length - 1;
        if (newIndex >= PRESETS.length) newIndex = 0;
        loadPreset(newIndex, true);
    }

    function loadPreset(index, resetControls = true) {
        state.presetIndex = index;
        const preset = PRESETS[index];

        DOMElements.presetNumber.textContent = (index + 1).toString().padStart(2, '0');
        DOMElements.presetName.textContent = preset.name;
        DOMElements.presetCategory.textContent = preset.category;

        if (resetControls) {
            selectPad(0, true); // Go to first pad but don't re-apply macro instantly
            // Set default macro/pattern for pad 1
            const defaultMacro = preset.macros[0];
            DOMElements.patternSelect.value = defaultMacro.patternId;

            updateKnob('cutoff', 10000, v => `${Math.round(v)} Hz`);
            updateKnob('resonance', preset.filter.Q, v => parseFloat(v).toFixed(1));
            updateKnob('lfoRate', 50); // Default to a mid-value
            updateKnob('lfoDepth', 60, v => `${v}%`);
            updateKnob('drive', 0, v => `${v}%`);
            setDriveAmount(0);
        }
         updateURLHash();
    }
    
    function selectPad(index, silent = false) {
        state.activePad = index;
        DOMElements.pads.forEach((p, i) => {
            p.classList.toggle('active', i === index);
        });

        if (silent) return;

        // Apply macro from preset
        const preset = PRESETS[state.presetIndex];
        const macro = preset.macros[index];

        DOMElements.patternSelect.value = macro.patternId;
        
        // Use smooth transitions for audio params to avoid clicks
        const now = audioCtx.currentTime;
        const cutoffValue = Math.min(20000, Math.max(20, DOMElements.cutoffKnob.valueAsNumber + (macro.cutoff || 0)));
        const lfoDepthValue = Math.min(100, Math.max(0, DOMElements.lfoDepthKnob.valueAsNumber + (macro.lfoDepth || 0)));
        const driveValue = Math.min(100, Math.max(0, DOMElements.driveKnob.valueAsNumber + (macro.drive || 0)));
        
        if (voice.filter && voice.filter.frequency) {
            voice.filter.frequency.setTargetAtTime(cutoffValue, now, 0.015);
        }

        updateKnob('lfoDepth', lfoDepthValue, v => `${v}%`);
        updateKnob('drive', driveValue, v => `${v}%`);
        setDriveAmount(driveValue);
    }
    
    function setDriveAmount(percent) {
        const amount = percent / 100;
        const k = amount * 100;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        driveNode.curve = curve;
        driveNode.oversample = '4x';
    }

    function toggleLimiter() {
        state.isLimiterOn = !state.isLimiterOn;
        if(state.isLimiterOn) {
            compressor.disconnect();
            compressor.connect(limiter);
            DOMElements.limiterToggle.classList.add('active');
        } else {
            compressor.disconnect();
            compressor.connect(analyser); // bypass limiter
            DOMElements.limiterToggle.classList.remove('active');
        }
    }
    
    function randomize() {
        updateKnob('cutoff', 400 + Math.random() * 15000, v => `${Math.round(v)} Hz`);
        updateKnob('resonance', Math.random() * 15, v => parseFloat(v).toFixed(1));
        updateKnob('lfoRate', Math.random() * 100);
        updateKnob('lfoDepth', Math.random() * 100, v => `${v}%`);
        updateKnob('drive', Math.random() * 40, v => `${v}%`);
        setDriveAmount(DOMElements.driveKnob.valueAsNumber);
        
        const randomPattern = Math.floor(Math.random() * PATTERNS.length);
        DOMElements.patternSelect.value = randomPattern;
    }
    
    function getCurrentPatternId() {
        return DOMElements.patternSelect.value;
    }

    function handleKeyPress(e) {
        if(e.target.tagName === 'INPUT') return;
        if(e.code === 'Space') { e.preventDefault(); togglePlay(); }
        if(e.code >= 'Digit1' && e.code <= 'Digit8') { selectPad(parseInt(e.key, 10)-1); }
        if(e.code === 'KeyR') randomize();
        if(e.code === 'Digit0') loadPreset(state.presetIndex, true);
        if(e.code === 'Minus' || e.code === 'NumpadSubtract') { e.preventDefault(); updateBPM(state.bpm - 1); }
        if(e.code === 'Equal' || e.code === 'NumpadAdd') { e.preventDefault(); updateBPM(state.bpm + 1); }
    }
    
    function updateVisuals() {
        analyser.getFloatTimeDomainData(meterBuffer);
        let peak = 0;
        for (let i = 0; i < meterBuffer.length; i++) {
            peak = Math.max(peak, Math.abs(meterBuffer[i]));
        }
        DOMElements.outputMeter.value = peak;
        requestAnimationFrame(updateVisuals);
    }
    
    // --- STATE MANAGEMENT ---
    
    function exportState(){
        const currentState = {
            p: state.presetIndex,
            b: state.bpm,
            s: state.swing,
            k: state.knobValues
        };
        const jsonString = JSON.stringify(currentState);
        navigator.clipboard.writeText(jsonString).then(() => alert('State copied to clipboard!'));
    }

    function importState(){
        navigator.clipboard.readText().then(jsonString => {
            try {
                const newState = JSON.parse(jsonString);
                state.bpm = newState.b;
                state.swing = newState.s;
                DOMElements.bpmInput.value = state.bpm;
                DOMElements.swingKnob.value = state.swing;
                DOMElements.swingValue.textContent = state.swing;
                
                Object.keys(newState.k).forEach(knobId => {
                    updateKnob(knobId, newState.k[knobId]);
                });
                
                // Special handling for values needing formatting/effects applied
                setDriveAmount(newState.k.drive);
                DOMElements.cutoffValue.textContent = `${Math.round(newState.k.cutoff)} Hz`;
                DOMElements.resonanceValue.textContent = parseFloat(newState.k.resonance).toFixed(1);
                DOMElements.lfoDepthValue.textContent = `${newState.k.lfoDepth}%`;
                DOMElements.driveValue.textContent = `${newState.k.drive}%`;

                loadPreset(newState.p, false); // load preset without resetting controls

                alert('State imported successfully!');
            } catch (e) {
                alert('Invalid state data in clipboard.');
            }
        });
    }

    function updateURLHash() {
        const hashState = {
            p: state.presetIndex,
            pad: state.activePad,
            k: {
                c: Math.round(state.knobValues.cutoff),
                r: parseFloat(state.knobValues.resonance).toFixed(1),
                lr: Math.round(state.knobValues.lfoRate),
                ld: Math.round(state.knobValues.lfoDepth),
                d: Math.round(state.knobValues.drive),
            }
        };
        location.hash = btoa(JSON.stringify(hashState));
    }
    
    function loadFromURLHash() {
        if(!location.hash.substring(1)) return;
        try {
            const hashState = JSON.parse(atob(location.hash.substring(1)));
            loadPreset(hashState.p, true); // load preset and its defaults
            
            // then apply custom values from hash
            if(hashState.k.c) updateKnob('cutoff', hashState.k.c, v => `${Math.round(v)} Hz`);
            if(hashState.k.r) updateKnob('resonance', hashState.k.r, v => parseFloat(v).toFixed(1));
            if(hashState.k.lr) updateKnob('lfoRate', hashState.k.lr);
            if(hashState.k.ld) updateKnob('lfoDepth', hashState.k.ld, v => `${v}%`);
            if(hashState.k.d) {
                updateKnob('drive', hashState.k.d, v => `${v}%`);
                setDriveAmount(hashState.k.d);
            }
            if(hashState.pad !== undefined) selectPad(hashState.pad);

        } catch (e) {
            console.log("Could not parse state from URL hash.");
        }
    }


    // --- INITIALIZATION ---
    function init() {
        console.log("DnB Bass Synth Initializing...");
        setupUI();
        loadFromURLHash(); // Check if there's a state in the URL
        if(!location.hash.substring(1)){ // If not, load default
            loadPreset(0, true);
        }
        updateVisuals();
        // Prompt user to start audio context
        DOMElements.playStopButton.textContent = "CLICK TO START";
    }

    init();
});