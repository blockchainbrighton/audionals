import { projectState, runtimeState } from './sequencer-state.js';
import { TOTAL_STEPS } from './sequencer-config.js';
import { schedulerHost } from './sequencer-scheduler-host.js';
import { MidiControl } from '../synth/synth-midi.js';

const instrumentBindings = new Map();
const recordingSessions = new Map();
const recordingStatuses = new Map();
const STEP_SUBDIVISION = 4; // Matches sequencer-scheduler-host subdivision (16th notes)
const TRANSPORT_LOOKAHEAD = 0.12;
const TRANSPORT_READY_BUFFER = 0.02;
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

function estimatePlaybackLatency() {
    const Tone = runtimeState.Tone;
    const ctx = Tone?.context?.rawContext
        ?? Tone?.context?._context
        ?? Tone?.context
        ?? null;
    const baseLatency = ctx?.baseLatency ?? Tone?.context?.baseLatency ?? 0;
    const outputLatency = ctx?.outputLatency ?? 0;
    return TRANSPORT_LOOKAHEAD + TRANSPORT_READY_BUFFER + baseLatency + outputLatency;
}

function computeLoopTiming(channel) {
    const bpm = typeof projectState.bpm === 'number' && projectState.bpm > 0 ? projectState.bpm : 120;
    const secondsPerBeat = 60 / bpm;
    const secondsPerStep = secondsPerBeat / STEP_SUBDIVISION;
    const stepCount = Array.isArray(channel?.steps) && channel.steps.length
        ? channel.steps.length
        : TOTAL_STEPS;
    const rawDuration = Math.max(secondsPerStep, stepCount * secondsPerStep);
    const loopDuration = Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : secondsPerStep * TOTAL_STEPS;
    return { secondsPerStep, loopDuration };
}

function normalizeLoopPosition(rawPosition, loopDuration) {
    if (!Number.isFinite(rawPosition)) return 0;
    if (!Number.isFinite(loopDuration) || loopDuration <= 0) return Math.max(0, rawPosition);
    const wrapped = rawPosition % loopDuration;
    return wrapped < 0 ? wrapped + loopDuration : wrapped;
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
    const { secondsPerStep, loopDuration } = computeLoopTiming(binding.channel);
    const playbackActive = !!projectState.isPlaying;
    const safeLoopDuration = loopDuration > 0 ? loopDuration : secondsPerStep * TOTAL_STEPS;
    recordingSessions.set(instrumentId, {
        isRecording: true,
        startTime,
        firstNoteTime: null,
        mode: playbackActive ? 'live' : 'armed',
        loopDuration: safeLoopDuration,
        secondsPerStep,
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
        session.activeNotes.forEach(({ clipEvent, startedAt }) => {
            if (clipEvent) {
                clipEvent.dur = Math.max(0.001, now - (startedAt ?? now));
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
    let relStart;
    let timingDetail = null;
    let loopDurationSeconds = Number.isFinite(session.loopDuration) && session.loopDuration > 0
        ? session.loopDuration
        : 0;
    if (session.mode === 'live' && projectState.isPlaying) {
        const stepDuration = Number.isFinite(runtimeState.stepDurationSeconds)
            ? runtimeState.stepDurationSeconds
            : session.secondsPerStep;
        const stepsPerLoop = Math.max(
            Array.isArray(session.channel?.steps) ? session.channel.steps.length : TOTAL_STEPS,
            TOTAL_STEPS
        );
        const loopDuration = stepDuration * stepsPerLoop;
        loopDurationSeconds = loopDuration;
        const currentCycle = Number.isFinite(runtimeState.sequenceCycle) ? runtimeState.sequenceCycle : 0;
        const currentStep = Number.isFinite(runtimeState.currentStepIndex) ? runtimeState.currentStepIndex : 0;
        const baseSteps = Math.max(0, currentCycle * stepsPerLoop + currentStep);
        const baseTime = baseSteps * stepDuration;
        const scheduledTime = runtimeState.currentStepScheduledTime;
        const latency = estimatePlaybackLatency();
        const perceivedNow = now - latency;
        const referenceTime = Number.isFinite(scheduledTime) ? scheduledTime : perceivedNow;
        let stepProgress = perceivedNow - referenceTime;
        if (Number.isFinite(stepDuration) && stepDuration > 0) {
            const cap = stepDuration * 1.5;
            if (stepProgress < -cap) stepProgress = -cap;
            if (stepProgress > cap) stepProgress = cap;
        } else {
            stepProgress = 0;
        }
        const absoluteTime = baseTime + stepProgress;
        relStart = normalizeLoopPosition(absoluteTime, loopDuration);
        timingDetail = {
            mode: 'live',
            cycle: currentCycle,
            step: currentStep,
            baseTime,
            stepProgress,
            stepDuration,
            scheduledTime
        };
    } else {
        if (!Number.isFinite(session.firstNoteTime)) {
            session.firstNoteTime = now;
        }
        relStart = Math.max(0, now - session.firstNoteTime);
        if (!Number.isFinite(loopDurationSeconds) || loopDurationSeconds <= 0) {
            loopDurationSeconds = session.secondsPerStep * (Array.isArray(session.channel?.steps) ? session.channel.steps.length : TOTAL_STEPS);
        }
        timingDetail = { mode: 'armed', firstNoteTime: session.firstNoteTime };
    }
    const normalizedLoopDuration = Number.isFinite(loopDurationSeconds) && loopDurationSeconds > 0
        ? loopDurationSeconds
        : session.secondsPerStep * (Array.isArray(session.channel?.steps) ? session.channel.steps.length : TOTAL_STEPS);
    const loopPercent = normalizedLoopDuration > 0 ? (relStart / normalizedLoopDuration) * 100 : 0;
    console.groupCollapsed('[RecordDiag] Live Note Captured');
    console.log({
        instrumentId,
        note,
        now,
        relStartSeconds: Number(relStart.toFixed(6)),
        loopPercent: Number(loopPercent.toFixed(2)),
        timingDetail
    });
    const noteEntry = {
        id: `${note}_${relStart.toFixed(3)}`,
        note,
        start: relStart,
        dur: 0.001,
        vel: clampVelocity(velocity)
    };
    clip.seq.push(noteEntry);
    session.activeNotes.set(note, {
        clipEvent: noteEntry,
        startedAt: now
    });
    console.log('Clip Entry', {
        id: noteEntry.id,
        start: Number(noteEntry.start.toFixed(6)),
        dur: Number(noteEntry.dur.toFixed(6)),
        vel: noteEntry.vel
    });
    console.groupEnd();
    notifySequenceChanged(session.eventBus);
}

function handleNoteOff(instrumentId, note) {
    if (!instrumentId || !note) return;
    const session = recordingSessions.get(instrumentId);
    if (!session || !session.isRecording) return;
    const noteState = session.activeNotes.get(note);
    if (!noteState) return;
    const now = getAudioTime();
    const startedAt = Number.isFinite(noteState.startedAt) ? noteState.startedAt : now;
    noteState.clipEvent.dur = Math.max(0.001, now - startedAt);
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

runtimeState.__resetInstrumentLiveState = resetInstrumentLiveState;

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
