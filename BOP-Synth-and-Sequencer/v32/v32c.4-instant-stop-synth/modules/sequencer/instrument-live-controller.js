import { projectState, runtimeState } from './sequencer-state.js';
import { TOTAL_STEPS } from './sequencer-config.js';
import { schedulerHost } from './sequencer-scheduler-host.js';
import { MidiControl } from '../synth/synth-midi.js';

const instrumentBindings = new Map();
const recordingSessions = new Map();
const recordingStatuses = new Map();
const MIDI_UNAVAILABLE = Symbol('midi-unavailable');
let midiRouter = null;

function ensureInstrumentStep(channel) {
    if (!channel || channel.type !== 'instrument') return;
    if (!Array.isArray(channel.steps) || channel.steps.length !== TOTAL_STEPS) {
        channel.steps = Array(TOTAL_STEPS).fill(false);
    }
    if (channel.steps.some(Boolean)) return;
    channel.steps[0] = true;
    channel.__autoInstrumentStepApplied = true;
    try {
        schedulerHost?.requestResync?.();
    } catch (err) {
        console.warn('[InstrumentLive] Failed to request scheduler resync after priming instrument channel.', err);
    }
}

function getAudioTime() {
    const Tone = runtimeState.Tone;
    if (Tone?.now) return Tone.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now() / 1000;
    }
    return Date.now() / 1000;
}

function clampVelocity(velocity) {
    if (typeof velocity !== 'number' || Number.isNaN(velocity)) return 0.45;
    return Math.max(0.15, Math.min(velocity, 0.85));
}

function notifySequenceChanged(eventBus) {
    if (!eventBus) return;
    try {
        eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    } catch (err) {
        console.warn('[InstrumentLive] Failed to dispatch sequence-changed event:', err);
    }
    try {
        schedulerHost?.requestResync?.();
    } catch (err) {
        console.warn('[InstrumentLive] Failed to request scheduler resync after sequence change.', err);
    }
}

function startRecordingSession(instrumentId, binding) {
    if (!instrumentId || !binding?.channel) return;
    const startTime = getAudioTime();
    recordingSessions.set(instrumentId, {
        isRecording: true,
        startTime,
        activeNotes: new Map(),
        channel: binding.channel,
        eventBus: binding.eventBus
    });
    recordingStatuses.set(instrumentId, true);
    notifySequenceChanged(binding.eventBus);
}

function stopRecordingSession(instrumentId, binding) {
    if (!instrumentId) return;
    const session = recordingSessions.get(instrumentId);
    if (session) {
        const now = getAudioTime();
        session.activeNotes.forEach((_, note) => {
            const entry = session.channel?.instrumentClip?.seq?.find(evt => evt.note === note && evt.dur <= 0);
            if (entry) {
                entry.dur = Math.max(0.001, (now - session.startTime) - entry.start);
            }
        });
        recordingSessions.delete(instrumentId);
    }
    recordingStatuses.set(instrumentId, false);
    notifySequenceChanged(binding?.eventBus ?? session?.eventBus);
}

function ensureRecordingChannel(channel) {
    if (!channel) return null;
    return channel.instrumentClip ? channel : null;
}

function handleNoteOn(instrumentId, note, velocity) {
    if (!instrumentId || !note) return;
    const session = recordingSessions.get(instrumentId);
    if (!session || !session.isRecording) return;
    const channel = ensureRecordingChannel(session.channel);
    if (!channel) return;
    const clip = channel.instrumentClip;
    const now = getAudioTime();
    const relStart = Math.max(0, now - session.startTime);
    const noteEntry = {
        id: `${note}_${relStart.toFixed(3)}`,
        note,
        start: relStart,
        dur: 0.001,
        vel: clampVelocity(velocity)
    };
    clip.seq.push(noteEntry);
    session.activeNotes.set(note, noteEntry);
    notifySequenceChanged(session.eventBus);
}

function handleNoteOff(instrumentId, note) {
    if (!instrumentId || !note) return;
    const session = recordingSessions.get(instrumentId);
    if (!session || !session.isRecording) return;
    const entry = session.activeNotes.get(note);
    if (!entry) return;
    const now = getAudioTime();
    entry.dur = Math.max(0.001, (now - session.startTime) - entry.start);
    session.activeNotes.delete(note);
    notifySequenceChanged(session.eventBus);
}

function forwardMidiEvent(eventName, detail) {
    const instrumentId = runtimeState.activeInstrumentId;
    if (!instrumentId) return;
    const instrument = runtimeState.instrumentRack[instrumentId];
    const eventBus = instrument?.logic?.eventBus;
    if (!eventBus) return;
    try {
        eventBus.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch (err) {
        console.warn('[InstrumentLive] Failed to forward MIDI event to instrument:', err);
    }
}

function ensureMidiRouter() {
    if (midiRouter === MIDI_UNAVAILABLE) return null;
    if (midiRouter) return midiRouter;
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
        midiRouter = MIDI_UNAVAILABLE;
        console.warn('[InstrumentLive] MIDI routing unavailable in this environment.');
        return null;
    }

    const bus = typeof window !== 'undefined' && typeof window.EventTarget === 'function'
        ? new window.EventTarget()
        : document.createElement('div');

    const noteOnHandler = event => forwardMidiEvent('midi-note-on', event.detail);
    const noteOffHandler = event => forwardMidiEvent('midi-note-off', event.detail);
    bus.addEventListener('midi-note-on', noteOnHandler);
    bus.addEventListener('midi-note-off', noteOffHandler);

    let midiControl = null;
    try {
        midiControl = new MidiControl(bus);
    } catch (err) {
        console.warn('[InstrumentLive] Failed to initialize MIDI controller:', err);
    }

    midiRouter = { bus, midiControl, noteOnHandler, noteOffHandler };
    return midiRouter;
}

export function registerInstrumentLiveSession({ instrumentId, logic, channel }) {
    if (!instrumentId || !logic?.eventBus || !channel) return;

    unregisterInstrumentLiveSession(instrumentId);

    const eventBus = logic.eventBus;
    const noteOnHandler = event => handleNoteOn(instrumentId, event?.detail?.note, event?.detail?.velocity);
    const noteOffHandler = event => handleNoteOff(instrumentId, event?.detail?.note);
    const midiNoteOnHandler = event => handleNoteOn(instrumentId, event?.detail?.note, event?.detail?.velocity);
    const midiNoteOffHandler = event => handleNoteOff(instrumentId, event?.detail?.note);
    instrumentBindings.set(instrumentId, {
        eventBus,
        channel,
        noteOnHandler,
        noteOffHandler
    });
    eventBus.addEventListener('keyboard-note-on', noteOnHandler);
    eventBus.addEventListener('keyboard-note-off', noteOffHandler);
    eventBus.addEventListener('midi-note-on', midiNoteOnHandler);
    eventBus.addEventListener('midi-note-off', midiNoteOffHandler);
    ensureInstrumentStep(channel);
    runtimeState.instrumentLiveChannels = runtimeState.instrumentLiveChannels || new Map();
    runtimeState.instrumentLiveChannels.set(instrumentId, channel);
}

export function unregisterInstrumentLiveSession(instrumentId) {
    if (!instrumentId) return;
    const binding = instrumentBindings.get(instrumentId);
    if (binding) {
        const { eventBus, noteOnHandler, noteOffHandler, midiNoteOnHandler, midiNoteOffHandler } = binding;
        try { eventBus.removeEventListener('keyboard-note-on', noteOnHandler); } catch {}
        try { eventBus.removeEventListener('keyboard-note-off', noteOffHandler); } catch {}
        try { eventBus.removeEventListener('midi-note-on', midiNoteOnHandler); } catch {}
        try { eventBus.removeEventListener('midi-note-off', midiNoteOffHandler); } catch {}
        instrumentBindings.delete(instrumentId);
    }
    recordingSessions.delete(instrumentId);
    recordingStatuses.delete(instrumentId);
    runtimeState.instrumentLiveChannels?.delete?.(instrumentId);
    if (runtimeState.activeInstrumentId === instrumentId) {
        runtimeState.activeInstrumentId = null;
        runtimeState.activeInstrumentChannel = null;
    }
}

export function resetInstrumentLiveState() {
    Array.from(instrumentBindings.keys()).forEach(id => unregisterInstrumentLiveSession(id));
    instrumentBindings.clear();
    recordingSessions.clear();
    recordingStatuses.clear();
    runtimeState.instrumentLiveChannels = new Map();
    runtimeState.activeInstrumentId = null;
    runtimeState.activeInstrumentChannel = null;
}

export function isInstrumentChannelActive(channel) {
    if (!channel || !channel.instrumentId) return false;
    return runtimeState.activeInstrumentId === channel.instrumentId;
}

export function activateInstrumentChannel(sequenceIndex, channelIndex) {
    const sequence = projectState.sequences?.[sequenceIndex];
    const channel = sequence?.channels?.[channelIndex];
    if (!channel || channel.type !== 'instrument') return false;
    const instrumentId = channel.instrumentId;
    if (!instrumentId) return false;
    const instrument = runtimeState.instrumentRack[instrumentId];
    if (!instrument) return false;
    runtimeState.activeInstrumentId = instrumentId;
    runtimeState.activeInstrumentChannel = { sequenceIndex, channelIndex };
    ensureMidiRouter();
    return true;
}

export function deactivateInstrumentChannel(instrumentId = null) {
    if (instrumentId && runtimeState.activeInstrumentId !== instrumentId) return false;
    if (!runtimeState.activeInstrumentId) return false;
    runtimeState.activeInstrumentId = null;
    runtimeState.activeInstrumentChannel = null;
    return true;
}

export function isInstrumentRecording(instrumentId) {
    return !!recordingStatuses.get(instrumentId);
}

export function toggleInstrumentRecording(instrumentId) {
    const newState = !isInstrumentRecording(instrumentId);
    const binding = instrumentBindings.get(instrumentId);
    if (!binding) return false;
    if (newState) {
        startRecordingSession(instrumentId, binding);
    } else {
        stopRecordingSession(instrumentId, binding);
    }
    return newState;
}
