// Refactored audioProcessor.js with integrated timingManagement
import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';

const SMOOTH_PARAM_TIME = 0.01, A4_NOTE = 69, A4_FREQ = 440, SEMITONE = 2 ** (1 / 12), MIN_NOTE = 21, MAX_NOTE = 108;
let audioContext, mainGainNode, decodedBuffer, reversedBuffer, isReversed = false,
    currentTempo = 78, currentGlobalPitch = 1, currentVolume = 1, originalSampleFrequency,
    sampleType = 'one-shot', midiNoteToPlaybackRate = new Map(), currentLoopingSource;

const timingManager = (() => {
  const INTERVAL = 25, AHEAD = 0.1, DELAY = 0.05;
  let ctx, tempo = 120, pitch = 1, isLooping = false, timeoutId, multiplier = 1,
      cb, startTime = 0, subBeatCount = 0;

  const subBeatDur = () => (tempo > 0 && multiplier > 0) ? 60 / tempo / multiplier : 0;

  const loop = () => {
    if (!isLooping || !ctx) return;
    const now = ctx.currentTime, until = now + AHEAD, dur = subBeatDur();
    if (!dur) return stop();
    while (true) {
      const t = startTime + subBeatCount * dur;
      if (t >= until) break;
      if (typeof cb === 'function') cb(t); else return stop();
      subBeatCount++;
    }
    timeoutId = setTimeout(loop, INTERVAL);
  };

  const stop = (reset = true) => {
    clearTimeout(timeoutId);
    timeoutId = null;
    if (reset) startTime = subBeatCount = 0;
  };

  return {
    init: (_ctx, _tempo, _pitch) => {
      if (!(_ctx instanceof AudioContext)) throw Error('Invalid AudioContext');
      [ctx, tempo, pitch, multiplier, isLooping, cb] = [_ctx, _tempo, _pitch, 1, false, null];
      stop();
    },
    startLoop: f => {
      if (isLooping || !ctx || typeof f !== 'function') return;
      [isLooping, cb, startTime, subBeatCount] = [true, f, ctx.currentTime + DELAY, 0];
      loop();
    },
    stopLoop: () => { if (isLooping) { isLooping = cb = false; stop(); } },
    setTempo: bpm => {
      bpm = +bpm;
      if (bpm <= 0 || Number.isNaN(bpm)) return;
      const t = tempo;
      tempo = bpm;
      if (isLooping && t !== bpm) {
        const f = cb, m = multiplier;
        stop(false); multiplier = m; timingManager.startLoop(f);
      }
    },
    setPitch: r => r > 0 ? (pitch = r) : null,
    setScheduleMultiplier: m => {
      m = parseInt(m, 10);
      if (m < 1 || m === multiplier || !Number.isInteger(m)) return;
      const f = cb;
      multiplier = m;
      if (isLooping && ctx && tempo > 0) {
        stop(false); timingManager.startLoop(f);
      }
    },
    getLoopStartTime: () => startTime,
    getCurrentScheduleMultiplier: () => multiplier,
    getLoopingState: () => isLooping,
    getCurrentTempo: () => tempo,
    getCurrentPitch: () => pitch
  };
})();

const _ensureContext = async () => {
  if (!audioContext) return showError('Audio system not ready.'), false;
  if (audioContext.state === 'suspended') try { await audioContext.resume(); } catch (e) { showError('Could not resume audio.'); throw e; }
  return true;
};

const _selectBuffer = () => {
  const buf = isReversed ? reversedBuffer : decodedBuffer;
  return buf || showError(`Cannot play: ${isReversed ? 'Reversed' : 'Original'} buffer unavailable.`);
};

const _play = (buf, time, rate, loop = false) => {
  if (!buf || !audioContext) return;
  try {
    const src = audioContext.createBufferSource();
    Object.assign(src, { buffer: buf, loop });
    src.playbackRate.value = rate;
    src.connect(mainGainNode);
    triggerAnimation();
    src.start(time);
    return src;
  } catch (e) { showError('Failed to play.'); console.error(e); }
};

const _reverse = buf => {
  const { numberOfChannels, length, sampleRate } = buf;
  const rev = audioContext.createBuffer(numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++)
    buf.getChannelData(ch).forEach((_, i, d) => rev.getChannelData(ch)[i] = d[d.length - 1 - i]);
  return rev;
};

const _setupContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw 'No AudioContext';
  audioContext = new Ctx();
  mainGainNode = audioContext.createGain();
  mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
  mainGainNode.connect(audioContext.destination);
};

const _decodeAndPrepare = async base64 => {
  decodedBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);
  const freq = parseFloat(document.getElementById('audio-meta-frequency')?.textContent || '');
  if (Number.isNaN(freq)) throw showError('Invalid base frequency'), Error('Missing base freq');
  originalSampleFrequency = freq;
  const typeText = (document.getElementById('audio-meta-sample-type') || document.getElementById('audio-meta-loop'))?.textContent.trim().toLowerCase();
  sampleType = (typeText === 'loop' || typeText === 'yes') ? 'loop' : 'one-shot';
  midiNoteToPlaybackRate = new Map(
    Array.from({ length: MAX_NOTE - MIN_NOTE + 1 }, (_, i) => {
      const note = MIN_NOTE + i;
      return [note, (A4_FREQ * SEMITONE ** (note - A4_NOTE)) / originalSampleFrequency];
    })
  );
};

export async function init(base64, tempo = 78, pitch = 1) {
  [currentTempo, currentGlobalPitch, currentVolume, isReversed] = [tempo, pitch, 1, false];
  [audioContext, mainGainNode, decodedBuffer, reversedBuffer, currentLoopingSource] = Array(5).fill(null);
  midiNoteToPlaybackRate.clear(); sampleType = 'one-shot';
  try {
    _setupContext(); await _decodeAndPrepare(base64);
    timingManager.init(audioContext, tempo, pitch);
  } catch (e) { showError(`Audio Init Failed: ${e.message}`); return false; }
  return true;
}

export async function playOnce() {
  if (await _ensureContext() && _selectBuffer()) _play(_selectBuffer(), audioContext.currentTime, currentGlobalPitch);
}

export async function startLoop() {
  if (timingManager.getLoopingState() || !await _ensureContext()) return;
  const buf = _selectBuffer(); if (!buf) return;
  currentLoopingSource?.stop(); currentLoopingSource = null;
  if (sampleType === 'one-shot') {
    timingManager.startLoop(t => _play(buf, t, currentGlobalPitch));
  } else {
    timingManager.startLoop(() => {});
    const t = timingManager.getLoopStartTime() || audioContext.currentTime + 0.05;
    currentLoopingSource = _play(buf, t, currentGlobalPitch, true);
    if (!currentLoopingSource) showError('Looping failed.'), stopLoop();
  }
}

export function stopLoop() {
  timingManager.stopLoop();
  try { currentLoopingSource?.stop(); } catch {}
  currentLoopingSource = null;
}

export function setScheduleMultiplier(m) { timingManager.setScheduleMultiplier(Math.max(1, parseInt(m, 10))); }
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) {
  if (bpm > 0) currentTempo = bpm, timingManager.setTempo(bpm);
}

export function toggleReverse() {
  if (!decodedBuffer || !reversedBuffer) return isReversed;
  const looping = timingManager.getLoopingState();
  if (looping) stopLoop();
  isReversed = !isReversed;
  if (looping) startLoop();
  return isReversed;
}

export function setGlobalPitch(r) {
  if (r > 0 && audioContext) {
    currentGlobalPitch = r;
    timingManager.setPitch(r);
    currentLoopingSource?.playbackRate.setTargetAtTime(r, audioContext.currentTime, SMOOTH_PARAM_TIME);
  }
}

export function setVolume(v) {
  if (v >= 0 && mainGainNode && audioContext)
    currentVolume = v,
    mainGainNode.gain.setTargetAtTime(v, audioContext.currentTime, SMOOTH_PARAM_TIME);
}

export const getLoopingState = () => timingManager.getLoopingState();
export const getReverseState = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext = _ensureContext;
export const getPlaybackRateForNote = n => midiNoteToPlaybackRate.get(n);

export async function playSampleAtRate(r) {
  if (r > 0 && await _ensureContext() && _selectBuffer())
    _play(_selectBuffer(), audioContext.currentTime, r);
}

export const getLoopStartTime = () => timingManager.getLoopStartTime();
export const getCurrentTempo = () => currentTempo;
export const getCurrentPitch = () => currentGlobalPitch;
