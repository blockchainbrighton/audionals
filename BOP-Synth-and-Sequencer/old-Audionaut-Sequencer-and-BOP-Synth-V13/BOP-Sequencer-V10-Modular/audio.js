/**
 * Module: BOP-Sequencer-V10-Modular/audio.js
 * Purpose: Audio processing and playback functionality
 * Exports: stopPlayback, setBPM, resetAudioEnvironment
 * Depends on: state.js
 */

import { projectState, runtimeState, getCurrentSequence } from './state.js';

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
                console.log(`[AUDIO][DEBUG] Disposed synthEngine for instrument ${id}`);
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
    console.debug('[SEQ] step', stepIndex, 'time', time.toFixed(3));

    /* Which sequence are we reading this tick? */
    const seqData = (projectState.playMode === 'all')
        ? projectState.sequences[runtimeState.currentPlaybackSequenceIndex]
        : getCurrentSequence();
    if (!seqData) return;

    seqData.channels.forEach((chan, chIdx) => {
        if (!chan.steps[stepIndex]) return; // un‑lit grid cell

        // Sampler track
        if (chan.type === 'sampler') {
            const buf = runtimeState.allSampleBuffers[chan.selectedSampleIndex];
            if (buf) {
                console.debug('   ├─ [SAMPLER]', chIdx, '→ start Player');
                const player = new runtimeState.Tone.Player(buf)
                    .toDestination()
                    .start(time);
                // Immediately dispose Player node after scheduled playback
                setTimeout(() => {
                    try { player.dispose(); } catch {}
                }, 1000);
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
    runtimeState.Tone.Transport.start();
}

export function stopPlayback() {
    const T = runtimeState.Tone;
    if (!T?.Transport) return;

    // 1. Stop the master transport and dispose the sequencer's own sequence. This is correct.
    T.Transport.stop();
    toneSequence?.dispose();
    toneSequence = null;

    // 2. NEW: Broadcast a universal 'transport-stop' event to ALL instruments.
    // This is far more reliable than tracking "active" triggers.
    console.log('[SEQ] Broadcasting transport-stop to all instruments.');
    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        // Ensure the instrument and its logic/event bus exist before trying to send the event
        if (instrument?.logic?.eventBus) {
            try {
                // The BopSynthLogic is designed to listen for this event.
                const stopEvent = new CustomEvent('transport-stop');
                instrument.logic.eventBus.dispatchEvent(stopEvent);
            } catch (e) {
                console.error(`[SEQ] Error sending stop event to instrument ${id}:`, e);
            }
        }
    }

    // 3. Clear the trigger list (can still be useful for other logic, but not as the primary stop mechanism)
    runtimeState.activeInstrumentTriggers.clear();

    // 4. Reset the sequencer's own state. This is correct.
    projectState.isPlaying = false;
    projectState.playMode  = null;
    runtimeState.currentStepIndex = 0;

    // Optional but recommended: Update UI to reflect the stopped state immediately
    // e.g., clearAllPlayingIndicators();
}
/* ─────────────── instrument teardown before reset/load ─────────────── */
export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
    // ...add other audio-related resets as needed
}