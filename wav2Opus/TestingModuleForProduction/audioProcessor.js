// --- audioProcessor.js ---
import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';

const SMOOTH_PARAM_TIME = 0.01, A4_NOTE = 69, A4_FREQ = 440, SEMITONE = 2 ** (1 / 12), MIN_NOTE = 21, MAX_NOTE = 108;
let audioContext, mainGainNode, decodedBuffer, reversedBuffer, isReversed = false,
    currentTempo = 78, currentGlobalPitch = 1, currentVolume = 1, originalSampleFrequency,
    sampleType = 'one-shot', midiNoteToPlaybackRate = new Map(), currentLoopingSource;

// --- START: Refactored timingManager (This was correct from your "working version") ---
const timingManager = (() => {
  const INTERVAL = 25;
  const LOOKAHEAD_TIME = 0.1;
  const SCHEDULE_DELAY = 0.05;
  let audioCtx;
  let internalTempo = 120;
  let internalMultiplier = 1;
  let isLoopingActive = false;
  let schedulerTimeoutId = null;
  let onScheduleCallback;
  let sessionInitialStartTime = 0;
  let scheduledSubBeatCount = 0;

  const getSubBeatDuration = () => {
    if (internalTempo <= 0 || internalMultiplier <= 0) return Infinity;
    return (60 / internalTempo) / internalMultiplier;
  };

  const schedulerLoop = () => {
    if (!isLoopingActive || !audioCtx || !onScheduleCallback) return;
    const now = audioCtx.currentTime;
    const scheduleUntil = now + LOOKAHEAD_TIME;
    const subBeatDuration = getSubBeatDuration();
    if (subBeatDuration === Infinity) {
      console.warn("TimingManager: Invalid tempo or multiplier, stopping loop.");
      _stopScheduler(true); return;
    }
    while (true) {
      const scheduledTime = sessionInitialStartTime + (scheduledSubBeatCount * subBeatDuration);
      if (scheduledTime < now - 0.001) {
        scheduledSubBeatCount++; continue;
      }
      if (scheduledTime < scheduleUntil) {
        onScheduleCallback(scheduledTime);
        scheduledSubBeatCount++;
      } else {
        break;
      }
    }
    schedulerTimeoutId = setTimeout(schedulerLoop, INTERVAL);
  };

  const _startScheduler = (callback) => {
    if (isLoopingActive || !audioCtx || typeof callback !== 'function') return false;
    onScheduleCallback = callback; isLoopingActive = true;
    if (sessionInitialStartTime === 0) {
      sessionInitialStartTime = audioCtx.currentTime + SCHEDULE_DELAY;
      scheduledSubBeatCount = 0;
    } else {
      const subBeatDuration = getSubBeatDuration();
      if (subBeatDuration > 0 && subBeatDuration !== Infinity) {
        const elapsedTimeSinceSessionStart = Math.max(0, audioCtx.currentTime - sessionInitialStartTime);
        scheduledSubBeatCount = Math.ceil(elapsedTimeSinceSessionStart / subBeatDuration);
      }
    }
    schedulerLoop(); return true;
  };

  const _stopScheduler = (resetSession = true) => {
    clearTimeout(schedulerTimeoutId); schedulerTimeoutId = null; isLoopingActive = false;
    if (resetSession) { sessionInitialStartTime = 0; scheduledSubBeatCount = 0; }
  };

  return {
    init: (_ctx, initialTempo, initialPitchIgnored) => {
      if (!(_ctx instanceof AudioContext)) throw Error('TimingManager: Invalid AudioContext');
      audioCtx = _ctx; internalTempo = +initialTempo > 0 ? +initialTempo : 78; internalMultiplier = 1;
      _stopScheduler(true);
    },
    startLoop: (callback) => {
      if (!audioCtx) { console.warn("TimingManager: AudioContext not initialized."); return false; }
      return _startScheduler(callback);
    },
    stopLoop: () => { _stopScheduler(true); onScheduleCallback = null; },
    setTempo: (bpm) => {
      bpm = +bpm; if (bpm <= 0 || Number.isNaN(bpm) || internalTempo === bpm) return;
      internalTempo = bpm;
      if (isLoopingActive) { const cb = onScheduleCallback; _stopScheduler(false); _startScheduler(cb); }
    },
    setPitch: (rate) => { /* Not used by timingManager */ },
    setScheduleMultiplier: (multiplier) => {
      multiplier = parseInt(multiplier, 10); if (multiplier < 1 || Number.isNaN(multiplier) || internalMultiplier === multiplier) return;
      internalMultiplier = multiplier;
      if (isLoopingActive) { const cb = onScheduleCallback; _stopScheduler(false); _startScheduler(cb); }
    },
    getLoopingState: () => isLoopingActive,
    getCurrentTempo: () => internalTempo,
    getCurrentScheduleMultiplier: () => internalMultiplier,
    getSessionInitialStartTime: () => sessionInitialStartTime,
  };
})();
// --- END: Refactored timingManager ---

// For native loop animation tracking
let nextNativeLoopAnimationTime = 0;
const NATIVE_LOOP_ANIMATION_EPSILON = 0.020; // 20ms tolerance

const _ensureContext = async () => {
  if (!audioContext) { showError('Audio system not ready.'); return false; }
  if (audioContext.state === 'suspended') {
    try { await audioContext.resume(); } catch (e) { showError('Could not resume audio.'); throw e; }
  }
  return true;
};

const _selectBuffer = () => {
  const buf = isReversed ? reversedBuffer : decodedBuffer;
  if (!buf) showError(`Cannot play: ${isReversed ? 'Reversed' : 'Original'} buffer unavailable.`);
  return buf;
};

// _play function remains as it was in your working version, including triggerAnimation()
const _play = (buf, time, rate, loop = false) => {
  if (!buf || !audioContext) return null;
  try {
    const src = audioContext.createBufferSource();
    Object.assign(src, { buffer: buf, loop });
    src.playbackRate.value = rate;
    src.connect(mainGainNode);
    triggerAnimation(); // Animation is triggered here for *every* play call
    src.start(time);
    return src;
  } catch (e) { showError('Failed to play.'); console.error(e); return null; }
};

const _reverse = buf => { /* ... (same as your working version) ... */
  const { numberOfChannels, length, sampleRate } = buf;
  const rev = audioContext.createBuffer(numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const channelData = buf.getChannelData(ch);
    const reversedChannelData = rev.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      reversedChannelData[i] = channelData[length - 1 - i];
    }
  }
  return rev;
};

const _setupContext = () => { /* ... (same as your working version) ... */
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext not supported by this browser.');
  audioContext = new Ctx();
  mainGainNode = audioContext.createGain();
  mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
  mainGainNode.connect(audioContext.destination);
};

const _decodeAndPrepare = async base64 => { /* ... (same as your working version) ... */
  decodedBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);
  const freqText = document.getElementById('audio-meta-frequency')?.textContent || '';
  const freq = parseFloat(freqText);
  if (Number.isNaN(freq) || freq <= 0) {
    showError('Invalid or missing base frequency for audio. MIDI note playback may be inaccurate.');
    originalSampleFrequency = 440;
  } else {
    originalSampleFrequency = freq;
  }
  const typeText = (document.getElementById('audio-meta-sample-type') || document.getElementById('audio-meta-loop'))?.textContent.trim().toLowerCase();
  sampleType = (typeText === 'loop' || typeText === 'yes') ? 'loop' : 'one-shot';
  midiNoteToPlaybackRate.clear();
  for (let note = MIN_NOTE; note <= MAX_NOTE; note++) {
    const playbackRate = (A4_FREQ * (SEMITONE ** (note - A4_NOTE))) / originalSampleFrequency;
    midiNoteToPlaybackRate.set(note, playbackRate);
  }
};

export async function init(base64, tempo = 78, pitch = 1) { /* ... (same as your working version) ... */
  [currentTempo, currentGlobalPitch, currentVolume, isReversed] = [tempo, pitch, 1, false];
  [audioContext, mainGainNode, decodedBuffer, reversedBuffer, currentLoopingSource] = Array(5).fill(null);
  midiNoteToPlaybackRate.clear();
  sampleType = 'one-shot';
  try {
    _setupContext();
    await _decodeAndPrepare(base64);
    timingManager.init(audioContext, currentTempo, currentGlobalPitch);
  } catch (e) {
    showError(`Audio Init Failed: ${e.message || e}`);
    console.error("Audio Init Failed:", e);
    return false;
  }
  return true;
}

export async function playOnce() { /* ... (same as your working version) ... */
  if (await _ensureContext()) {
    const buf = _selectBuffer();
    if (buf) _play(buf, audioContext.currentTime, currentGlobalPitch);
  }
}

export async function startLoop() {
  if (timingManager.getLoopingState() || !(await _ensureContext())) return;
  const buf = _selectBuffer(); // buf is captured by the callback closure below
  if (!buf) return;

  currentLoopingSource?.stop();
  currentLoopingSource = null;
  nextNativeLoopAnimationTime = 0; // Reset tracker

  // Define the callback for timingManager
  const scheduleCallback = (scheduledTime) => {
    // For one-shot samples, _play() is called for each, which triggers animation.
    if (sampleType === 'one-shot') {
      _play(buf, scheduledTime, currentGlobalPitch);
    }
    // For native loops, we only trigger animation if it's time, _play() was only called once initially.
    else if (sampleType === 'loop') {
      if (decodedBuffer && nextNativeLoopAnimationTime > 0 && currentGlobalPitch > 0) {
        const effectiveSampleDuration = decodedBuffer.duration / currentGlobalPitch;
        if (effectiveSampleDuration <= NATIVE_LOOP_ANIMATION_EPSILON / 2) { return; }

        if (scheduledTime >= nextNativeLoopAnimationTime - NATIVE_LOOP_ANIMATION_EPSILON) {
          triggerAnimation(); // Manually trigger animation for native loop cycle
          while (nextNativeLoopAnimationTime <= scheduledTime + NATIVE_LOOP_ANIMATION_EPSILON) {
            nextNativeLoopAnimationTime += effectiveSampleDuration;
            if (effectiveSampleDuration < 0.001 && audioContext && nextNativeLoopAnimationTime > audioContext.currentTime + 60) {
                console.warn("Native loop animation scheduling: Runaway loop detected.");
                nextNativeLoopAnimationTime = 0; break;
            }
          }
        }
      }
    }
  };

  const successfullyStarted = timingManager.startLoop(scheduleCallback);

  if (!successfullyStarted) {
    showError('Failed to start timing loop.');
    nextNativeLoopAnimationTime = 0; // Ensure reset
    return;
  }

  // Specific setup for sampleType 'loop'
  if (sampleType === 'loop') {
    const sessionStartTime = timingManager.getSessionInitialStartTime();
    if (sessionStartTime > 0 && decodedBuffer) {
      // _play() is called ONCE to start the native loop. This triggers the *first* animation.
      currentLoopingSource = _play(buf, sessionStartTime, currentGlobalPitch, true);

      if (currentLoopingSource && currentGlobalPitch > 0) {
        const effectiveSampleDuration = decodedBuffer.duration / currentGlobalPitch;
        if (effectiveSampleDuration > 0) {
            // Prime for the *next* animation.
            nextNativeLoopAnimationTime = sessionStartTime + effectiveSampleDuration;
        } else {
            nextNativeLoopAnimationTime = 0;
        }
      } else {
        showError('Native looping sample playback or animation setup failed.');
        stopLoop(); return;
      }
    } else {
      showError("Could not get valid session start time or buffer for 'loop' sample animation.");
      stopLoop(); return;
    }
  } else {
      // For one-shot loops, or if not looping, ensure tracker is cleared as it's not used.
      nextNativeLoopAnimationTime = 0;
  }
}

export function stopLoop() {
  timingManager.stopLoop();
  try {
    currentLoopingSource?.stop();
  } catch (e) { /* ignore */ }
  currentLoopingSource = null;
  nextNativeLoopAnimationTime = 0; // IMPORTANT: Reset the tracker
}

export function setScheduleMultiplier(m) { /* ... (same as your working version) ... */
  const multiplier = Math.max(1, parseInt(m, 10));
  timingManager.setScheduleMultiplier(multiplier);
}
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) { /* ... (same as your working version) ... */
  if (bpm > 0) {
    currentTempo = bpm;
    timingManager.setTempo(bpm);
  }
}

export function toggleReverse() { /* ... (same as your working version, ensure stopLoop and startLoop handle nextNativeLoopAnimationTime) ... */
  if (!decodedBuffer || !reversedBuffer) return isReversed;
  const wasLooping = timingManager.getLoopingState();
  if (wasLooping) {
    stopLoop(); // This resets nextNativeLoopAnimationTime
  }
  isReversed = !isReversed;
  if (wasLooping) {
    Promise.resolve().then(() => startLoop()); // startLoop re-initializes nextNativeLoopAnimationTime
  }
  return isReversed;
}

export function setGlobalPitch(r) {
  if (r > 0 && audioContext) {
    // const oldPitch = currentGlobalPitch; // Not strictly needed now
    currentGlobalPitch = r;
    if (currentLoopingSource) {
      currentLoopingSource.playbackRate.setTargetAtTime(r, audioContext.currentTime, SMOOTH_PARAM_TIME);
      // The `nextNativeLoopAnimationTime` will be updated using the new `currentGlobalPitch`
      // by the `scheduleCallback` when it next fires and recalculates.
    }
  }
}

export function setVolume(v) { /* ... (same as your working version) ... */
  if (v >= 0 && mainGainNode && audioContext) {
    currentVolume = v;
    mainGainNode.gain.setTargetAtTime(v, audioContext.currentTime, SMOOTH_PARAM_TIME);
  }
}

export const getLoopingState = () => timingManager.getLoopingState();
export const getReverseState = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext = _ensureContext;
export const getPlaybackRateForNote = n => midiNoteToPlaybackRate.get(n);

export async function playSampleAtRate(r, velIgnored) { /* ... (same as your working version) ... */
  if (r > 0 && await _ensureContext()) {
    const buf = _selectBuffer();
    if (buf) _play(buf, audioContext.currentTime, r);
  }
}

export const getSessionStartTime = () => timingManager.getSessionInitialStartTime();
export const getCurrentTempo = () => currentTempo;
export const getCurrentPitch = () => currentGlobalPitch;