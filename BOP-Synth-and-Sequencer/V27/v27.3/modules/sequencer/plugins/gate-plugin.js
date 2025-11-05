const DEFAULT_GATE_SETTINGS = Object.freeze({
    enabled: false,
    threshold: -50,
    attack: 0.01,
    release: 0.12,
    hold: 0.05
});

export { DEFAULT_GATE_SETTINGS };

export function createGatePlugin(Tone) {
    const GateClass = Tone.Gate || Tone.NoiseGate || null;
    if (GateClass) {
        return new GateClass({
            threshold: DEFAULT_GATE_SETTINGS.threshold,
            attack: DEFAULT_GATE_SETTINGS.attack,
            release: DEFAULT_GATE_SETTINGS.release,
            hold: DEFAULT_GATE_SETTINGS.hold
        });
    }

    const gain = new Tone.Gain(1);
    gain.__isGateFallback = true;
    console.warn('[CHANNEL-GATE] Tone.Gate not available. Using passthrough Gain as fallback. Gate parameters will have no effect.');
    return gain;
}

export function applyGateSettings(node, settings = DEFAULT_GATE_SETTINGS) {
    if (!node) return;
    const safe = settings || DEFAULT_GATE_SETTINGS;
    if (node.__isGateFallback) return;
    const update = {};
    if (typeof safe.threshold === 'number') update.threshold = safe.threshold;
    if (typeof safe.attack === 'number') update.attack = safe.attack;
    if (typeof safe.release === 'number') update.release = safe.release;
    if (typeof safe.hold === 'number') update.hold = safe.hold;

    if (Object.keys(update).length) {
        try {
            node.set(update);
        } catch (err) {
            if (node.threshold?.value !== undefined && typeof update.threshold === 'number') {
                node.threshold.value = update.threshold;
            }
            if (node.attack?.value !== undefined && typeof update.attack === 'number') {
                node.attack.value = update.attack;
            }
            if (node.release?.value !== undefined && typeof update.release === 'number') {
                node.release.value = update.release;
            }
            if (node.hold?.value !== undefined && typeof update.hold === 'number') {
                node.hold.value = update.hold;
            }
        }
    }
}
