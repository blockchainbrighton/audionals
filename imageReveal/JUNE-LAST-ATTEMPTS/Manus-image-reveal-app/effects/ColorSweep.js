import { EffectBase } from './EffectBase.js';

export class ColorSweep extends EffectBase {
    constructor(name = 'ColorSweep', options = {}) {
        super(name, options);
    }

    initializeParameters() {
        this.parameters = {
            hueShift: this.options.hueShift ?? 180,
            saturationBoost: this.options.saturationBoost ?? 1.5,
            brightnessAdjust: this.options.brightnessAdjust ?? 0,
            direction: this.options.direction ?? 'horizontal',
            sweepWidth: this.options.sweepWidth ?? 0.3,
            colorMode: this.options.colorMode ?? 'hueShift',
            speed: this.options.speed ?? 1.0,
            beatSync: this.options.beatSync !== false,
        };
        this.sweepPosition = 0;
        this.colorPhase = 0;
    }

    draw(ctx, timingInfo) {
        const { width, height } = this;
        const img = this.originalImageData;
        const progress = this.getProgress(timingInfo);
        const intensity = this.getIntensity() * progress;
        this.updateSweepParameters(progress, timingInfo);

        const sweepMask = this.generateSweepMask(width, height);

        // Create a temporary ImageData for manipulation
        const data = new Uint8ClampedArray(img.data);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const mask = sweepMask[y * width + x];
                if (mask > 0) {
                    const [tr, tg, tb] = this.applyColorTransformation(
                        data[i], data[i + 1], data[i + 2],
                        mask, x, y, width, height
                    );
                    const blend = intensity * mask;
                    data[i] = Math.round(data[i] * (1 - blend) + tr * blend);
                    data[i + 1] = Math.round(data[i + 1] * (1 - blend) + tg * blend);
                    data[i + 2] = Math.round(data[i + 2] * (1 - blend) + tb * blend);
                }
            }
        }
        // Draw result to canvas
        ctx.putImageData(new ImageData(data, width, height), 0, 0);
    }

    updateSweepParameters(progress, timingInfo) {
        this.sweepPosition = (progress * this.parameters.speed) % 1;
        if (this.parameters.beatSync && timingInfo.currentBeat !== undefined) {
            const beatPhase = timingInfo.currentBeat % 1;
            this.sweepPosition += Math.sin(beatPhase * Math.PI) * 0.2;
        }
        this.colorPhase = (timingInfo.currentTime * 0.5) % 1;
    }

    generateSweepMask(width, height) {
        const mask = new Float32Array(width * height);
        switch (this.parameters.direction) {
            case 'horizontal': this.generateLinearSweep(mask, width, height, true); break;
            case 'vertical': this.generateLinearSweep(mask, width, height, false); break;
            case 'radial': this.generateRadialSweep(mask, width, height); break;
            case 'spiral': this.generateSpiralSweep(mask, width, height); break;
            case 'diagonal': this.generateDiagonalSweep(mask, width, height); break;
            case 'wave': this.generateWaveSweep(mask, width, height); break;
        }
        return mask;
    }

    generateLinearSweep(mask, width, height, isHoriz) {
        const center = this.sweepPosition * (isHoriz ? width : height);
        const halfW = this.parameters.sweepWidth * (isHoriz ? width : height) / 2;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const v = isHoriz ? x : y, d = Math.abs(v - center);
            let m = d <= halfW ? Math.sin((1 - d / halfW) * Math.PI / 2) : 0;
            mask[y * width + x] = m;
        }
    }

    generateRadialSweep(mask, width, height) {
        const cx = width / 2, cy = height / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const r = this.sweepPosition * maxR, sweepW = this.parameters.sweepWidth * maxR;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2), d = Math.abs(dist - r);
            mask[y * width + x] = d <= sweepW / 2 ? Math.sin((1 - d / (sweepW / 2)) * Math.PI / 2) : 0;
        }
    }

    generateSpiralSweep(mask, width, height) {
        const cx = width / 2, cy = height / 2, maxR = Math.sqrt(cx * cx + cy * cy), turns = 3;
        const sweepA = this.sweepPosition * Math.PI * 2 * turns, sweepW = this.parameters.sweepWidth * Math.PI;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) + Math.PI;
            const spiralA = angle + (dist / maxR) * Math.PI * 2 * turns;
            const adiff = Math.abs(spiralA - sweepA);
            const ndiff = Math.min(adiff, Math.PI * 2 - adiff);
            mask[y * width + x] = ndiff <= sweepW / 2 ? Math.sin((1 - ndiff / (sweepW / 2)) * Math.PI / 2) : 0;
        }
    }

    generateDiagonalSweep(mask, width, height) {
        const diag = width + height, center = this.sweepPosition * diag, halfW = this.parameters.sweepWidth * diag / 2;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const d = Math.abs(x + y - center);
            mask[y * width + x] = d <= halfW ? Math.sin((1 - d / halfW) * Math.PI / 2) : 0;
        }
    }

    generateWaveSweep(mask, width, height) {
        const freq = 3, amp = height * 0.2, sweepW = this.parameters.sweepWidth * height / 2;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const waveY = height / 2 + Math.sin((x / width) * freq * Math.PI * 2 + this.sweepPosition * Math.PI * 2) * amp;
            const d = Math.abs(y - waveY);
            mask[y * width + x] = d <= sweepW ? Math.sin((1 - d / sweepW) * Math.PI / 2) : 0;
        }
    }

    // --- Color Modes ---

    applyColorTransformation(r, g, b, mask, x, y, w, h) {
        switch (this.parameters.colorMode) {
            case 'hueShift': return this.applyHueShift(r, g, b, mask);
            case 'rainbow':  return this.applyRainbow(r, g, b, x, y, w, h);
            case 'duotone':  return this.applyDuotone(r, g, b);
            case 'invert':   return [255 - r, 255 - g, 255 - b];
            case 'sepia':    return [
                Math.min(255, r * .393 + g * .769 + b * .189),
                Math.min(255, r * .349 + g * .686 + b * .168),
                Math.min(255, r * .272 + g * .534 + b * .131)
            ];
            default: return [r, g, b];
        }
    }
    applyHueShift(r, g, b, mask) {
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const h2 = (h + (this.parameters.hueShift * mask / 360)) % 1;
        const s2 = Math.min(1, s * this.parameters.saturationBoost);
        const l2 = Math.max(0, Math.min(1, l + this.parameters.brightnessAdjust / 100));
        return this.hslToRgb(h2, s2, l2);
    }
    applyRainbow(r, g, b, x, y, w, h) {
        const hue = ((x / w + y / h + this.colorPhase) % 1);
        const sat = 0.8, light = (r + g + b) / (3 * 255);
        return this.hslToRgb(hue, sat, light);
    }
    applyDuotone(r, g, b) {
        const t = (r + g + b) / (3 * 255);
        const c1 = [255, 0, 128], c2 = [0, 255, 255];
        return [
            Math.round(c1[0] * (1 - t) + c2[0] * t),
            Math.round(c1[1] * (1 - t) + c2[1] * t),
            Math.round(c1[2] * (1 - t) + c2[2] * t)
        ];
    }
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2, d = max - min;
        if (d) {
            s = l > .5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return [h, s, l];
    }
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) r = g = b = l;
        else {
            const hue2rgb = (p, q, t) => {
                t = (t + 1) % 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    onStart() { this.sweepPosition = 0; this.colorPhase = 0; }
    onStop() { }
}
