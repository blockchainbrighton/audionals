document.addEventListener('DOMContentLoaded', () => {
    window.unifiedSequencerSettings = new UnifiedSequencerSettings();
    let isPlaying = false;
    let currentStep = 0;
    let currentSequence = 0;
    let timeoutId;

    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'PLAY') {
            startScheduler();
        } else if (message.type === 'STOP') {
            stopScheduler();
        } else if (message.type === 'STEP_UPDATE') {
            currentStep = message.step;
            currentSequence = message.sequence;
            playStep(currentStep, currentSequence);
        } else if (message.type === 'SYNC_SETTINGS') {
            window.unifiedSequencerSettings.loadSettings(message.settings);
        }
    });

    function startScheduler() {
        if (!isPlaying) {
            playStep(currentStep, currentSequence);
            isPlaying = true;
        }
    }

    function stopScheduler() {
        if (isPlaying) {
            clearTimeout(timeoutId);
            isPlaying = false;
        }
    }

    function playStep(step, sequence) {
        // Play logic here (mirroring the master sequencer)
        // Ensure you have access to all the necessary variables and functions
        // (such as playSound, renderPlayhead, handleStep, etc.)

        timeoutId = setTimeout(() => {
            playStep(step, sequence);
        }, 100); // Set appropriate step interval
    }

    function resetStepLights() {
        // Implement step light reset logic
    }
});
