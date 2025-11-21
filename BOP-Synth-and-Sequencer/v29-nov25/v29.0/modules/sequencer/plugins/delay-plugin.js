const DEFAULT_DELAY_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.25,
    delayTime: 0.28,
    feedback: 0.4
});

export { DEFAULT_DELAY_SETTINGS };

export function createDelayPlugin(Tone) {
    const DelayClass = Tone?.PingPongDelay || Tone?.FeedbackDelay || null;
    if (!DelayClass) {
        const gain = new Tone.Gain(1);
        gain.__isDelayFallback = true;
        console.warn('[CHANNEL-DELAY] Tone delay node not available. Using passthrough Gain as fallback.');
        return gain;
    }
    const node = new DelayClass({
        wet: DEFAULT_DELAY_SETTINGS.wet,
        delayTime: DEFAULT_DELAY_SETTINGS.delayTime,
        feedback: DEFAULT_DELAY_SETTINGS.feedback
    });
    node.__isPingPongDelay = DelayClass === Tone?.PingPongDelay;
    return node;
}

export function applyDelaySettings(node, settings = DEFAULT_DELAY_SETTINGS) {
    if (!node || node.__isDelayFallback) return;
    const safe = settings || DEFAULT_DELAY_SETTINGS;
    if (typeof safe.wet === 'number' && node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, safe.wet));
    }
    if (typeof safe.delayTime === 'number') {
        const target = Math.max(0.01, Math.min(1.5, safe.delayTime));
        if (node.delayTime?.value !== undefined) {
            node.delayTime.value = target;
        } else if (typeof node.setDelayTime === 'function') {
            node.setDelayTime(target);
        }
    }
    if (typeof safe.feedback === 'number' && node.feedback?.value !== undefined) {
        node.feedback.value = Math.min(0.95, Math.max(0, safe.feedback));
    }
}
