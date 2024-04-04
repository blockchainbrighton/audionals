// stepSchedulers.js

function startScheduler() {
    console.log("[startSchedulerMain] Function entered. Starting playback scheduler.");

    // Log the initial state of the audio context
    console.log(`[startSchedulerMain] AudioContext state before resume: ${audioContext.state}`);

    channels.forEach(channel => {
        const channelIndex = parseInt(channel.dataset.id.split('-')[1]);
        console.log(`[startScheduler] Processing channel: ${channelIndex}`);

        // Check and log the mute state for the channel
        if (!channelMutes[channelIndex]) {  // If channel is not muted
            console.log(`[startScheduler] Channel ${channelIndex} is not muted. Setting volume to 1.`);
            setChannelVolume(channelIndex, 1);
        } else {
            console.log(`[startScheduler] Channel ${channelIndex} is muted.`);
        }
    });

    clearTimeout(timeoutId); // Clear the current timeout without closing the audio context
    console.log("[startScheduler] Cleared existing timeout ID.");

    // Resuming the audio context and logging the action
    audioContext.resume().then(() => {
        console.log("[startScheduler] AudioContext resumed successfully.");
    }).catch(error => {
        console.error("[startScheduler] Error resuming AudioContext:", error);
    });

    startTime = audioContext.currentTime;
    nextStepTime = startTime;

    // Logging the current time set for scheduling
    console.log(`[startScheduler] Playback start time set to ${startTime} (AudioContext time).`);

    const currentBPM = window.unifiedSequencerSettings.getBPM();
    console.log(`[startScheduler] Current BPM from global settings: ${currentBPM}`);

    // Schedule the next step and log the action
    console.log("[startScheduler] Scheduling next step.");
    scheduleNextStep();

    console.log("[startScheduler] Scheduler setup complete.");
}


function pauseScheduler() {
    clearTimeout(timeoutId); // Clear the current timeout without closing the audio context
    audioContext.suspend();
    pauseTime = audioContext.currentTime;  // record the time at which the sequencer was paused
    isPaused = true;
}

function resumeScheduler() {
  if(isPaused) {
      // Replace the startTime adjustment with a nextStepTime reset
      audioContext.resume();
      nextStepTime = audioContext.currentTime;
      isPaused = false;
  }
  scheduleNextStep(); // Begin scheduling steps again
}

function scheduleNextStep() {
    console.log("[scheduleNextStep] Attempting to play sound for Channel:", "Step:", currentStep);

    const bpm = window.unifiedSequencerSettings.getBPM() || 105; // Fallback to 105 BPM
    console.log(`[scheduleNextStep] Current BPM: ${bpm}`);

    stepDuration = 60 / bpm / 4;
    console.log(`[scheduleNextStep] Step Duration: ${stepDuration}`);

    timeoutId = setTimeout(() => {
        playStep();
        scheduleNextStep();
    }, (nextStepTime - audioContext.currentTime) * 1000);
}


function stopScheduler() {
    channels.forEach(channel => {
        setChannelVolume(parseInt(channel.dataset.id.split('-')[1]), 0);
      });
    clearTimeout(timeoutId);
    // Reset counters
    currentStep = 0;
    beatCount = 1;
    barCount = 1; // Reset barCount to 1
    sequenceCount = 0;
    isPaused = false;
    pauseTime = 0;
}

function resetStepLights() {
  const buttons = document.querySelectorAll('.step-button');
  buttons.forEach(button => {
      button.classList.remove('playing');
  });
  }
