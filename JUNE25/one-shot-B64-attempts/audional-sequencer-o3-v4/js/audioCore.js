// audioCore.js
import State from './state.js';

export const ctx = new (window.AudioContext || window.webkitAudioContext)();
export let channelGainNodes = []; // Exported for playbackEngine

export const EQ_BANDS_DEFS = { // Exported for playbackEngine
    LOW:  { frequency: 200, type: 'lowshelf' },
    MID:  { frequency: 1000, type: 'peaking', Q: 1.2 },
    HIGH: { frequency: 5000, type: 'highshelf' }
};

function setupChannelAudioNodes(numChannels) {
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => console.log("AudioContext resumed for node setup."));
    }
    while (channelGainNodes.length < numChannels) {
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        channelGainNodes.push(gainNode);
    }
    while (channelGainNodes.length > numChannels) {
        const removedNode = channelGainNodes.pop();
        if (removedNode) removedNode.disconnect();
    }
}

function initAudioEngineStateListener() {
    const initialState = State.get();
    setupChannelAudioNodes(initialState.channels.length);

    initialState.channels.forEach((channel, i) => {
        if (channelGainNodes[i]) {
            const soloActive = initialState.channels.some(ch => ch.solo);
            let volume = channel.volume ?? 0.8;
            if (channel.mute || (soloActive && !channel.solo)) {
                volume = 0;
            }
            channelGainNodes[i].gain.setValueAtTime(volume, ctx.currentTime);
        }
    });

    State.subscribe((newState, oldState) => {
        if (newState.channels.length !== channelGainNodes.length) {
            setupChannelAudioNodes(newState.channels.length);
        }
        const soloActive = newState.channels.some(ch => ch.solo);
        const oldSoloActive = oldState.channels.some(ch => ch.solo);

        newState.channels.forEach((channel, i) => {
            if (channelGainNodes[i]) {
                const oldCh = oldState.channels[i] || {};
                let targetVolume = channel.volume ?? 0.8;
                if (channel.mute || (soloActive && !channel.solo)) {
                    targetVolume = 0;
                }
                
                let oldEffectiveVolume = oldCh.volume ?? 0.8;
                 if (oldCh.mute || (oldSoloActive && !oldCh.solo)) {
                    oldEffectiveVolume = 0;
                }

                if (targetVolume !== oldEffectiveVolume || channel.mute !== oldCh.mute || channel.solo !== oldCh.solo || soloActive !== oldSoloActive) {
                    channelGainNodes[i].gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.02);
                }
            }
        });
    });
}
initAudioEngineStateListener(); // Self-invoking to setup listeners and initial state