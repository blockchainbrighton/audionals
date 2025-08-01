/**
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the config module
jest.mock('../src/sequencer-config.js', () => ({
    INITIAL_INSTRUMENT_CHANNELS: 2,
    INITIAL_SAMPLER_CHANNELS: 8,
    INITIAL_SEQUENCES: 1,
    TOTAL_STEPS: 64
}));

// Mock the plugin API module
jest.mock('../src/sequencer-plugin-api.js', () => ({
    extensionRegistry: {
        applyFilters: jest.fn((name, value) => value),
        executeActions: jest.fn()
    }
}));

// Import modules after mocking
const {
    projectState,
    runtimeState,
    createNewChannel,
    createNewSequence,
    setupDefaultRhythm,
    initializeProject,
    syncNextInstrumentIdAfterLoad,
    getCurrentSequence,
    getSequence,
    addSequence,
    removeSequence,
    updateProjectState,
    validateProjectState,
    getStateSnapshot,
    stateEvents
} = await import('../src/sequencer-state.js');

describe('State Management', () => {
    beforeEach(() => {
        // Reset state before each test
        projectState.sequences.length = 0;
        projectState.currentSequenceIndex = 0;
        projectState.bpm = 120;
        projectState.isPlaying = false;
        projectState.playMode = null;
        projectState.nextInstrumentId = 0;
        
        // Clear runtime state
        Object.keys(runtimeState.instrumentRack).forEach(key => {
            delete runtimeState.instrumentRack[key];
        });
        runtimeState.activeInstrumentTriggers.clear();
    });

    describe('createNewChannel', () => {
        test('creates sampler channel with correct properties', () => {
            const channel = createNewChannel('sampler');
            
            expect(channel.type).toBe('sampler');
            expect(channel.steps).toHaveLength(64);
            expect(channel.steps.every(step => step === false)).toBe(true);
            expect(channel.selectedSampleIndex).toBe(0);
            expect(channel.instrumentId).toBeUndefined();
        });

        test('creates instrument channel with correct properties', () => {
            const channel = createNewChannel('instrument');
            
            expect(channel.type).toBe('instrument');
            expect(channel.steps).toHaveLength(64);
            expect(channel.instrumentId).toBe('inst-0');
            expect(channel.patch).toBeNull();
            expect(channel.selectedSampleIndex).toBeUndefined();
        });

        test('increments instrument ID for multiple instruments', () => {
            const channel1 = createNewChannel('instrument');
            const channel2 = createNewChannel('instrument');
            
            expect(channel1.instrumentId).toBe('inst-0');
            expect(channel2.instrumentId).toBe('inst-1');
            expect(projectState.nextInstrumentId).toBe(2);
        });

        test('throws error for invalid channel type', () => {
            expect(() => createNewChannel('invalid')).toThrow('Invalid channel type: invalid');
        });

        test('defaults to sampler type', () => {
            const channel = createNewChannel();
            expect(channel.type).toBe('sampler');
        });
    });

    describe('createNewSequence', () => {
        test('creates sequence with default channel counts', () => {
            const sequence = createNewSequence();
            
            expect(sequence.channels).toHaveLength(10); // 8 samplers + 2 instruments
            expect(sequence.channels.filter(ch => ch.type === 'sampler')).toHaveLength(8);
            expect(sequence.channels.filter(ch => ch.type === 'instrument')).toHaveLength(2);
        });

        test('creates sequence with custom channel counts', () => {
            const sequence = createNewSequence(4, 1);
            
            expect(sequence.channels).toHaveLength(5);
            expect(sequence.channels.filter(ch => ch.type === 'sampler')).toHaveLength(4);
            expect(sequence.channels.filter(ch => ch.type === 'instrument')).toHaveLength(1);
        });

        test('assigns default sample indices to sampler channels', () => {
            const sequence = createNewSequence(3, 0);
            
            expect(sequence.channels[0].selectedSampleIndex).toBe(8); // defaultSampleOrder[0]
            expect(sequence.channels[1].selectedSampleIndex).toBe(1); // defaultSampleOrder[1]
            expect(sequence.channels[2].selectedSampleIndex).toBe(2); // defaultSampleOrder[2]
        });
    });

    describe('setupDefaultRhythm', () => {
        test('sets up kick pattern on first channel', () => {
            const sequence = createNewSequence(3, 0);
            setupDefaultRhythm(sequence);
            
            const kickChannel = sequence.channels[0];
            expect(kickChannel.steps[0]).toBe(true);  // Beat 1
            expect(kickChannel.steps[4]).toBe(true);  // Beat 2
            expect(kickChannel.steps[8]).toBe(true);  // Beat 3
            expect(kickChannel.steps[12]).toBe(true); // Beat 4
        });

        test('sets up snare pattern on second channel', () => {
            const sequence = createNewSequence(3, 0);
            setupDefaultRhythm(sequence);
            
            const snareChannel = sequence.channels[1];
            expect(snareChannel.steps[4]).toBe(true);  // Backbeat
            expect(snareChannel.steps[12]).toBe(true); // Backbeat
            expect(snareChannel.steps[0]).toBe(false); // Not on beat 1
        });

        test('sets up hat pattern on third channel', () => {
            const sequence = createNewSequence(3, 0);
            setupDefaultRhythm(sequence);
            
            const hatChannel = sequence.channels[2];
            expect(hatChannel.steps[0]).toBe(true);  // 8th notes
            expect(hatChannel.steps[2]).toBe(true);
            expect(hatChannel.steps[4]).toBe(true);
            expect(hatChannel.steps[1]).toBe(false); // Not on off-beats
        });

        test('handles invalid sequence gracefully', () => {
            expect(() => setupDefaultRhythm(null)).not.toThrow();
            expect(() => setupDefaultRhythm({})).not.toThrow();
        });
    });

    describe('initializeProject', () => {
        test('creates initial sequences', () => {
            initializeProject();
            
            expect(projectState.sequences).toHaveLength(1);
            expect(projectState.currentSequenceIndex).toBe(0);
            expect(projectState.bpm).toBe(120);
            expect(projectState.isPlaying).toBe(false);
            expect(projectState.playMode).toBeNull();
        });

        test('sets up default rhythm on first sequence', () => {
            initializeProject();
            
            const firstSequence = projectState.sequences[0];
            expect(firstSequence.channels[0].steps[0]).toBe(true); // Kick on beat 1
        });

        test('resets nextInstrumentId', () => {
            projectState.nextInstrumentId = 5;
            initializeProject();
            
            expect(projectState.nextInstrumentId).toBe(0);
        });
    });

    describe('updateProjectState', () => {
        test('updates valid state properties', () => {
            const result = updateProjectState('bpm', 140);
            
            expect(result).toBe(true);
            expect(projectState.bpm).toBe(140);
        });

        test('rejects invalid state keys', () => {
            const result = updateProjectState('invalidKey', 'value');
            
            expect(result).toBe(false);
        });

        test('validates BPM range', () => {
            expect(updateProjectState('bpm', 50)).toBe(false); // Too low
            expect(updateProjectState('bpm', 200)).toBe(false); // Too high
            expect(updateProjectState('bpm', 120)).toBe(true); // Valid
        });

        test('emits state change events', () => {
            const listener = jest.fn();
            stateEvents.on('stateChange', listener);
            
            updateProjectState('bpm', 130);
            
            expect(listener).toHaveBeenCalledWith({
                key: 'bpm',
                oldValue: 120,
                newValue: 130,
                timestamp: expect.any(Number)
            });
        });
    });

    describe('getCurrentSequence', () => {
        test('returns current sequence', () => {
            initializeProject();
            
            const sequence = getCurrentSequence();
            expect(sequence).toBe(projectState.sequences[0]);
        });

        test('returns null for invalid index', () => {
            projectState.currentSequenceIndex = 5;
            
            const sequence = getCurrentSequence();
            expect(sequence).toBeNull();
        });
    });

    describe('getSequence', () => {
        test('returns sequence by index', () => {
            initializeProject();
            
            const sequence = getSequence(0);
            expect(sequence).toBe(projectState.sequences[0]);
        });

        test('returns null for invalid index', () => {
            initializeProject();
            
            expect(getSequence(-1)).toBeNull();
            expect(getSequence(5)).toBeNull();
            expect(getSequence('invalid')).toBeNull();
        });
    });

    describe('addSequence', () => {
        test('adds new sequence', () => {
            initializeProject();
            const initialLength = projectState.sequences.length;
            
            const index = addSequence();
            
            expect(projectState.sequences).toHaveLength(initialLength + 1);
            expect(index).toBe(initialLength);
        });

        test('adds provided sequence', () => {
            initializeProject();
            const customSequence = createNewSequence(2, 1);
            
            const index = addSequence(customSequence);
            
            expect(projectState.sequences[index]).toBe(customSequence);
        });
    });

    describe('removeSequence', () => {
        test('removes sequence by index', () => {
            initializeProject();
            addSequence();
            const initialLength = projectState.sequences.length;
            
            const result = removeSequence(1);
            
            expect(result).toBe(true);
            expect(projectState.sequences).toHaveLength(initialLength - 1);
        });

        test('adjusts current sequence index when necessary', () => {
            initializeProject();
            addSequence();
            projectState.currentSequenceIndex = 1;
            
            removeSequence(1);
            
            expect(projectState.currentSequenceIndex).toBe(0);
        });

        test('prevents removing last sequence', () => {
            initializeProject();
            
            const result = removeSequence(0);
            
            expect(result).toBe(false);
            expect(projectState.sequences).toHaveLength(1);
        });

        test('rejects invalid indices', () => {
            initializeProject();
            
            expect(removeSequence(-1)).toBe(false);
            expect(removeSequence(5)).toBe(false);
            expect(removeSequence('invalid')).toBe(false);
        });
    });

    describe('syncNextInstrumentIdAfterLoad', () => {
        test('syncs ID based on existing instruments', () => {
            initializeProject();
            
            // Manually add some instruments
            const sequence = projectState.sequences[0];
            sequence.channels.push({
                type: 'instrument',
                instrumentId: 'inst-5',
                steps: Array(64).fill(false),
                patch: null
            });
            
            syncNextInstrumentIdAfterLoad();
            
            expect(projectState.nextInstrumentId).toBe(6);
        });

        test('handles non-numeric instrument IDs', () => {
            initializeProject();
            
            const sequence = projectState.sequences[0];
            sequence.channels.push({
                type: 'instrument',
                instrumentId: 'custom-id',
                steps: Array(64).fill(false),
                patch: null
            });
            
            expect(() => syncNextInstrumentIdAfterLoad()).not.toThrow();
        });
    });

    describe('validateProjectState', () => {
        test('validates correct state', () => {
            initializeProject();
            
            const errors = validateProjectState();
            expect(errors).toHaveLength(0);
        });

        test('detects invalid BPM', () => {
            initializeProject();
            projectState.bpm = 300; // Invalid
            
            const errors = validateProjectState();
            expect(errors.some(error => error.includes('invalid bpm'))).toBe(true);
        });

        test('detects invalid sequence index', () => {
            initializeProject();
            projectState.currentSequenceIndex = 5; // Invalid
            
            const errors = validateProjectState();
            expect(errors.some(error => error.includes('invalid currentSequenceIndex'))).toBe(true);
        });

        test('detects invalid channel types', () => {
            initializeProject();
            projectState.sequences[0].channels[0].type = 'invalid';
            
            const errors = validateProjectState();
            expect(errors.some(error => error.includes('invalid type'))).toBe(true);
        });
    });

    describe('getStateSnapshot', () => {
        test('returns state snapshot', () => {
            initializeProject();
            
            const snapshot = getStateSnapshot();
            
            expect(snapshot).toHaveProperty('project');
            expect(snapshot).toHaveProperty('runtime');
            expect(snapshot).toHaveProperty('timestamp');
            expect(snapshot.project.bpm).toBe(120);
        });

        test('excludes large objects from runtime snapshot', () => {
            initializeProject();
            runtimeState.allSampleBuffers = { 0: new Float32Array(1024) };
            
            const snapshot = getStateSnapshot();
            
            expect(Array.isArray(snapshot.runtime.allSampleBuffers)).toBe(true);
            expect(snapshot.runtime.allSampleBuffers).toEqual(['0']);
        });
    });

    describe('State Events', () => {
        test('can add and remove event listeners', () => {
            const listener = jest.fn();
            
            stateEvents.on('test', listener);
            stateEvents.emit('test', 'data');
            
            expect(listener).toHaveBeenCalledWith('data');
            
            stateEvents.off('test', listener);
            stateEvents.emit('test', 'data2');
            
            expect(listener).toHaveBeenCalledTimes(1);
        });

        test('handles errors in event listeners', () => {
            const errorListener = jest.fn(() => {
                throw new Error('Test error');
            });
            
            stateEvents.on('test', errorListener);
            
            expect(() => stateEvents.emit('test', 'data')).not.toThrow();
            expect(errorListener).toHaveBeenCalled();
        });
    });
});

