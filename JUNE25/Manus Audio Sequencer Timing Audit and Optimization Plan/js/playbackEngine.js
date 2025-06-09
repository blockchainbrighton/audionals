/***********************************************************************
 * playbackEngine.js – Minimized/Modernized, fully compatible
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0;
let nextStepTime = 0, _currentSchedulerStep = 0, rafId = null, lastSchedulerTime = 0;
let lookAhead = 0.1, scheduleAheadTime = 0.2, schedulerPerformanceHistory = [];

// Constants for adjustLookAhead logic
const MIN_LOOK_AHEAD = 0.05; // Minimum look-ahead time in seconds (50ms)
const MAX_LOOK_AHEAD = 0.5;  // Maximum look-ahead time in seconds (500ms)
const LOOK_AHEAD_ADJUSTMENT_RATE = 0.01; // Step size for adjusting look-ahead, in seconds (10ms)
const SCHEDULER_PERF_HISTORY_LENGTH = 10; // Number of scheduler calls to average for performance
const SCHEDULER_EXEC_TIME_INCREASE_THRESHOLD_RATIO = 0.5; // If max exec time > 50% of lookAhead window, increase lookAhead
const SCHEDULER_EXEC_TIME_DECREASE_THRESHOLD_RATIO = 0.1; // If avg exec time < 10% of lookAhead window, decrease lookAhead

const patternLength = 64; // Assuming this is fixed, otherwise should come from State or config
let scheduledSourcesInfo = [], absoluteStep = 0, barCount = 0, barScheduledTimes = [], barActualTimes = [], expectedSchedulerNextCallPerfTime = 0;

const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const clamp = (x, mn, mx) => Math.max(mn, Math.min(mx, x));

function adjustLookAhead() {
  if (schedulerPerformanceHistory.length < SCHEDULER_PERF_HISTORY_LENGTH) {
    return;
  }

  const avgExecTime = avg(schedulerPerformanceHistory);
  const maxExecTime = Math.max(...schedulerPerformanceHistory);
  
  // Convert lookAhead (seconds) to milliseconds for direct comparison with execution times (milliseconds)
  const lookAheadMs = lookAhead * 1000;

  if (maxExecTime > lookAheadMs * SCHEDULER_EXEC_TIME_INCREASE_THRESHOLD_RATIO) {
    // If scheduler is taking too long (max execution time is high relative to lookAhead window), increase lookAhead
    lookAhead = clamp(lookAhead + LOOK_AHEAD_ADJUSTMENT_RATE, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD);
  } else if (avgExecTime < lookAheadMs * SCHEDULER_EXEC_TIME_DECREASE_THRESHOLD_RATIO && lookAhead > MIN_LOOK_AHEAD) {
    // If scheduler is running very efficiently (avg execution time is low relative to lookAhead window), decrease lookAhead
    // Only decrease if lookAhead is not already at its minimum
    lookAhead = clamp(lookAhead - LOOK_AHEAD_ADJUSTMENT_RATE, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD);
  }
  // If neither condition is met, lookAhead remains unchanged.

  // scheduleAheadTime determines the interval for rAF diagnostic logging.
  // Its logic remains as per original, as changing it is beyond a simple constant review.
  scheduleAheadTime = Math.max(lookAhead * 2, 0.1); 
  
  schedulerPerformanceHistory = []; // Reset history for the next observation period
}

function getCurrentStepFromContextTime(contextTime, bpm) {
  if (!playStartTime || playStartTime > contextTime) return 0;
  const secPer16th = 60 / bpm / 4, elapsed = contextTime - playStartTime;
  return Math.floor(elapsed / secPer16th) % patternLength;
}

function printBarTimingSummary(barNum, sch, act) {
  console.groupCollapsed(`⏱️ Step timing for Bar ${barNum + 1}`);
  let drift = 0, n = 0;
  for (let i = 0; i < 16; ++i) {
    const s = sch[i], a = act[i];
    let msg = `Step ${i + 1}`.padEnd(7) + `| Scheduled Start: ${s != null ? s.toFixed(5) : 'N/A'} s`.padEnd(30);
    if (a && s != null) {
      msg += `| Actual End: ${a.actualEndTime.toFixed(5)} s`.padEnd(27)
        + `| Audible Duration (Sched): ${a.audibleDurationWhenScheduled.toFixed(5)} s`.padEnd(36)
        + `| Expected End: ${(s + a.audibleDurationWhenScheduled).toFixed(5)} s`.padEnd(27);
      const endDrift = a.actualEndTime - (s + a.audibleDurationWhenScheduled);
      msg += `| End Drift: ${endDrift.toFixed(5)} s`; drift += Math.abs(endDrift); n++;
    } else msg += '| Actual End: (pending or N/A)'.padEnd(27) + '| Audible Duration (Sched): ---'.padEnd(36) + '| Expected End: ---'.padEnd(27) + '| End Drift: ---';
    console.log(msg);
  }
  console.log(n ? `Avg End Drift: ${(drift / n).toFixed(6)} s` : 'No valid steps for drift calc.');
  console.groupEnd();
}

function scheduleStep(stepIdx, t, stepOfBar) {
  const s = State.get();
  s.channels.forEach((ch, chIdx) => {
    if (!channelGainNodes[chIdx]) return;
    const buf = ch.reverse ? ch.reversedBuffer : ch.buffer;
    if (!buf || !ch.steps[stepIdx]) return;
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (ch.pitch || 0) / 12);
    const dur = ch.buffer.duration, ts = ch.trimStart ?? 0, te = ch.trimEnd ?? 1;
    const off = ch.reverse ? dur * (1 - te) : dur * ts, len = dur * (te - ts), audible = Math.max(0.001, len) / src.playbackRate.value;
    let node = src, cleanup = [src];
    if (ch.hpfCutoff > 20) {
      const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.setValueAtTime(ch.hpfCutoff, t); h.Q.setValueAtTime(ch.hpfQ || .707, t);
      node.connect(h); node = h; cleanup.push(h);
    }
    if (ch.lpfCutoff < 2e4) {
      const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.setValueAtTime(ch.lpfCutoff, t); l.Q.setValueAtTime(ch.lpfQ || .707, t);
      node.connect(l); node = l; cleanup.push(l);
    }
    [
      { g: ch.eqLowGain, d: EQ_BANDS_DEFS.LOW },
      { g: ch.eqMidGain, d: EQ_BANDS_DEFS.MID },
      { g: ch.eqHighGain, d: EQ_BANDS_DEFS.HIGH }
    ].forEach(({ g, d }) => {
      if (g && d) { // Added check for d (EQ_BANDS_DEFS)
        const eq = ctx.createBiquadFilter();
        eq.type = d.type; eq.frequency.setValueAtTime(d.frequency, t); eq.gain.setValueAtTime(g, t); d.Q && eq.Q.setValueAtTime(d.Q, t);
        node.connect(eq); node = eq; cleanup.push(eq);
      }
    });
    const gain = ctx.createGain(); cleanup.push(gain);
    const maxF = audible / 2, fadeIn = Math.min(ch.fadeInTime || 0, maxF), fadeOut = Math.min(ch.fadeOutTime || 0, maxF);
    fadeIn ? (gain.gain.setValueAtTime(0, t), gain.gain.linearRampToValueAtTime(1, t + fadeIn)) : gain.gain.setValueAtTime(1, t);
    if (fadeOut) {
      const s_fade = t + audible - fadeOut; // Renamed 's' to 's_fade' to avoid conflict with State's 's'
      s_fade > t + fadeIn && s_fade > t
        ? (gain.gain.setValueAtTime(1, s_fade), gain.gain.linearRampToValueAtTime(0, t + audible))
        : gain.gain.linearRampToValueAtTime(0, t + audible);
    }
    node.connect(gain); gain.connect(channelGainNodes[chIdx]);
    src.start(t, off, len);
    State.updateChannel(chIdx, {
      activePlaybackScheduledTime: t, activePlaybackDuration: audible,
      activePlaybackTrimStart: ch.trimStart, activePlaybackTrimEnd: ch.trimEnd, activePlaybackReversed: ch.reverse
    });
    scheduledSourcesInfo.push({ nodes: cleanup, scheduledEventTime: t, channelIndex: chIdx });
    src.onended = () => {
      if (chIdx === 0 && barActualTimes[stepOfBar] == null)
        barActualTimes[stepOfBar] = { actualEndTime: ctx.currentTime, audibleDurationWhenScheduled: audible, originalBufferDuration: ch.buffer.duration };
      scheduledSourcesInfo = scheduledSourcesInfo.filter(info => info.nodes !== cleanup);
      cleanup.forEach(n_node => { try { n_node.disconnect(); } catch {} }); // Renamed 'n' to 'n_node'
      const chState = State.get().channels[chIdx];
      if (chState && chState.activePlaybackScheduledTime === t) {
        const stillActive = scheduledSourcesInfo.some(info => info.channelIndex === chIdx && info.scheduledEventTime === t);
        if (!stillActive) State.updateChannel(chIdx, { activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null });
      }
    };
  });
}

function scheduler(ts = performance.now()) {
  const entryPerf = performance.now();
  const s = State.get(); // Get current state, including BPM
  const secPer16th = 60 / s.bpm / 4;
  const nowCtx = ctx.currentTime;

  if (expectedSchedulerNextCallPerfTime) {
    const delay = entryPerf - expectedSchedulerNextCallPerfTime;
    // Log if rAF call was significantly early or late based on scheduleAheadTime
    if (Math.abs(delay) > 1) { // Only log if delay is more than 1ms
        console.debug(`[playbackEngine] Scheduler call delay from expected: ${delay.toFixed(2)} ms (expected by: ${scheduleAheadTime*1000}ms)`);
    }
  }

  let stepsThisTick = 0;
  const loopStart = performance.now();
  while (nextStepTime < nowCtx + lookAhead) {
    const barStep = absoluteStep % 16;
    if (barScheduledTimes.length === 0 && barStep !==0) {
        // If starting mid-bar, fill previous barScheduledTimes with null or approximate times
        // This is a simple fill for consistent array length; more sophisticated logic might be needed
        for(let i=0; i<barStep; i++) barScheduledTimes[i] = null; 
    }
    barScheduledTimes[barStep] = nextStepTime;
    scheduleStep(_currentSchedulerStep, nextStepTime, barStep);
    stepsThisTick++;
    nextStepTime += secPer16th;
    _currentSchedulerStep = (_currentSchedulerStep + 1) % patternLength;
    absoluteStep++;
    if (barStep === 15) { // End of a 16-step bar
      const scheduled = [...barScheduledTimes];
      const actual = [...barActualTimes];
      const barN = barCount;
      setTimeout(() => printBarTimingSummary(barN, scheduled, actual), 750); // Delay summary to allow actual times to populate
      barCount++;
      barScheduledTimes = []; 
      barActualTimes = [];
    }
  }
  const loopDur = performance.now() - loopStart;
  
  const displayStep = getCurrentStepFromContextTime(nowCtx, s.bpm);
  const stateUpdateStart = performance.now();
  State.update({ currentStep: displayStep }); // This call will now be faster as UI.render is deferred
  const stateUpdateDur = performance.now() - stateUpdateStart;

  const execTime = performance.now() - entryPerf;
  schedulerPerformanceHistory.push(execTime);
  if (schedulerPerformanceHistory.length >= SCHEDULER_PERF_HISTORY_LENGTH) {
    adjustLookAhead();
  }

  if (rafId !== null) {
    rafId = requestAnimationFrame(scheduler);
    // Set expectation for the *next* call, based on current (possibly adjusted) scheduleAheadTime
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000); 
    lastSchedulerTime = ts; // ts is the timestamp from rAF, performance.now() at call time
  }

  if (execTime > 5) { // Log if scheduler execution is long
    console.warn(
      `[playbackEngine] Scheduler exec: ${execTime.toFixed(2)} ms. ` +
      `(loop: ${loopDur.toFixed(2)} ms for ${stepsThisTick} steps; ` +
      `State.update: ${stateUpdateDur.toFixed(2)} ms)`
    );
  }
}

export function stop() {
  if (rafId === null) return;
  console.log('[playbackEngine] STOP at ctx.currentTime:', ctx.currentTime.toFixed(5));
  cancelAnimationFrame(rafId); 
  rafId = null; 
  expectedSchedulerNextCallPerfTime = 0; // Reset diagnostic
  
  scheduledSourcesInfo.forEach(info => {
    info.nodes.forEach(node => {
      if (node instanceof AudioBufferSourceNode) {
        try { node.stop(0); } catch {} // Stop any ongoing buffer sources
      }
      try { node.disconnect(); } catch {} // Disconnect all nodes
    });
  });
  scheduledSourcesInfo = []; // Clear scheduled sources

  // Reset playback state variables
  playStartTime = 0; 
  _currentSchedulerStep = 0; 
  absoluteStep = 0; 
  barCount = 0; 
  barScheduledTimes = []; 
  barActualTimes = [];
  
  State.update({ playing: false, currentStep: 0 });
  // Clear any active playback indicators on channels
  State.get().channels.forEach((_ch, idx) => State.updateChannel(idx, { 
      activePlaybackScheduledTime: null, 
      activePlaybackDuration: null, 
      activePlaybackReversed: null 
  }));
}

export function start() {
  if (rafId !== null) return; // Already playing
  ctx.resume().then(() => {
    const nowCtx = ctx.currentTime;
    playStartTime = nowCtx + 0.1; // Start playback slightly in the future to allow for scheduling
    nextStepTime = playStartTime; 
    _currentSchedulerStep = 0; 
    absoluteStep = 0; 
    barCount = 0; 
    barScheduledTimes = []; 
    barActualTimes = [];
    
    // Set initial expectation for the first scheduler call after this start.
    // performance.now() is used here as a base for the first expected rAF interval.
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    
    console.log('[playbackEngine] START. playStartTime:', playStartTime.toFixed(5), 'at ctx.currentTime:', nowCtx.toFixed(5));
    State.update({ playing: true, currentStep: 0 });
    
    lastSchedulerTime = performance.now(); // Initialize lastSchedulerTime
    rafId = requestAnimationFrame(scheduler); // Start the scheduler loop
  });
}