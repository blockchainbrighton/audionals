import { projectState, runtimeState, getCurrentSequence, ensureSamplerChannelDefaults, ensureInstrumentClip } from './sequencer-state.js';
import { TOTAL_STEPS } from './sequencer-config.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';
import { updateAllChannelGains } from './sequencer-channel-mixer.js';
import { isInstrumentRecording } from './instrument-live-controller.js';

const WORKLET_URL = './modules/sequencer/worklet/sequencer-scheduler-processor.js';
const LOOKAHEAD_SECONDS = 0.12;
export const TRANSPORT_START_DELAY = 0.08;
const STEP_SUBDIVISION = 4; // 16th notes
const PLAYBACK_READY_TIMEOUT_SECONDS = 0.02;
const SEQUENCE_DIAGNOSTIC_INTERVAL_MS = 4500;

let lastSequenceDiagnosticTimestamp = 0;
let lastLoopDiagnosticCycle = -1;
let baselineHeapMb = null;

function logSequenceDiagnostics(detail = {}) {
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
    if (now - lastSequenceDiagnosticTimestamp < SEQUENCE_DIAGNOSTIC_INTERVAL_MS) return;
    lastSequenceDiagnosticTimestamp = now;

    let samplerVoiceEntries = 0;
    let samplerVoicesPlaying = 0;
    if (runtimeState.samplerVoices) {
        runtimeState.samplerVoices.forEach(voice => {
            if (!voice) return;
            const set = Array.isArray(voice.voices) ? voice.voices : [];
            samplerVoiceEntries += set.length;
            set.forEach(entry => { if (entry?.isPlaying) samplerVoicesPlaying += 1; });
        });
    }
    const instrumentCount = runtimeState.instrumentRack ? Object.keys(runtimeState.instrumentRack).length : 0;
    const insertChains = runtimeState.channelInsertChains?.size ?? 0;
    const auxBuses = runtimeState.auxBuses?.size ?? 0;
    const sampleBuffers = runtimeState.allSampleBuffers ? Object.keys(runtimeState.allSampleBuffers).length : 0;
    const sampleCacheMeta = runtimeState.sampleCacheMeta?.size ?? 0;
    const activeSequences = projectState.sequences?.length ?? 0;
    const playbackSequence = runtimeState.currentPlaybackSequenceIndex ?? projectState.currentSequenceIndex ?? 0;
    const activeInstrumentPlayback = runtimeState.instrumentPlaybackState?.size ?? 0;
    const heapUsedMb = (typeof performance !== 'undefined' && performance.memory)
        ? (performance.memory.usedJSHeapSize / 1048576)
        : NaN;
    const heapText = Number.isFinite(heapUsedMb) ? `${heapUsedMb.toFixed(1)}MB` : 'n/a';
    if (Number.isFinite(heapUsedMb)) {
        if (baselineHeapMb === null || heapUsedMb < baselineHeapMb - 2) {
            baselineHeapMb = heapUsedMb;
        }
    }

    const issues = [];
    if (samplerVoiceEntries > 12) issues.push('reduce sampler overlap');
    if (insertChains > 4) issues.push('bypass inserts');
    if (sampleBuffers > 16 || sampleCacheMeta > 16) issues.push('prune samples');
    if (Number.isFinite(heapUsedMb) && baselineHeapMb !== null && heapUsedMb - baselineHeapMb > 12) {
        issues.push('heap rising');
    }
    const advice = issues.length ? issues.join(', ') : 'normal';

    const summary = `[SEQ-DIAG] seq${playbackSequence} cyc${runtimeState.sequenceCycle ?? 0} ` +
        `step${detail?.nextStep ?? runtimeState.currentStepIndex ?? 0} ` +
        `voices ${samplerVoiceEntries}/${samplerVoicesPlaying} inst ${instrumentCount} ` +
        `ins ${insertChains} samp ${sampleBuffers} heap ${heapText} | ${advice}`;

    console.log(summary);
}

function scheduleInstrumentClipPlayback(channel, instrument, scheduledTime) {
    const clip = ensureInstrumentClip(channel);
    const seq = Array.isArray(clip?.seq) ? clip.seq : [];
    if (!seq.length) return false;
    const engine = instrument?.logic?.modules?.synthEngine;
    if (!engine || typeof engine.triggerAttackRelease !== 'function') return false;
    const sourceBpm = clip?.seqMeta?.recordBpm || projectState.bpm || 120;
    const currentBpm = projectState.bpm || sourceBpm || 120;
    const timeScale = sourceBpm && currentBpm ? (sourceBpm / currentBpm) : 1;
    seq.forEach(note => {
        if (!note) return;
        const noteName = typeof note.note === 'string' ? note.note : 'C4';
        const start = Math.max(0, Number(note.start) || 0) * timeScale;
        const dur = Math.max(0.001, Number(note.dur) || 0.001) * timeScale;
        const velocity = Number.isFinite(note.vel) ? note.vel : 0.8;
        try {
            engine.triggerAttackRelease(noteName, dur, scheduledTime + start, velocity);
        } catch (err) {
            console.warn('[SCHED] Failed to schedule instrument note', err);
        }
    });
    return true;
}

function computeStepCount(sequence) {
    const defaultSteps = Number.isInteger(TOTAL_STEPS) && TOTAL_STEPS > 0 ? TOTAL_STEPS : 64;
    if (!sequence?.channels?.length) return defaultSteps;
    let max = 0;
    sequence.channels.forEach(channel => {
        const length = Array.isArray(channel?.steps) ? channel.steps.length : 0;
        if (length > max) max = length;
    });
    return Math.max(defaultSteps, max || 0);
}

function sanitizeStepArray(channel, stepCount) {
    const buffer = new Uint8Array(stepCount);
    if (!channel?.steps) return buffer;
    const limit = Math.min(stepCount, channel.steps.length);
    for (let i = 0; i < limit; i += 1) {
        buffer[i] = channel.steps[i] ? 1 : 0;
    }
    return buffer;
}

function buildSamplerSnapshot(channel) {
    if (!channel || channel.type !== 'sampler') return null;
    ensureSamplerChannelDefaults(channel);
    const { sampleRegion, samplePlaybackRate, sampleFadeIn, sampleFadeOut } = channel;
    return {
        sampleIndex: Number.isInteger(channel.selectedSampleIndex) ? channel.selectedSampleIndex : 0,
        regionStart: typeof sampleRegion?.start === 'number' ? sampleRegion.start : 0,
        regionEnd: typeof sampleRegion?.end === 'number' ? sampleRegion.end : 1,
        playbackRate: typeof samplePlaybackRate === 'number' ? samplePlaybackRate : 1,
        fadeIn: typeof sampleFadeIn === 'number' ? sampleFadeIn : 0.005,
        fadeOut: typeof sampleFadeOut === 'number' ? sampleFadeOut : 0.05
    };
}

function isStepActive(channel, stepIndex) {
    if (!channel?.steps) return false;
    const steps = channel.steps;
    if (typeof steps.length !== 'number' || steps.length <= stepIndex || stepIndex < 0) return false;
    return !!steps[stepIndex];
}

function computeStepDurationSeconds() {
    const bpm = typeof projectState.bpm === 'number' && projectState.bpm > 0 ? projectState.bpm : 120;
    return 60 / bpm / STEP_SUBDIVISION;
}

export class SequencerSchedulerHost {
    constructor() {
        this.node = null;
        this.context = null;
        this.isRunning = false;
        this.mode = 'sequence';
        this.lastGlobalStep = 0;
        this.pendingSync = false;
        this.readyPromise = null;
        this.sequenceCacheKey = null;
        this.latestStepCount = 64;
        this.pendingAdvance = null;
        this.onSequenceAdvance = null;
    }

    computeTransportTimeForGlobalStep(globalStep) {
        if (!Number.isFinite(globalStep)) return 0;
        const stepDuration = computeStepDurationSeconds();
        return globalStep * stepDuration;
    }

    async ensureReady() {
        if (this.readyPromise) return this.readyPromise;
        const Tone = runtimeState.Tone;
        if (!Tone) {
            throw new Error('[SchedulerHost] Tone.js runtime not available.');
        }

        const toneContext = typeof Tone.getContext === 'function'
            ? Tone.getContext()
            : Tone.context;

        const contextCandidates = [
            toneContext?.rawContext,
            toneContext?._nativeAudioContext,
            toneContext?.context,
            toneContext?._context,
            toneContext?.audioContext,
            Tone.context?.rawContext,
            Tone.context?._nativeAudioContext,
            Tone.context?._context,
            Tone.context?.audioContext
        ];

        const unwrapContext = ctx => {
            let current = ctx;
            const guard = new Set();
            while (current && typeof current === 'object') {
                if (guard.has(current)) break;
                guard.add(current);
                if (current instanceof (globalThis.AudioContext || globalThis.webkitAudioContext || Function)) {
                    break;
                }
                if (current.rawContext && current.rawContext !== current) {
                    current = current.rawContext;
                    continue;
                }
                if (current.context && current.context !== current) {
                    current = current.context;
                    continue;
                }
                if (current._context && current._context !== current) {
                    current = current._context;
                    continue;
                }
                if (current._nativeAudioContext && current._nativeAudioContext !== current) {
                    current = current._nativeAudioContext;
                    continue;
                }
                break;
            }
            return current;
        };

        const rawContext = contextCandidates
            .map(unwrapContext)
            .find(ctx => ctx && typeof ctx.audioWorklet?.addModule === 'function');

        if (!rawContext) {
            throw new Error('[SchedulerHost] Tone.js audio context not initialised yet.');
        }

        this.context = rawContext;
        this.readyPromise = (async () => {
            if (typeof rawContext.state === 'string' && rawContext.state !== 'running' && typeof rawContext.resume === 'function') {
                try {
                    await rawContext.resume();
                } catch (resumeError) {
                    console.warn('[SchedulerHost] Unable to resume audio context before worklet load:', resumeError);
                }
            }

            await rawContext.audioWorklet.addModule(WORKLET_URL);

            this.node = new AudioWorkletNode(rawContext, 'sequencer-scheduler', {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                outputChannelCount: [1]
            });
            this.node.port.onmessage = event => this.handleMessage(event.data);
            this.node.port.start?.();
            this.node.port.postMessage({
                type: 'configure',
                bpm: projectState.bpm,
                lookAhead: LOOKAHEAD_SECONDS,
                subdivision: STEP_SUBDIVISION
            });
        })().catch(err => {
            this.readyPromise = null;
            throw err;
        });
        return this.readyPromise;
    }

    getActiveSequence() {
        if (projectState.playMode === 'all') {
            return projectState.sequences[runtimeState.currentPlaybackSequenceIndex] ?? null;
        }
        return getCurrentSequence();
    }

    buildSequencePayload(sequence) {
        const stepCount = computeStepCount(sequence);
        this.latestStepCount = stepCount;
        const channels = Array.isArray(sequence?.channels) ? sequence.channels : [];
        const payloadChannels = [];
        const transferables = [];
        channels.forEach((channel, index) => {
            if (!channel) return;
            const steps = sanitizeStepArray(channel, stepCount);
            transferables.push(steps.buffer);
            const sampler = buildSamplerSnapshot(channel);
            payloadChannels.push({
                index,
                type: channel.type,
                steps,
                muted: !!channel.muted,
                solo: !!channel.solo,
                volume: typeof channel.volume === 'number' && !Number.isNaN(channel.volume) ? channel.volume : 1,
                allowOverlap: !!channel.allowOverlap,
                instrumentId: channel.instrumentId || null,
                sampler
            });
        });
        return {
            payload: {
                stepCount,
                channels: payloadChannels
            },
            transferables
        };
    }

    postSequence(sequence, applyAtStep = null) {
        if (!this.node) return;
        const { payload, transferables } = this.buildSequencePayload(sequence);
        const message = { type: 'set-sequence', sequence: payload };
        if (Number.isInteger(applyAtStep) && applyAtStep >= 0) {
            message.applyAtStep = applyAtStep;
        }
        this.node.port.postMessage(message, transferables);
        this.sequenceCacheKey = sequence;
    }

    async start(mode) {
        await this.ensureReady();
        this.mode = mode;
        const sequence = this.getActiveSequence();
        this.postSequence(sequence, 0);
        updateAllChannelGains(sequence);
        const ctx = this.context;
        const startTime = ctx.currentTime + TRANSPORT_START_DELAY + PLAYBACK_READY_TIMEOUT_SECONDS;
        await this.primeInstrumentStep(0, 0, startTime, sequence, 0);
        this.node.port.postMessage({
            type: 'start',
            startTime,
            startStep: 0
        });
        this.isRunning = true;
        this.lastGlobalStep = 0;
        this.pendingAdvance = null;
        return startTime;
    }

    updateTempo(bpm) {
        if (!this.node) return;
        this.node.port.postMessage({
            type: 'configure',
            bpm,
            lookAhead: LOOKAHEAD_SECONDS,
            subdivision: STEP_SUBDIVISION
        });
    }

    stop() {
        if (!this.node) return;
        this.node.port.postMessage({ type: 'stop' });
        this.isRunning = false;
        this.lastGlobalStep = 0;
        this.pendingAdvance = null;
    }

    requestResync() {
        if (!this.node) return;
        const sequence = this.getActiveSequence();
        if (!sequence) return;
        const applyAtStep = this.isRunning ? this.lastGlobalStep + 1 : 0;
        this.postSequence(sequence, applyAtStep);
    }

    handleMessage(data) {
        if (!data || typeof data !== 'object') return;
        switch (data.type) {
            case 'schedule-step':
                this.handleScheduleStep(data);
                break;
            case 'sequence-end':
                this.handleSequenceEnd(data);
                break;
            default:
                break;
        }
    }

    handleScheduleStep({ scheduledTime, stepIndex, cycle, globalStep, triggers }) {
        this.lastGlobalStep = globalStep;
        runtimeState.currentStepIndex = stepIndex;
        runtimeState.sequenceCycle = cycle;
        runtimeState.lastStepIndex = stepIndex;
        if (stepIndex === 0 && cycle !== lastLoopDiagnosticCycle) {
            lastLoopDiagnosticCycle = cycle;
            logSequenceDiagnostics({ scheduledTime, nextStep: 0, cycle });
        }
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('step', { detail: { stepIndex, cycle, scheduledTime } }));
        }
        const sequence = this.getActiveSequence();
        if (!sequence) return;
        if (!Array.isArray(triggers)) return;
        triggers.forEach(trigger => {
            if (!trigger) return;
            const channel = sequence.channels?.[trigger.channelIndex];
            if (!channel) return;
            if (trigger.type === 'sampler') {
                playSamplerChannel(scheduledTime, channel, trigger.sample, trigger.allowOverlap);
            } else if (trigger.type === 'instrument') {
                this.triggerInstrument(channel, trigger, scheduledTime, stepIndex, cycle, globalStep);
            }
        });
    }

    triggerInstrument(channel, trigger, scheduledTime, stepIndex, cycle, globalStep = null, options = {}) {
        if (!channel?.instrumentId) return;
        const instrument = runtimeState.instrumentRack[channel.instrumentId];
        if (!instrument) return;
        const playbackState = runtimeState.instrumentPlaybackState.get(channel.instrumentId);
        const force = !!options.force;
        const shouldRetrigger = force || !playbackState || playbackState.stepIndex !== stepIndex || playbackState.cycle !== cycle;
        if (!shouldRetrigger) return;
        const scheduled = scheduleInstrumentClipPlayback(channel, instrument, scheduledTime);
        if (!scheduled) return;
        runtimeState.instrumentPlaybackState.set(channel.instrumentId, {
            stepIndex,
            cycle,
            lastTriggerTime: scheduledTime
        });
    }

    async primeInstrumentStep(stepIndex, cycle, scheduledTime, sequenceOverride = null, globalStep = 0) {
        if (!Number.isFinite(scheduledTime)) return;
        const sequence = sequenceOverride || this.getActiveSequence();
        const channels = sequence?.channels;
        if (!Array.isArray(channels) || !channels.length) return;
        const soloActive = channels.some(ch => ch?.solo);
        const readinessPromises = [];
        channels.forEach((channel, index) => {
            if (!channel || channel.type !== 'instrument' || !channel.instrumentId) return;
            if (channel.muted) return;
            if (soloActive && !channel.solo) return;
            if (!isStepActive(channel, stepIndex)) return;
            const trigger = {
                type: 'instrument',
                channelIndex: index,
                instrumentId: channel.instrumentId,
                volume: channel.volume
            };
            this.triggerInstrument(channel, trigger, scheduledTime, stepIndex, cycle, globalStep, { force: true });
        });
    }

    handleSequenceEnd({ scheduledTime, nextStep }) {
        if (this.mode !== 'all') return;
        if (!Number.isFinite(scheduledTime)) return;
        const detail = {
            scheduledTime,
            nextStep: Number.isInteger(nextStep) ? nextStep : 0
        };
        logSequenceDiagnostics(detail);
        if (typeof this.onSequenceAdvance === 'function') {
            this.onSequenceAdvance(detail);
        } else {
            this.pendingAdvance = detail;
        }
    }
}

export const schedulerHost = new SequencerSchedulerHost();
