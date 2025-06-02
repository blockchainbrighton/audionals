import { EffectBase } from './EffectBase.js';

export class GaussianBlur extends EffectBase {
    constructor(name = 'GaussianBlur', options = {}) {
        super(name, options);
    }

    initializeParameters() {
        this.parameters = {
            maxRadius: this.options.maxRadius ?? 8,
            quality: this.options.quality ?? 'medium',
            direction: this.options.direction ?? 'both',
            beatSync: this.options.beatSync !== false
        };
    }

    draw(ctx, timingInfo) {
        const { width, height } = this;
        const img = this.originalImageData;
        const progress = this.getProgress(timingInfo);
        const intensity = this.getIntensity();
        let blurRadius = this.parameters.maxRadius * (1 - progress) * intensity;

        if (this.parameters.beatSync && timingInfo.currentBeat !== undefined) {
            const beatPhase = (timingInfo.currentBeat % 1);
            blurRadius *= Math.sin(beatPhase * Math.PI) * 0.3 + 0.7;
        }
        blurRadius = Math.max(0, blurRadius);

        let output = new ImageData(new Uint8ClampedArray(img.data), width, height);

        if (blurRadius >= 0.5) {
            switch (this.parameters.quality) {
                case 'low':
                    output = this.fastBoxBlur(output, blurRadius / 2, this.parameters.direction);
                    break;
                case 'high':
                    output = this.multiPassGaussian(output, blurRadius, this.parameters.direction);
                    break;
                default:
                    output = this.singlePassGaussian(output, Math.round(blurRadius), this.parameters.direction);
            }
        }
        ctx.putImageData(output, 0, 0);
    }

    fastBoxBlur(img, radius, dir) {
        const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
        if (dir === 'horizontal' || dir === 'both') this.boxBlurHorizontal(out.data, img.width, img.height, Math.round(radius));
        if (dir === 'vertical' || dir === 'both') this.boxBlurVertical(out.data, img.width, img.height, Math.round(radius));
        return out;
    }
    singlePassGaussian(img, radius, dir) {
        const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
        if (radius < 1) return out;
        const kernel = this.createGaussianKernel(radius);
        if (dir === 'horizontal' || dir === 'both') this.convolve1D(out, kernel, true);
        if (dir === 'vertical' || dir === 'both') this.convolve1D(out, kernel, false);
        return out;
    }
    multiPassGaussian(img, radius, dir) {
        let out = img;
        const passes = radius <= 3 ? 1 : radius <= 7 ? 2 : 3;
        for (let i = 0; i < passes; ++i) {
            out = this.singlePassGaussian(out, radius / passes, dir);
        }
        return out;
    }
    createGaussianKernel(radius) {
        const intRadius = Math.max(1, Math.round(radius)), size = intRadius * 2 + 1;
        const kernel = Array(size).fill(0), sigma = intRadius / 3, twoSigmaSq = 2 * sigma * sigma;
        let sum = 0;
        for (let i = 0; i < size; i++) {
            const x = i - intRadius, val = Math.exp(-(x * x) / twoSigmaSq);
            kernel[i] = val; sum += val;
        }
        return kernel.map(k => k / sum);
    }
    convolve1D(img, kernel, horiz) {
        const { width, height, data } = img, temp = new Uint8ClampedArray(data);
        const k = kernel.length, half = Math.floor(k / 2);
        if (horiz) {
            for (let y = 0; y < height; y++)
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    for (let i = 0; i < k; i++) {
                        const px = Math.min(width - 1, Math.max(0, x + i - half));
                        const idx = (y * width + px) * 4, weight = kernel[i];
                        r += temp[idx] * weight;
                        g += temp[idx + 1] * weight;
                        b += temp[idx + 2] * weight;
                        a += temp[idx + 3] * weight;
                    }
                    const idx = (y * width + x) * 4;
                    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
                }
        } else {
            for (let x = 0; x < width; x++)
                for (let y = 0; y < height; y++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    for (let i = 0; i < k; i++) {
                        const py = Math.min(height - 1, Math.max(0, y + i - half));
                        const idx = (py * width + x) * 4, weight = kernel[i];
                        r += temp[idx] * weight;
                        g += temp[idx + 1] * weight;
                        b += temp[idx + 2] * weight;
                        a += temp[idx + 3] * weight;
                    }
                    const idx = (y * width + x) * 4;
                    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
                }
        }
    }
    boxBlurHorizontal(data, w, h, r) {
        if (r < 1) return;
        const tmp = new Uint8ClampedArray(data);
        const dia = r * 2 + 1;
        for (let y = 0; y < h; y++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
            for (let wx = -r; wx <= r; wx++) {
                const px = Math.min(w - 1, Math.max(0, wx));
                const idx = (y * w + px) * 4;
                rSum += tmp[idx]; gSum += tmp[idx + 1]; bSum += tmp[idx + 2]; aSum += tmp[idx + 3];
            }
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                data[idx] = rSum / dia; data[idx + 1] = gSum / dia; data[idx + 2] = bSum / dia; data[idx + 3] = aSum / dia;
                const oldX = Math.max(0, x - r), oldIdx = (y * w + oldX) * 4;
                const newX = Math.min(w - 1, x + r + 1), newIdx = (y * w + newX) * 4;
                if (x < w - 1) {
                    rSum += tmp[newIdx] - tmp[oldIdx];
                    gSum += tmp[newIdx + 1] - tmp[oldIdx + 1];
                    bSum += tmp[newIdx + 2] - tmp[oldIdx + 2];
                    aSum += tmp[newIdx + 3] - tmp[oldIdx + 3];
                }
            }
        }
    }
    boxBlurVertical(data, w, h, r) {
        if (r < 1) return;
        const tmp = new Uint8ClampedArray(data);
        const dia = r * 2 + 1;
        for (let x = 0; x < w; x++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
            for (let wy = -r; wy <= r; wy++) {
                const py = Math.min(h - 1, Math.max(0, wy));
                const idx = (py * w + x) * 4;
                rSum += tmp[idx]; gSum += tmp[idx + 1]; bSum += tmp[idx + 2]; aSum += tmp[idx + 3];
            }
            for (let y = 0; y < h; y++) {
                const idx = (y * w + x) * 4;
                data[idx] = rSum / dia; data[idx + 1] = gSum / dia; data[idx + 2] = bSum / dia; data[idx + 3] = aSum / dia;
                const oldY = Math.max(0, y - r), oldIdx = (oldY * w + x) * 4;
                const newY = Math.min(h - 1, y + r + 1), newIdx = (newY * w + x) * 4;
                if (y < h - 1) {
                    rSum += tmp[newIdx] - tmp[oldIdx];
                    gSum += tmp[newIdx + 1] - tmp[oldIdx + 1];
                    bSum += tmp[newIdx + 2] - tmp[oldIdx + 2];
                    aSum += tmp[newIdx + 3] - tmp[oldIdx + 3];
                }
            }
        }
    }
    onStart() { }
    onStop() { }
}
