// At the top of audioEngine.js
import State from './state.js';

export const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Transport info for UI (imported by ui.js)
export let playStartTime = 0;

let startTime = 0;
let nextStep = 0;
let timer = null;
const lookAhead = 0.1;
const tickMs = 25;

// NEW: Array to hold persistent GainNodes for each channel
let channelGainNodes = [];

// NEW: Function to setup or re-setup channel gain nodes
function setupChannelAudioNodes(numChannels) {
    // Ensure we have enough gain nodes
    while (channelGainNodes.length < numChannels) {
        const newGainNode = ctx.createGain();
        newGainNode.connect(ctx.destination); // Connect directly to output for now
        channelGainNodes.push(newGainNode);
    }
    // If channels were removed (not currently supported by your app, but good practice)
    while (channelGainNodes.length > numChannels) {
        const removedNode = channelGainNodes.pop();
        if (removedNode) {
            removedNode.disconnect();
        }
    }
}

// NEW: Initialize and subscribe to state changes for volume
function initAudioEngineStateListener() {
    const initialState = State.get();
    setupChannelAudioNodes(initialState.channels.length);

    // Set initial volumes
    initialState.channels.forEach((channel, i) => {
        if (channelGainNodes[i]) {
            const volume = channel.mute ? 0 : (channel.volume ?? 0.8); // Apply mute here too
            // Consider solo logic here if needed (more complex, involves other channels)
            channelGainNodes[i].gain.setValueAtTime(volume, ctx.currentTime);
        }
    });

    State.subscribe((newState, oldState) => {
        // Check if number of channels changed
        if (newState.channels.length !== channelGainNodes.length) {
            setupChannelAudioNodes(newState.channels.length);
        }

        newState.channels.forEach((channel, i) => {
            if (channelGainNodes[i]) {
                const oldChannelState = oldState.channels[i] || {}; // Handle new channels
                const newVolume = channel.mute ? 0 : (channel.volume ?? 0.8);
                const oldVolume = oldChannelState.mute ? 0 : (oldChannelState.volume ?? 0.8);

                // Consider solo logic here: if solo is active, other non-soloed channels should be 0.
                // This gets complex as it depends on the global solo state.
                // For now, let's keep it simple and handle mute/volume.
                // If solo is implemented, you'd likely adjust newVolume based on global solo status
                // and whether this channel 'i' is soloed.

                if (newVolume !== oldVolume) {
                    channelGainNodes[i].gain.linearRampToValueAtTime(
                        newVolume,
                        ctx.currentTime + 0.02 // 20ms ramp
                    );
                }
            }
        });
    });
}

// Call this once, perhaps in your main app.js after State is initialized
// Or if app.js imports start/stop, audioEngine can self-initialize its listener.
// For simplicity, let's assume it's called when the module loads or by an init function.
initAudioEngineStateListener();


let scheduledSources = [];

function scheduleStep(stepIdx, time) {
  const s = State.get();
  s.channels.forEach((ch, channelIndex) => {
    // Ensure channelGainNode exists for this channelIndex
    if (!channelGainNodes[channelIndex]) {
        console.warn(`No gain node for channel ${channelIndex}, skipping.`);
        // This might happen if a channel was added but setupChannelAudioNodes wasn't updated immediately.
        // The subscription should handle it, but this is a safeguard.
        return;
    }
    if (!ch.buffer || !ch.steps[stepIdx]) return;

    const src = ctx.createBufferSource();
    src.buffer = ch.buffer;
    src.playbackRate.value = ch.pitch || 1;

    const bufferDuration = ch.buffer.duration;
    const trimStartRatio = ch.trimStart ?? 0;
    const trimEndRatio = ch.trimEnd ?? 1;

    const offsetSeconds = bufferDuration * trimStartRatio;
    const durationSeconds = Math.max(bufferDuration * (trimEndRatio - trimStartRatio), 0.001);

    // --- MODIFIED PART ---
    // Instead of creating a new gain node here, connect to the persistent one
    // The volume of channelGainNodes[channelIndex] is already being managed by the State subscription
    src.connect(channelGainNodes[channelIndex]);
    // The channelGainNodes[channelIndex] is already connected to ctx.destination
    // --- END MODIFIED PART ---

    src.start(time, offsetSeconds, durationSeconds);
    scheduledSources.push({ source: src, channelIndex: channelIndex }); // Store channelIndex too

    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: time,
      activePlaybackDuration: durationSeconds,
      activePlaybackTrimStart: trimStartRatio,
      activePlaybackTrimEnd: trimEndRatio,
    });

    src.onended = () => {
      scheduledSources = scheduledSources.filter(item => item.source !== src);

      const currentChannelState = State.get().channels[channelIndex];
      if (currentChannelState && currentChannelState.activePlaybackScheduledTime === time) {
        State.updateChannel(channelIndex, {
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
        });
      }
      // No need to disconnect the channelGainNode here, it's persistent.
      try { src.disconnect(); } catch {} // Just disconnect the source
    };
  });
}

function scheduler() {
  const s = State.get();
  const spb = 60 / s.bpm;
  const sp16 = spb / 4;
  const now = ctx.currentTime;
  while (true) {
    const stepTime = startTime + nextStep * sp16;
    if (stepTime > now + lookAhead) break;
    scheduleStep(nextStep % 64, stepTime);
    // if (typeof State.update === "function") // Assuming State.update is always a function
    State.update({ currentStep: nextStep % 64 }); // Removed the typeof check for brevity
    nextStep++;
  }
}

export function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  const oldState = State.get();
  State.update({ playing: false, currentStep: 0 });

  scheduledSources.forEach(item => {
    try { item.source.stop(0); } catch {}
    try { item.source.disconnect(); } catch {}
  });
  scheduledSources = [];
  playStartTime = 0;
  startTime = 0;
  nextStep = 0;

  oldState.channels.forEach((_ch, channelIndex) => {
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: null,
      activePlaybackDuration: null,
      activePlaybackTrimStart: null,
      activePlaybackTrimEnd: null,
    });
  });
}

export function start() {
  if (timer) return;
  ctx.resume().then(() => { // Good practice to resume in a user gesture or ensure it's resumed
    startTime = ctx.currentTime + 0.03;
    playStartTime = startTime;
    nextStep = 0;
    State.update({ playing: true, currentStep: 0 });
    scheduler();
    timer = setInterval(scheduler, tickMs);
  });
}

// You might need an explicit init function if you want to control
// when initAudioEngineStateListener is called from app.js,
// e.g., after the DOM is ready and initial state is loaded.
// export function init() {
//   initAudioEngineStateListener();
// }
// If so, call audioEngine.init() in your app.js