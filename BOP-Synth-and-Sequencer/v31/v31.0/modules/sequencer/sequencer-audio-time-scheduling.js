/**
 * Module: audio-time-scheduling-management.js
 * Purpose: Manages global audio context, transport controls (play, stop, BPM),
 * and bridges the UI state with the AudioWorklet-based scheduler.
 * Exports: setBPM, startPlayback, stopPlayback, resetAudioEnvironment,
 *          requestSchedulerResync
 */

import { projectState, runtimeState, getCurrentSequence, pruneInactiveSampleCaches } from './sequencer-state.js';
import { disposeSamplerVoices } from './sequencer-sampler-playback.js';
import { updateAllChannelGains, disposeAllChannelGains } from './sequencer-channel-mixer.js';
import { schedulerHost, TRANSPORT_START_DELAY } from './sequencer-scheduler-host.js';
import { disposeAuxBuses } from './sequencer-aux-bus.js';
import { resetInstrumentLiveState } from './instrument-live-controller.js';
import { pruneIdleInsertChains } from './plugins/channel-insert-manager.js';

const INSTRUMENT_WARMUP_SETTLE_MS = 30;

function delay(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRawAudioContext() {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;
    const ctxCandidate = typeof Tone.getContext === 'function' ? Tone.getContext() : Tone.context;
    return ctxCandidate?.rawContext || ctxCandidate?._nativeAudioContext || ctxCandidate || null;
}

async function resumeToneContextIfNeeded() {
    const ctx = getRawAudioContext();
    if (!ctx || ctx.state === 'running') return;
    if (typeof ctx.resume === 'function') {
        try {
            await ctx.resume();
        } catch (err) {
            console.warn('[AUDIO] Failed to resume audio context before playback start:', err);
        }
    }
}

async function warmupRegisteredInstruments() {
    if (!runtimeState.instrumentRack) return;
    let warmed = false;
    Object.values(runtimeState.instrumentRack).forEach(instrument => {
        const logic = instrument?.logic;
        if (!logic) return;
        const warmupFn = typeof logic.warmupAudioEngine === 'function'
            ? () => logic.warmupAudioEngine()
            : (typeof logic.modules?.synthEngine?.warmup === 'function'
                ? () => logic.modules.synthEngine.warmup()
                : null);
        if (!warmupFn) return;
        try {
            warmupFn();
            instrument.lastWarmupTime = Date.now();
            warmed = true;
        } catch (err) {
            console.warn('[AUDIO] Instrument warmup failed:', err);
        }
    });
    if (warmed) {
        await delay(INSTRUMENT_WARMUP_SETTLE_MS);
    }
}

/* ──────────────── Dispose/cleanup for audio nodes ──────────────── */
function disposeAllInstrumentNodes() {
    if (!runtimeState.instrumentRack) return;
    for (const id in runtimeState.instrumentRack) {
        const logic = runtimeState.instrumentRack[id]?.logic;
        if (!logic) continue;
        try {
            if (typeof logic.destroy === 'function') {
                logic.destroy();
            } else if (logic.modules?.synthEngine?.dispose) {
                logic.modules.synthEngine.dispose();
            }
        } catch (e) {
            console.warn(`[AUDIO][DEBUG] Could not dispose instrument ${id}:`, e);
        }
    }
    runtimeState.instrumentRack = {};
    resetInstrumentLiveState();
}

/* ─────────────── sequence helpers ─────────────── */
function getActiveSequence() {
    if (!Array.isArray(projectState.sequences) || !projectState.sequences.length) return null;
    if (projectState.playMode === 'all') {
        return projectState.sequences[runtimeState.currentPlaybackSequenceIndex] ?? null;
    }
    return getCurrentSequence();
}

let sequenceAdvanceTimer = null;

function clearSequenceAdvanceTimer() {
    if (sequenceAdvanceTimer) {
        clearTimeout(sequenceAdvanceTimer);
        sequenceAdvanceTimer = null;
    }
}

function advanceToNextSequence(detail = null) {
    const sequenceCount = projectState.sequences.length;
    if (!sequenceCount) return;

    runtimeState.currentPlaybackSequenceIndex =
        (runtimeState.currentPlaybackSequenceIndex + 1) % sequenceCount;
    projectState.currentSequenceIndex = runtimeState.currentPlaybackSequenceIndex;

    runtimeState.currentStepIndex = 0;
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;
    runtimeState.instrumentPlaybackState.clear();

    const nextSequence = getActiveSequence();
    if (nextSequence) updateAllChannelGains(nextSequence);

    if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sequence-playback-changed', {
            detail: { index: runtimeState.currentPlaybackSequenceIndex, scheduledTime: detail?.scheduledTime ?? null }
        }));
    }

    schedulerHost.requestResync();
}

function scheduleSequenceAdvance(detail) {
    if (projectState.playMode !== 'all') return;
    clearSequenceAdvanceTimer();
    const ctx = schedulerHost.context;
    if (!ctx || !Number.isFinite(detail?.scheduledTime)) {
        advanceToNextSequence(detail);
        return;
    }
    const now = ctx.currentTime;
    const leadSeconds = detail.scheduledTime - now - 0.01; // aim slightly early
    const delayMs = Math.max(0, leadSeconds * 1000);
    if (delayMs <= 0) {
        advanceToNextSequence(detail);
    } else {
        sequenceAdvanceTimer = setTimeout(() => {
            sequenceAdvanceTimer = null;
            advanceToNextSequence(detail);
        }, delayMs);
    }
}

schedulerHost.onSequenceAdvance = scheduleSequenceAdvance;

/* ─────────────────────────────── BPM ─────────────────────────────── */
export function setBPM(newBpm) {
    projectState.bpm = newBpm;
    const transport = runtimeState.Tone?.Transport;
    if (transport) transport.bpm.value = newBpm;
    if (schedulerHost.node) {
        schedulerHost.updateTempo(newBpm);
    } else {
        schedulerHost.ensureReady().then(() => schedulerHost.updateTempo(newBpm)).catch(() => {});
    }
}

/* ────────────── public transport helpers ────────────── */
export async function startPlayback(mode) {
    if (!runtimeState.isToneStarted) {
        await runtimeState.Tone.start();
        runtimeState.isToneStarted = true;
    }
    await resumeToneContextIfNeeded();
    await warmupRegisteredInstruments();
    projectState.isPlaying = true;
    projectState.playMode  = mode;

    if (mode === 'all') {
        runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;
        projectState.currentSequenceIndex = runtimeState.currentPlaybackSequenceIndex;
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('sequence-playback-changed', {
                detail: { index: runtimeState.currentPlaybackSequenceIndex }
            }));
        }
    } else {
        runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;
    }

    runtimeState.currentStepIndex = 0;
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;
    runtimeState.instrumentPlaybackState.clear();

    const Transport = runtimeState.Tone?.Transport;
    if (Transport) {
        try {
            if (Transport.state !== 'stopped') {
                Transport.stop();
            }
            Transport.position = 0;
        } catch (err) {
            console.warn('[AUDIO] Unable to reset Tone.Transport position before start:', err);
        }
    }

    const startTime = await schedulerHost.start(mode);
    setBPM(projectState.bpm);

    const activeSequence = getActiveSequence();
    if (activeSequence) updateAllChannelGains(activeSequence);

    if (Transport) {
        try {
            Transport.start(startTime);
        } catch (err) {
            console.warn('[AUDIO] Failed to start Tone.Transport at absolute time; falling back to relative delay:', err);
            try {
                Transport.start(`+${TRANSPORT_START_DELAY}`);
            } catch (fallbackErr) {
                console.warn('[AUDIO] Tone.Transport failed to start with fallback delay:', fallbackErr);
                Transport.start();
            }
        }
    }

    return startTime;
}

export function stopPlayback() {
    const T = runtimeState.Tone;
    if (T?.Transport) {
        T.Transport.stop();
    }

    schedulerHost.stop();
    clearSequenceAdvanceTimer();

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
    Object.values(runtimeState.instrumentRack).forEach(instrument => {
        try {
            instrument?.logic?.modules?.recorder?.flushCompletedTakes?.();
        } catch (err) {
            console.warn('[AUDIO] Failed to flush recorder after stop:', err);
        }
    });

    projectState.isPlaying = false;
    projectState.playMode  = null;
    runtimeState.currentStepIndex = 0;
    runtimeState.instrumentPlaybackState.clear();
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;
    runtimeState.currentPlaybackSequenceIndex = projectState.currentSequenceIndex;

    if (typeof window !== 'undefined' && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('transport-stop'));
    }

    pruneInactiveSampleCaches();
    pruneIdleInsertChains();
}

export function requestSchedulerResync() {
    if (!projectState.isPlaying) return;
    schedulerHost.requestResync();
}

export function resetAudioEnvironment() {
    disposeAllInstrumentNodes();
    disposeSamplerVoices();
    disposeAllChannelGains();
    disposeAuxBuses();
    clearSequenceAdvanceTimer();
    schedulerHost.stop();
}
