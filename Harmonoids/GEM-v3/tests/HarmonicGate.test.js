/**
 * @jest-environment jsdom
 */
import { MusicLogic, A4_HZ, NOTE_NAMES } from '../src/audio/MusicLogic';
import { HarmonicGate } from '../src/mechanics/Gates'; // Path might need adjustment based on test setup
import { Engine } from '../src/core/Engine'; // Mock or minimal version for context

// Minimal mocks for Engine and dependencies if not using full JSDOM setup with modules
// For a real setup, you might mock `Engine` more thoroughly or parts of it.
jest.mock('../src/core/Engine', () => {
    return {
        Engine: jest.fn().mockImplementation(() => ({
            musicLogic: new MusicLogic(mockAudioEngine), // use actual musicLogic
            gameTime: 0,
            // Mock other necessary engine parts
            physics: {
                areBodiesTouching: jest.fn().mockReturnValue(true) // Assume Harmonoids are touching for gate check
            },
            renderer: { add: jest.fn(), remove: jest.fn() },
            environmentalObjects: [],
            harmonoids: []
        }))
    };
});

const mockAudioEngine = {
    playSound: jest.fn(),
    stopSound: jest.fn(),
    updateSound: jest.fn(),
    audioContext: { // Mock AudioContext if MusicLogic or others need it deeply
        currentTime: 0,
        createGain: jest.fn(() => ({ gain: { setValueAtTime: jest.fn() }, connect: jest.fn() })),
        // ... other AC methods
    }
};


describe('HarmonicGate Chord Matching', () => {
    let musicLogic;
    let mockEngineInstance;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine); // Use the actual MusicLogic
        // Default key to C Major for consistent testing. MIDI C4 = 60
        musicLogic.setKey('C', 'major'); // globalKeyRootNote will be 60
        
        mockEngineInstance = {
             musicLogic: musicLogic,
             gameTime: 0,
             physics: { areBodiesTouching: jest.fn().mockReturnValue(true) },
             renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
             harmonoids: [] // will be populated per test
        };
        mockEngineInstance.physics.addStaticBody = jest.fn(()=>({gameObject: null, vertices: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}]}));
    });

    // Helper to create mock Harmonoid objects
    const createMockHarmonoid = (baseNote, pitchOffset = 0, arpeggioOffset = 0) => ({
        id: `h_${Math.random()}`,
        baseNote,
        pitchOffset,
        arpeggioOffset,
        isMuted: false,
        isImplicitlyMuted: false,
        body: {} // mock physics body
    });

    test('should correctly match a C Major triad (relative)', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0, 0, 10, 10, [0, 4, 7], { isRelativeChord: true });
        
        // Harmonoids forming C Major (C4, E4, G4) => MIDI 60, 64, 67
        // musicLogic.globalKeyRootNote is 60 (C4)
        // Relative notes 0, 4, 7 from root C4 = C4, E4, G4
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4 (root + 0)
            createMockHarmonoid(64), // E4 (root + 4)
            createMockHarmonoid(67)  // G4 (root + 7)
        ];
        
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should not match with incorrect notes for C Major triad (relative)', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(63), // D#4 (Incorrect)
            createMockHarmonoid(67)  // G4
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false);
    });
    
    test('should correctly match an F Major triad (absolute MIDI notes)', () => {
        // F Major: F4, A4, C5 => MIDI 65, 69, 72
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [65, 69, 72], { isRelativeChord: false });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(65), // F4
            createMockHarmonoid(69), // A4
            createMockHarmonoid(72)  // C5
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should handle more Harmonoids than required notes if they form the chord', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(64), // E4
            createMockHarmonoid(67), // G4
            createMockHarmonoid(72)  // C5 (Octave of root, still part of C major harmony)
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(true);
    });

    test('should not match if not enough Harmonoids for the chord', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), // C4
            createMockHarmonoid(64)  // E4
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false);
    });
    
    test('should respect muted Harmonoids', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4, 7], { isRelativeChord: true });
        mockEngineInstance.harmonoids = [
            createMockHarmonoid(60), 
            createMockHarmonoid(64, 0, 0), 
            { ...createMockHarmonoid(67), isMuted: true } // G4 is muted
        ];
        gate.checkHarmonoidsOnGate();
        expect(gate.isOpen).toBe(false); // G4 is muted, chord not complete
    });

    test('gate toggles state correctly', () => {
        const gate = new HarmonicGate(mockEngineInstance, 0,0,10,10, [0, 4], { isRelativeChord: true }); // Requires C, E
        mockEngineInstance.harmonoids = [createMockHarmonoid(60), createMockHarmonoid(64)];
        
        gate.checkHarmonoidsOnGate(); // Open
        expect(gate.isOpen).toBe(true);

        mockEngineInstance.harmonoids = [createMockHarmonoid(60)]; // E leaves
        gate.checkHarmonoidsOnGate(); // Close
        expect(gate.isOpen).toBe(false);
    });
});