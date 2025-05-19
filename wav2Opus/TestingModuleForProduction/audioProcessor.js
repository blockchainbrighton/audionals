// --- audioProcessor.js ---
import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';
import { sValToP, pToSVal, PITCH_SLIDER_CONFIG } from './utils.js'; // Added import

const SMOOTH_PARAM_TIME = 0.01, A4_NOTE = 69, A4_FREQ = 440, SEMITONE = 2 ** (1 / 12), MIN_NOTE = 21, MAX_NOTE = 108;
let audioContext, mainGainNode, decodedBuffer, reversedBuffer, isReversed = false,
    currentTempo = 78, currentGlobalPitch = 1, currentVolume = 1, originalSampleFrequency,
    sampleType = 'one-shot', midiNoteToPlaybackRate = new Map(), currentLoopingSource;

// New constant for fade duration
const CROSSFADE_DURATION = 0.010; // 10 milliseconds, adjust as needed

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
        // Pass currentGlobalPitch to the callback, so it can decide not to play if rate is 0
        onScheduleCallback(scheduledTime, currentGlobalPitch);
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

const _play = (buf, time, rate, loop = false) => {
  if (!buf || !audioContext) return null;
  if (rate <= 0) return null;
  try {
    const src = audioContext.createBufferSource();
    Object.assign(src, { buffer: buf, loop });
    src.playbackRate.value = rate;
    src.connect(mainGainNode);
    triggerAnimation();
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

// `pitch` here is the initial s_val from the slider
export async function init(base64, tempo = 78, initial_s_val = PITCH_SLIDER_CONFIG.NEUTRAL_S) {
  [currentTempo, currentVolume, isReversed] = [tempo, 1, false];
  [audioContext, mainGainNode, decodedBuffer, reversedBuffer, currentLoopingSource] = Array(5).fill(null);
  midiNoteToPlaybackRate.clear();
  sampleType = 'one-shot';
  // Set initial pitch (currentGlobalPitch and isReversed) based on initial_s_val
  // No audio context yet, so can't use full setGlobalPitch. Just set internal state.
  const initial_P = sValToP(initial_s_val);
  currentGlobalPitch = Math.abs(initial_P / 100.0);
  isReversed = initial_P < 0;
  if (currentGlobalPitch === 0 && initial_P === 0) isReversed = false; // Convention for stop

  try {
    _setupContext();
    await _decodeAndPrepare(base64);
    timingManager.init(audioContext, currentTempo, currentGlobalPitch); // currentGlobalPitch here is just a placeholder
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
    if (buf && currentGlobalPitch > 0) { // Don't play if rate is 0
        _play(buf, audioContext.currentTime, currentGlobalPitch);
    }
  }
}

export async function startLoop() {
  if (timingManager.getLoopingState() || !(await _ensureContext())) return;
  
  if (currentGlobalPitch <= 0 && sampleType === 'loop') {
    console.log("StartLoop: Pitch is 0, native loop will not be started.");
  }

  const buf = _selectBuffer();
  if (!buf) {
    showError("Buffer not available for loop.");
    return;
  }

  // If there's an existing source, ensure it's properly stopped with a fade if needed
  // This is more for transitions FROM playing TO a new loop start.
  // The main click handling will be in setGlobalPitch when P crosses 0.
  if (currentLoopingSource) {
      try {
          // No explicit fade here as setGlobalPitch should handle it when it caused the stop
          currentLoopingSource.stop();
      } catch (e) { /* ignore */ }
      currentLoopingSource = null;
  }
  nextNativeLoopAnimationTime = 0;

  const scheduleCallback = (scheduledTime, effectiveRate) => {
    if (effectiveRate <= 0) return; 

    if (sampleType === 'one-shot') {
      _play(buf, scheduledTime, effectiveRate);
    } else if (sampleType === 'loop') {
      // ... (animation logic remains the same)
        if (decodedBuffer && nextNativeLoopAnimationTime > 0 && effectiveRate > 0) {
            const effectiveSampleDuration = decodedBuffer.duration / effectiveRate;
            if (effectiveSampleDuration <= NATIVE_LOOP_ANIMATION_EPSILON / 2) { return; }

            if (scheduledTime >= nextNativeLoopAnimationTime - NATIVE_LOOP_ANIMATION_EPSILON) {
            triggerAnimation();
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
    nextNativeLoopAnimationTime = 0;
    return;
  }

  if (sampleType === 'loop') {
    const sessionStartTime = timingManager.getSessionInitialStartTime();
    if (sessionStartTime > 0 && decodedBuffer && currentGlobalPitch > 0) {
      // Fade in the main gain if we are starting a native loop *from a stopped state*
      // This is tricky because mainGainNode is global.
      // The more precise fade should happen around the source itself.
      // For now, let's focus the fade in setGlobalPitch.
      mainGainNode.gain.setTargetAtTime(currentVolume, audioContext.currentTime, SMOOTH_PARAM_TIME); // Ensure volume is at target
      currentLoopingSource = _play(buf, sessionStartTime, currentGlobalPitch, true);
      if (currentLoopingSource) {
        const effectiveSampleDuration = decodedBuffer.duration / currentGlobalPitch;
        nextNativeLoopAnimationTime = (effectiveSampleDuration > 0) ? sessionStartTime + effectiveSampleDuration : 0;
      } else {
        nextNativeLoopAnimationTime = 0;
      }
    } else {
      nextNativeLoopAnimationTime = 0;
    }
  } else {
      nextNativeLoopAnimationTime = 0;
  }
}

export function stopLoop() {
  timingManager.stopLoop();
  if (currentLoopingSource) {
    // Fade out before stopping if it's a native loop being explicitly stopped.
    // This might also be handled by setGlobalPitch if P goes to 0.
    // To avoid double fades, this one can be very short or conditional.
    // Let's assume setGlobalPitch is the primary handler for P=0 transitions.
    // mainGainNode.gain.setTargetAtTime(0, audioContext.currentTime, CROSSFADE_DURATION / 2);
    // setTimeout(() => { // Allow fade to complete
        try { currentLoopingSource.stop(); } catch (e) { /* ignore */ }
        currentLoopingSource = null;
        // Restore gain if it was faded globally and we are not actually going to P=0
        // This gets complex. Better to have per-source gain or manage fades very carefully.
        // For now, let's assume setGlobalPitch manages P=0 fades.
        // mainGainNode.gain.setTargetAtTime(currentVolume, audioContext.currentTime + CROSSFADE_DURATION / 2, SMOOTH_PARAM_TIME);
    // }, CROSSFADE_DURATION * 1000 / 2);
  }
  currentLoopingSource = null; // Ensure it's cleared
  nextNativeLoopAnimationTime = 0;
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

export function toggleReverse() {
  if (!audioContext || !decodedBuffer || !reversedBuffer) return { s_val: pToSVal(PITCH_SLIDER_CONFIG.NEUTRAL_S), new_isReversed: isReversed };

  let P_current_val = isReversed ? -currentGlobalPitch * 100 : currentGlobalPitch * 100;
  if (currentGlobalPitch === 0) P_current_val = 0;
  P_current_val = Math.round(P_current_val);

  let P_new_target;
  if (P_current_val === 0) {
      P_new_target = isReversed ? 100 : -100; // If stopped, jump to 100% in new direction
  } else {
      P_new_target = -P_current_val;
  }

  const new_s_val = pToSVal(P_new_target);
  // setGlobalPitch will handle fades if P_new_target crosses 0 or starts from 0
  setGlobalPitch(new_s_val); 

  return { new_s_val: new_s_val, new_isReversed: isReversed };
}


export function setGlobalPitch(s_val) {
  if (!audioContext) return;

  const P = sValToP(s_val);
  const new_target_rate_abs = Math.abs(P / 100.0);
  const new_isReversed = (P < 0);

  const wasLooping = timingManager.getLoopingState();
  const old_isReversed = isReversed;
  const old_rate_abs = currentGlobalPitch;
  const old_P = Math.round((old_isReversed ? -old_rate_abs : old_rate_abs) * 100);

  const isStoppingToZero = new_target_rate_abs === 0 && old_rate_abs > 0; // e.g. 50 -> 0
  const isStartingFromZero = new_target_rate_abs > 0 && old_rate_abs === 0; // e.g. 0 -> 50
  const isCrossingThroughZero = (old_P > 0 && P < 0) || (old_P < 0 && P > 0); // e.g. 50 -> -50

  let needsFullStopAndRestartLogic = false;

  if (isStoppingToZero || isStartingFromZero || isCrossingThroughZero) {
      needsFullStopAndRestartLogic = true;
  }

  // Update core audio state *before* deciding on fades/restarts
  // This ensures any subsequent calls to startLoop use the new state
  const previous_isReversed_for_restart = isReversed; // Capture state before update for comparison in perform...
  const previous_rate_abs_for_restart = currentGlobalPitch;

  isReversed = new_isReversed;
  currentGlobalPitch = new_target_rate_abs;
  if (P === 0) isReversed = false; // Convention: if stopped, not reversed.


  if (needsFullStopAndRestartLogic) {
      const srcToStop = currentLoopingSource;
      currentLoopingSource = null; // Assume it will be stopped or replaced

      if (srcToStop) { // Only fade if there was something playing
          mainGainNode.gain.cancelScheduledValues(audioContext.currentTime);
          mainGainNode.gain.setTargetAtTime(0, audioContext.currentTime, CROSSFADE_DURATION);

          setTimeout(() => {
              try { srcToStop.stop(); } catch (e) { /* ignore */ }
              // Now, after stop, decide if we need to fade back in or stay at 0
              if (new_target_rate_abs > 0) { // We are starting/crossing to a playing state
                  mainGainNode.gain.setTargetAtTime(currentVolume, audioContext.currentTime, CROSSFADE_DURATION);
              } else { // We are stopping AT zero
                  mainGainNode.gain.setTargetAtTime(0, audioContext.currentTime, SMOOTH_PARAM_TIME); // Ensure it stays 0
              }
              // Proceed with loop logic after fade/stop sequence
              performLoopRestartOrRateUpdate(wasLooping, previous_isReversed_for_restart, previous_rate_abs_for_restart, isStartingFromZero || isCrossingThroughZero);
          }, CROSSFADE_DURATION * 1000 + 10); // Wait for fade + small buffer
      } else { // No source was playing (e.g., was already at P=0, now moving away or staying at P=0)
          if (new_target_rate_abs > 0) { // Starting from a true silent P=0
              mainGainNode.gain.cancelScheduledValues(audioContext.currentTime);
              mainGainNode.gain.setTargetAtTime(currentVolume, audioContext.currentTime, CROSSFADE_DURATION); // Fade in
          } else { // Moving from P=0 to P=0, or some other edge case with no source
              mainGainNode.gain.setTargetAtTime(0, audioContext.currentTime, SMOOTH_PARAM_TIME); // Ensure gain is 0
          }
          performLoopRestartOrRateUpdate(wasLooping, previous_isReversed_for_restart, previous_rate_abs_for_restart, isStartingFromZero || isCrossingThroughZero);
      }
  } else { // Not crossing/stopping/starting from zero; just a rate change on an existing playing source
      performLoopRestartOrRateUpdate(wasLooping, previous_isReversed_for_restart, previous_rate_abs_for_restart, false);
  }


  // Renamed for clarity, takes previous state for comparison
  function performLoopRestartOrRateUpdate(wasLoopingState, prev_isReversed, prev_rate_abs, isTransitionFromOrThroughZero) {
      const directionChanged = prev_isReversed !== isReversed; // Compare with updated module isReversed
      const rateChangedSignificantly = prev_rate_abs === 0 && currentGlobalPitch > 0; // Started from absolute zero

      let loopNeedsRestart = false;
      if (wasLoopingState) {
          if (directionChanged) {
              loopNeedsRestart = true;
          } else if (rateChangedSignificantly) { // Specifically from 0 to non-0
              loopNeedsRestart = true;
          }
          // If it's a cross-through-zero transition, directionChanged will be true.
      }


      if (new_target_rate_abs === 0) {
          // If we landed on zero, and a source was stopped via fade, gain is already 0.
          // If no source was playing, mainGainNode was set to 0 earlier.
          // No further action needed for audio playback itself.
          return;
      }

      // If we reach here, new_target_rate_abs > 0
      if (loopNeedsRestart) {
          // timingManager callback is internal to timingManager now, stopLoop/startLoop handle it.
          timingManager.stopLoop(); // stopLoop also clears currentLoopingSource
          
          // Delay slightly for audio context to settle, especially after fades.
          const delayForRestart = (isTransitionFromOrThroughZero || (srcToStop && needsFullStopAndRestartLogic)) ? (CROSSFADE_DURATION * 1000 + 25) : 15;

          setTimeout(() => {
              // startLoop will use the new (module-level) isReversed and currentGlobalPitch
              // and will create a new source if sampleType is 'loop'
              startLoop(); // Use the exported startLoop
          }, delayForRestart);

      } else if (currentLoopingSource) { // Native loop source exists, just update its rate
          currentLoopingSource.playbackRate.setTargetAtTime(new_target_rate_abs, audioContext.currentTime, SMOOTH_PARAM_TIME);
      } else if (wasLoopingState && sampleType === 'loop' && !currentLoopingSource && new_target_rate_abs > 0) {
          // This covers the case where a 'loop' type sample was stopped (P=0),
          // and now P > 0 again, but it wasn't a direction change from a playing state.
          // e.g. P was 0, slider moves to P=50. This should restart.
          // This can be considered a form of rateChangedSignificantly or handled by isStartingFromZero
          // The `loopNeedsRestart` should ideally cover this if `prev_rate_abs === 0`.
          // For safety, let's ensure startLoop is called.
          timingManager.stopLoop(); // Ensure clean state
          const delayForRestart = (isTransitionFromOrThroughZero) ? (CROSSFADE_DURATION * 1000 + 25) : 15;
          setTimeout(() => {
              startLoop();
          }, delayForRestart);
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
export const getReverseState = () => isReversed; // Directly use the module's isReversed
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext = _ensureContext;
export const getPlaybackRateForNote = n => {
    if (currentGlobalPitch === 0) return 0; // If global pitch is zero, MIDI notes also play at zero rate (i.e. don't play)
    return midiNoteToPlaybackRate.get(n) * currentGlobalPitch; // Apply global pitch scaling
};


export async function playSampleAtRate(r, velIgnored) {
  if (r === 0) return; // Don't play if effective rate is 0
  if (await _ensureContext()) {
    // Note: 'r' here is already scaled by global pitch from getPlaybackRateForNote
    // So, _selectBuffer will use 'isReversed' state, and 'r' should be absolute.
    const buf = _selectBuffer();
    if (buf) _play(buf, audioContext.currentTime, Math.abs(r));
  }
}

export const getSessionStartTime = () => timingManager.getSessionInitialStartTime();
export const getCurrentTempo = () => currentTempo;
export const getCurrentPitch = () => currentGlobalPitch; // Returns absolute rate
export const getCurrentPitchPercent = () => sValToP(pToSVal(Math.round((isReversed ? -currentGlobalPitch : currentGlobalPitch) * 100)));


// --- END OF FILE audioProcessor.js ---