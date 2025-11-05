import { projectState, runtimeState, getCurrentSequence, ensureSamplerChannelDefaults } from './sequencer-state.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';
import { updateAllChannelGains } from './sequencer-channel-mixer.js';

const WORKLET_URL = './modules/sequencer/worklet/sequencer-scheduler-processor.js';
const LOOKAHEAD_SECONDS = 0.12;
export const TRANSPORT_START_DELAY = 0.08;
const STEP_SUBDIVISION = 4; // 16th notes

function computeStepCount(sequence) {
    if (!sequence?.channels?.length) return 64;
    let max = 0;
    sequence.channels.forEach(channel => {
        const length = Array.isArray(channel?.steps) ? channel.steps.length : 0;
        if (length > max) max = length;
    });
    return max || 64;
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

            this.node = new AudioWorkletNode(rawContext, 'bop-sequencer-scheduler', {
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
        const startTime = ctx.currentTime + TRANSPORT_START_DELAY;
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
                this.triggerInstrument(channel, trigger, scheduledTime, stepIndex, cycle);
            }
        });
    }

    triggerInstrument(channel, trigger, scheduledTime, stepIndex, cycle) {
        if (!channel?.instrumentId) return;
        const instrument = runtimeState.instrumentRack[channel.instrumentId];
        if (!instrument) return;
        const logic = instrument.logic;
        const recorder = logic?.modules?.recorder;
        if (!recorder) return;
        const playbackState = runtimeState.instrumentPlaybackState.get(channel.instrumentId);
        const shouldRetrigger = !playbackState || playbackState.stepIndex !== stepIndex || playbackState.cycle !== cycle;
        if (!shouldRetrigger) return;
        const transportTime = runtimeState.Tone?.Transport?.seconds;
        instrument.playInternalSequence({
            transportTime: typeof transportTime === 'number' ? transportTime : undefined,
            audioTime: scheduledTime,
            stepIndex,
            cycle,
            forceRestart: !!playbackState
        });
        runtimeState.instrumentPlaybackState.set(channel.instrumentId, {
            stepIndex,
            cycle,
            lastTriggerTime: scheduledTime
        });
    }

    handleSequenceEnd({ scheduledTime, nextStep }) {
        if (this.mode !== 'all') return;
        if (!Number.isFinite(scheduledTime)) return;
        const detail = {
            scheduledTime,
            nextStep: Number.isInteger(nextStep) ? nextStep : 0
        };
        if (typeof this.onSequenceAdvance === 'function') {
            this.onSequenceAdvance(detail);
        } else {
            this.pendingAdvance = detail;
        }
    }
}

export const schedulerHost = new SequencerSchedulerHost();
