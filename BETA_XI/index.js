// index.js


let isPlaying = false;
let currentStep = 0;
let totalStepCount = 0
let beatCount = 1; // individual steps
let barCount = 1; // bars

let sequenceCount = 1;
let currentSequence = 0;

const sequenceLength = 64;
const maxSequenceCount = 64; // sequences
const allSequencesLength = 4096;
const collectedURLs = Array(16).fill(''); 
let soloedChannels = Array(16).fill(false); // Assuming you have 16 channels
let activeChannels = 16;// new Set();
let gainNodes = Array(16).fill(null);
let channelMutes = []; // Declare the channelMutes array as a global variable


let timeoutId;
let isPaused = false; // a flag to indicate if the sequencer is paused
let pauseTime = 0;  // tracks the total paused time
let stopClickCount = 0;
let playButton = document.getElementById('play');
let stopButton = document.getElementById('stop');
let saveButton = document.getElementById('save-button');
let audioContext;
let currentStepTime;
let startTime;
let nextStepTime;
let stepDuration;
let isMuted = false;
let muteState = false
// let volumeStates = Array(16).fill(1); // Start with 25% volume for all channels
let channels = document.querySelectorAll('.channel[id^="channel-"]');
let clearClickedOnce = Array(channels.length).fill(false);
let clearConfirmTimeout = Array(channels.length).fill(null);

let channelIsSynth = Array(16).fill(false); // Adjust the number based on your actual channel count


if (!audioContext) {
    try {
        audioContext = window.unifiedSequencerSettings.audioContext; // Use global audio context
    } catch (e) {
        console.warn('Web Audio API is not supported in this browser');
    }
}


let slaveWindow;

// Function to open slave sequencer window
function openSlaveSequencer() {
    slaveWindow = window.open('SlaveSequencer/slaveSequencer.html', 'Slave Sequencer');
    if (slaveWindow) {
        syncSettingsWithSlave();
        syncContinuousPlayWithSlave();
    }
}

// Function to send play message
function sendPlayMessage(startTime) {
    if (slaveWindow) {
        const bpm = window.unifiedSequencerSettings.getBPM();
        slaveWindow.postMessage({ type: 'PLAY', startTime, bpm }, '*');
        console.log(`[master] Sent PLAY message at ${new Date().toISOString()} with startTime: ${startTime} and BPM: ${bpm}`);
    }
}

// Function to send stop message
function sendStopMessage() {
    if (slaveWindow) {
        slaveWindow.postMessage({ type: 'STOP' }, '*');
        console.log(`[master] Sent STOP message at ${new Date().toISOString()}`);
    }
}

// Function to sync settings with slave
function syncSettingsWithSlave() {
    if (slaveWindow) {
        const settings = window.unifiedSequencerSettings.exportSettings();
        const bpm = window.unifiedSequencerSettings.getBPM();
        slaveWindow.postMessage({ type: 'SYNC_SETTINGS', settings, bpm }, '*');
        console.log(`[master] Sent SYNC_SETTINGS message at ${new Date().toISOString()} with BPM: ${bpm}`);
    }
}

// Function to sync continuous play with slave
function syncContinuousPlayWithSlave() {
    if (slaveWindow) {
        const continuousPlayCheckbox = document.getElementById('continuous-play');
        let isContinuousPlay = continuousPlayCheckbox.checked;
        slaveWindow.postMessage({ type: 'SYNC_CONTINUOUS_PLAY', isContinuousPlay }, '*');
        console.log(`[master] Sent SYNC_CONTINUOUS_PLAY message at ${new Date().toISOString()} with isContinuousPlay: ${isContinuousPlay}`);
    }
}

// Function to sync current sequence with slave
function syncCurrentSequenceWithSlave(sequence) {
    if (slaveWindow) {
        slaveWindow.postMessage({ type: 'SYNC_CURRENT_SEQUENCE', sequence }, '*');
        console.log(`[master] Sent SYNC_CURRENT_SEQUENCE message at ${new Date().toISOString()} with sequence: ${sequence}`);
    }
}
    

if (playButton && stopButton) {
    const channel0 = document.querySelector('#channel-0 .step-button:nth-child(4n)');
    if (channel0) channel0.classList.add('selected');

    const channel1Beat0 = document.querySelector('#channel-1 .step-button:nth-child(1)');
    if (channel1Beat0) channel1Beat0.classList.add('selected');

    const channel1Beat5 = document.querySelector('#channel-1 .step-button:nth-child(6)');
    if (channel1Beat5) channel1Beat5.classList.add('selected');

    let isPaused = false;  // Add this line to declare the isPaused flag

    function checkContinuousPlay() {
        console.log('[SequenceChangeDebug] Checking for continuous play.');
        const continuousPlayCheckbox = document.getElementById('continuous-play');
        let isContinuousPlay = continuousPlayCheckbox.checked;

        if (isContinuousPlay && totalStepCount >= allSequencesLength) {
            // Reset counters for the next sequence
            beatCount = 0;
            barCount = 0;
            currentStep = 0;
            totalStepCount = 0;

            // Simulate a click on the "Next Sequence" button
            document.getElementById('next-sequence').click();
        }
    }

        // Inside your playButton event listener, after the play logic
        playButton.addEventListener('click', () => {            
            const continuousPlayCheckbox = document.getElementById('continuous-play');
            let isContinuousPlay = continuousPlayCheckbox.checked;

            if (!isPlaying) {
                // Capture the start time before starting playback
                startTime = audioContext.currentTime;
                sendPlayMessage(startTime);
                startScheduler();
                emitPlay(); 
                playButton.classList.add('selected');
                stopButton.classList.remove('selected');
                isPlaying = true;
                isPaused = false;  // Ensure that the isPaused flag is set to false when starting playback
            } else if (!isPaused) {  // If the sequencer is playing and is not paused, pause the sequencer
                pauseScheduler();
                emitPause();
                isPaused = true;
            } else {  // If the sequencer is paused, resume the sequencer
                resumeScheduler();
                emitResume();  // Assuming you'd like to inform other parts of your application that the sequencer is resuming
                isPaused = false;
            }
        
            if (isContinuousPlay && totalStepCount >= allSequencesLength) {
                // Reset counters for the next sequence
                beatCount = 0;
                barCount = 0;
                sequenceCount = 0;
                currentStep = 0;
                totalStepCount = 0;
        
                // Load the next sequence here (assuming you have a function or method to do so)
                // For example, you can increment the sequenceCount and use it to load the next preset.
                 console.log('[SequenceChangeDebug] Attempting to move to the next sequence.');

                sequenceCount++;
                if (sequenceCount > maxSequenceCount) {  // Assuming maxSequenceCount is the total number of sequences you have
                    sequenceCount = 1;  // Reset to the first sequence if we're at the end
                }
                loadPreset(`preset${sequenceCount}`);  // Load the next sequence
            }
            // After the sequencer starts, checks for continuous play
            checkContinuousPlay();
        });
        

        stopButton.addEventListener('click', () => {
            console.log('Stop button clicked');
            stopAllAudio(); // Stop all audio playback
        
            if (isPlaying) {
                stopScheduler(); // Custom function - ensure it's defined
                sendStopMessage(); // Custom function - ensure it's defined
                emitStop(); // Custom function - ensure it's defined
        
                stopButton.classList.add('selected');
                playButton.classList.remove('selected');
                isPlaying = false;
                isPaused = false; // Reset the isPaused flag when stopping the sequencer
                beatCount = 0; // reset the beat count
                barCount = 0; // reset the bar count
                sequenceCount = 0; // reset the sequence count
                currentStep = 0; // reset the step count
                totalStepCount = 0;
                resetStepLights(); // Custom function - ensure it's defined
            }
        });        

        } else {
          console.error("Play or Stop button is not defined");
        }


        document.addEventListener('DOMContentLoaded', () => {
            const openSlaveButton = document.getElementById('open-slave');
            openSlaveButton.addEventListener('click', () => {
                openSlaveSequencer();
                syncSettingsWithSlave();
                syncContinuousPlayWithSlave();
            });
        
            const continuousPlayCheckbox = document.getElementById('continuous-play');
            continuousPlayCheckbox.addEventListener('change', () => {
                syncContinuousPlayWithSlave();
            });
        
            window.unifiedSequencerSettings.observers.push(syncSettingsWithSlave);
        });
        

