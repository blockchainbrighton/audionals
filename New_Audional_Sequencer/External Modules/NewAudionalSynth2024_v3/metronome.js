let metronomePlaying = false;
let metronomeInterval;
let audioContext = null;

// Initialize the AudioContext
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// metronome.js

// Create a simple click sound
function createClickSound() {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square'; // You can use 'sine', 'square', 'sawtooth', or 'triangle'
    oscillator.frequency.setValueAtTime(3000, audioContext.currentTime); // Adjust the pitch here
    oscillator.connect(audioContext.destination);

    // Start and stop the oscillator to create a click sound
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.003); // Adjust the duration of the click here
}

function toggleMetronome() {
    initAudioContext();

    if (metronomePlaying) {
        clearInterval(metronomeInterval);
        metronomePlaying = false;
    } else {
        const bpm = parseInt(document.getElementById("bpm").value);
        if (isNaN(bpm) || bpm <= 0) {
            alert("Please enter a valid BPM value.");
            return;
        }

        createClickSound(); // Play the first click sound immediately

        const delay = 60000 / bpm; // Calculate the delay between metronome clicks
        metronomeInterval = setInterval(function () {
            createClickSound();
        }, delay);

        metronomePlaying = true;
    }
}


let quantizeOn = false;

function toggleQuantize() {
    const quantizeButton = document.querySelector("#toggleQuantize");

    quantizeOn = !quantizeOn; // Toggle the state

    if (quantizeOn) {
        quantizeButton.textContent = "Quantize On";
        // Perform actions when quantize is turned on
    } else {
        quantizeButton.textContent = "Quantize Off";
        // Perform actions when quantize is turned off
    }
}
