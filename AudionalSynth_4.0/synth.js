// synth.js

import { pianoFrequencies } from './frequencyTable.js';


let context = new (window.AudioContext || window.webkitAudioContext)();
let currentOscillator = null;

// Function to update the master gain node's volume
let masterGainNode = context.createGain(); // Global gain node for controlling volume
masterGainNode.connect(context.destination);

function updateVolume() {
    let volume = getVolume();
    masterGainNode.gain.value = volume;
}

function getVolume() {
    let volumeControl = document.getElementById("volume");
    return volumeControl ? volumeControl.value / 100 : 1; // Assumes volume control is a slider from 0 to 100
}


// Call this function when the volume slider value changes
document.getElementById("volume").addEventListener("input", updateVolume);


function play() {
    let noteIndex = document.getElementById("noteSlider").value;
    let frequency = pianoFrequencies[noteIndex];
    if (currentOscillator) {
        currentOscillator.forEach(osc => osc.stop(context.currentTime));
        currentOscillator = []; // Clear the array after stopping oscillators
    }
    playMS10TriangleBass(frequency);
}

// Ensure this is called not just on button click but also potentially on slider change if you want immediate feedback
document.getElementById("noteSlider").addEventListener("input", play);

function playMS10TriangleBass(frequency) {
    if (currentOscillator) {
        currentOscillator.forEach(osc => osc.stop(context.currentTime));
    }
    currentOscillator = [];

    let primaryOscillator = createOscillator(frequency, document.getElementById("waveform").value);
    let subOscillator = createOscillator(frequency / 2, 'sine');
    let detuneOscillator = createOscillator(frequency, document.getElementById("waveform").value, 10);

    let gainNode = context.createGain();
    let filter = createFilter();
    let panner = new StereoPannerNode(context, {pan: 0}); // Implement stereo spread control if needed

    configureEnvelope(gainNode);

    [primaryOscillator, subOscillator, detuneOscillator].forEach(osc => {
        osc.connect(filter);
        currentOscillator.push(osc); // Store oscillators to manage later
    });
    // LFO Setup
    let lfoSwitch = document.getElementById('lfoSwitch').checked;
    let lfoRate = parseFloat(document.getElementById('lfoRate').value);
    
    if (lfoSwitch) {
        let lfo = context.createOscillator();
        let lfoGain = context.createGain();
        
        // Configure LFO rate and gain
        lfo.frequency.setValueAtTime(lfoRate, context.currentTime); // LFO frequency determines the "wobble" speed
        lfoGain.gain.setValueAtTime(frequency / 30, context.currentTime); // Adjust depth of the wobble effect
        
        // Connect LFO
        lfo.connect(lfoGain);
        lfoGain.connect(primaryOscillator.frequency); // Apply to primary oscillator frequency
        lfoGain.connect(subOscillator.frequency); // Optionally, apply to sub oscillator
        lfoGain.connect(detuneOscillator.frequency); // Optionally, apply to detuned oscillator
        
        lfo.start();
    }

    filter.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(context.destination);

    currentOscillator.forEach(osc => osc.start());
}

function createOscillator(frequency, type, detune = 0) {
    let oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.detune.setValueAtTime(detune, context.currentTime);
    return oscillator;
}

function createFilter() {
    let filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = document.getElementById("cutoff").value;
    filter.Q.value = document.getElementById("resonance").value;
    return filter;
}

function configureEnvelope(gainNode) {
    let attackTime = document.getElementById("attack").value / 1000;
    let releaseTime = document.getElementById("release").value / 1000;
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(getVolume(), context.currentTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + attackTime + releaseTime);
}

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById("playButton");
    if (playButton) {
        playButton.addEventListener("click", play);
    } else {
        console.error("Play button not found");
    }
});

export { playMS10TriangleBass };
