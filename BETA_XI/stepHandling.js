// stepHandling.js

let totalNumberOfSequences = window.unifiedSequencerSettings.numSequences;

function handleStep(channel, channelData, totalStepCount) {
    console.log(`[handleStep] Entered for ${channel.dataset.id} with totalStepCount: ${totalStepCount}`);
    let isMuted = channel.dataset.muted === 'true';
    const isToggleMuteStep = channelData.toggleMuteSteps.includes(totalStepCount);
    console.log(`[handleStep] For ${channel.dataset.id}, toggleMuteSteps: ${channelData.toggleMuteSteps}, isToggleMuteStep: ${isToggleMuteStep}`);

    if (isToggleMuteStep) {
        isMuted = !isMuted;
        channel.dataset.muted = isMuted ? 'true' : 'false';
        updateMuteState(channel, isMuted);
        console.log(`[handleStep] Mute toggled for ${channel.dataset.id}. New mute state: ${isMuted}`);
    }
    return isMuted;
}

function renderPlayhead(buttons, currentStep) {
    console.log(`[renderPlayhead] Rendering playhead at step ${currentStep} for ${buttons.length} buttons.`);
    buttons.forEach((button, buttonIndex) => {
        button.classList.remove('playing');
        button.classList.remove('triggered');

        if (buttonIndex === currentStep) {
            button.classList.add('playing');
        }

        if (button.classList.contains('selected')) {
            button.classList.add('triggered');
        }
    });
}

function playStep() {
    console.log("[playStep] Function entered.");
    console.log(`[playStep] currentStep before processing: ${currentStep}`);
    
    const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
    console.log(`[playStep] Current sequence: ${currentSequence}`);
    const presetData = presets.preset1;
    
    // Use dynamic channel count; re-query channels from DOM
    const numChannels = window.unifiedSequencerSettings.numChannels;
    const channels = document.querySelectorAll('.channel[id^="channel-"]');
    console.log(`[playStep] Found ${channels.length} channels in DOM. Processing ${numChannels} channels.`);
  
    for (let channelIndex = 0; channelIndex < numChannels; channelIndex++) {
        console.log(`[playStep] Processing channel index: ${channelIndex}`);
        const channel = channels[channelIndex];
        if (!channel) {
            console.warn(`[playStep] No channel found at index ${channelIndex}`);
            continue;
        }
        const buttons = channel.querySelectorAll('.step-button');
        console.log(`[playStep] Channel ${channel.dataset.id} has ${buttons.length} step buttons.`);
        
        let channelData = presetData.channels[channelIndex] || {
            steps: Array(4096).fill(false),
            mute: false,
            url: null,
            toggleMuteSteps: []  // Add a default empty array

        };
        console.log(`[playStep] Channel ${channel.dataset.id} data loaded.`);
        
        renderPlayhead(buttons, currentStep);
        const isMuted = handleStep(channel, channelData, totalStepCount);
        console.log(`[playStep] Channel ${channel.dataset.id} mute state: ${isMuted}`);
  
        playSound(currentSequence, channel, currentStep);
        console.log(`[playStep] playSound called for sequence ${currentSequence}, channel ${channel.dataset.id}, step ${currentStep}`);
    }
  
    const isLastStep = currentStep === 63;
    console.log(`[playStep] isLastStep: ${isLastStep}`);
  
    incrementStepCounters();
    console.log(`[playStep] After increment: currentStep = ${currentStep}, totalStepCount = ${totalStepCount}`);
  
    const continuousPlayCheckbox = document.getElementById('continuous-play');
    let isContinuousPlay = continuousPlayCheckbox.checked;
    console.log(`[playStep] Continuous play is ${isContinuousPlay}`);
  
    if (isContinuousPlay && isLastStep) {
        let nextSequence = (currentSequence + 1) % totalNumberOfSequences;
        console.log(`[playStep] Transitioning to next sequence: ${nextSequence}`);
        handleSequenceTransition(nextSequence, 0);
    }
}

function incrementStepCounters() {
    console.log(`[incrementStepCounters] Before increment: currentStep = ${currentStep}, totalStepCount = ${totalStepCount}`);
    let oldStep = currentStep;
    currentStep = (currentStep + 1) % 64;
    totalStepCount = totalStepCount + 1;
    nextStepTime += stepDuration;
    console.log(`[incrementStepCounters] Updated: currentStep from ${oldStep} to ${currentStep}, totalStepCount = ${totalStepCount}, nextStepTime = ${nextStepTime}`);

    if (currentStep % 4 === 0) {
        beatCount++;
        emitBeat(beatCount);
        console.log(`[incrementStepCounters] Beat count incremented to ${beatCount}`);
    }
    
    if (currentStep % 16 === 0) {
        barCount++;
        emitBar(barCount);
        console.log(`[incrementStepCounters] Bar count incremented to ${barCount}`);
    }
    
    if (currentStep === 0) {
        sequenceCount++;
        console.log(`[incrementStepCounters] Sequence count incremented to ${sequenceCount}`);
    }
}

function handleSequenceTransition(targetSequence, startStep) {
    console.log("[handleSequenceTransition] Function entered.");
    window.unifiedSequencerSettings.setCurrentSequence(targetSequence);
    console.log(`[handleSequenceTransition] Sequence set to ${targetSequence}`);

    const currentSequenceDisplay = document.getElementById('current-sequence-display');
    if (currentSequenceDisplay) {
        currentSequenceDisplay.innerHTML = `Sequence: ${targetSequence}`;
        console.log(`[handleSequenceTransition] Updated sequence display to: Sequence ${targetSequence}`);
    }
  
    if (startStep === undefined) {
        startStep = currentStep;
        console.log(`[handleSequenceTransition] No startStep provided. Defaulting to currentStep: ${currentStep}`);
    }
  
    resetCountersForNewSequence(startStep);
    createStepButtonsForSequence();
  
    setTimeout(() => {
        window.unifiedSequencerSettings.updateUIForSequence(targetSequence);
        console.log(`[handleSequenceTransition] UI updated for sequence ${targetSequence}`);
    }, 100);
}

function resetCountersForNewSequence(startStep = 0) {
    currentStep = startStep;
    beatCount = Math.floor(startStep / 4);
    barCount = Math.floor(startStep / 16);
    totalStepCount = startStep;
    console.log(`[resetCountersForNewSequence] Counters reset. Start step: ${startStep}, Beat: ${beatCount}, Bar: ${barCount}, Total steps: ${totalStepCount}`);
}