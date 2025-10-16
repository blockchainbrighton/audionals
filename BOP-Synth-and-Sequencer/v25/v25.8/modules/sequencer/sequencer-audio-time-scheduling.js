/**
 * Module: audio-time-scheduling-managment.js
 * Purpose: Manages global audio context, transport controls (play, stop, BPM),
 * and the main Tone.Sequence scheduler.
 * Exports: setBPM, startPlayback, stopPlayback, resetAudioEnvironment
 * Depends on: sequencer-state.js, sequencer-sampler-channel-playback.js
 */

import { projectState, runtimeState, getCurrentSequence } from './sequencer-state.js';
import { playSamplerChannel, disposeSamplerVoices } from './sequencer-sampler-playback.js';
import { updateAllChannelGains, disposeAllChannelGains } from './sequencer-channel-mixer.js';

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
    const lastStep = runtimeState.lastStepIndex;
    if (lastStep === -1) {
        runtimeState.sequenceCycle = 0;
    } else if (stepIndex <= lastStep) {
        runtimeState.sequenceCycle += 1;
    }
    runtimeState.lastStepIndex = stepIndex;
    runtimeState.currentStepIndex = stepIndex;
    const currentCycle = runtimeState.sequenceCycle;

    // --- ADD THIS: Dispatch event to UI
    window.dispatchEvent(new CustomEvent('step', { detail: { stepIndex } }));

    const seqData = (projectState.playMode === 'all')
        ? projectState.sequences[runtimeState.currentPlaybackSequenceIndex]
        : getCurrentSequence();
    if (!seqData) return;

    updateAllChannelGains(seqData);
    const soloActive = seqData.channels.some(channel => channel?.solo);

    seqData.channels.forEach((chan, chIdx) => {
        if (!chan.steps[stepIndex]) return;
        if (chan.muted) return;
        if (soloActive && !chan.solo) return;
        const volume = (typeof chan.volume === 'number' && !Number.isNaN(chan.volume)) ? chan.volume : 1;
        if (volume <= 0) return;

        if (chan.type === 'sampler') {
            playSamplerChannel(time, chan);
        } else if (chan.type === 'instrument' && chan.instrumentId) {
            const inst = runtimeState.instrumentRack[chan.instrumentId];
            if (!inst) return;
            const rec = inst.logic?.modules?.recorder;
            if (!rec) return;

            const playbackState = runtimeState.instrumentPlaybackState.get(chan.instrumentId);
            const shouldRetrigger =
                !playbackState ||
                playbackState.stepIndex !== stepIndex ||
                playbackState.cycle !== currentCycle;

            if (!shouldRetrigger) return;

            console.debug('[AUDIO]   ├─ [INST]', chIdx, '→ playInternalSequence', chan.instrumentId, 'cycle', currentCycle, 'step', stepIndex);
            const transportTime = runtimeState.Tone?.Transport?.seconds;
            inst.playInternalSequence({
                transportTime: typeof transportTime === 'number' ? transportTime : undefined,
                audioTime: time,
                stepIndex,
                cycle: currentCycle,
                forceRestart: !!playbackState
            });

            runtimeState.instrumentPlaybackState.set(chan.instrumentId, {
                stepIndex,
                cycle: currentCycle,
                lastTriggerTime: time
            });
        }
    });
}

/* ───────────────────────────── tone.Sequence ─────────────────────────────── */
function getActiveSequence() {
    if (!Array.isArray(projectState.sequences) || !projectState.sequences.length) return null;
    if (projectState.playMode === 'all') {
        return projectState.sequences[runtimeState.currentPlaybackSequenceIndex] ?? null;
    }
    return getCurrentSequence();
}

function getSequenceStepCount(sequence) {
    if (!sequence?.channels?.length) return 64;
    return sequence.channels.reduce((max, chan) => {
        const length = Array.isArray(chan?.steps) ? chan.steps.length : 0;
        return length > max ? length : max;
    }, 0) || 64;
}

function createToneSequence() {
    const activeSequence = getActiveSequence();
    const totalSteps = getSequenceStepCount(activeSequence);
    const stepArray  = [...Array(totalSteps).keys()];

    toneSequence?.dispose();
    toneSequence = new runtimeState.Tone.Sequence((t, i) => {
        scheduleStep(t, i);

        if (projectState.playMode === 'all' && i === totalSteps - 1) {
            const stepDuration = runtimeState.Tone.Time('16n').toSeconds();
            const sequenceDuration = Number((totalSteps * stepDuration).toFixed(6));
            runtimeState.Tone.Transport.scheduleOnce(() => {
                runtimeState.currentPlaybackSequenceIndex =
                    (runtimeState.currentPlaybackSequenceIndex + 1) % projectState.sequences.length;
                createToneSequence();
            }, `+${sequenceDuration}`);
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
    runtimeState.currentStepIndex = 0;
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;
    runtimeState.instrumentPlaybackState.clear();
    createToneSequence();
    updateAllChannelGains(getActiveSequence());
    runtimeState.Tone.Transport.start();
}

export function stopPlayback() {
    const T = runtimeState.Tone;
    if (!T?.Transport) return;

    T.Transport.stop();
    toneSequence?.dispose();
    toneSequence = null;

    console.log('[AUDIO] Broadcasting transport-stop to all instruments.');
    for (const id in runtimeState.instrumentRack) {
        const instrument = runtimeState.instrumentRack[id];
        if (instrument?.logic?.eventBus) {
            try {
                const stopEvent = new CustomEvent('transport-stop');
                instrument.logic.eventBus.dispatchEvent(stopEvent);
            } catch (e) {
                console.error(`[AUDIO] Error sending stop event to instrument ${id}:`, e);
            }
        }
    }

    projectState.isPlaying = false;
    projectState.playMode  = null;
    runtimeState.currentStepIndex = 0;
    runtimeState.instrumentPlaybackState.clear();
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;

    if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('transport-stop'));
    }
}

export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
    disposeSamplerVoices();
    disposeAllChannelGains();
}
