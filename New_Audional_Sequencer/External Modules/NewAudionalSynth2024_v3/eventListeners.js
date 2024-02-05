// eventListeners.js

const synthChannel = new BroadcastChannel('synthChannel'); // Create a new channel for 'synthChannel'

synthChannel.addEventListener("message", (event) => { // Listen on 'synthChannel'
    if (event.data.type === 'play') {
        console.log(`[Synth messageEventListener] Received play message: ${event.data.data.step}`);
        
        // Log the complete event data received
        console.log('[Synth messageEventListener] Received message data:', event.data);
        
        onSequencerStep(event.data.data.step);
        playBackMIDI()

        // // Clear any existing timeout since we've received an external step
        // if (externalStepTimeout) {
        //     clearTimeout(externalStepTimeout);
        // }

        //// Set a new timeout to check if we receive another step in the next 2 seconds (or any other reasonable duration)
        //externalStepTimeout = setTimeout(() => {
        //    console.log(`[ms10] No external steps received for an extended period. Stopping arpeggiator.`);
        //    stopArpeggiator();
        //}, 250);  // Timeout duration can be adjusted based on your needs
    }
});
