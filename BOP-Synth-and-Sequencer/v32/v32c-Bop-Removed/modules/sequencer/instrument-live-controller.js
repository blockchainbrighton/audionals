import { projectState, runtimeState } from './sequencer-state.js';
import { TOTAL_STEPS } from './sequencer-config.js';
import { schedulerHost } from './sequencer-scheduler-host.js';
import { MidiControl } from '../synth/synth-midi.js';

const subscribers = new Set();
const instrumentBindings = new Map();
const MIDI_UNAVAILABLE = Symbol('midi-unavailable');
let midiRouter = null;

function notifySubscribers() {
    subscribers.forEach(listener => {
        try {
            listener();
        } catch (err) {
            console.error('[InstrumentLive] Live state listener failed:', err);
        }
    });
}

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

function updateRecordingState(instrumentId, detail = {}) {
    runtimeState.instrumentLiveStatuses.set(instrumentId, {
        isRecording: !!detail.isRecording,
        isArmed: !!detail.isArmed,
        isPlaying: !!detail.isPlaying,
        hasSequence: !!detail.hasSequence
    });
    notifySubscribers();
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

export function onInstrumentLiveStateChange(listener) {
    if (typeof listener !== 'function') return () => {};
    subscribers.add(listener);
    return () => subscribers.delete(listener);
}

export function registerInstrumentLiveSession({ instrumentId, logic, channel }) {
    if (!instrumentId || !logic?.eventBus || !channel) return;

    unregisterInstrumentLiveSession(instrumentId);

    const eventBus = logic.eventBus;
    const recordingHandler = event => updateRecordingState(instrumentId, event?.detail || {});
    const sequenceHandler = () => {
        ensureInstrumentStep(channel);
        try {
            const patch = logic.getFullState?.();
            if (patch) {
                channel.patch = patch;
                channel.patchInstrumentType = channel.instrumentType;
            }
        } catch (err) {
            console.warn('[InstrumentLive] Failed to capture instrument patch after sequence change.', err);
        }
        try {
            logic.modules?.recorder?.flushCompletedTakes?.();
        } catch (err) {
            console.warn('[InstrumentLive] Failed to flush recorder after sequence sync.', err);
        }
    };

    eventBus.addEventListener('recording-state-changed', recordingHandler);
    eventBus.addEventListener('sequence-changed', sequenceHandler);
    instrumentBindings.set(instrumentId, { eventBus, recordingHandler, sequenceHandler });

    const hasSequence = Array.isArray(logic?.state?.seq) && logic.state.seq.length > 0;
    if (!runtimeState.instrumentLiveStatuses.has(instrumentId)) {
        runtimeState.instrumentLiveStatuses.set(instrumentId, {
            isRecording: false,
            isArmed: false,
            isPlaying: false,
            hasSequence
        });
    }
    ensureInstrumentStep(channel);
    notifySubscribers();
}

export function unregisterInstrumentLiveSession(instrumentId) {
    if (!instrumentId) return;
    const binding = instrumentBindings.get(instrumentId);
    if (binding) {
        const { eventBus, recordingHandler, sequenceHandler } = binding;
        try { eventBus.removeEventListener('recording-state-changed', recordingHandler); } catch {}
        try { eventBus.removeEventListener('sequence-changed', sequenceHandler); } catch {}
        instrumentBindings.delete(instrumentId);
    }
    runtimeState.instrumentLiveStatuses.delete(instrumentId);
    if (runtimeState.activeInstrumentId === instrumentId) {
        runtimeState.activeInstrumentId = null;
        runtimeState.activeInstrumentChannel = null;
    }
    notifySubscribers();
}

export function resetInstrumentLiveState() {
    Array.from(instrumentBindings.keys()).forEach(instrumentId => unregisterInstrumentLiveSession(instrumentId));
    instrumentBindings.clear();
    runtimeState.instrumentLiveStatuses.clear();
    runtimeState.activeInstrumentId = null;
    runtimeState.activeInstrumentChannel = null;
    notifySubscribers();
}

export function getInstrumentLiveState(instrumentId) {
    return runtimeState.instrumentLiveStatuses.get(instrumentId) || null;
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
    notifySubscribers();
    return true;
}

export function deactivateInstrumentChannel(instrumentId = null) {
    if (instrumentId && runtimeState.activeInstrumentId !== instrumentId) return false;
    if (!runtimeState.activeInstrumentId) return false;
    runtimeState.activeInstrumentId = null;
    runtimeState.activeInstrumentChannel = null;
    notifySubscribers();
    return true;
}

export function triggerInstrumentRecord(instrumentId) {
    if (!instrumentId) return false;
    const instrument = runtimeState.instrumentRack[instrumentId];
    const eventBus = instrument?.logic?.eventBus;
    if (!eventBus) return false;
    try {
        eventBus.dispatchEvent(new CustomEvent('transport-record'));
        return true;
    } catch (err) {
        console.warn('[InstrumentLive] Failed to dispatch transport-record for instrument:', err);
        return false;
    }
}
