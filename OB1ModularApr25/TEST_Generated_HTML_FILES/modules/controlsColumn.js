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
    const createControlGroup = (label, id, type, min, max, step, value, unit = '', valueFormatter = (v) => String(v)) => {
        const valueSpanId = `${id}-value`;
        const formattedValue = type === 'range' ? valueFormatter(value) : value; // Format initial value for display if range

        return createElement('div', { className: 'control-group' }, [
            createElement('label', { for: id, textContent: label }),
            createElement('input', { type, id, min, max, step, value, disabled: true }),
            createElement('span', { className: 'value-display' }, [
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
        // layoutBuilder.js will find this and insert the actual metadata div
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

            // Volume Control
            createControlGroup(
                'Volume:', 'volume-slider', 'range', '0.0', String(MAX_VOLUME), '0.01', String(DEFAULT_VOLUME), '%',
                (v) => Math.round(parseFloat(v) * 100) // Formatter for percentage
            ),

            // Tempo Control
            createControlGroup(
                'Tempo:', 'tempo-slider', 'range', '1', String(MAX_TEMPO), '1', String(DEFAULT_TEMPO), ' BPM'
            ),

            // Global Pitch Control
            createControlGroup(
                'Pitch:', 'pitch-slider', 'range', String(MIN_PITCH), String(MAX_PITCH), '0.01', String(DEFAULT_PITCH), '%',
                (v) => Math.round(parseFloat(v) * 100) // Formatter for percentage
            ),

            // Multiplier Control
            createControlGroup(
                'Multiplier:', 'multiplier-slider', 'range', '1', String(MAX_MULTIPLIER), '1', String(DEFAULT_MULTIPLIER), '',
                (v) => `x${v}` // Formatter for 'x' prefix
            ),

            // --- MIDI Controls Section ---
            createElement('div', { className: 'midi-controls control-group' }, [
                createElement('label', { for: 'midi-device-select', textContent: 'MIDI In:' }),
                createElement('select', { id: 'midi-device-select', disabled: true }, [
                     createElement('option', { value: '', textContent: 'Loading MIDI...' }) // Initial state
                ]),
                createElement('span', {
                    id: 'midi-status',
                    className: 'value-display', // Reuse style but override specific parts in CSS
                    textContent: 'Unavailable',
                    // Inline style for overrides if needed, though CSS is preferred
                    // style: 'text-align: left; min-width: 80px; flex-grow:1;'
                })
            ])
        ])
    ]);

    // Apply specific accent color post-creation if desired (could also be done via CSS)
    const multiplierSlider = controlsColumn.querySelector('#multiplier-slider');
    if (multiplierSlider) {
        multiplierSlider.style.accentColor = '#d08770'; // Example color
    }

    return controlsColumn;
}
// --- END OF FILE controlsColumn.js ---