// iframeMessageHandling.js is a script that listens for messages from the parent window and responds to them by updating the synthesizer state. 
// It also listens for messages from the synthesizer iframe and responds to them by updating the parent window. The script uses a BroadcastChannel to communicate between the parent window and the synthesizer iframe. 
// The script also handles setting the active channel index for the synthesizer.

export const SYNTH_CHANNEL = new URLSearchParams(window.location.search).get('channelIndex');

import { loadSettingsFromObject } from './saveLoadHandler.js';
import { getMidiRecording, setMidiRecording } from './midiRecording.js';
import { initializeChannelIndex } from './activeSynthChannelIndex.js';

const sequencerChannel = new BroadcastChannel(`synth_channel_${SYNTH_CHANNEL}`);

// Initialize the channel index only once
initializeChannelIndex(SYNTH_CHANNEL);

sequencerChannel.addEventListener("message", (event) => {
    if (event.data.channelIndex && event.data.channelIndex !== SYNTH_CHANNEL) {
        console.log(`Ignoring message for different channel index: ${event.data.channelIndex}`);
        return; // Ignore messages that are not for this channel index
    }

    console.log(`[PARENT MESSAGE] ms10 messageEventListener] Received message: ${JSON.stringify(event.data)}`);

    switch (event.data.type) {
        case 'step':
            console.log(`[ms10 messageEventListener] Received step: ${event.data.data.step}`);
            onSequencerStep(event.data.data.step);
            clearTimeout(externalStepTimeout);
            externalStepTimeout = setTimeout(() => {
                console.log(`[ms10] No external steps received for an extended period. Stopping arpeggiator.`);
                stopArpeggiator();
            }, 250);
            window.parent.postMessage({ type: 'confirmStep', step: event.data.data.step }, '*');
            break;
        case 'setArpNotes':
            const receivedArpNotes = event.data.arpNotes;
            console.log(`[ms10 messageEventListener] Received Arpeggiator notes: ${JSON.stringify(receivedArpNotes)}`);
            if (Array.isArray(receivedArpNotes)) {
                arpNotes = receivedArpNotes;
                updateArpNotesDisplay();
                console.log(`[ms10 messageEventListener] Arpeggiator notes updated: ${JSON.stringify(arpNotes)}`);
            } else {
                console.error(`[ms10 messageEventListener] Invalid Arpeggiator notes format: ${typeof receivedArpNotes}`);
            }
            window.parent.postMessage({ type: 'confirmArpNotes', arpNotes: event.data.arpNotes }, '*');
            break;
        case 'setMidiRecording':
            if (SYNTH_CHANNEL === null) {
                console.error("[ms10 messageEventListener] Error: Attempting to set MIDI recording without a valid channel index.");
                return;
            }
            const receivedMidiRecording = event.data.midiRecording;
            console.log(`[ms10 messageEventListener] Received MIDI recording for channel ${SYNTH_CHANNEL}: ${JSON.stringify(receivedMidiRecording)}`);
            setMidiRecording(receivedMidiRecording, SYNTH_CHANNEL);
            let currentMidiRecording = getMidiRecording(SYNTH_CHANNEL); // Get the updated recording to log
            console.log(`[ms10 messageEventListener] MIDI recording updated: ${currentMidiRecording.length} events`);
            console.log(`[ms10 messageEventListener] Current MIDI recording array: ${JSON.stringify(currentMidiRecording)}`);
            window.parent.postMessage({ type: 'confirmMidiRecording', midiRecording: event.data.midiRecording }, '*');
            break;
        case 'setSynthSettings':
            const receivedSettings = event.data.settings;
            console.log(`[ms10 messageEventListener] Received Synth settings: ${JSON.stringify(receivedSettings)}`);
            loadSettingsFromObject(receivedSettings);
            window.parent.postMessage({ type: 'confirmSynthSettings', settings: event.data.settings }, '*');
            break;
        case 'setChannelIndex':
            initializeChannelIndex(event.data.channelIndex);
            updateUIWithChannelIndex(event.data.channelIndex);
            break;
    }
});

window.addEventListener('message', (event) => {
    // Handle setting the channel index
    if (event.data && event.data.type === 'setChannelIndex') {
        initializeChannelIndex(event.data.channelIndex);
        updateUIWithChannelIndex(event.data.channelIndex);
    }

    // Handle setting the BPM
    if (event.data && event.data.type === 'setBPM') {
        updateBPMDisplay(event.data.bpm);
    }
}, false);


function updateUIWithChannelIndex(channelIndex) {
    const channelDisplay = document.getElementById('sequencerChannelDisplay');
    if (channelDisplay) {
        channelDisplay.textContent = `Channel ${channelIndex}`;
    } else {
        console.error("Channel display element not found!");
    }
}

// Function to update the BPM display in the UI
function updateBPMDisplay(bpm) {
    const bpmDisplay = document.getElementById('bpmDisplay');
    if (bpmDisplay) {
        bpmDisplay.textContent = `BPM: ${bpm}`;
    } else {
        console.error("BPM display element not found!");
    }
}
