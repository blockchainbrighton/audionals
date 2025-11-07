import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../modules/sequencer/plugins/channel-insert-manager.js', () => ({
    ensureChannelInsertChain: vi.fn(() => null),
    attachSourceToChannelInserts: vi.fn()
}));

vi.mock('../modules/sequencer/sequencer-channel-mixer.js', () => ({
    ensureChannelGain: vi.fn(() => null)
}));

import { playSamplerChannel } from '../modules/sequencer/sequencer-sampler-playback.js';
import { runtimeState, ensureSamplerChannelDefaults } from '../modules/sequencer/sequencer-state.js';

class FakeAmpEnv {
    constructor(opts = {}) {
        this.opts = opts;
        this.attack = opts.attack ?? 0;
        this.release = opts.release ?? 0;
        this.attackCurve = null;
        this.releaseCurve = null;
        this.triggerAttackRelease = vi.fn();
        this.disconnect = vi.fn();
        this.connect = vi.fn();
        this.cancel = vi.fn();
        this.triggerRelease = vi.fn();
    }
}

class FakePlayer {
    constructor() {
        this.connect = vi.fn();
        this.disconnect = vi.fn();
        this.start = vi.fn();
        this.stop = vi.fn();
        this.dispose = vi.fn();
        this.fadeIn = 0;
        this.fadeOut = 0;
        this.loop = false;
        this.buffer = null;
        this.playbackRate = 1;
        this.onstop = null;
    }
}

const createFakeTone = () => ({
    AmplitudeEnvelope: FakeAmpEnv,
    Player: FakePlayer,
    now: vi.fn(() => 0)
});

const resetRuntimeState = () => {
    runtimeState.Tone = createFakeTone();
    runtimeState.allSampleBuffers = {};
    runtimeState.samplerVoices = new Map();
    runtimeState.channelInsertChains = new Map();
};

describe('playSamplerChannel trimming and fades', () => {
    beforeEach(() => {
        resetRuntimeState();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createChannel = () => {
        const channel = {
            type: 'sampler',
            steps: [],
            insertSettings: {},
            allowOverlap: false,
            selectedSampleIndex: 0
        };
        ensureSamplerChannelDefaults(channel);
        channel.sampleRegion.start = 0.25;
        channel.sampleRegion.end = 0.5;
        channel.samplePlaybackRate = 1;
        channel.sampleFadeIn = 2;
        channel.sampleFadeOut = 3;
        channel.sampleFadeInShape = 'linear';
        channel.sampleFadeOutShape = 'linear';
        return channel;
    };

    const seedBuffer = (durationSeconds = 4, sampleRate = 48000) => {
        runtimeState.allSampleBuffers[0] = {
            duration: durationSeconds,
            length: durationSeconds * sampleRate,
            sampleRate
        };
    };

    it('clamps fade durations to the trimmed region and honours playback rate', () => {
        const channel = createChannel();
        channel.samplePlaybackRate = 2; // plays back twice as fast
        seedBuffer(4);

        playSamplerChannel(0, channel);

        const voice = runtimeState.samplerVoices.get(channel);
        expect(voice).toBeDefined();
        const entry = voice.voices[0];
        expect(entry).toBeDefined();

        const expectedOffset = 0.25 * 4; // 1 second into buffer
        const expectedSelectionDuration = (0.5 - 0.25) * 4; // 1 second section in buffer time
        const expectedActualDuration = expectedSelectionDuration / channel.samplePlaybackRate; // 0.5s audible

        expect(entry.player.start).toHaveBeenCalledWith(0, expectedOffset, expectedSelectionDuration);
        expect(entry.player.fadeIn).toBeLessThanOrEqual(expectedActualDuration);
        expect(entry.player.fadeOut).toBeLessThanOrEqual(expectedActualDuration);
        expect(entry.ampEnv.attack).toBeLessThanOrEqual(expectedActualDuration);
        expect(entry.ampEnv.release).toBeLessThanOrEqual(expectedActualDuration);

        const [sustainDuration, triggerStart] = entry.ampEnv.triggerAttackRelease.mock.calls[0];
        expect(triggerStart).toBe(0);
        expect(sustainDuration).toBeGreaterThanOrEqual(0);

        expect(entry.busyUntil).toBeCloseTo(expectedActualDuration + 0.05, 5);
    });

    it('uses the trimmed selection length as the playback duration', () => {
        const channel = createChannel();
        seedBuffer(3);

        playSamplerChannel(1.25, channel);

        const voice = runtimeState.samplerVoices.get(channel);
        const entry = voice.voices[0];
        const expectedSelectionDuration = (channel.sampleRegion.end - channel.sampleRegion.start) * 3;
        const expectedOffset = channel.sampleRegion.start * 3;

        expect(entry.player.start).toHaveBeenCalledWith(1.25, expectedOffset, expectedSelectionDuration);
        expect(entry.busyUntil).toBeCloseTo(1.25 + expectedSelectionDuration + 0.05, 5);
    });
});
