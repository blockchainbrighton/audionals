// music.js
export class MusicModule {
    constructor(audioModule, randomGenerator) {
        this.audio = audioModule;
        this.random = randomGenerator;
        this.BPM = 120;
        this.activeOscillators = new Set();
        this.activeNodes = new Set();
    }

    // Convert beats to seconds based on BPM
    beatsToSeconds(beats) {
        return parseFloat((60 * beats / this.BPM).toFixed(2));
    }

    // Generate a random scale based on preferred scales
    generateRandomScale(preferredScales) {
        const scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10]
        };
        const baseFrequencies = [130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63];
        const scaleTypes = preferredScales || Object.keys(scales);
        const selectedScaleType = scaleTypes[Math.floor(this.random() * scaleTypes.length)] || "major";
        const rootFrequency = baseFrequencies[Math.floor(this.random() * baseFrequencies.length)] || 261.63;
        const intervals = scales[selectedScaleType];
        const frequencies = intervals.map(interval => {
            let freq = rootFrequency * Math.pow(2, interval / 12);
            return (freq >= 20 && freq <= 16000) ? freq : null;
        }).filter(Boolean);

        const currentScaleData = {
            type: selectedScaleType,
            root: rootFrequency,
            intervals: intervals,
            frequencies: frequencies
        };
        console.log(`Generated Scale (${selectedScaleType}):`, frequencies);
        return currentScaleData;
    }

    // Generate a chord progression based on the scale and preferred chord types
    generateChordProgression(scale, preferredChordTypes) {
        // For this implementation, chords are just collections of notes based on the style
        // For 'Creepy', we might introduce dissonant intervals
        // For 'Haunting', sustained chords
        // For 'Melodic' and 'Rave', focus on single notes

        // For consistency, return the same progression throughout the loop
        const progression = [scale.frequencies];
        return progression;
    }

    // Schedule a single note
    scheduleNote(freq, time, duration, chainGain) {
        try {
            if (!isFinite(freq) || freq <= 0) return;
            time = Math.max(time, this.audio.context.currentTime);
            duration = Math.min(duration, this.beatsToSeconds(8)); // Limit duration to 8 beats

            const oscillator = this.audio.context.createOscillator();
            this.activeOscillators.add(oscillator);
            this.activeNodes.add(oscillator);
            oscillator.onended = () => {
                this.activeOscillators.delete(oscillator);
                oscillator.disconnect();
            };

            const gainNode = this.audio.context.createGain();
            this.activeNodes.add(gainNode);

            oscillator.frequency.setValueAtTime(freq, time);
            oscillator.type = "sine";

            oscillator.connect(gainNode);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.5, time + this.beatsToSeconds(0.1));
            gainNode.gain.linearRampToValueAtTime(0, time + duration);

            gainNode.connect(chainGain);

            oscillator.start(time);
            oscillator.stop(time + duration);
        } catch (error) {
            console.error("Error in scheduleNote:", error);
        }
    }

    // Schedule a bending note
    scheduleBendingNote(freq, time, duration, chainGain) {
        try {
            if (!isFinite(freq) || freq <= 0) return;
            time = Math.max(time, this.audio.context.currentTime);
            duration = Math.min(duration, this.beatsToSeconds(16)); // Limit duration to 16 beats

            const oscillator = this.audio.context.createOscillator();
            this.activeOscillators.add(oscillator);
            this.activeNodes.add(oscillator);
            oscillator.onended = () => {
                this.activeOscillators.delete(oscillator);
                oscillator.disconnect();
            };

            const gainNode = this.audio.context.createGain();
            this.activeNodes.add(gainNode);

            oscillator.frequency.setValueAtTime(freq, time);
            const bendAmount = freq * (0.05 + 0.1 * this.random());
            const bendDirection = this.random() > 0.5 ? 1 : -1;
            oscillator.frequency.linearRampToValueAtTime(freq + bendDirection * bendAmount, time + duration);

            oscillator.type = "sine";

            oscillator.connect(gainNode);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.5, time + this.beatsToSeconds(0.5));
            gainNode.gain.linearRampToValueAtTime(0, time + duration);

            gainNode.connect(chainGain);

            oscillator.start(time);
            oscillator.stop(time + duration);
        } catch (error) {
            console.error("Error in scheduleBendingNote:", error);
        }
    }

    // Schedule a chord by scheduling multiple notes
    scheduleChord(chord, time, duration, chainGain) {
        chord.forEach(freq => {
            this.scheduleNote(freq, time, duration, chainGain);
        });
    }

    // Schedule a sustained chord
    scheduleSustainedChord(time, scale, style, chainGain) {
        const chord = scale.frequencies.slice(0, 3);
        const duration = this.randomRange(style.padDuration);
        this.scheduleChord(chord, time, this.beatsToSeconds(duration), chainGain);
    }

    // Schedule a dissonant chord
    scheduleDissonantChord(time, scale, chainGain) {
        const dissonantIntervals = [1, 2, 6]; // Minor second, major second, tritone
        const rootFreq = scale.frequencies[Math.floor(this.random() * scale.frequencies.length)];
        const chord = dissonantIntervals.map(interval => rootFreq * Math.pow(2, interval / 12));
        this.scheduleChord(chord, time, this.beatsToSeconds(4), chainGain);
    }

    // Schedule a single note melody
    scheduleSingleNoteMelody(time, scale, style, chainGain) {
        const noteFreq = scale.frequencies[Math.floor(this.random() * scale.frequencies.length)];
        const duration = this.randomRange(style.padDuration);
        this.scheduleNote(noteFreq, time, this.beatsToSeconds(duration), chainGain);
    }

    // Schedule a bending note based on the style
    scheduleBendingNoteInStyle(time, scale, style, chainGain) {
        const noteFreq = scale.frequencies[Math.floor(this.random() * scale.frequencies.length)];
        const duration = this.randomRange(style.padDuration);
        this.scheduleBendingNote(noteFreq, time, this.beatsToSeconds(duration), chainGain);
    }

    // Generate a random number within a range
    randomRange(range) {
        return this.random() * (range[1] - range[0]) + range[0];
    }

    // Schedule elements (notes and percussive) at a specific time
    scheduleElements(time, scale, chordProgression, style, chainGain) {
        // Limit the number of simultaneous notes to prevent overload
        const maxSimultaneousNotes = 3;

        if (this.activeOscillators.size < maxSimultaneousNotes) {
            if (style.allowBending) {
                this.scheduleBendingNoteInStyle(time, scale, style, chainGain);
            } else if (style.chordTypes.includes('dissonant')) {
                this.scheduleDissonantChord(time, scale, chainGain);
            } else if (style.chordTypes.includes('sustained')) {
                this.scheduleSustainedChord(time, scale, style, chainGain);
            } else if (style.chordTypes.includes('single')) {
                this.scheduleSingleNoteMelody(time, scale, style, chainGain);
            }
        }
    }

    // Schedule melodic elements and chords within a loop
    scheduleMelodyAndChords(startTime, loopDuration, scale, chordProgression, style, chainGain) {
        const beatsPerBar = 4;
        const totalBars = Math.floor(loopDuration / beatsPerBar);
        for (let bar = 0; bar < totalBars; bar++) {
            for (let beat = 0; beat < beatsPerBar; beat++) {
                const currentTime = startTime + this.beatsToSeconds(bar * beatsPerBar + beat);
                this.scheduleElements(currentTime, scale, chordProgression, style, chainGain);
            }
        }
    }

    // Clean up all active musical nodes
    cleanupMusic() {
        try {
            // Stop and disconnect all active oscillators
            this.activeOscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    console.warn("Oscillator already stopped:", e);
                }
                osc.disconnect();
            });
            this.activeOscillators.clear();

            // Disconnect and stop all active nodes
            this.activeNodes.forEach(node => {
                try {
                    if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                        node.stop();
                    }
                    node.disconnect();
                } catch (e) {
                    console.warn("Error disconnecting node:", e);
                }
            });
            this.activeNodes.clear();

            console.log("Music cleanup completed.");
        } catch (error) {
            console.warn("Error during music cleanup:", error);
        }
    }

    // Optionally, methods to adjust BPM or other settings can be added here
    setBPM(newBPM) {
        this.BPM = newBPM;
    }
}
