// controlsColumn.js
import { createElement } from '.utils.js'; // Adjust path if needed

/**
 * Creates the DOM structure for the main controls column.
 * Includes title, metadata placeholder, and control elements.
 * @returns {HTMLElement} The controls column element.
 */
export function createControlsColumn() {
    const controlsColumn = createElement('div', { className: 'controls-column hidden' }, [
        createElement('div', { className: 'title-bar' }, [
            createElement('h1', { textContent: 'OB1 - Audional Art' }),
            createElement('button', { id: 'info-toggle-btn', title: 'Show/Hide Keyboard Shortcuts', textContent: 'ℹ️' })
        ]),
        // Placeholder for where metadata will be inserted later by the layout builder
        createElement('div', { className: 'metadata-placeholder' }), // Keep this placeholder!
        createElement('div', { id: 'controls-container', className: 'controls disabled' }, [
            createElement('div', { id: 'error-message', className: 'error' }),
            createElement('div', { className: 'button-group' }, [
                createElement('button', { id: 'play-once-btn', disabled: true, textContent: 'Play Once' }),
                createElement('button', { id: 'loop-toggle-btn', disabled: true, textContent: 'Play Loop: Off' }),
                createElement('button', { id: 'reverse-toggle-btn', disabled: true, textContent: 'Reverse: Off' })
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'volume-slider', textContent: 'Volume:' }),
                createElement('input', { type: 'range', id: 'volume-slider', min: '0.0', max: '1.5', step: '0.01', value: '1.0', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'volume-value', textContent: '100' }), '%'
                ])
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'tempo-slider', textContent: 'Tempo:' }),
                createElement('input', { type: 'range', id: 'tempo-slider', min: '1', max: '400', step: '1', value: '78', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'tempo-value', textContent: '78' }), ' BPM'
                ])
            ]),
            createElement('div', { className: 'control-group' }, [
                createElement('label', { for: 'pitch-slider', textContent: 'Pitch:' }),
                createElement('input', { type: 'range', id: 'pitch-slider', min: '0.01', max: '10.0', step: '0.01', value: '1.0', disabled: true }),
                createElement('span', { className: 'value-display' }, [
                    createElement('span', { id: 'pitch-value', textContent: '100' }), '%'
                ])
            ])
        ])
    ]);

    return controlsColumn;
}