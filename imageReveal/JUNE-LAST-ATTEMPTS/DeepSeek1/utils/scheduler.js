export class BeatScheduler {
    constructor(bpm = 120, bars = 16) {
        this.bpm = bpm;
        this.bars = bars;
        this.speed = 1.0;
        this.beatDuration = 60 / this.bpm;
    }

    getBeatInfo(currentTime) {
        const beatTime = currentTime / this.beatDuration * this.speed;
        const currentBeat = Math.floor(beatTime) + 1;
        const progressInBeat = beatTime % 1;
        const currentBar = Math.floor(currentBeat / 4) + 1;
        const currentBeatInBar = (currentBeat % 4) || 4;
        const progressInBar = (beatTime % 4) / 4;
        const isBeat = progressInBeat < 0.1; // Small window to detect beats

        return {
            currentBeat,
            progressInBeat,
            currentBar,
            currentBeatInBar,
            progressInBar,
            isBeat,
            intensity: this.calculateIntensity(progressInBar)
        };
    }

    calculateIntensity(progress) {
        // More intensity at the start of the bar
        return 0.5 + 0.5 * Math.sin(progress * Math.PI * 2);
    }
}