// eventListeners.js

// Dynamically obtain the channel index this synth instance should respond to
const urlParams = new URLSearchParams(window.location.search);
const myChannelIndex = parseInt(urlParams.get('channelIndex'), 10); // Extract the channelIndex from the URL

// Check if myChannelIndex is a number to ensure it was properly extracted
if (isNaN(myChannelIndex)) {
    console.error("Synth instance channel index could not be determined.");
} else {
    console.log(`Synth instance initialized for channel ${myChannelIndex}.`);
}

const synthChannel = new BroadcastChannel('synthChannel'); // Create a new channel for 'synthChannel'

synthChannel.addEventListener("message", (event) => { // Listen on 'synthChannel'
    // Check if the message is a play message and meant for this synth instance's channel
    if (event.data.type === 'play' && event.data.data.channel === myChannelIndex) {
        console.log(`[Synth messageEventListener] Received play message for channel ${myChannelIndex}: ${event.data.data.step}`);
        
        // Log the complete event data received
        console.log('[Synth messageEventListener] Received message data:', event.data);
        
        playBackMIDI(myChannelIndex)        // You might need to adjust these function calls to your actual use case
        // Example function calls:
        // onSequencerStep(event.data.data.step);
        // playBackMIDI(event.data.data.step);
        // Ensure these functions are adapted to handle the step and/or channel information if necessary
    } else if (event.data.type === 'play') {
        // Log received message that is not for this channel, can be useful for debugging
        console.log(`[Synth messageEventListener] Ignored play message for channel ${event.data.data.channel}: ${event.data.data.step}`);
    }
});

        // // Clear any existing timeout since we've received an external step
        // if (externalStepTimeout) {
        //     clearTimeout(externalStepTimeout);
        // }

        //// Set a new timeout to check if we receive another step in the next 2 seconds (or any other reasonable duration)
        //externalStepTimeout = setTimeout(() => {
        //    console.log(`[ms10] No external steps received for an extended period. Stopping arpeggiator.`);
        //    stopArpeggiator();
        //}, 250);  // Timeout duration can be adjusted based on your needs
  
