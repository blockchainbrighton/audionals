// gainManagement.js
import { audioContext } from './main.js'; // Adjust the path as necessary


class GainManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.inputGain = audioContext.createGain(); // Gain node for input level control
        this.outputGain = audioContext.createGain(); // Gain node for output level control
        this.compressor = audioContext.createDynamicsCompressor(); // Compressor to limit the dynamic range

        // Configure the compressor to prevent clipping
        this.compressor.threshold.setValueAtTime(-1, this.audioContext.currentTime); // dB
        this.compressor.knee.setValueAtTime(0, this.audioContext.currentTime); // dB
        this.compressor.ratio.setValueAtTime(20, this.audioContext.currentTime); // Input/output ratio
        this.compressor.attack.setValueAtTime(0, this.audioContext.currentTime); // seconds
        this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime); // seconds

        // Setup the audio node chain
        this.inputGain.connect(this.compressor);
        this.compressor.connect(this.outputGain);
    }

    connect(target) {
        // Connect the output of the GainManager to the target node
        this.outputGain.connect(target);
    }

// Function to adjust input gain
setInputGain(value) {
    this.inputGain.gain.setValueAtTime(value, this.audioContext.currentTime);
}

// Function to adjust output gain
setOutputGain(value) {
    this.outputGain.gain.setValueAtTime(value, this.audioContext.currentTime);
}

// Function to disconnect from the target node
disconnect() {
    this.outputGain.disconnect();
}

// Additional methods to dynamically control compressor settings
setCompressorThreshold(value) {
    this.compressor.threshold.setValueAtTime(value, this.audioContext.currentTime);
}

setCompressorKnee(value) {
    this.compressor.knee.setValueAtTime(value, this.audioContext.currentTime);
}

setCompressorRatio(value) {
    this.compressor.ratio.setValueAtTime(value, this.audioContext.currentTime);
}

setCompressorAttack(value) {
    this.compressor.attack.setValueAtTime(value, this.audioContext.currentTime);
}

setCompressorRelease(value) {
    this.compressor.release.setValueAtTime(value, this.audioContext.currentTime);
}
}

// Example of using the GainManager
document.addEventListener('DOMContentLoaded', () => {
const gainManager = new GainManager(audioContext);

// Assuming you have an audio source
const oscillator = audioContext.createOscillator();
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note

// Connect the oscillator to the GainManager, then to the audio context destination
oscillator.connect(gainManager.inputGain);
gainManager.connect(audioContext.destination);

// Start the oscillator
oscillator.start();

// Adjust the gain and compressor settings as needed
gainManager.setInputGain(0.8);
gainManager.setOutputGain(0.9);
gainManager.setCompressorThreshold(-24);
gainManager.setCompressorKnee(30);
gainManager.setCompressorRatio(12);
gainManager.setCompressorAttack(0.01);
gainManager.setCompressorRelease(0.25);

// To stop and disconnect everything
// oscillator.stop(audioContext.currentTime + 2); // Stop after 2 seconds
// gainManager.disconnect();
});

export { GainManager };
