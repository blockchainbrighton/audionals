// layout.js — consolidated module (controls column, layout builder, reference display)
import { createElement } from './utils.js';

const DEFAULT_VOLUME = 1.0, DEFAULT_TEMPO = 78, DEFAULT_PITCH = 1.0, DEFAULT_MULTIPLIER = 1;
const MAX_VOLUME = 1.5, MAX_TEMPO = 400, MAX_PITCH = 10.0, MIN_PITCH = 0.01, MAX_MULTIPLIER = 8;

const referenceContentHTML = `
<h2>Keyboard Shortcuts</h2><h3>Volume & Mute</h3><ul>
<li><code>Arrow Up</code>: Increase Volume</li><li><code>Arrow Down</code>: Decrease Volume</li>
<li><code>M</code>: Toggle Mute/Unmute</li></ul><h3>Tempo (BPM)</h3><ul>
<li><code>Shift + = / +</code>: Increase Tempo (+1 BPM)</li><li><code>Shift + - / _</code>: Decrease Tempo (‑1 BPM)</li>
<li><code>Ctrl + Shift + = / +</code>: Increase Tempo (+10 BPM)</li><li><code>Ctrl + Shift + - / _</code>: Decrease Tempo (‑10 BPM)</li>
</ul><h3>Pitch / Playback Rate</h3><ul>
<li><code>Shift + ] / }</code>: Increase Pitch slightly</li><li><code>Shift + [ / {</code>: Decrease Pitch slightly</li>
<li><code>Ctrl + Shift + ] / }</code>: Increase Pitch significantly</li><li><code>Ctrl + Shift + [ / {</code>: Decrease Pitch significantly</li>
<li><code>=</code>: Double Current Pitch (x2)</li><li><code>-</code>: Halve Current Pitch (x0.5)</li><li><code>0</code>: Reset Pitch to 1.0×</li>
</ul><p><em>(<code>Ctrl</code> can be <code>Cmd</code> on macOS)</em></p><h3>Playback</h3><ul>
<li><code>Spacebar</code>: Play sample once</li><li><code>Click Image</code>: Toggle Loop</li><li><code>R</code>: Toggle Reverse Playback</li></ul>`;

// Labelled slider control
const createControlGroup = (label, id, type, min, max, step, val, unit = '', fmt = v => String(v)) =>
  createElement('div', { className: 'control-group' }, [
    createElement('label', { for: id, textContent: label }),
    createElement('input', { type, id, min, max, step, value: val, disabled: true }),
    createElement('span', { className: 'value-display' }, [
      createElement('span', { id: id.replace('-slider', '-value'), textContent: fmt(val) }), unit
    ])
  ]);

export function createControlsColumn() {
  const controls = createElement('div', { className: 'controls-column hidden' }, [
    createElement('div', { className: 'title-bar' }, [
      createElement('h1', { textContent: 'Audional Art' }),
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
      createControlGroup('Volume:', 'volume-slider', 'range', '0.0', MAX_VOLUME, '0.01', DEFAULT_VOLUME, v => Math.round(v * 100)),
      createControlGroup('Tempo:', 'tempo-slider', 'range', '1', MAX_TEMPO, '1', DEFAULT_TEMPO, ' BPM'),
      createControlGroup('Pitch:', 'pitch-slider', 'range', MIN_PITCH, MAX_PITCH, '0.01', DEFAULT_PITCH, v => Math.round(v * 100)),
      createControlGroup('Multiplier:', 'multiplier-slider', 'range', '1', MAX_MULTIPLIER, '1', DEFAULT_MULTIPLIER, '', v => `x${v}`),
      createElement('div', { className: 'midi-controls control-group' }, [
        createElement('label', { for: 'midi-device-select', textContent: 'MIDI In:' }),
        createElement('select', { id: 'midi-device-select', disabled: true }, [
          createElement('option', { value: '', textContent: 'Loading MIDI...' })
        ]),
        createElement('span', { id: 'midi-status', className: 'value-display', textContent: 'Unavailable' })
      ])
    ])
  ]);
  controls.querySelector('#multiplier-slider').style.accentColor = '#d08770';
  return controls;
}

export function initReferencePanel(panel) {
  if (panel && !panel.dataset.initialized) {
    panel.innerHTML = referenceContentHTML;
    panel.dataset.initialized = 'true';
  } else if (!panel) console.error('initReferencePanel: panel element missing.');
}

export function buildLayout(target) {
  if (!target) throw new Error('buildLayout requires a valid DOM element.');
  const metadata = document.querySelector('.audio-metadata');
  metadata?.remove();

  const controls = createControlsColumn();
  const imageArea = createElement('div', { className: 'image-area' }, [
    createElement('img', { id: 'main-image', src: '#', alt: 'Audional Art Visuals', title: 'Click to toggle tempo loop' })
  ]);
  const reference = createElement('div', { className: 'reference-column hidden' }, [
    createElement('div', { id: 'reference-panel', className: 'reference-panel' })
  ]);
  const layout = createElement('div', { className: 'main-layout' }, [controls, imageArea, reference]);

  if (metadata) {
    const placeholder = controls.querySelector('.metadata-placeholder');
    const container = controls.querySelector('#controls-container');
    placeholder?.parentNode.replaceChild(metadata, placeholder)
      || container?.parentNode.insertBefore(metadata, container)
      || controls.appendChild(metadata);
  }

  target.replaceChildren(layout);
  console.log('Layout built successfully.');
}

export function pruneMetadataForDisplay() {
  const div = document.querySelector('.controls-column .audio-metadata');
  if (!div) return console.warn('pruneMetadataForDisplay: .audio-metadata not found.');
  const loop = div.querySelector('#audio-meta-loop')?.parentElement;
  if (loop?.tagName === 'P') loop.remove();

  const noteSpan = div.querySelector('#audio-meta-note');
  const para = noteSpan?.parentElement;
  const label = para?.firstChild;
  if (noteSpan && para?.tagName === 'P' && label?.nodeType === Node.TEXT_NODE) {
    para.innerHTML = '';
    para.append(label.cloneNode(true), noteSpan.cloneNode(true));
  }
}

export default {
  createControlsColumn,
  initReferencePanel,
  buildLayout,
  pruneMetadataForDisplay
};
