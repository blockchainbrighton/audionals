import State from './state.js';

export const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Transport info for UI (imported by ui.js)
export let playStartTime = 0;

let startTime = 0;
let nextStep = 0;
let timer = null;
const lookAhead = 0.1;
const tickMs = 25;

let scheduledSources = []; // Array of all currently playing buffer sources

function scheduleStep(stepIdx, time) { // Removed 'channels' from args, will get from State
  const s = State.get(); // Get current state
  s.channels.forEach((ch, channelIndex) => { // Iterate over state's channels to get index
    if (!ch.buffer || !ch.steps[stepIdx]) return;

    const src = ctx.createBufferSource();
    src.buffer = ch.buffer;
    src.playbackRate.value = ch.pitch || 1;

    const bufferDuration = ch.buffer.duration;
    const trimStartRatio = ch.trimStart ?? 0;
    const trimEndRatio = ch.trimEnd ?? 1;

    const offsetSeconds = bufferDuration * trimStartRatio;
    const durationSeconds = Math.max(bufferDuration * (trimEndRatio - trimStartRatio), 0.001);

    const gain = ctx.createGain();
    gain.gain.value = ch.mute ? 0 : (ch.volume ?? 0.8); // Consider solo logic here if not handled elsewhere
    src.connect(gain).connect(ctx.destination);
    src.start(time, offsetSeconds, durationSeconds);

    scheduledSources.push(src);

    // Update state with playback info for this channel's new sound
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: time,
      activePlaybackDuration: durationSeconds,
      activePlaybackTrimStart: trimStartRatio,
      activePlaybackTrimEnd: trimEndRatio,
    });

    src.onended = () => {
      scheduledSources = scheduledSources.filter(node => node !== src);

      // Clear playback state only if this ended source matches the one in the state
      // This prevents a late onended from an old sound clearing a new sound's state
      const currentChannelState = State.get().channels[channelIndex];
      if (currentChannelState && currentChannelState.activePlaybackScheduledTime === time) {
        State.updateChannel(channelIndex, {
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
        });
      }
      try { gain.disconnect(); } catch {}
      try { src.disconnect(); } catch {}
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
    // scheduleStep no longer needs s.channels passed
    scheduleStep(nextStep % 64, stepTime);
    if (typeof State.update === "function")
      State.update({ currentStep: nextStep % 64 });
    nextStep++;
  }
}

// Modify stop function
export function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  const oldState = State.get(); // Get state before updating playing status
  State.update({ playing: false, currentStep: 0 });

  scheduledSources.forEach(src => {
    try { src.stop(0); } catch {}
    try { src.disconnect(); } catch {} // Disconnect after stopping
  });
  scheduledSources = [];
  playStartTime = 0;
  startTime = 0; // Reset startTime
  nextStep = 0;  // Reset nextStep

  // Clear active playback state for all channels
  oldState.channels.forEach((_ch, channelIndex) => {
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: null,
      activePlaybackDuration: null,
      activePlaybackTrimStart: null,
      activePlaybackTrimEnd: null,
    });
  });
}

// start() function remains largely the same, but ensure it uses the modified scheduler
export function start() {
  if (timer) return;
  ctx.resume();
  // const s = State.get(); // No longer needed here directly for s.bpm or s.channels
  startTime = ctx.currentTime + 0.03; // Small buffer before sound starts
  playStartTime = startTime;
  nextStep = 0;
  State.update({ playing: true, currentStep: 0 }); // currentStep could be 0 or where it left off
  scheduler(); // Initial call
  timer = setInterval(scheduler, tickMs);
}
