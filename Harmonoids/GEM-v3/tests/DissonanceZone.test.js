/**
 * @jest-environment jsdom
 */
import { MusicLogic } from '../src/audio/MusicLogic';
import { DissonanceZone } from '../src/mechanics/DissonanceZone';

// Minimal mocks
jest.mock('../src/core/Engine', () => {
     return {
        Engine: jest.fn().mockImplementation(() => ({
            musicLogic: new MusicLogic(mockAudioEngine),
            physics: { applyForce: jest.fn() },
            renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
            // ...
        }))
    };
});
const mockAudioEngine = { /* as defined in HarmonicGate.test.js */ };

describe('DissonanceZone Score Algorithm', () => {
    let musicLogic;
    let mockEngineInstance;

    beforeEach(() => {
        musicLogic = new MusicLogic(mockAudioEngine);
        musicLogic.setKey('C', 'major');
         mockEngineInstance = {
             musicLogic: musicLogic,
             physics: { applyForce: jest.fn() },
             renderer: { add: jest.fn(), remove: jest.fn(), getColorForNoteIndex: jest.fn().mockReturnValue(0) },
             // ... other engine parts DissonanceZone might need directly
        };
        mockEngineInstance.physics.addStaticBody = jest.fn(()=>({gameObject: null, vertices: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}]}));
    });

    const createMockHarmonoidWithFreq = (frequency) => ({
        id: `h_freq_${frequency}`,
        currentFrequency: frequency,
        isMuted: false,
        isImplicitlyMuted: false,
        body: { mass:1 } // for force application test
    });

    test('should calculate low dissonance (high harmony score) for consonant intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(67)), // G4 (Perfect Fifth)
        ];
        zone.checkHarmonoids(harmonoids);
        // Harmony for P5 is 1.0 (score 10/10). Dissonance = 1 - 1.0 = 0.0
        expect(zone.currentDissonanceScore).toBeCloseTo(0.0); 
    });

    test('should calculate high dissonance (low harmony score) for dissonant intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(61)), // C#4 (Minor Second)
        ];
        zone.checkHarmonoids(harmonoids);
        // Harmony for m2 is 0.1 (score 1/10). Dissonance = 1 - 0.1 = 0.9
        expect(zone.currentDissonanceScore).toBeCloseTo(0.9);
    });

    test('should have zero dissonance for a single Harmonoid or no Harmonoids', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        zone.checkHarmonoids([createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60))]);
        expect(zone.currentDissonanceScore).toBe(0);
        
        zone.checkHarmonoids([]);
        expect(zone.currentDissonanceScore).toBe(0);
    });
    
    test('should calculate moderate dissonance for mixed intervals', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
        // C4, E4 (Major Third, score 8), G#4 (Augmented Fifth from C, Tritone from E)
        // C4 (60), E4 (64), G#4 (68)
        // Intervals: (60,64) -> M3 (score 8). (60,68) -> A5/m6 (score 7 for m6). (64,68) -> M3 (score 8)
        // Avg score: (8+7+8)/3 = 23/3 = 7.66. Harmony: 0.766. Dissonance: 0.233
        const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(64)), // E4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(68)), // G#4 / Ab4
        ];
        zone.checkHarmonoids(harmonoids);
        expect(zone.currentDissonanceScore).toBeCloseTo(1 - ((8+7+8)/3 / 10), 2); // Dissonance approx 0.23
    });

    test('should apply erratic forces to Harmonoids in high dissonance', () => {
        const zone = new DissonanceZone(mockEngineInstance, 0, 0, 100, 100);
         const harmonoids = [
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(60)), // C4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(61)), // C#4
            createMockHarmonoidWithFreq(musicLogic.midiToFrequency(62)), // D4 (Cluster)
        ];
        // This should create high dissonance.
        // C-C# (m2, score 1), C-D (M2, score 5), C#-D (m2, score 1)
        // Avg (1+5+1)/3 = 7/3 = 2.33. Harmony 0.233. Dissonance = 0.767
        
        // Mock Math.random to make force application predictable for test
        const mockMath = Object.create(global.Math);
        mockMath.random = () => 0.05; // Always triggers force if threshold is 0.1
        global.Math = mockMath;

        zone.checkHarmonoids(harmonoids);
        expect(zone.currentDissonanceScore).toBeGreaterThan(0.7); // Ensure high dissonance
        
        // Check if applyForce was called (assuming Math.random allows it)
        expect(mockEngineInstance.physics.applyForce).toHaveBeenCalled();
        // Can check how many times if Math.random makes it certain. Here, 3 harmonoids, potentially 3 calls.
        expect(mockEngineInstance.physics.applyForce.mock.calls.length).toBeGreaterThanOrEqual(1);

        // Restore Math.random
        global.Math = Object.getPrototypeOf(mockMath);
    });
});