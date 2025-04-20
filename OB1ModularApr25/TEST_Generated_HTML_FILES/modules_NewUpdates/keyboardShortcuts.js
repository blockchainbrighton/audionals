// --- START OF FILE keyboardShortcuts.js ---
'use strict';

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

/* ---------- Module‑state ---------- */
let tempoSliderRef = null,
	pitchSliderRef = null,
	volumeSliderRef = null,
	multiplierSliderRef = null,
	lastVolumeBeforeMute = 1;

/* ---------- Constants ---------- */
const TEMPO_STEP_SMALL = 1,
	TEMPO_STEP_LARGE = 10,
	PITCH_STEP_SMALL = 0.01,
	VOLUME_STEP = 0.05,
	FLOAT_COMPARISON_EPSILON = 1e-9,
	SEMITONE_RATIO = 2 ** (1 / 12); // 1.059463…

const multiplierMap = Object.freeze({
	'1': 1, '2': 2, '3': 3, '4': 4,
	'5': 8, '6': 16, '7': 32, '8': 8
});

/* ---------- Shared helpers ---------- */
const _nearEq = (a, b) => Math.abs(a - b) <= FLOAT_COMPARISON_EPSILON;
const _parseSlider = s => ({ cur: +s.value, min: +s.min, max: +s.max });
const _withSlider = (ref, fn) => ref && fn(_parseSlider(ref));

function _applySliderChange(
	sliderRef,
	audioSetter,
	uiUpdater,
	newValue,
	logLabel,
	logMultiplier = 1,
	logUnit = ''
) {
	if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
		console.error(`Bad setter/updater for ${logLabel}`); return;
	}
	audioSetter(newValue);
	uiUpdater(newValue);
	if (sliderRef) sliderRef.value = clamp(newValue, +sliderRef.min, +sliderRef.max);

	const display =
		logLabel === 'Multiplier'
			? `x${newValue}`
			: `${logMultiplier !== 1 ? Math.round(newValue * logMultiplier) : newValue}${logUnit}`;

	console.log(
		`${logLabel} adjusted via shortcut to: ${display}` +
		(logLabel.startsWith('Pitch') ? ` (Rate: ${newValue.toFixed(4)})` : '')
	);
}

/* ---------- Adjustment functions ---------- */
function _adjustTempo(change) {
	_withSlider(tempoSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, v, 'Tempo', 1, ' BPM');
	});
}

function _adjustPitchLinear(change) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Linear)', 100, '%');
	});
}

function _adjustPitchSemitone(direction) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * (direction > 0 ? SEMITONE_RATIO : 1 / SEMITONE_RATIO), min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(
				pitchSliderRef,
				audio.setGlobalPitch,
				ui.updatePitchDisplay,
				v,
				`Pitch (${direction > 0 ? '+1 ST' : '-1 ST'})`,
				100,
				'%'
			);
	});
}

function _multiplyPitch(multiplier) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * multiplier, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Mult)', 100, '%');
	});
}

function _resetPitch() {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(1, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch Reset', 100, '%');
	});
}

function _adjustVolume(change) {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (_nearEq(v, cur)) return;
		if (v > min) lastVolumeBeforeMute = v;
		_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, v, 'Volume', 100, '%');
	});
}

function _toggleMute() {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const muted = cur <= min + FLOAT_COMPARISON_EPSILON;
		const v = muted
			? clamp(lastVolumeBeforeMute > min ? lastVolumeBeforeMute : max, min, max)
			: (lastVolumeBeforeMute = min);
		if (!_nearEq(v, cur))
			_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, v, muted ? 'Unmute' : 'Mute', 100, '%');
	});
}

function _setMultiplier(target) {
	if (typeof target !== 'number' || target < 1) return console.warn(`_setMultiplier: bad target ${target}`);
	const cur = audio.getCurrentScheduleMultiplier?.() ?? 1;
	if (_nearEq(cur, target)) return;
	_applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, target, 'Multiplier');
}

/* ---------- Key‑handler ---------- */
function _handleKeyDown(e) {
	if (_isInputFocused(e.target)) return;

	const { shiftKey: s, ctrlKey: c, metaKey: m, altKey: a, key } = e,
		ctrl = c || m,
		noMod = !s && !ctrl && !a;
	let handled = true;

	switch (true) {
		case ctrl && s && !a:
			({
				'=': () => _adjustTempo(TEMPO_STEP_LARGE),
				'+': () => _adjustTempo(TEMPO_STEP_LARGE),
				'-': () => _adjustTempo(-TEMPO_STEP_LARGE),
				'_': () => _adjustTempo(-TEMPO_STEP_LARGE),
				']': () => _adjustPitchSemitone(1),
				'}': () => _adjustPitchSemitone(1),
				'[': () => _adjustPitchSemitone(-1),
				'{': () => _adjustPitchSemitone(-1)
			}[key]?.());
			break;

		case s && !ctrl && !a:
			({
				'=': () => _adjustTempo(TEMPO_STEP_SMALL),
				'+': () => _adjustTempo(TEMPO_STEP_SMALL),
				'-': () => _adjustTempo(-TEMPO_STEP_SMALL),
				'_': () => _adjustTempo(-TEMPO_STEP_SMALL),
				']': () => _adjustPitchLinear(PITCH_STEP_SMALL),
				'}': () => _adjustPitchLinear(PITCH_STEP_SMALL),
				'[': () => _adjustPitchLinear(-PITCH_STEP_SMALL),
				'{': () => _adjustPitchLinear(-PITCH_STEP_SMALL)
			}[key]?.());
			break;

		case noMod:
			({
				'=': () => _multiplyPitch(2),
				'-': () => _multiplyPitch(0.5),
				'0': _resetPitch,
				ArrowUp: () => _adjustVolume(VOLUME_STEP),
				ArrowDown: () => _adjustVolume(-VOLUME_STEP),
				m: _toggleMute, M: _toggleMute,
				...Object.fromEntries(Object.keys(multiplierMap).map(k => [k, () => _setMultiplier(multiplierMap[k])]))
			}[key]?.());
			break;

		default:
			handled = false;
	}
	handled && e.preventDefault();
}

/* ---------- Public API ---------- */
export function init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider } = {}) {
	if (![tempoSlider, pitchSlider, volumeSlider, multiplierSlider].every(el => el instanceof HTMLInputElement))
		return console.error('keyboardShortcuts init: invalid sliders');

	tempoSliderRef = tempoSlider;
	pitchSliderRef = pitchSlider;
	volumeSliderRef = volumeSlider;
	multiplierSliderRef = multiplierSlider;
	lastVolumeBeforeMute = +volumeSlider.value || 1;

	document.addEventListener('keydown', _handleKeyDown);
	console.log('Keyboard shortcuts initialized.');
}

export function destroy() {
	document.removeEventListener('keydown', _handleKeyDown);
	tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
	console.log('Keyboard shortcuts destroyed.');
}
// --- END OF FILE keyboardShortcuts.js ---
