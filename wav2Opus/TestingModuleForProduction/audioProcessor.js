// --- audioProcessor.js ---
import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';

const SMOOTH_PARAM_TIME = 0.01, A4_NOTE = 69, A4_FREQ = 440, SEMITONE = 2 ** (1 / 12), MIN_NOTE = 21, MAX_NOTE = 108;
let audioContext, mainGainNode, decodedBuffer, reversedBuffer, isReversed = false,
    currentTempo = 78, currentGlobalPitch = 1, currentVolume = 1, originalSampleFrequency,
    sampleType = 'one-shot', midiNoteToPlaybackRate = new Map(), currentLoopingSource;

// --- START: Refactored timingManager ---
const timingManager = (() => {
  const INTERVAL = 25; // ms, for setTimeout resolution
  const LOOKAHEAD_TIME = 0.1; // seconds, how far ahead to schedule (original AHEAD)
  const SCHEDULE_DELAY = 0.05; // seconds, slight delay for the very first start (original DELAY)

  let audioCtx;
  let internalTempo = 120;
  let internalMultiplier = 1;
  let isLoopingActive = false;
  let schedulerTimeoutId = null;
  let onScheduleCallback; // The function to call for each scheduled beat

  // Key variable: Stores AudioContext.currentTime when playback *first* starts in a session.
  // 0 means no session active or session has been reset.
  let sessionInitialStartTime = 0;
  // Number of sub-beats scheduled *since sessionInitialStartTime*.
  let scheduledSubBeatCount = 0;

  const getSubBeatDuration = () => {
    if (internalTempo <= 0 || internalMultiplier <= 0) return Infinity; // Avoid division by zero
    return (60 / internalTempo) / internalMultiplier; // Duration of one "tick" or sub-beat
  };

  const schedulerLoop = () => {
    if (!isLoopingActive || !audioCtx || !onScheduleCallback) return;

    const now = audioCtx.currentTime;
    const scheduleUntil = now + LOOKAHEAD_TIME;
    const subBeatDuration = getSubBeatDuration();

    if (subBeatDuration === Infinity) {
      console.warn("TimingManager: Invalid tempo or multiplier, stopping loop.");
      _stopScheduler(true); // Full reset
      return;
    }

    // This loop schedules beats from the sessionInitialStartTime
    while (true) {
      // Calculate the absolute time for the current beatCounter relative to sessionInitialStartTime
      const scheduledTime = sessionInitialStartTime + (scheduledSubBeatCount * subBeatDuration);

      // Is this beat in the past? (Allow for tiny floating point inaccuracies)
      if (scheduledTime < now - 0.001) {
        // This beat is in the past, possibly due to a significant tempo/multiplier change
        // or system lag. We need to catch up by advancing the counter without playing.
        scheduledSubBeatCount++;
        continue; // Re-evaluate with the new beatCounter
      }

      if (scheduledTime < scheduleUntil) {
        // This beat is within our scheduling window
        onScheduleCallback(scheduledTime);
        scheduledSubBeatCount++;
      } else {
        // This beat is too far in the future for this scheduling iteration
        break;
      }
    }
    schedulerTimeoutId = setTimeout(schedulerLoop, INTERVAL);
  };

  // Internal function to start the scheduling mechanism
  const _startScheduler = (callback) => {
    if (isLoopingActive || !audioCtx || typeof callback !== 'function') return false;

    onScheduleCallback = callback; // Store the callback
    isLoopingActive = true;

    if (sessionInitialStartTime === 0) {
      // This is the *actual* start of a new playback session.
      // Set the sessionInitialStartTime and reset the beat counter.
      sessionInitialStartTime = audioCtx.currentTime + SCHEDULE_DELAY;
      scheduledSubBeatCount = 0;
    } else {
      // Resuming or parameters changed within an ongoing session.
      // sessionInitialStartTime is preserved.
      // Recalculate scheduledSubBeatCount to align with the current time,
      // the preserved sessionInitialStartTime, and current parameters.
      const subBeatDuration = getSubBeatDuration();
      if (subBeatDuration > 0 && subBeatDuration !== Infinity) {
        const elapsedTimeSinceSessionStart = Math.max(0, audioCtx.currentTime - sessionInitialStartTime);
        // Start scheduling from the *next* logical beat based on current time relative to session start.
        scheduledSubBeatCount = Math.ceil(elapsedTimeSinceSessionStart / subBeatDuration);
      }
      // If subBeatDuration is invalid, schedulerLoop will handle stopping.
    }

    schedulerLoop(); // Start the recursive setTimeout loop
    return true;
  };

  // Internal function to stop the scheduling mechanism
  const _stopScheduler = (resetSession = true) => {
    clearTimeout(schedulerTimeoutId);
    schedulerTimeoutId = null;
    isLoopingActive = false; // Mark as not looping

    if (resetSession) {
      sessionInitialStartTime = 0; // Reset for the next "first trigger"
      scheduledSubBeatCount = 0;   // Reset beat counter
      // onScheduleCallback = null; // Clear callback only on full reset if desired
    }
    // If !resetSession, sessionInitialStartTime and scheduledSubBeatCount are preserved.
    // scheduledSubBeatCount will be re-evaluated by _startScheduler on restart.
  };

  return {
    init: (_ctx, initialTempo, initialPitchIgnored) => {
      if (!(_ctx instanceof AudioContext)) throw Error('TimingManager: Invalid AudioContext');
      audioCtx = _ctx;
      internalTempo = +initialTempo > 0 ? +initialTempo : 78; // Use provided tempo
      internalMultiplier = 1; // Default multiplier
      _stopScheduler(true); // Ensure a clean state, reset session
    },

    startLoop: (callback) => {
      if (!audioCtx) {
        console.warn("TimingManager: AudioContext not initialized. Cannot start loop.");
        return false;
      }
      // If sessionInitialStartTime is 0, this call will set it.
      // If it's already set (e.g. changing params mid-loop), this call will use the existing one.
      return _startScheduler(callback);
    },

    stopLoop: () => {
      // This explicitly stops and RESETS the session's initial time.
      _stopScheduler(true);
      onScheduleCallback = null; // Clear callback on explicit full stop
    },

    setTempo: (bpm) => {
      bpm = +bpm;
      if (bpm <= 0 || Number.isNaN(bpm) || internalTempo === bpm) return;
      internalTempo = bpm;
      if (isLoopingActive) {
        // Tempo changed mid-loop. We need to recalculate scheduling.
        // Stop temporarily (without resetting sessionInitialStartTime) and restart.
        const callback = onScheduleCallback; // Preserve current callback
        _stopScheduler(false); // Pause, DON'T reset sessionInitialStartTime
        _startScheduler(callback); // Restart with new tempo, will use preserved sessionInitialStartTime
      }
    },

    setPitch: (rate) => { /* Pitch is not directly used for beat scheduling in this manager */ },

    setScheduleMultiplier: (multiplier) => {
      multiplier = parseInt(multiplier, 10);
      if (multiplier < 1 || Number.isNaN(multiplier) || internalMultiplier === multiplier) return;
      internalMultiplier = multiplier;
      if (isLoopingActive) {
        // Multiplier changed mid-loop. Similar to tempo change.
        const callback = onScheduleCallback;
        _stopScheduler(false); // Pause, DON'T reset sessionInitialStartTime
        _startScheduler(callback); // Restart with new multiplier, will use preserved sessionInitialStartTime
      }
    },

    getLoopingState: () => isLoopingActive,
    getCurrentTempo: () => internalTempo,
    // getCurrentPitch: () => pitch, // If timingManager were to store/manage pitch
    getCurrentScheduleMultiplier: () => internalMultiplier,

    // Crucial getter for the "initial time that playback is first triggered" for the current session.
    // Returns 0 if not currently in an active playback session (i.e., sessionInitialStartTime is not set).
    getSessionInitialStartTime: () => sessionInitialStartTime,
  };
})();
// --- END: Refactored timingManager ---

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

const _play = (buf, time, rate, loop = false) => {
  if (!buf || !audioContext) return null;
  try {
    const src = audioContext.createBufferSource();
    Object.assign(src, { buffer: buf, loop });
    src.playbackRate.value = rate; // Set initial rate
    src.connect(mainGainNode);
    triggerAnimation();
    src.start(time);
    return src;
  } catch (e) { showError('Failed to play.'); console.error(e); return null; }
};

const _reverse = buf => {
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

const _setupContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext not supported by this browser.');
  audioContext = new Ctx();
  mainGainNode = audioContext.createGain();
  mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
  mainGainNode.connect(audioContext.destination);
};

const _decodeAndPrepare = async base64 => {
  decodedBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);
  const freqText = document.getElementById('audio-meta-frequency')?.textContent || '';
  const freq = parseFloat(freqText);
  if (Number.isNaN(freq) || freq <= 0) {
    showError('Invalid or missing base frequency for audio. MIDI note playback may be inaccurate.');
    // Assign a default or handle error more gracefully if this is critical
    originalSampleFrequency = 440; // A fallback, though ideally this metadata is always correct
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

export async function init(base64, tempo = 78, pitch = 1) {
  [currentTempo, currentGlobalPitch, currentVolume, isReversed] = [tempo, pitch, 1, false];
  [audioContext, mainGainNode, decodedBuffer, reversedBuffer, currentLoopingSource] = Array(5).fill(null);
  midiNoteToPlaybackRate.clear();
  sampleType = 'one-shot';

  try {
    _setupContext();
    await _decodeAndPrepare(base64);
    // Pass currentTempo to timingManager, pitch isn't directly used by timingManager for scheduling
    timingManager.init(audioContext, currentTempo, currentGlobalPitch);
  } catch (e) {
    showError(`Audio Init Failed: ${e.message || e}`);
    console.error("Audio Init Failed:", e);
    return false;
  }
  return true;
}

export async function playOnce() {
  if (await _ensureContext()) {
    const buf = _selectBuffer();
    if (buf) _play(buf, audioContext.currentTime, currentGlobalPitch);
  }
}

export async function startLoop() {
  if (timingManager.getLoopingState() || !(await _ensureContext())) return;
  const buf = _selectBuffer();
  if (!buf) return;

  currentLoopingSource?.stop(); // Stop any existing long-playing sample if it's a 'loop' type
  currentLoopingSource = null;

  // Start the timingManager's loop. The callback will be invoked for each beat.
  const successfullyStarted = timingManager.startLoop(scheduledTime => {
    // This callback is executed by timingManager for each scheduled beat.
    // 'scheduledTime' is the precise AudioContext time for this beat.
    if (sampleType === 'one-shot') {
      _play(buf, scheduledTime, currentGlobalPitch); // Play one-shot at scheduled time
    }
    // If sampleType === 'loop', it's handled differently below (started once, aligned).
    // This callback could still be used for other beat-synced events even for 'loop' type.
  });

  if (!successfullyStarted) {
    showError('Failed to start timing loop.');
    return;
  }

  // For 'loop' sample type, we start it once, aligned to the *session's* start time,
  // and let it loop internally using the Web Audio API's loop property.
  // The timingManager still runs to keep track of beats for potential future interactions
  // or if we wanted to trigger other things (like UI) on those beats.
  if (sampleType === 'loop') {
    const sessionStartTime = timingManager.getSessionInitialStartTime();
    if (sessionStartTime > 0) { // Ensure session has actually started and time is valid
        // Play the sample with native looping, starting precisely at the session's calculated start time.
        currentLoopingSource = _play(buf, sessionStartTime, currentGlobalPitch, true);
        if (!currentLoopingSource) {
            showError('Native looping sample playback failed.');
            stopLoop(); // This will call timingManager.stopLoop() which resets the session
        }
    } else {
        // This should ideally not happen if timingManager.startLoop returned true,
        // as sessionInitialStartTime should have been set.
        showError("Could not get valid session start time for 'loop' sample type.");
        stopLoop();
    }
  }
}

export function stopLoop() {
  timingManager.stopLoop(); // This will now also reset sessionInitialStartTime in timingManager
  try {
    currentLoopingSource?.stop();
  } catch (e) { /* ignore errors on stopping non-existent source */ }
  currentLoopingSource = null;
}

export function setScheduleMultiplier(m) {
  const multiplier = Math.max(1, parseInt(m, 10));
  // Pass to timingManager, which now handles the live update logic internally
  timingManager.setScheduleMultiplier(multiplier);
}
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) {
  if (bpm > 0) {
    currentTempo = bpm; // Update local currentTempo if used elsewhere directly
    // Pass to timingManager, which now handles the live update logic internally
    timingManager.setTempo(bpm);
  }
}

export function toggleReverse() {
  if (!decodedBuffer || !reversedBuffer) return isReversed; // Buffers not ready

  const wasLooping = timingManager.getLoopingState();
  if (wasLooping) {
    stopLoop(); // Fully stop and reset timing session before changing buffer
  }

  isReversed = !isReversed;

  if (wasLooping) {
    // Important: Call startLoop asynchronously to ensure state changes (like isReversed)
    // are fully processed and audioContext might have settled if it was suspended.
    // Using a microtask or short timeout can help.
    Promise.resolve().then(() => startLoop());
  }
  return isReversed;
}

export function setGlobalPitch(r) {
  if (r > 0 && audioContext) {
    currentGlobalPitch = r;
    // timingManager.setPitch(r); // timingManager doesn't use pitch for scheduling beats
    if (currentLoopingSource) { // Apply to an actively playing looping source
      currentLoopingSource.playbackRate.setTargetAtTime(r, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
  }
}

export function setVolume(v) {
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

export async function playSampleAtRate(r, velIgnored) { // vel parameter was unused
  if (r > 0 && await _ensureContext()) {
    const buf = _selectBuffer();
    if (buf) _play(buf, audioContext.currentTime, r);
  }
}

// This now refers to the *initial* start time of the current playback session.
// Useful if other modules need to align to this master clock origin.
export const getSessionStartTime = () => timingManager.getSessionInitialStartTime();
export const getCurrentTempo = () => currentTempo; // Or timingManager.getCurrentTempo()
export const getCurrentPitch = () => currentGlobalPitch;