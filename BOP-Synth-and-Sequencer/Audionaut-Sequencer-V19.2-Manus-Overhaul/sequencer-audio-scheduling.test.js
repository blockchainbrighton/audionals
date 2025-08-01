/**
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../src/sequencer-state.js', () => ({
    projectState: {
        bpm: 120,
        isPlaying: false,
        playMode: null,
        sequences: [
            {
                channels: [
                    { type: 'sampler', steps: Array(64).fill(false), selectedSampleIndex: 0 },
                    { type: 'instrument', steps: Array(64).fill(false), instrumentId: 'inst-1' }
                ]
            }
        ]
    },
    runtimeState: {
        Tone: global.Tone,
        isToneStarted: false,
        currentStepIndex: 0,
        currentPlaybackSequenceIndex: 0,
        instrumentRack: {},
        activeInstrumentTriggers: new Set()
    },
    getCurrentSequence: jest.fn(() => ({
        channels: [
            { type: 'sampler', steps: Array(64).fill(false), selectedSampleIndex: 0 },
            { type: 'instrument', steps: Array(64).fill(false), instrumentId: 'inst-1' }
        ]
    }))
}));

jest.mock('../src/sequencer-sampler-playback.js', () => ({
    playSamplerChannel: jest.fn(),
    initializeAudioPool: jest.fn(),
    disposeAudioPool: jest.fn()
}));

// Import modules after mocking
const {
    setBPM,
    startPlayback,
    stopPlayback,
    resetAudioEnvironment,
    getSchedulingMetrics
} = await import('../src/sequencer-audio-time-scheduling.js');

const { projectState, runtimeState } = await import('../src/sequencer-state.js');
const { playSamplerChannel, initializeAudioPool, disposeAudioPool } = await import('../src/sequencer-sampler-playback.js');

describe('Audio Scheduling', () => {
    beforeEach(() => {
        // Reset state
        projectState.bpm = 120;
        projectState.isPlaying = false;
        projectState.playMode = null;
        runtimeState.isToneStarted = false;
        runtimeState.currentStepIndex = 0;
        runtimeState.instrumentRack = {};
        runtimeState.activeInstrumentTriggers.clear();
        
        // Reset mocks
        jest.clearAllMocks();
        global.Tone.Transport.bpm.value = 120;
    });

    describe('setBPM', () => {
        test('sets valid BPM value', () => {
            setBPM(140);
            
            expect(projectState.bpm).toBe(140);
            expect(global.Tone.Transport.bpm.value).toBe(140);
        });

        test('clamps BPM to valid range', () => {
            setBPM(50); // Too low
            expect(projectState.bpm).toBe(60);
            
            setBPM(200); // Too high
            expect(projectState.bpm).toBe(180);
        });

        test('handles invalid BPM values', () => {
            const originalBpm = projectState.bpm;
            
            setBPM('invalid');
            expect(projectState.bpm).toBe(originalBpm);
            
            setBPM(null);
            expect(projectState.bpm).toBe(originalBpm);
        });

        test('rounds BPM to 2 decimal places', () => {
            setBPM(120.12345);
            expect(projectState.bpm).toBe(120.12);
        });

        test('handles missing Tone.js Transport', () => {
            runtimeState.Tone = null;
            
            expect(() => setBPM(130)).not.toThrow();
            expect(projectState.bpm).toBe(130);
        });
    });

    describe('startPlayback', () => {
        test('starts sequence playback mode', async () => {
            await startPlayback('sequence');
            
            expect(projectState.isPlaying).toBe(true);
            expect(projectState.playMode).toBe('sequence');
            expect(global.Tone.start).toHaveBeenCalled();
            expect(global.Tone.Transport.start).toHaveBeenCalled();
            expect(initializeAudioPool).toHaveBeenCalled();
        });

        test('starts all playback mode', async () => {
            projectState.sequences = [
                { channels: [] },
                { channels: [] }
            ];
            
            await startPlayback('all');
            
            expect(projectState.isPlaying).toBe(true);
            expect(projectState.playMode).toBe('all');
            expect(runtimeState.currentPlaybackSequenceIndex).toBe(0);
        });

        test('handles Tone.js start failure', async () => {
            global.Tone.start.mockRejectedValue(new Error('Audio context error'));
            
            await expect(startPlayback('sequence')).rejects.toThrow();
            expect(projectState.isPlaying).toBe(false);
        });

        test('validates playback mode', async () => {
            await expect(startPlayback('invalid')).rejects.toThrow('Invalid playback mode: invalid');
        });

        test('starts audio context only once', async () => {
            runtimeState.isToneStarted = true;
            
            await startPlayback('sequence');
            
            expect(global.Tone.start).not.toHaveBeenCalled();
        });

        test('creates Tone.Sequence with correct parameters', async () => {
            await startPlayback('sequence');
            
            expect(global.Tone.Sequence).toHaveBeenCalledWith(
                expect.any(Function),
                expect.any(Array),
                '16n'
            );
        });
    });

    describe('stopPlayback', () => {
        test('stops transport and cleans up', () => {
            projectState.isPlaying = true;
            projectState.playMode = 'sequence';
            runtimeState.currentStepIndex = 10;
            
            stopPlayback();
            
            expect(global.Tone.Transport.stop).toHaveBeenCalled();
            expect(global.Tone.Transport.cancel).toHaveBeenCalled();
            expect(projectState.isPlaying).toBe(false);
            expect(projectState.playMode).toBeNull();
            expect(runtimeState.currentStepIndex).toBe(0);
        });

        test('disposes sequence', () => {
            const mockSequence = {
                dispose: jest.fn()
            };
            global.Tone.Sequence.mockReturnValue(mockSequence);
            
            // Start then stop
            startPlayback('sequence');
            stopPlayback();
            
            expect(mockSequence.dispose).toHaveBeenCalled();
        });

        test('notifies instruments of transport stop', () => {
            const mockInstrument = {
                logic: {
                    eventBus: {
                        dispatchEvent: jest.fn()
                    }
                }
            };
            runtimeState.instrumentRack['inst-1'] = mockInstrument;
            
            stopPlayback();
            
            expect(mockInstrument.logic.eventBus.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'transport-stop' })
            );
        });

        test('handles missing Tone.js Transport', () => {
            runtimeState.Tone = null;
            
            expect(() => stopPlayback()).not.toThrow();
        });

        test('clears active instrument triggers', () => {
            runtimeState.activeInstrumentTriggers.add('trigger1');
            runtimeState.activeInstrumentTriggers.add('trigger2');
            
            stopPlayback();
            
            expect(runtimeState.activeInstrumentTriggers.size).toBe(0);
        });
    });

    describe('resetAudioEnvironment', () => {
        test('resets all audio components', () => {
            projectState.isPlaying = true;
            runtimeState.instrumentRack['inst-1'] = {
                logic: {
                    modules: {
                        synthEngine: {
                            dispose: jest.fn()
                        }
                    }
                }
            };
            
            resetAudioEnvironment();
            
            expect(projectState.isPlaying).toBe(false);
            expect(disposeAudioPool).toHaveBeenCalled();
            expect(runtimeState.instrumentRack['inst-1'].logic.modules.synthEngine.dispose).toHaveBeenCalled();
        });

        test('handles disposal errors gracefully', () => {
            runtimeState.instrumentRack['inst-1'] = {
                logic: {
                    modules: {
                        synthEngine: {
                            dispose: jest.fn(() => {
                                throw new Error('Disposal error');
                            })
                        }
                    }
                }
            };
            
            expect(() => resetAudioEnvironment()).not.toThrow();
        });
    });

    describe('getSchedulingMetrics', () => {
        test('returns scheduling metrics', () => {
            const metrics = getSchedulingMetrics();
            
            expect(metrics).toHaveProperty('currentJitterMs');
            expect(metrics).toHaveProperty('jitterWithinTarget');
            expect(metrics).toHaveProperty('missedDeadlineRate');
            expect(metrics).toHaveProperty('totalSteps');
            expect(typeof metrics.currentJitterMs).toBe('number');
            expect(typeof metrics.jitterWithinTarget).toBe('boolean');
        });

        test('calculates missed deadline rate correctly', () => {
            const metrics = getSchedulingMetrics();
            
            if (metrics.totalSteps > 0) {
                expect(metrics.missedDeadlineRate).toBeGreaterThanOrEqual(0);
                expect(metrics.missedDeadlineRate).toBeLessThanOrEqual(100);
            } else {
                expect(metrics.missedDeadlineRate).toBe(0);
            }
        });
    });

    describe('Step Scheduling', () => {
        test('schedules sampler channels correctly', async () => {
            // Set up a step to trigger
            projectState.sequences[0].channels[0].steps[0] = true;
            
            await startPlayback('sequence');
            
            // Get the sequence callback and call it
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(0, 0); // time=0, stepIndex=0
            
            expect(playSamplerChannel).toHaveBeenCalledWith(0, projectState.sequences[0].channels[0]);
        });

        test('schedules instrument channels correctly', async () => {
            // Set up instrument with mock
            const mockInstrument = {
                logic: {
                    modules: {
                        recorder: {
                            isPlaying: false
                        }
                    }
                },
                playInternalSequence: jest.fn()
            };
            runtimeState.instrumentRack['inst-1'] = mockInstrument;
            
            // Set up a step to trigger
            projectState.sequences[0].channels[1].steps[0] = true;
            
            await startPlayback('sequence');
            
            // Get the sequence callback and call it
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(0, 0); // time=0, stepIndex=0
            
            expect(mockInstrument.playInternalSequence).toHaveBeenCalled();
        });

        test('skips inactive steps', async () => {
            // All steps are false by default
            await startPlayback('sequence');
            
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(0, 0);
            
            expect(playSamplerChannel).not.toHaveBeenCalled();
        });

        test('dispatches step events', async () => {
            const eventListener = jest.fn();
            window.addEventListener('step', eventListener);
            
            await startPlayback('sequence');
            
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(0.5, 5);
            
            expect(window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'step',
                    detail: expect.objectContaining({
                        stepIndex: 5,
                        time: 0.5
                    })
                })
            );
        });

        test('updates current step index', async () => {
            await startPlayback('sequence');
            
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(0, 10);
            
            expect(runtimeState.currentStepIndex).toBe(10);
        });
    });

    describe('Sequence Chaining (All Mode)', () => {
        test('schedules next sequence in all mode', async () => {
            projectState.sequences = [
                { channels: [{ type: 'sampler', steps: Array(4).fill(false) }] },
                { channels: [{ type: 'sampler', steps: Array(4).fill(false) }] }
            ];
            
            await startPlayback('all');
            
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            // Trigger last step
            callback(1.0, 3);
            
            expect(global.Tone.Transport.scheduleOnce).toHaveBeenCalled();
        });

        test('cycles through sequences in all mode', async () => {
            projectState.sequences = [
                { channels: [] },
                { channels: [] }
            ];
            runtimeState.currentPlaybackSequenceIndex = 0;
            
            await startPlayback('all');
            
            const sequenceCall = global.Tone.Sequence.mock.calls[0];
            const callback = sequenceCall[0];
            
            callback(1.0, 63); // Last step
            
            // Simulate the scheduled callback
            const scheduleCall = global.Tone.Transport.scheduleOnce.mock.calls[0];
            const scheduledCallback = scheduleCall[0];
            scheduledCallback();
            
            expect(runtimeState.currentPlaybackSequenceIndex).toBe(1);
        });
    });
});

