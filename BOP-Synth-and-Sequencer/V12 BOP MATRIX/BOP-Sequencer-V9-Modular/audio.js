// audio.js
import { projectState, runtimeState, getCurrentSequence } from './state.js';

let toneSequence;

export function setBPM(newBpm) {
    projectState.bpm = newBpm;
    if (runtimeState.Tone && runtimeState.Tone.Transport) {
        runtimeState.Tone.Transport.bpm.value = newBpm;
    }
}

function scheduleStep(time, stepIndex) {
    runtimeState.currentStepIndex = stepIndex;

    const seqData = projectState.playMode === 'all'
        ? projectState.sequences[runtimeState.currentPlaybackSequenceIndex]
        : getCurrentSequence();
    
    if (!seqData) return;

    seqData.channels.forEach((channel) => {
        if (channel.steps[stepIndex]) {
            if (channel.type === 'sampler') {
                const buffer = runtimeState.allSampleBuffers[channel.selectedSampleIndex];
                if (buffer) {
                    new runtimeState.Tone.Player(buffer).toDestination().start(time);
                }
            } else if (channel.type === 'instrument' && channel.instrumentId) {
                const instrument = runtimeState.instrumentRack[channel.instrumentId];
                instrument?.playInternalSequence();
            }
        }
    });
}

function createToneSequence() {
    const totalSteps = projectState.sequences[0]?.channels[0]?.steps.length || 64;
    const sequenceSteps = Array.from({ length: totalSteps }, (_, i) => i);

    if (toneSequence) toneSequence.dispose();

    toneSequence = new runtimeState.Tone.Sequence((time, stepIndex) => {
        scheduleStep(time, stepIndex);

        if (projectState.playMode === 'all' && stepIndex === totalSteps - 1) {
            runtimeState.Tone.Transport.scheduleOnce(() => {
                const nextSeqIndex = (runtimeState.currentPlaybackSequenceIndex + 1) % projectState.sequences.length;
                runtimeState.currentPlaybackSequenceIndex = nextSeqIndex;
                createToneSequence();
            }, `+${totalSteps}*16n`);
        }
    }, sequenceSteps, "16n");

    toneSequence.start(0);
}

export async function startPlayback(mode) {
    if (!runtimeState.isToneStarted) {
        await runtimeState.Tone.start();
        runtimeState.isToneStarted = true;
    }

    projectState.isPlaying = true;
    projectState.playMode = mode;
    
    if (mode === 'all') {
        runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;
    }

    setBPM(projectState.bpm);
    createToneSequence();
    runtimeState.Tone.Transport.start();
}

export function stopPlayback() {
    if (runtimeState.Tone && runtimeState.Tone.Transport) {
        runtimeState.Tone.Transport.stop();
        if (toneSequence) toneSequence.dispose();
        toneSequence = null;
        projectState.isPlaying = false;
        projectState.playMode = null;
        runtimeState.currentStepIndex = 0;
    }
}