// audio-processing/main.js
import { PITCH_SLIDER_CONFIG, sValToP, pToSVal } from '../utils.js';
import { showError, triggerAnimation } from '../uiUpdater.js';

import * as C from './constants.js';
import * as AudioManager from './audioContextManager.js';
import * as BufferManager from './bufferManager.js';
import * as Player from './player.js';
import { timingManager } from './timingManager.js';

// --- State ---
let isReversed = false;
let currentTempo = 78;
let currentGlobalPitch = 1; // Absolute pitch rate
let currentVolume = 1;

let currentLoopingSource = null;
let currentLoopingGainNode = null;
let secondaryLoopingSource = null;
let secondaryLoopingGainNode = null;

let currentLoopingSourceStartTime = 0;
let currentLoopingSourceOffset = 0;
let currentLoopingSourcePlaybackRate = 1;
let currentLoopingSourceBufferDuration = 0;

// --- Helpers ---

/**
 * Computes the current playback position (in seconds) within the buffer,
 * accounting for playback start time, playback rate, and looping wrap-around.
 */
function getCurrentPlaybackPosition() {
  if (!currentLoopingSourceStartTime || !currentLoopingSourceBufferDuration) return 0;
  const audioCtx = AudioManager.getAudioContext();
  if (!audioCtx) return 0;

  const elapsed = (audioCtx.currentTime - currentLoopingSourceStartTime) * currentLoopingSourcePlaybackRate;
  let pos = currentLoopingSourceOffset + elapsed;

  // Handle looping wrap-around
  while (pos < 0) pos += currentLoopingSourceBufferDuration;
  while (pos > currentLoopingSourceBufferDuration) pos -= currentLoopingSourceBufferDuration;

  return pos;
}

const safeStop = (source) => { try { source?.stop(); } catch {} };
const safeDisconnect = (node) => { try { node?.disconnect(); } catch {} };
const clearAnimationInterval = (source) => {
  if (source?.animationInterval) {
    clearInterval(source.animationInterval);
    source.animationInterval = null;
  }
};
const createGainWithValue = (audioCtx, gainVal, connectTo) => {
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gainNode.connect(connectTo);
  return gainNode;
};
const scheduleAnimation = (source, duration, conditionCheck) => {
  triggerAnimation();
  if (duration > 0.001 && duration < Infinity) {
    source.animationInterval = setInterval(() => {
      if (conditionCheck()) triggerAnimation();
      else clearAnimationInterval(source);
    }, duration * 1000);
  }
};
const fadeGain = (gainNode, toVal, duration) => {
  const now = gainNode.context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.linearRampToValueAtTime(toVal, now + duration);
};

// --- Core API Functions ---

export async function init(base64Audio, tempo = 78, initial_s_val = PITCH_SLIDER_CONFIG.NEUTRAL_S) {
  currentTempo = tempo;
  currentVolume = 1;

  const initial_P = sValToP(initial_s_val);
  currentGlobalPitch = Math.abs(initial_P / 100);
  isReversed = initial_P < 0 && !(currentGlobalPitch === 0 && initial_P === 0);

  [currentLoopingSource, currentLoopingGainNode, secondaryLoopingSource, secondaryLoopingGainNode].forEach((node) => {
    if (node) {
      safeStop(node);
      clearAnimationInterval(node);
      safeDisconnect(node);
    }
  });
  currentLoopingSource = currentLoopingGainNode = secondaryLoopingSource = secondaryLoopingGainNode = null;

  BufferManager.clearBuffers();
  AudioManager.closeAudioContext();

  try {
    AudioManager.setupAudioContext(currentVolume);
    const audioCtx = AudioManager.getAudioContext();
    if (!audioCtx) throw new Error("Failed to setup AudioContext.");

    const loaded = await BufferManager.loadAndPrepareBuffers(audioCtx, base64Audio);
    if (!loaded) throw new Error("Failed to load or prepare audio buffers.");

    timingManager.init(audioCtx, currentTempo);
  } catch (e) {
    showError(`Audio Init Failed: ${e.message || e}`);
    console.error("Audio Init Failed:", e);
    return false;
  }
  return true;
}

export async function playOnce() {
  if (!(await AudioManager.ensureAudioContextActive())) return;
  const audioCtx = AudioManager.getAudioContext();
  const mainGain = AudioManager.getMainGainNode();
  if (!audioCtx || !mainGain) return;

  const buffer = BufferManager.selectCurrentBuffer(isReversed);
  if (buffer && currentGlobalPitch > 0) {
    Player.playBufferSource(audioCtx, mainGain, buffer, audioCtx.currentTime, currentGlobalPitch, false);
  }
}

export async function startLoop() {
  if (timingManager.getLoopingState() || !(await AudioManager.ensureAudioContextActive())) return;

  const audioCtx = AudioManager.getAudioContext();
  const mainGain = AudioManager.getMainGainNode();
  if (!audioCtx || !mainGain) {
    showError("Audio context or main gain not ready for starting loop.");
    return;
  }

  const sampleType = BufferManager.getSampleType();
  if (currentGlobalPitch <= 0 && sampleType === 'loop') {
    showError("Native loop requires positive pitch.");
    return;
  }

  const bufferToPlay = BufferManager.selectCurrentBuffer(isReversed);
  const decodedBuf = BufferManager.getDecodedBuffer();

  if (!bufferToPlay || !decodedBuf) {
    showError("Buffer or decoded buffer not available for loop.");
    return;
  }

  // Cleanup prior loop sources and gains
  [currentLoopingSource, currentLoopingGainNode].forEach((node, idx) => {
    if (node) {
      safeStop(node);
      clearAnimationInterval(node);
      if (idx === 1) safeDisconnect(node); // Only disconnect gainNode
    }
  });
  currentLoopingSource = currentLoopingGainNode = null;

  // Calculate rate and offset for starting playback at current position
  const new_rate_abs = currentGlobalPitch;
  const bufferDuration = decodedBuf.duration;
  currentLoopingSourceBufferDuration = bufferDuration;

  let offset = 0; // start at beginning by default
  if (currentLoopingSource) {
    offset = getCurrentPlaybackPosition();
  }

  if (isReversed) {
    offset = bufferDuration - offset;
  }

  currentLoopingSourceStartTime = audioCtx.currentTime;
  currentLoopingSourceOffset = offset;
  currentLoopingSourcePlaybackRate = isReversed ? -new_rate_abs : new_rate_abs;

  // Schedule callback for one-shot sample types
  const scheduleCallback = (scheduledTime) => {
    if (currentGlobalPitch <= 0 && sampleType === 'one-shot') return;

    const effectiveBuffer = BufferManager.selectCurrentBuffer(isReversed);
    if (!effectiveBuffer) return;

    if (sampleType === 'one-shot') {
      const gainNode = AudioManager.getMainGainNode();
      if (gainNode) Player.playBufferSource(audioCtx, gainNode, effectiveBuffer, scheduledTime, currentGlobalPitch, false);
      else console.warn("Main gain node unavailable for scheduled one-shot.");
    }
  };

  if (!timingManager.startLoop(scheduleCallback)) {
    showError('Failed to start timing loop.');
    return;
  }

  if (sampleType !== 'loop') return;

  const loopStartTime = timingManager.getSessionInitialStartTime();
  if (!(loopStartTime > 0)) {
    timingManager.stopLoop();
    showError("Invalid start time for native loop.");
    return;
  }

  currentLoopingGainNode = createGainWithValue(audioCtx, currentVolume, mainGain);
  currentLoopingSource = Player.playBufferSource(
    audioCtx,
    currentLoopingGainNode,
    bufferToPlay,
    audioCtx.currentTime,
    new_rate_abs,
    true,
    null,
    offset
  );

  if (!currentLoopingSource) {
    timingManager.stopLoop();
    showError("Failed to create looping source.");
    safeDisconnect(currentLoopingGainNode);
    currentLoopingGainNode = null;
    return;
  }

  clearAnimationInterval(currentLoopingSource);

  const delayMs = Math.max(0, (loopStartTime - audioCtx.currentTime) * 1000);
  setTimeout(() => {
    if (currentLoopingSource && timingManager.getLoopingState()) {
      scheduleAnimation(
        currentLoopingSource,
        decodedBuf.duration / currentGlobalPitch,
        () => timingManager.getLoopingState() && currentGlobalPitch > 0
      );
    }
  }, delayMs);
}

export function stopLoop() {
  timingManager.stopLoop();

  [currentLoopingSource, secondaryLoopingSource].forEach(safeStop);
  [currentLoopingGainNode, secondaryLoopingGainNode].forEach(safeDisconnect);
  [currentLoopingSource, currentLoopingGainNode, secondaryLoopingSource, secondaryLoopingGainNode] = [null, null, null, null];

  // Clear playback tracking
  currentLoopingSourceStartTime = 0;
  currentLoopingSourceOffset = 0;
  currentLoopingSourcePlaybackRate = 1;
  currentLoopingSourceBufferDuration = 0;
}

export function setScheduleMultiplier(m) {
  timingManager.setScheduleMultiplier(Math.max(1, parseInt(m, 10) || 1));
}
export const getScheduleMultiplier = () => timingManager.getCurrentScheduleMultiplier();

export function setTempo(bpm) {
  bpm = parseFloat(bpm);
  if (bpm > 0) {
    currentTempo = bpm;
    timingManager.setTempo(bpm);
  }
}

export function toggleReverse() {
  const audioCtx = AudioManager.getAudioContext();
  if (!audioCtx || !BufferManager.getDecodedBuffer() || !BufferManager.getReversedBuffer()) {
    const val = Math.round((isReversed ? -currentGlobalPitch : currentGlobalPitch) * 100);
    return { new_s_val: pToSVal(val), new_isReversed: isReversed };
  }

  let val = Math.round((isReversed ? -currentGlobalPitch : currentGlobalPitch) * 100);
  const newVal = val === 0 ? (isReversed ? 100 : -100) : -val;
  const new_s_val = pToSVal(newVal);
  setGlobalPitch(new_s_val);
  return { new_s_val, new_isReversed: isReversed };
}

export function setGlobalPitch(s_val) {
  const audioCtx = AudioManager.getAudioContext();
  const mainGain = AudioManager.getMainGainNode();
  if (!audioCtx || !mainGain) return;

  const P_new = sValToP(s_val);
  const new_rate_abs = Math.abs(P_new / 100);
  const new_isReversed = P_new < 0;

  const wasLooping = timingManager.getLoopingState();
  const old_isReversed = isReversed;
  const old_rate_abs = currentGlobalPitch;

  const stopping = new_rate_abs === 0 && old_rate_abs > 0;
  const starting = new_rate_abs > 0 && old_rate_abs === 0;
  const directionChange = new_isReversed !== old_isReversed && new_rate_abs > 0;

  isReversed = new_isReversed;
  currentGlobalPitch = new_rate_abs;
  if (P_new === 0) isReversed = false;

  const sampleType = BufferManager.getSampleType();

  if (!wasLooping || !currentLoopingSource || sampleType === 'one-shot') {
    if (currentLoopingSource && sampleType === 'loop' && new_rate_abs > 0) {
      currentLoopingSource.playbackRate.setTargetAtTime(new_rate_abs, audioCtx.currentTime, C.SMOOTH_PARAM_TIME);
    }
    return;
  }

  clearAnimationInterval(currentLoopingSource);
  const decodedBuf = BufferManager.getDecodedBuffer();
  if (!decodedBuf) return;

  const bufferDuration = decodedBuf.duration;
  currentLoopingSourceBufferDuration = bufferDuration;

  let offset = 0;
  if (currentLoopingSource) {
    offset = getCurrentPlaybackPosition();
  }
  if (isReversed) {
    offset = bufferDuration - offset;
  }

  const newPlaybackRate = new_isReversed ? -new_rate_abs : new_rate_abs;
  currentLoopingSourceStartTime = audioCtx.currentTime;
  currentLoopingSourceOffset = offset;
  currentLoopingSourcePlaybackRate = newPlaybackRate;

  if (stopping) {
    currentLoopingGainNode?.gain.cancelScheduledValues(audioCtx.currentTime);
    currentLoopingGainNode?.gain.setTargetAtTime(0, audioCtx.currentTime, C.CROSSFADE_DURATION);
    return;
  }

  if (starting) {
    const buffer = BufferManager.selectCurrentBuffer(isReversed);
    if (!buffer) return showError("Buffer unavailable for starting loop.");

    if (currentLoopingSource && old_isReversed !== isReversed) {
      safeStop(currentLoopingSource);
      safeDisconnect(currentLoopingGainNode);
      currentLoopingSource = currentLoopingGainNode = null;
    }

    if (!currentLoopingSource) {
      safeDisconnect(currentLoopingGainNode);
      currentLoopingGainNode = createGainWithValue(audioCtx, 0, mainGain);
      currentLoopingSource = Player.playBufferSource(
        audioCtx,
        currentLoopingGainNode,
        buffer,
        audioCtx.currentTime,
        new_rate_abs,
        true,
        null,
        offset
      );

      if (!currentLoopingSource) {
        showError("Failed to create source for starting loop.");
        safeDisconnect(currentLoopingGainNode);
        currentLoopingGainNode = null;
        return;
      }
    } else {
      currentLoopingSource.playbackRate.setTargetAtTime(new_rate_abs, audioCtx.currentTime, C.SMOOTH_PARAM_TIME);
    }
    fadeGain(currentLoopingGainNode, currentVolume, C.CROSSFADE_DURATION);

  } else if (directionChange) {
    const newBuffer = BufferManager.selectCurrentBuffer(isReversed);
    if (!newBuffer) return showError("Buffer unavailable for direction change.");
    if (!currentLoopingGainNode) return console.error("Missing gain node for crossfade.");

    safeStop(secondaryLoopingSource);
    safeDisconnect(secondaryLoopingGainNode);

    const t0 = audioCtx.currentTime;
    secondaryLoopingGainNode = createGainWithValue(audioCtx, 0, mainGain);
    secondaryLoopingSource = Player.playBufferSource(
      audioCtx,
      secondaryLoopingGainNode,
      newBuffer,
      t0,
      new_rate_abs,
      true,
      null,
      offset
    );

    if (!secondaryLoopingSource) {
      showError("Failed to create secondary source for crossfade.");
      safeDisconnect(secondaryLoopingGainNode);
      secondaryLoopingGainNode = null;
      return;
    }

    fadeGain(currentLoopingGainNode, 0, C.CROSSFADE_DURATION);
    fadeGain(secondaryLoopingGainNode, currentVolume, C.CROSSFADE_DURATION);

    const oldSrc = currentLoopingSource;
    const oldGain = currentLoopingGainNode;

    currentLoopingSource = secondaryLoopingSource;
    currentLoopingGainNode = secondaryLoopingGainNode;
    secondaryLoopingSource = null;
    secondaryLoopingGainNode = null;

    setTimeout(() => {
      safeStop(oldSrc);
      safeDisconnect(oldGain);
    }, C.CROSSFADE_DURATION * 1000 + 50);

  } else if (new_rate_abs > 0 && currentLoopingSource) {
    currentLoopingSource.playbackRate.setTargetAtTime(new_rate_abs, audioCtx.currentTime, C.SMOOTH_PARAM_TIME);
  }

  if (currentLoopingSource && decodedBuf && currentGlobalPitch > 0) {
    scheduleAnimation(
      currentLoopingSource,
      decodedBuf.duration / currentGlobalPitch,
      () => timingManager.getLoopingState() && currentGlobalPitch > 0
    );
  }
}

export function setVolume(v) {
  const mainGain = AudioManager.getMainGainNode();
  const audioCtx = AudioManager.getAudioContext();
  v = parseFloat(v);
  if (v >= 0 && mainGain && audioCtx) {
    currentVolume = v;
    mainGain.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, C.SMOOTH_PARAM_TIME);
    if (currentLoopingGainNode && currentGlobalPitch > 0) {
      currentLoopingGainNode.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, C.SMOOTH_PARAM_TIME);
    }
  }
}

export const getLoopingState = () => timingManager.getLoopingState();
export const getReverseState = () => isReversed;
export const getAudioContextState = () => AudioManager.getAudioContextState();
export const resumeContext = async () => AudioManager.ensureAudioContextActive();

export const getPlaybackRateForNote = (noteNumber) => {
  if (currentGlobalPitch === 0) return 0;
  const baseRate = BufferManager.getBasePlaybackRateForMidiNote(noteNumber);
  return baseRate === undefined ? undefined : baseRate * currentGlobalPitch;
};

export async function playSampleAtRate(rate) {
  rate = parseFloat(rate);
  if (!(await AudioManager.ensureAudioContextActive())) return;

  const audioCtx = AudioManager.getAudioContext();
  const mainGain = AudioManager.getMainGainNode();
  if (!audioCtx || !mainGain) return;
  if (rate === 0) return;

  const playReversed = rate < 0;
  const buffer = BufferManager.selectCurrentBuffer(playReversed);
  if (buffer) Player.playBufferSource(audioCtx, mainGain, buffer, audioCtx.currentTime, Math.abs(rate), false);
}

export const getSessionStartTime = () => timingManager.getSessionInitialStartTime();
export const getCurrentTempo = () => currentTempo;
export const getCurrentPitch = () => currentGlobalPitch;
export const getCurrentPitchPercent = () => Math.round((isReversed ? -currentGlobalPitch : currentGlobalPitch) * 100);
