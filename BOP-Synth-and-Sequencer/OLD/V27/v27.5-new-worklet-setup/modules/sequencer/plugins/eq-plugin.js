const DEFAULT_EQ_SETTINGS = Object.freeze({
    enabled: false,
    lowGain: 0,
    midGain: 0,
    highGain: 0,
    lowFrequency: 400,
    highFrequency: 2500
});

export { DEFAULT_EQ_SETTINGS };

export function createEqPlugin(Tone) {
    const node = new Tone.EQ3({
        low: DEFAULT_EQ_SETTINGS.lowGain,
        mid: DEFAULT_EQ_SETTINGS.midGain,
        high: DEFAULT_EQ_SETTINGS.highGain,
        lowFrequency: DEFAULT_EQ_SETTINGS.lowFrequency,
        highFrequency: DEFAULT_EQ_SETTINGS.highFrequency
    });
    return node;
}

export function applyEqSettings(node, settings = DEFAULT_EQ_SETTINGS) {
    if (!node) return;
    const safe = settings || DEFAULT_EQ_SETTINGS;
    if (typeof safe.lowGain === 'number') node.low.value = safe.lowGain;
    if (typeof safe.midGain === 'number') node.mid.value = safe.midGain;
    if (typeof safe.highGain === 'number') node.high.value = safe.highGain;
    if (typeof safe.lowFrequency === 'number') node.lowFrequency.value = safe.lowFrequency;
    if (typeof safe.highFrequency === 'number') node.highFrequency.value = safe.highFrequency;
}
