// slaveSequencer.js

document.addEventListener('DOMContentLoaded', () => {
    window.unifiedSequencerSettings = new UnifiedSequencerSettings();
    let isPlaying = false;
    let currentStep = 0;
    let currentSequence = 0;
    let timeoutId;
    let startTime;  // Declare startTime to use later
    let nextStepTime;

    window.addEventListener('message', (event) => {
        console.log(JSON.stringify(event.data));
        const message = event.data;

        switch(message.type) {
            case 'PLAY':
                // Set startTime and nextStepTime based on received startTime from the master
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
                console.warn("Received unknown message type:", message.type);
        }
    });
});
