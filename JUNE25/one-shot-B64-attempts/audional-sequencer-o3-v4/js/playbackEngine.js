// playbackEngine.js
import State from './state.js';
import { ctx, channelGainNodes, EQ_BANDS_DEFS } from './audioCore.js';

export let playStartTime = 0; 

let internalPlayStartTime = 0; 
let nextStep = 0;
let timer = null;
const lookAhead = 0.1; 
const tickMs = 25;   

let scheduledSourcesInfo = [];

function scheduleStep(stepIdx, scheduledEventTime) {
  const s = State.get();
  s.channels.forEach((ch, channelIndex) => {
    if (!channelGainNodes[channelIndex]) return;
    
    const bufferToPlay = ch.reverse ? ch.reversedBuffer : ch.buffer;
    if (!bufferToPlay || !ch.steps[stepIdx]) return;

    const source = ctx.createBufferSource();
    source.buffer = bufferToPlay;
    
    const playbackRate = Math.pow(2, (ch.pitch || 0) / 12);
    source.playbackRate.value = playbackRate;

    const originalBufferDuration = ch.buffer.duration; // Duration calculation always based on original forward buffer
    let trimStartRatio = ch.trimStart ?? 0;
    let trimEndRatio = ch.trimEnd ?? 1;

    let startOffsetOriginal, durationOriginalSegment;

    if (ch.reverse) {
        // When reversed, the segment is defined by [1-trimEnd, 1-trimStart] on the reversedBuffer
        startOffsetOriginal = originalBufferDuration * (1.0 - trimEndRatio);
        durationOriginalSegment = originalBufferDuration * (trimEndRatio - trimStartRatio);
    } else {
        startOffsetOriginal = originalBufferDuration * trimStartRatio;
        durationOriginalSegment = originalBufferDuration * (trimEndRatio - trimStartRatio);
    }
    durationOriginalSegment = Math.max(0.001, durationOriginalSegment);
    const audibleDurationPitched = durationOriginalSegment / playbackRate;

    let currentNode = source;
    const nodesToCleanThisEvent = [source];

    // HPF
    if (ch.hpfCutoff > 20) {
        const hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.setValueAtTime(ch.hpfCutoff, scheduledEventTime);
        hpf.Q.setValueAtTime(ch.hpfQ || 0.707, scheduledEventTime);
        currentNode.connect(hpf); currentNode = hpf; nodesToCleanThisEvent.push(hpf);
    }
    // LPF
    if (ch.lpfCutoff < 20000) {
        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(ch.lpfCutoff, scheduledEventTime);
        lpf.Q.setValueAtTime(ch.lpfQ || 0.707, scheduledEventTime);
        currentNode.connect(lpf); currentNode = lpf; nodesToCleanThisEvent.push(lpf);
    }
    // EQ
    [
        { gain: ch.eqLowGain, def: EQ_BANDS_DEFS.LOW },
        { gain: ch.eqMidGain, def: EQ_BANDS_DEFS.MID },
        { gain: ch.eqHighGain, def: EQ_BANDS_DEFS.HIGH },
    ].forEach(item => {
        if (item.gain !== 0) {
            const eqBand = ctx.createBiquadFilter();
            eqBand.type = item.def.type;
            eqBand.frequency.setValueAtTime(item.def.frequency, scheduledEventTime);
            eqBand.gain.setValueAtTime(item.gain, scheduledEventTime);
            if (item.def.Q) eqBand.Q.setValueAtTime(item.def.Q, scheduledEventTime);
            currentNode.connect(eqBand); currentNode = eqBand; nodesToCleanThisEvent.push(eqBand);
        }
    });
    // Segment Gain (Fades)
    const segmentGain = ctx.createGain();
    nodesToCleanThisEvent.push(segmentGain);
    const maxFade = audibleDurationPitched / 2;
    const fadeInSec = Math.min(ch.fadeInTime || 0, maxFade);
    const fadeOutSec = Math.min(ch.fadeOutTime || 0, maxFade);

    if (fadeInSec > 0) {
        segmentGain.gain.setValueAtTime(0, scheduledEventTime);
        segmentGain.gain.linearRampToValueAtTime(1, scheduledEventTime + fadeInSec);
    } else {
        segmentGain.gain.setValueAtTime(1, scheduledEventTime);
    }
    if (fadeOutSec > 0) {
        const fadeOutStartTime = scheduledEventTime + audibleDurationPitched - fadeOutSec;
        // Ensure fadeOutStartTime is not before fadeIn completion or before current time
        if (fadeOutStartTime > scheduledEventTime + fadeInSec && fadeOutStartTime > scheduledEventTime) {
             segmentGain.gain.setValueAtTime(1, fadeOutStartTime); // Hold full volume until fade out starts
             segmentGain.gain.linearRampToValueAtTime(0, scheduledEventTime + audibleDurationPitched);
        } else { // If fades overlap significantly or duration is too short, just fade out over the whole segment after potential fade in
            segmentGain.gain.linearRampToValueAtTime(0, scheduledEventTime + audibleDurationPitched);
        }
    }
    
    currentNode.connect(segmentGain);
    segmentGain.connect(channelGainNodes[channelIndex]);
    source.start(scheduledEventTime, startOffsetOriginal, durationOriginalSegment);
    
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: scheduledEventTime,
      activePlaybackDuration: audibleDurationPitched, 
      activePlaybackTrimStart: ch.trimStart, // Store the fwd trim used
      activePlaybackTrimEnd: ch.trimEnd,     // Store the fwd trim used
      activePlaybackReversed: ch.reverse,    // Store if it was reversed
    });

    scheduledSourcesInfo.push({ nodes: nodesToCleanThisEvent, scheduledEventTime, channelIndex });

    source.onended = () => {
      scheduledSourcesInfo = scheduledSourcesInfo.filter(info => info.nodes !== nodesToCleanThisEvent);
      nodesToCleanThisEvent.forEach(node => { try { node.disconnect(); } catch {} });
      const currentChannelState = State.get().channels[channelIndex];
      if (currentChannelState && currentChannelState.activePlaybackScheduledTime === scheduledEventTime) {
        const otherActiveSoundsForThisTime = scheduledSourcesInfo.some(info => 
            info.channelIndex === channelIndex && info.scheduledEventTime === scheduledEventTime);
        if (!otherActiveSoundsForThisTime) {
            State.updateChannel(channelIndex, { activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackReversed: null });
        }
      }
    };
  });
}

function scheduler() {
  const s = State.get();
  const secondsPerBeat = 60.0 / s.bpm;
  const secondsPer16thNote = secondsPerBeat / 4;
  const currentTime = ctx.currentTime;

  while (internalPlayStartTime + nextStep * secondsPer16thNote < currentTime + lookAhead) {
    const scheduledEventTime = internalPlayStartTime + nextStep * secondsPer16thNote;
    scheduleStep(nextStep % 64, scheduledEventTime);
    State.update({ currentStep: nextStep % 64 });
    nextStep++;
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

  const currentChannels = State.get().channels;
  currentChannels.forEach((_ch, channelIndex) => {
    State.updateChannel(channelIndex, {
      activePlaybackScheduledTime: null,
      activePlaybackDuration: null,
      activePlaybackReversed: null
    });
  });
}

export function start() {
  if (timer) return;
  ctx.resume().then(() => {
    internalPlayStartTime = ctx.currentTime + 0.05;
    playStartTime = internalPlayStartTime;
    nextStep = 0;
    State.update({ playing: true, currentStep: 0 });
    scheduler();
    timer = setInterval(scheduler, tickMs);
  });
}