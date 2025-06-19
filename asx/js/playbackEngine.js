/***********************************************************************
 * playbackEngine.js – Optimized for Robust Timing
 * Reverts to a setTimeout-based scheduler to decouple from UI rendering.
 * Simplifies active sound management for improved performance.
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';
import SequenceManager from './sequenceManager.js';

// --- Module-level Variables ---
export let playStartTime = 0;
export let globalActiveAudio = []; // Exported for ui.js to read

let nextStepTime = 0;
let _currentSchedulerStep = 0;
let timerId = null; // Using setTimeout, so this is a timer ID, not a rAF ID.

// --- Stable Timing Parameters ---
// These fixed values provide predictable and resilient performance, avoiding
// the instability of an adaptive system that can't handle UI lag spikes.
const lookAhead = 0.1;           // (100ms) How far ahead to schedule audio.
const scheduleAheadTime = 0.025; // (25ms) How often the scheduler wakes up to check.

const patternLength = 64;
let scheduledSourceStopFunctions = []; // Simplified array to hold stop functions for cleanup.
let absoluteStep = 0;

// --- Diagnostic Variables (can be kept) ---
let barCount = 0;
let barScheduledTimes = [];
let barActualTimes = [];

// --- Helper Functions ---
export const clamp = (x, mn, mx) => Math.max(mn, Math.min(mx, x));

const getCurrentDisplayStep = (contextTime, bpm, currentPlayStartTime) => {
    if (!currentPlayStartTime || currentPlayStartTime > contextTime) return 0;
    const secondsPerStep = (60 / bpm) / 4;
    const elapsedSteps = Math.floor((contextTime - currentPlayStartTime) / secondsPerStep);
    return elapsedSteps % patternLength;
};

function printBarTimingSummary(barNum, schTimes, actTimes) {
    // This diagnostic function is helpful and can remain as is.
    console.groupCollapsed(`⏱️ Step timing for Bar ${barNum + 1}`);
    let totalDrift = 0;
    let validStepsCount = 0;
    for (let i = 0; i < 16; ++i) {
        const scheduledTime = schTimes[i];
        const actualInfo = actTimes[i];
        let msg = `Step ${i + 1}`.padEnd(7) + `| Scheduled Start: ${scheduledTime != null ? scheduledTime.toFixed(5) : 'N/A'} s`.padEnd(30);
        if (actualInfo && scheduledTime != null) {
            const expectedEnd = scheduledTime + actualInfo.audibleDurationWhenScheduled;
            const endDrift = actualInfo.actualEndTime - expectedEnd;
            msg += `| Actual End: ${actualInfo.actualEndTime.toFixed(5)} s`.padEnd(27) + `| Expected End: ${expectedEnd.toFixed(5)} s`.padEnd(27) + `| End Drift: ${endDrift.toFixed(5)} s`;
            totalDrift += Math.abs(endDrift);
            validStepsCount++;
        } else {
            msg += '| (pending or N/A)'.padEnd(27) + '|'.padEnd(27) + '|';
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

        const bufferToPlay = channel.reverse ? channel.reversedBuffer : channel.buffer;
        if (!bufferToPlay || !channel.steps[stepIndexInSequence]) return;

        const source = ctx.createBufferSource();
        source.buffer = bufferToPlay;

        const currentPitch = channel.pitch || 0;
        source.playbackRate.value = 2 ** (currentPitch / 12);

        const referenceBufferForDuration = channel.buffer || bufferToPlay;
        if (!referenceBufferForDuration) return;

        const bufferOriginalDuration = referenceBufferForDuration.duration;
        const trimStart = channel.trimStart ?? 0;
        const trimEnd = channel.trimEnd ?? 1;
        const isReversed = channel.reverse;

        const offsetInFullBuffer = isReversed ? bufferOriginalDuration * (1 - trimEnd) : bufferOriginalDuration * trimStart;
        const durationInFullBuffer = bufferOriginalDuration * (trimEnd - trimStart);
        const audibleDuration = Math.max(0.001, durationInFullBuffer) / source.playbackRate.value;

        // --- Audio Graph Construction (this part is fine) ---
        let currentNode = source;
        const cleanupNodesList = [source];

        if (channel.hpfCutoff > 20) {
            const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.setValueAtTime(channel.hpfCutoff, time); hpf.Q.setValueAtTime(channel.hpfQ || 0.707, time);
            currentNode.connect(hpf); currentNode = hpf; cleanupNodesList.push(hpf);
        }
        if (channel.lpfCutoff < 20000) {
            const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(channel.lpfCutoff, time); lpf.Q.setValueAtTime(channel.lpfQ || 0.707, time);
            currentNode.connect(lpf); currentNode = lpf; cleanupNodesList.push(lpf);
        }
        [
            { gain: channel.eqLowGain, def: EQ_BANDS_DEFS.LOW },
            { gain: channel.eqMidGain, def: EQ_BANDS_DEFS.MID },
            { gain: channel.eqHighGain, def: EQ_BANDS_DEFS.HIGH }
        ].forEach(({ gain, def }) => {
            if (gain && def) {
                const eq = ctx.createBiquadFilter(); eq.type = def.type; eq.frequency.setValueAtTime(def.frequency, time); eq.gain.setValueAtTime(gain, time);
                if (def.Q) eq.Q.setValueAtTime(def.Q, time);
                currentNode.connect(eq); currentNode = eq; cleanupNodesList.push(eq);
            }
        });

        const fadeGainNode = ctx.createGain();
        cleanupNodesList.push(fadeGainNode);
        const maxFadePossible = audibleDuration / 2;
        const instanceFadeIn = Math.min(channel.fadeInTime || 0, maxFadePossible);
        const instanceFadeOut = Math.min(channel.fadeOutTime || 0, maxFadePossible);

        fadeGainNode.gain.setValueAtTime(instanceFadeIn > 0 ? 0 : 1, time);
        if (instanceFadeIn > 0) fadeGainNode.gain.linearRampToValueAtTime(1, time + instanceFadeIn);
        if (instanceFadeOut > 0) {
            const fadeOutStartTime = time + audibleDuration - instanceFadeOut;
            if (fadeOutStartTime > time + (instanceFadeIn || 0)) { // Ensure ramps don't overlap strangely
                fadeGainNode.gain.setValueAtTime(1, fadeOutStartTime); // Set to 1 before ramping down
            }
            fadeGainNode.gain.linearRampToValueAtTime(0, time + audibleDuration);
        }
        
        currentNode.connect(fadeGainNode);
        fadeGainNode.connect(channelGainNodes[channelIndex]);
        source.start(time, offsetInFullBuffer, durationInFullBuffer);

        // --- Simplified Cleanup and State Management ---
        const stopFunction = () => {
            try { source.stop(0); } catch(e) {}
            cleanupNodesList.forEach(node => { try { node.disconnect(); } catch (e) {} });
        };
        scheduledSourceStopFunctions.push(stopFunction);
        
        source.onended = () => {
            const index = scheduledSourceStopFunctions.indexOf(stopFunction);
            if (index > -1) scheduledSourceStopFunctions.splice(index, 1);

            if (channelIndex === 0 && barActualTimes[stepOfBarForDiagnostics] == null) {
                barActualTimes[stepOfBarForDiagnostics] = { actualEndTime: ctx.currentTime, audibleDurationWhenScheduled: audibleDuration };
            }

            const chState = State.get().channels[channelIndex];
            if (chState && chState.activePlaybackScheduledTime === time) {
                State.updateChannel(channelIndex, { activePlaybackScheduledTime: null, activePlaybackDuration: null });
            }
        };

        // Update UI state immediately for this note
        State.updateChannel(channelIndex, {
            activePlaybackScheduledTime: time,
            activePlaybackDuration: audibleDuration,
            activePlaybackTrimStart: trimStart,
            activePlaybackTrimEnd: trimEnd,
            activePlaybackReversed: isReversed
        });
    });
}

function scheduler() {
  // This condition should be at the top. If stop() was called, `timerId` will be null,
  // and the scheduler will stop its loop gracefully.
  if (timerId === null) {
      return;
  }

  const audioContextCurrentTime = ctx.currentTime;

  while (nextStepTime < audioContextCurrentTime + lookAhead) {
      const currentState = State.get(); // Get latest BPM inside the loop
      const secondsPer16th = (60 / currentState.bpm) / 4;
      const stepOfBarForDiagnostics = absoluteStep % 16;
      
      if (barScheduledTimes.length === 0 && stepOfBarForDiagnostics !== 0) {
          for (let i = 0; i < stepOfBarForDiagnostics; i++) barScheduledTimes[i] = null;
      }
      barScheduledTimes[stepOfBarForDiagnostics] = nextStepTime;

      scheduleStep(_currentSchedulerStep, nextStepTime, stepOfBarForDiagnostics);
      
      nextStepTime += secondsPer16th;
      _currentSchedulerStep = (_currentSchedulerStep + 1) % patternLength;
      absoluteStep++;

      if (stepOfBarForDiagnostics === 15) {
          if (currentState.playbackMode === 'continuous' && SequenceManager.sequenceCount > 1) {
              const nextIndex = (SequenceManager.currentIndex + 1) % SequenceManager.sequenceCount;
              SequenceManager.switchToSequence(nextIndex).catch(err => console.error(`[PlaybackEngine] Continuous switch error:`, err));
          }
          // Diagnostic logging
          const scheduled = [...barScheduledTimes], actual = [...barActualTimes], barNum = barCount;
          setTimeout(() => printBarTimingSummary(barNum, scheduled, actual), 750);
          barCount++; barScheduledTimes = []; barActualTimes = [];
      }
  }

  const currentState = State.get();
  const displayStep = getCurrentDisplayStep(audioContextCurrentTime, currentState.bpm, playStartTime);
  State.update({ currentStep: displayStep });

  // The scheduler now correctly re-schedules itself for the next tick.
  timerId = setTimeout(scheduler, scheduleAheadTime * 1000);
}

export function stop() {
    if (timerId === null) return;
    console.log('[PlaybackEngine] STOP at AudioContext time:', ctx.currentTime.toFixed(5));
    
    clearTimeout(timerId);
    timerId = null;

    scheduledSourceStopFunctions.forEach(stopFunc => stopFunc());
    scheduledSourceStopFunctions = [];

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
  if (timerId !== null) return; // Prevent multiple loops from starting

  ctx.resume().then(() => {
      const audioContextCurrentTime = ctx.currentTime;
      const initialDelay = 0.1; 
      playStartTime = audioContextCurrentTime + initialDelay;
      nextStepTime = playStartTime;
      _currentSchedulerStep = State.get().currentStep || 0;
      absoluteStep = _currentSchedulerStep;
      barCount = 0; 
      barScheduledTimes = []; 
      barActualTimes = [];

      console.log(`[PlaybackEngine] START. playStartTime: ${playStartTime.toFixed(5)}, initial _currentSchedulerStep: ${_currentSchedulerStep}, at AudioContext time: ${audioContextCurrentTime.toFixed(5)}`);
      State.update({ playing: true });

      // **THE CRITICAL FIX IS HERE:**
      // We set a dummy timerId immediately so the first run of the scheduler knows it's
      // part of an active loop. The scheduler will then take over re-setting this ID.
      timerId = 1; 
      scheduler();
  });
}