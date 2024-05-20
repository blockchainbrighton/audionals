// midiController.js

import { isArpeggiatorOn, adjustArpeggiatorTiming, addNoteToArpeggiator } from './arpeggiator.js';
import { startMidiRecording, stopMidiRecording, playMidiRecording, stopMidiPlayback, handleNoteEvent, onMIDISuccess, onMIDIFailure } from './midiUtils.js';
import { getIsRecording, midiRecording, getRecordingStartTime } from './midiRecording.js';

document.addEventListener('DOMContentLoaded', () => {
    const recordMidiButton = document.getElementById('RecordMidi');
    const playMidiButton = document.getElementById('PlayMidi');
    const timingAdjustSlider = document.getElementById('timingAdjust');

    recordMidiButton.addEventListener('click', () => {
        if (getIsRecording()) {
            stopMidiRecording();
            recordMidiButton.textContent = 'Record Midi';
        } else {
            startMidiRecording();
            recordMidiButton.textContent = 'Stop Recording';
        }
    });

    playMidiButton.addEventListener('click', () => {
        playMidiRecording(); // Call without parameters
    });

    timingAdjustSlider.addEventListener('change', () => {
        const nudgeValue = parseFloat(timingAdjustSlider.value);
        if (isArpeggiatorOn) {
            adjustArpeggiatorTiming(nudgeValue);
        }
        if (midiRecording.length > 0) {
            const recordingStartTime = getRecordingStartTime();
            const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - recordingStartTime);
            midiRecording.forEach((event, index) => {
                let adjustedTimestamp = event.timestamp + nudgeOffset;
                if (adjustedTimestamp < performance.now()) {
                    adjustedTimestamp = performance.now();
                }
                const delay = adjustedTimestamp - performance.now();
                console.log(`Rescheduling event ${index + 1}/${midiRecording.length}: Note On - ${event.note} in ${delay.toFixed(2)}ms`);
                setTimeout(() => {
                    handleNoteEvent(event.note, event.velocity, event.isNoteOn);
                }, delay);
            });
        }
        timingAdjustSlider.value = 0;
    });
});

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
} else {
    console.warn('WebMIDI is not supported in this browser.');
}
