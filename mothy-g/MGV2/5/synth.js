// DnB Bass Toy - Web Audio API Implementation
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isPlaying = false;
let currentPresetIndex = 0;
let currentPad = 1;
let bpm = 174;
let swing = 0;
let lfoSync = true;
let patternIntensity = 0.5;
let limiterEnabled = true;
let meterValue = 0;
let meterInterval;

// Transport
let schedulerInterval;
let nextStepTime = 0;
let currentStep = 0;
const stepResolution = 16; // 16 steps per beat (1/16 notes)
const lookahead = 25; // ms
const scheduleAheadTime = 0.1; // seconds

// Audio Nodes
let masterGain;
let limiter;
let compressor;
let stereoWidth;
let filter;
let ampEnv;
let modEnv;
let lfo;
let lfoGain;
let drive;
let chorus;
let delay;
let reverb;
let noise;
let osc1, osc2, subOsc;
let noiseGain;
let osc1Gain, osc2Gain, subGain;
let filterEnvGain;
let lfoTarget;
let patternEngine;

// Pattern definitions
const patterns = [
    { name: "1/16 Straight", data: { gates: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "1/8 Straight", data: { gates: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Wobble", data: { gates: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], mods: [1,0.2,0.1,0,0.8,0.3,0.1,0,1,0.2,0.1,0,0.8,0.3,0.1,0] } },
    { name: "Offbeat", data: { gates: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Stutter", data: { gates: [1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0], mods: [0.5,0.3,0.1,0,0,0,0,0,0.5,0.3,0.1,0,0,0,0,0] } },
    { name: "Triplet Roll", data: { gates: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Amen Sync", data: { gates: [1,0,1,1,0,1,0,1,1,0,1,1,0,1,0,1], mods: [0.2,0,0.5,0.3,0,0.4,0,0.6,0.2,0,0.5,0.3,0,0.4,0,0.6] } },
    { name: "Long Hold", data: { gates: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Neuro Stab", data: { gates: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], mods: [1,0.8,0.6,0.4,0.2,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Reese Pulse", data: { gates: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], mods: [0.7,0.5,0.3,0.1,0.7,0.5,0.3,0.1,0.7,0.5,0.3,0.1,0.7,0.5,0.3,0.1] } },
    { name: "Sub Drop", data: { gates: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], mods: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] } },
    { name: "Metallic", data: { gates: [1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1], mods: [0.9,0.7,0,0.8,0.6,0,0.9,0.7,0,0.8,0.6,0,0.9,0.7,0,0.8] } }
];

// Preset definitions (88 presets)
const presets = [];
const categories = ["Reese", "Wobble", "Neuro", "Sub", "Notch", "Formant", "Hoover", "Metallic", "Clean", "Gritty"];
const waveforms = ["sine", "square", "sawtooth", "triangle"];
const filterTypes = ["lowpass", "bandpass", "notch"];

// Generate 88 presets
for (let i = 0; i < 88; i++) {
    const category = categories[i % categories.length];
    const osc1Wave = waveforms[Math.floor(Math.random() * waveforms.length)];
    const osc2Wave = waveforms[Math.floor(Math.random() * waveforms.length)];
    const detune = category === "Reese" ? (Math.random() * 40 - 20) : (Math.random() * 20 - 10);
    const spread = category === "Reese" ? (0.3 + Math.random() * 0.4) : (0.1 + Math.random() * 0.2);
    const subLevel = category === "Sub" ? (0.7 + Math.random() * 0.3) : (0.2 + Math.random() * 0.3);
    const noiseAmount = category === "Gritty" || category === "Metallic" ? (0.3 + Math.random() * 0.4) : (Math.random() * 0.2);
    const filterType = filterTypes[Math.floor(Math.random() * filterTypes.length)];
    const cutoff = category === "Sub" ? (0.1 + Math.random() * 0.2) : (0.3 + Math.random() * 0.5);
    const resonance = category === "Notch" ? (0.1 + Math.random() * 0.3) : (0.3 + Math.random() * 0.5);
    const keyTrack = category === "Formant" ? (0.7 + Math.random() * 0.3) : (0.3 + Math.random() * 0.4);
    const lfoRate = 0.3 + Math.random() * 0.5;
    const lfoDepth = category === "Wobble" ? (0.6 + Math.random() * 0.3) : (0.3 + Math.random() * 0.4);
    const lfoShape = ["sine", "triangle", "sawtooth", "square", "random"][Math.floor(Math.random() * 5)];
    const driveAmount = category === "Gritty" ? (0.6 + Math.random() * 0.3) : (0.2 + Math.random() * 0.3);
    const chorusMix = category === "Clean" ? (0.2 + Math.random() * 0.2) : (0.1 + Math.random() * 0.2);
    const delayMix = category === "Neuro" ? (0.3 + Math.random() * 0.3) : (0.1 + Math.random() * 0.2);
    const reverbMix = category === "Formant" ? (0.4 + Math.random() * 0.3) : (0.1 + Math.random() * 0.2);
    
    // Macro scenes for pads 1-8
    const macroScenes = [];
    for (let pad = 1; pad <= 8; pad++) {
        const patternId = Math.floor(Math.random() * patterns.length);
        const intensity = 0.4 + Math.random() * 0.4;
        const cutoffBias = -0.2 + Math.random() * 0.4;
        const driveBump = 0.1 + Math.random() * 0.2;
        const lfoRateMod = -0.3 + Math.random() * 0.6;
        const lfoDepthMod = -0.2 + Math.random() * 0.4;
        const fxMixMod = -0.1 + Math.random() * 0.2;
        macroScenes.push({
            patternId,
            intensity,
            cutoffBias,
            driveBump,
            lfoRateMod,
            lfoDepthMod,
            fxMixMod
        });
    }
    
    presets.push({
        name: `${category} ${i + 1}`,
        category,
        osc1: { wave: osc1Wave, detune: detune * (1 - spread) },
        osc2: { wave: osc2Wave, detune: detune * spread },
        sub: { level: subLevel },
        noise: { amount: noiseAmount },
        filter: { type: filterType, cutoff, resonance, keyTrack },
        ampEnv: { attack: 0.001, decay: 0.1, sustain: 0.7, release: 0.2 },
        modEnv: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
        lfo: { rate: lfoRate, depth: lfoDepth, shape: lfoShape, sync: true },
        drive: { amount: driveAmount },
        fx: { chorus: chorusMix, delay: delayMix, reverb: reverbMix },
        macroScenes
    });
}

// Initialize audio graph
function initAudio() {
    // Master chain
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    
    // Limiter (safety)
    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
    
    // Compressor (DnB style)
    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    
    // Stereo width (mono below 120Hz)
    stereoWidth = audioContext.createStereoPanner();
    stereoWidth.pan.value = 0.3;
    
    // Drive (waveshaper)
    drive = audioContext.createWaveShaper();
    drive.oversample = '4x';
    
    // Filter
    filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 1;
    
    // Envelopes
    ampEnv = audioContext.createGain();
    modEnv = audioContext.createGain();
    
    // LFO
    lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    lfoGain = audioContext.createGain();
    lfoTarget = audioContext.createGain();
    
    // Oscillators
    osc1 = audioContext.createOscillator();
    osc2 = audioContext.createOscillator();
    subOsc = audioContext.createOscillator();
    subOsc.type = 'sine';
    
    // Gains
    osc1Gain = audioContext.createGain();
    osc2Gain = audioContext.createGain();
    subGain = audioContext.createGain();
    noise = audioContext.createWhiteNoise = () => {
        const bufferSize = 2 * audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return audioContext.createBufferSource();
    };
    noise = audioContext.createBufferSource();
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseGain = audioContext.createGain();
    
    // FX
    chorus = audioContext.createGain();
    delay = audioContext.createDelay(1);
    const delayFeedback = audioContext.createGain();
    delayFeedback.gain.value = 0.3;
    const delayGain = audioContext.createGain();
    reverb = audioContext.createConvolver();
    // Simple reverb impulse
    const reverbBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const channelData = reverbBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.5));
        }
    }
    reverb.buffer = reverbBuffer;
    
    // Routing
    // Oscillators -> Drive -> Filter -> Amp Env -> Master
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    subOsc.connect(subGain);
    noise.connect(noiseGain);
    
    const oscMixer = audioContext.createGain();
    osc1Gain.connect(oscMixer);
    osc2Gain.connect(oscMixer);
    subGain.connect(oscMixer);
    noiseGain.connect(oscMixer);
    
    oscMixer.connect(drive);
    drive.connect(filter);
    filter.connect(ampEnv);
    ampEnv.connect(compressor);
    
    // Mod Env -> Filter Cutoff
    modEnv.connect(filter.frequency);
    
    // LFO -> Filter Cutoff
    lfo.connect(lfoGain);
    lfoGain.connect(lfoTarget);
    lfoTarget.connect(filter.frequency);
    
    // FX sends
    const fxSend = audioContext.createGain();
    fxSend.gain.value = 0.3;
    ampEnv.connect(fxSend);
    fxSend.connect(chorus);
    fxSend.connect(delay);
    fxSend.connect(reverb);
    
    chorus.connect(compressor);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(compressor);
    reverb.connect(compressor);
    
    compressor.connect(stereoWidth);
    stereoWidth.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Start oscillators
    osc1.start();
    osc2.start();
    subOsc.start();
    noise.start();
    lfo.start();
    
    // Meter
    const meter = audioContext.createGain();
    masterGain.connect(meter);
    meter.connect(audioContext.destination);
    
    // Meter analysis
    const meterAnalyser = audioContext.createAnalyser();
    meterAnalyser.fftSize = 32;
    meter.connect(meterAnalyser);
    
    const meterData = new Float32Array(1);
    function updateMeter() {
        meterAnalyser.getFloatTimeDomainData(meterData);
        const abs = Math.abs(meterData[0]);
        meterValue = Math.max(meterValue * 0.95, abs);
        document.getElementById('meterBar').style.width = `${Math.min(100, meterValue * 100)}%`;
        requestAnimationFrame(updateMeter);
    }
    updateMeter();
}

// Pattern engine
function triggerStep(stepIndex) {
    const currentPattern = patterns[getCurrentPatternId()].data;
    const gate = currentPattern.gates[stepIndex % currentPattern.gates.length];
    const modValue = currentPattern.mods[stepIndex % currentPattern.mods.length] * patternIntensity;
    
    if (gate) {
        // Trigger amp envelope
        const now = audioContext.currentTime;
        ampEnv.gain.cancelScheduledValues(now);
        ampEnv.gain.setValueAtTime(0, now);
        ampEnv.gain.linearRampToValueAtTime(1, now + 0.001);
        ampEnv.gain.exponentialRampToValueAtTime(0.7, now + 0.1);
        ampEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // Trigger mod envelope
        modEnv.gain.cancelScheduledValues(now);
        modEnv.gain.setValueAtTime(0, now);
        modEnv.gain.linearRampToValueAtTime(1, now + 0.01);
        modEnv.gain.exponentialRampToValueAtTime(0.3, now + 0.2);
        modEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    }
    
    // Apply mod to LFO depth and cutoff
    const lfoDepth = getKnobValue('lfoDepthKnob') + modValue * 0.5;
    lfoGain.gain.value = lfoDepth * 2000; // Scale to frequency modulation
    
    const cutoff = getKnobValue('cutoffKnob') + modValue * 0.3;
    filter.frequency.value = 20 + cutoff * 10000;
}

// Scheduler
function scheduler() {
    if (!isPlaying) return;
    
    const currentTime = audioContext.currentTime;
    while (nextStepTime < currentTime + scheduleAheadTime) {
        const stepsPerBar = 16;
        const stepDuration = (60 / bpm) / 4; // 16th note duration
        
        // Apply swing
        let actualStepTime = nextStepTime;
        if (swing > 0 && currentStep % 2 === 1) {
            actualStepTime += (swing / 100) * stepDuration * 0.5;
        }
        
        if (actualStepTime > currentTime) {
            setTimeout(() => {
                if (isPlaying) triggerStep(currentStep);
            }, (actualStepTime - currentTime) * 1000);
        }
        
        nextStepTime += stepDuration;
        currentStep++;
    }
    
    setTimeout(scheduler, lookahead);
}

// UI Helpers
function getKnobValue(id) {
    return parseFloat(document.getElementById(id).value);
}

function setKnobValue(id, value) {
    document.getElementById(id).value = value;
}

function updateBPM(value) {
    bpm = value;
    document.getElementById('bpmValue').textContent = Math.round(bpm);
}

function updateSwing(value) {
    swing = value;
    document.getElementById('swingValue').textContent = `${Math.round(swing)}%`;
}

function getCurrentPatternId() {
    const select = document.getElementById('patternSelect');
    return select.selectedIndex;
}

// Preset management
function loadPreset(index) {
    currentPresetIndex = index;
    const preset = presets[index];
    
    // Update UI
    document.getElementById('presetSelect').selectedIndex = index;
    
    // Apply preset
    setKnobValue('cutoffKnob', preset.filter.cutoff);
    setKnobValue('resonanceKnob', preset.filter.resonance);
    setKnobValue('lfoRateKnob', preset.lfo.rate);
    setKnobValue('lfoDepthKnob', preset.lfo.depth);
    setKnobValue('driveKnob', preset.drive.amount);
    setKnobValue('patternIntensityKnob', 0.5);
    
    // Update pattern select
    const patternSelect = document.getElementById('patternSelect');
    patternSelect.innerHTML = '';
    patterns.forEach((pattern, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = pattern.name;
        patternSelect.appendChild(option);
    });
    patternSelect.selectedIndex = 0;
    
    // Apply oscillator settings
    osc1.type = preset.osc1.wave;
    osc2.type = preset.osc2.wave;
    osc1.detune.value = preset.osc1.detune;
    osc2.detune.value = preset.osc2.detune;
    subGain.gain.value = preset.sub.level;
    noiseGain.gain.value = preset.noise.amount;
    
    // Apply filter
    filter.type = preset.filter.type;
    filter.frequency.value = 20 + preset.filter.cutoff * 10000;
    filter.Q.value = preset.filter.resonance * 20;
    
    // Apply envelopes
    // (envelopes are triggered per note, so we just store parameters)
    
    // Apply LFO
    lfo.type = preset.lfo.shape;
    lfo.frequency.value = preset.lfo.rate * 10;
    lfoGain.gain.value = preset.lfo.depth * 2000;
    document.getElementById('lfoSyncToggle').textContent = preset.lfo.sync ? 'Sync' : 'Free';
    lfoSync = preset.lfo.sync;
    
    // Apply drive
    const driveAmount = preset.drive.amount;
    const driveCurve = new Float32Array(256);
    const deg = Math.PI / 180;
    for (let i = 0; i < 256; i++) {
        const x = i * 2 / 255 - 1;
        driveCurve[i] = ((3 + driveAmount * 10) * x * 20 * deg) / (Math.PI + driveAmount * 10 * Math.abs(x));
    }
    drive.curve = driveCurve;
    
    // Apply FX
    chorus.gain.value = preset.fx.chorus;
    delayGain.gain.value = preset.fx.delay;
    // Reverb is fixed
    
    // Apply macro scene for current pad
    applyMacroScene(preset.macroScenes[currentPad - 1]);
}

function applyMacroScene(scene) {
    // Update pattern
    document.getElementById('patternSelect').selectedIndex = scene.patternId;
    
    // Update intensity
    setKnobValue('patternIntensityKnob', scene.intensity);
    patternIntensity = scene.intensity;
    
    // Apply modulations
    const cutoff = Math.min(1, Math.max(0, getKnobValue('cutoffKnob') + scene.cutoffBias));
    setKnobValue('cutoffKnob', cutoff);
    filter.frequency.value = 20 + cutoff * 10000;
    
    const drive = Math.min(1, Math.max(0, getKnobValue('driveKnob') + scene.driveBump));
    setKnobValue('driveKnob', drive);
    const driveCurve = new Float32Array(256);
    const deg = Math.PI / 180;
    for (let i = 0; i < 256; i++) {
        const x = i * 2 / 255 - 1;
        driveCurve[i] = ((3 + drive * 10) * x * 20 * deg) / (Math.PI + drive * 10 * Math.abs(x));
    }
    driveNode.curve = driveCurve;
    
    const lfoRate = Math.min(1, Math.max(0, getKnobValue('lfoRateKnob') + scene.lfoRateMod));
    setKnobValue('lfoRateKnob', lfoRate);
    lfo.frequency.value = lfoRate * 10;
    
    const lfoDepth = Math.min(1, Math.max(0, getKnobValue('lfoDepthKnob') + scene.lfoDepthMod));
    setKnobValue('lfoDepthKnob', lfoDepth);
    lfoGain.gain.value = lfoDepth * 2000;
    
    // FX mix mod
    chorus.gain.value = Math.min(1, Math.max(0, chorus.gain.value + scene.fxMixMod));
    delayGain.gain.value = Math.min(1, Math.max(0, delayGain.gain.value + scene.fxMixMod));
}

// Randomize (gentle)
function randomize() {
    const preset = presets[currentPresetIndex];
    const variations = {
        cutoff: 0.2,
        resonance: 0.2,
        lfoRate: 0.3,
        lfoDepth: 0.3,
        drive: 0.2,
        patternIntensity: 0.3
    };
    
    Object.keys(variations).forEach(knob => {
        const current = getKnobValue(`${knob}Knob`);
        const delta = (Math.random() * 2 - 1) * variations[knob];
        const newValue = Math.min(1, Math.max(0, current + delta));
        setKnobValue(`${knob}Knob`, newValue);
    });
    
    // Apply changes
    filter.frequency.value = 20 + getKnobValue('cutoffKnob') * 10000;
    filter.Q.value = getKnobValue('resonanceKnob') * 20;
    lfo.frequency.value = getKnobValue('lfoRateKnob') * 10;
    lfoGain.gain.value = getKnobValue('lfoDepthKnob') * 2000;
    patternIntensity = getKnobValue('patternIntensityKnob');
    
    // Update drive curve
    const drive = getKnobValue('driveKnob');
    const driveCurve = new Float32Array(256);
    const deg = Math.PI / 180;
    for (let i = 0; i < 256; i++) {
        const x = i * 2 / 255 - 1;
        driveCurve[i] = ((3 + drive * 10) * x * 20 * deg) / (Math.PI + drive * 10 * Math.abs(x));
    }
    drive.curve = driveCurve;
}

// Reset to preset defaults
function reset() {
    loadPreset(currentPresetIndex);
}

// State management
function exportState() {
    const state = {
        presetIndex: currentPresetIndex,
        pad: currentPad,
        bpm,
        swing,
        cutoff: getKnobValue('cutoffKnob'),
        resonance: getKnobValue('resonanceKnob'),
        lfoRate: getKnobValue('lfoRateKnob'),
        lfoDepth: getKnobValue('lfoDepthKnob'),
        drive: getKnobValue('driveKnob'),
        patternId: getCurrentPatternId(),
        patternIntensity: getKnobValue('patternIntensityKnob'),
        limiter: limiterEnabled
    };
    const json = JSON.stringify(state);
    navigator.clipboard.writeText(json).then(() => {
        alert('State copied to clipboard!');
    });
}

function importState() {
    const json = prompt('Paste state JSON:');
    if (!json) return;
    try {
        const state = JSON.parse(json);
        currentPresetIndex = state.presetIndex || 0;
        currentPad = state.pad || 1;
        bpm = state.bpm || 174;
        swing = state.swing || 0;
        limiterEnabled = state.limiter !== false;
        
        updateBPM(bpm);
        updateSwing(swing);
        document.getElementById('limiterToggle').checked = limiterEnabled;
        limiter.threshold.value = limiterEnabled ? -1 : -100;
        
        loadPreset(currentPresetIndex);
        
        setKnobValue('cutoffKnob', state.cutoff || 0.5);
        setKnobValue('resonanceKnob', state.resonance || 0.5);
        setKnobValue('lfoRateKnob', state.lfoRate || 0.5);
        setKnobValue('lfoDepthKnob', state.lfoDepth || 0.5);
        setKnobValue('driveKnob', state.drive || 0.5);
        setKnobValue('patternIntensityKnob', state.patternIntensity || 0.5);
        document.getElementById('patternSelect').selectedIndex = state.patternId || 0;
        patternIntensity = state.patternIntensity || 0.5;
        
        // Apply changes
        filter.frequency.value = 20 + getKnobValue('cutoffKnob') * 10000;
        filter.Q.value = getKnobValue('resonanceKnob') * 20;
        lfo.frequency.value = getKnobValue('lfoRateKnob') * 10;
        lfoGain.gain.value = getKnobValue('lfoDepthKnob') * 2000;
        
        // Update drive curve
        const drive = getKnobValue('driveKnob');
        const driveCurve = new Float32Array(256);
        const deg = Math.PI / 180;
        for (let i = 0; i < 256; i++) {
            const x = i * 2 / 255 - 1;
            driveCurve[i] = ((3 + drive * 10) * x * 20 * deg) / (Math.PI + drive * 10 * Math.abs(x));
        }
        drive.curve = driveCurve;
        
        // Trigger pad change
        document.querySelector(`.pad[data-pad="${currentPad}"]`).classList.add('active');
    } catch (e) {
        alert('Invalid state JSON');
    }
}

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize audio
    initAudio();
    
    // Populate preset select
    const presetSelect = document.getElementById('presetSelect');
    presets.forEach((preset, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${preset.name} (${preset.category})`;
        presetSelect.appendChild(option);
    });
    
    // Populate pattern select
    const patternSelect = document.getElementById('patternSelect');
    patterns.forEach((pattern, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = pattern.name;
        patternSelect.appendChild(option);
    });
    
    // Load first preset
    loadPreset(0);
    
    // Transport
    document.getElementById('playBtn').addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false;
            document.getElementById('playBtn').textContent = '▶';
        } else {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            isPlaying = true;
            nextStepTime = audioContext.currentTime;
            currentStep = 0;
            document.getElementById('playBtn').textContent = '■';
            scheduler();
        }
    });
    
    document.getElementById('bpmSlider').addEventListener('input', (e) => {
        updateBPM(parseFloat(e.target.value));
    });
    
    document.getElementById('swingSlider').addEventListener('input', (e) => {
        updateSwing(parseFloat(e.target.value));
    });
    
    let tapStart = 0;
    document.getElementById('tapBtn').addEventListener('click', () => {
        const now = Date.now();
        if (tapStart && now - tapStart < 2000) {
            const newBpm = 60000 / (now - tapStart);
            if (newBpm >= 20 && newBpm <= 220) {
                updateBPM(newBpm);
                document.getElementById('bpmSlider').value = newBpm;
            }
        }
        tapStart = now;
    });
    
    // Preset navigation
    document.getElementById('prevPreset').addEventListener('click', () => {
        currentPresetIndex = (currentPresetIndex - 1 + presets.length) % presets.length;
        loadPreset(currentPresetIndex);
    });
    
    document.getElementById('nextPreset').addEventListener('click', () => {
        currentPresetIndex = (currentPresetIndex + 1) % presets.length;
        loadPreset(currentPresetIndex);
    });
    
    presetSelect.addEventListener('change', (e) => {
        loadPreset(parseInt(e.target.value));
    });
    
    // Pads
    document.querySelectorAll('.pad').forEach(pad => {
        pad.addEventListener('click', () => {
            const padNum = parseInt(pad.dataset.pad);
            currentPad = padNum;
            document.querySelectorAll('.pad').forEach(p => p.classList.remove('active'));
            pad.classList.add('active');
            applyMacroScene(presets[currentPresetIndex].macroScenes[padNum - 1]);
        });
    });
    
    // Knobs
    document.getElementById('cutoffKnob').addEventListener('input', (e) => {
        filter.frequency.value = 20 + parseFloat(e.target.value) * 10000;
    });
    
    document.getElementById('resonanceKnob').addEventListener('input', (e) => {
        filter.Q.value = parseFloat(e.target.value) * 20;
    });
    
    document.getElementById('lfoRateKnob').addEventListener('input', (e) => {
        lfo.frequency.value = parseFloat(e.target.value) * 10;
    });
    
    document.getElementById('lfoDepthKnob').addEventListener('input', (e) => {
        lfoGain.gain.value = parseFloat(e.target.value) * 2000;
    });
    
    document.getElementById('driveKnob').addEventListener('input', (e) => {
        const drive = parseFloat(e.target.value);
        const driveCurve = new Float32Array(256);
        const deg = Math.PI / 180;
        for (let i = 0; i < 256; i++) {
            const x = i * 2 / 255 - 1;
            driveCurve[i] = ((3 + drive * 10) * x * 20 * deg) / (Math.PI + drive * 10 * Math.abs(x));
        }
        drive.curve = driveCurve;
    });
    
    document.getElementById('patternIntensityKnob').addEventListener('input', (e) => {
        patternIntensity = parseFloat(e.target.value);
    });
    
    document.getElementById('patternSelect').addEventListener('change', () => {
        // Pattern change handled by scheduler
    });
    
    document.getElementById('lfoSyncToggle').addEventListener('click', () => {
        lfoSync = !lfoSync;
        document.getElementById('lfoSyncToggle').textContent = lfoSync ? 'Sync' : 'Free';
    });
    
    // Controls
    document.getElementById('randomizeBtn').addEventListener('click', randomize);
    document.getElementById('resetBtn').addEventListener('click', reset);
    
    document.getElementById('limiterToggle').addEventListener('change', (e) => {
        limiterEnabled = e.target.checked;
        limiter.threshold.value = limiterEnabled ? -1 : -100;
    });
    
    // State
    document.getElementById('exportBtn').addEventListener('click', exportState);
    document.getElementById('importBtn').addEventListener('click', importState);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            document.getElementById('playBtn').click();
        } else if (e.code >= 'Digit1' && e.code <= 'Digit8') {
            const padNum = parseInt(e.code.replace('Digit', ''));
            document.querySelector(`.pad[data-pad="${padNum}"]`).click();
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            updateBPM(Math.min(220, bpm + 1));
            document.getElementById('bpmSlider').value = bpm;
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            updateBPM(Math.max(20, bpm - 1));
            document.getElementById('bpmSlider').value = bpm;
        } else if (e.code === 'KeyR') {
            randomize();
        } else if (e.code === 'Digit0') {
            reset();
        }
    });
    
    // Initial active pad
    document.querySelector('.pad[data-pad="1"]').classList.add('active');
});