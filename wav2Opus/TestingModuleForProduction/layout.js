// --- START OF FILE layout.js ---
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

    <h3>Volume & Mute</h3>
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

    const audioMetadataDiv = document.querySelector('.audio-metadata');

    if (audioMetadataDiv) {
        audioMetadataDiv.remove(); // Remove from original position
    } else {
        console.warn('buildLayout: .audio-metadata div not found in the document. Metadata will not be displayed.');
    }

    const controlsColumn = createControlsColumn();
    const imageArea = createElement('div', { className: 'image-area' }, [
        createElement('img', {
            id: 'main-image',
            src: '#',
            alt: 'Audional Art Visuals',
            title: 'Click to toggle tempo loop'
        })
    ]);
    const referenceColumn = createElement('div', { className: 'reference-column hidden' }, [
        createElement('div', { id: 'reference-panel', className: 'reference-panel' })
    ]);
    const mainLayout = createElement('div', { className: 'main-layout' }, [
        controlsColumn,
        imageArea,
        referenceColumn
    ]);

    if (audioMetadataDiv) {
        const placeholder = controlsColumn.querySelector('.metadata-placeholder');
        if (placeholder) {
            placeholder.parentNode.replaceChild(audioMetadataDiv, placeholder);
            console.log('buildLayout: Successfully moved .audio-metadata into controls column.');
            // PRUNING LOGIC REMOVED FROM HERE
        } else {
            console.warn('buildLayout: .metadata-placeholder not found in controlsColumn. Attempting to insert .audio-metadata before #controls-container.');
            const controlsContainerEl = controlsColumn.querySelector('#controls-container');
            if (controlsContainerEl) {
                controlsColumn.insertBefore(audioMetadataDiv, controlsContainerEl);
            } else {
                console.warn('buildLayout: #controls-container also not found in controlsColumn. Appending .audio-metadata to end of controlsColumn.');
                controlsColumn.appendChild(audioMetadataDiv);
            }
        }
    }

    targetElement.innerHTML = '';
    targetElement.appendChild(mainLayout);

    console.log('Layout built successfully.');
}

/**
 * Prunes the content of the .audio-metadata div for display purposes.
 * This should be called AFTER other modules (like audioProcessor) have read
 * any necessary data from the original metadata structure.
 */
export function pruneMetadataForDisplay() {
    // Use a more specific selector to ensure we're targeting the one in the controls column
    const audioMetadataDiv = document.querySelector('.controls-column .audio-metadata');
    if (!audioMetadataDiv) {
        console.warn('pruneMetadataForDisplay: .audio-metadata div not found in controls column. Cannot prune.');
        return;
    }

    console.log('pruneMetadataForDisplay: Attempting to prune metadata display...');

    // 1. Remove the "Loop" paragraph entirely
    const loopSpan = audioMetadataDiv.querySelector('#audio-meta-loop');
    if (loopSpan && loopSpan.parentElement && loopSpan.parentElement.tagName === 'P') {
        loopSpan.parentElement.remove();
        console.log('pruneMetadataForDisplay: Pruned "Loop" metadata line.');
    } else {
        console.log('pruneMetadataForDisplay: "Loop" metadata line or its span not found for pruning.');
    }

    // 2. Modify the "Note" paragraph to remove the frequency part
    const noteSpan = audioMetadataDiv.querySelector('#audio-meta-note');
    if (noteSpan && noteSpan.parentElement && noteSpan.parentElement.tagName === 'P') {
        const noteParagraph = noteSpan.parentElement;
        const labelTextNode = noteParagraph.firstChild; // Expected "Note: "

        if (labelTextNode && labelTextNode.nodeType === Node.TEXT_NODE) {
            // Reconstruct the paragraph with only the label and the note span
            const preservedLabel = labelTextNode.cloneNode(true);
            const preservedNoteSpan = noteSpan.cloneNode(true);

            noteParagraph.innerHTML = ''; // Clear existing content
            noteParagraph.appendChild(preservedLabel);
            noteParagraph.appendChild(preservedNoteSpan);
            console.log('pruneMetadataForDisplay: Pruned frequency from "Note" metadata line.');
        } else {
            console.warn('pruneMetadataForDisplay: Could not prune frequency: "Note" paragraph structure not as expected (label missing or not a text node).');
        }
    } else {
        console.log('pruneMetadataForDisplay: "Note" metadata line or its span not found for pruning.');
    }
}


// -----------------------------------------------------------------------------
// Named exports (already exported where declared, but consolidated for clarity)
// -----------------------------------------------------------------------------
export default {
    createControlsColumn,
    initReferencePanel,
    buildLayout,
    pruneMetadataForDisplay // <-- EXPORT THE NEW FUNCTION
};
// --- END OF FILE layout.js ---