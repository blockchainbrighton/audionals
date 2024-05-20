import { loadSettingsFromObject } from './saveLoadHandler.js';
import { midiRecording, setMidiRecording } from './midiRecording.js';

const sequencerChannel = new BroadcastChannel('sequencerChannel');
let currentChannelIndex;

sequencerChannel.addEventListener("message", (event) => {
    console.log(`[ms10 messageEventListener] Received message: ${JSON.stringify(event.data)}`);

    if (event.data.type === 'step') {
        console.log(`[ms10 messageEventListener] Received step: ${event.data.data.step}`);
        onSequencerStep(event.data.data.step);

        if (externalStepTimeout) {
            clearTimeout(externalStepTimeout);
        }

        externalStepTimeout = setTimeout(() => {
            console.log(`[ms10] No external steps received for an extended period. Stopping arpeggiator.`);
            stopArpeggiator();
        }, 250);  
    } else if (event.data.type === 'setArpNotes') {
        const receivedArpNotes = event.data.arpNotes;
        console.log(`[ms10 messageEventListener] Received Arpeggiator notes: ${JSON.stringify(receivedArpNotes)}`);
        if (Array.isArray(receivedArpNotes)) {
            arpNotes = receivedArpNotes;
            updateArpNotesDisplay();
            console.log(`[ms10 messageEventListener] Arpeggiator notes updated: ${JSON.stringify(arpNotes)}`);
        } else {
            console.error(`[ms10 messageEventListener] Invalid Arpeggiator notes format: ${typeof receivedArpNotes}`);
        }
    } else if (event.data.type === 'setMidiRecording') {
        const receivedMidiRecording = event.data.midiRecording;
        console.log(`[ms10 messageEventListener] Received MIDI recording: ${JSON.stringify(receivedMidiRecording)}`);
        setMidiRecording(receivedMidiRecording); // Use the new function
        console.log(`[ms10 messageEventListener] MIDI recording updated: ${midiRecording.length} events`);
        console.log(`[ms10 messageEventListener] Current MIDI recording array: ${JSON.stringify(midiRecording)}`);
    } else if (event.data.type === 'setSynthSettings') {
        const receivedSettings = event.data.settings;
        console.log(`[ms10 messageEventListener] Received Synth settings: ${JSON.stringify(receivedSettings)}`);
        loadSettingsFromObject(receivedSettings);
    }
});

window.addEventListener('message', function(event) {
    if (event.data) {
        console.log(`[child] Received message: ${JSON.stringify(event.data)}`);

        if (event.data.type === 'setChannelIndex') {
            const channelIndex = event.data.channelIndex;
            currentChannelIndex = channelIndex;
            console.log(`[child] Channel index set to ${currentChannelIndex}`);

            const channelDisplay = document.getElementById('sequencerChannelDisplay');
            if (channelDisplay) {
                channelDisplay.textContent = `Channel ${channelIndex}`;
            } else {
                console.error("Channel display element not found!");
            }
        } else if (event.data.type === 'setBPM') {
            const bpm = event.data.bpm;
            console.log(`[child] BPM set to ${bpm}`);

            const bpmDisplay = document.getElementById('bpmDisplay');
            if (bpmDisplay) {
                bpmDisplay.textContent = `${bpm} BPM`;
            } else {
                console.error("BPM display element not found!");
            }
        }
    }
}, false);
