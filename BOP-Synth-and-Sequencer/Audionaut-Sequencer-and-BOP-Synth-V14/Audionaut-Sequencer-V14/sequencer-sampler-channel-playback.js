/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Sequencer step scheduling, sample and instrument playback, Tone.Sequence management.
 * Exports: startPlayback
 * Depends on: audio-handler.js for stopPlayback/setBPM
 */

import { projectState, runtimeState, getCurrentSequence } from './state.js';
import { setBPM } from './audio-manager.js';

// Use this variable for sequence management
runtimeState.toneSequence = null;

function scheduleStep(time, stepIndex) {
    runtimeState.currentStepIndex = stepIndex;
    console.debug('[SEQ] step', stepIndex, 'time', time.toFixed(3));

    const seqData = (projectState.playMode === 'all')
        ? projectState.sequences[runtimeState.currentPlaybackSequenceIndex]
        : getCurrentSequence();
    if (!seqData) return;

    seqData.channels.forEach((chan, chIdx) => {
        if (!chan.steps[stepIndex]) return;

        // Sampler track
        if (chan.type === 'sampler') {
            const buf = runtimeState.allSampleBuffers[chan.selectedSampleIndex];
            if (buf) {
                console.debug('   ├─ [SAMPLER]', chIdx, '→ start Player');
                const player = new runtimeState.Tone.Player(buf)
                    .toDestination()
                    .start(time);
                setTimeout(() => { try { player.dispose(); } catch {} }, 1000);
            }
            return;
        }

        // Instrument track (BOP synth)
        if (chan.type === 'instrument' && chan.instrumentId) {
            const inst = runtimeState.instrumentRack[chan.instrumentId];
            if (!inst) return;
            const rec = inst.logic?.modules?.recorder;
            if (!rec?.isPlaying) {
                console.debug('   ├─ [INST]', chIdx, '→ playInternalSequence (stand‑alone)', chan.instrumentId);
                inst.playInternalSequence();
            }
        }
    });
}

function createToneSequence() {
    const totalSteps = projectState.sequences[0]?.channels[0]?.steps.length || 64;
    const stepArray  = [...Array(totalSteps).keys()];

    if (runtimeState.toneSequence) runtimeState.toneSequence.dispose();
    runtimeState.toneSequence = new runtimeState.Tone.Sequence((t, i) => {
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
    runtimeState.Tone.Transport.start();
}

export function stopPlayback() {
    const T = runtimeState.Tone;
    if (!T?.Transport) return;

    // 1. Stop transport and dispose sequence
    T.Transport.stop();
    if (runtimeState.toneSequence) {
        runtimeState.toneSequence.dispose();
        runtimeState.toneSequence = null;
    }

    // 2. Broadcast stop to instruments
    console.log('[SEQ] Broadcasting transport-stop to all instruments.');
    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        if (instrument?.logic?.eventBus) {
            try {
                const stopEvent = new CustomEvent('transport-stop');
                instrument.logic.eventBus.dispatchEvent(stopEvent);
            } catch (e) {
                console.error(`[SEQ] Error sending stop event to instrument ${id}:`, e);
            }
        }
    }

    runtimeState.activeInstrumentTriggers?.clear?.();

    // 4. Reset state
    projectState.isPlaying = false;
    projectState.playMode  = null;
    runtimeState.currentStepIndex = 0;
}
