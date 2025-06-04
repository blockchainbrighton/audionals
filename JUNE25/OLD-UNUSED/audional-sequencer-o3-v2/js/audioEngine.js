import State from './state.js';

export const ctx = new (window.AudioContext || window.webkitAudioContext)();

let nextNoteTime = 0;
const scheduleAheadTime = 0.1;
const lookahead = 25; // ms
let timerID = null;

function playSample(buffer, channel) {
  if (!buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = channel.pitch || 1;

  const gain = ctx.createGain();
  gain.gain.value = channel.mute ? 0 : (channel.volume ?? 0.8);

  src.connect(gain).connect(ctx.destination);

  const duration = buffer.duration * ((channel.trimEnd ?? 1) - (channel.trimStart ?? 0));
  src.start(nextNoteTime, buffer.duration * (channel.trimStart ?? 0), duration);
}

function scheduler() {
  const state = State.get();
  const secondsPerBeat = 60.0 / state.bpm;
  const secondsPer16th = secondsPerBeat / 4;

  while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
    const step = state.currentStep;

    state.channels.forEach(ch => {
      if (ch.steps[step]) playSample(ch.buffer, ch);
    });

    nextNoteTime += secondsPer16th;
    State.update({ currentStep: (step + 1) % 64 });
  }
}

export function start() {
  if (timerID) return;
  ctx.resume();
  nextNoteTime = ctx.currentTime;
  State.update({ playing: true, currentStep: 0 });
  timerID = setInterval(scheduler, lookahead);
}

export function stop() {
  if (!timerID) return;
  clearInterval(timerID);
  timerID = null;
  State.update({ playing: false, currentStep: 0 });
}
