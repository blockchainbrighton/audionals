import PianoRoll from '../synth/synth-piano-roll.js';
import { runtimeState } from './sequencer-state.js';
import * as config from './sequencer-config.js';
import { requestSchedulerResync } from './sequencer-audio-time-scheduling.js';

const editorRegistry = new Map();

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MIDI_LOW_DEFAULT_CENTRE = 60; // C4 fallback when no notes exist

function noteNameToMidi(note) {
    if (typeof note !== 'string') return NaN;
    const match = note.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
    if (!match) return NaN;
    const [, baseRaw, accidentalRaw, octaveRaw] = match;
    const base = baseRaw.toUpperCase();
    if (!(base in NOTE_OFFSETS)) return NaN;
    let semitone = NOTE_OFFSETS[base];
    const accidental = accidentalRaw || '';
    if (accidental === '#') semitone += 1;
    if (accidental === 'b') semitone -= 1;
    const octave = parseInt(octaveRaw, 10);
    if (!Number.isFinite(octave)) return NaN;
    const midi = (octave + 1) * 12 + semitone;
    return Number.isFinite(midi) ? Math.max(0, Math.min(127, midi)) : NaN;
}

function midiToNoteName(midi) {
    if (!Number.isFinite(midi)) return '—';
    const value = Math.round(midi);
    const octave = Math.floor(value / 12) - 1;
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${names[(value % 12 + 12) % 12]}${octave}`;
}

function ensureInstrumentStepGuard(channel) {
    if (!channel) return;
    if (!Array.isArray(channel.steps) || channel.steps.length !== config.TOTAL_STEPS) {
        channel.steps = Array(config.TOTAL_STEPS).fill(false);
    }
    if (channel.__autoInstrumentStepApplied) return;
    const hasActiveStep = channel.steps.some(Boolean);
    if (!hasActiveStep) {
        channel.steps[0] = true;
        channel.__autoInstrumentStepApplied = true;
        requestSchedulerResync();
    }
}

function destroyEditor(record) {
    if (!record) return;
    record.cleanup?.forEach(cleanupFn => {
        try { cleanupFn(); } catch (err) { console.warn('[InstrumentPianoRoll] Cleanup handler failed', err); }
    });
    record.cleanup = [];
    if (record.pianoRoll) {
        try {
            const uiState = record.pianoRoll.getUIState?.();
            if (uiState) record.lastUIState = uiState;
        } catch (err) {
            console.debug('[InstrumentPianoRoll] Unable to capture UI state during destroy', err);
        }
        try { record.pianoRoll.destroy(); } catch (err) { console.warn('[InstrumentPianoRoll] Piano roll destroy failed', err); }
    }
    if (record.root?.parentNode) {
        record.root.parentNode.removeChild(record.root);
    }
    editorRegistry.delete(record.instrumentId);
}

export function detachInstrumentEditor(instrumentId) {
    const record = editorRegistry.get(instrumentId);
    destroyEditor(record);
}

export function pruneUnusedInstrumentEditors(activeInstrumentIds) {
    const active = activeInstrumentIds instanceof Set ? activeInstrumentIds : new Set();
    editorRegistry.forEach((record, id) => {
        if (!active.has(id)) {
            destroyEditor(record);
        }
    });
}

function hydrateEditor(channelData, instrument, hostElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'instrument-piano-roll instrument-piano-roll--collapsed';

    const header = document.createElement('div');
    header.className = 'instrument-piano-roll__header';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'instrument-piano-roll__toggle';
    toggleButton.textContent = 'Show Piano Roll';
    toggleButton.setAttribute('aria-expanded', 'false');

    const summary = document.createElement('span');
    summary.className = 'instrument-piano-roll__summary';
    summary.textContent = 'No notes recorded yet';

    header.append(toggleButton, summary);

    const content = document.createElement('div');
    content.className = 'instrument-piano-roll__content';
    content.style.display = 'none';

    const rollHost = document.createElement('div');
    rollHost.className = 'instrument-piano-roll__canvas';
    rollHost.dataset.pianoHeight = '360px';
    rollHost.dataset.pianoMinHeight = '280px';
    rollHost.dataset.pianoMaxHeight = '420px';
    content.appendChild(rollHost);

    wrapper.append(header, content);
    hostElement.appendChild(wrapper);

    const pianoRoll = new PianoRoll(rollHost, instrument.logic.eventBus, instrument.logic.state);

    const record = {
        instrumentId: channelData.instrumentId,
        pianoRoll,
        root: wrapper,
        rollHost,
        header,
        toggleButton,
        summaryEl: summary,
        contentEl: content,
        eventBus: instrument.logic.eventBus,
        instrument,
        currentChannel: channelData,
        cleanup: [],
        lastUIState: null,
        isCollapsed: true
    };

    const toggleHandler = () => setCollapse(record, !record.isCollapsed, { centerOnNotes: true });
    record.toggleButton.addEventListener('click', toggleHandler);
    record.cleanup.push(() => record.toggleButton.removeEventListener('click', toggleHandler));

    const sequenceChangedHandler = () => {
        const channel = record.currentChannel;
        if (!channel) return;
        ensureInstrumentStepGuard(channel);
        const { instrumentId: instId } = channel;
        const activeInstrument = instId ? runtimeState.instrumentRack[instId] : null;
        if (activeInstrument?.getPatch) {
            try {
                channel.patch = activeInstrument.getPatch();
            } catch (err) {
                console.warn('[InstrumentPianoRoll] Failed to capture instrument patch after edit', err);
            }
        }
        updateNoteSummary(record);
        if (!record.isCollapsed) {
            requestAnimationFrame(() => centerOnNotes(record));
        }
    };

    record.eventBus.addEventListener('sequence-changed', sequenceChangedHandler);
    record.cleanup.push(() => record.eventBus.removeEventListener('sequence-changed', sequenceChangedHandler));

    updateNoteSummary(record);
    ensureInstrumentStepGuard(channelData);

    editorRegistry.set(channelData.instrumentId, record);
    setCollapse(record, true, { skipCenter: true });
    return record;
}

export function attachInstrumentEditor(channelData, hostElement) {
    hostElement.textContent = '';
    hostElement.classList.add('instrument-editor-host');

    if (!channelData.instrumentId) {
        const message = document.createElement('p');
        message.className = 'instrument-editor-message';
        message.textContent = 'Load an instrument to edit MIDI.';
        hostElement.appendChild(message);
        return false;
    }

    const instrument = runtimeState.instrumentRack[channelData.instrumentId];
    if (!instrument || !instrument.logic) {
        const message = document.createElement('p');
        message.className = 'instrument-editor-message';
        message.textContent = 'Instrument offline. Click "Load" to instantiate the synth.';
        hostElement.appendChild(message);
        return false;
    }

    let record = editorRegistry.get(channelData.instrumentId);
    if (record && record.instrument !== instrument) {
        destroyEditor(record);
        record = null;
    }
    if (!record) {
        record = hydrateEditor(channelData, instrument, hostElement);
    } else {
        record.currentChannel = channelData;
        updateNoteSummary(record);
        ensureInstrumentStepGuard(channelData);
        if (record.root?.parentNode !== hostElement) {
            hostElement.appendChild(record.root);
        }
        try {
            record.pianoRoll.draw();
        } catch (err) {
            console.warn('[InstrumentPianoRoll] Failed to redraw piano roll', err);
        }
        setCollapse(record, record.isCollapsed, {
            centerOnNotes: !record.isCollapsed,
            skipCenter: record.isCollapsed
        });
    }

    if (record.lastUIState) {
        try {
            record.pianoRoll.applyUIState(record.lastUIState);
        } catch (err) {
            console.debug('[InstrumentPianoRoll] Failed to restore UI state', err);
        }
        record.lastUIState = null;
    }

    return true;
}

export function getInstrumentEditor(instrumentId) {
    return editorRegistry.get(instrumentId) || null;
}

function setCollapse(record, collapsed, { centerOnNotes: shouldCenter = false, skipCenter = false } = {}) {
    if (!record?.contentEl || !record.toggleButton || !record.root) return;
    record.isCollapsed = collapsed;
    record.contentEl.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
    if (collapsed) {
        record.contentEl.style.display = 'none';
        record.toggleButton.textContent = 'Show Piano Roll';
        record.toggleButton.setAttribute('aria-expanded', 'false');
        record.root.classList.add('instrument-piano-roll--collapsed');
    } else {
        record.contentEl.style.display = '';
        record.toggleButton.textContent = 'Hide Piano Roll';
        record.toggleButton.setAttribute('aria-expanded', 'true');
        record.root.classList.remove('instrument-piano-roll--collapsed');
        record.pianoRoll?.draw();
        if (!skipCenter && shouldCenter) {
            const recenter = () => centerOnNotes(record);
            requestAnimationFrame(recenter);
            setTimeout(recenter, 80);
        }
    }
}

function updateNoteSummary(record) {
    if (!record?.summaryEl) return;
    const seq = Array.isArray(record.instrument?.logic?.state?.seq)
        ? record.instrument.logic.state.seq
        : [];
    if (!seq.length) {
        record.summaryEl.textContent = 'No notes recorded yet';
        return;
    }
    const midiValues = seq
        .map(note => noteNameToMidi(note?.note))
        .filter(value => Number.isFinite(value));
    if (!midiValues.length) {
        record.summaryEl.textContent = 'Notes available';
        return;
    }
    const min = Math.min(...midiValues);
    const max = Math.max(...midiValues);
    const label = `${midiToNoteName(min)}–${midiToNoteName(max)}`;
    record.summaryEl.textContent = `${seq.length} note${seq.length === 1 ? '' : 's'} (${label})`;
}

function centerOnNotes(record) {
    const pianoRoll = record?.pianoRoll;
    const scrollContainer = pianoRoll?.scrollContainer;
    if (!pianoRoll || !scrollContainer) return;
    const seq = Array.isArray(pianoRoll.state?.seq) ? pianoRoll.state.seq : [];
    const earliestNote = seq.reduce((best, note) => {
        if (!note || typeof note.start !== 'number') return best;
        if (!best) return note;
        return note.start < best.start ? note : best;
    }, null);
    let targetMidi = earliestNote ? noteNameToMidi(earliestNote.note) : NaN;
    let targetIndex = -1;
    if (earliestNote) {
        targetIndex = seq.indexOf(earliestNote);
    }

    if (!Number.isFinite(targetMidi)) {
        const midiValues = seq
            .map(note => noteNameToMidi(note?.note))
            .filter(value => Number.isFinite(value));
        targetMidi = midiValues.length
            ? (Math.min(...midiValues) + Math.max(...midiValues)) / 2
            : MIDI_LOW_DEFAULT_CENTRE;
    }
    pianoRoll.centerOnMidi(targetMidi, { immediate: true });

    if (targetIndex >= 0) {
        requestAnimationFrame(() => {
            const noteEl = record.rollHost?.querySelector(`.roll-note[data-idx="${targetIndex}"]`);
            if (!noteEl) return;
            const container = pianoRoll.scrollContainer;
            if (!container) return;
            const noteRect = noteEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offset = noteRect.top - containerRect.top;
            const targetTop = container.scrollTop + offset - container.clientHeight / 2 + noteRect.height / 2;
            container.scrollTop = Math.max(0, targetTop);
        });
    }
}
