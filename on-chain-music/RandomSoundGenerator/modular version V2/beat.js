// beat.js
export class BeatModule {
    constructor(audioModule, randomGenerator) {
        this.audio = audioModule;
        this.random = randomGenerator;
        this.BPM = 120;
        this.activeNodes = new Set();
    }

    // Convert beats to seconds based on BPM
    beatsToSeconds(beats) {
        return parseFloat((60 * beats / this.BPM).toFixed(2));
    }

    // Generate a simple percussion pattern
    generatePercussionPattern(beatsPerBar) {
        const pattern = {
            kick: [],
            snare: [],
            hihat: []
        };
        for (let beat = 0; beat < beatsPerBar; beat++) {
            pattern.kick[beat] = beat % 4 === 0;
            pattern.snare[beat] = beat % 4 === 2;
            pattern.hihat[beat] = true;
        }
        return pattern;
    }

    // Schedule percussive elements like kick, snare, and hi-hat
    schedulePercussiveElements(time, style, chainGain) {
        const beatsPerBar = 4;
        const pattern = this.generatePercussionPattern(beatsPerBar);
        for (let beat = 0; beat < beatsPerBar; beat++) {
            const beatTime = time + this.beatsToSeconds(beat);
            if (pattern.kick[beat] && style.kickEnabled) {
                this.scheduleKickDrum(beatTime, chainGain);
            }
            if (pattern.snare[beat] && style.snareEnabled) {
                this.scheduleSnareDrum(beatTime, chainGain);
            }
            if (pattern.hihat[beat] && style.hihatEnabled) {
                this.scheduleHiHat(beatTime, chainGain);
            }
        }
    }

    // Schedule a kick drum sound
    scheduleKickDrum(time, chainGain) {
        const oscillator = this.audio.context.createOscillator();
        const gainNode = this.audio.context.createGain();

        this.activeNodes.add(oscillator);
        this.activeNodes.add(gainNode);

        oscillator.frequency.setValueAtTime(100, time);
        oscillator.frequency.exponentialRampToValueAtTime(50, time + 0.1);

        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        oscillator.connect(gainNode).connect(chainGain);
        oscillator.start(time);
        oscillator.stop(time + 0.5);

        oscillator.onended = () => {
            this.activeNodes.delete(oscillator);
            gainNode.disconnect();
        };
    }

    // Schedule a snare drum sound
    scheduleSnareDrum(time, chainGain) {
        const bufferSize = this.audio.context.sampleRate * 0.2; // 0.2 seconds buffer
        const buffer = this.audio.context.createBuffer(1, bufferSize, this.audio.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audio.context.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.audio.context.createGain();
        this.activeNodes.add(noise);
        this.activeNodes.add(noiseGain);

        noiseGain.gain.setValueAtTime(1, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        const filter = this.audio.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, time);
        this.activeNodes.add(filter);

        noise.connect(filter).connect(noiseGain).connect(chainGain);
        noise.start(time);
        noise.stop(time + 0.2);

        noise.onended = () => {
            this.activeNodes.delete(noise);
            filter.disconnect();
            noiseGain.disconnect();
        };
    }

    // Schedule a hi-hat sound
    scheduleHiHat(time, chainGain) {
        const bufferSize = this.audio.context.sampleRate * 0.05; // 0.05 seconds buffer
        const buffer = this.audio.context.createBuffer(1, bufferSize, this.audio.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audio.context.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.audio.context.createGain();
        this.activeNodes.add(noise);
        this.activeNodes.add(noiseGain);

        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        const filter = this.audio.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, time);
        this.activeNodes.add(filter);

        noise.connect(filter).connect(noiseGain).connect(chainGain);
        noise.start(time);
        noise.stop(time + 0.05);

        noise.onended = () => {
            this.activeNodes.delete(noise);
            filter.disconnect();
            noiseGain.disconnect();
        };
    }

    // Schedule beats and bars within a loop
    scheduleBeatsAndBars(startTime, loopDuration, style, chainGain) {
        const beatsPerBar = 4;
        const totalBars = Math.floor(loopDuration / beatsPerBar);
        for (let bar = 0; bar < totalBars; bar++) {
            const barStartTime = startTime + this.beatsToSeconds(bar * beatsPerBar);
            this.schedulePercussiveElements(barStartTime, style, chainGain);
        }
    }

    // Clean up all active percussive nodes
    cleanupBeats() {
        try {
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

            console.log("Beat cleanup completed.");
        } catch (error) {
            console.warn("Error during beat cleanup:", error);
        }
    }

    // Optionally, methods to adjust BPM or patterns can be added here
    setBPM(newBPM) {
        this.BPM = newBPM;
    }
}
