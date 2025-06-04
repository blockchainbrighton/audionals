import { playStep, audioCtx } from "./engine.js";

const lookAhead = 0.128; // 128 ms
const scheduleInterval = 25; // ms

export function createScheduler(projectRef, store) {
  let currentStep = 0;
  let nextNoteTime = 0;
  let isPlaying = false;
  let timer;

  function scheduleNote() {
    const { bpm, steps } = projectRef.meta;
    const secondsPerBeat = 60 / bpm;
    while (nextNoteTime < audioCtx.currentTime + lookAhead) {
      projectRef.channels.forEach((ch) => {
        if (ch.steps[currentStep]) playStep(ch, nextNoteTime, ch.velocity[currentStep]);
      });
      nextNoteTime += secondsPerBeat / 4;
      currentStep = (currentStep + 1) % steps;
      store.setState({ playhead: currentStep });
    }
  }

  function tick() {
    scheduleNote();
  }

  return {
    start() {
      if (isPlaying) return;
      isPlaying = true;
      nextNoteTime = audioCtx.currentTime;
      timer = setInterval(tick, scheduleInterval);
    },
    stop() {
      clearInterval(timer);
      isPlaying = false;
      currentStep = 0;
      store.setState({ playhead: 0 });
    },
    toggle() {
      isPlaying ? this.stop() : this.start();
    },
    isPlaying: () => isPlaying,
  };
}
