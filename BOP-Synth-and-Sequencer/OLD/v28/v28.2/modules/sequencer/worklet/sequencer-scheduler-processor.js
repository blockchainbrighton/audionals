class BopSequencerSchedulerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.isPlaying = false;
        this.sampleRateHz = sampleRate;
        this.lookAheadSeconds = 0.1;
        this.stepSubdivision = 4; // 16th-notes by default
        this.bpm = 120;
        this.stepDurationSeconds = this.computeStepDuration();

        this.activeSequence = {
            stepCount: 64,
            channels: [],
            soloActive: false
        };
        this.pendingSequence = null;

        this.globalStepCounter = 0;
        this.elapsedSamples = 0;
        this.playheadStartTime = 0;

        this.port.onmessage = event => {
            const data = event.data || {};
            const { type } = data;
            if (!type) return;
            switch (type) {
                case 'configure':
                    this.configure(data);
                    break;
                case 'set-sequence':
                    this.setSequence(data);
                    break;
                case 'start':
                    this.start(data);
                    break;
                case 'stop':
                    this.stop();
                    break;
                default:
                    break;
            }
        };
    }

    configure({ bpm, lookAhead, subdivision }) {
        if (typeof bpm === 'number' && !Number.isNaN(bpm) && bpm > 0) {
            this.bpm = bpm;
        }
        if (typeof lookAhead === 'number' && lookAhead >= 0) {
            this.lookAheadSeconds = lookAhead;
        }
        if (typeof subdivision === 'number' && subdivision > 0) {
            this.stepSubdivision = subdivision;
        }
        this.stepDurationSeconds = this.computeStepDuration();
    }

    computeStepDuration() {
        return 60 / this.bpm / this.stepSubdivision;
    }

    applySequence(sequence, resetStepCounter = true) {
        const payload = sequence || {};
        const stepCount = Number.isInteger(payload.stepCount) && payload.stepCount > 0
            ? payload.stepCount
            : 64;
        this.activeSequence = {
            stepCount,
            channels: Array.isArray(payload.channels) ? payload.channels : [],
            soloActive: Array.isArray(payload.channels)
                ? payload.channels.some(ch => ch?.solo)
                : false
        };
        if (resetStepCounter) {
            this.globalStepCounter = 0;
            this.elapsedSamples = 0;
        }
    }

    setSequence({ sequence, applyAtStep }) {
        if (!sequence) return;
        if (Number.isInteger(applyAtStep) && applyAtStep >= 0) {
            this.pendingSequence = { data: sequence, activateStep: applyAtStep };
            return;
        }
        this.applySequence(sequence, true);
    }

    start({ startTime, startStep }) {
        if (typeof startTime === 'number') {
            this.playheadStartTime = startTime;
        } else {
            this.playheadStartTime = currentTime;
        }
        if (Number.isInteger(startStep) && startStep >= 0) {
            this.globalStepCounter = startStep;
        } else {
            this.globalStepCounter = 0;
        }
        this.elapsedSamples = this.globalStepCounter * this.stepDurationSeconds * this.sampleRateHz;
        this.isPlaying = true;
    }

    stop() {
        this.isPlaying = false;
        this.pendingSequence = null;
        this.globalStepCounter = 0;
        this.elapsedSamples = 0;
    }

    collectTriggers(stepIndex) {
        const triggers = [];
        const { channels, soloActive } = this.activeSequence;
        if (!channels || !channels.length) return triggers;
        for (let i = 0; i < channels.length; i += 1) {
            const channel = channels[i];
            if (!channel) continue;
            const steps = channel.steps;
            if (!steps || stepIndex >= steps.length) continue;
            if (!steps[stepIndex]) continue;
            if (channel.muted) continue;
            if (soloActive && !channel.solo) continue;
            if (channel.type === 'sampler' && channel.sampler) {
                triggers.push({
                    type: 'sampler',
                    channelIndex: channel.index,
                    volume: channel.volume,
                    allowOverlap: !!channel.allowOverlap,
                    sample: channel.sampler
                });
            } else if (channel.type === 'instrument' && channel.instrumentId) {
                triggers.push({
                    type: 'instrument',
                    channelIndex: channel.index,
                    volume: channel.volume,
                    instrumentId: channel.instrumentId
                });
            }
        }
        return triggers;
    }

    applyPendingSequenceIfReady() {
        if (!this.pendingSequence) return;
        if (this.pendingSequence.activateStep > this.globalStepCounter) return;
        this.applySequence(this.pendingSequence.data, false);
        this.pendingSequence = null;
    }

    scheduleDueSteps(blockEndSeconds) {
        const scheduledMessages = [];
        while (this.isPlaying) {
            this.applyPendingSequenceIfReady();
            const stepDurationSeconds = this.stepDurationSeconds;
            const globalStepTimeSeconds = this.globalStepCounter * stepDurationSeconds;
            if ((globalStepTimeSeconds - blockEndSeconds) > this.lookAheadSeconds) {
                break;
            }
            const stepIndex = this.globalStepCounter % this.activeSequence.stepCount;
            const cycle = Math.floor(this.globalStepCounter / this.activeSequence.stepCount);
            const scheduledTime = this.playheadStartTime + globalStepTimeSeconds;
            const triggers = this.collectTriggers(stepIndex);
            scheduledMessages.push({
                type: 'schedule-step',
                scheduledTime,
                stepIndex,
                cycle,
                globalStep: this.globalStepCounter,
                triggers
            });
            if (stepIndex === this.activeSequence.stepCount - 1) {
                const nextGlobalStep = this.globalStepCounter + 1;
                const nextTime = this.playheadStartTime + nextGlobalStep * stepDurationSeconds;
                scheduledMessages.push({
                    type: 'sequence-end',
                    scheduledTime: nextTime,
                    nextStep: nextGlobalStep
                });
            }
            this.globalStepCounter += 1;
        }
        scheduledMessages.forEach(message => this.port.postMessage(message));
    }

    process(inputs, outputs) {
        if (!this.isPlaying) {
            return true;
        }
        let blockSize = 128;
        if (outputs && outputs[0] && outputs[0][0]) {
            blockSize = outputs[0][0].length;
        } else if (inputs && inputs[0] && inputs[0][0]) {
            blockSize = inputs[0][0].length;
        }
        const blockDurationSeconds = blockSize / this.sampleRateHz;
        const blockStartSeconds = this.elapsedSamples / this.sampleRateHz;
        const blockEndSeconds = blockStartSeconds + blockDurationSeconds;

        this.scheduleDueSteps(blockEndSeconds);

        this.elapsedSamples += blockSize;
        return true;
    }
}

registerProcessor('bop-sequencer-scheduler', BopSequencerSchedulerProcessor);
