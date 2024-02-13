// playback.js

import { pianoFrequencies } from './frequencyTable.js';
import { playMS10TriangleBass } from './synth.js';
import { GainManager } from './gainManagement.js';

// At the top of playback.js, ensure audioContext is defined globally
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function updateVolume(context) {
    let volume = getVolume();
    context.masterGainNode.gain.value = volume;
}

function play(context) {
    let noteIndex = document.getElementById("noteSlider").value;
    let frequency = pianoFrequencies[noteIndex];
    const gainManager = new GainManager(context);
    playMS10TriangleBass(context, frequency, gainManager);
}

// Adjust the DOMContentLoaded listener as needed


function getVolume() {
    let volumeControl = document.getElementById("volume");
    return volumeControl ? volumeControl.value / 100 : 1; // Assumes volume control is a slider from 0 to 100
}


document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById("playButton");
    if (playButton) {
        playButton.addEventListener("click", () => play(audioContext)); // Pass audioContext as a parameter
    }

    const volumeControl = document.getElementById("volume");
    if (volumeControl) {
        volumeControl.addEventListener("input", () => updateVolume(audioContext)); // Pass audioContext as a parameter
    }
});

export { updateVolume, play };
