const DEFAULT_CHORUS_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.2,
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.45,
    spread: 90
});

export { DEFAULT_CHORUS_SETTINGS };

export function createChorusPlugin(Tone) {
    const ChorusClass = Tone?.Chorus;
    if (!ChorusClass) {
        const gain = new Tone.Gain(1);
        gain.__isChorusFallback = true;
        console.warn('[CHANNEL-CHORUS] Tone.Chorus not available. Using passthrough Gain as fallback.');
        return gain;
    }
    const node = new ChorusClass({
        wet: DEFAULT_CHORUS_SETTINGS.wet,
        frequency: DEFAULT_CHORUS_SETTINGS.frequency,
        delayTime: DEFAULT_CHORUS_SETTINGS.delayTime,
        depth: DEFAULT_CHORUS_SETTINGS.depth,
        spread: DEFAULT_CHORUS_SETTINGS.spread
    });
    node.start?.();
    return node;
}

export function applyChorusSettings(node, settings = DEFAULT_CHORUS_SETTINGS) {
    if (!node || node.__isChorusFallback) return;
    const safe = settings || DEFAULT_CHORUS_SETTINGS;
    if (typeof safe.wet === 'number' && node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, safe.wet));
    }
    if (typeof safe.frequency === 'number' && node.frequency?.value !== undefined) {
        node.frequency.value = Math.max(0.1, Math.min(10, safe.frequency));
    }
    if (typeof safe.delayTime === 'number' && node.delayTime !== undefined) {
        try {
            node.delayTime = Math.max(1, Math.min(20, safe.delayTime));
        } catch (err) {
            /* ignore */
        }
    }
    if (typeof safe.depth === 'number' && node.depth !== undefined) {
        try {
            node.depth = Math.max(0, Math.min(1, safe.depth));
        } catch (err) {
            /* ignore */
        }
    }
    if (typeof safe.spread === 'number' && node.spread !== undefined) {
        try {
            node.spread = Math.max(0, Math.min(180, safe.spread));
        } catch (err) {
            /* ignore */
        }
    }
}
