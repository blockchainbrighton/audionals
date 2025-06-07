/***********************************************************************
 * playbackEngine.js – Enhanced for more accurate Web API scheduling
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0;

let nextStepTime = 0.0;
// currentStep is managed by the scheduler for its internal logic,
// but the "displayStep" for the UI will be derived and set in the state.
let _currentSchedulerStep = 0; // Internal step counter for scheduling logic

let timerId = null;
const lookAhead = 0.1;     // How far ahead to schedule audio (sec)
const scheduleAheadTime = 0.2; // How often to call the scheduler (sec)
let scheduledSourcesInfo = [];
const patternLength = 64;

// Timing debug collections
let absoluteStep = 0; // Overall step count since play started
let barCount = 0;     // Count of 16-step bars processed

let barScheduledTimes = [];
let barActualTimes = [];

// Global or in an outer scope for playbackEngine.js
let expectedSchedulerNextCallPerfTime = 0;

// PrintBarTimingSummary and scheduleStep remain the same as your provided version
// ... (printBarTimingSummary function - no changes)
function printBarTimingSummary(barNumber, scheduledStartTimes, actualStepInfos) {
    console.groupCollapsed(`⏱️ Step timing for Bar ${barNumber + 1} (data captured at end of bar scheduling)`);
    let sumEndDrift = 0;
    let validStepsForDrift = 0;

    for (let i = 0; i < 16; ++i) {
        const scheduledStartTime = scheduledStartTimes[i];
        const actualStepInfo = actualStepInfos[i]; // Object for Ch0, or undefined

        let logMsg = `Step ${i + 1}`.padEnd(7);
        logMsg += `| Scheduled Start: ${scheduledStartTime != null ? scheduledStartTime.toFixed(5) : 'N/A'} s`.padEnd(30);

        if (actualStepInfo && scheduledStartTime != null) {
            logMsg += `| Actual End: ${actualStepInfo.actualEndTime.toFixed(5)} s`.padEnd(27);
            logMsg += `| Audible Duration (Sched): ${actualStepInfo.audibleDurationWhenScheduled.toFixed(5)} s`.padEnd(36);
            
            const expectedEndTime = scheduledStartTime + actualStepInfo.audibleDurationWhenScheduled;
            logMsg += `| Expected End: ${expectedEndTime.toFixed(5)} s`.padEnd(27);

            const endDrift = actualStepInfo.actualEndTime - expectedEndTime;
            logMsg += `| End Drift: ${endDrift.toFixed(5)} s`;
            sumEndDrift += Math.abs(endDrift);
            validStepsForDrift++;
        } else {
            logMsg += `| Actual End: (pending or N/A)`.padEnd(27);
            logMsg += `| Audible Duration (Sched): ---`.padEnd(36);
            logMsg += `| Expected End: ---`.padEnd(27);
            logMsg += `| End Drift: ---`;
            if (actualStepInfo && scheduledStartTime == null) {
                console.warn(`[playbackEngine] Bar ${barNumber + 1}, Step ${i + 1}: Had actualStepInfo but no scheduledStartTime. This shouldn't happen.`);
            }
        }
        console.log(logMsg);
    }

    if (validStepsForDrift > 0) {
        const avgEndDrift = (sumEndDrift / validStepsForDrift).toFixed(6);
        console.log(`Avg End Drift for ${validStepsForDrift} recorded Ch0 steps this bar: ${avgEndDrift} s`);
    } else {
        console.log("No Ch0 step end times (or corresponding scheduled start times) recorded for drift calculation this bar.");
    }
    console.groupEnd();
}

// ... (scheduleStep function - no changes from your provided version)
function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
    const s = State.get();
    s.channels.forEach((ch, channelIndex) => {
        if (!channelGainNodes[channelIndex]) {
            return;
        }
        const bufferToPlay = ch.reverse ? ch.reversedBuffer : ch.buffer;
        if (!bufferToPlay || !ch.steps[stepIdx]) return;
    
        const source = ctx.createBufferSource();
        source.buffer = bufferToPlay;
        source.playbackRate.value = Math.pow(2, (ch.pitch || 0) / 12);
  
        const dur = ch.buffer.duration;
        let trimStart = ch.trimStart ?? 0, trimEnd = ch.trimEnd ?? 1;
        let startOffset = ch.reverse ? dur * (1 - trimEnd) : dur * trimStart;
        let durationToPlay = dur * (trimEnd - trimStart); 
        durationToPlay = Math.max(0.001, durationToPlay);
        const audibleDuration = durationToPlay / source.playbackRate.value; 
  
        let currentNode = source;
        const cleanup = [source];
  
        if (ch.hpfCutoff > 20) {
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass'; hpf.frequency.setValueAtTime(ch.hpfCutoff, scheduledEventTime);
            hpf.Q.setValueAtTime(ch.hpfQ || 0.707, scheduledEventTime);
            currentNode.connect(hpf); currentNode = hpf; cleanup.push(hpf);
        }
        if (ch.lpfCutoff < 20000) {
            const lpf = ctx.createBiquadFilter();
            lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(ch.lpfCutoff, scheduledEventTime);
            lpf.Q.setValueAtTime(ch.lpfQ || 0.707, scheduledEventTime);
            currentNode.connect(lpf); currentNode = lpf; cleanup.push(lpf);
        }
        [
            { gain: ch.eqLowGain, def: EQ_BANDS_DEFS.LOW },
            { gain: ch.eqMidGain, def: EQ_BANDS_DEFS.MID },
            { gain: ch.eqHighGain, def: EQ_BANDS_DEFS.HIGH }
        ].forEach(item => {
            if (item.gain !== 0) {
                const eq = ctx.createBiquadFilter();
                eq.type = item.def.type;
                eq.frequency.setValueAtTime(item.def.frequency, scheduledEventTime);
                eq.gain.setValueAtTime(item.gain, scheduledEventTime);
                if (item.def.Q) eq.Q.setValueAtTime(item.def.Q, scheduledEventTime);
                currentNode.connect(eq); currentNode = eq; cleanup.push(eq);
            }
        });
        const gain = ctx.createGain(); cleanup.push(gain);
        const maxFade = audibleDuration / 2;
        const fadeIn = Math.min(ch.fadeInTime || 0, maxFade);
        const fadeOut = Math.min(ch.fadeOutTime || 0, maxFade);
    
        if (fadeIn > 0) {
            gain.gain.setValueAtTime(0, scheduledEventTime);
            gain.gain.linearRampToValueAtTime(1, scheduledEventTime + fadeIn);
        } else {
            gain.gain.setValueAtTime(1, scheduledEventTime);
        }
        if (fadeOut > 0) {
            const fadeOutStart = scheduledEventTime + audibleDuration - fadeOut;
            if (fadeOutStart > scheduledEventTime + fadeIn && fadeOutStart > scheduledEventTime) {
                gain.gain.setValueAtTime(1, fadeOutStart);
                gain.gain.linearRampToValueAtTime(0, scheduledEventTime + audibleDuration);
            } else {
                gain.gain.linearRampToValueAtTime(0, scheduledEventTime + audibleDuration);
            }
        }
        currentNode.connect(gain);
        gain.connect(channelGainNodes[channelIndex]);
    
        source.start(scheduledEventTime, startOffset, durationToPlay); 
    
        State.updateChannel(channelIndex, {
            activePlaybackScheduledTime: scheduledEventTime,
            activePlaybackDuration: audibleDuration,
            activePlaybackTrimStart: ch.trimStart,
            activePlaybackTrimEnd: ch.trimEnd,
            activePlaybackReversed: ch.reverse
        });
    
        scheduledSourcesInfo.push({ nodes: cleanup, scheduledEventTime, channelIndex });
    
        source.onended = () => {
            if (channelIndex === 0 && barActualTimes[scheduledStepOfBar] == null) {
                barActualTimes[scheduledStepOfBar] = {
                    actualEndTime: ctx.currentTime,
                    audibleDurationWhenScheduled: audibleDuration,
                    originalBufferDuration: ch.buffer.duration
                };
            }
          
            scheduledSourcesInfo = scheduledSourcesInfo.filter(info => info.nodes !== cleanup);
            cleanup.forEach(node => { try { node.disconnect(); } catch {} });
            const chState = State.get().channels[channelIndex];
            if (chState && chState.activePlaybackScheduledTime === scheduledEventTime) {
                const stillActive = scheduledSourcesInfo.some(info =>
                    info.channelIndex === channelIndex && info.scheduledEventTime === scheduledEventTime
                );
                if (!stillActive) {
                    State.updateChannel(channelIndex, {
                        activePlaybackScheduledTime: null,
                        activePlaybackDuration: null,
                        activePlaybackReversed: null 
                    });
                }
            }
        };
    });
}


function scheduler() {
    const schedulerEntryTimePerf = performance.now();

    if (expectedSchedulerNextCallPerfTime > 0) {
        const schedulerCallDelay = schedulerEntryTimePerf - expectedSchedulerNextCallPerfTime;
        if (Math.abs(schedulerCallDelay) > 1) {
             console.debug(`[playbackEngine] Scheduler call delay from expected: ${schedulerCallDelay.toFixed(2)} ms. Called at perf_time: ${schedulerEntryTimePerf.toFixed(2)}, Expected around: ${expectedSchedulerNextCallPerfTime.toFixed(2)}`);
        }
    }

    const s = State.get(); // Get current state once
    const secondsPer16thNote = 60.0 / s.bpm / 4;
    const nowCtx = ctx.currentTime;
    let stepsScheduledThisTick = 0;
    let schedulingLoopStartTimePerf = performance.now();

    while (nextStepTime < nowCtx + lookAhead) {
        const barStep = absoluteStep % 16;
        barScheduledTimes[barStep] = nextStepTime;
        
        // Use _currentSchedulerStep for scheduling, which is the precise step index for the pattern
        scheduleStep(_currentSchedulerStep, nextStepTime, barStep);
        stepsScheduledThisTick++;

        nextStepTime += secondsPer16thNote;
        _currentSchedulerStep = (_currentSchedulerStep + 1) % patternLength;
        absoluteStep++;

        if (barStep === 15) {
            const scheduledTimesForCompletedBar = [...barScheduledTimes];
            const actualTimesForCompletedBar = [...barActualTimes];
            const barToLog = barCount;
            setTimeout(() => {
                printBarTimingSummary(barToLog, scheduledTimesForCompletedBar, actualTimesForCompletedBar);
            }, 750);
            barCount++;
            barScheduledTimes = [];
            barActualTimes = []; 
        }
    }
    const schedulingLoopDurationPerf = performance.now() - schedulingLoopStartTimePerf;

    // --- Critical Change Area ---
    // Calculate the step for UI display purposes.
    // This value is purely for the UI and doesn't affect audio scheduling timing.
    const displayStep = getCurrentStepFromContextTime(nowCtx, s.bpm); // Pass current values

    // Update the state with the current step for the UI.
    // THE CRITICAL PART IS HOW `State.subscribe` listeners, ESPECIALLY IN `ui.js`,
    // REACT TO THIS. They must be very lightweight or defer heavy work.
    let stateUpdateStartTimePerf = performance.now();
    State.update({ currentStep: displayStep });
    let stateUpdateDurationPerf = performance.now() - stateUpdateStartTimePerf;
    // --- End Critical Change Area ---
    
    timerId = setTimeout(scheduler, scheduleAheadTime * 1000);
    expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000);

    const schedulerTotalExecutionTimePerf = performance.now() - schedulerEntryTimePerf;
    if (schedulerTotalExecutionTimePerf > 5) {
        console.warn(
            `[playbackEngine] Scheduler total execution time: ${schedulerTotalExecutionTimePerf.toFixed(2)} ms. ` +
            `(Scheduling loop: ${schedulingLoopDurationPerf.toFixed(2)} ms for ${stepsScheduledThisTick} steps; ` +
            `State.update (for currentStep): ${stateUpdateDurationPerf.toFixed(2)} ms)`
        );
    }
}

// Modified to accept nowCtx and bpm to avoid multiple State.get() calls if not needed
function getCurrentStepFromContextTime(contextTime, bpm) {
    if (!playStartTime || playStartTime > contextTime) return 0; // check playStartTime against current contextTime
    const secondsPer16thNote = 60.0 / bpm / 4;
    const elapsed = contextTime - playStartTime;
    return Math.floor(elapsed / secondsPer16thNote) % patternLength;
}

export function stop() {
    if (timerId === null) return;
    console.log('[playbackEngine] STOP called at ctx.currentTime:', ctx.currentTime.toFixed(5));
    
    clearTimeout(timerId);
    timerId = null;
    expectedSchedulerNextCallPerfTime = 0; // Reset for next start

    scheduledSourcesInfo.forEach(info => {
        info.nodes.forEach(node => {
            if (node instanceof AudioBufferSourceNode) {
                try { node.stop(0); } catch {}
            }
            try { node.disconnect(); } catch {}
        });
    });

    scheduledSourcesInfo = [];
    playStartTime = 0;
    _currentSchedulerStep = 0; // Reset internal scheduler step
    absoluteStep = 0;
    barCount = 0;
    barScheduledTimes = [];
    barActualTimes = [];
    
    // This update should also be as lightweight as possible in its impact
    State.update({ playing: false, currentStep: 0 }); 
    State.get().channels.forEach((_ch, idx) => State.updateChannel(idx, {
        activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null
    }));
}

export function start() {
    if (timerId !== null) return;

    ctx.resume().then(() => {
        const nowCtx = ctx.currentTime;
        playStartTime = nowCtx + 0.1; 
        nextStepTime = playStartTime;
        _currentSchedulerStep = 0; // Reset internal scheduler step
        absoluteStep = 0;
        barCount = 0; 
        barScheduledTimes = []; 
        barActualTimes = [];
        expectedSchedulerNextCallPerfTime = performance.now() + (scheduleAheadTime * 1000); // Prime for first scheduler call

        console.log('[playbackEngine] START called. playStartTime set to:', playStartTime.toFixed(5), 'at ctx.currentTime:', nowCtx.toFixed(5));
        
        // This update should ideally be lightweight in its impact
        State.update({ playing: true, currentStep: 0 }); // Set initial currentStep
        
        scheduler(); // Start the loop
    });
}