
// timingManagement.js — refactored (ES2024‑ready, lint‑clean, line‑minimised)

/* eslint consistent-return:0, no-console:0 */
const SCHEDULER_INTERVAL_MS = 25,
      SCHEDULE_AHEAD_TIME_S  = 0.1,
      LOOP_START_DELAY_S     = 0.05;

let audioContext     = null,
    currentTempo     = 0,
    currentPitch     = 1,
    isLooping        = false,
    schedulerTimeout = null,
    scheduleMultiplier = 1,
    playCallback     = null,
    loopStartTime    = 0,
    scheduledSubBeat = 0;

// --- helpers ---------------------------------------------------------------
const _calcSubBeatDur = (bpm, mult) => (bpm > 0 && mult > 0) ? 60 / (bpm * mult) : 0;

const _stopLoopInternal = (reset = true) => {
  clearTimeout(schedulerTimeout);
  schedulerTimeout = null;
  if (reset) { loopStartTime = 0; scheduledSubBeat = 0; }
};

const _schedule = () => {
  if (!isLooping || !audioContext) return;

  const now = audioContext.currentTime,
        horizon = now + SCHEDULE_AHEAD_TIME_S,
        subBeatDur = _calcSubBeatDur(currentTempo, scheduleMultiplier);

  if (subBeatDur <= 0) return stopLoop();

  while (true) {
    const target = loopStartTime + scheduledSubBeat * subBeatDur;
    if (target >= horizon) break;
    if (typeof playCallback !== 'function') return stopLoop();
    playCallback(target);
    scheduledSubBeat++;
  }
  schedulerTimeout = setTimeout(_schedule, SCHEDULER_INTERVAL_MS);
};

// --- public API ------------------------------------------------------------
export const getCurrentScheduleMultiplier = () => scheduleMultiplier;

export const setScheduleMultiplier = m => {
  const newMult = Number.parseInt(m, 10);
  if (!Number.isInteger(newMult) || newMult < 1 || newMult === scheduleMultiplier) return;

  scheduleMultiplier = newMult;
  if (isLooping && currentTempo > 0 && audioContext) {
    const newDur = _calcSubBeatDur(currentTempo, scheduleMultiplier),
          elapsed = Math.max(0, audioContext.currentTime - loopStartTime);
    if (newDur > 0) scheduledSubBeat = Math.floor(elapsed / newDur);
  }
};

export const init = (ctx, tempo = 120, pitch = 1) => {
  if (!(ctx instanceof AudioContext)) throw new Error('Invalid AudioContext');
  audioContext = ctx; currentTempo = tempo; currentPitch = pitch;
  scheduleMultiplier = 1; _stopLoopInternal();
};

export const startLoop = cb => {
  if (isLooping || !audioContext || typeof cb !== 'function') return;
  isLooping = true; playCallback = cb;
  loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
  scheduledSubBeat = 0;
  _schedule();
};

export const stopLoop = () => {
  if (!isLooping) return;
  isLooping = false; playCallback = null; _stopLoopInternal();
};

export const setTempo = bpm => {
  if (typeof bpm !== 'number' || bpm <= 0 || bpm === currentTempo) return;
  currentTempo = bpm;
  if (!isLooping) return;
  const cb = playCallback, mult = scheduleMultiplier;
  stopLoop();
  scheduleMultiplier = mult;
  startLoop(cb);
};

export const setPitch = rate => (typeof rate === 'number' && rate > 0) && (currentPitch = rate);

export const getLoopingState = () => isLooping;
export const getCurrentTempo  = () => currentTempo;
export const getCurrentPitch  = () => currentPitch;
