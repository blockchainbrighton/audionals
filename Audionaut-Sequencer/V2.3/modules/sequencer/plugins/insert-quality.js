const INSERT_QUALITY_OPTIONS = Object.freeze([
    { value: 'eco', label: 'Eco (light CPU)' },
    { value: 'normal', label: 'Normal' },
    { value: 'lush', label: 'Lush (rich tail)' }
]);

export function getInsertQualityOptions() {
    return INSERT_QUALITY_OPTIONS.slice();
}

export function normalizeInsertQuality(value) {
    if (!value) return 'normal';
    const match = INSERT_QUALITY_OPTIONS.find(opt => opt.value === value);
    return match ? match.value : 'normal';
}

export const REVERB_QUALITY_PROFILES = Object.freeze({
    eco:   { wet: 1, decay: 2.8, preDelay: 0.012 },
    normal:{ wet: 1, decay: 4.8, preDelay: 0.02 },
    lush:  { wet: 1, decay: 6.8, preDelay: 0.032 }
});

export const DELAY_QUALITY_PROFILES = Object.freeze({
    eco:   { wet: 1, delayTime: 0.22, feedback: 0.32 },
    normal:{ wet: 1, delayTime: 0.42, feedback: 0.48 },
    lush:  { wet: 1, delayTime: 0.62, feedback: 0.6 }
});

export function inferReverbQualityFromSettings(settings = {}) {
    const decay = typeof settings.decay === 'number' ? settings.decay : 4;
    if (decay <= 3.5) return 'eco';
    if (decay <= 6) return 'normal';
    return 'lush';
}

export function inferDelayQualityFromSettings(settings = {}) {
    const time = typeof settings.delayTime === 'number' ? settings.delayTime : 0.4;
    if (time <= 0.3) return 'eco';
    if (time <= 0.55) return 'normal';
    return 'lush';
}
