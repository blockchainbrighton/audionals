import { normalizeInsertQuality, REVERB_QUALITY_PROFILES } from './insert-quality.js';

const DEFAULT_REVERB_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.3,
    decay: 3.2,
    preDelay: 0.025,
    quality: 'normal'
});

export { DEFAULT_REVERB_SETTINGS };

export function createReverbPlugin(Tone) {
    const ReverbClass = Tone?.Reverb;
    if (!ReverbClass) {
        const gain = new Tone.Gain(1);
        gain.__isReverbFallback = true;
        console.warn('[CHANNEL-REVERB] Tone.Reverb not available. Using passthrough Gain as fallback.');
        return gain;
    }
    const node = new ReverbClass({
        wet: DEFAULT_REVERB_SETTINGS.wet,
        decay: DEFAULT_REVERB_SETTINGS.decay,
        preDelay: DEFAULT_REVERB_SETTINGS.preDelay
    });
    try {
        node.generate?.();
    } catch (err) {
        // Tone.Reverb.generate can throw if called before the AudioContext is ready; ignore.
    }
    return node;
}

export function applyReverbSettings(node, settings = DEFAULT_REVERB_SETTINGS) {
    if (!node || node.__isReverbFallback) return;
    const safe = settings || DEFAULT_REVERB_SETTINGS;
    const qualityKey = normalizeInsertQuality(safe.quality);
    const profile = REVERB_QUALITY_PROFILES[qualityKey] || {};
    const wet = typeof safe.wet === 'number' ? safe.wet : DEFAULT_REVERB_SETTINGS.wet;
    if (node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, wet));
    }
    const decay = typeof safe.decay === 'number'
        ? safe.decay
        : (typeof profile.decay === 'number' ? profile.decay : DEFAULT_REVERB_SETTINGS.decay);
    if (node.decay !== undefined) {
        try { node.decay = Math.max(0.1, Math.min(20, decay)); } catch (err) { /* ignore */ }
    }
    const preDelay = typeof safe.preDelay === 'number'
        ? safe.preDelay
        : (typeof profile.preDelay === 'number' ? profile.preDelay : DEFAULT_REVERB_SETTINGS.preDelay);
    if (node.preDelay !== undefined) {
        try { node.preDelay = Math.max(0, Math.min(1, preDelay)); } catch (err) { /* ignore */ }
    }
}
