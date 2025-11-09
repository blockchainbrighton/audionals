const clamp01 = value => Math.min(1, Math.max(0, value));

export const FADE_SHAPE_PRESETS = Object.freeze([
    {
        id: 'linear',
        label: 'Linear',
        shortLabel: 'Lin',
        toneCurve: 'linear',
        curve: t => t
    },
    {
        id: 'ease-in',
        label: 'Ease In',
        shortLabel: 'E+',
        toneCurve: 'exponential',
        curve: t => Math.pow(t, 2)
    },
    {
        id: 'ease-out',
        label: 'Ease Out',
        shortLabel: 'E-',
        toneCurve: 'sine',
        curve: t => 1 - Math.pow(1 - t, 2)
    },
    {
        id: 's-curve',
        label: 'S-Curve',
        shortLabel: 'S',
        toneCurve: 'cosine',
        curve: t => t * t * (3 - 2 * t)
    }
]);

export const VALID_FADE_SHAPES = FADE_SHAPE_PRESETS.map(preset => preset.id);
export const DEFAULT_FADE_SHAPE = 'linear';

export function normalizeFadeShape(value) {
    const candidate = typeof value === 'string' ? value.toLowerCase() : '';
    return VALID_FADE_SHAPES.includes(candidate) ? candidate : DEFAULT_FADE_SHAPE;
}

export function getFadeShapePreset(shapeId) {
    const normalized = normalizeFadeShape(shapeId);
    return FADE_SHAPE_PRESETS.find(preset => preset.id === normalized) || FADE_SHAPE_PRESETS[0];
}

export function getToneCurveForShape(shapeId) {
    return getFadeShapePreset(shapeId).toneCurve || 'linear';
}

export function getFadeCurveValue(shapeId, progress) {
    const preset = getFadeShapePreset(shapeId);
    const safeProgress = clamp01(progress);
    try {
        return clamp01(preset.curve(safeProgress));
    } catch (error) {
        console.warn('[FADE] Failed to evaluate fade curve, falling back to linear.', error);
        return safeProgress;
    }
}
