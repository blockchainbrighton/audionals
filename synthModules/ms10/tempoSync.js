// tempoSync.js

console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] tempoSync.js script loaded and running!`);

let syncBeat = 1; // Initialize syncBeat to 1
let syncBar = 1; // Initialize syncBar to 1
let currentBPM = 105; // Initialize with a default value or fetch from a source if available

// Global state variable to track if the sequencer is playing
let isSequencerPlaying = false;

const sequencerChannel = new BroadcastChannel('sequencerChannel');

sequencerChannel.onmessage = function(event) {
    const type = event.data.type;
    const data = event.data.data;

    console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Message received on sequencerChannel: ${type}`);

    if (type === 'beat') {
        console.log(`[tempoSync] [${new Date().toISOString()}] syncBeat ${syncBeat} - syncBar ${syncBar}`);

        syncBeat++; // Increment the syncBeat

        if (syncBeat > 4) {
            syncBeat = 1; // Reset the syncBeat
            syncBar++; // Increment the syncBar
        }
    } else if (type === 'BPMUpdate') {
        currentBPM = data;  // Update the current BPM with the new value

        const arpTempoSlider = document.getElementById('arpTempo');
        arpTempoSlider.value = currentBPM;

        console.log(`[tempoSync] [${new Date().toISOString()}] Updated BPM: ${currentBPM}`);
    
    } else if (type === 'pause' || type === 'stop') {
        isSequencerPlaying = false;  // Set the global state to false
        
        if (isArpeggiatorOn) {
            console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Stopping arpeggiator due to ${type} message`);
            stopArpeggiator();
        }
        console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Resetting syncBeat and syncBar due to ${type} message`);
        syncBeat = 1; // Reset syncBeat
        syncBar = 1; // Reset syncBar
    } else if (type === 'play' || type === 'resume') {
        isSequencerPlaying = true;  // Set the global state to true
        
        console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Playing arpeggiator due to ${type} message`);
        playArpeggiator();
    }

    console.log(`[tempoSync] [${new Date().toISOString()}] syncBeat ${syncBeat} - syncBar ${syncBar}`);
};
