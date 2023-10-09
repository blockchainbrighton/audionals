// synth.js

let context = new (window.AudioContext || window.webkitAudioContext)();

let currentOscillator = null;  // Reference to the currently playing oscillator

function playMS10TriangleBass(frequency = null) {
    // If there's a currently playing note, stop it
    if (currentOscillator) {
        currentOscillator.stop();
        currentOscillator = null;
    }

    let oscillator = context.createOscillator();
    let gainNode = context.createGain();
    let filter = context.createBiquadFilter();

    let waveformType = document.getElementById('waveform').value;
    oscillator.type = waveformType;

    console.log("[synth.js] [playMS10TriangleBass] Waveform Type:", waveformType);


    if (frequency === null) {
        frequency = parseFloat(document.getElementById('note').value);
        if (!isFinite(frequency)) {
            console.error("Invalid frequency value:", frequency);
            return;  // Exit the function to prevent further errors
        }
    }

    console.log("[synth.js] [playMS10TriangleBass] Frequency:", frequency);

    oscillator.frequency.setValueAtTime(frequency, context.currentTime);

    let attack = document.getElementById('attack').value / 1000;
    let release = document.getElementById('release').value / 1000;
    let cutoff = document.getElementById('cutoff').value;
    let resonance = document.getElementById('resonance').value;

    console.log("[synth.js] [playMS10TriangleBass] Attack:", attack);
    console.log("[synth.js] [playMS10TriangleBass] Release:", release);
    console.log("[synth.js] [playMS10TriangleBass] Cutoff:", cutoff);
    console.log("[synth.js] [playMS10TriangleBass] Resonance:", resonance);
   

    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = resonance;

    gainNode.gain.setValueAtTime(0, context.currentTime);
    const currentVolume = getVolume();
    gainNode.gain.linearRampToValueAtTime(currentVolume * 2, context.currentTime + attack); 
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + attack + release);

    console.log("[synth.js] [playMS10TriangleBass] Volume:", currentVolume);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + attack + release);

    currentOscillator = oscillator;  // Set the current oscillator

    console.log("[synth.js] [playMS10TriangleBass] All settings:", {
        waveformType: waveformType,
        frequency: frequency,
        attack: attack,
        release: release,
        cutoff: cutoff,
        resonance: resonance,
        volume: currentVolume
    });
    
}