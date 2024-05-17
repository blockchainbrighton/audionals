const sequencerChannel = new BroadcastChannel('sequencerChannel');

// Declare the currentChannelIndex variable at the top
let currentChannelIndex;

sequencerChannel.addEventListener("message", (event) => {
    if (event.data.type === 'step') {
        console.log(`[ms10 messageEventListener] Received step: ${event.data.data.step}`);
        onSequencerStep(event.data.data.step);

        // Clear any existing timeout since we've received an external step
        if (externalStepTimeout) {
            clearTimeout(externalStepTimeout);
        }

        // Set a new timeout to check if we receive another step in the next 2 seconds (or any other reasonable duration)
        externalStepTimeout = setTimeout(() => {
            console.log(`[ms10] No external steps received for an extended period. Stopping arpeggiator.`);
            stopArpeggiator();
        }, 250);  // Timeout duration can be adjusted based on your needs
    }
});

// Listen for messages from the parent
window.addEventListener('message', function(event) {
    if (event.data) {
        if (event.data.type === 'setChannelIndex') {
            const channelIndex = event.data.channelIndex;
            currentChannelIndex = channelIndex; // Update the currentChannelIndex variable
            console.log(`[child] Channel index set to ${currentChannelIndex}`);
            
            // Update the channel display on the page
            const channelDisplay = document.getElementById('sequencerChannelDisplay');
            if (channelDisplay) {
                channelDisplay.textContent = `Channel ${channelIndex}`; // Updates the display to show the new channel index
            } else {
                console.error("Channel display element not found!");
            }
        } else if (event.data.type === 'setBPM') {
            const bpm = event.data.bpm;  // Assuming the BPM value is sent under the bpm key
            console.log(`[child] BPM set to ${bpm}`);
            
            // Update the BPM display on the page
            const bpmDisplay = document.getElementById('bpmDisplay');
            if (bpmDisplay) {
                bpmDisplay.textContent = `${bpm} BPM`; // Updates the display to show the new BPM
            } else {
                console.error("BPM display element not found!");
            }
        }
    }
}, false);


// document.addEventListener('DOMContentLoaded', () => {
//     const controlChannelDropdown = document.getElementById('controlChannel');

//     // Create an "All Channels" option
//     let allChannelsOption = document.createElement('option');
//     allChannelsOption.value = 'all';
//     allChannelsOption.text = 'All Channels';
//     controlChannelDropdown.appendChild(allChannelsOption);

//     // Create options for the 16 channels
//     for (let i = 1; i <= 16; i++) {
//         let option = document.createElement('option');
//         option.value = i;
//         option.text = 'Channel ' + i;
//         controlChannelDropdown.appendChild(option);
//     }
// });
