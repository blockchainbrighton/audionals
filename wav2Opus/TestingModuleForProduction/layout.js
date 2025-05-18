// layout.js — consolidated module (controls column, layout builder, reference display)

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { createElement } from './utils.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
// Default control values & ranges
const DEFAULT_VOLUME      = 1.0;
const DEFAULT_TEMPO       = 78;
const DEFAULT_PITCH       = 1.0;
const DEFAULT_MULTIPLIER  = 1;

const MAX_VOLUME     = 1.5;
const MAX_TEMPO      = 400;
const MAX_PITCH      = 10.0;
const MIN_PITCH      = 0.01;
const MAX_MULTIPLIER = 8;

// Reference panel static HTML (keyboard‑shortcut cheat‑sheet)
const referenceContentHTML = `
    <h2>Keyboard Shortcuts</h2>

    <h3>Volume &amp; Mute</h3>
    <ul>
        <li><code>Arrow Up</code>: Increase Volume</li>
        <li><code>Arrow Down</code>: Decrease Volume</li>
        <li><code>M</code>: Toggle Mute/Unmute</li>
    </ul>

    <h3>Tempo (BPM)</h3>
    <ul>
        <li><code>Shift + = / +</code>: Increase Tempo (+1 BPM)</li>
        <li><code>Shift + - / _</code>: Decrease Tempo (‑1 BPM)</li>
        <li><code>Ctrl + Shift + = / +</code>: Increase Tempo (+10 BPM)</li>
        <li><code>Ctrl + Shift + - / _</code>: Decrease Tempo (‑10 BPM)</li>
    </ul>

    <h3>Pitch / Playback Rate</h3>
    <ul>
        <li><code>Shift + ] / }</code>: Increase Pitch slightly</li>
        <li><code>Shift + [ / {</code>: Decrease Pitch slightly</li>
        <li><code>Ctrl + Shift + ] / }</code>: Increase Pitch significantly</li>
        <li><code>Ctrl + Shift + [ / {</code>: Decrease Pitch significantly</li>
        <li><code>=</code> (equals key): Double Current Pitch (x2)</li>
        <li><code>-</code> (minus key): Halve Current Pitch (x0.5)</li>
        <li><code>0</code> (zero key): Reset Pitch to 1.0×</li>
    </ul>
    <p><em>(<code>Ctrl</code> can be <code>Cmd</code> on macOS for Tempo/Pitch shortcuts)</em></p>

    <h3>Playback</h3>
    <ul>
        <li><code>Spacebar</code>: Play sample once</li>
        <li><code>Click Image</code>: Toggle Loop</li>
        <li><code>R</code>: Toggle Reverse Playback</li>
    </ul>
`;

// -----------------------------------------------------------------------------
// Controls‑column builder
// -----------------------------------------------------------------------------

/**
 * Helper to create a standard labelled control group (label + input + value span).
 */
function createControlGroup(label, sliderId, type, min, max, step, value, unit = '', valueFormatter = v => String(v)) {
    const valueSpanId   = sliderId.replace('-slider', '-value');
    const formattedValue = type === 'range' ? valueFormatter(value) : value;

    return createElement('div', { className: 'control-group' }, [
        createElement('label', { for: sliderId, textContent: label }),
        createElement('input', { type, id: sliderId, min, max, step, value, disabled: true }),
        createElement('span', { className: 'value-display' }, [
            createElement('span', { id: valueSpanId, textContent: formattedValue }),
            unit
        ])
    ]);
}

/**
 * Builds the DOM structure for the main controls column.
 * @returns {HTMLElement}
 */
export function createControlsColumn() {
    const controlsColumn = createElement('div', { className: 'controls-column hidden' }, [
        // Title bar -----------------------------------------------------------
        createElement('div', { className: 'title-bar' }, [
            createElement('h1', { textContent: 'Audional Art' }),
            createElement('button', {
                id: 'info-toggle-btn',
                title: 'Show/Hide Keyboard Shortcuts',
                textContent: 'ℹ️'
            })
        ]),

        // Placeholder for dynamic metadata (filled in buildLayout)
        createElement('div', { className: 'metadata-placeholder' }),

        // Main controls container -------------------------------------------
        createElement('div', { id: 'controls-container', className: 'controls disabled' }, [
            // Error display
            createElement('div', { id: 'error-message', className: 'error' }),

            // Button group (play / loop / reverse)
            createElement('div', { className: 'button-group' }, [
                createElement('button', { id: 'play-once-btn', disabled: true, textContent: 'Play Once' }),
                createElement('button', { id: 'loop-toggle-btn', disabled: true, textContent: 'Play Loop: Off' }),
                createElement('button', { id: 'reverse-toggle-btn', disabled: true, textContent: 'Reverse: Off' })
            ]),

            // Slider‑based controls -----------------------------------------
            createControlGroup(
                'Volume:',
                'volume-slider',
                'range',
                '0.0', String(MAX_VOLUME), '0.01', String(DEFAULT_VOLUME), '%',
                v => Math.round(parseFloat(v) * 100)
            ),
            createControlGroup(
                'Tempo:',
                'tempo-slider',
                'range',
                '1', String(MAX_TEMPO), '1', String(DEFAULT_TEMPO), ' BPM'
            ),
            createControlGroup(
                'Pitch:',
                'pitch-slider',
                'range',
                String(MIN_PITCH), String(MAX_PITCH), '0.01', String(DEFAULT_PITCH), '%',
                v => Math.round(parseFloat(v) * 100)
            ),
            createControlGroup(
                'Multiplier:',
                'multiplier-slider',
                'range',
                '1', String(MAX_MULTIPLIER), '1', String(DEFAULT_MULTIPLIER), '',
                v => `x${v}`
            ),

            // MIDI controls --------------------------------------------------
            createElement('div', { className: 'midi-controls control-group' }, [
                createElement('label', { for: 'midi-device-select', textContent: 'MIDI In:' }),
                createElement('select', { id: 'midi-device-select', disabled: true }, [
                    createElement('option', { value: '', textContent: 'Loading MIDI...' })
                ]),
                createElement('span', { id: 'midi-status', className: 'value-display', textContent: 'Unavailable' })
            ])
        ])
    ]);

    // Visual tweak: accent colour for multiplier slider
    const multiplierSlider = controlsColumn.querySelector('#multiplier-slider');
    if (multiplierSlider) multiplierSlider.style.accentColor = '#d08770';

    return controlsColumn;
}

// -----------------------------------------------------------------------------
// Reference‑panel helper
// -----------------------------------------------------------------------------

/**
 * Injects the reference HTML content into the given panel *once*.
 * @param {HTMLElement} panelElement
 */
export function initReferencePanel(panelElement) {
    if (!panelElement) {
        console.error('initReferencePanel: panel element missing.');
        return;
    }
    if (!panelElement.dataset.initialized) {
        panelElement.innerHTML = referenceContentHTML;
        panelElement.dataset.initialized = 'true';
    }
}

// -----------------------------------------------------------------------------
// Layout builder
// -----------------------------------------------------------------------------

/**
 * Builds the three‑column application layout (controls, image, reference) and
 * appends it to the supplied target element.
 * @param {HTMLElement} targetElement
 */
export function buildLayout(targetElement) {
    if (!targetElement) {
        console.error('buildLayout: target element is null/undefined.');
        throw new Error('buildLayout requires a valid DOM element.');
    }

    // Locate any existing audio‑metadata div inside the target (for reuse)
    const audioMetadataDiv = targetElement.querySelector('.audio-metadata');
    if (audioMetadataDiv) audioMetadataDiv.remove();

    // Column 1 — controls -----------------------------------------------------
    const controlsColumn = createControlsColumn();

    // Column 2 — main image ---------------------------------------------------
    const imageArea = createElement('div', { className: 'image-area' }, [
        createElement('img', {
            id: 'main-image',
            src: '#',
            alt: 'Audional Art Visuals',
            title: 'Click to toggle tempo loop'
        })
    ]);

    // Column 3 — reference panel ---------------------------------------------
    const referenceColumn = createElement('div', { className: 'reference-column hidden' }, [
        createElement('div', { id: 'reference-panel', className: 'reference-panel' })
    ]);

    // Assemble layout --------------------------------------------------------
    const mainLayout = createElement('div', { className: 'main-layout' }, [
        controlsColumn,
        imageArea,
        referenceColumn
    ]);

    // Re‑insert existing metadata (if found) into the new controls column
    if (audioMetadataDiv) {
        const placeholder = controlsColumn.querySelector('.metadata-placeholder');
        const insertionPoint = placeholder || controlsColumn;
        insertionPoint.parentNode.replaceChild(audioMetadataDiv, placeholder);
    }

    // Mount to DOM -----------------------------------------------------------
    targetElement.appendChild(mainLayout);

    console.log('Layout built successfully.');
}

// -----------------------------------------------------------------------------
// Named exports (already exported where declared, but consolidated for clarity)
// -----------------------------------------------------------------------------
export default {
    createControlsColumn,
    initReferencePanel,
    buildLayout
};
