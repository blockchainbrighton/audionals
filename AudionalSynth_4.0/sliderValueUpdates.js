// sliderValueUpdates.js
import { pianoFrequencies } from './frequencyTable.js';


function noteIndexToName(index) {
    const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const octave = Math.floor(index / 12);
    const note = notes[index % 12];
    const frequency = pianoFrequencies[index]; // Get frequency from pianoFrequencies array
    return {
        note: note + octave,
        frequency: frequency
    };
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.control-group input[type="range"]').forEach((slider) => {
        const displaySpanId = slider.id + "Display";
        const displaySpan = document.getElementById(displaySpanId);

        if (displaySpan) {
            displaySpan.textContent = formatSliderDisplay(slider.id, slider.value);
            
            slider.addEventListener('input', () => {
                displaySpan.textContent = formatSliderDisplay(slider.id, slider.value);
            });
        }
    });
});


function formatSliderDisplay(sliderId, value) {
    if (sliderId === "volume") {
        return value + "%"; // Volume in percentage
    } else if (sliderId === "noteSlider") {
        // Convert slider value to note name
        const noteInfo = noteIndexToName(value);
        return noteInfo.note; // Display the note name
    } else if (sliderId === "cutoff") {
        return value + "Hz"; // Frequency in Hertz
    } else {
        return value + "ms"; // Time-based controls in milliseconds
    }
}


