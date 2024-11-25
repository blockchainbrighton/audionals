// synth.js
import { AudioModule } from './audio.js';
import { MusicModule } from './music.js';

export class Synth {
    constructor() {
        this.audio = new AudioModule();
        this.music = null; // To be initialized after audio context is ready
        this.BPM = 120;
        this.isLoopActive = false;
        this.random = null;
        this.seed = null;
        this.currentScaleData = null;
        this.currentFilter = null;
        this.currentEffectsChain = null;
        this.chainGain = null;
        this.activeStyleKey = null;
        this.styles = {
            'creepy-soundscape': {
                BPMRange: [40, 60],
                scales: ['minor'],
                effects: ['reverb', 'phaser'],
                chordTypes: ['dissonant'],
                percussiveElements: false,
                description: 'Creepy Soundscape',
                padDuration: [4, 8],
                frequencyBend: false,
                allowBending: false
            },
            'haunting-pads': {
                BPMRange: [50, 70],
                scales: ['minor', 'pentatonic'],
                effects: ['reverb', 'chorus'],
                chordTypes: ['sustained'],
                percussiveElements: false,
                description: 'Haunting Pads',
                padDuration: [8, 16],
                frequencyBend: true,
                allowBending: true
            },
            'uplifting-melodies': {
                BPMRange: [90, 120],
                scales: ['major', 'minor'],
                effects: ['chorus', 'compressor'],
                chordTypes: ['single'],
                percussiveElements: false,
                description: 'Uplifting Melodies',
                padDuration: [0.5, 1],
                frequencyBend: false,
                allowBending: false
            },
            'chill-ambient': {
                BPMRange: [60, 80],
                scales: ['major', 'pentatonic'],
                effects: ['reverb', 'chorus'],
                chordTypes: ['sustained'],
                percussiveElements: false,
                description: 'Chill Ambient',
                padDuration: [4, 8],
                frequencyBend: false,
                allowBending: false
            },
            'energetic-beats': {
                BPMRange: [130, 150],
                scales: ['minor', 'pentatonic'],
                effects: ['compressor', 'distortion'],
                chordTypes: ['single'],
                percussiveElements: true,
                description: 'Energetic Beats',
                padDuration: [0.25, 0.5],
                frequencyBend: false,
                allowBending: false
            }
            // Add more styles as needed
        };
    }

    // Initialize the Synth
    init() {
        this.audio.initAudioContext();
        this.initRandom();
        this.audio.initMasterGain();
        this.music = new MusicModule(this.audio, this.random);
        this.addEventListeners();
        this.updateStatus("Click a button to generate sound.");
    }

    // Initialize the random number generator
    initRandom() {
        this.seed = Math.floor(4294967295 * Math.random());
        this.random = this.mulberry32(this.seed);
        console.log(`Current Seed: ${this.seed}`);
    }

    // Mulberry32 pseudo-random number generator
    mulberry32(a) {
        return () => {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Add event listeners for UI buttons and other interactions
    addEventListeners() {
        // Add click event listeners to control panel buttons
        Object.keys(this.styles).forEach(styleKey => {
            const button = document.getElementById(`generate-${styleKey}`);
            if (button) {
                button.addEventListener('click', () => {
                    if (this.activeStyleKey === styleKey) {
                        // Toggle off if the same style is active
                        this.cleanupLoop();
                    } else {
                        // Switch to new style
                        this.cleanupLoop();
                        try {
                            this.generateRandomLoop(styleKey, this.styles[styleKey]);
                        } catch (error) {
                            console.error("Error generating loop:", error);
                        }
                    }
                });
            } else {
                console.error(`Button for style ${styleKey} not found in the DOM.`);
            }
        });

        // Add beforeunload event to clean up when the page is closed or refreshed
        window.addEventListener("beforeunload", () => {
            console.log("Page is unloading. Cleaning up any active loops.");
            this.cleanupLoop();
        });

        // Performance reporting every 10 seconds
        setInterval(() => {
            console.log("--- 10-Second Performance Report ---");
            console.log(`Is Loop Active: ${this.isLoopActive}`);
            console.log(`Audio Context State: ${this.audio.context.state}`);
            console.log(`Current BPM: ${this.isLoopActive ? this.BPM.toFixed(2) : "N/A"}`);
            console.log("-------------------------------------");
        }, 10000);
    }

    // Update the status message in the UI
    updateStatus(message) {
        console.log(`Status Update: ${message}`);
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.textContent = message;
        } else {
            console.warn("Status element not found in the DOM.");
        }
    }

    // Update the active button's visual state
    updateActiveButton() {
        // Remove 'active' class from all buttons
        Object.keys(this.styles).forEach(key => {
            const button = document.getElementById(`generate-${key}`);
            if (button) {
                button.classList.remove('active');
            }
        });
        // Add 'active' class to the active button
        if (this.activeStyleKey) {
            const activeButton = document.getElementById(`generate-${this.activeStyleKey}`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
        }
    }

    // Generate a random loop based on the selected style
    generateRandomLoop(styleKey, style) {
        try {
            this.isLoopActive = true;
            this.activeStyleKey = styleKey;
            this.updateActiveButton();
            this.updateStatus(`Generating ${style.description}...`);

            // Set BPM and maintain it throughout the loop
            const [minBPM, maxBPM] = style.BPMRange;
            this.BPM = this.audio.clamp(parseFloat((this.random() * (maxBPM - minBPM) + minBPM).toFixed(2)), minBPM, maxBPM);
            console.log(`Selected BPM: ${this.BPM}`);
            this.music.BPM = this.BPM; // Update BPM in MusicModule

            // Create chainGain
            this.chainGain = this.audio.context.createGain();
            this.chainGain.gain.value = 0.8; // Prevent initial loudness
            this.audio.activeNodes.add(this.chainGain);

            // Create filter
            this.currentFilter = this.audio.context.createBiquadFilter();
            this.currentFilter.type = "lowpass";
            this.audio.setAudioParam(this.currentFilter.frequency, 15000, this.audio.context.currentTime);
            this.audio.activeNodes.add(this.currentFilter);

            // Create effects chain
            this.currentEffectsChain = this.audio.createGlobalEffectsChain(style.effects);

            // Connect the chain
            this.chainGain.connect(this.currentFilter);
            this.currentFilter.connect(this.currentEffectsChain.input);
            this.currentEffectsChain.output.connect(this.audio.masterGain);

            // Set initial gain
            this.audio.setAudioParam(this.audio.masterGain.gain, 0.8, this.audio.context.currentTime);

            // Generate scale and chord progression
            this.currentScaleData = this.music.generateRandomScale(style.scales);
            if (!this.currentScaleData.frequencies.length) {
                console.warn("Generated scale is empty. Aborting loop generation.");
                this.cleanupLoop();
                return;
            }
            const chordProgression = this.music.generateChordProgression(this.currentScaleData, style.chordTypes);

            // Start the loop
            this.startLoop(this.currentScaleData, chordProgression, style);

            this.updateStatus(`Loop active: BPM: ${this.BPM} | Style: ${style.description} | Seed: ${this.seed}`);
            console.log("Loop generation started successfully.");
        } catch (error) {
            console.error("Error in generateRandomLoop:", error);
            this.cleanupLoop();
        }
    }

    // Start the audio loop
    startLoop(scale, chordProgression, style) {
        const scheduleNextLoop = () => {
            if (!this.isLoopActive) return;

            const loopDuration = 8 * 4; // 8 bars per loop iteration
            this.music.scheduleBeatsAndBars(this.audio.context.currentTime, loopDuration, scale, chordProgression, style, this.chainGain);

            // Schedule the next loop iteration
            const nextLoopTime = this.audio.context.currentTime + this.music.beatsToSeconds(loopDuration);
            setTimeout(scheduleNextLoop, (nextLoopTime - this.audio.context.currentTime) * 1000);
        };

        scheduleNextLoop();
    }

    /**
     * Clean up the audio loop with a smooth fade-out to prevent audible clicks.
     */
    cleanupLoop() {
        try {
            if (this.isLoopActive) {
                console.log("Initiating fade-out before stopping the loop.");

                const fadeDuration = 0.5; // Duration of fade-out in seconds

                // Initiate fade-out using AudioModule's method
                this.audio.fadeOutMasterGain(fadeDuration, () => {
                    // Stop and disconnect all active oscillators and nodes
                    this.music.cleanupMusic();
                    this.audio.cleanupAudio();
                    this.audio.cleanupEffectsChain(this.currentEffectsChain);

                    // Restore master gain to default value
                    this.audio.setAudioParam(this.audio.masterGain.gain, 0.8, this.audio.context.currentTime);

                    // Update internal state
                    this.isLoopActive = false;
                    this.activeStyleKey = null;
                    this.updateActiveButton();
                    this.updateStatus("Loop stopped.");
                    console.log("Loop cleanup completed with smooth fade-out.");
                });
            }
        } catch (error) {
            console.warn("Error during loop cleanup:", error);
        }
    }
}

// Initialize the synthesizer
const synth = new Synth();
synth.init();
