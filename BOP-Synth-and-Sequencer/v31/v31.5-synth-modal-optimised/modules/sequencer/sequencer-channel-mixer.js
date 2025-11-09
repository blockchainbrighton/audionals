import { runtimeState, ensureChannelMixDefaults, getCurrentSequence } from './sequencer-state.js';
import { scheduleSamplerVoiceDisposal } from './sequencer-sampler-playback.js';

function clampVolume(volume) {
    if (typeof volume !== 'number' || Number.isNaN(volume)) return 1;
    return Math.min(1, Math.max(0, volume));
}

function getDestinationNode(Tone) {
    if (!Tone) return null;
    if (typeof Tone.getDestination === 'function') return Tone.getDestination();
    return Tone.Destination ?? null;
}

export function ensureChannelGain(channel) {
    ensureChannelMixDefaults(channel);
    const Tone = runtimeState.Tone;
    if (!Tone) return null;

    let gain = runtimeState.channelGainNodes.get(channel);
    if (!gain) {
        gain = new Tone.Gain(clampVolume(channel.volume));
        const destination = getDestinationNode(Tone);
        if (destination) gain.connect(destination);
        runtimeState.channelGainNodes.set(channel, gain);
    }
    return gain;
}

function stopVoiceEntry(entry) {
    if (!entry) return;
    try { entry.player?.stop?.(); } catch (err) { /* ignore */ }
    try { entry.ampEnv?.cancel?.(); } catch (err) { /* ignore */ }
    try { entry.ampEnv?.triggerRelease?.(); } catch (err) { /* ignore */ }
    entry.isPlaying = false;
    entry.busyUntil = 0;
}

function silenceSamplerChannel(channel) {
    const voice = runtimeState.samplerVoices.get(channel);
    if (!voice) return;
    if (Array.isArray(voice.voices)) {
        voice.voices.forEach(stopVoiceEntry);
    } else {
        stopVoiceEntry(voice);
    }
    if (typeof window !== 'undefined' && window?.dispatchEvent) {
        try {
            window.dispatchEvent(new CustomEvent('sampler-playback-stop', {
                detail: { channel }
            }));
        } catch (err) {
            console.warn('[MIXER] Failed to dispatch sampler-playback-stop event:', err);
        }
    }
}

function silenceInstrumentChannel(channel) {
    if (!channel?.instrumentId) return;
    const instrument = runtimeState.instrumentRack[channel.instrumentId];
    if (!instrument) return;
    const logic = instrument.logic;
    try { logic?.modules?.synthEngine?.releaseAll?.(); } catch (err) { /* ignore */ }
    try {
        const recorder = logic?.modules?.recorder;
        if (recorder?.abortCurrentPlayback) {
            recorder.abortCurrentPlayback({
                dispatchRelease: true,
                emitStatus: false,
                resetTransport: false,
                notifyRelease: false
            });
        }
    } catch (err) {
        console.warn('[MIXER] Failed to abort instrument playback cleanly:', err);
    }
    try {
        runtimeState.instrumentPlaybackState.delete(channel.instrumentId);
    } catch (err) { /* ignore */ }
}

export function forceChannelSilence(channel) {
    if (!channel) return;
    ensureChannelMixDefaults(channel);
    if (channel.type === 'sampler') {
        silenceSamplerChannel(channel);
        scheduleSamplerVoiceDisposal(channel);
    } else if (channel.type === 'instrument') {
        silenceInstrumentChannel(channel);
    }
}

export function disposeChannelGain(channel) {
    const gain = runtimeState.channelGainNodes.get(channel);
    if (!gain) return;
    try { gain.disconnect(); } catch (err) { /* ignore */ }
    try { gain.dispose?.(); } catch (err) { console.warn('[MIXER] Failed to dispose gain node:', err); }
    runtimeState.channelGainNodes.delete(channel);
}

export function disposeAllChannelGains() {
    runtimeState.channelGainNodes.forEach(gain => {
        try { gain.disconnect(); } catch (err) { /* ignore */ }
        try { gain.dispose?.(); } catch (err) { console.warn('[MIXER] Failed to dispose gain node:', err); }
    });
    runtimeState.channelGainNodes.clear();
}

function computeTargetGain(channel, soloActive) {
    ensureChannelMixDefaults(channel);
    if (channel.muted) return 0;
    if (soloActive && !channel.solo) return 0;
    return clampVolume(channel.volume);
}

export function updateChannelGain(channel, sequence = getCurrentSequence()) {
    if (!sequence?.channels) return;
    const soloActive = sequence.channels.some(ch => ch?.solo);
    const gain = ensureChannelGain(channel);
    if (!gain) return;
    const target = computeTargetGain(channel, soloActive);
    const prevValue = gain.gain.value;
    if (prevValue !== target) {
        gain.gain.value = target;
        if (target === 0 && prevValue > 0) forceChannelSilence(channel);
    }
}

export function updateAllChannelGains(sequence = getCurrentSequence()) {
    if (!sequence?.channels) return;
    const soloActive = sequence.channels.some(ch => ch?.solo);
    sequence.channels.forEach(channel => {
        const gain = ensureChannelGain(channel);
        if (!gain) return;
        const target = computeTargetGain(channel, soloActive);
        const prevValue = gain.gain.value;
        if (prevValue !== target) {
            gain.gain.value = target;
            if (target === 0 && prevValue > 0) forceChannelSilence(channel);
        }
    });
}

export function isChannelAudible(channel, sequence = getCurrentSequence()) {
    ensureChannelMixDefaults(channel);
    if (!sequence?.channels) return !channel.muted;
    const soloActive = sequence.channels.some(ch => ch?.solo);
    if (channel.muted) return false;
    if (soloActive && !channel.solo) return false;
    return clampVolume(channel.volume) > 0;
}
