const DEFAULT_BITCRUSHER_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.1,
    bits: 8
});

export { DEFAULT_BITCRUSHER_SETTINGS };

export function createBitcrusherPlugin(Tone) {
    const BitCrusherClass = Tone?.BitCrusher;
    if (!BitCrusherClass) {
        const gain = new Tone.Gain(1);
        gain.__isBitcrusherFallback = true;
        console.warn('[CHANNEL-BITCRUSHER] Tone.BitCrusher not available. Using passthrough Gain as fallback.');
        return gain;
    }
    const node = new BitCrusherClass({
        wet: DEFAULT_BITCRUSHER_SETTINGS.wet,
        bits: DEFAULT_BITCRUSHER_SETTINGS.bits
    });
    return node;
}

export function applyBitcrusherSettings(node, settings = DEFAULT_BITCRUSHER_SETTINGS) {
    if (!node || node.__isBitcrusherFallback) return;
    const safe = settings || DEFAULT_BITCRUSHER_SETTINGS;
    if (typeof safe.wet === 'number' && node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, safe.wet));
    }
    if (typeof safe.bits === 'number' && node.bits !== undefined) {
        try {
            node.bits = Math.max(1, Math.min(16, Math.round(safe.bits)));
        } catch (err) {
            /* ignore */
        }
    }
}
