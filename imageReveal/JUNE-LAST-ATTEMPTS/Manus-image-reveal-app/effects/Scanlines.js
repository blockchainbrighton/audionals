import { EffectBase } from './EffectBase.js';

export class Scanlines extends EffectBase {
    constructor(name = 'Scanlines', options = {}) { super(name, options); }
    initializeParameters() {
        this.parameters = {
            lineSpacing: this.options.lineSpacing ?? 4,
            opacity: this.options.opacity ?? 0.6,
            direction: this.options.direction ?? 'down',
            speed: this.options.speed ?? 1,
            thickness: this.options.thickness ?? 1,
            color: this.options.color ?? [0, 255, 0]
        };
    }

    draw(ctx, timingInfo) {
        this.copyImageData(this.originalImageData, this.outputImageData);
        const w = this.outputImageData.width, h = this.outputImageData.height, d = this.outputImageData.data,
            { lineSpacing, opacity, direction, speed, thickness, color } = this.parameters,
            progress = this.getProgress(timingInfo), intensity = this.getIntensity() * progress,
            t = timingInfo.currentTime * speed * 60,
            beatPhase = timingInfo.currentBeat % 1, beatPulse = Math.sin(beatPhase * Math.PI) * 0.3 + 0.7,
            ao = opacity * intensity * beatPulse;

        for (let y = 0; y < h; y++) {
            const lp = direction === 'down' ? (y + t) % (lineSpacing * 2) : (h - y + t) % (lineSpacing * 2),
                scan = lp < thickness, rp = Math.min(1, progress * 2);
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                if (scan) {
                    d[idx] = this.blend(d[idx], color[0], ao);
                    d[idx + 1] = this.blend(d[idx + 1], color[1], ao);
                    d[idx + 2] = this.blend(d[idx + 2], color[2], ao);
                } else if (rp < 1) {
                    const df = 1 - (1 - rp) * 0.8;
                    d[idx] *= df; d[idx + 1] *= df; d[idx + 2] *= df;
                }
            }
        }
        if (intensity > 0.5) this.interlace(this.outputImageData, intensity);
        if (ao > 0.3) this.scanGlow(this.outputImageData, t, intensity);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    blend(b, o, a) { return Math.round(b * (1 - a) + o * a); }

    interlace(img, intensity) {
        const w = img.width, h = img.height, d = img.data, io = intensity * 0.2;
        for (let y = 1; y < h; y += 2) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] *= (1 - io); d[i + 1] *= (1 - io); d[i + 2] *= (1 - io);
        }
    }

    scanGlow(img, t, intensity) {
        const w = img.width, h = img.height, d = img.data,
            { lineSpacing, thickness } = this.parameters, glowR = 2, gI = intensity * 0.3;
        for (let y = 0; y < h; y++) {
            if ((y + t) % (lineSpacing * 2) < thickness)
                for (let dy = -glowR; dy <= glowR; dy++) {
                    const gy = y + dy;
                    if (gy < 0 || gy >= h) continue;
                    const gs = (1 - Math.abs(dy) / glowR) * gI;
                    for (let x = 0; x < w; x++) {
                        const i = (gy * w + x) * 4;
                        d[i + 1] = Math.min(255, d[i + 1] + gs * 50);
                    }
                }
        }
    }
    onStart() { }
    onStop() { }
}
