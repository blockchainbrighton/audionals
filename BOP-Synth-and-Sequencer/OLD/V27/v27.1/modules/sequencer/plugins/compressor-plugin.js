const DEFAULT_COMPRESSOR_SETTINGS = Object.freeze({
    enabled: false,
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30
});

export { DEFAULT_COMPRESSOR_SETTINGS };

export function createCompressorPlugin(Tone) {
    const node = new Tone.Compressor({
        threshold: DEFAULT_COMPRESSOR_SETTINGS.threshold,
        ratio: DEFAULT_COMPRESSOR_SETTINGS.ratio,
        attack: DEFAULT_COMPRESSOR_SETTINGS.attack,
        release: DEFAULT_COMPRESSOR_SETTINGS.release,
        knee: DEFAULT_COMPRESSOR_SETTINGS.knee
    });
    return node;
}

export function applyCompressorSettings(node, settings = DEFAULT_COMPRESSOR_SETTINGS) {
    if (!node) return;
    const safe = settings || DEFAULT_COMPRESSOR_SETTINGS;
    const update = {};

    if (typeof safe.threshold === 'number') update.threshold = safe.threshold;
    if (typeof safe.ratio === 'number') update.ratio = safe.ratio;
    if (typeof safe.attack === 'number') update.attack = safe.attack;
    if (typeof safe.release === 'number') update.release = safe.release;

    if (Object.keys(update).length) {
        try {
            node.set(update);
        } catch (err) {
            if (typeof update.threshold === 'number' && node.threshold?.value !== undefined) {
                node.threshold.value = update.threshold;
            }
            if (typeof update.ratio === 'number' && node.ratio?.value !== undefined) {
                node.ratio.value = update.ratio;
            }
            if (typeof update.attack === 'number' && node.attack?.value !== undefined) {
                node.attack.value = update.attack;
            }
            if (typeof update.release === 'number' && node.release?.value !== undefined) {
                node.release.value = update.release;
            }
        }
    }

    if (typeof safe.knee === 'number') {
        if (node.knee?.value !== undefined) {
            node.knee.value = safe.knee;
        } else {
            try {
                node.set({ knee: safe.knee });
            } catch (err) {
                /* ignore */
            }
        }
    }
}
