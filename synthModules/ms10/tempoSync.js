// tempoSync.js

console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] tempoSync.js script loaded and running!`);

let syncBeat = 1; // Initialize syncBeat to 1
let syncBar = 1; // Initialize syncBar to 1

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
        const updatedBPM = data;

        const arpTempoSlider = document.getElementById('arpTempo');
        arpTempoSlider.value = updatedBPM;

        console.log(`[tempoSync] [${new Date().toISOString()}] Updated BPM: ${updatedBPM}`);
   } else if (type === 'pause') {
        if (isArpeggiatorOn) {
            console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Stopping arpeggiator due to pause message`);
            stopArpeggiator();
        }
    } else if (type === 'resume') {
        if (!isArpeggiatorOn) {
            console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Starting arpeggiator due to resume message`);
            startArpeggiator();
        }
    } else if (type === 'stop') {
        if (isArpeggiatorOn) {
            console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Stopping arpeggiator due to stop message`);
            stopArpeggiator();
        }
        console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Resetting syncBeat and syncBar due to stop message`);
        syncBeat = 1; // Reset syncBeat
        syncBar = 1; // Reset syncBar
    } else if (type === 'play') {
        console.log(`[tempoSync] [${new Date().toISOString()}] [MS10] Playing arpeggiator due to play message`);
        playArpeggiator();
    }

    console.log(`[tempoSync] [${new Date().toISOString()}] syncBeat ${syncBeat} - syncBar ${syncBar}`);
};
