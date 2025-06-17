
/***********************************************************************
 * playbackEngine.js – Minimized/Modernized, Fully Compatible (2025)
 * With Continuous Playback Mode
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';
import SequenceManager from './sequenceManager.js'; // Import SequenceManager

// --- Module-level Variables ---
export let playStartTime = 0; // Time when playback started (AudioContext time)
let nextStepTime = 0;         // Scheduled time for the next 16th note
let _currentSchedulerStep = 0;// Current step (0-63) being scheduled within the active sequence
let rafId = null;             // requestAnimationFrame ID for the scheduler loop
let lastSchedulerTime = 0;    // Performance.now() timestamp of the last scheduler call

// Look-ahead and performance adjustment
let lookAhead = 0.1;          // How far ahead (in seconds) to schedule audio events
let scheduleAheadTime = 0.2;  // How often (in seconds) the scheduler ideally runs
let schedulerPerformanceHistory = [];
const MIN_LOOK_AHEAD = 0.05, MAX_LOOK_AHEAD = 0.5, LOOK_AHEAD_ADJ = 0.01;
const PERF_LEN = 10, INC_THRESH = 0.5, DEC_THRESH = 0.1;

const patternLength = 64;     // Number of steps per sequence

// Tracking for scheduled audio and timing diagnostics
let scheduledSourcesInfo = [];  // Info about currently scheduled/playing AudioBufferSourceNodes
let absoluteStep = 0;         // Global step counter since playback started (increments per 16th note)
let barCount = 0;             // Counter for bars for timing summary
let barScheduledTimes = [];   // Scheduled times for steps within the current bar (for diagnostics)
let barActualTimes = [];      // Actual end times for steps within the current bar (for diagnostics)
let expectedSchedulerNextCallPerfTime = 0; // Expected performance.now() for next scheduler call

// --- Helper Functions ---
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const clamp = (x, mn, mx) => Math.max(mn, Math.min(mx, x));

/**
 * Adjusts the lookAhead time based on scheduler performance.
 */
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
  scheduleAheadTime = Math.max(lookAhead * 2, 0.1); // Ensure scheduleAheadTime is reasonable
  schedulerPerformanceHistory = []; // Reset history after adjustment
}

/**
 * Calculates the current display step (0-63) based on elapsed time since playStart.
 * This is relative to the start of the current *logical* sequence's playback.
 * If playStartTime is far in the past due to continuous play, this still correctly
 * calculates the step within a 64-step pattern based on total elapsed 16ths.
 */
const getCurrentDisplayStep = (contextTime, bpm, currentPlayStartTime) => {
  if (!currentPlayStartTime || currentPlayStartTime > contextTime) return 0;
  const secondsPerStep = (60 / bpm) / 4; // Duration of one 16th note
  const elapsedSteps = Math.floor((contextTime - currentPlayStartTime) / secondsPerStep);
  return elapsedSteps % patternLength;
};


/**
 * Prints a summary of step timing for a completed bar (diagnostics).
 */
function printBarTimingSummary(barNum, schTimes, actTimes) {
  console.groupCollapsed(`⏱️ Step timing for Bar ${barNum + 1}`);
  let totalDrift = 0;
  let validStepsCount = 0;
  for (let i = 0; i < 16; ++i) { // Assuming 16 steps per bar for this summary
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

/**
 * Schedules a single step for all active channels.
 * @param {number} stepIndexInSequence - The step index (0-63) within the current sequence.
 * @param {number} time - The AudioContext time at which to schedule the step.
 * @param {number} stepOfBarForDiagnostics - The step index (0-15) within the current bar for logging.
 */
function scheduleStep(stepIndexInSequence, time, stepOfBarForDiagnostics) {
  const currentState = State.get(); // Get the latest state, including channel data
  currentState.channels.forEach((channel, channelIndex) => {
    if (!channelGainNodes[channelIndex]) return; // Ensure gain node exists

    const bufferToPlay = channel.reverse ? channel.reversedBuffer : channel.buffer;
    if (!bufferToPlay || !channel.steps[stepIndexInSequence]) return; // No buffer or step not active

    const source = ctx.createBufferSource();
    source.buffer = bufferToPlay;
    source.playbackRate.value = 2 ** ((channel.pitch || 0) / 12);

    const bufferDuration = channel.buffer.duration; // Use original buffer duration for trims
    const trimStart = channel.trimStart ?? 0;
    const trimEnd = channel.trimEnd ?? 1;

    const offsetInFullBuffer = channel.reverse ? bufferDuration * (1 - trimEnd) : bufferDuration * trimStart;
    const durationInFullBuffer = bufferDuration * (trimEnd - trimStart);
    const audibleDuration = Math.max(0.001, durationInFullBuffer) / source.playbackRate.value;

    let currentNode = source;
    const cleanupNodes = [source]; // Nodes to disconnect on 'ended'

    // --- Apply Effects ---
    // HPF
    if (channel.hpfCutoff > 20) {
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(channel.hpfCutoff, time);
      hpf.Q.setValueAtTime(channel.hpfQ || 0.707, time);
      currentNode.connect(hpf); currentNode = hpf; cleanupNodes.push(hpf);
    }
    // LPF
    if (channel.lpfCutoff < 20000) {
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(channel.lpfCutoff, time);
      lpf.Q.setValueAtTime(channel.lpfQ || 0.707, time);
      currentNode.connect(lpf); currentNode = lpf; cleanupNodes.push(lpf);
    }
    // EQ Bands
    [
      { gain: channel.eqLowGain, def: EQ_BANDS_DEFS.LOW },
      { gain: channel.eqMidGain, def: EQ_BANDS_DEFS.MID },
      { gain: channel.eqHighGain, def: EQ_BANDS_DEFS.HIGH }
    ].forEach(({ gain, def }) => {
      if (gain && def) {
        const eq = ctx.createBiquadFilter();
        eq.type = def.type;
        eq.frequency.setValueAtTime(def.frequency, time);
        eq.gain.setValueAtTime(gain, time);
        if (def.Q) eq.Q.setValueAtTime(def.Q, time);
        currentNode.connect(eq); currentNode = eq; cleanupNodes.push(eq);
      }
    });

    // Gain Node for Fades
    const fadeGainNode = ctx.createGain();
    cleanupNodes.push(fadeGainNode);

    const maxFadeTime = audibleDuration / 2;
    const fadeInDuration = Math.min(channel.fadeInTime || 0, maxFadeTime);
    const fadeOutDuration = Math.min(channel.fadeOutTime || 0, maxFadeTime);

    if (fadeInDuration > 0) {
      fadeGainNode.gain.setValueAtTime(0, time);
      fadeGainNode.gain.linearRampToValueAtTime(1, time + fadeInDuration);
    } else {
      fadeGainNode.gain.setValueAtTime(1, time);
    }

    if (fadeOutDuration > 0) {
      const fadeOutStartTime = time + audibleDuration - fadeOutDuration;
      if (fadeOutStartTime > time + fadeInDuration && fadeOutStartTime > time) { // Ensure fadeOut doesn't overlap fadeIn or start before note
        fadeGainNode.gain.setValueAtTime(1, fadeOutStartTime); // Hold gain at 1 until fadeOut
        fadeGainNode.gain.linearRampToValueAtTime(0, time + audibleDuration);
      } else { // Fade out from the beginning if durations are too short
        fadeGainNode.gain.linearRampToValueAtTime(0, time + audibleDuration);
      }
    }

    currentNode.connect(fadeGainNode);
    fadeGainNode.connect(channelGainNodes[channelIndex]); // Connect to main channel gain

    // Start playback
    source.start(time, offsetInFullBuffer, durationInFullBuffer);

    // Update channel state for UI (waveform playhead)
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: time,
      activePlaybackDuration: audibleDuration,
      activePlaybackTrimStart: trimStart,
      activePlaybackTrimEnd: trimEnd,
      activePlaybackReversed: channel.reverse
    });

    // Store info for cleanup and diagnostics
    scheduledSourcesInfo.push({ nodes: cleanupNodes, scheduledEventTime: time, channelIndex: channelIndex });

    source.onended = () => {
      // Diagnostics for the first channel (timing bar)
      if (channelIndex === 0 && barActualTimes[stepOfBarForDiagnostics] == null) {
        barActualTimes[stepOfBarForDiagnostics] = {
          actualEndTime: ctx.currentTime,
          audibleDurationWhenScheduled: audibleDuration,
          originalBufferDuration: channel.buffer.duration
        };
      }

      // Cleanup
      scheduledSourcesInfo = scheduledSourcesInfo.filter(info => info.nodes !== cleanupNodes);
      cleanupNodes.forEach(node => { try { node.disconnect(); } catch (e) { /* ignore */ } });

      // Clear active playback info if this was the last source for this scheduled event
      const chState = State.get().channels[channelIndex];
      if (chState?.activePlaybackScheduledTime === time &&
          !scheduledSourcesInfo.some(info => info.channelIndex === channelIndex && info.scheduledEventTime === time)) {
        State.updateChannel(channelIndex, {
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackReversed: null // Reset this as well
        });
      }
    };
  });
}

/**
 * Main scheduler loop, driven by requestAnimationFrame.
 */
function scheduler(timestamp = performance.now()) {
  const schedulerEntryTime = performance.now();
  const currentState = State.get();
  const secondsPer16th = (60 / currentState.bpm) / 4;
  const audioContextCurrentTime = ctx.currentTime;

  // --- Scheduler timing diagnostics ---
  if (expectedSchedulerNextCallPerfTime) {
    const delay = schedulerEntryTime - expectedSchedulerNextCallPerfTime;
    if (Math.abs(delay) > 1) { /* Optional: log significant scheduler delay */ }
  }

  let stepsScheduledThisTick = 0;
  const schedulingLoopStart = performance.now();

  // --- Main Scheduling Loop ---
  while (nextStepTime < audioContextCurrentTime + lookAhead) {
    const stepOfBarForDiagnostics = absoluteStep % 16; // For timing summary, 0-15

    // Record scheduled time for diagnostics
    if (barScheduledTimes.length === 0 && stepOfBarForDiagnostics !== 0) {
      for (let i = 0; i < stepOfBarForDiagnostics; i++) barScheduledTimes[i] = null;
    }
    barScheduledTimes[stepOfBarForDiagnostics] = nextStepTime;

    // Schedule the audio for the current step in the sequence
    scheduleStep(_currentSchedulerStep, nextStepTime, stepOfBarForDiagnostics);

    stepsScheduledThisTick++;
    nextStepTime += secondsPer16th; // Advance time for the next 16th note

    // --- Advance Step and Handle Sequence Transitions ---
    _currentSchedulerStep++; // Increment step within the current sequence

    if (_currentSchedulerStep >= patternLength) { // Reached the end of the current sequence
      if (currentState.playbackMode === 'continuous' && SequenceManager.sequenceCount > 1) {
        // Continuous mode: Try to switch to the next sequence
        const currentManagerIndex = SequenceManager.currentIndex;
        const nextManagerIndex = (currentManagerIndex + 1) % SequenceManager.sequenceCount;
        
        // SequenceManager.switchToSequence updates State synchronously for sequence data
        // and starts async buffer rehydration.
        const switchPromise = SequenceManager.switchToSequence(nextManagerIndex);
        
        // Verify if the synchronous part of the switch (State update) was successful
        if (SequenceManager.currentIndex === nextManagerIndex) {
          _currentSchedulerStep = 0; // Reset step for the new sequence
          // console.log(`[PlaybackEngine] Continuous: Switched to seq ${nextManagerIndex}. Step reset.`);
        } else {
          // Switch was blocked or failed synchronously, loop current sequence
          _currentSchedulerStep = 0; // or _currentSchedulerStep %= patternLength;
          // console.warn(`[PlaybackEngine] Continuous: Switch to seq ${nextManagerIndex} failed. Looping current.`);
        }
        switchPromise.catch(err => {
          console.error(`[PlaybackEngine] Error during async part of continuous sequence switch:`, err);
        });

      } else {
        // Single mode, or only one sequence exists: Loop current sequence
        _currentSchedulerStep = 0; // or _currentSchedulerStep %= patternLength;
      }
    }
    // No "else" needed for _currentSchedulerStep %= patternLength here, as it's handled above or naturally falls through.

    absoluteStep++; // Increment global step counter

    // --- Bar Timing Summary ---
    if (stepOfBarForDiagnostics === 15) { // End of a 16-step bar for diagnostics
      const scheduled = [...barScheduledTimes];
      const actual = [...barActualTimes];
      const barNum = barCount;
      // Use setTimeout to avoid blocking scheduler with console logs
      setTimeout(() => printBarTimingSummary(barNum, scheduled, actual), 750);
      barCount++;
      barScheduledTimes = [];
      barActualTimes = [];
    }
  }

  // --- Post-Loop Updates and Performance ---
  const schedulingLoopDuration = performance.now() - schedulingLoopStart;
  
  // Update currentStep in global State for UI
  const displayStep = getCurrentDisplayStep(audioContextCurrentTime, currentState.bpm, playStartTime);
  const stateUpdateStart = performance.now();
  State.update({ currentStep: displayStep });
  const stateUpdateDuration = performance.now() - stateUpdateStart;

  // Scheduler performance tracking
  const schedulerExecutionTime = performance.now() - schedulerEntryTime;
  schedulerPerformanceHistory.push(schedulerExecutionTime);
  if (schedulerPerformanceHistory.length >= PERF_LEN) {
    adjustLookAhead();
  }

  // --- Schedule Next Invocation ---
  if (rafId !== null) { // If still playing
    rafId = requestAnimationFrame(scheduler);
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    lastSchedulerTime = timestamp;
  }

  // Log if scheduler is taking too long
  if (schedulerExecutionTime > 5) { // Threshold for "too long" (e.g., 5ms)
    console.warn(`[PlaybackEngine] Scheduler exec: ${schedulerExecutionTime.toFixed(2)} ms. (Loop: ${schedulingLoopDuration.toFixed(2)} ms for ${stepsScheduledThisTick} steps; StateUpdate: ${stateUpdateDuration.toFixed(2)} ms)`);
  }
}

/**
 * Stops playback and cleans up.
 */
export function stop() {
  if (rafId === null) return; // Already stopped

  console.log('[PlaybackEngine] STOP at AudioContext time:', ctx.currentTime.toFixed(5));
  cancelAnimationFrame(rafId);
  rafId = null;
  expectedSchedulerNextCallPerfTime = 0;

  // Stop and disconnect all scheduled audio sources
  scheduledSourcesInfo.forEach(info => {
    info.nodes.forEach(node => {
      if (node instanceof AudioBufferSourceNode) {
        try { node.stop(0); } catch (e) { /* ignore if already stopped */ }
      }
      try { node.disconnect(); } catch (e) { /* ignore */ }
    });
  });
  scheduledSourcesInfo = [];

  // Reset playback variables
  playStartTime = 0;
  // _currentSchedulerStep is not reset to 0 here. It retains its value,
  // so if play is pressed again, it can potentially resume from that step.
  // The UI's currentStep will be set to 0.
  // This means start() should initialize _currentSchedulerStep from State.get().currentStep.
  absoluteStep = 0;
  barCount = 0;
  barScheduledTimes = [];
  barActualTimes = [];

  State.update({ playing: false, currentStep: 0 }); // Update global state
  // Clear active playback indicators for all channels
  State.get().channels.forEach((_, idx) => State.updateChannel(idx, {
    activePlaybackScheduledTime: null,
    activePlaybackDuration: null,
    activePlaybackReversed: null
  }));
}

/**
 * Starts playback.
 */
export function start() {
  if (rafId !== null) return; // Already playing

  ctx.resume().then(() => {
    const audioContextCurrentTime = ctx.currentTime;
    const initialDelay = 0.1; // Small delay to ensure everything is primed

    playStartTime = audioContextCurrentTime + initialDelay;
    nextStepTime = playStartTime;

    // Initialize _currentSchedulerStep from the global state's currentStep
    // This allows resuming from where the UI playhead was.
    _currentSchedulerStep = State.get().currentStep || 0;
    
    // Align absoluteStep to the current state of _currentSchedulerStep.
    // This ensures bar counting and diagnostics are somewhat aligned if starting mid-sequence.
    absoluteStep = _currentSchedulerStep; 
                                        
    // Reset bar diagnostics for this play session
    barCount = 0;
    barScheduledTimes = [];
    barActualTimes = [];

    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);

    console.log(`[PlaybackEngine] START. playStartTime: ${playStartTime.toFixed(5)}, initial _currentSchedulerStep: ${_currentSchedulerStep}, at AudioContext time: ${audioContextCurrentTime.toFixed(5)}`);
    State.update({ playing: true }); // currentStep will be updated by the scheduler via getCurrentDisplayStep
    
    lastSchedulerTime = performance.now();
    rafId = requestAnimationFrame(scheduler);
  });
}
