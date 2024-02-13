// playback.js

import { pianoFrequencies } from './frequencyTable.js';
import { playMS10TriangleBass } from './synth.js';

function updateVolume() {
    let volume = getVolume();
    context.masterGainNode.gain.value = volume;
}

function getVolume() {
    let volumeControl = document.getElementById("volume");
    return volumeControl ? volumeControl.value / 100 : 1; // Assumes volume control is a slider from 0 to 100
}

function play() {
    let noteIndex = document.getElementById("noteSlider").value;
    let frequency = pianoFrequencies[noteIndex];
    playMS10TriangleBass( frequency);
}

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById("playButton");
    if (playButton) {
        playButton.addEventListener("click", () => play());
    } else {
        console.error("Play button not found");
    }

    const volumeControl = document.getElementById("volume");
    if (volumeControl) {
        volumeControl.addEventListener("input", () => updateVolume());
    } else {
        console.error("Volume control not found");
    }
});

export { updateVolume, play };
