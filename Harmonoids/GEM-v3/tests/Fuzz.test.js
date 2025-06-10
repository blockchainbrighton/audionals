/**
 * @jest-environment jsdom
 */
import { MusicLogic } from '../src/audio/MusicLogic';

// Minimal mock for AudioEngine if MusicLogic instantiation requires it
const mockAudioEngine = { /* ... */ };

describe('MusicLogic Harmony Fuzz Testing', () => {
    let musicLogic;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine);
    });

    // Property-based fuzz test for calculateOverallHarmony
    test('calculateOverallHarmony should return a score between 0 and 1 for random frequency clusters', () => {
        const NUM_TEST_CASES = 100;
        const MAX_HARMONOIDS = 10;
        const MAX_MIDI_NOTE = 80; // Realistic upper MIDI note
        const MIN_MIDI_NOTE = 40; // Realistic lower MIDI note

        for (let i = 0; i < NUM_TEST_CASES; i++) {
            const numHarmonoids = Math.floor(Math.random() * MAX_HARMONOIDS) + 1; // 1 to MAX_HARMONOIDS
            const mockHarmonoids = [];

            for (let j = 0; j < numHarmonoids; j++) {
                const randomMidiNote = Math.floor(Math.random() * (MAX_MIDI_NOTE - MIN_MIDI_NOTE + 1)) + MIN_MIDI_NOTE;
                mockHarmonoids.push({
                    id: `h_fuzz_${j}`,
                    currentFrequency: musicLogic.midiToFrequency(randomMidiNote),
                    isPlayingSound: true,
                    isMuted: false,
                    isImplicitlyMuted: false
                });
            }
            
            musicLogic.updateActiveHarmonoids(mockHarmonoids);
            const harmonyScore = musicLogic.calculateOverallHarmony();

            expect(harmonyScore).toBeGreaterThanOrEqual(0);
            expect(harmonyScore).toBeLessThanOrEqual(1);
            // Could add more specific assertions if there are known edge cases or invariants
            // e.g. if all frequencies are identical, score should be 1 (or via interval table, unison = 10 -> 1.0)
        }
    });

    test('calculateOverallHarmony with unison frequencies should be max harmony', () => {
        const freq = musicLogic.midiToFrequency(60); // C4
        const harmonoids = [
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false },
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false  },
            { currentFrequency: freq, isPlayingSound:true, isMuted: false, isImplicitlyMuted: false  }
        ];
        musicLogic.updateActiveHarmonoids(harmonoids);
        const harmonyScore = musicLogic.calculateOverallHarmony();
        // Unison pairs should score 10. (10/10 = 1.0)
        expect(harmonyScore).toBeCloseTo(1.0); 
    });

    test('checkChord handles various inputs robustly', () => {
        const NUM_TEST_CASES = 50;
        musicLogic.setKey('C','major'); // root = 60

        for (let i = 0; i < NUM_TEST_CASES; i++) {
            const numCurrentNotes = Math.floor(Math.random() * 5) +1; // 1-5 current notes
            const numTargetNotes = Math.floor(Math.random() * 3) +1; // 1-3 target notes

            const currentNotes = Array.from({length: numCurrentNotes}, () => Math.floor(Math.random()*24) + 50); // Random MIDI notes
            const targetChordNotesRelative = Array.from({length: numTargetNotes}, () => Math.floor(Math.random()*12)); // Random relative intervals
            const targetChordNotesAbsolute = Array.from({length: numTargetNotes}, () => Math.floor(Math.random()*24)+50);

            // Test relative chord check
            let resultRelative = false;
            expect(() => {
                 resultRelative = musicLogic.checkChord(currentNotes, targetChordNotesRelative, true, musicLogic.globalKeyRootNote);
            }).not.toThrow();
            expect(typeof resultRelative).toBe('boolean');

            // Test absolute chord check
            let resultAbsolute = false;
            expect(() => {
                 resultAbsolute = musicLogic.checkChord(currentNotes, targetChordNotesAbsolute, false);
            }).not.toThrow();
            expect(typeof resultAbsolute).toBe('boolean');
        }

         // Test empty inputs
        expect(musicLogic.checkChord([], [0,4,7])).toBe(false);
        expect(musicLogic.checkChord([60,64,67], [])).toBe(true); // An empty requirement is always met if currentNotes exists.
                                                                // Depending on definition, could be false. Current definition of checking FOR required should be true.
        expect(musicLogic.checkChord([], [])).toBe(true); 
    });

});