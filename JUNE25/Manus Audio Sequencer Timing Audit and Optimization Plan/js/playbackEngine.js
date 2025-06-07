/***********************************************************************
 * playbackEngine.js – Minimized/Modernized, fully compatible
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0;
let nextStepTime = 0, _currentSchedulerStep = 0, rafId = null, lastSchedulerTime = 0;
let lookAhead = 0.1, scheduleAheadTime = 0.2, schedulerPerformanceHistory = [];
const MIN_LOOK_AHEAD = 0.05, MAX_LOOK_AHEAD = 0.5, LOOK_AHEAD_ADJUSTMENT_RATE = 0.01, patternLength = 64;
let scheduledSourcesInfo = [], absoluteStep = 0, barCount = 0, barScheduledTimes = [], barActualTimes = [], expectedSchedulerNextCallPerfTime = 0;

const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const clamp = (x, mn, mx) => Math.max(mn, Math.min(mx, x));

function adjustLookAhead() {
  if (schedulerPerformanceHistory.length < 10) return;
  const [a, m] = [avg(schedulerPerformanceHistory), Math.max(...schedulerPerformanceHistory)];
  lookAhead = m > lookAhead * 500 ? clamp(lookAhead + LOOK_AHEAD_ADJUSTMENT_RATE, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD)
    : a < lookAhead * 100 && lookAhead > MIN_LOOK_AHEAD ? clamp(lookAhead - LOOK_AHEAD_ADJUSTMENT_RATE, MIN_LOOK_AHEAD, MAX_LOOK_AHEAD)
    : lookAhead;
  scheduleAheadTime = Math.max(lookAhead * 2, 0.1);
  schedulerPerformanceHistory = [];
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
      if (g) {
        const eq = ctx.createBiquadFilter();
        eq.type = d.type; eq.frequency.setValueAtTime(d.frequency, t); eq.gain.setValueAtTime(g, t); d.Q && eq.Q.setValueAtTime(d.Q, t);
        node.connect(eq); node = eq; cleanup.push(eq);
      }
    });
    const gain = ctx.createGain(); cleanup.push(gain);
    const maxF = audible / 2, fadeIn = Math.min(ch.fadeInTime || 0, maxF), fadeOut = Math.min(ch.fadeOutTime || 0, maxF);
    fadeIn ? (gain.gain.setValueAtTime(0, t), gain.gain.linearRampToValueAtTime(1, t + fadeIn)) : gain.gain.setValueAtTime(1, t);
    if (fadeOut) {
      const s = t + audible - fadeOut;
      s > t + fadeIn && s > t
        ? (gain.gain.setValueAtTime(1, s), gain.gain.linearRampToValueAtTime(0, t + audible))
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
      cleanup.forEach(n => { try { n.disconnect(); } catch {} });
      const chState = State.get().channels[chIdx];
      if (chState && chState.activePlaybackScheduledTime === t) {
        const stillActive = scheduledSourcesInfo.some(info => info.channelIndex === chIdx && info.scheduledEventTime === t);
        if (!stillActive) State.updateChannel(chIdx, { activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null });
      }
    };
  });
}

function scheduler(ts = performance.now()) {
  const entryPerf = performance.now(), s = State.get(), secPer16th = 60 / s.bpm / 4, nowCtx = ctx.currentTime;
  if (expectedSchedulerNextCallPerfTime) {
    const delay = entryPerf - expectedSchedulerNextCallPerfTime;
    Math.abs(delay) > 1 && console.debug(`[playbackEngine] Scheduler call delay: ${delay.toFixed(2)} ms`);
  }
  let stepsThisTick = 0, loopStart = performance.now();
  while (nextStepTime < nowCtx + lookAhead) {
    const barStep = absoluteStep % 16;
    barScheduledTimes[barStep] = nextStepTime;
    scheduleStep(_currentSchedulerStep, nextStepTime, barStep);
    stepsThisTick++;
    nextStepTime += secPer16th;
    _currentSchedulerStep = (_currentSchedulerStep + 1) % patternLength;
    absoluteStep++;
    if (barStep === 15) {
      const scheduled = [...barScheduledTimes], actual = [...barActualTimes], barN = barCount;
      setTimeout(() => printBarTimingSummary(barN, scheduled, actual), 750);
      barCount++; barScheduledTimes = []; barActualTimes = [];
    }
  }
  const loopDur = performance.now() - loopStart, displayStep = getCurrentStepFromContextTime(nowCtx, s.bpm);
  let stateStart = performance.now(); State.update({ currentStep: displayStep }); let stateDur = performance.now() - stateStart;
  const execTime = performance.now() - entryPerf;
  schedulerPerformanceHistory.push(execTime); schedulerPerformanceHistory.length >= 10 && adjustLookAhead();
  if (rafId !== null) {
    rafId = requestAnimationFrame(scheduler);
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    lastSchedulerTime = ts;
  }
  execTime > 5 && console.warn(
    `[playbackEngine] Scheduler exec: ${execTime.toFixed(2)} ms. ` +
    `(loop: ${loopDur.toFixed(2)} ms for ${stepsThisTick} steps; ` +
    `State.update: ${stateDur.toFixed(2)} ms)`
  );
}

export function stop() {
  if (rafId === null) return;
  console.log('[playbackEngine] STOP at ctx.currentTime:', ctx.currentTime.toFixed(5));
  cancelAnimationFrame(rafId); rafId = null; expectedSchedulerNextCallPerfTime = 0;
  scheduledSourcesInfo.forEach(info => info.nodes.forEach(node => {
    if (node instanceof AudioBufferSourceNode) try { node.stop(0); } catch {}
    try { node.disconnect(); } catch {}
  }));
  scheduledSourcesInfo = [];
  playStartTime = 0; _currentSchedulerStep = 0; absoluteStep = 0; barCount = 0; barScheduledTimes = []; barActualTimes = [];
  State.update({ playing: false, currentStep: 0 });
  State.get().channels.forEach((_ch, idx) => State.updateChannel(idx, { activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null }));
}

export function start() {
  if (rafId !== null) return;
  ctx.resume().then(() => {
    const nowCtx = ctx.currentTime;
    playStartTime = nowCtx + 0.1;
    nextStepTime = playStartTime; _currentSchedulerStep = 0; absoluteStep = 0; barCount = 0; barScheduledTimes = []; barActualTimes = [];
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    console.log('[playbackEngine] START. playStartTime:', playStartTime.toFixed(5), 'at ctx.currentTime:', nowCtx.toFixed(5));
    State.update({ playing: true, currentStep: 0 });
    lastSchedulerTime = performance.now();
    rafId = requestAnimationFrame(scheduler);
  });
}
