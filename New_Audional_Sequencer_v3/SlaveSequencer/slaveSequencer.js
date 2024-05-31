// CombinedFile.js

// Unified Sequencer Settings Initialization
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedSequencerSettings = new UnifiedSequencerSettings();
    let isPlaying = false;
    let currentStep = 0;
    let currentSequence = 0;
    let timeoutId;
    let startTime; // Declare startTime to use later
    let nextStepTime;
    let isPaused = false;
    let pauseTime = 0;
    let totalStepCount = 0;
    let beatCount = 1;
    let barCount = 1;
    let sequenceCount = 0;
    let stepDuration;

    window.addEventListener('message', (event) => {
        console.log(`[slave] Received message from parent at ${new Date().toISOString()}:`);
        console.log(JSON.stringify(event.data));
        const message = event.data;
    
        switch (message.type) {
            case 'PLAY':
                startTime = message.startTime;
                nextStepTime = startTime;
                startScheduler();
                break;
            case 'STOP':
                stopScheduler();
                break;
            case 'STEP_UPDATE':
                currentStep = message.step;
                currentSequence = message.sequence;
                playStep(currentStep, currentSequence);
                break;
            case 'SYNC_SETTINGS':
                window.unifiedSequencerSettings.loadSettings(message.settings);
                break;
            default:
                console.warn(`[slave] Received unknown message type at ${new Date().toISOString()}: ${message.type}`);
        }
    });
    
    function startScheduler() {
        console.log(`[slave] Starting scheduler at ${new Date().toISOString()}`);
        clearTimeout(timeoutId);
        window.unifiedSequencerSettings.audioContext.resume();
        startTime = window.unifiedSequencerSettings.audioContext.currentTime;
        nextStepTime = startTime;
    
        const currentBPM = window.unifiedSequencerSettings.getBPM();
        console.log(`[slave] Current BPM from global settings at ${new Date().toISOString()}: ${currentBPM}`);
    
        scheduleNextStep();
    }

    function pauseScheduler() {
        clearTimeout(timeoutId);
        window.unifiedSequencerSettings.audioContext.suspend();
        pauseTime = window.unifiedSequencerSettings.audioContext.currentTime;
        isPaused = true;
    }

    function resumeScheduler() {
        if (isPaused) {
            window.unifiedSequencerSettings.audioContext.resume();
            nextStepTime = window.unifiedSequencerSettings.audioContext.currentTime;
            isPaused = false;
        }
        scheduleNextStep();
    }

    function scheduleNextStep() {
        console.log(`[slave] Scheduling next step at ${nextStepTime}`);
        const bpm = window.unifiedSequencerSettings.getBPM() || 105;
        stepDuration = 60 / bpm / 4;

        timeoutId = setTimeout(() => {
            playStep(currentStep, currentSequence);
            scheduleNextStep();
        }, (nextStepTime - window.unifiedSequencerSettings.audioContext.currentTime) * 1000);
    }

    function stopScheduler() {
        console.log('[slave] Stopping scheduler.');
        clearTimeout(timeoutId);
        resetStepLights();

        window.unifiedSequencerSettings.sourceNodes.forEach((source, index) => {
            if (source && source.started) {
                source.stop();
                source.disconnect();
                window.unifiedSequencerSettings.sourceNodes[index] = null;
            }
        });

        currentStep = 0;
        beatCount = 1;
        barCount = 1;
        sequenceCount = 0;
        isPaused = false;
        pauseTime = 0;
    }

    function handleStep(channel, channelData, totalStepCount) {
        console.log(`[slave] Handling step for channel ${channel.id}`);
        let isMuted = channel.dataset.muted === 'true';
        const isToggleMuteStep = channelData.toggleMuteSteps.includes(totalStepCount);

        if (isToggleMuteStep) {
            isMuted = !isMuted;
            channel.dataset.muted = isMuted ? 'true' : 'false';
            updateMuteState(channel, isMuted);
        }

        return isMuted;
    }

    function renderPlayhead(buttons, currentStep) {
        console.log(`[slave] Rendering playhead for step ${currentStep}`);
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

    function playStep(currentStep, currentSequence) {
        console.log(`[slave] Playing step ${currentStep} for sequence ${currentSequence} at ${new Date().toISOString()}`);
        const presetData = presets.preset1;

        for (let channelIndex = 0; channelIndex < 16; channelIndex++) {
            const channel = channels[channelIndex];
            const buttons = channel.querySelectorAll('.step-button');
            let channelData = presetData.channels[channelIndex] || {
                steps: Array(4096).fill(false),
                mute: false,
                url: null
            };

            renderPlayhead(buttons, currentStep);
            const isMuted = handleStep(channel, channelData, totalStepCount);
            playSound(currentSequence, channel, currentStep);
        }

        const isLastStep = currentStep === 63;
        incrementStepCounters();

        const continuousPlayCheckbox = document.getElementById('continuous-play');
        let isContinuousPlay = continuousPlayCheckbox.checked;

        if (isContinuousPlay && isLastStep) {
            let nextSequence = (currentSequence + 1) % window.unifiedSequencerSettings.numSequences;
            handleSequenceTransition(nextSequence, 0);
        }
    }

    function incrementStepCounters() {
        console.log('[slave] Incrementing step counters.');
        currentStep = (currentStep + 1) % 64;
        totalStepCount = (totalStepCount + 1);
        nextStepTime += stepDuration;

        if (currentStep % 4 === 0) {
            beatCount++;
            emitBeat(beatCount);
        }

        if (currentStep % 16 === 0) {
            barCount++;
            emitBar(barCount);
        }

        if (currentStep === 0) {
            sequenceCount++;
        }
    }

    function handleSequenceTransition(targetSequence, startStep) {
        console.log(`[slave] Handling sequence transition to sequence ${targetSequence}`);
        window.unifiedSequencerSettings.setCurrentSequence(targetSequence);
        console.log(`Sequence set to ${targetSequence}`);

        const currentSequenceDisplay = document.getElementById('current-sequence-display');
        if (currentSequenceDisplay) {
            currentSequenceDisplay.innerHTML = `Sequence: ${targetSequence}`;
        }

        if (startStep === undefined) {
            startStep = currentStep;
        }

        resetCountersForNewSequence(startStep);
        createStepButtonsForSequence();

        setTimeout(() => {
            window.unifiedSequencerSettings.updateUIForSequence(targetSequence);
        }, 100);
    }

    function resetCountersForNewSequence(startStep = 0) {
        currentStep = startStep;
        beatCount = Math.floor(startStep / 4);
        barCount = Math.floor(startStep / 16);
        totalStepCount = startStep;
        console.log(`Counters reset for new sequence starting at step ${startStep}`);
    }

    function resetStepLights() {
        console.log('[slave] Resetting step lights.');
        const buttons = document.querySelectorAll('.step-button');
        buttons.forEach(button => {
            button.classList.remove('playing');
        });
    }
});