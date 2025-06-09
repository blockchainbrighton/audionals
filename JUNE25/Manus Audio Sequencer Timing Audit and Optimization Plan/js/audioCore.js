// audioCore.js
import State from './state.js';

// This is the single source of truth for AudioContext
export const ctx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive', // Moved latencyHint here from audioEngine
    // sampleRate: 48000 // Consider if you need a fixed sample rate.
});

console.log(`[audioCore] Primary AudioContext initialized. State: ${ctx.state}`);
console.log(`[audioCore] Base Latency: ${ctx.baseLatency !== undefined ? (ctx.baseLatency * 1000).toFixed(2) + 'ms' : 'N/A (Not supported)'}`);
console.log(`[audioCore] Output Latency: ${ctx.outputLatency !== undefined ? (ctx.outputLatency * 1000).toFixed(2) + 'ms' : 'N/A (Not supported)'}`);
console.log(`[audioCore] Sample Rate: ${ctx.sampleRate} Hz`);

// Attach the onstatechange handler to the primary context
ctx.onstatechange = () => {
    console.log(`[audioCore] Primary AudioContext state changed to: ${ctx.state}`);
    
    // Logic moved from audioEngine.js, now correctly uses the primary context and State
    if (State.get().playing && (ctx.state === 'interrupted' || ctx.state === 'suspended')) {
        console.warn('[audioCore] Primary AudioContext interrupted or suspended during playback.');
        // Optionally, you could try to stop playback via State.update({ playing: false });
        // or attempt a resume.
        // Example:
        // if (State.get().playing) {
        //    playbackEngine.stop(); // Assuming playbackEngine is accessible or use State.update
        //    State.update({ playing: false, userMessage: "Playback stopped: Audio system interrupted." });
        // }
    }

    // If you want to automatically attempt resume (might need user gesture for 'suspended'):
    // if (ctx.state === 'suspended') {
    //   ctx.resume().then(() => {
    //     console.log('[audioCore] Primary AudioContext resumed via onstatechange listener.');
    //     // If playback was active, you might need to inform playbackEngine or re-trigger play
    //   }).catch(err => {
    //     console.error('[audioCore] Error resuming Primary AudioContext via onstatechange:', err);
    //   });
    // }
};


export let channelGainNodes = []; // Exported for playbackEngine

export const EQ_BANDS_DEFS = { // Exported for playbackEngine
    LOW:  { frequency: 200, type: 'lowshelf' },
    MID:  { frequency: 1000, type: 'peaking', Q: 1.2 },
    HIGH: { frequency: 5000, type: 'highshelf' }
};

function setupChannelAudioNodes(numChannels) {
    if (ctx.state === 'suspended') {
        // Attempt to resume if suspended. This is good practice before creating nodes.
        ctx.resume().then(() => {
            console.log("[audioCore] AudioContext resumed for node setup.");
            // Proceed with setup only after successful resume if it was suspended
            _performChannelNodeSetup(numChannels);
        }).catch(err => {
            console.error("[audioCore] Could not resume AudioContext for node setup:", err);
            // Handle error: perhaps notify user or prevent further audio operations
        });
    } else {
        _performChannelNodeSetup(numChannels);
    }
}

function _performChannelNodeSetup(numChannels) {
    // Actual logic for setting up nodes, extracted for clarity after resume check
    while (channelGainNodes.length < numChannels) {
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        channelGainNodes.push(gainNode);
    }
    while (channelGainNodes.length > numChannels) {
        const removedNode = channelGainNodes.pop();
        if (removedNode) removedNode.disconnect();
    }
    // Ensure initial volumes are set for newly added channels
    applyChannelVolumes(State.get());
}


function applyChannelVolumes(currentState) {
    const soloActive = currentState.channels.some(ch => ch.solo);
    currentState.channels.forEach((channel, i) => {
        if (channelGainNodes[i]) {
            let volume = channel.volume ?? 0.8;
            if (channel.mute || (soloActive && !channel.solo)) {
                volume = 0;
            }
            // Use setValueAtTime for immediate changes unless a ramp is specifically desired from a previous state
            channelGainNodes[i].gain.setValueAtTime(volume, ctx.currentTime);
        }
    });
}


function initAudioEngineStateListener() {
    const initialState = State.get();
    setupChannelAudioNodes(initialState.channels.length); // This will also call applyChannelVolumes indirectly via _performChannelNodeSetup if nodes are created
    // If setupChannelAudioNodes doesn't create new nodes but length matches, ensure volumes are set:
    if (initialState.channels.length === channelGainNodes.length) {
        applyChannelVolumes(initialState);
    }


    State.subscribe((newState, oldState) => {
        if (newState.channels.length !== channelGainNodes.length) {
            setupChannelAudioNodes(newState.channels.length); // This will call _performChannelNodeSetup
        }
        // else { // If channel count hasn't changed, still need to update volumes based on mute/solo/volume changes
            const soloActive = newState.channels.some(ch => ch.solo);
            const oldSoloActive = oldState.channels.some(ch => ch.solo);

            newState.channels.forEach((channel, i) => {
                if (channelGainNodes[i]) {
                    const oldCh = oldState.channels[i] || {}; // Ensure oldCh exists
                    let targetVolume = channel.volume ?? 0.8;
                    if (channel.mute || (soloActive && !channel.solo)) {
                        targetVolume = 0;
                    }
                    
                    let oldEffectiveVolume = oldCh.volume ?? 0.8;
                     if (oldCh.mute || (oldSoloActive && !oldCh.solo)) {
                        oldEffectiveVolume = 0;
                    }

                    // Check if a ramp is actually needed
                    if (Math.abs(channelGainNodes[i].gain.value - targetVolume) > 0.001) { // Compare with current gain value
                        // Check if specific properties that affect volume changed
                        const volumePropsChanged = targetVolume !== oldEffectiveVolume || 
                                                 channel.mute !== oldCh.mute || 
                                                 channel.solo !== oldCh.solo || 
                                                 soloActive !== oldSoloActive;

                        if(volumePropsChanged) {
                             channelGainNodes[i].gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.02);
                        } else if (channelGainNodes[i].gain.value !== targetVolume) {
                            // If no explicit state change triggered it, but gain is somehow different, set it directly
                             channelGainNodes[i].gain.setValueAtTime(targetVolume, ctx.currentTime);
                        }
                    }
                }
            });
        // }
    });
}
initAudioEngineStateListener(); // Self-invoking to setup listeners and initial state