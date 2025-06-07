/***********************************************************************
 * playbackEngine.js – Enhanced for more accurate Web API scheduling
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0;
let nextStepTime = 0, _currentSchedulerStep = 0, timerId = null;
const lookAhead = 0.1, scheduleAheadTime = 0.2, patternLength = 64;
let scheduledSourcesInfo = [], absoluteStep = 0, barCount = 0, barScheduledTimes = [], barActualTimes = [], expectedSchedulerNextCallPerfTime = 0;

// === Helpers ===
const isNode = x => x && typeof x.disconnect === "function";
const connectChain = (nodes) => nodes.reduce((a, b) => (a.connect(b), b));
const safeDisconnect = n => { try { n.disconnect(); } catch {} };

// === Core Functions (unchanged identifiers and public API) ===

function printBarTimingSummary(barNumber, scheduledStartTimes, actualStepInfos) {
    // ...unchanged...
    // (function body as provided)
}

function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
    const s = State.get();
    s.channels.forEach((ch, i) => {
        if (!channelGainNodes[i]) return;
        const buf = ch.reverse ? ch.reversedBuffer : ch.buffer;
        if (!buf || !ch.steps[stepIdx]) return;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = Math.pow(2, (ch.pitch || 0) / 12);
        const dur = buf.duration, trimStart = ch.trimStart ?? 0, trimEnd = ch.trimEnd ?? 1;
        const startOffset = ch.reverse ? dur * (1 - trimEnd) : dur * trimStart;
        let playDur = Math.max(0.001, dur * (trimEnd - trimStart)), audibleDur = playDur / src.playbackRate.value;

        let chain = [src];
        if (ch.hpfCutoff > 20) {
            const f = ctx.createBiquadFilter();
            f.type = 'highpass'; f.frequency.setValueAtTime(ch.hpfCutoff, scheduledEventTime); f.Q.setValueAtTime(ch.hpfQ || .707, scheduledEventTime);
            chain.push(f);
        }
        if (ch.lpfCutoff < 20000) {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.setValueAtTime(ch.lpfCutoff, scheduledEventTime); f.Q.setValueAtTime(ch.lpfQ || .707, scheduledEventTime);
            chain.push(f);
        }
        [{ gain: ch.eqLowGain, def: EQ_BANDS_DEFS.LOW }, { gain: ch.eqMidGain, def: EQ_BANDS_DEFS.MID }, { gain: ch.eqHighGain, def: EQ_BANDS_DEFS.HIGH }]
            .forEach(({ gain, def }) => {
                if (gain) {
                    const eq = ctx.createBiquadFilter();
                    eq.type = def.type;
                    eq.frequency.setValueAtTime(def.frequency, scheduledEventTime);
                    eq.gain.setValueAtTime(gain, scheduledEventTime);
                    def.Q && eq.Q.setValueAtTime(def.Q, scheduledEventTime);
                    chain.push(eq);
                }
            });

        const gain = ctx.createGain(), maxF = audibleDur / 2, fadeIn = Math.min(ch.fadeInTime || 0, maxF), fadeOut = Math.min(ch.fadeOutTime || 0, maxF);
        if (fadeIn) { gain.gain.setValueAtTime(0, scheduledEventTime); gain.gain.linearRampToValueAtTime(1, scheduledEventTime + fadeIn); }
        else gain.gain.setValueAtTime(1, scheduledEventTime);
        if (fadeOut) {
            const fadeOutStart = scheduledEventTime + audibleDur - fadeOut;
            gain.gain.setValueAtTime(1, fadeOutStart > scheduledEventTime + fadeIn && fadeOutStart > scheduledEventTime ? fadeOutStart : scheduledEventTime);
            gain.gain.linearRampToValueAtTime(0, scheduledEventTime + audibleDur);
        }
        chain.push(gain, channelGainNodes[i]);
        connectChain(chain);

        src.start(scheduledEventTime, startOffset, playDur);
        State.updateChannel(i, {
            activePlaybackScheduledTime: scheduledEventTime,
            activePlaybackDuration: audibleDur,
            activePlaybackTrimStart: ch.trimStart,
            activePlaybackTrimEnd: ch.trimEnd,
            activePlaybackReversed: ch.reverse
        });
        scheduledSourcesInfo.push({ nodes: chain.slice(0, -1), scheduledEventTime, channelIndex: i });

        src.onended = () => {
            if (i === 0 && barActualTimes[scheduledStepOfBar] == null)
                barActualTimes[scheduledStepOfBar] = { actualEndTime: ctx.currentTime, audibleDurationWhenScheduled: audibleDur, originalBufferDuration: buf.duration };
            scheduledSourcesInfo = scheduledSourcesInfo.filter(info => info.nodes !== chain.slice(0, -1));
            chain.slice(0, -1).forEach(safeDisconnect);
            const chState = State.get().channels[i];
            if (chState && chState.activePlaybackScheduledTime === scheduledEventTime &&
                !scheduledSourcesInfo.some(info => info.channelIndex === i && info.scheduledEventTime === scheduledEventTime))
                State.updateChannel(i, { activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null });
        };
    });
}

function scheduler() {
    const perfStart = performance.now();
    if (expectedSchedulerNextCallPerfTime > 0) {
        const d = perfStart - expectedSchedulerNextCallPerfTime;
        if (Math.abs(d) > 1)
            console.debug(`[playbackEngine] Scheduler call delay: ${d.toFixed(2)} ms.`);
    }
    const s = State.get(), secondsPer16th = 60 / s.bpm / 4, nowCtx = ctx.currentTime;
    let stepsScheduled = 0, loopPerfStart = performance.now();
    while (nextStepTime < nowCtx + lookAhead) {
        const barStep = absoluteStep % 16;
        barScheduledTimes[barStep] = nextStepTime;
        scheduleStep(_currentSchedulerStep, nextStepTime, barStep);
        stepsScheduled++;
        nextStepTime += secondsPer16th;
        _currentSchedulerStep = (_currentSchedulerStep + 1) % patternLength;
        absoluteStep++;
        if (barStep === 15) {
            setTimeout(() => printBarTimingSummary(barCount, [...barScheduledTimes], [...barActualTimes]), 750);
            barCount++; barScheduledTimes = []; barActualTimes = [];
        }
    }
    const displayStep = getCurrentStepFromContextTime(nowCtx, s.bpm);
    State.update({ currentStep: displayStep });

    timerId = setTimeout(scheduler, scheduleAheadTime * 1000);
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
    const totalPerf = performance.now() - perfStart;
    if (totalPerf > 5)
        console.warn(`[playbackEngine] Scheduler time: ${totalPerf.toFixed(2)} ms; Loop: ${(performance.now() - loopPerfStart).toFixed(2)} ms for ${stepsScheduled} steps`);
}

function getCurrentStepFromContextTime(contextTime, bpm) {
    if (!playStartTime || playStartTime > contextTime) return 0;
    return Math.floor((contextTime - playStartTime) / (60 / bpm / 4)) % patternLength;
}

export function stop() {
    if (timerId == null) return;
    console.log('[playbackEngine] STOP at ctx.currentTime:', ctx.currentTime.toFixed(5));
    clearTimeout(timerId); timerId = null; expectedSchedulerNextCallPerfTime = 0;
    scheduledSourcesInfo.forEach(info => info.nodes.forEach(node => {
        if (node instanceof AudioBufferSourceNode) try { node.stop(0); } catch {}
        safeDisconnect(node);
    }));
    scheduledSourcesInfo = [];
    playStartTime = 0; _currentSchedulerStep = 0; absoluteStep = 0; barCount = 0; barScheduledTimes = []; barActualTimes = [];
    State.update({ playing: false, currentStep: 0 });
    State.get().channels.forEach((_, i) => State.updateChannel(i, {
        activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null
    }));
}

export function start() {
    if (timerId != null) return;
    ctx.resume().then(() => {
        const nowCtx = ctx.currentTime;
        playStartTime = nowCtx + 0.1;
        nextStepTime = playStartTime;
        _currentSchedulerStep = 0; absoluteStep = 0; barCount = 0; barScheduledTimes = []; barActualTimes = [];
        expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);
        console.log('[playbackEngine] START. playStartTime:', playStartTime.toFixed(5), 'at ctx.currentTime:', nowCtx.toFixed(5));
        State.update({ playing: true, currentStep: 0 });
        scheduler();
    });
}
