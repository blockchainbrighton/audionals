// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

let tempoRef, pitchRef, volumeRef, multiplierRef, lastVolume = 1.0;

const EPS = 1e-9, ST_RATIO = 2 ** (1 / 12);
const STEPS = { TEMPO_SMALL: 1, TEMPO_LARGE: 10, PITCH_LINEAR: 0.01, VOLUME: 0.05 };
const MULT_MAP = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 8, 6: 16, 7: 32, 8: 8 };

const validateSlider = (ref, name) => {
  if (!ref) return false;
  const cur = +ref.value, min = +ref.min, max = +ref.max;
  return [cur, min, max].some(Number.isNaN) ? (console.error(`Invalid ${name} slider`), false) : { cur, min, max };
};

const applyChange = (ref, set, update, value, label, scale = 1, suffix = '') => {
  try {
    set?.(value), update?.(value);
    if (ref) ref.value = clamp(value, +ref.min, +ref.max);
    const display = label === 'Multiplier' ? `x${value}` : `${Math.round(value * scale)}${suffix}`;
    const extra = label.includes('Pitch') ? ` (Rate: ${value.toFixed(4)})` : '';
    console.log(`${label} set to: ${display}${extra}`);
  } catch (err) {
    console.error(`applyChange error for ${label}:`, err);
    ui.showError(`Failed to set ${label}`);
  }
};

export function adjustTempo(d) {
  const s = validateSlider(tempoRef, 'tempo');
  if (!s) return;
  const next = clamp(s.cur + d, s.min, s.max);
  if (next !== s.cur) applyChange(tempoRef, audio.setTempo, ui.updateTempoDisplay, next, 'Tempo', 1, ' BPM');
}

export function adjustPitch(type, amt = 0) {
  const s = validateSlider(pitchRef, 'pitch');
  if (!s) return;
  const calc = {
    linear: () => [clamp(s.cur + amt, s.min, s.max), 'Pitch (Linear)'],
    semitone: () => [clamp(s.cur * (amt > 0 ? ST_RATIO : 1 / ST_RATIO), s.min, s.max), `Pitch (${amt > 0 ? '+1' : '-1'} ST)`],
    mult: () => [clamp(s.cur * amt, s.min, s.max), 'Pitch (Mult)'],
    reset: () => [clamp(1.0, s.min, s.max), 'Pitch Reset']
  }[type];
  if (!calc) return;
  const [next, label] = calc();
  if (Math.abs(next - s.cur) > EPS) applyChange(pitchRef, audio.setGlobalPitch, ui.updatePitchDisplay, next, label, 100, '%');
}

export function adjustVolume(d) {
  const s = validateSlider(volumeRef, 'volume');
  if (!s) return;
  const next = clamp(s.cur + d, s.min, s.max);
  if (Math.abs(next - s.cur) > EPS) {
    if (next > s.min) lastVolume = next;
    applyChange(volumeRef, audio.setVolume, ui.updateVolumeDisplay, next, 'Volume', 100, '%');
  }
}

export function toggleMute() {
  const s = validateSlider(volumeRef, 'volume');
  if (!s) return;
  const isMuted = s.cur <= s.min + EPS;
  const next = isMuted ? clamp(lastVolume > s.min ? lastVolume : s.max, s.min, s.max) : s.min;
  applyChange(volumeRef, audio.setVolume, ui.updateVolumeDisplay, next, isMuted ? 'Unmute' : 'Mute', 100, '%');
}

export function setMultiplier(k) {
  const target = MULT_MAP[k];
  const cur = audio.getScheduleMultiplier?.() ?? 1;
  if (target && cur !== target) applyChange(multiplierRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, target, 'Multiplier');
}

function handleKey(e) {
  if (_isInputFocused(e.target)) return;
  const { key, shiftKey: s, ctrlKey: c, metaKey: m, altKey: a } = e;
  const ctrl = c || m, mod = (C, S, A) => ctrl === C && s === S && a === A;
  let handled = true;

  if (mod(true, true, false)) {
    if (['=', '+'].includes(key)) adjustTempo(STEPS.TEMPO_LARGE);
    else if (['-', '_'].includes(key)) adjustTempo(-STEPS.TEMPO_LARGE);
    else if ([']', '}'].includes(key)) adjustPitch('semitone', 1);
    else if (['[', '{'].includes(key)) adjustPitch('semitone', -1);
    else handled = false;
  } else if (mod(false, true, false)) {
    if (['=', '+'].includes(key)) adjustTempo(STEPS.TEMPO_SMALL);
    else if (['-', '_'].includes(key)) adjustTempo(-STEPS.TEMPO_SMALL);
    else if ([']', '}'].includes(key)) adjustPitch('linear', STEPS.PITCH_LINEAR);
    else if (['[', '{'].includes(key)) adjustPitch('linear', -STEPS.PITCH_LINEAR);
    else handled = false;
  } else if (mod(false, false, false)) {
    if (key === '=') adjustPitch('mult', 2);
    else if (key === '-') adjustPitch('mult', 0.5);
    else if (key === '0') adjustPitch('reset');
    else if (key === 'ArrowUp') adjustVolume(STEPS.VOLUME);
    else if (key === 'ArrowDown') adjustVolume(-STEPS.VOLUME);
    else if (/^[mM]$/.test(key)) toggleMute();
    else if (MULT_MAP[key]) setMultiplier(key);
    else handled = false;
  } else handled = false;

  if (handled) e.preventDefault();
}

export function init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider }) {
  if (![tempoSlider, pitchSlider, volumeSlider, multiplierSlider].every(i => i instanceof HTMLInputElement)) {
    console.error('Invalid slider refs:', { tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
    tempoRef = pitchRef = volumeRef = multiplierRef = null;
    return;
  }
  [tempoRef, pitchRef, volumeRef, multiplierRef] = [tempoSlider, pitchSlider, volumeSlider, multiplierSlider];
  lastVolume = +volumeRef.value || lastVolume;
  document.addEventListener('keydown', handleKey);
  console.log('Keyboard shortcuts initialized.');
}

export function destroy() {
  document.removeEventListener('keydown', handleKey);
  tempoRef = pitchRef = volumeRef = multiplierRef = null;
  console.log('Keyboard shortcuts destroyed.');
}


// --- END OF FILE keyboardShortcuts.js ---
