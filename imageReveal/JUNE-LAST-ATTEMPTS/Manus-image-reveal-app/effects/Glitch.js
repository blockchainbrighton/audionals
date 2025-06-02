import { EffectBase } from './EffectBase.js';

export class Glitch extends EffectBase {
    constructor(name = 'Glitch', options = {}) {
        super(name, options);
    }

    initializeParameters() {
        this.parameters = {
            rgbShift: this.options.rgbShift ?? 5,
            noiseIntensity: this.options.noiseIntensity ?? 0.3,
            blockSize: this.options.blockSize ?? 15,
            scanlineIntensity: this.options.scanlineIntensity ?? 0.5,
            digitalNoise: this.options.digitalNoise ?? 0.2,
            colorCorruption: this.options.colorCorruption ?? 0.4,
            glitchFrequency: this.options.glitchFrequency ?? 0.1,
            beatSync: this.options.beatSync !== false
        };
        this.glitchBlocks = [];
        this.lastGlitchTime = 0;
        this.glitchDuration = 0;
    }

    draw(ctx, timingInfo) {
        const width = this.width, height = this.height, img = this.originalImageData;
        const intensity = this.getIntensity() * this.getProgress(timingInfo);
        let working = new ImageData(new Uint8ClampedArray(img.data), width, height);

        // Trigger new glitch?
        if (this.shouldTriggerGlitch(timingInfo, intensity)) {
            this.generateGlitchBlocks(width, height, intensity);
            this.lastGlitchTime = timingInfo.currentTime;
            this.glitchDuration = this.random.nextFloat ? this.random.nextFloat(0.05, 0.2) : 0.05 + Math.random() * 0.15;
        }
        const isGlitching = (timingInfo.currentTime - this.lastGlitchTime) < this.glitchDuration;
        if (isGlitching || intensity > 0.7) {
            this.applyRGBShift(working, intensity);
            this.applyBlockDisplacement(working, intensity);
            this.applyScanlineDistortion(working, intensity);
            this.applyDigitalNoise(working, intensity);
            this.applyColorCorruption(working, intensity);
        }
        this.applyBaseNoise(working, intensity * 0.3);
        ctx.putImageData(working, 0, 0);
    }

    shouldTriggerGlitch(timingInfo, intensity) {
        if (this.parameters.beatSync && timingInfo.currentBeat !== undefined) {
            const beatPhase = timingInfo.currentBeat % 1;
            if (beatPhase < 0.1 && this.random.next() < intensity) return true;
        }
        return this.random.next() < (this.parameters.glitchFrequency * intensity);
    }

    generateGlitchBlocks(width, height, intensity) {
        this.glitchBlocks = [];
        const n = Math.floor(intensity * 10 + 2), bs = this.parameters.blockSize;
        for (let i = 0; i < n; i++) {
            const bw = this.random.nextInt ? this.random.nextInt(20, bs * 3) : 20 + Math.random() * bs * 2 | 0;
            const bh = this.random.nextInt ? this.random.nextInt(5, bs) : 5 + Math.random() * (bs - 5) | 0;
            const x = this.random.nextInt ? this.random.nextInt(0, width - bw) : Math.random() * (width - bw) | 0;
            const y = this.random.nextInt ? this.random.nextInt(0, height - bh) : Math.random() * (height - bh) | 0;
            const ox = this.random.nextInt ? this.random.nextInt(-bs, bs) : (Math.random() - 0.5) * 2 * bs | 0;
            const oy = this.random.nextInt ? this.random.nextInt(-5, 5) : (Math.random() - 0.5) * 10 | 0;
            this.glitchBlocks.push({ x, y, width: bw, height: bh, offsetX: ox, offsetY: oy });
        }
    }

    applyRGBShift(imageData, intensity) {
        const { width, height, data } = imageData, temp = new Uint8ClampedArray(data);
        const s = this.parameters.rgbShift * intensity;
        const rs = (this.random.nextFloat ? this.random.nextFloat(-s, s) : (Math.random() - 0.5) * 2 * s) | 0;
        const gs = (this.random.nextFloat ? this.random.nextFloat(-s, s) : (Math.random() - 0.5) * 2 * s) | 0;
        const bs = (this.random.nextFloat ? this.random.nextFloat(-s, s) : (Math.random() - 0.5) * 2 * s) | 0;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            data[idx]     = temp[(y * width + Math.max(0, Math.min(width - 1, x + rs))) * 4];
            data[idx + 1] = temp[(y * width + Math.max(0, Math.min(width - 1, x + gs))) * 4 + 1];
            data[idx + 2] = temp[(y * width + Math.max(0, Math.min(width - 1, x + bs))) * 4 + 2];
            data[idx + 3] = temp[idx + 3];
        }
    }

    applyBlockDisplacement(imageData, intensity) {
        const { width, height, data } = imageData, temp = new Uint8ClampedArray(data);
        for (const block of this.glitchBlocks) {
            const sx = block.x, sy = block.y, dx = Math.max(0, Math.min(width - block.width, block.x + block.offsetX)),
                  dy = Math.max(0, Math.min(height - block.height, block.y + block.offsetY));
            for (let y = 0; y < block.height; y++) for (let x = 0; x < block.width; x++) {
                const si = ((sy + y) * width + (sx + x)) * 4;
                const di = ((dy + y) * width + (dx + x)) * 4;
                if (si >= 0 && si < temp.length - 3 && di >= 0 && di < data.length - 3) {
                    data[di]     = temp[si];
                    data[di + 1] = temp[si + 1];
                    data[di + 2] = temp[si + 2];
                    data[di + 3] = temp[si + 3];
                }
            }
        }
    }

    applyScanlineDistortion(imageData, intensity) {
        const { width, height, data } = imageData, temp = new Uint8ClampedArray(data);
        const scanlineIntensity = this.parameters.scanlineIntensity * intensity, lines = Math.floor(intensity * 20);
        for (let i = 0; i < lines; i++) {
            const y = this.random.nextInt ? this.random.nextInt(0, height - 1) : Math.random() * (height - 1) | 0;
            const offset = ((this.random.nextInt ? this.random.nextInt(-20, 20) : (Math.random() - 0.5) * 40) * scanlineIntensity) | 0;
            for (let x = 0; x < width; x++) {
                const srcX = Math.max(0, Math.min(width - 1, x + offset));
                const srcIdx = (y * width + srcX) * 4, destIdx = (y * width + x) * 4;
                data[destIdx]     = temp[srcIdx];
                data[destIdx + 1] = temp[srcIdx + 1];
                data[destIdx + 2] = temp[srcIdx + 2];
                data[destIdx + 3] = temp[srcIdx + 3];
            }
            if (this.random.next() < 0.5) for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4, b = (this.random.nextFloat ? this.random.nextFloat(0.5, 1.5) : 0.5 + Math.random());
                data[idx]     = Math.min(255, data[idx]     * b);
                data[idx + 1] = Math.min(255, data[idx + 1] * b);
                data[idx + 2] = Math.min(255, data[idx + 2] * b);
            }
        }
    }

    applyDigitalNoise(imageData, intensity) {
        const data = imageData.data, ni = this.parameters.digitalNoise * intensity, na = 255 * ni;
        for (let i = 0; i < data.length; i += 4) {
            if (this.random.next() < ni) {
                data[i] = this.random.nextInt ? this.random.nextInt(0, 255) : Math.random() * 255 | 0;
                data[i + 1] = this.random.nextInt ? this.random.nextInt(0, 255) : Math.random() * 255 | 0;
                data[i + 2] = this.random.nextInt ? this.random.nextInt(0, 255) : Math.random() * 255 | 0;
            } else if (this.random.next() < ni * 0.5) {
                const noise = ((this.random.next() - 0.5) * na) | 0;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
    }

    applyColorCorruption(imageData, intensity) {
        const data = imageData.data, cI = this.parameters.colorCorruption * intensity;
        for (let i = 0; i < data.length; i += 4) {
            if (this.random.next() < cI * 0.1) {
                const r = data[i], g = data[i + 1], b = data[i + 2], swap = this.random.nextInt ? this.random.nextInt(0, 5) : (Math.random() * 5) | 0;
                if (swap === 0) { data[i] = g; data[i + 1] = b; data[i + 2] = r; }
                else if (swap === 1) { data[i] = b; data[i + 1] = r; data[i + 2] = g; }
                else if (swap === 2) data[i] = 255 - r;
                else if (swap === 3) data[i + 1] = 255 - g;
                else if (swap === 4) data[i + 2] = 255 - b;
                else {
                    const max = Math.max(r, g, b);
                    data[i] = r === max ? 255 : 0; data[i + 1] = g === max ? 255 : 0; data[i + 2] = b === max ? 255 : 0;
                }
            } else if (this.random.next() < cI * 0.05) {
                const s = this.random.nextInt ? this.random.nextInt(1, 4) : 1 + (Math.random() * 3) | 0;
                data[i] = (data[i] >> s) << s;
                data[i + 1] = (data[i + 1] >> s) << s;
                data[i + 2] = (data[i + 2] >> s) << s;
            }
        }
    }

    applyBaseNoise(imageData, intensity) {
        const data = imageData.data, na = 10 * intensity;
        for (let i = 0; i < data.length; i += 4)
            if (this.random.next() < intensity * 0.1) {
                const n = ((this.random.next() - 0.5) * na) | 0;
                data[i] = Math.max(0, Math.min(255, data[i] + n));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
            }
    }
    onStart() { this.glitchBlocks = []; this.lastGlitchTime = 0; }
    onStop() { this.glitchBlocks = []; }
}
