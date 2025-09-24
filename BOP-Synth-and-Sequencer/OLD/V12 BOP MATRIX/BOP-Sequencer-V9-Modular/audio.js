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

    // A Set to keep track of which instruments should be playing on THIS step
    const instrumentsToPlayThisStep = new Set();

    seqData.channels.forEach((channel) => {
        const instrument = channel.instrumentId ? runtimeState.instrumentRack[channel.instrumentId] : null;

        if (channel.steps[stepIndex]) {
            // --- This step IS active ---
            if (channel.type === 'sampler') {
                const buffer = runtimeState.allSampleBuffers[channel.selectedSampleIndex];
                if (buffer) {
                    new runtimeState.Tone.Player(buffer).toDestination().start(time);
                }
            } else if (channel.type === 'instrument' && instrument) {
                if (!runtimeState.activeInstrumentTriggers.has(channel.instrumentId)) {
                    // Pass the precise `time` from the host's clock
                    instrument.playInternalSequence(time); 
                }
                instrumentsToPlayThisStep.add(channel.instrumentId);
            }
        }
    });

    // --- After checking all channels, see which instruments need to be STOPPED ---
    // Iterate through the instruments that WERE playing before this step.
    for (const previouslyActiveId of runtimeState.activeInstrumentTriggers) {
        // If an instrument that was playing is NOT in the list for the current step, stop it.
        if (!instrumentsToPlayThisStep.has(previouslyActiveId)) {
            const instrumentToStop = runtimeState.instrumentRack[previouslyActiveId];
            instrumentToStop?.stopInternalSequence();
        }
    }
    
    // Finally, update the master list of active triggers to reflect the current step's state.
    runtimeState.activeInstrumentTriggers = instrumentsToPlayThisStep;
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

// When the main sequencer stops, we must also stop all triggered synths.
export function stopPlayback() {
    if (runtimeState.Tone && runtimeState.Tone.Transport) {
        runtimeState.Tone.Transport.stop();
        if (toneSequence) toneSequence.dispose();
        toneSequence = null;

        // --- NEW: Stop all active instruments when the host stops ---
        for (const instrumentId of runtimeState.activeInstrumentTriggers) {
            const instrument = runtimeState.instrumentRack[instrumentId];
            instrument?.stopInternalSequence();
        }
        runtimeState.activeInstrumentTriggers.clear(); // Clear the set

        projectState.isPlaying = false;
        projectState.playMode = null;
        runtimeState.currentStepIndex = 0;
    }
}