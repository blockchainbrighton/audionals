// --- START OF FILE audioProcessor.js ---
// --- Module Imports ---
import { base64ToArrayBuffer } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // Utility for Base64 conversion
import { showError } from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // UI function to display errors
import { triggerAnimation as triggerImageAnimation } from "/content/934cf04352b9a33a362848a4fd148388f5a3997578fbdfaabd116a8f2932f7b5i0"; // Function to trigger image animation on play
import * as timingManager from "/content/7a20b480b6322d5f85a3c7471c2dda138473073425bdb54356c03ef19937e960i0"; // Manages looping and scheduling


const SMOOTH_PARAM_TIME = 0.01;
const A4_MIDI_NOTE = 69, A4_FREQUENCY = 440, SEMITONE_RATIO = 2 ** (1/12),
      MIN_MIDI_NOTE = 21, MAX_MIDI_NOTE = 108;
let audioContext, mainGainNode, decodedBuffer, reversedBuffer,
    isReversed = false, currentTempo = 78, currentGlobalPitch = 1,
    currentVolume = 1, originalSampleFrequency, sampleType = 'one-shot',
    midiNoteToPlaybackRate = new Map(), currentLoopingSource;

async function _ensureContext() {
  if (!audioContext) return showError("Audio system not ready."), false;
  if (audioContext.state === 'suspended') {
    try { await audioContext.resume(); } catch (e) {
      showError("Could not resume audio context."); throw e;
    }
  }
  return true;
}

function _selectBuffer() {
  const buf = isReversed ? reversedBuffer : decodedBuffer;
  if (!buf) showError(`Cannot play: ${isReversed?'Reversed':'Original'} buffer unavailable.`);
  return buf;
}

function _play(buf, time, rate, loop = false, oneshot = false) {
  if (!buf) return null;
  try {
    const src = audioContext.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    if (loop && !oneshot) src.loop = true;
    src.connect(mainGainNode); triggerAnimation();
    src.start(time);
    if (loop) src.addEventListener('ended', () => currentLoopingSource === src && (currentLoopingSource = null));
    return src;
  } catch {
    showError("Failed to play audio.");
    return null;
  }
}

function _reverse(buf) {
  if (!buf) return null;
  const { numberOfChannels, length, sampleRate } = buf;
  const rev = audioContext.createBuffer(numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const d = buf.getChannelData(ch), r = rev.getChannelData(ch);
    for (let i = 0, j = length - 1; i < length; i++, j--) r[i] = d[j];
  }
  return rev;
}

function _setupContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw "No AudioContext";
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
  decodedBuffer = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);
  const freqText = document.getElementById('audio-meta-frequency')?.textContent || '';
  const freq = parseFloat(freqText);
  if (!freq) throw showError("Missing base frequency."), new Error("No freq");
  originalSampleFrequency = freq;
  const typeText = document.getElementById('audio-meta-sample-type')?.textContent.trim().toLowerCase();
  sampleType = (typeText === 'loop' ? 'loop' : 'one-shot');
  midiNoteToPlaybackRate = new Map(
    Array.from({ length: MAX_MIDI_NOTE - MIN_MIDI_NOTE + 1 }, (_, i) => {
      const n = MIN_MIDI_NOTE + i;
      return [n, A4_FREQUENCY * SEMITONE_RATIO ** (n - A4_MIDI_NOTE) / originalSampleFrequency];
    })
  );
}

export async function init(base64, tempo, pitch) {
  currentTempo = tempo > 0 ? tempo : 78;
  currentGlobalPitch = pitch > 0 ? pitch : 1;
  [audioContext, mainGainNode, decodedBuffer, reversedBuffer] = [null, null, null, null];
  midiNoteToPlaybackRate.clear(); isReversed = false;
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
  currentLoopingSource?.stop(); currentLoopingSource = null;
  if (sampleType === 'one-shot') {
    timingManager.startLoop(time => _play(_selectBuffer(), time, currentGlobalPitch, false, true));
  } else {
    timingManager.startLoop(() => {});
    const t = timingManager.getLoopStartTime?.() || audioContext.currentTime + 0.05;
    currentLoopingSource = _play(_selectBuffer(), t, currentGlobalPitch, true, false);
    if (!currentLoopingSource) showError("Failed to start looping audio."), stopLoop();
  }
}

export function stopLoop() {
  timingManager.stopLoop();
  currentLoopingSource && currentLoopingSource.stop();
  currentLoopingSource = null;
}

export function setScheduleMultiplier(m) { timingManager.setScheduleMultiplier(Math.max(1, parseInt(m, 10))); }
export function getScheduleMultiplier() { return timingManager.getCurrentScheduleMultiplier?.() || 1; }

export function setTempo(bpm) {
  if (bpm > 0) {
    const was = timingManager.getLoopingState(), old = currentTempo;
    currentTempo = bpm; timingManager.setTempo(bpm);
    if (was && sampleType === 'loop' && bpm !== old) stopLoop(), startLoop();
  }
}

export function toggleReverse() {
  if (!isReversed && !reversedBuffer) return isReversed;
  const was = timingManager.getLoopingState();
  if (was && sampleType === 'loop') stopLoop();
  isReversed = !isReversed;
  if (was) startLoop();
  return isReversed;
}

export function setGlobalPitch(r) { if (r > 0) { currentGlobalPitch = r; timingManager.setPitch(r); } }
export function setVolume(v) { if (v >= 0) { currentVolume = v; mainGainNode?.gain.setTargetAtTime(v, audioContext.currentTime, SMOOTH_PARAM_TIME); } }

export const getLoopingState = () => timingManager.getLoopingState?.() || false;
export const getReverseState = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext = _ensureContext;

export function getPlaybackRateForNote(n) { return midiNoteToPlaybackRate.get(n); }
export async function playSampleAtRate(rate) {
  if (rate > 0 && await _ensureContext()) _play(_selectBuffer(), audioContext.currentTime, rate, false, true);
}


// --- END OF FILE audioProcessor.js ---