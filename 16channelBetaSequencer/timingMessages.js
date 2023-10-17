// timingMessages.js
let currentStepTime;


const sequencerChannel = new BroadcastChannel('sequencerChannel');

function emitMessage(type, data) {
    console.log(`[Sequencer ${new Date().toISOString()}] Emitting message of type "${type}" with data:`, data);
    sequencerChannel.postMessage({ type, data });
}

function emitStep(currentStep) {
    console.log(`[timingMessages.js emitStep] Emitting step message for currentStep: ${currentStep}`);
    currentStepTime = Date.now(); // Update the currentStepTime here
    const message = {
        type: 'step',
        data: {
            step: currentStep,
            timestamp: currentStepTime
        }
    };
    sequencerChannel.postMessage(message);
}



function emitBeat(beatCount, barCount) {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting beat message for beatCount: ${beatCount}, barCount: ${barCount}`);
    emitMessage('beat', { beat: beatCount, bar: barCount });
}

function emitBar(barCount) {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting bar message for barCount: ${barCount}`);
    emitMessage('bar', { bar: barCount });
}


function emitPause() {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting pause message`);
    emitMessage('pause', {});
}

function emitResume() {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting resume message`);
    emitMessage('resume', {});
}

function emitStop() {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting stop message`);
    emitMessage('stop', {});
}

function emitPlay() {
    console.log(`[timingMessages ${new Date().toISOString()}] Emitting play message`);
    emitMessage('play', {});
    emitMessage('beat', { beat: beatCount, bar: barCount });

}


