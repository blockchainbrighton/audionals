
// import { createElement } from './utils.js';

// --- controlsColumn.js ---

// Original: import { createElement } from './utils.js';
import { createElement } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0';

const DEFAULT_VOLUME = 1.0,
      DEFAULT_TEMPO = 78,
      DEFAULT_PITCH = 1.0,
      DEFAULT_MULTIPLIER = 1,
      MAX_VOLUME = 1.5,
      MAX_TEMPO = 400,
      MAX_PITCH = 10.0,
      MIN_PITCH = 0.01,
      MAX_MULTIPLIER = 8;

/**
 * Helper to create a standard control group element.
 */
const createControlGroup = (label, sliderId, type, min, max, step, value, unit = '', valueFormatter = v => String(v)) => {
  const valueSpanId = sliderId.replace('-slider', '-value'),
        formattedValue = type === 'range' ? valueFormatter(value) : value;
  return createElement('div', { className: 'control-group' }, [
    createElement('label', { for: sliderId, textContent: label }),
    createElement('input', { type, id: sliderId, min, max, step, value, disabled: true }),
    createElement('span', { className: 'value-display' }, [
      createElement('span', { id: valueSpanId, textContent: formattedValue }),
      unit
    ])
  ]);
};

/**
 * Creates the DOM structure for the main controls column.
 */
export function createControlsColumn() {
  const controlsColumn = createElement('div', { className: 'controls-column hidden' }, [
    createElement('div', { className: 'title-bar' }, [
      createElement('h1', { textContent: 'OB1 - Audional Art' }),
      createElement('button', { id: 'info-toggle-btn', title: 'Show/Hide Keyboard Shortcuts', textContent: 'ℹ️' })
    ]),
    createElement('div', { className: 'metadata-placeholder' }),
    createElement('div', { id: 'controls-container', className: 'controls disabled' }, [
      createElement('div', { id: 'error-message', className: 'error' }),
      createElement('div', { className: 'button-group' }, [
        createElement('button', { id: 'play-once-btn', disabled: true, textContent: 'Play Once' }),
        createElement('button', { id: 'loop-toggle-btn', disabled: true, textContent: 'Play Loop: Off' }),
        createElement('button', { id: 'reverse-toggle-btn', disabled: true, textContent: 'Reverse: Off' })
      ]),
      createControlGroup('Volume:', 'volume-slider', 'range', '0.0', String(MAX_VOLUME), '0.01', String(DEFAULT_VOLUME), '%', v => Math.round(parseFloat(v) * 100)),
      createControlGroup('Tempo:', 'tempo-slider', 'range', '1', String(MAX_TEMPO), '1', String(DEFAULT_TEMPO), ' BPM'),
      createControlGroup('Pitch:', 'pitch-slider', 'range', String(MIN_PITCH), String(MAX_PITCH), '0.01', String(DEFAULT_PITCH), '%', v => Math.round(parseFloat(v) * 100)),
      createControlGroup('Multiplier:', 'multiplier-slider', 'range', '1', String(MAX_MULTIPLIER), '1', String(DEFAULT_MULTIPLIER), '', v => `x${v}`),
      createElement('div', { className: 'midi-controls control-group' }, [
        createElement('label', { for: 'midi-device-select', textContent: 'MIDI In:' }),
        createElement('select', { id: 'midi-device-select', disabled: true }, [
          createElement('option', { value: '', textContent: 'Loading MIDI...' })
        ]),
        createElement('span', { id: 'midi-status', className: 'value-display', textContent: 'Unavailable' })
      ])
    ])
  ]);
  // Set accent color for multiplier slider
  const multiplierSlider = controlsColumn.querySelector('#multiplier-slider');
  if (multiplierSlider) multiplierSlider.style.accentColor = '#d08770';
  return controlsColumn;
}

// --- END OF FILE controlsColumn.js ---
