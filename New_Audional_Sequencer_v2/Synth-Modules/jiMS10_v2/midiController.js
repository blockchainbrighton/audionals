// midiController.js

import { isArpeggiatorOn, adjustArpeggiatorTiming } from './arpeggiator.js';
import { startMidiRecording, stopMidiRecording, playMidiRecording, midiRecording, recordingStartTime } from './midiRecordingAndPlayback.js';

document.addEventListener('DOMContentLoaded', () => {
    const recordMidiButton = document.getElementById('RecordMidi');
    const playMidiButton = document.getElementById('PlayMidi');
    const timingAdjustSlider = document.getElementById('timingAdjust');
    let isRecording = false;

    recordMidiButton.addEventListener('click', () => {
        if (isRecording) {
            stopMidiRecording();
            isRecording = false;
            recordMidiButton.textContent = 'Record Midi';
        } else {
            startMidiRecording();
            isRecording = true;
            recordMidiButton.textContent = 'Stop Recording';
        }
    });

    playMidiButton.addEventListener('click', () => {
        playMidiRecording(true); // Call with true to normalize timestamps
    });

    // Nudge slider event listeners
    timingAdjustSlider.addEventListener('change', () => {
        const nudgeValue = parseFloat(timingAdjustSlider.value);

        if (isArpeggiatorOn) {
            adjustArpeggiatorTiming(nudgeValue);
        }
        if (midiRecording.length > 0) {
            const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - recordingStartTime);

            midiRecording.forEach((event, index) => {
                let adjustedTimestamp = event.timestamp + nudgeOffset;

                if (adjustedTimestamp < performance.now()) {
                    adjustedTimestamp = performance.now();
                }

                const delay = adjustedTimestamp - performance.now();
                console.log(`Rescheduling event ${index + 1}/${midiRecording.length}: ${event.isNoteOn ? 'Note On' : 'Note Off'} - ${event.note} in ${delay.toFixed(2)}ms`);
                setTimeout(() => {
                    handleMidiEvent(event);
                }, delay);
            });
        }

        timingAdjustSlider.value = 0;
    });
});
