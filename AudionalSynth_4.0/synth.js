// synth_2.js


function createOscillator(context, frequency, type, detune = 0) {
    let oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.detune.setValueAtTime(detune, context.currentTime);
    return oscillator;
}

function createFilter(context) {
    let filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = document.getElementById("cutoff").value;
    filter.Q.value = document.getElementById("resonance").value;
    return filter;
}

function configureEnvelope(context, gainNode) {
    let attackTime = document.getElementById("attack").value / 1000;
    let releaseTime = document.getElementById("release").value / 1000;
    let sustainLevel = 0.5; // Adjust as needed
    let currentTime = context.currentTime;

    // Smoothly ramp up
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, currentTime + attackTime);

    // Maintain sustain
    gainNode.gain.setValueAtTime(sustainLevel, currentTime + attackTime);
    
    // Smoothly ramp down
    gainNode.gain.linearRampToValueAtTime(0, currentTime + attackTime + releaseTime);
}

function playMS10TriangleBass(context, frequency) {
    if (context.currentOscillator) {
        context.currentOscillator.forEach(osc => osc.stop(context.currentTime));
    }
    context.currentOscillator = [];

    let primaryOscillator = createOscillator(context, frequency, document.getElementById("waveform").value);
    let subOscillator = createOscillator(context, frequency / 2, 'sine');
    let detuneOscillator = createOscillator(context, frequency, document.getElementById("waveform").value, 10);

    let gainNode = context.createGain();
    let filter = createFilter(context);
    let panner = new StereoPannerNode(context, {pan: 0}); // Implement stereo spread control if needed

    configureEnvelope(context, gainNode);

    [primaryOscillator, subOscillator, detuneOscillator].forEach(osc => {
        osc.connect(filter);
        context.currentOscillator.push(osc); // Store oscillators to manage later
    });

    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(context.masterGainNode);

    context.currentOscillator.forEach(osc => osc.start());
}

export { playMS10TriangleBass, createOscillator, createFilter, configureEnvelope };
