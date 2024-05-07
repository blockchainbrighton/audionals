// metronome.js

// Variable to store the interval ID
let metronomeInterval = null;
let isMetronomeActive = false;

let clickOscillator;
let clickGainNode;

function setupMetronomeOscillator() {
    clickOscillator = audioContext.createOscillator();
    clickGainNode = audioContext.createGain();
    clickOscillator.connect(clickGainNode);
    clickGainNode.connect(audioContext.destination);
    clickOscillator.type = 'square';
    clickOscillator.frequency.value = 1000; // Frequency for click
    clickOscillator.start(0);  // Start the oscillator immediately but keep it silent
    clickGainNode.gain.value = 0; // Start with gain at 0 to mute it
}

function playClick() {
    clickGainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Briefly unmute
    clickGainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.01); // Mute again
}

// // Function to play a click sound
// function playClick() {
//   const oscillator = audioContext.createOscillator();
//   const gainNode = audioContext.createGain();

//   oscillator.connect(gainNode);
//   gainNode.connect(audioContext.destination);

//   // Configure oscillator for a simple click sound
//   oscillator.type = 'square';
//   gainNode.gain.value = 0.5;
//   oscillator.frequency.value = 10000;

//   oscillator.start();
//   // Stop the oscillator after a short time to create a click sound
//   oscillator.stop(audioContext.currentTime + 0.01);
// }

// Function to start the metronome
function startMetronome(bpm) {
    const intervalTime = 60000 / bpm;  // milliseconds per beat
    if (metronomeInterval === null && isMetronomeActive) {
      playClick();  // Play initial click right when started
      metronomeInterval = setInterval(playClick, intervalTime);
    }
  }

// Function to stop the metronome
function stopMetronome() {
  if (metronomeInterval !== null) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

// Toggle function for the metronome
function toggleMetronomeActivation() {
    isMetronomeActive = !isMetronomeActive;
    this.classList.toggle('active');

    console.log('Metronome: ' + (isMetronomeActive ? 'ON' : 'OFF'));

    // Ensure that the metronome's audio components are set up when activated.
    if (isMetronomeActive) {
        if (!clickOscillator || !clickGainNode) {  // Check if the oscillator and gain node need to be setup
            setupMetronomeOscillator();
        }
        startMetronome(currentBPM);  // Optionally start metronome immediately
    } else {
        stopMetronome();  // Stop the metronome if it is being deactivated
    }
}


// Event listener for the metronome button
document.getElementById('metronomeButton').addEventListener('click', function() {
    toggleMetronomeActivation.call(this);  // Ensure 'this' refers to the button
});