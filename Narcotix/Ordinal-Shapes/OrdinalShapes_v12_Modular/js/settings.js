// scripts/settings.js
export const SETTING_ABBREVIATIONS = {
    speed: 'sp',
    offset: 'of',
    frequency: 'fr',
    tailLength: 'tl',
    noiseLevel: 'nl',
    timeSpeed: 'ts'
};

export const ABBREV_TO_SETTING = Object.fromEntries(
    Object.entries(SETTING_ABBREVIATIONS).map(([k, v]) => [v, k])
);

// Serialized Phases using Abbreviations
export const serializedPhases = [
    { a: 'of', t: 'set', v: 50 },
    { a: 'sp', t: 'inc', s: 0.1, tgt: 10 },
    { a: 'tl', t: 'inc', s: 1, tgt: 10 },
    { a: 'sp', t: 'dec', s: 0.1, tgt: 1 },
    { a: 'nl', t: 'inc', s: 0.1, tgt: 5 },
    { a: 'tl', t: 'inc', s: 1, tgt: 20 },
    { a: 'sp', t: 'inc', s: 0.1, tgt: 2.0 },
    { a: 'tl', t: 'inc', s: 2, tgt: 100 },
    { a: 'nl', t: 'inc', s: 1, tgt: 10 },
    { a: 'tl', t: 'inc', s: 2, tgt: 200 },
    { a: 'nl', t: 'dec', s: 0.1, tgt: 5 },
    { a: 'of', t: 'dec', s: 5, tgt: 10 },
    { a: 'nl', t: 'inc', s: 1, tgt: 5 },
    { a: 'tl', t: 'inc', s: 5, tgt: 400 },
    { a: 'of', t: 'inc', s: 2, tgt: 50 },
    { a: 'nl', t: 'dec', s: 0.1, tgt: 0 },
    { a: 'of', t: 'dec', s: 1, tgt: 5 },
    { a: 'nl', t: 'inc', s: 0.1, tgt: 2.5 },
    { a: 'tl', t: 'inc', s: 5, tgt: 750 },
    { a: 'nl', t: 'inc', s: 0.1, tgt: 10 },
    { a: 'of', t: 'dec', s: 0.1, tgt: 0 },
    { a: 'tl', t: 'inc', s: 5, tgt: 1000 },
    { a: 'of', t: 'dec', s: 0.1, tgt: 0 },
    { a: 'sp', t: 'inc', s: 0.1, tgt: 5.0 },
];