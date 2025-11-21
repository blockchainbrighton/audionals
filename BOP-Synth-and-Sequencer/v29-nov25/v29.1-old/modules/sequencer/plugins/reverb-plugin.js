const DEFAULT_REVERB_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.3,
    decay: 3.2,
    preDelay: 0.025
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
    if (typeof safe.wet === 'number' && node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, safe.wet));
    }
    if (typeof safe.decay === 'number' && node.decay !== undefined) {
        try {
            node.decay = Math.max(0.1, Math.min(20, safe.decay));
        } catch (err) {
            /* ignore */
        }
    }
    if (typeof safe.preDelay === 'number' && node.preDelay !== undefined) {
        try {
            node.preDelay = Math.max(0, Math.min(1, safe.preDelay));
        } catch (err) {
            /* ignore */
        }
    }
}
