/**
 * Module: audio-time-scheduling-managment.js
 * Purpose: Manages global audio context, transport controls (play, stop, BPM),
 * and the main Tone.Sequence scheduler.
 * Exports: setBPM, startPlayback, stopPlayback, resetAudioEnvironment
 * Depends on: state.js, sequencer-sampler-channel-playback.js
 */

import { projectState, runtimeState, getCurrentSequence } from './state.js';
import { playSamplerChannel } from './sequencer-sampler-channel-playback.js';

let toneSequence;

/* ─────────────────────────────── BPM ─────────────────────────────── */
export function setBPM(newBpm) {
    projectState.bpm = newBpm;
    if (runtimeState.Tone?.Transport) runtimeState.Tone.Transport.bpm.value = newBpm;
}

/* ──────────────── Dispose/cleanup for audio nodes ──────────────── */
function disposeAllInstrumentNodes() {
    if (!runtimeState.instrumentRack) return;
    for (const id in runtimeState.instrumentRack) {
        const logic = runtimeState.instrumentRack[id]?.logic;
        if (logic?.modules?.synthEngine?.dispose) {
            try {
                logic.modules.synthEngine.dispose();
            } catch (e) {
                console.warn(`[AUDIO][DEBUG] Could not dispose synthEngine for instrument ${id}:`, e);
            }
        }
    }
    runtimeState.instrumentRack = {};
}

/* ─────────────────────────── step‑scheduler core ──────────────────────────── */
function scheduleStep(time, stepIndex) {
    runtimeState.currentStepIndex = stepIndex;

    // --- ADD THIS: Dispatch event to UI
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
            
            // ▼▼▼ THIS IS THE FIX ▼▼▼
            // Remove the `if (!rec?.isPlaying)` check.
            // Pass the `time` argument to the instrument's public API.
            if (inst?.logic) {
                inst.logic.playInternalSequence(time);
            }
        }
    });
}

/* ───────────────────────────── tone.Sequence ─────────────────────────────── */
function createToneSequence() {
    const totalSteps = projectState.sequences[0]?.channels[0]?.steps.length || 64;
    const stepArray  = [...Array(totalSteps).keys()];

    toneSequence?.dispose();
    toneSequence = new runtimeState.Tone.Sequence((t, i) => {
        scheduleStep(t, i);

        if (projectState.playMode === 'all' && i === totalSteps - 1) {
            runtimeState.Tone.Transport.scheduleOnce(() => {
                runtimeState.currentPlaybackSequenceIndex =
                    (runtimeState.currentPlaybackSequenceIndex + 1) % projectState.sequences.length;
                createToneSequence();
            }, `+${totalSteps}*16n`);
        }
    }, stepArray, '16n').start(0);
}

/* ────────────── public transport helpers ────────────── */
export async function startPlayback(mode) {
    if (!runtimeState.isToneStarted) {
        await runtimeState.Tone.start();
        runtimeState.isToneStarted = true;
    }
    projectState.isPlaying = true;
    projectState.playMode  = mode;
    if (mode === 'all') runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;

    setBPM(projectState.bpm);
    createToneSequence();

    // ▼▼▼ THIS IS THE FIX ▼▼▼
    // 1. Broadcast the 'transport-start' event to all instrument instances.
    // This allows an "armed" recorder to begin recording in sync with the host transport.
    console.log('[AUDIO] Broadcasting transport-start to all instruments.');
    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        instrument?.logic?.eventBus?.dispatchEvent(new CustomEvent('transport-start'));
    }
    // ▲▲▲ END OF FIX ▲▲▲

    runtimeState.Tone.Transport.start();
}

/**
 * Stops all audio playback, cleans up the transport, and resets the state.
 * This is the definitive "all-stop" function for the application.
 */
export function stopPlayback() {
    const T = runtimeState.Tone;
    if (!T?.Transport) {
        return;
    }

    T.Transport.stop();
    T.Transport.cancel(0);
    
    if (toneSequence) {
        toneSequence.dispose();
        toneSequence = null;
    }

    // 4. Broadcast the 'transport-stop' event to all instrument instances.
    // This logic is already correct and is what we are mirroring above.
    console.log('[AUDIO] Broadcasting transport-stop to all instruments.');
    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        instrument?.logic?.eventBus?.dispatchEvent(new CustomEvent('transport-stop'));
    }

    // 5. Reset all global playback state variables.
    runtimeState.activeInstrumentTriggers.clear();
    projectState.isPlaying = false;
    projectState.playMode = null;
    runtimeState.currentStepIndex = -1; // Use -1 to indicate no step is active
    
    // 6. Notify the main UI that playback has stopped so it can update.
    window.dispatchEvent(new CustomEvent('step', { detail: { stepIndex: -1 } }));
}

export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
}