import { appState } from './state.js';
import { clamp } from './utils.js';

const ctx = new (window.AudioContext || window.webkitAudioContext)();
let lookahead = 0.1; // seconds
let scheduleInterval = 25; // ms
let timerId = null, playhead = 0;
let scheduled = [];

export async function loadSample(url) {
  const resp = await fetch(url);
  const arr = await resp.arrayBuffer();
  return ctx.decodeAudioData(arr);
}

export async function createReversedBuffer(buffer) {
  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    reversed.getChannelData(ch).set([...buffer.getChannelData(ch)].reverse());
  }
  return reversed;
}

export function scheduleStep(channel, when, reverse = false) {
  if (!channel.buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = reverse ? (channel.bufferReversed || channel.buffer) : channel.buffer;
  src.playbackRate.value = channel.pitch || 1;
  const gain = ctx.createGain();
  gain.gain.value = channel.mute ? 0 : clamp(channel.volume, 0, 1);
  src.connect(gain).connect(ctx.destination);
  src.start(when, channel.trim[0], channel.trim[1] - channel.trim[0]);
  scheduled.push(src);
}

function scheduleNotes() {
  const seqIdx = appState.currentSeq.get();
  const sequences = appState.sequences.get();
  const seq = sequences[seqIdx];
  if (!seq) return;
  const when = ctx.currentTime + lookahead;
  appState.channels.get().forEach((channel, cIdx) => {
    const step = seq.steps[cIdx]?.[playhead];
    if (step?.on) scheduleStep(channel, when, step.reverse);
  });

  playhead = (playhead + 1) % 64;
}

export function playSequencer() {
  if (appState.playing.get()) return;
  appState.playing.set(true);
  playhead = 0;
  timerId = setInterval(scheduleNotes, scheduleInterval);
}

export function stopSequencer() {
  if (!appState.playing.get()) return;
  appState.playing.set(false);
  clearInterval(timerId);
  scheduled.forEach(s => s.stop?.());
  scheduled = [];
}
