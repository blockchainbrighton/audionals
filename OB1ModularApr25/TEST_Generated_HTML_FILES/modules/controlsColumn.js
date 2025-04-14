// --- START OF FILE controlsColumn.js ---

import { createElement } from './utils.js';

// --- Constants for Default Values (Optional but good practice) ---
const DEFAULT_VOLUME = 1.0;
const DEFAULT_TEMPO = 78;
const DEFAULT_PITCH = 1.0;
const DEFAULT_MULTIPLIER = 1;
const MAX_VOLUME = 1.5; // Example max if desired
const MAX_TEMPO = 400;
const MAX_PITCH = 10.0;
const MIN_PITCH = 0.01;
const MAX_MULTIPLIER = 8; // As defined by slider range

/**
 * Creates the DOM structure for the main controls column.
 * Includes title, metadata placeholder, playback/parameter controls, and MIDI controls.
 * @returns {HTMLElement} The fully constructed controls column element.
 */
export function createControlsColumn() {
    // --- Helper to create a standard control group ---
    const createControlGroup = (label, sliderId, type, min, max, step, value, unit = '', valueFormatter = (v) => String(v)) => {
        // --- FIX: Use the simpler ID for the value span ---
        const valueSpanId = sliderId.replace('-slider', '-value'); // e.g., "tempo-slider" -> "tempo-value"
        // --- END FIX ---

        const formattedValue = type === 'range' ? valueFormatter(value) : value; // Format initial value for display if range

        return createElement('div', { className: 'control-group' }, [
            createElement('label', { for: sliderId, textContent: label }), // Label 'for' matches slider ID
            createElement('input', { type, id: sliderId, min, max, step, value, disabled: true }), // Input uses sliderId
            createElement('span', { className: 'value-display' }, [
                // Span containing the value uses the CORRECTED valueSpanId
                createElement('span', { id: valueSpanId, textContent: formattedValue }),
                unit // Add unit directly as text node
            ])
        ]);
    };

    // --- Build the Column ---
    const controlsColumn = createElement('div', { className: 'controls-column hidden' }, [
        // --- Title Bar ---
        createElement('div', { className: 'title-bar' }, [
            createElement('h1', { textContent: 'OB1 - Audional Art' }),
            createElement('button', { id: 'info-toggle-btn', title: 'Show/Hide Keyboard Shortcuts', textContent: 'ℹ️' })
        ]),

        // --- Metadata Placeholder ---
        createElement('div', { className: 'metadata-placeholder' }),

        // --- Main Controls Container ---
        createElement('div', { id: 'controls-container', className: 'controls disabled' }, [
            // Error Display Area
            createElement('div', { id: 'error-message', className: 'error' }),

            // Button Group
            createElement('div', { className: 'button-group' }, [
                createElement('button', { id: 'play-once-btn', disabled: true, textContent: 'Play Once' }),
                createElement('button', { id: 'loop-toggle-btn', disabled: true, textContent: 'Play Loop: Off' }),
                createElement('button', { id: 'reverse-toggle-btn', disabled: true, textContent: 'Reverse: Off' })
            ]),

            // --- Pass the SLIDER ID to the helper ---
            // Volume Control
            createControlGroup(
                'Volume:', 'volume-slider', 'range', '0.0', String(MAX_VOLUME), '0.01', String(DEFAULT_VOLUME), '%',
                (v) => Math.round(parseFloat(v) * 100)
            ),
            // Tempo Control
            createControlGroup(
                'Tempo:', 'tempo-slider', 'range', '1', String(MAX_TEMPO), '1', String(DEFAULT_TEMPO), ' BPM'
            ),
            // Global Pitch Control
            createControlGroup(
                'Pitch:', 'pitch-slider', 'range', String(MIN_PITCH), String(MAX_PITCH), '0.01', String(DEFAULT_PITCH), '%',
                (v) => Math.round(parseFloat(v) * 100)
            ),
            // Multiplier Control
            createControlGroup(
                'Multiplier:', 'multiplier-slider', 'range', '1', String(MAX_MULTIPLIER), '1', String(DEFAULT_MULTIPLIER), '',
                (v) => `x${v}`
            ),
            // --- End passing SLIDER ID ---

            // --- MIDI Controls Section ---
            createElement('div', { className: 'midi-controls control-group' }, [
                createElement('label', { for: 'midi-device-select', textContent: 'MIDI In:' }),
                createElement('select', { id: 'midi-device-select', disabled: true }, [
                     createElement('option', { value: '', textContent: 'Loading MIDI...' })
                ]),
                createElement('span', {
                    id: 'midi-status',
                    className: 'value-display',
                    textContent: 'Unavailable',
                })
            ])
        ])
    ]);

    // Apply specific accent color post-creation if desired
    const multiplierSlider = controlsColumn.querySelector('#multiplier-slider');
    if (multiplierSlider) {
        multiplierSlider.style.accentColor = '#d08770';
    }

    return controlsColumn;
}
// --- END OF FILE controlsColumn.js ---