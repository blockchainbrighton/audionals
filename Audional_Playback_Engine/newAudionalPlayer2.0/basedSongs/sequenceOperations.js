// sequenceOperations.js
function playSequenceStep(time) {
    if (!isReadyToPlay || !Object.keys(preprocessedSequences).length) {
        return console.error("Sequence data is not ready or empty.");
    }

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    if (!Object.keys(currentSequenceData).length) {
        incrementStepAndSequence(sequenceKeys.length);
        return;
    }

    playSteps(currentSequenceData.normalSteps, time);
    playSteps(currentSequenceData.reverseSteps, time, true);
    incrementStepAndSequence(sequenceKeys.length);
}

function playSteps(stepsData, time, isReverse = false) {
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
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);

    while (nextNoteTime < currentTime + 0.1) {
        // Schedule note
        const scheduleTime = nextNoteTime;
        playSequenceStep(scheduleTime);
        
        // Log scheduling time and check against current time
        if (audioCtx.currentTime > scheduleTime) {
            console.warn(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} missed at ${audioCtx.currentTime.toFixed(3)}.`);
        } else {
            // console.log(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} on time.`);
        }

        nextNoteTime += getStepDuration();
    }
}

function incrementStepAndSequence(sequenceCount) {
    currentStep = (currentStep + 1) % 64;
    if (currentStep === 0) {
        currentSequence = (currentSequence + 1) % sequenceCount;
    }
}
