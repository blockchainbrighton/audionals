const DEFAULT_PHASER_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.15,
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 350
});

export { DEFAULT_PHASER_SETTINGS };

export function createPhaserPlugin(Tone) {
    const PhaserClass = Tone?.Phaser;
    if (!PhaserClass) {
        const gain = new Tone.Gain(1);
        gain.__isPhaserFallback = true;
        console.warn('[CHANNEL-PHASER] Tone.Phaser not available. Using passthrough Gain as fallback.');
        return gain;
    }
    const node = new PhaserClass({
        wet: DEFAULT_PHASER_SETTINGS.wet,
        frequency: DEFAULT_PHASER_SETTINGS.frequency,
        octaves: DEFAULT_PHASER_SETTINGS.octaves,
        baseFrequency: DEFAULT_PHASER_SETTINGS.baseFrequency
    });
    return node;
}

export function applyPhaserSettings(node, settings = DEFAULT_PHASER_SETTINGS) {
    if (!node || node.__isPhaserFallback) return;
    const safe = settings || DEFAULT_PHASER_SETTINGS;
    if (typeof safe.wet === 'number' && node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, safe.wet));
    }
    if (typeof safe.frequency === 'number' && node.frequency?.value !== undefined) {
        node.frequency.value = Math.max(0.1, Math.min(10, safe.frequency));
    }
    if (typeof safe.octaves === 'number' && node.octaves !== undefined) {
        try {
            node.octaves = Math.max(0.5, Math.min(10, safe.octaves));
        } catch (err) {
            /* ignore */
        }
    }
    if (typeof safe.baseFrequency === 'number' && node.baseFrequency !== undefined) {
        try {
            node.baseFrequency = Math.max(20, Math.min(8000, safe.baseFrequency));
        } catch (err) {
            /* ignore */
        }
    }
}
