// controller.js
import { BeatModule } from './beat.js';
import { MusicModule } from './music.js';

export class MusicController {
    constructor(audioModule, randomGenerator) {
        this.audio = audioModule;
        this.random = randomGenerator;
        this.beatModule = new BeatModule(audioModule, randomGenerator);
        this.musicModule = new MusicModule(audioModule, randomGenerator);
        this.chainGain = this.audio.context.createGain();
        this.chainGain.connect(this.audio.context.destination);
    }

    // Start the music loop
    start(loopDurationBeats = 16, style = {}) {
        const startTime = this.audio.context.currentTime;
        const loopDurationSeconds = this.beatModule.beatsToSeconds(loopDurationBeats);
        
        // Default style configurations
        const defaultStyle = {
            // BeatModule styles
            kickEnabled: true,
            snareEnabled: true,
            hihatEnabled: true,
            // MusicModule styles
            allowBending: true,
            chordTypes: ['sustained', 'dissonant', 'single'],
            padDuration: [1, 4] // Beats
        };
        const mergedStyle = { ...defaultStyle, ...style };

        // Generate scale and chord progression
        const scale = this.musicModule.generateRandomScale();
        const chordProgression = this.musicModule.generateChordProgression(scale, mergedStyle.chordTypes);

        // Schedule beats
        this.beatModule.scheduleBeatsAndBars(startTime, loopDurationBeats, mergedStyle, this.chainGain);

        // Schedule melodies and chords
        this.musicModule.scheduleMelodyAndChords(startTime, loopDurationBeats, scale, chordProgression, mergedStyle, this.chainGain);

        // Optionally, loop the schedule using setInterval or a more sophisticated scheduling mechanism
    }

    // Stop all music and beats
    stop() {
        this.beatModule.cleanupBeats();
        this.musicModule.cleanupMusic();
    }

    // Optionally, methods to adjust BPM or styles on the fly
    setBPM(newBPM) {
        this.beatModule.setBPM(newBPM);
        this.musicModule.setBPM(newBPM);
    }
}
