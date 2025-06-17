/***********************************************************************
 * playbackEngine.js – Minimized/Modernized, Fully Compatible (2025)
 * With Continuous Playback Mode & Global Active Audio Tracking
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';
import SequenceManager from './sequenceManager.js';

// --- Module-level Variables ---
export let playStartTime = 0;
let nextStepTime = 0;
let _currentSchedulerStep = 0;
let rafId = null;
let lastSchedulerTime = 0;

let lookAhead = 0.1;
let scheduleAheadTime = 0.2;
let schedulerPerformanceHistory = [];
const MIN_LOOK_AHEAD = 0.05, MAX_LOOK_AHEAD = 0.5, LOOK_AHEAD_ADJ = 0.01;
const PERF_LEN = 10, INC_THRESH = 0.5, DEC_THRESH = 0.1;

const patternLength = 64;

let scheduledSourcesCleanupInfo = []; // Renamed from scheduledSourcesInfo for clarity (holds nodes for cleanup)
let absoluteStep = 0;
let barCount = 0;
let barScheduledTimes = [];
let barActualTimes = [];
let expectedSchedulerNextCallPerfTime = 0;

/**
 * @typedef {Object} GlobalActiveAudioInfo
 * @property {string} id - Unique identifier for this sound instance.
 * @property {number} channelIndex - The channel index this sound belongs to.
 * @property {number} audioContextStartTime - The AudioContext time this sound was scheduled to start.
 * @property {number} audioContextDuration - The calculated audible duration of this sound in AudioContext time.
 * @property {AudioBuffer} sampleBufferIdentity - Reference to the actual AudioBuffer object playing.
 * @property {number} sampleOriginalDuration - Duration of the original, untrimmed, unpitched buffer.
 * @property {number} sampleTrimStartRatio - Trim start ratio (0-1) used for this instance.
 * @property {number} sampleTrimEndRatio - Trim end ratio (0-1) used for this instance.
 * @property {boolean} isReversed - If this instance is playing reversed.
 * @property {number} pitch - Pitch shift in semitones for this instance.
 * @property {number} instanceFadeInTime - Fade-in time applied to this specific instance.
 * @property {number} instanceFadeOutTime - Fade-out time applied to this specific instance.
 */

/** @type {GlobalActiveAudioInfo[]} */
export let globalActiveAudio = []; // Exported for ui.js to read

// --- Helper Functions ---
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
export const clamp = (x, mn, mx) => Math.max(mn, Math.min(mx, x));

function adjustLookAhead() {
  if (schedulerPerformanceHistory.length < PERF_LEN) return;
  const avgExec = avg(schedulerPerformanceHistory);
  const maxExec = Math.max(...schedulerPerformanceHistory);
  const lookAheadMs = lookAhead * 1000;

  if (maxExec > lookAheadMs * INC_THRESH) {
    lookAhead = clamp(lookAhead + LOOK_AHEAD_ADJ, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD);
  } else if (avgExec < lookAheadMs * DEC_THRESH && lookAhead > MIN_LOOK_AHEAD) {
    lookAhead = clamp(lookAhead - LOOK_AHEAD_ADJ, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD);
  }
  scheduleAheadTime = Math.max(lookAhead * 2, 0.1);
  schedulerPerformanceHistory = [];
}

const getCurrentDisplayStep = (contextTime, bpm, currentPlayStartTime) => {
  if (!currentPlayStartTime || currentPlayStartTime > contextTime) return 0;
  const secondsPerStep = (60 / bpm) / 4;
  const elapsedSteps = Math.floor((contextTime - currentPlayStartTime) / secondsPerStep);
  return elapsedSteps % patternLength;
};

function printBarTimingSummary(barNum, schTimes, actTimes) {
  console.groupCollapsed(`⏱️ Step timing for Bar ${barNum + 1}`);
  let totalDrift = 0;
  let validStepsCount = 0;
  for (let i = 0; i < 16; ++i) {
    const scheduledTime = schTimes[i];
    const actualInfo = actTimes[i];
    let msg = `Step ${i + 1}`.padEnd(7) + `| Scheduled Start: ${scheduledTime != null ? scheduledTime.toFixed(5) : 'N/A'} s`.padEnd(30);
    if (actualInfo && scheduledTime != null) {
      msg += `| Actual End: ${actualInfo.actualEndTime.toFixed(5)} s`.padEnd(27)
        + `| Audible Duration (Sched): ${actualInfo.audibleDurationWhenScheduled.toFixed(5)} s`.padEnd(36)
        + `| Expected End: ${(scheduledTime + actualInfo.audibleDurationWhenScheduled).toFixed(5)} s`.padEnd(27);
      const endDrift = actualInfo.actualEndTime - (scheduledTime + actualInfo.audibleDurationWhenScheduled);
      msg += `| End Drift: ${endDrift.toFixed(5)} s`;
      totalDrift += Math.abs(endDrift);
      validStepsCount++;
    } else {
      msg += '| Actual End: (pending or N/A)'.padEnd(27) + '| Audible Duration (Sched): ---'.padEnd(36) + '| Expected End: ---'.padEnd(27) + '| End Drift: ---';
    }
    console.log(msg);
  }
  console.log(validStepsCount ? `Avg End Drift: ${(totalDrift / validStepsCount).toFixed(6)} s` : 'No valid steps for drift calc.');
  console.groupEnd();
}

function scheduleStep(stepIndexInSequence, time, stepOfBarForDiagnostics) {
  const currentState = State.get();
  currentState.channels.forEach((channel, channelIndex) => {
    if (!channelGainNodes[channelIndex]) return;

    const bufferIdentityForScheduling = channel.reverse ? channel.reversedBuffer : channel.buffer;
    if (!bufferIdentityForScheduling || !channel.steps[stepIndexInSequence]) return;

    const source = ctx.createBufferSource();
    source.buffer = bufferIdentityForScheduling;
    const currentPitch = channel.pitch || 0;
    source.playbackRate.value = 2 ** (currentPitch / 12);

    // Use channel.buffer (original, non-reversed) for duration and trim calculations
    // This is important because reversedBuffer might have a slightly different internal representation
    // if any processing was done, or simply to keep logic consistent.
    // However, if channel.buffer is null but reversedBuffer exists (e.g. only reversed is loaded), use reversedBuffer's duration.
    const referenceBufferForDuration = channel.buffer || bufferIdentityForScheduling;
    if (!referenceBufferForDuration) {
        console.warn(`[PlaybackEngine] Channel ${channelIndex} has no valid reference buffer for duration calculation.`);
        return;
    }

    const bufferOriginalDuration = referenceBufferForDuration.duration;
    const trimStart = channel.trimStart ?? 0;
    const trimEnd = channel.trimEnd ?? 1;
    const isReversed = channel.reverse;

    const offsetInFullBuffer = isReversed ? bufferOriginalDuration * (1 - trimEnd) : bufferOriginalDuration * trimStart;
    const durationInFullBuffer = bufferOriginalDuration * (trimEnd - trimStart);
    const audibleDuration = Math.max(0.001, durationInFullBuffer) / source.playbackRate.value;

    let currentNode = source;
    const cleanupNodesList = [source];

    // --- Apply Effects ---
    if (channel.hpfCutoff > 20) {
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(channel.hpfCutoff, time); hpf.Q.setValueAtTime(channel.hpfQ || 0.707, time);
      currentNode.connect(hpf); currentNode = hpf; cleanupNodesList.push(hpf);
    }
    if (channel.lpfCutoff < 20000) {
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(channel.lpfCutoff, time); lpf.Q.setValueAtTime(channel.lpfQ || 0.707, time);
      currentNode.connect(lpf); currentNode = lpf; cleanupNodesList.push(lpf);
    }
    [
      { gain: channel.eqLowGain, def: EQ_BANDS_DEFS.LOW },
      { gain: channel.eqMidGain, def: EQ_BANDS_DEFS.MID },
      { gain: channel.eqHighGain, def: EQ_BANDS_DEFS.HIGH }
    ].forEach(({ gain, def }) => {
      if (gain && def) {
        const eq = ctx.createBiquadFilter(); eq.type = def.type;
        eq.frequency.setValueAtTime(def.frequency, time); eq.gain.setValueAtTime(gain, time);
        if (def.Q) eq.Q.setValueAtTime(def.Q, time);
        currentNode.connect(eq); currentNode = eq; cleanupNodesList.push(eq);
      }
    });

    const fadeGainNode = ctx.createGain();
    cleanupNodesList.push(fadeGainNode);
    const maxFadePossible = audibleDuration / 2;
    const instanceFadeIn = Math.min(channel.fadeInTime || 0, maxFadePossible);
    const instanceFadeOut = Math.min(channel.fadeOutTime || 0, maxFadePossible);

    if (instanceFadeIn > 0) {
      fadeGainNode.gain.setValueAtTime(0, time);
      fadeGainNode.gain.linearRampToValueAtTime(1, time + instanceFadeIn);
    } else {
      fadeGainNode.gain.setValueAtTime(1, time);
    }
    if (instanceFadeOut > 0) {
      const fadeOutStartTime = time + audibleDuration - instanceFadeOut;
      if (fadeOutStartTime > time + instanceFadeIn && fadeOutStartTime > time) {
        fadeGainNode.gain.setValueAtTime(1, fadeOutStartTime);
        fadeGainNode.gain.linearRampToValueAtTime(0, time + audibleDuration);
      } else {
        fadeGainNode.gain.linearRampToValueAtTime(0, time + audibleDuration);
      }
    }
    currentNode.connect(fadeGainNode);
    fadeGainNode.connect(channelGainNodes[channelIndex]);
    source.start(time, offsetInFullBuffer, durationInFullBuffer);

    // Update channel state for UI (for notes originating in *this* sequence)
    // This helps the UI quickly show a playhead for newly triggered notes.
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: time,
      activePlaybackDuration: audibleDuration,
      activePlaybackTrimStart: trimStart,
      activePlaybackTrimEnd: trimEnd,
      activePlaybackReversed: isReversed
    });

    const uniqueId = `gaa_${channelIndex}_${time.toFixed(5)}_${Math.random().toString(36).slice(2, 7)}`;
    const globalSoundInfo = {
        id: uniqueId,
        channelIndex: channelIndex,
        audioContextStartTime: time,
        audioContextDuration: audibleDuration,
        sampleBufferIdentity: bufferIdentityForScheduling,
        sampleOriginalDuration: bufferOriginalDuration,
        sampleTrimStartRatio: trimStart,
        sampleTrimEndRatio: trimEnd,
        isReversed: isReversed,
        pitch: currentPitch,
        instanceFadeInTime: instanceFadeIn,
        instanceFadeOutTime: instanceFadeOut,
    };
    globalActiveAudio.push(globalSoundInfo);
    scheduledSourcesCleanupInfo.push({ id: uniqueId, nodes: cleanupNodesList, scheduledEventTime: time, channelIndex: channelIndex });

    source.onended = () => {
      if (channelIndex === 0 && barActualTimes[stepOfBarForDiagnostics] == null) {
        barActualTimes[stepOfBarForDiagnostics] = {
          actualEndTime: ctx.currentTime, audibleDurationWhenScheduled: audibleDuration,
          originalBufferDuration: bufferOriginalDuration
        };
      }

      globalActiveAudio = globalActiveAudio.filter(s => s.id !== uniqueId);
      scheduledSourcesCleanupInfo = scheduledSourcesCleanupInfo.filter(info => info.id !== uniqueId);
      cleanupNodesList.forEach(node => { try { node.disconnect(); } catch (e) { /* ignore */ } });

      const chState = State.get().channels[channelIndex];
      // If the State's activePlayback info matches this ended sound,
      // and no other global sound is now primary for this channel, clear it.
      if (chState?.activePlaybackScheduledTime === time) {
        const isAnotherSoundActiveForChannel = globalActiveAudio.some(s => s.channelIndex === channelIndex);
        if (!isAnotherSoundActiveForChannel) {
            State.updateChannel(channelIndex, {
                activePlaybackScheduledTime: null, activePlaybackDuration: null,
                activePlaybackTrimStart: null, activePlaybackTrimEnd: null, activePlaybackReversed: null
            });
        }
      }
    };
  });
}

function scheduler(timestamp = performance.now()) {
  const schedulerEntryTime = performance.now();
  const currentState = State.get();
  const secondsPer16th = (60 / currentState.bpm) / 4;
  const audioContextCurrentTime = ctx.currentTime;

  if (expectedSchedulerNextCallPerfTime) {
    const delay = schedulerEntryTime - expectedSchedulerNextCallPerfTime;
    if (Math.abs(delay) > 1) { /* Optional: log scheduler delay */ }
  }

  let stepsScheduledThisTick = 0;
  const schedulingLoopStart = performance.now();

  while (nextStepTime < audioContextCurrentTime + lookAhead) {
    const stepOfBarForDiagnostics = absoluteStep % 16;
    if (barScheduledTimes.length === 0 && stepOfBarForDiagnostics !== 0) {
      for (let i = 0; i < stepOfBarForDiagnostics; i++) barScheduledTimes[i] = null;
    }
    barScheduledTimes[stepOfBarForDiagnostics] = nextStepTime;

    scheduleStep(_currentSchedulerStep, nextStepTime, stepOfBarForDiagnostics);
    stepsScheduledThisTick++;
    nextStepTime += secondsPer16th;
    _currentSchedulerStep++;

    if (_currentSchedulerStep >= patternLength) {
      if (currentState.playbackMode === 'continuous' && SequenceManager.sequenceCount > 1) {
        const currentManagerIndex = SequenceManager.currentIndex;
        const nextManagerIndex = (currentManagerIndex + 1) % SequenceManager.sequenceCount;
        const switchPromise = SequenceManager.switchToSequence(nextManagerIndex);
        if (SequenceManager.currentIndex === nextManagerIndex) {
          _currentSchedulerStep = 0;
        } else {
          _currentSchedulerStep = 0; // Loop current if switch failed
        }
        switchPromise.catch(err => console.error(`[PlaybackEngine] Error during async part of continuous sequence switch:`, err));
      } else {
        _currentSchedulerStep = 0; // Loop current sequence
      }
    }
    absoluteStep++;
    if (stepOfBarForDiagnostics === 15) {
      const scheduled = [...barScheduledTimes], actual = [...barActualTimes], barNum = barCount;
      setTimeout(() => printBarTimingSummary(barNum, scheduled, actual), 750);
      barCount++; barScheduledTimes = []; barActualTimes = [];
    }
  }

  const schedulingLoopDuration = performance.now() - schedulingLoopStart;
  const displayStep = getCurrentDisplayStep(audioContextCurrentTime, currentState.bpm, playStartTime);
  const stateUpdateStart = performance.now();
  State.update({ currentStep: displayStep });
  const stateUpdateDuration = performance.now() - stateUpdateStart;

  const schedulerExecutionTime = performance.now() - schedulerEntryTime;
  schedulerPerformanceHistory.push(schedulerExecutionTime);
  if (schedulerPerformanceHistory.length >= PERF_LEN) adjustLookAhead();

  if (rafId !== null) {
    rafId = requestAnimationFrame(scheduler);
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    lastSchedulerTime = timestamp;
  }

  if (schedulerExecutionTime > 7) { // Increased threshold slightly
    console.warn(`[PlaybackEngine] Scheduler exec: ${schedulerExecutionTime.toFixed(2)} ms. (Loop: ${schedulingLoopDuration.toFixed(2)} ms for ${stepsScheduledThisTick} steps; StateUpdate: ${stateUpdateDuration.toFixed(2)} ms)`);
  }
}

export function stop() {
  if (rafId === null) return;
  console.log('[PlaybackEngine] STOP at AudioContext time:', ctx.currentTime.toFixed(5));
  cancelAnimationFrame(rafId);
  rafId = null;
  expectedSchedulerNextCallPerfTime = 0;

  scheduledSourcesCleanupInfo.forEach(info => {
    info.nodes.forEach(node => {
      if (node instanceof AudioBufferSourceNode) {
        try { node.stop(0); } catch (e) { /* ignore */ }
      }
      try { node.disconnect(); } catch (e) { /* ignore */ }
    });
  });
  scheduledSourcesCleanupInfo = [];
  globalActiveAudio = []; // Clear global tracking

  playStartTime = 0;
  absoluteStep = 0;
  barCount = 0;
  barScheduledTimes = []; barActualTimes = [];

  State.update({ playing: false, currentStep: 0 });
  State.get().channels.forEach((_, idx) => State.updateChannel(idx, {
    activePlaybackScheduledTime: null, activePlaybackDuration: null,
    activePlaybackTrimStart: null, activePlaybackTrimEnd: null, activePlaybackReversed: null
  }));
}

export function start() {
  if (rafId !== null) return;
  ctx.resume().then(() => {
    const audioContextCurrentTime = ctx.currentTime;
    const initialDelay = 0.1;
    playStartTime = audioContextCurrentTime + initialDelay;
    nextStepTime = playStartTime;
    _currentSchedulerStep = State.get().currentStep || 0;
    absoluteStep = _currentSchedulerStep;
    barCount = 0; barScheduledTimes = []; barActualTimes = [];
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);

    console.log(`[PlaybackEngine] START. playStartTime: ${playStartTime.toFixed(5)}, initial _currentSchedulerStep: ${_currentSchedulerStep}, at AudioContext time: ${audioContextCurrentTime.toFixed(5)}`);
    State.update({ playing: true });
    lastSchedulerTime = performance.now();
    rafId = requestAnimationFrame(scheduler);
  });
}
