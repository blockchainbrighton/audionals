/***********************************************************************
 * playbackEngine.js – Accurate, drift-proof, infinitely-scheduled playback engine
 ***********************************************************************/
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0;


let internalPlayStartTime = 0;
let nextStep = 0;
let timer = null;
const lookAhead = 0.12;    // seconds of schedule-ahead time
const tickMs = 25;
let scheduledSourcesInfo = [];
const patternLength = 64;  // Could be made dynamic

// Timing debug collections
let absoluteStep = 0;    // Total steps scheduled since playback started
let barCount = 0;
let barScheduledTimes = [];
let barActualTimes = [];

// Print a timing summary after each 16-step bar
function printBarTimingSummary(barNumber) {
  console.groupCollapsed(`⏱️ Step timing for Bar ${barNumber + 1}`);
  for (let i = 0; i < 16; ++i) {
    const scheduled = barScheduledTimes[i]?.toFixed(5);
    const actual = barActualTimes[i]?.toFixed(5) ?? "(pending)";
    console.log(
      `Step ${i + 1}`.padEnd(7),
      `| Scheduled: ${scheduled} s`.padEnd(22),
      `| Actual: ${actual} s`,
      barActualTimes[i] == null ? '⏳' : ''
    );
  }
  // Print drift per step if all played
  if (barActualTimes.every(t => typeof t === 'number')) {
    let sumDrift = 0;
    barScheduledTimes.forEach((sched, i) => {
      if (barActualTimes[i] != null) sumDrift += Math.abs(barActualTimes[i] - sched);
    });
    const avgDrift = (sumDrift / 16).toFixed(6);
    console.log(`Avg drift this bar: ${avgDrift} s`);
  }
  console.groupEnd();
}

// Schedule playback for a single step
function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
    const s = State.get();
    s.channels.forEach((ch, channelIndex) => {
      if (!channelGainNodes[channelIndex]) return;
      const bufferToPlay = ch.reverse ? ch.reversedBuffer : ch.buffer;
      if (!bufferToPlay || !ch.steps[stepIdx]) return;
  
      const source = ctx.createBufferSource();
      source.buffer = bufferToPlay;
      source.playbackRate.value = Math.pow(2, (ch.pitch || 0) / 12);

    const dur = ch.buffer.duration;
    let trimStart = ch.trimStart ?? 0, trimEnd = ch.trimEnd ?? 1;
    let startOffset = ch.reverse ? dur * (1 - trimEnd) : dur * trimStart;
    let duration = dur * (trimEnd - trimStart);
    duration = Math.max(0.001, duration);
    const audibleDuration = duration / source.playbackRate.value;

    let currentNode = source;
    const cleanup = [source];

    // FX
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
    // Fades
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

    source.start(scheduledEventTime, startOffset, duration);

    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: scheduledEventTime,
      activePlaybackDuration: audibleDuration,
      activePlaybackTrimStart: ch.trimStart,
      activePlaybackTrimEnd: ch.trimEnd,
      activePlaybackReversed: ch.reverse
    });

    scheduledSourcesInfo.push({ nodes: cleanup, scheduledEventTime, channelIndex });

    // Onended: store actual time for bar summary if first channel
    source.onended = () => {
        if (channelIndex === 0 && barActualTimes[scheduledStepOfBar] == null) {
          barActualTimes[scheduledStepOfBar] = ctx.currentTime;
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

function getCurrentStepFromContextTime() {
    if (!playStartTime) return 0;
    const s = State.get();
    const secondsPerBeat = 60.0 / s.bpm;
    const secondsPer16thNote = secondsPerBeat / 4;
    const elapsed = ctx.currentTime - playStartTime;
    if (elapsed < 0) return 0;
    return Math.floor(elapsed / secondsPer16thNote) % 64;
  }

function scheduler() {
    const s = State.get();
    const spb = 60.0 / s.bpm;
    const s16 = spb / 4;
    const now = ctx.currentTime;
  
    // Schedule as many steps as fit in the lookahead window
    while (internalPlayStartTime + nextStep * s16 < now + lookAhead) {
      // Which step of the current bar is this?
      const barStep = absoluteStep % 16;
  
      // Store scheduled time for this step of the current bar
      barScheduledTimes[barStep] = internalPlayStartTime + nextStep * s16;
  
      // Schedule audio
      scheduleStep(nextStep % patternLength, internalPlayStartTime + nextStep * s16, barStep);
  
      // Advance counters
      State.update({ currentStep: nextStep % patternLength });
      nextStep++;
      absoluteStep++;
  
      // If we've just scheduled the last step of a bar (barStep == 15)
      if (barStep === 15) {
        // Print after a brief delay to allow .onended events to fire
        setTimeout(() => {
          printBarTimingSummary(barCount);
          barScheduledTimes = [];
          barActualTimes = [];
          barCount++;
        }, 35);
      }
    }
  }


  export function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    State.update({ playing: false, currentStep: 0 });
    scheduledSourcesInfo.forEach(info => {
      info.nodes.forEach(node => {
        if (node instanceof AudioBufferSourceNode) try { node.stop(0); } catch {}
        try { node.disconnect(); } catch {}
      });
    });
    scheduledSourcesInfo = [];
    playStartTime = 0;
    internalPlayStartTime = 0;
    nextStep = 0;
    barScheduledTimes = [];
    barActualTimes = [];
    barCount = 0;
    absoluteStep = 0;
    State.get().channels.forEach((_ch, idx) => State.updateChannel(idx, {
      activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null
    }));
  }
  
  export function start() {
    if (timer) return;
    ctx.resume().then(() => {
      internalPlayStartTime = ctx.currentTime + 0.05;
      playStartTime = internalPlayStartTime;
      nextStep = 0;
      barScheduledTimes = [];
      barActualTimes = [];
      barCount = 0;
      absoluteStep = 0;
      State.update({ playing: true, currentStep: 0 });
      scheduler();
      timer = setInterval(scheduler, tickMs);
    });
  }