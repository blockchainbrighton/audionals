// --- audioProcessor.js — Combined audio processing + timing management module ---
// This single file replaces the previous `audioProcessor.js` **and** `timingManagement.js`.
// Public APIs remain identical, so no other modules need to change their imports.

import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';

// -----------------------------------------------------------------------------
// Audio‑side constants & state
// -----------------------------------------------------------------------------
const SMOOTH_PARAM_TIME = 0.01;
const A4_MIDI_NOTE = 69,
      A4_FREQUENCY = 440,
      SEMITONE_RATIO = 2 ** (1 / 12),
      MIN_MIDI_NOTE = 21,
      MAX_MIDI_NOTE = 108;

let audioContext,
    mainGainNode,
    decodedBuffer,
    reversedBuffer,
    isReversed = false,
    currentTempo = 78,
    currentGlobalPitch = 1,
    currentVolume = 1,
    originalSampleFrequency,
    sampleType = 'one-shot',
    midiNoteToPlaybackRate = new Map(),
    currentLoopingSource;

// -----------------------------------------------------------------------------
// Timing logic (formerly timingManagement.js)  — wrapped in an IIFE to keep
//  internal state private while preserving the original API surface.
// -----------------------------------------------------------------------------
const timingManager = (() => {
  // --- Constants ---
  const SCHEDULER_INTERVAL_MS = 25,
        SCHEDULE_AHEAD_TIME_S = 0.1,
        LOOP_START_DELAY_S = 0.05;

  // --- Module‑level state ---
  let audioContext = null,
      currentTempo = 120,
      currentPitch = 1,
      isLooping = false,
      schedulerTimeoutId = null,
      scheduleMultiplier = 1,
      playCallback = null,
      loopStartTime = 0.0,
      scheduledSubBeatCounter = 0;

  // --- Helpers ---
  const _calculateSubBeatDuration = (bpm, mult) => (bpm > 0 && mult > 0) ? (60 / bpm) / mult : 0;

  function _scheduleLoopIterations() {
    if (!isLooping || !audioContext) return;

    const now = audioContext.currentTime;
    const scheduleUntil = now + SCHEDULE_AHEAD_TIME_S;
    const subBeat = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);

    if (subBeat <= 0) {
      console.error('Invalid sub‑beat duration. Stopping loop.');
      stopLoop();
      return;
    }

    while (true) {
      const target = loopStartTime + (scheduledSubBeatCounter * subBeat);
      if (target >= scheduleUntil) break;
      if (typeof playCallback === 'function') playCallback(target);
      else { console.error('playCallback missing. Stopping loop.'); stopLoop(); return; }
      scheduledSubBeatCounter++;
    }

    schedulerTimeoutId = setTimeout(_scheduleLoopIterations, SCHEDULER_INTERVAL_MS);
  }

  function _stopLoopInternal(reset = true) {
    if (schedulerTimeoutId) clearTimeout(schedulerTimeoutId);
    schedulerTimeoutId = null;
    if (reset) loopStartTime = scheduledSubBeatCounter = 0;
  }

  // --- Public API (mirrors original timingManagement.js exports) ---
  function init(ctx, tempo, pitch) {
    if (!(ctx instanceof AudioContext)) throw new Error('Invalid AudioContext supplied to timingManager.init');
    audioContext   = ctx;
    currentTempo   = tempo;
    currentPitch   = pitch;
    scheduleMultiplier = 1;
    isLooping      = false;
    playCallback   = null;
    _stopLoopInternal(true);
  }

  function startLoop(cb) {
    if (isLooping || !audioContext) { console.warn('Loop already active or audio context unavailable.'); return; }
    if (typeof cb !== 'function')  { console.error('startLoop requires a callback'); return; }

    isLooping    = true;
    playCallback = cb;
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    scheduledSubBeatCounter = 0;

    _scheduleLoopIterations();
  }

  function stopLoop() {
    if (!isLooping) return;
    isLooping    = false;
    playCallback = null;
    _stopLoopInternal(true);
  }

  function setTempo(bpm) {
    bpm = +bpm;
    if (bpm <= 0 || Number.isNaN(bpm)) return console.warn('Invalid tempo', bpm);
    const old = currentTempo;
    currentTempo = bpm;
    if (isLooping && old !== bpm) {
      const cb  = playCallback;
      const mult= scheduleMultiplier;
      stopLoop();
      scheduleMultiplier = mult;
      startLoop(cb);
    }
  }

  function setPitch(rate) {
    if (rate > 0) currentPitch = rate;
    else console.warn('Invalid pitch', rate);
  }

  function setScheduleMultiplier(mult) {
    const m = parseInt(mult, 10);
    if (!Number.isInteger(m) || m < 1) return console.warn('Invalid schedule multiplier', mult);
    if (scheduleMultiplier === m) return;
    scheduleMultiplier = m;

    // realign schedule during active loop
    if (isLooping && audioContext && currentTempo > 0) {
      const changeTime = audioContext.currentTime;
      const elapsed = Math.max(0, changeTime - loopStartTime);
      const newSub = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);
      if (newSub > 0) scheduledSubBeatCounter = Math.floor(elapsed / newSub);
    }
  }

  // Simple getters
  const getLoopStartTime              = () => loopStartTime;
  const getCurrentScheduleMultiplier  = () => scheduleMultiplier;
  const getLoopingState               = () => isLooping;
  const getCurrentTempo               = () => currentTempo;
  const getCurrentPitch               = () => currentPitch;

  // Exposed interface
  return {
    init, startLoop, stopLoop, setTempo, setPitch, setScheduleMultiplier,
    getCurrentScheduleMultiplier, getLoopStartTime,
    getLoopingState, getCurrentTempo, getCurrentPitch
  };
})();

// -----------------------------------------------------------------------------
// Audio helpers
// -----------------------------------------------------------------------------
async function _ensureContext() {
  if (!audioContext) { showError('Audio system not ready.'); return false; }
  if (audioContext.state === 'suspended') {
    try { await audioContext.resume(); } catch (e) { showError('Could not resume audio context.'); throw e; }
  }
  return true;
}

function _selectBuffer() {
  const buf = isReversed ? reversedBuffer : decodedBuffer;
  if (!buf) showError(`Cannot play: ${isReversed ? 'Reversed' : 'Original'} buffer unavailable.`);
  return buf;
}

function _play(buf, time, rate, loop = false, oneshot = false) {
  if (!buf) return null;
  try {
    const src = audioContext.createBufferSource();
    src.buffer          = buf;
    src.playbackRate.value = rate;
    if (loop && !oneshot) src.loop = true;
    src.connect(mainGainNode);
    triggerAnimation();
    src.start(time);
    if (loop) src.addEventListener('ended', () => currentLoopingSource === src && (currentLoopingSource = null));
    return src;
  } catch (err) {
    showError('Failed to play audio.');
    console.error(err);
    return null;
  }
}

function _reverse(buf) {
  if (!buf) return null;
  const { numberOfChannels, length, sampleRate } = buf;
  const rev = audioContext.createBuffer(numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    const r = rev.getChannelData(ch);
    for (let i = 0, j = length - 1; i < length; i++, j--) r[i] = d[j];
  }
  return rev;
}

function _setupContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw 'No AudioContext available';
    audioContext = new Ctx();
    mainGainNode = audioContext.createGain();
    mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
    mainGainNode.connect(audioContext.destination);
  } catch (e) {
    showError(`Audio Setup Error: ${e}`);
    audioContext = mainGainNode = null;
    throw e;
  }
}

async function _decodeAndPrepare(base64) {
  decodedBuffer  = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);

  // Read base frequency & sample type from hidden HTML meta tags
  const freq = parseFloat(document.getElementById('audio-meta-frequency')?.textContent || '');
  if (!freq) { showError('Missing base frequency.'); throw new Error('Base frequency missing'); }
  originalSampleFrequency = freq;

  const typeText = document.getElementById('audio-meta-sample-type')?.textContent.trim().toLowerCase();
  sampleType = typeText === 'loop' ? 'loop' : 'one-shot';

  // Build MIDI‑note lookup table for pitch‑correct playback
  midiNoteToPlaybackRate = new Map(
    Array.from({ length: MAX_MIDI_NOTE - MIN_MIDI_NOTE + 1 }, (_, idx) => {
      const note = MIN_MIDI_NOTE + idx;
      const rate = (A4_FREQUENCY * SEMITONE_RATIO ** (note - A4_MIDI_NOTE)) / originalSampleFrequency;
      return [note, rate];
    })
  );
}

// -----------------------------------------------------------------------------
// Public API — everything callers used to get from audioProcessor **or** timingManagement
// -----------------------------------------------------------------------------
export async function init(base64, tempo = 78, pitch = 1) {
  currentTempo        = tempo > 0 ? tempo : 78;
  currentGlobalPitch  = pitch > 0 ? pitch : 1;

  [audioContext, mainGainNode, decodedBuffer, reversedBuffer] = [null, null, null, null];
  midiNoteToPlaybackRate.clear();
  isReversed = false;

  _setupContext();
  await _decodeAndPrepare(base64);
  timingManager.init(audioContext, currentTempo, currentGlobalPitch);
  return true;
}

export async function playOnce() {
  if (!await _ensureContext()) return;
  _play(_selectBuffer(), audioContext.currentTime, currentGlobalPitch, false, true);
}

export async function startLoop() {
  if (timingManager.getLoopingState()) return;
  if (!await _ensureContext()) return;
  if (!_selectBuffer()) return;

  currentLoopingSource?.stop();
  currentLoopingSource = null;

  if (sampleType === 'one-shot') {
    timingManager.startLoop(time => _play(_selectBuffer(), time, currentGlobalPitch, false, true));
  } else {
    timingManager.startLoop(() => {}); // silent scheduler, audioSource handles loop
    const t = timingManager.getLoopStartTime() || audioContext.currentTime + 0.05;
    currentLoopingSource = _play(_selectBuffer(), t, currentGlobalPitch, true, false);
    if (!currentLoopingSource) { showError('Failed to start looping audio.'); stopLoop(); }
  }
}

export function stopLoop() {
  timingManager.stopLoop();
  currentLoopingSource?.stop();
  currentLoopingSource = null;
}

export function setScheduleMultiplier(m) {
  timingManager.setScheduleMultiplier(Math.max(1, parseInt(m, 10)));
}
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) {
  if (bpm > 0) {
    const wasLooping = timingManager.getLoopingState();
    const prevTempo  = currentTempo;
    currentTempo     = bpm;
    timingManager.setTempo(bpm);
    if (wasLooping && sampleType === 'loop' && bpm !== prevTempo) { stopLoop(); startLoop(); }
  }
}

export function toggleReverse() {
  if (!isReversed && !reversedBuffer) return isReversed; // reversed not available

  const wasLooping = timingManager.getLoopingState();
  if (wasLooping && sampleType === 'loop') stopLoop();
  isReversed = !isReversed;
  if (wasLooping) startLoop();
  return isReversed;
}

export function setGlobalPitch(rate) {
  if (rate > 0) {
    currentGlobalPitch = rate;
    timingManager.setPitch(rate);
  }
}

export function setVolume(v) {
  if (v >= 0) {
    currentVolume = v;
    mainGainNode?.gain.setTargetAtTime(v, audioContext.currentTime, SMOOTH_PARAM_TIME);
  }
}

// --- Convenience getters (legacy compatibility) --------------------------------
export const getLoopingState      = () => timingManager.getLoopingState();
export const getReverseState      = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext        = _ensureContext;

export const getPlaybackRateForNote = note => midiNoteToPlaybackRate.get(note);

export async function playSampleAtRate(rate) {
  if (rate > 0 && await _ensureContext())
    _play(_selectBuffer(), audioContext.currentTime, rate, false, true);
}

// --- Re‑export a few timing helpers in case external code relied on them -------
export const getLoopStartTime = () => timingManager.getLoopStartTime();
export const getCurrentTempo  = () => timingManager.getCurrentTempo();
export const getCurrentPitch  = () => timingManager.getCurrentPitch();

// --- END OF FILE audioProcessor.js ---



// start of midiHandler.js:

