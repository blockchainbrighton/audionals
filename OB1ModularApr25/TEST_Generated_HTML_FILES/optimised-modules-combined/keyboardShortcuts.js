// --- START OF FILE keyboardShortcuts.js ---

// --- keyboardShortcuts.js ---

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

// --- Module State ---
let tempoRef, pitchRef, volumeRef, multiplierRef;
let lastVolume = 1.0;

// --- Constants ---
const STEPS = {
  TEMPO_SMALL: 1,
  TEMPO_LARGE: 10,
  PITCH_LINEAR: 0.01,
  VOLUME: 0.05
};
const EPS = 1e-9;
const ST_RATIO = Math.pow(2, 1 / 12);
const MULT_MAP = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 8, '6': 16, '7': 32, '8': 8 };

// --- Core Helper ---
function applyChange(ref, setter, updater, value, label, logMult = 1, logUnit = '') {
  if (typeof setter !== 'function' || typeof updater !== 'function') {
    console.error(`applyChange: invalid setter/updater for ${label}`);
    return;
  }
  audio:
  try {
    setter(value);
    updater(value);
    if (ref) {
      const min = parseFloat(ref.min), max = parseFloat(ref.max);
      if (!isNaN(min) && !isNaN(max)) ref.value = clamp(value, min, max);
    }
    const display = label === 'Multiplier'
      ? `x${value}`
      : logMult !== 1
        ? `${Math.round(value * logMult)}${logUnit}`
        : `${value}${logUnit}`;
    const extra = label.startsWith('Pitch') ? ` (Rate: ${value.toFixed(4)})` : '';
    console.log(`${label} set to: ${display}${extra}`);
  } catch (err) {
    console.error(`applyChange error for ${label}:`, err);
    ui.showError(`Failed to set ${label}`);
  }
}

// --- Adjusters ---
function adjustTempo(delta) {
  if (!tempoRef) return;
  const cur = parseInt(tempoRef.value, 10);
  const min = parseInt(tempoRef.min, 10);
  const max = parseInt(tempoRef.max, 10);
  if ([cur, min, max].some(isNaN)) return console.error('Invalid tempo slider');
  const next = clamp(cur + delta, min, max);
  if (next !== cur) applyChange(tempoRef, audio.setTempo, ui.updateTempoDisplay, next, 'Tempo', 1, ' BPM');
}

function adjustPitch(type, amount = 0) {
  if (!pitchRef) return;
  const cur = parseFloat(pitchRef.value);
  const min = parseFloat(pitchRef.min);
  const max = parseFloat(pitchRef.max);
  if ([cur, min, max].some(isNaN)) return console.error('Invalid pitch slider');
  let next, label;
  switch (type) {
    case 'linear':
      next = clamp(cur + amount, min, max);
      label = 'Pitch (Linear)';
      break;
    case 'semitone':
      next = clamp(cur * (amount > 0 ? ST_RATIO : 1 / ST_RATIO), min, max);
      label = `Pitch (${amount > 0 ? '+1' : '-1'} ST)`;
      break;
    case 'mult':
      next = clamp(cur * amount, min, max);
      label = 'Pitch (Mult)';
      break;
    case 'reset':
      next = clamp(1.0, min, max);
      label = 'Pitch Reset';
      break;
    default:
      return;
  }
  if (Math.abs(next - cur) > EPS) applyChange(pitchRef, audio.setGlobalPitch, ui.updatePitchDisplay, next, label, 100, '%');
}

function adjustVolume(delta) {
  if (!volumeRef) return;
  const cur = parseFloat(volumeRef.value);
  const min = parseFloat(volumeRef.min);
  const max = parseFloat(volumeRef.max);
  if ([cur, min, max].some(isNaN)) return console.error('Invalid volume slider');
  const next = clamp(cur + delta, min, max);
  if (Math.abs(next - cur) > EPS) {
    if (next > min) lastVolume = next;
    applyChange(volumeRef, audio.setVolume, ui.updateVolumeDisplay, next, 'Volume', 100, '%');
  }
}

function toggleMute() {
  if (!volumeRef) return;
  const cur = parseFloat(volumeRef.value);
  const min = parseFloat(volumeRef.min);
  const max = parseFloat(volumeRef.max);
  if ([cur, min, max].some(isNaN)) return console.error('Invalid volume slider');
  let next, label;
  if (cur > min + EPS) {
    lastVolume = cur;
    next = min;
    label = 'Mute';
  } else {
    next = clamp(lastVolume > min ? lastVolume : max, min, max);
    label = 'Unmute';
  }
  if (Math.abs(next - cur) > EPS) applyChange(volumeRef, audio.setVolume, ui.updateVolumeDisplay, next, label, 100, '%');
}

function setMultiplier(key) {
  const target = MULT_MAP[key];
  if (!target || typeof audio.setScheduleMultiplier !== 'function') return;
  const current = audio.getScheduleMultiplier?.() || 1;
  if (current !== target) applyChange(multiplierRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, target, 'Multiplier');
}

// --- Event Handler ---
function handleKey(event) {
  if (_isInputFocused(event.target)) return;
  const { shiftKey: s, ctrlKey: c, metaKey: m, altKey: a, key } = event;
  const ctrl = c || m;
  let handled = false;

  if (ctrl && s && !a) {
    if (['=', '+'].includes(key)) { adjustTempo(STEPS.TEMPO_LARGE); handled = true; }
    if (['-', '_'].includes(key)) { adjustTempo(-STEPS.TEMPO_LARGE); handled = true; }
    if ([']', '}'].includes(key)) { adjustPitch('semitone', 1); handled = true; }
    if (['[', '{'].includes(key)) { adjustPitch('semitone', -1); handled = true; }
  } else if (s && !ctrl && !a) {
    if (['=', '+'].includes(key)) { adjustTempo(STEPS.TEMPO_SMALL); handled = true; }
    if (['-', '_'].includes(key)) { adjustTempo(-STEPS.TEMPO_SMALL); handled = true; }
    if ([']', '}'].includes(key)) { adjustPitch('linear', STEPS.PITCH_LINEAR); handled = true; }
    if (['[', '{'].includes(key)) { adjustPitch('linear', -STEPS.PITCH_LINEAR); handled = true; }
  } else if (!s && !ctrl && !a) {
    if (key === '=') { adjustPitch('mult', 2); handled = true; }
    if (key === '-') { adjustPitch('mult', 0.5); handled = true; }
    if (key === '0') { adjustPitch('reset'); handled = true; }
    if (key === 'ArrowUp') { adjustVolume(STEPS.VOLUME); handled = true; }
    if (key === 'ArrowDown') { adjustVolume(-STEPS.VOLUME); handled = true; }
    if (/[mM]/.test(key)) { toggleMute(); handled = true; }
    if (MULT_MAP[key]) { setMultiplier(key); handled = true; }
  }

  if (handled) event.preventDefault();
}

// --- Public API ---
export function init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider }) {
  if (![tempoSlider, pitchSlider, volumeSlider, multiplierSlider]
    .every(el => el instanceof HTMLInputElement)) {
    console.error('Invalid slider refs:', { tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
    tempoRef = pitchRef = volumeRef = multiplierRef = null;
    return;
  }
  [tempoRef, pitchRef, volumeRef, multiplierRef] = [tempoSlider, pitchSlider, volumeSlider, multiplierSlider];
  lastVolume = parseFloat(volumeRef.value) || lastVolume;
  document.addEventListener('keydown', handleKey);
  console.log('Keyboard shortcuts initialized.');
}

export function destroy() {
  document.removeEventListener('keydown', handleKey);
  tempoRef = pitchRef = volumeRef = multiplierRef = null;
  console.log('Keyboard shortcuts destroyed.');
}


// --- END OF FILE keyboardShortcuts.js ---