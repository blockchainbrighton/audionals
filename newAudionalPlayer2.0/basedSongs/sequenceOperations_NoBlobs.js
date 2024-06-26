// sequenceOperations.js

// Utility function to dispatch sequence events
function dispatchSequenceEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
}

function playSequenceStep(time) {
    const sequenceData = window.settings?.projectSequences;
    if (!sequenceData || Object.keys(sequenceData).length === 0) {
        console.error('[debug] Sequence data is not ready or empty.');
        return;
    }

    // console.log('[debug] Playing sequence step with data:', sequenceData);
   

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    if (!currentSequenceData || !Object.keys(currentSequenceData).length) {
        incrementStepAndSequence(sequenceKeys.length);
        return;
    }

    playSteps(currentSequenceData.normalSteps, time);
    playSteps(currentSequenceData.reverseSteps, time, true);
    incrementStepAndSequence(sequenceKeys.length);
}

function playSteps(stepsData, time, isReverse = false) {
    if (!stepsData || typeof stepsData !== 'object') {
        return console.error(`[playSteps] Invalid steps data:`, stepsData);
    }

    for (const [channelName, steps] of Object.entries(stepsData)) {
        if (Array.isArray(steps)) {
            const stepData = steps.find(step => step.step === currentStep);
            if (stepData) {
                playChannelStep(channelName, stepData, time, isReverse);
            }
        } else {
            console.error(`[playSteps] Expected steps to be an array for channel "${channelName}", but got:`, steps);
        }
    }
}

function playChannelStep(channelName, stepData, time, isReverse) {
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channelName);
    const trimTimes = globalTrimTimes[channelName];

    if (audioBufferData?.buffer && trimTimes) {
        const buffer = isReverse ? globalReversedAudioBuffers[channelName] : audioBufferData.buffer;
        const playTimes = isReverse ? calculateReversedTrimTimes(trimTimes) : trimTimes;

        playBuffer(buffer, playTimes, channelName, time);
        notifyVisualizer(parseInt(channelName.slice(8)) - 1, stepData.step);
    } else {
        console.error(`No audio buffer or trim times found for ${channelName}`);
    }
}

function scheduleNotes() {
    const sequenceData = window.settings?.projectSequences;
    if (!sequenceData || Object.keys(sequenceData).length === 0) {
        console.error('[debug] Sequence data is not ready or empty.');
        return;
    }

    // console.log('[debug] Scheduling notes with sequence data:', sequenceData);
   
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);

    while (nextNoteTime < currentTime + 0.1) {
        // Schedule note
        const scheduleTime = nextNoteTime;
        playSequenceStep(scheduleTime);
        
        // Log scheduling time and check against current time
        if (audioCtx.currentTime > scheduleTime) {
            // console.warn(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} missed at ${audioCtx.currentTime.toFixed(3)}.`);
        } else {
            // console.log(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} on time.`);
        }

        nextNoteTime += getStepDuration();
    }
}

// Function to notify subsequent parts of the application about the current step and sequence
function incrementStepAndSequence(sequenceCount) {
    currentStep = (currentStep + 1) % 64;
    if (currentStep === 0) {
        currentSequence = (currentSequence + 1) % sequenceCount;
    }

    // Dispatch events for the current step and sequence
    dispatchSequenceEvent('sequenceUpdated', { currentSequence, currentStep });
}

// Example listener setup for subsequent files to respond to sequence updates
document.addEventListener('sequenceUpdated', (event) => {
    const { currentSequence, currentStep } = event.detail;
    // console.log(`Sequence Updated: Sequence ${currentSequence}, Step ${currentStep}`);
    // Additional logic for subsequent parts of the application
});
