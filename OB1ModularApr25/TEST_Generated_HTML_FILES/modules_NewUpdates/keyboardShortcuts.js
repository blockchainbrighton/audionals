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
	PITCH_STEP_SMALL = 0.01, // For Shift+[ ]
	VOLUME_STEP = 0.05,
	FLOAT_COMPARISON_EPSILON = 1e-9,
	SEMITONE_RATIO = 2 ** (1 / 12); // 1.059463… Used for Ctrl+Shift+[ ]

// --- NEW: Simplified Multiplier Map ---
const multiplierMap = Object.freeze({
	1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 // Direct number keys 1-8
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
	const finalValue = clamp(newValue, +sliderRef.min, +sliderRef.max);
	audioSetter(finalValue);
	uiUpdater(finalValue);
	if (sliderRef) sliderRef.value = finalValue; // Use final clamped value for slider

	const display =
		logLabel === 'Multiplier'
			? `x${finalValue}`
			: `${logMultiplier !== 1 ? Math.round(finalValue * logMultiplier) : finalValue.toFixed(logUnit==='%' ? 0 : 2)}${logUnit}`;

	console.log(
		`${logLabel} adjusted via shortcut to: ${display}` +
		(logLabel.startsWith('Pitch') ? ` (Rate: ${finalValue.toFixed(4)})` : '')
	);
}

/* ---------- Adjustment functions (Now Exported Actions) ---------- */

export function adjustTempo(change) {
	_withSlider(tempoSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, v, 'Tempo', 1, ' BPM');
	});
}
export const adjustTempoSmallUp = () => adjustTempo(TEMPO_STEP_SMALL);
export const adjustTempoSmallDown = () => adjustTempo(-TEMPO_STEP_SMALL);
export const adjustTempoLargeUp = () => adjustTempo(TEMPO_STEP_LARGE);
export const adjustTempoLargeDown = () => adjustTempo(-TEMPO_STEP_LARGE);

export function adjustPitchLinear(change) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Linear)', 1, 'x');
	});
}
export const adjustPitchLinearUp = () => adjustPitchLinear(PITCH_STEP_SMALL);
export const adjustPitchLinearDown = () => adjustPitchLinear(-PITCH_STEP_SMALL);


export function adjustPitchSemitone(direction) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * (direction > 0 ? SEMITONE_RATIO : 1 / SEMITONE_RATIO), min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(
				pitchSliderRef,
				audio.setGlobalPitch,
				ui.updatePitchDisplay,
				v,
				`Pitch (${direction > 0 ? '+1 ST' : '-1 ST'})`,
				1, // Keep display as multiplier
				'x'
			);
	});
}
export const adjustPitchSemitoneUp = () => adjustPitchSemitone(1);
export const adjustPitchSemitoneDown = () => adjustPitchSemitone(-1);

export function multiplyPitch(multiplier) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * multiplier, min, max);
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Mult)', 1, 'x');
	});
}
export const multiplyPitchUp = () => multiplyPitch(2);
export const multiplyPitchDown = () => multiplyPitch(0.5);

export function resetPitch() {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(1, min, max); // Always reset to 1
		if (!_nearEq(v, cur))
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch Reset', 1, 'x');
	});
}

export function adjustVolume(change) {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (_nearEq(v, cur)) return;
		if (v > min + FLOAT_COMPARISON_EPSILON) lastVolumeBeforeMute = v; // Update last non-mute volume
		_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, v, 'Volume', 100, '%');
	});
}
export const adjustVolumeUp = () => adjustVolume(VOLUME_STEP);
export const adjustVolumeDown = () => adjustVolume(-VOLUME_STEP);


export function toggleMute() {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const muted = cur <= min + FLOAT_COMPARISON_EPSILON;
        // When unmuting, restore last known volume, or default to max if last was mute
		const v = muted ? clamp(lastVolumeBeforeMute, min, max) : min;
        // Update lastVolumeBeforeMute ONLY when muting, store the current volume
        if (!muted) { // i.e. when we are MUTING now
             if (cur > min + FLOAT_COMPARISON_EPSILON) { // Avoid storing min as the pre-mute volume
                 lastVolumeBeforeMute = cur;
             } else {
                // If current is already min, keep the existing lastVolumeBeforeMute
             }
        }
		_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, v, muted ? 'Unmute' : 'Mute', 100, '%');
	});
}


export function setMultiplier(target) {
	if (typeof target !== 'number' || !Number.isInteger(target) || target < 1 || target > 8) { // Updated check
	    console.warn(`_setMultiplier: bad target ${target}`); return;
    }
	const cur = audio.getCurrentScheduleMultiplier?.() ?? 1;
	if (cur === target) return; // Use strict equality for integers
	_applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, target, 'Multiplier');
}
// --- NEW: Specific multiplier functions ---
export const setMultiplier1 = () => setMultiplier(1);
export const setMultiplier2 = () => setMultiplier(2);
export const setMultiplier3 = () => setMultiplier(3);
export const setMultiplier4 = () => setMultiplier(4);
export const setMultiplier5 = () => setMultiplier(5);
export const setMultiplier6 = () => setMultiplier(6);
export const setMultiplier7 = () => setMultiplier(7);
export const setMultiplier8 = () => setMultiplier(8);

/* ---------- Key‑handler (Internal) ---------- */
function _handleKeyDown(e) {
	if (_isInputFocused(e.target)) return;

	const { shiftKey: s, ctrlKey: c, metaKey: m, altKey: a, key } = e;
	const ctrl = c || m; // Treat Cmd same as Ctrl
	const noMod = !s && !ctrl && !a;
	let handled = true;

	// Map keys/modifiers to the EXPORTED action functions
	switch (true) {
		// Ctrl + Shift + Key
		case ctrl && s && !a:
			switch (key) {
				case '=': case '+': adjustTempoLargeUp(); break;
				case '-': case '_': adjustTempoLargeDown(); break;
				case ']': case '}': adjustPitchSemitoneUp(); break;
				case '[': case '{': adjustPitchSemitoneDown(); break;
				default: handled = false;
			}
			break;

		// Shift + Key
		case s && !ctrl && !a:
			switch (key) {
				case '=': case '+': adjustTempoSmallUp(); break;
				case '-': case '_': adjustTempoSmallDown(); break;
				case ']': case '}': adjustPitchLinearUp(); break; // Renamed action
				case '[': case '{': adjustPitchLinearDown(); break; // Renamed action
				default: handled = false;
			}
			break;

		// No Modifiers
		case noMod:
             // Map number keys 1-8 directly
            if (key >= '1' && key <= '8') {
                 setMultiplier(parseInt(key, 10));
                 break;
             }
			switch (key) {
                case '=': multiplyPitchUp(); break;
                case '-': multiplyPitchDown(); break;
				case '0': resetPitch(); break;
				case 'ArrowUp': adjustVolumeUp(); break;
				case 'ArrowDown': adjustVolumeDown(); break;
				case 'm': case 'M': toggleMute(); break;
				default: handled = false;
			}
			break;

		default:
			handled = false;
	}

	if (handled) {
		e.preventDefault();
		e.stopPropagation(); // Prevent bubbling if handled here
	}
}

/* ---------- Public API ---------- */
export function init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider } = {}) {
	if (![tempoSlider, pitchSlider, volumeSlider, multiplierSlider].every(el => el instanceof HTMLInputElement))
		return console.error('keyboardShortcuts init: invalid sliders');

	tempoSliderRef = tempoSlider;
	pitchSliderRef = pitchSlider;
	volumeSliderRef = volumeSlider;
	multiplierSliderRef = multiplierSlider;
	// Initialize lastVolumeBeforeMute safely, ensure it's not 0 unless volume starts at 0
    lastVolumeBeforeMute = +volumeSlider.value || 1;
    if (lastVolumeBeforeMute <= (volumeSlider.min + FLOAT_COMPARISON_EPSILON) && volumeSlider.value > volumeSlider.min) {
        lastVolumeBeforeMute = parseFloat(volumeSlider.max); // Or some default like 1? Let's try max
    } else if (lastVolumeBeforeMute <= (volumeSlider.min + FLOAT_COMPARISON_EPSILON)) {
        lastVolumeBeforeMute = 1.0; // Fallback if starts muted and min=0
    }


	document.addEventListener('keydown', _handleKeyDown);
	console.log('Keyboard shortcuts initialized.');
}

export function destroy() {
	document.removeEventListener('keydown', _handleKeyDown);
	tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
	console.log('Keyboard shortcuts destroyed.');
}
// --- END OF FILE keyboardShortcuts.js ---