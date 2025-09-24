// sequencer-audio-time-scheduling.js  (drop-in)
import { projectState, runtimeState, getCurrentSequence } from './sequencer-state.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';

let toneSequence = null;

export function setBPM(newBpm) {
    projectState.bpm = newBpm;
    if (runtimeState.Tone?.Transport) runtimeState.Tone.Transport.bpm.value = newBpm;
}

function disposeAllInstrumentNodes() {
    if (!runtimeState.instrumentRack) return;
    for (const id in runtimeState.instrumentRack) {
        const logic = runtimeState.instrumentRack[id]?.logic;
        if (logic?.modules?.synthEngine?.dispose) {
            try { logic.modules.synthEngine.dispose(); } catch (e) {
                console.warn(`[AUDIO] Could not dispose synthEngine for ${id}:`, e);
            }
        }
    }
    runtimeState.instrumentRack = {};
}

function scheduleStep(time, stepIndex) {
    runtimeState.currentStepIndex = stepIndex;
    window.dispatchEvent(new CustomEvent('step', { detail: { stepIndex } }));

    const seqData = (projectState.playMode === 'all')
        ? projectState.sequences[runtimeState.currentPlaybackSequenceIndex]
        : getCurrentSequence();
    if (!seqData) return;

    seqData.channels.forEach((chan, chIdx) => {
        if (!chan.steps[stepIndex]) return;

        if (chan.type === 'sampler') {
            playSamplerChannel(time, chan);
        } else if (chan.type === 'instrument' && chan.instrumentId) {
            const inst = runtimeState.instrumentRack[chan.instrumentId];
            if (!inst) return;
            // Pass absolute transport time
            inst.playInternalSequence(time);
        }
    });
}

function createToneSequence() {
    const totalSteps = projectState.sequences[0]?.channels[0]?.steps.length || 64;
    const stepArray = [...Array(totalSteps).keys()];

    toneSequence?.dispose();
    toneSequence = new runtimeState.Tone.Sequence((t, i) => {
        scheduleStep(t, i);
    }, stepArray, '16n').start(0);
}

export async function startPlayback(mode) {
    if (!runtimeState.isToneStarted) {
        await runtimeState.Tone.start();
        runtimeState.isToneStarted = true;
    }
    projectState.isPlaying = true;
    projectState.playMode = mode;
    if (mode === 'all') runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;

    setBPM(projectState.bpm);
    createToneSequence();
    runtimeState.Tone.Transport.start();
}

export function stopPlayback() {
    const T = runtimeState.Tone;
    if (!T?.Transport) return;

    T.Transport.stop();
    toneSequence?.dispose();
    toneSequence = null;

    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        if (instrument?.stopInternalSequence) instrument.stopInternalSequence();
    }

    runtimeState.activeInstrumentTriggers.clear();
    projectState.isPlaying = false;
    projectState.playMode = null;
    runtimeState.currentStepIndex = 0;
}

export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
}