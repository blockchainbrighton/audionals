// main.js
import { MusicController } from './controller.js';

// Initialize Audio Context
const audioModule = {
    context: new (window.AudioContext || window.webkitAudioContext)()
};

// Initialize Random Generator (using Math.random for simplicity)
const randomGenerator = Math.random.bind(Math);

// Create Music Controller
const musicController = new MusicController(audioModule, randomGenerator);

// Define Style Configuration
const energeticStyle = {
    kickEnabled: true,
    snareEnabled: true,
    hihatEnabled: true,
    allowBending: true,
    chordTypes: ['sustained', 'dissonant', 'single'],
    padDuration: [1, 4] // Beats
};

// Start the Music Loop
musicController.start(16, energeticStyle); // 16 beats loop

// To Stop the Music After 30 Seconds
setTimeout(() => {
    musicController.stop();
}, 30000);
