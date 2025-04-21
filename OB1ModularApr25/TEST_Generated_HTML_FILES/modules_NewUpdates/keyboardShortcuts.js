// --- START OF FILE keyboardShortcuts.js ---
'use strict';

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

/* ---------- Module‑state ---------- */
let tempoSliderRef = null;
let pitchSliderRef = null;
let volumeSliderRef = null;
let multiplierSliderRef = null;
let lastVolumeBeforeMute = 1;

/* ---------- Constants ---------- */
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
const PITCH_STEP_SMALL = 0.01; // For Shift+[ ]
const VOLUME_STEP = 0.05;
const FLOAT_COMPARISON_EPSILON = 1e-9;
const SEMITONE_RATIO = 2 ** (1 / 12); // 1.059463… Used for Ctrl+Shift+[ ]

/* ---------- Shared helpers ---------- */
const _nearEq = (a, b) => Math.abs(a - b) <= FLOAT_COMPARISON_EPSILON;
const _parseSlider = (s) => (s ? { cur: +s.value, min: +s.min, max: +s.max } : null);
const _withSlider = (ref, fn) => { const parsed = _parseSlider(ref); if (parsed) fn(parsed); };

function _applySliderChange(
	sliderRef,
	audioSetter,
	uiUpdater,
	// --- Rename newValue to targetValue for clarity ---
	targetValue, // The desired value (e.g., 1, 8, or 16 for multiplier)
	logLabel,
	logMultiplier = 1,
	logUnit = ''
) {
	if (typeof audioSetter !== 'function') {
		console.error(`Audio setter for ${logLabel} is not a function.`);
		return;
	}
	if (typeof uiUpdater !== 'function') {
		console.error(`UI updater for ${logLabel} is not a function.`);
		return;
	}

    // --- NEW: Separate clamping for slider vs audio/UI ---
    let valueForAudioAndUI = targetValue;
    let valueToSetOnSlider = targetValue;

    if (sliderRef) {
        const minVal = +sliderRef.min;
        const maxVal = +sliderRef.max;
        // Clamp the value *only* for setting the slider's visual state
        valueToSetOnSlider = clamp(targetValue, minVal, maxVal);
        // Ensure the audio/UI value is at least the slider minimum if applicable
        // (e.g., preventing negative multiplier if slider min is 1)
        if (logLabel === 'Multiplier') {
             valueForAudioAndUI = Math.max(minVal, targetValue); // Use slider min as absolute floor
        }
    } else {
         // If no slider, assume targetValue is valid for audio/UI
         // Add basic validation for multiplier if no slider
         if (logLabel === 'Multiplier') {
            valueForAudioAndUI = Math.max(1, targetValue); // Ensure at least 1
         }
    }

	// Call the audio setter with the potentially unclamped value (e.g., 16)
	audioSetter(valueForAudioAndUI);

	// Call the UI updater with the potentially unclamped value (e.g., 16)
	uiUpdater(valueForAudioAndUI);

	// Update the slider's visual position with the *clamped* value
	if (sliderRef) {
        sliderRef.value = valueToSetOnSlider;
    }

	// Format display value for logging using the *actual* audio/UI value
	const display =
		logLabel === 'Multiplier'
			? `x${valueForAudioAndUI}` // Log the actual value being used (e.g., x16)
			: `${logMultiplier !== 1 ? Math.round(valueForAudioAndUI * logMultiplier) : valueForAudioAndUI.toFixed(logUnit === '%' ? 0 : 2)}${logUnit}`;

	console.log(
		`${logLabel} adjusted via shortcut to: ${display}` +
		(logLabel.startsWith('Pitch') ? ` (Rate: ${valueForAudioAndUI.toFixed(4)})` : '')
	);
}

/* ---------- Adjustment functions (Now Exported Actions) ---------- */

// --- adjustTempo, adjustPitch*, multiplyPitch, resetPitch, adjustVolume*, toggleMute remain unchanged ---
export function adjustTempo(change) {
	_withSlider(tempoSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur)) {
			_applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, v, 'Tempo', 1, ' BPM');
		}
	});
}
export const adjustTempoSmallUp = () => adjustTempo(TEMPO_STEP_SMALL);
export const adjustTempoSmallDown = () => adjustTempo(-TEMPO_STEP_SMALL);
export const adjustTempoLargeUp = () => adjustTempo(TEMPO_STEP_LARGE);
export const adjustTempoLargeDown = () => adjustTempo(-TEMPO_STEP_LARGE);

export function adjustPitchLinear(change) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (!_nearEq(v, cur)) {
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Linear)', 1, 'x');
		}
	});
}
export const adjustPitchLinearUp = () => adjustPitchLinear(PITCH_STEP_SMALL);
export const adjustPitchLinearDown = () => adjustPitchLinear(-PITCH_STEP_SMALL);

export function adjustPitchSemitone(direction) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * (direction > 0 ? SEMITONE_RATIO : 1 / SEMITONE_RATIO), min, max);
		if (!_nearEq(v, cur)) {
			_applySliderChange(
				pitchSliderRef,
				audio.setGlobalPitch,
				ui.updatePitchDisplay,
				v,
				`Pitch (${direction > 0 ? '+1 ST' : '-1 ST'})`,
				1, // Keep display as multiplier
				'x'
			);
		}
	});
}
export const adjustPitchSemitoneUp = () => adjustPitchSemitone(1);
export const adjustPitchSemitoneDown = () => adjustPitchSemitone(-1);

export function multiplyPitch(multiplier) {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur * multiplier, min, max);
		if (!_nearEq(v, cur)) {
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch (Mult)', 1, 'x');
		}
	});
}
export const multiplyPitchUp = () => multiplyPitch(2);
export const multiplyPitchDown = () => multiplyPitch(0.5);

export function resetPitch() {
	_withSlider(pitchSliderRef, ({ cur, min, max }) => {
		const v = clamp(1, min, max); // Always reset to 1
		if (!_nearEq(v, cur)) {
			_applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, v, 'Pitch Reset', 1, 'x');
		}
	});
}

export function adjustVolume(change) {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const v = clamp(cur + change, min, max);
		if (_nearEq(v, cur)) return;
		// Update lastVolumeBeforeMute only if the new volume is above the minimum threshold
		if (v > min + FLOAT_COMPARISON_EPSILON) {
			lastVolumeBeforeMute = v;
		}
		_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, v, 'Volume', 100, '%');
	});
}
export const adjustVolumeUp = () => adjustVolume(VOLUME_STEP);
export const adjustVolumeDown = () => adjustVolume(-VOLUME_STEP);

export function toggleMute() {
	_withSlider(volumeSliderRef, ({ cur, min, max }) => {
		const isCurrentlyMuted = cur <= min + FLOAT_COMPARISON_EPSILON;
		let targetVolume;

		if (isCurrentlyMuted) {
			// Unmuting: Restore to the last known non-mute volume
			targetVolume = clamp(lastVolumeBeforeMute, min, max);
			if (targetVolume <= min + FLOAT_COMPARISON_EPSILON) {
				targetVolume = Math.min(max, 1.0);
			}
		} else {
			// Muting: Store current volume if it's not already mute level, then set to min
			if (cur > min + FLOAT_COMPARISON_EPSILON) {
				lastVolumeBeforeMute = cur;
			}
			targetVolume = min;
		}
		_applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, targetVolume, isCurrentlyMuted ? 'Unmute' : 'Mute', 100, '%');
	});
}


// General function FOR KEYS 1-8: Uses target value directly
export function setMultiplier(target) {
    // Basic validation for keys 1-8
    if (typeof target !== 'number' || !Number.isInteger(target) || target < 1 || target > 8) {
        console.warn(`keyboardShortcuts.setMultiplier: Invalid target value ${target}. Must be integer 1-8.`);
        return;
    }
    _applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, target, 'Multiplier');
}

// --- Specific multiplier functions for keys ---
export const setMultiplier1 = () => setMultiplier(1);
export const setMultiplier2 = () => setMultiplier(2);
export const setMultiplier3 = () => setMultiplier(3);
export const setMultiplier4 = () => setMultiplier(4);
export const setMultiplier5 = () => setMultiplier(5);
export const setMultiplier6 = () => setMultiplier(6);
export const setMultiplier7 = () => setMultiplier(7);
export const setMultiplier8 = () => setMultiplier(8);

// --- Function for key '9': Directly calls _applySliderChange with value 16 ---
export const setMultiplier9 = () => {
    _applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, 16, 'Multiplier');
};


/* ---------- Key‑handler (Internal) ---------- */
function _handleKeyDown(e) {
	if (_isInputFocused(e.target)) return;

	const { shiftKey: s, ctrlKey: c, metaKey: m, altKey: a, key } = e;
	const ctrl = c || m; // Treat Cmd same as Ctrl
	const noMod = !s && !ctrl && !a;
	let handled = true;

	switch (true) {
		// Ctrl + Shift + Key (No Alt)
		case ctrl && s && !a:
			switch (key.toUpperCase()) {
				case '=': case '+': adjustTempoLargeUp(); break;
				case '-': case '_': adjustTempoLargeDown(); break;
				case ']': case '}': adjustPitchSemitoneUp(); break;
				case '[': case '{': adjustPitchSemitoneDown(); break;
				default: handled = false;
			}
			break;

		// Shift + Key (No Ctrl/Alt)
		case s && !ctrl && !a:
			switch (key.toUpperCase()) {
				case '=': case '+': adjustTempoSmallUp(); break;
				case '-': case '_': adjustTempoSmallDown(); break;
				case ']': case '}': adjustPitchLinearUp(); break;
				case '[': case '{': adjustPitchLinearDown(); break;
				default: handled = false;
			}
			break;

		// No Modifiers
		case noMod:
            // Check number keys 1-8
            if (key >= '1' && key <= '8') {
                 setMultiplier(parseInt(key, 10)); // Calls general function with the number 1-8
            }
            // Check number key 9
            else if (key === '9') {
                 setMultiplier9(); // Calls specific function for 16x
            }
            // Check other no-modifier keys
            else {
                switch (key.toLowerCase()) {
                    case '=': multiplyPitchUp(); break;
                    case '-': multiplyPitchDown(); break;
                    case '0': resetPitch(); break;
                    case 'arrowup': adjustVolumeUp(); break;
                    case 'arrowdown': adjustVolumeDown(); break;
                    case 'm': toggleMute(); break;
                    // Keys like Space, R, I, K handled in main.js
                    default: handled = false;
                }
            }
			break; // End of noMod case

		default:
			handled = false;
	}

	if (handled) {
		e.preventDefault();
		e.stopPropagation();
	}
}

/* ---------- Public API ---------- */
export function init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider } = {}) {
	const sliders = { tempoSlider, pitchSlider, volumeSlider, multiplierSlider };
	for (const key in sliders) {
		if (!(sliders[key] instanceof HTMLInputElement)) {
			console.error(`keyboardShortcuts init: Invalid element for ${key}.`);
			// Optionally decide how to handle missing sliders, e.g., disable related shortcuts
		}
	}

	tempoSliderRef = sliders.tempoSlider;
	pitchSliderRef = sliders.pitchSlider;
	volumeSliderRef = sliders.volumeSlider;
	multiplierSliderRef = sliders.multiplierSlider;

	if (volumeSliderRef) {
        const initialVol = +volumeSliderRef.value;
        const minVol = +volumeSliderRef.min;
        if (initialVol > minVol + FLOAT_COMPARISON_EPSILON) {
            lastVolumeBeforeMute = initialVol;
        } else {
            lastVolumeBeforeMute = Math.min(+volumeSliderRef.max, 1.0);
        }
    } else {
        lastVolumeBeforeMute = 1.0;
    }

	document.addEventListener('keydown', _handleKeyDown);
	console.log('Keyboard shortcuts initialized.');
}

export function destroy() {
	document.removeEventListener('keydown', _handleKeyDown);
	tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
	lastVolumeBeforeMute = 1;
	console.log('Keyboard shortcuts destroyed.');
}
// --- END OF FILE keyboardShortcuts.js ---