import { normalizeInsertQuality, DELAY_QUALITY_PROFILES } from './insert-quality.js';

const DEFAULT_DELAY_SETTINGS = Object.freeze({
    enabled: false,
    wet: 0.25,
    delayTime: 0.28,
    feedback: 0.4,
    quality: 'normal'
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
    const qualityKey = normalizeInsertQuality(safe.quality);
    const profile = DELAY_QUALITY_PROFILES[qualityKey] || {};
    const wet = typeof safe.wet === 'number' ? safe.wet : DEFAULT_DELAY_SETTINGS.wet;
    if (node.wet?.value !== undefined) {
        node.wet.value = Math.min(1, Math.max(0, wet));
    }
    const delayTime = typeof safe.delayTime === 'number'
        ? safe.delayTime
        : (typeof profile.delayTime === 'number' ? profile.delayTime : DEFAULT_DELAY_SETTINGS.delayTime);
    const targetDelay = Math.max(0.01, Math.min(1.5, delayTime));
    if (node.delayTime?.value !== undefined) {
        node.delayTime.value = targetDelay;
    } else if (typeof node.setDelayTime === 'function') {
        node.setDelayTime(targetDelay);
    }
    const feedback = typeof safe.feedback === 'number'
        ? safe.feedback
        : (typeof profile.feedback === 'number' ? profile.feedback : DEFAULT_DELAY_SETTINGS.feedback);
    if (node.feedback?.value !== undefined) {
        node.feedback.value = Math.min(0.95, Math.max(0, feedback));
    }
}
