document.addEventListener('DOMContentLoaded', () => {
    window.unifiedSequencerSettings = new UnifiedSequencerSettings();
    let isPlaying = false;
    let currentStep = 0;
    let currentSequence = 0;
    let timeoutId;

    window.addEventListener('message', (event) => {
      // stringified logs for clarity
      console.log(JSON.stringify(event.data));
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
    });

