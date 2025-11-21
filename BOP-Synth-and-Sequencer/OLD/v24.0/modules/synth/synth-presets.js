/**
 * @file synth-presets.js
 * @description Curated preset bank and random patch generator for the BOP synth.
 */

const BASE_PATCH = Object.freeze({
    'master.volume': 0.7,
    'limiter.threshold': -3,
    'oscillator.type': 'sawtooth',
    'oscillator.detune': 0,
    'envelope.attack': 0.01,
    'envelope.decay': 0.1,
    'envelope.sustain': 0.7,
    'envelope.release': 0.3,
    'filter.frequency': 5000,
    'filter.Q': 1,
    'filter.type': 'lowpass',
    'reverb.wet': 0,
    'reverb.decay': 2,
    'reverb.preDelay': 0,
    'delay.wet': 0,
    'delay.delayTime': 0.25,
    'delay.feedback': 0.3,
    'chorus.wet': 0,
    'chorus.frequency': 1.5,
    'chorus.delayTime': 3.5,
    'chorus.depth': 0.7,
    'distortion.wet': 0,
    'distortion.distortion': 0.4,
    'distortion.oversample': 'none',
    'phaser.wet': 0,
    'phaser.frequency': 0.5,
    'phaser.octaves': 3,
    'phaser.baseFrequency': 350,
    'tremolo.wet': 0,
    'tremolo.frequency': 10,
    'tremolo.depth': 0.5,
    'vibrato.wet': 0,
    'vibrato.frequency': 5,
    'vibrato.depth': 0.1,
    'compressor.threshold': -24,
    'compressor.ratio': 12,
    'compressor.attack': 0.003,
    'compressor.release': 0.25,
    'compressor.knee': 30,
    'bitCrusher.bits': 4,
    'filterLFO.frequency': 0.5,
    'filterLFO.depth': 0.5,
    'filterLFO.min': 200,
    'filterLFO.max': 2000,
    'phaserLFO.frequency': 0.3,
    'phaserLFO.depth': 0.5,
    'tremoloLFO.frequency': 4,
    'tremoloLFO.depth': 0.3,
    'vibratoLFO.frequency': 6,
    'vibratoLFO.depth': 0.02
});

const preset = (id, name, overrides) => ({
    id,
    name,
    values: Object.assign({}, BASE_PATCH, overrides)
});

export const PRESET_BANK = [
    preset('glass-gardens', 'Glass Gardens', {
        'oscillator.type': 'triangle',
        'envelope.attack': 0.18,
        'envelope.decay': 1.1,
        'envelope.sustain': 0.82,
        'envelope.release': 2.6,
        'filter.frequency': 6400,
        'chorus.wet': 0.36,
        'chorus.depth': 0.62,
        'reverb.wet': 0.55,
        'reverb.decay': 6.5,
        'delay.wet': 0.22,
        'delay.delayTime': 0.38,
        'vibrato.wet': 0.22,
        'vibrato.depth': 0.16
    }),
    preset('copper-lead', 'Copper Lead', {
        'master.volume': 0.68,
        'oscillator.type': 'square',
        'oscillator.detune': 4,
        'envelope.attack': 0.005,
        'envelope.decay': 0.22,
        'envelope.sustain': 0.55,
        'envelope.release': 0.4,
        'filter.frequency': 7200,
        'filter.Q': 0.9,
        'distortion.wet': 0.48,
        'distortion.distortion': 0.62,
        'distortion.oversample': '2x',
        'delay.wet': 0.12,
        'delay.feedback': 0.28,
        'phaser.wet': 0.18,
        'phaser.frequency': 0.8
    }),
    preset('moon-pad', 'Moon Pad', {
        'oscillator.type': 'sine',
        'envelope.attack': 0.45,
        'envelope.decay': 1.4,
        'envelope.sustain': 0.88,
        'envelope.release': 3.8,
        'filter.frequency': 4200,
        'filter.Q': 1.6,
        'reverb.wet': 0.68,
        'reverb.decay': 7.5,
        'chorus.wet': 0.32,
        'chorus.depth': 0.58,
        'tremolo.wet': 0.22,
        'tremolo.frequency': 7,
        'vibrato.wet': 0.34,
        'vibrato.depth': 0.22
    }),
    preset('steeldust-pluck', 'Steeldust Pluck', {
        'oscillator.type': 'sawtooth',
        'envelope.attack': 0.004,
        'envelope.decay': 0.18,
        'envelope.sustain': 0.3,
        'envelope.release': 0.22,
        'filter.frequency': 5400,
        'filter.Q': 1.1,
        'delay.wet': 0.28,
        'delay.delayTime': 0.24,
        'delay.feedback': 0.42,
        'bitCrusher.bits': 6,
        'phaser.wet': 0.21,
        'phaser.frequency': 1.4,
        'phaser.octaves': 4
    }),
    preset('noir-keys', 'Noir Keys', {
        'oscillator.type': 'triangle',
        'envelope.attack': 0.03,
        'envelope.decay': 0.55,
        'envelope.sustain': 0.74,
        'envelope.release': 1.1,
        'filter.frequency': 3100,
        'filter.Q': 1.8,
        'filter.type': 'bandpass',
        'chorus.wet': 0.18,
        'reverb.wet': 0.42,
        'reverb.decay': 4.2,
        'delay.wet': 0.14,
        'delay.delayTime': 0.46,
        'vibrato.wet': 0.2,
        'vibrato.depth': 0.14
    }),
    preset('solar-winds', 'Solar Winds', {
        'oscillator.type': 'fatsawtooth',
        'oscillator.detune': 8,
        'envelope.attack': 0.22,
        'envelope.decay': 1.8,
        'envelope.sustain': 0.92,
        'envelope.release': 3.2,
        'filter.frequency': 3600,
        'filter.Q': 1.4,
        'chorus.wet': 0.44,
        'chorus.depth': 0.76,
        'reverb.wet': 0.63,
        'reverb.decay': 8.1,
        'delay.wet': 0.24,
        'delay.delayTime': 0.52,
        'tremolo.wet': 0.26,
        'tremolo.depth': 0.44
    }),
    preset('hyperwave', 'Hyperwave', {
        'master.volume': 0.72,
        'oscillator.type': 'fatsquare',
        'oscillator.detune': 12,
        'envelope.attack': 0.02,
        'envelope.decay': 0.4,
        'envelope.sustain': 0.68,
        'envelope.release': 0.9,
        'filter.frequency': 6100,
        'filter.type': 'highpass',
        'distortion.wet': 0.38,
        'distortion.distortion': 0.55,
        'phaser.wet': 0.32,
        'phaser.frequency': 0.9,
        'phaser.octaves': 5,
        'tremolo.wet': 0.18,
        'tremolo.frequency': 11,
        'delay.wet': 0.19
    }),
    preset('deep-diver', 'Deep Diver', {
        'master.volume': 0.64,
        'oscillator.type': 'sine',
        'envelope.attack': 0.06,
        'envelope.decay': 0.9,
        'envelope.sustain': 0.8,
        'envelope.release': 2.3,
        'filter.frequency': 950,
        'filter.Q': 2.4,
        'filter.type': 'lowpass',
        'chorus.wet': 0.28,
        'reverb.wet': 0.5,
        'delay.wet': 0.12,
        'delay.delayTime': 0.62,
        'tremolo.wet': 0.3,
        'tremolo.depth': 0.62,
        'tremolo.frequency': 5.4
    }),
    preset('ghost-choir', 'Ghost Choir', {
        'oscillator.type': 'triangle',
        'oscillator.detune': 7,
        'envelope.attack': 0.4,
        'envelope.decay': 1.6,
        'envelope.sustain': 0.9,
        'envelope.release': 4.6,
        'filter.frequency': 2800,
        'filter.Q': 1.9,
        'chorus.wet': 0.5,
        'chorus.depth': 0.78,
        'reverb.wet': 0.72,
        'reverb.decay': 9,
        'vibrato.wet': 0.38,
        'vibrato.depth': 0.24,
        'vibrato.frequency': 4.1
    }),
    preset('circuit-breaker', 'Circuit Breaker', {
        'master.volume': 0.6,
        'oscillator.type': 'square',
        'oscillator.detune': -6,
        'envelope.attack': 0.01,
        'envelope.decay': 0.25,
        'envelope.sustain': 0.4,
        'envelope.release': 0.35,
        'filter.frequency': 2500,
        'filter.type': 'bandpass',
        'distortion.wet': 0.62,
        'distortion.distortion': 0.78,
        'delay.wet': 0.16,
        'delay.feedback': 0.46,
        'bitCrusher.bits': 8,
        'phaser.wet': 0.26,
        'phaser.frequency': 1.8
    }),
    preset('chill-keys', 'Chill Keys', {
        'oscillator.type': 'triangle',
        'envelope.attack': 0.08,
        'envelope.decay': 0.65,
        'envelope.sustain': 0.75,
        'envelope.release': 1.5,
        'filter.frequency': 4700,
        'filter.Q': 1.2,
        'chorus.wet': 0.26,
        'delay.wet': 0.16,
        'delay.delayTime': 0.43,
        'reverb.wet': 0.41,
        'reverb.decay': 5.8,
        'tremolo.wet': 0.14,
        'tremolo.frequency': 6
    }),
    preset('chime-cascade', 'Chime Cascade', {
        'oscillator.type': 'fattriangle',
        'oscillator.detune': 9,
        'envelope.attack': 0.015,
        'envelope.decay': 0.48,
        'envelope.sustain': 0.58,
        'envelope.release': 1.1,
        'filter.frequency': 7200,
        'filter.type': 'highpass',
        'delay.wet': 0.33,
        'delay.delayTime': 0.29,
        'delay.feedback': 0.52,
        'chorus.wet': 0.22,
        'reverb.wet': 0.36,
        'vibrato.wet': 0.28,
        'vibrato.depth': 0.2
    }),
    preset('desert-echo', 'Desert Echo', {
        'master.volume': 0.66,
        'oscillator.type': 'sawtooth',
        'envelope.attack': 0.06,
        'envelope.decay': 0.7,
        'envelope.sustain': 0.62,
        'envelope.release': 2.2,
        'filter.frequency': 3800,
        'filter.Q': 1.5,
        'delay.wet': 0.42,
        'delay.delayTime': 0.55,
        'delay.feedback': 0.58,
        'reverb.wet': 0.48,
        'reverb.decay': 6.9,
        'tremolo.wet': 0.18,
        'tremolo.depth': 0.4
    }),
    preset('afterburn', 'Afterburn', {
        'master.volume': 0.75,
        'oscillator.type': 'fatsawtooth',
        'oscillator.detune': 16,
        'envelope.attack': 0.02,
        'envelope.decay': 0.32,
        'envelope.sustain': 0.52,
        'envelope.release': 0.7,
        'filter.frequency': 8400,
        'filter.Q': 0.8,
        'distortion.wet': 0.58,
        'distortion.distortion': 0.82,
        'distortion.oversample': '4x',
        'compressor.threshold': -18,
        'compressor.ratio': 16,
        'phaser.wet': 0.24,
        'phaser.frequency': 1.2
    }),
    preset('velvet-strings', 'Velvet Strings', {
        'oscillator.type': 'triangle',
        'oscillator.detune': 11,
        'envelope.attack': 0.28,
        'envelope.decay': 1.2,
        'envelope.sustain': 0.85,
        'envelope.release': 4.1,
        'filter.frequency': 3300,
        'filter.Q': 1.7,
        'chorus.wet': 0.4,
        'chorus.depth': 0.72,
        'reverb.wet': 0.6,
        'reverb.decay': 7.2,
        'vibrato.wet': 0.3,
        'vibrato.depth': 0.18
    }),
    preset('neon-pulse', 'Neon Pulse', {
        'master.volume': 0.7,
        'oscillator.type': 'square',
        'oscillator.detune': -8,
        'envelope.attack': 0.008,
        'envelope.decay': 0.24,
        'envelope.sustain': 0.45,
        'envelope.release': 0.6,
        'filter.frequency': 6000,
        'filter.type': 'bandpass',
        'tremolo.wet': 0.35,
        'tremolo.frequency': 8.2,
        'tremolo.depth': 0.7,
        'delay.wet': 0.18,
        'delay.delayTime': 0.31,
        'phaser.wet': 0.28,
        'compressor.threshold': -20
    }),
    preset('gravity-bass', 'Gravity Bass', {
        'master.volume': 0.74,
        'oscillator.type': 'fatsquare',
        'oscillator.detune': -14,
        'envelope.attack': 0.01,
        'envelope.decay': 0.3,
        'envelope.sustain': 0.65,
        'envelope.release': 0.5,
        'filter.frequency': 420,
        'filter.Q': 2.8,
        'filter.type': 'lowpass',
        'distortion.wet': 0.44,
        'distortion.distortion': 0.72,
        'bitCrusher.bits': 5,
        'compressor.threshold': -16,
        'compressor.ratio': 14,
        'phaser.wet': 0.18
    }),
    preset('frostbite', 'Frostbite', {
        'master.volume': 0.62,
        'oscillator.type': 'triangle',
        'envelope.attack': 0.12,
        'envelope.decay': 0.9,
        'envelope.sustain': 0.72,
        'envelope.release': 2,
        'filter.frequency': 5100,
        'filter.Q': 1.3,
        'chorus.wet': 0.34,
        'chorus.frequency': 1.1,
        'reverb.wet': 0.58,
        'reverb.decay': 6.1,
        'delay.wet': 0.17,
        'delay.delayTime': 0.41,
        'vibrato.wet': 0.26,
        'vibrato.depth': 0.19
    }),
    preset('bloom-pad', 'Bloom Pad', {
        'oscillator.type': 'sawtooth',
        'envelope.attack': 0.32,
        'envelope.decay': 1.8,
        'envelope.sustain': 0.93,
        'envelope.release': 4.8,
        'filter.frequency': 2800,
        'filter.Q': 1.9,
        'reverb.wet': 0.74,
        'reverb.decay': 8.6,
        'delay.wet': 0.2,
        'delay.delayTime': 0.48,
        'chorus.wet': 0.42,
        'chorus.depth': 0.68,
        'vibrato.wet': 0.35,
        'vibrato.depth': 0.22
    }),
    preset('night-drive', 'Night Drive', {
        'oscillator.type': 'fatsawtooth',
        'oscillator.detune': 6,
        'envelope.attack': 0.02,
        'envelope.decay': 0.48,
        'envelope.sustain': 0.58,
        'envelope.release': 0.9,
        'filter.frequency': 3200,
        'filter.type': 'lowpass',
        'delay.wet': 0.26,
        'delay.delayTime': 0.36,
        'delay.feedback': 0.48,
        'reverb.wet': 0.38,
        'reverb.decay': 5.2,
        'chorus.wet': 0.24,
        'tremolo.wet': 0.2,
        'tremolo.frequency': 4.8
    }),
    preset('retro-bells', 'Retro Bells', {
        'oscillator.type': 'triangle',
        'envelope.attack': 0.012,
        'envelope.decay': 0.6,
        'envelope.sustain': 0.35,
        'envelope.release': 1.5,
        'filter.frequency': 6800,
        'filter.type': 'bandpass',
        'delay.wet': 0.31,
        'delay.delayTime': 0.26,
        'delay.feedback': 0.55,
        'reverb.wet': 0.4,
        'reverb.decay': 5.6,
        'chorus.wet': 0.18,
        'vibrato.wet': 0.22
    }),
    preset('tape-drift', 'Tape Drift', {
        'master.volume': 0.58,
        'oscillator.type': 'sawtooth',
        'oscillator.detune': 3,
        'envelope.attack': 0.07,
        'envelope.decay': 0.8,
        'envelope.sustain': 0.65,
        'envelope.release': 1.8,
        'filter.frequency': 2400,
        'filter.Q': 2.2,
        'chorus.wet': 0.28,
        'chorus.frequency': 0.9,
        'vibrato.wet': 0.4,
        'vibrato.depth': 0.28,
        'delay.wet': 0.18,
        'reverb.wet': 0.44,
        'bitCrusher.bits': 7
    }),
    preset('liquid-arp', 'Liquid Arp', {
        'oscillator.type': 'fattriangle',
        'oscillator.detune': 10,
        'envelope.attack': 0.01,
        'envelope.decay': 0.32,
        'envelope.sustain': 0.48,
        'envelope.release': 0.65,
        'filter.frequency': 5600,
        'filter.Q': 1.4,
        'delay.wet': 0.36,
        'delay.delayTime': 0.23,
        'delay.feedback': 0.58,
        'reverb.wet': 0.34,
        'chorus.wet': 0.3,
        'tremolo.wet': 0.22,
        'tremolo.frequency': 9.6
    }),
    preset('windchime', 'Windchime', {
        'master.volume': 0.6,
        'oscillator.type': 'triangle',
        'envelope.attack': 0.02,
        'envelope.decay': 0.7,
        'envelope.sustain': 0.38,
        'envelope.release': 1.9,
        'filter.frequency': 6900,
        'filter.type': 'highpass',
        'delay.wet': 0.29,
        'delay.delayTime': 0.32,
        'delay.feedback': 0.46,
        'reverb.wet': 0.49,
        'reverb.decay': 5.4,
        'vibrato.wet': 0.26,
        'phaser.wet': 0.22
    }),
    preset('thunder-stack', 'Thunder Stack', {
        'master.volume': 0.78,
        'oscillator.type': 'fatsawtooth',
        'oscillator.detune': 18,
        'envelope.attack': 0.04,
        'envelope.decay': 0.55,
        'envelope.sustain': 0.7,
        'envelope.release': 0.95,
        'filter.frequency': 1800,
        'filter.Q': 2.6,
        'distortion.wet': 0.66,
        'distortion.distortion': 0.88,
        'delay.wet': 0.21,
        'delay.feedback': 0.41,
        'phaser.wet': 0.34,
        'compressor.threshold': -15,
        'compressor.ratio': 18
    }),
    preset('cyber-sweep', 'Cyber Sweep', {
        'oscillator.type': 'sawtooth',
        'oscillator.detune': -5,
        'envelope.attack': 0.06,
        'envelope.decay': 0.5,
        'envelope.sustain': 0.65,
        'envelope.release': 1.7,
        'filter.frequency': 2600,
        'filter.Q': 2.1,
        'filter.type': 'bandpass',
        'filterLFO.frequency': 0.9,
        'filterLFO.depth': 0.68,
        'filterLFO.min': 140,
        'filterLFO.max': 4200,
        'phaser.wet': 0.38,
        'phaser.frequency': 1.6,
        'reverb.wet': 0.46
    }),
    preset('luminous-fm', 'Luminous FM', {
        'master.volume': 0.63,
        'oscillator.type': 'triangle',
        'oscillator.detune': 13,
        'envelope.attack': 0.03,
        'envelope.decay': 0.8,
        'envelope.sustain': 0.62,
        'envelope.release': 2.4,
        'filter.frequency': 5200,
        'filter.Q': 1.4,
        'chorus.wet': 0.36,
        'chorus.frequency': 1.2,
        'delay.wet': 0.25,
        'delay.delayTime': 0.4,
        'reverb.wet': 0.5,
        'vibrato.wet': 0.32,
        'vibrato.depth': 0.21
    }),
    preset('wide-horizon', 'Wide Horizon', {
        'master.volume': 0.67,
        'oscillator.type': 'fatsawtooth',
        'oscillator.detune': 12,
        'envelope.attack': 0.25,
        'envelope.decay': 1.4,
        'envelope.sustain': 0.86,
        'envelope.release': 3.5,
        'filter.frequency': 4100,
        'filter.Q': 1.5,
        'chorus.wet': 0.45,
        'chorus.depth': 0.74,
        'delay.wet': 0.24,
        'delay.delayTime': 0.5,
        'reverb.wet': 0.68,
        'reverb.decay': 7.3,
        'vibrato.wet': 0.28
    }),
    preset('stardust', 'Stardust', {
        'oscillator.type': 'triangle',
        'envelope.attack': 0.18,
        'envelope.decay': 1.05,
        'envelope.sustain': 0.82,
        'envelope.release': 3.1,
        'filter.frequency': 3600,
        'filter.Q': 1.9,
        'filterLFO.frequency': 0.6,
        'filterLFO.depth': 0.72,
        'filterLFO.min': 220,
        'filterLFO.max': 3900,
        'delay.wet': 0.28,
        'delay.delayTime': 0.45,
        'reverb.wet': 0.66,
        'vibrato.wet': 0.31,
        'vibrato.depth': 0.2
    }),
    preset('shadow-bass', 'Shadow Bass', {
        'master.volume': 0.76,
        'oscillator.type': 'square',
        'oscillator.detune': -18,
        'envelope.attack': 0.005,
        'envelope.decay': 0.28,
        'envelope.sustain': 0.7,
        'envelope.release': 0.42,
        'filter.frequency': 340,
        'filter.Q': 3.2,
        'filter.type': 'lowpass',
        'distortion.wet': 0.52,
        'distortion.distortion': 0.76,
        'delay.wet': 0.1,
        'tremolo.wet': 0.24,
        'tremolo.depth': 0.55,
        'compressor.threshold': -17,
        'compressor.ratio': 15
    }),
    preset('ember-harp', 'Ember Harp', {
        'oscillator.type': 'sine',
        'envelope.attack': 0.011,
        'envelope.decay': 0.36,
        'envelope.sustain': 0.4,
        'envelope.release': 1.3,
        'filter.frequency': 6300,
        'filter.Q': 1.1,
        'delay.wet': 0.33,
        'delay.delayTime': 0.28,
        'delay.feedback': 0.5,
        'reverb.wet': 0.48,
        'reverb.decay': 5.1,
        'chorus.wet': 0.24,
        'vibrato.wet': 0.27
    })
];

export const PRESET_LOOKUP = new Map(PRESET_BANK.map(p => [p.id, p]));

export function getPresetById(id) {
    return PRESET_LOOKUP.get(id) || null;
}

const OSC_TYPES = ['sine', 'triangle', 'sawtooth', 'square', 'fatsawtooth', 'fatsquare', 'fattriangle'];
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];
const OVERSAMPLE_OPTIONS = ['none', '2x', '4x'];

const randFloat = (min, max, precision = 3) => {
    const value = min + Math.random() * (max - min);
    return parseFloat(value.toFixed(precision));
};

const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

const randChoice = arr => arr[Math.floor(Math.random() * arr.length)];

const maybeWet = (probability = 0.55, range = [0.18, 0.78]) => {
    return Math.random() < probability ? randFloat(range[0], range[1], 2) : 0;
};

export function createRandomPreset() {
    const patch = Object.assign({}, BASE_PATCH);

    patch['master.volume'] = randFloat(0.35, 0.88, 2);
    patch['limiter.threshold'] = randFloat(-20, -2, 2);
    patch['oscillator.type'] = randChoice(OSC_TYPES);
    patch['oscillator.detune'] = randFloat(-25, 25, 1);

    patch['envelope.attack'] = randFloat(0.002, 1.4, 3);
    patch['envelope.decay'] = randFloat(0.08, 2.4, 3);
    patch['envelope.sustain'] = randFloat(0.25, 0.95, 2);
    patch['envelope.release'] = randFloat(0.06, 4.8, 3);

    patch['filter.type'] = randChoice(FILTER_TYPES);
    patch['filter.frequency'] = randFloat(180, 12500, 0);
    patch['filter.Q'] = randFloat(0.6, 3.2, 2);

    const reverbWet = maybeWet(0.65, [0.22, 0.85]);
    patch['reverb.wet'] = reverbWet;
    patch['reverb.decay'] = randFloat(1.2, reverbWet > 0 ? 9.5 : 3.5, 2);
    patch['reverb.preDelay'] = randFloat(0, 0.4, 3);

    const delayWet = maybeWet(0.6, [0.15, 0.6]);
    patch['delay.wet'] = delayWet;
    patch['delay.delayTime'] = randFloat(0.08, 0.75, 3);
    patch['delay.feedback'] = randFloat(0.15, 0.7, 2);

    const chorusWet = maybeWet(0.55, [0.18, 0.65]);
    patch['chorus.wet'] = chorusWet;
    patch['chorus.frequency'] = randFloat(0.8, 2.6, 2);
    patch['chorus.delayTime'] = randFloat(1.5, 5.5, 2);
    patch['chorus.depth'] = randFloat(0.35, 0.9, 2);

    const phaserWet = maybeWet(0.45, [0.16, 0.6]);
    patch['phaser.wet'] = phaserWet;
    patch['phaser.frequency'] = randFloat(0.3, 2.4, 2);
    patch['phaser.octaves'] = randFloat(1.2, 6.5, 2);
    patch['phaser.baseFrequency'] = randFloat(150, 1200, 0);

    const tremoloWet = maybeWet(0.5, [0.12, 0.55]);
    patch['tremolo.wet'] = tremoloWet;
    patch['tremolo.frequency'] = randFloat(3, 14, 2);
    patch['tremolo.depth'] = randFloat(0.25, 0.9, 2);

    const vibratoWet = maybeWet(0.45, [0.12, 0.48]);
    patch['vibrato.wet'] = vibratoWet;
    patch['vibrato.frequency'] = randFloat(3.2, 8.8, 2);
    patch['vibrato.depth'] = randFloat(0.08, 0.32, 3);

    const distortionWet = maybeWet(0.55, [0.15, 0.65]);
    patch['distortion.wet'] = distortionWet;
    patch['distortion.distortion'] = randFloat(0.2, 0.9, 2);
    patch['distortion.oversample'] = randChoice(OVERSAMPLE_OPTIONS);

    patch['compressor.threshold'] = randFloat(-28, -8, 2);
    patch['compressor.ratio'] = randFloat(6, 20, 2);
    patch['compressor.attack'] = randFloat(0.001, 0.05, 3);
    patch['compressor.release'] = randFloat(0.08, 0.6, 3);
    patch['compressor.knee'] = randFloat(12, 36, 1);

    patch['bitCrusher.bits'] = randInt(4, 12);

    patch['filterLFO.frequency'] = randFloat(0.1, 3.2, 3);
    patch['filterLFO.depth'] = randFloat(0.2, 0.9, 2);
    const lfoMin = randFloat(120, 2400, 0);
    patch['filterLFO.min'] = lfoMin;
    patch['filterLFO.max'] = randFloat(lfoMin + 200, lfoMin + 6000, 0);

    patch['phaserLFO.frequency'] = randFloat(0.1, 2.5, 3);
    patch['phaserLFO.depth'] = randFloat(0.2, 0.9, 2);

    patch['tremoloLFO.frequency'] = randFloat(0.3, 3.8, 3);
    patch['tremoloLFO.depth'] = randFloat(0.2, 0.9, 2);

    patch['vibratoLFO.frequency'] = randFloat(0.4, 4.2, 3);
    patch['vibratoLFO.depth'] = randFloat(0.02, 0.18, 3);

    const name = `Randomised ${Math.floor(Math.random() * 900 + 100)}`;

    return { name, values: patch };
}
