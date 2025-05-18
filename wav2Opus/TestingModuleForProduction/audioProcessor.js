// --- audioProcessor.js — Combined audio processing + timing management module ---
// This single file replaces the previous `audioProcessor.js` **and** `timingManagement.js`.
// Public APIs remain identical, so no other modules need to change their imports.

import { base64ToArrayBuffer } from './utils.js';
import { showError, triggerAnimation } from './uiUpdater.js';

// -----------------------------------------------------------------------------
// Audio‑side constants & state
// -----------------------------------------------------------------------------
const SMOOTH_PARAM_TIME = 0.01; // Time constant for smooth parameter changes
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
    sampleType = 'one-shot', // Default to 'one-shot'
    midiNoteToPlaybackRate = new Map(),
    currentLoopingSource; // Holds the reference to the AudioBufferSourceNode if sampleType is 'loop'

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
      currentPitch = 1, // This pitch is for timingManager's own state, not directly used for buffer playback rate here
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
      stopLoop(); // timingManager's stopLoop
      return;
    }

    while (true) {
      const target = loopStartTime + (scheduledSubBeatCounter * subBeat);
      if (target >= scheduleUntil) break;
      if (typeof playCallback === 'function') playCallback(target);
      else { console.error('playCallback missing. Stopping loop.'); stopLoop(); return; } // timingManager's stopLoop
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
    currentPitch   = pitch; // Store pitch for timingManager state
    scheduleMultiplier = 1;
    isLooping      = false;
    playCallback   = null;
    _stopLoopInternal(true);
  }

  function startLoop(cb) { // timingManager's startLoop
    if (isLooping || !audioContext) { console.warn('TimingManager: Loop already active or audio context unavailable.'); return; }
    if (typeof cb !== 'function')  { console.error('TimingManager.startLoop requires a callback'); return; }

    isLooping    = true;
    playCallback = cb;
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    scheduledSubBeatCounter = 0;

    _scheduleLoopIterations();
  }

  function stopLoop() { // timingManager's stopLoop
    if (!isLooping) return;
    isLooping    = false;
    playCallback = null; // Clear callback
    _stopLoopInternal(true);
  }

  function setTempo(bpm) {
    bpm = +bpm;
    if (bpm <= 0 || Number.isNaN(bpm)) return console.warn('Invalid tempo', bpm);
    const oldTempo = currentTempo;
    currentTempo = bpm;

    if (isLooping && oldTempo !== bpm) {
      const cb  = playCallback;
      const mult= scheduleMultiplier;
      _stopLoopInternal(false); // Preserve counters for smoother transition if possible, though startLoop resets them
      scheduleMultiplier = mult; // Restore multiplier
      startLoop(cb); // This will re-initialize loopStartTime and counters
    }
  }

  function setPitch(rate) { // timingManager's setPitch
    if (rate > 0) currentPitch = rate;
    else console.warn('Invalid pitch for timingManager', rate);
  }

  function setScheduleMultiplier(mult) {
    const m = parseInt(mult, 10);
    if (!Number.isInteger(m) || m < 1) return console.warn('Invalid schedule multiplier', mult);
    if (scheduleMultiplier === m) return;
    
    const oldMultiplier = scheduleMultiplier;
    scheduleMultiplier = m;

    // realign schedule during active loop
    if (isLooping && audioContext && currentTempo > 0 && oldMultiplier !== scheduleMultiplier) {
        // Restart the scheduler to apply the new multiplier correctly
        const cb = playCallback;
        _stopLoopInternal(false); // Stop current scheduling
        startLoop(cb); // Restart with new multiplier
    }
  }

  // Simple getters
  const getLoopStartTime              = () => loopStartTime;
  const getCurrentScheduleMultiplier  = () => scheduleMultiplier;
  const getLoopingState               = () => isLooping;
  const getCurrentTempo               = () => currentTempo;
  const getCurrentPitch               = () => currentPitch; // timingManager's pitch

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

// Modified _play to clearly distinguish AudioBufferSourceNode's loop property
function _play(buf, time, rate, useAudioBufferSourceLoop = false) {
  if (!buf || !audioContext) return null;
  try {
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    if (useAudioBufferSourceLoop) { // This flag explicitly controls src.loop
        src.loop = true;
    }
    src.connect(mainGainNode);
    triggerAnimation();
    src.start(time);
    
    // If this source is the main looping one, manage its reference for stopping
    if (useAudioBufferSourceLoop) {
        src.addEventListener('ended', () => {
            // This 'ended' event fires if src.stop() is called.
            // We only clear currentLoopingSource if it's this exact source.
            if (currentLoopingSource === src) {
                // console.log("AudioBufferSourceNode with loop=true ended/stopped.");
                // currentLoopingSource = null; // Cleared in stopLoop() or when restarting
            }
        });
    }
    return src;
  } catch (err) {
    showError('Failed to play audio.');
    console.error(err);
    return null;
  }
}


function _reverse(buf) {
  if (!buf || !audioContext) return null;
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
  if (!audioContext) throw new Error("AudioContext not initialized before decoding.");
  decodedBuffer  = await audioContext.decodeAudioData(base64ToArrayBuffer(base64));
  reversedBuffer = _reverse(decodedBuffer);

  const freqEl = document.getElementById('audio-meta-frequency');
  const freq = parseFloat(freqEl?.textContent || '');
  if (!freqEl || !freq || Number.isNaN(freq)) {
    showError('Missing or invalid base frequency in metadata (audio-meta-frequency).');
    throw new Error('Base frequency missing or invalid');
  }
  originalSampleFrequency = freq;

  // --- MODIFIED PART FOR SAMPLE TYPE DETECTION ---
  let typeEl = document.getElementById('audio-meta-sample-type');
  let sourceOfTypeText = "id 'audio-meta-sample-type'";

  if (!typeEl) {
    console.log("AudioProcessor: Element with id 'audio-meta-sample-type' not found. Trying id 'audio-meta-loop'.");
    typeEl = document.getElementById('audio-meta-loop'); // Fallback ID
    sourceOfTypeText = "id 'audio-meta-loop'";
  }

  const typeText = typeEl ? typeEl.textContent.trim().toLowerCase() : ''; 
  
  if (typeEl) {
    console.log(`AudioProcessor: Found element with ${sourceOfTypeText}. Raw text content: "${typeEl.textContent}". Normalized: "${typeText}"`);
  } else {
    console.log(`AudioProcessor: Neither element with id 'audio-meta-sample-type' nor 'audio-meta-loop' found. Defaulting sampleType to 'one-shot'.`);
  }

  sampleType = (typeText === 'loop' || typeText === 'yes') ? 'loop' : 'one-shot';
  console.log(`AudioProcessor: Final sampleType determined as: '${sampleType}' (derived from text: "${typeText}" from element with ${sourceOfTypeText}).`);
  // --- END OF MODIFIED PART ---

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
  currentVolume       = 1; // Default volume

  [audioContext, mainGainNode, decodedBuffer, reversedBuffer, currentLoopingSource] = [null, null, null, null, null];
  midiNoteToPlaybackRate.clear();
  isReversed = false;
  sampleType = 'one-shot'; // Reset sample type before decoding

  try {
    _setupContext();
    await _decodeAndPrepare(base64);
    timingManager.init(audioContext, currentTempo, currentGlobalPitch); // Pass global pitch to timingManager for its state
  } catch (error) {
    console.error("Error during audio initialization:", error);
    showError(`Audio Init Failed: ${error.message}`);
    return false; // Indicate failure
  }
  return true;
}

export async function playOnce() {
  if (!await _ensureContext() || !_selectBuffer()) return;
  _play(_selectBuffer(), audioContext.currentTime, currentGlobalPitch, false); // false for useAudioBufferSourceLoop
}

export async function startLoop() { // This is the main exported startLoop
  if (timingManager.getLoopingState()) return; // Already looping (either type)
  if (!await _ensureContext()) return;
  
  const bufferToPlay = _selectBuffer();
  if (!bufferToPlay) return;

  // Stop any existing continuously looping source explicitly before starting a new one
  if (currentLoopingSource) {
    currentLoopingSource.stop();
    currentLoopingSource = null;
  }

  if (sampleType === 'one-shot') {
    // For one-shot samples, timingManager schedules individual plays
    timingManager.startLoop(time => _play(bufferToPlay, time, currentGlobalPitch, false)); // false for useAudioBufferSourceLoop
  } else { // sampleType === 'loop'
    // For 'loop' samples, timingManager's callback is a no-op.
    // AudioBufferSourceNode handles its own looping.
    timingManager.startLoop(() => {}); // Silent scheduler
    const startTime = timingManager.getLoopStartTime() || (audioContext.currentTime + 0.05); // Use timingManager's start time
    currentLoopingSource = _play(bufferToPlay, startTime, currentGlobalPitch, true); // true for useAudioBufferSourceLoop
    if (!currentLoopingSource) {
      showError('Failed to start looping audio.');
      stopLoop(); // Full stop if source creation failed
    }
  }
}

export function stopLoop() { // This is the main exported stopLoop
  timingManager.stopLoop(); // Stop the timingManager's scheduler regardless of sampleType
  if (currentLoopingSource) {
    try {
        currentLoopingSource.stop();
    } catch (e) {
        // console.warn("Error stopping currentLoopingSource (might have already stopped or not started):", e.message);
    }
    currentLoopingSource = null;
  }
}

export function setScheduleMultiplier(m) {
  timingManager.setScheduleMultiplier(Math.max(1, parseInt(m, 10)));
}
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) {
  if (bpm > 0) {
    currentTempo = bpm;
    // timingManager handles its own restart logic if its tempo changes while its loop is active.
    // This is fine for 'one-shot' types.
    // For 'loop' types, the timingManager's scheduler callback is empty, so its restart
    // doesn't re-trigger the AudioBufferSourceNode.
    timingManager.setTempo(bpm);
  }
}

export function toggleReverse() {
  if (!decodedBuffer || !reversedBuffer) { // Buffers must exist
    console.warn("Cannot toggle reverse: Buffers not ready.");
    return isReversed;
  }
  // No need for: if (!isReversed && !reversedBuffer) return isReversed; as covered by above.

  const wasLooping = timingManager.getLoopingState();
  if (wasLooping) {
    // If it was any kind of loop, stop it fully before changing state.
    // This ensures currentLoopingSource is also stopped if it was a 'loop' type.
    stopLoop(); 
  }
  
  isReversed = !isReversed;
  
  if (wasLooping) {
    startLoop(); // Restart the loop; startLoop will use the new _selectBuffer()
  }
  return isReversed;
}

export function setGlobalPitch(rate) {
  if (rate > 0 && audioContext) {
    currentGlobalPitch = rate;
    timingManager.setPitch(rate); // Update timingManager's pitch state as well

    if (sampleType === 'loop' && currentLoopingSource) {
      // If it's a self-looping AudioBufferSourceNode, update its playbackRate directly
      currentLoopingSource.playbackRate.setTargetAtTime(rate, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
    // For 'one-shot' type, newly scheduled samples by timingManager's callback
    // will automatically use the updated currentGlobalPitch when _play is called.
  }
}

export function setVolume(v) {
  if (v >= 0 && mainGainNode && audioContext) {
    currentVolume = v;
    mainGainNode.gain.setTargetAtTime(v, audioContext.currentTime, SMOOTH_PARAM_TIME);
  }
}

// --- Convenience getters (legacy compatibility) --------------------------------
export const getLoopingState      = () => timingManager.getLoopingState(); // This reflects timingManager's loop state
export const getReverseState      = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext        = _ensureContext;

export const getPlaybackRateForNote = note => midiNoteToPlaybackRate.get(note);

export async function playSampleAtRate(rate) { // For MIDI triggered notes
  if (rate > 0 && await _ensureContext() && _selectBuffer())
    _play(_selectBuffer(), audioContext.currentTime, rate, false); // false for useAudioBufferSourceLoop
}

// --- Re‑export a few timing helpers in case external code relied on them -------
export const getLoopStartTime = () => timingManager.getLoopStartTime();
export const getCurrentTempo  = () => currentTempo; // Exporting module's currentTempo
export const getCurrentPitch  = () => currentGlobalPitch; // Exporting module's currentGlobalPitch