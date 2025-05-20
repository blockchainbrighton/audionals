// audio-processing/timingManager.js

const INTERVAL = 25, LOOKAHEAD_TIME = 0.1, SCHEDULE_DELAY = 0.05;
let audioCtx, internalTempo = 120, internalMultiplier = 1, isLoopingActive = false,
    schedulerTimeoutId, onScheduleCallback, sessionInitialStartTime = 0, scheduledSubBeatCount = 0;

const getSubBeatDuration = () => (internalTempo <= 0 || internalMultiplier <= 0) ? Infinity : (60 / internalTempo) / internalMultiplier;

const schedulerLoop = () => {
  if (!isLoopingActive || !audioCtx || !onScheduleCallback) return;
  const now = audioCtx.currentTime;
  const scheduleUntil = now + LOOKAHEAD_TIME;
  const subBeatDuration = getSubBeatDuration();

  if (subBeatDuration === Infinity) {
    _stopScheduler(true); // Use internal function name
    return;
  }
  
  while (true) {
    const scheduledTime = sessionInitialStartTime + (scheduledSubBeatCount * subBeatDuration);
    if (scheduledTime < now - 0.001) { // Event is in the past (beyond a small epsilon)
        scheduledSubBeatCount++;
        continue;
    }
    if (scheduledTime < scheduleUntil) { // Event is within the lookahead window
        onScheduleCallback(scheduledTime); // Callback provides its own context for pitch/rate
        scheduledSubBeatCount++;
    }
    else break; // Event is too far in the future
  }
  schedulerTimeoutId = setTimeout(schedulerLoop, INTERVAL);
};

const _startScheduler = callback => {
  if (isLoopingActive || !audioCtx || typeof callback !== 'function') return false;
  onScheduleCallback = callback;
  isLoopingActive = true;

  if (sessionInitialStartTime === 0) { // Fresh start
    sessionInitialStartTime = audioCtx.currentTime + SCHEDULE_DELAY;
    scheduledSubBeatCount = 0;
  } else { // Resuming or restarting scheduler without full reset
    const d = getSubBeatDuration();
    const elapsed = Math.max(0, audioCtx.currentTime - sessionInitialStartTime);
    // Recalculate based on original logic for resuming
    scheduledSubBeatCount = (d > 0 && d !== Infinity) ? Math.ceil(elapsed / d) : 0;
    // schedulerLoop will handle advancing scheduledSubBeatCount if current time is past the calculated next beat.
  }
  schedulerLoop();
  return true;
};

const _stopScheduler = (reset = true) => {
  clearTimeout(schedulerTimeoutId);
  schedulerTimeoutId = null;
  isLoopingActive = false;
  if (reset) {
    sessionInitialStartTime = 0;
    scheduledSubBeatCount = 0;
  }
};

export const timingManager = {
  init: (_ctx, tempo) => {
    if (!(_ctx instanceof AudioContext) && !(_ctx instanceof OfflineAudioContext)) {
        throw Error('TimingManager: Invalid AudioContext');
    }
    audioCtx = _ctx;
    internalTempo = +tempo > 0 ? +tempo : 78;
    internalMultiplier = 1;
    _stopScheduler(true);
  },
  startLoop: _startScheduler,
  stopLoop: () => {
    _stopScheduler(true);
    onScheduleCallback = null;
  },
  setTempo: bpm => {
    bpm = +bpm;
    if (bpm > 0 && internalTempo !== bpm) {
      internalTempo = bpm;
      if (isLoopingActive) {
        const cb = onScheduleCallback;
        _stopScheduler(false); // Preserve sessionInitialStartTime & beat count for resync
        _startScheduler(cb);
      }
    }
  },
  setScheduleMultiplier: m => {
    m = parseInt(m, 10);
    if (m >= 1 && internalMultiplier !== m) {
      internalMultiplier = m;
      if (isLoopingActive) {
        const cb = onScheduleCallback;
        _stopScheduler(false); // Preserve sessionInitialStartTime
        _startScheduler(cb);
      }
    }
  },
  getLoopingState: () => isLoopingActive,
  getCurrentTempo: () => internalTempo,
  getCurrentScheduleMultiplier: () => internalMultiplier,
  getSessionInitialStartTime: () => sessionInitialStartTime,
};