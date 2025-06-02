import { EffectBase } from './EffectBase.js';

export class VShift extends EffectBase {
    constructor(name = 'VShift', options = {}) { super(name, options); }
    initializeParameters() {
        this.parameters = {
            maxOffset: this.options.maxOffset ?? 20,
            direction: this.options.direction ?? 'random',
            sliceWidth: this.options.sliceWidth ?? 4,
            frequency: this.options.frequency ?? 1
        };
    }

    draw(ctx, timingInfo) {
        this.copyImageData(this.originalImageData, this.workingImageData);
        this.copyImageData(this.originalImageData, this.outputImageData);
        const w = this.workingImageData.width, h = this.workingImageData.height, src = this.workingImageData.data, dst = this.outputImageData.data,
            { maxOffset, direction, sliceWidth, frequency } = this.parameters,
            progress = this.getProgress(timingInfo), intensity = this.getIntensity() * progress,
            beat = (timingInfo.currentBeat * frequency) % 1,
            bI = Math.sin(beat * Math.PI * 2) * 0.5 + 0.5,
            maxO = maxOffset * intensity * bI;

        for (let x = 0; x < w; x += sliceWidth) {
            const e = Math.min(x + sliceWidth, w);
            let offset = 0;
            switch (direction) {
                case 'up': offset = -maxO; break;
                case 'down': offset = maxO; break;
                case 'random':
                    this.random.setSeed?.(this.random.seed + x);
                    offset = (this.random.nextFloat?.(-maxO, maxO)) ?? ((Math.random() * 2 - 1) * maxO);
                    break;
                case 'wave':
                    offset = Math.sin((x / w) * Math.PI * 4 + timingInfo.currentTime * 2) * maxO;
                    break;
            }
            for (let sx = x; sx < e; sx++) for (let y = 0; y < h; y++) {
                let sy = y + Math.round(offset);
                if (sy < 0) sy = h + (sy % h);
                else if (sy >= h) sy %= h;
                const sIdx = (sy * w + sx) * 4, dIdx = (y * w + sx) * 4;
                if (sIdx >= 0 && sIdx < src.length - 3)
                    dst[dIdx] = src[sIdx], dst[dIdx + 1] = src[sIdx + 1],
                    dst[dIdx + 2] = src[sIdx + 2], dst[dIdx + 3] = src[sIdx + 3];
            }
        }
        if (intensity > 0.3) this.addNoise(this.outputImageData, intensity * 0.1);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    addNoise(img, intensity) {
        const d = img.data, na = intensity * 10;
        for (let i = 0; i < d.length; i += 4) {
            const n = ((this.random.next?.() ?? Math.random()) - 0.5) * na;
            d[i] = Math.max(0, Math.min(255, d[i] + n));
            d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
            d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
    }
    onStart() { }
    onStop() { }
}
