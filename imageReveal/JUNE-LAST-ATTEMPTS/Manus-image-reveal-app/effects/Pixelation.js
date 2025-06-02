import { EffectBase } from './EffectBase.js';

export class Pixelation extends EffectBase {
    constructor(name = 'Pixelation', options = {}) { super(name, options); }

    initializeParameters() {
        this.parameters = {
            maxPixelSize: this.options.pixelSize ?? 16,
            minPixelSize: this.options.minPixelSize ?? 1,
            smoothing: this.options.smoothing ?? 0.2,
            colorMode: this.options.colorMode ?? 'average',
            beatSync: this.options.beatSync !== false,
            pattern: this.options.pattern ?? 'square'
        };
    }

    draw(ctx, timingInfo) {
        const intensity = this.getIntensity(), p = this.getProgress(timingInfo);
        let pix = this.parameters.maxPixelSize * (1 - p) * intensity;
        pix = Math.max(this.parameters.minPixelSize, pix);
        if (this.parameters.beatSync) {
            const beat = Math.sin((timingInfo.currentBeat % 1) * Math.PI) * 0.3 + 0.7;
            pix *= beat;
        }
        const sz = Math.max(1, Math.round(pix));
        this.copyImageData(this.originalImageData, this.workingImageData);
        this.pixelate(this.workingImageData, sz);
        if (this.parameters.smoothing > 0 && sz <= 4)
            this.smooth(this.workingImageData, this.parameters.smoothing);
        this.copyImageData(this.workingImageData, this.outputImageData);
        if (sz > 8) this.retroColor(this.outputImageData, sz / this.parameters.maxPixelSize);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    pixelate(img, pix) {
        const w = img.width, h = img.height, d = img.data;
        for (let y = 0; y < h; y += pix) for (let x = 0; x < w; x += pix) {
            const bw = Math.min(pix, w - x), bh = Math.min(pix, h - y),
                  c = this.blockColor(d, w, x, y, bw, bh);
            for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) {
                if (this.parameters.pattern !== 'square') {
                    const rx = xx - x - bw / 2, ry = yy - y - bh / 2;
                    if (!this.inPattern(rx, ry, bw, bh)) continue;
                }
                const i = (yy * w + xx) * 4;
                d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
            }
        }
    }

    blockColor(data, width, sx, sy, bw, bh) {
        switch (this.parameters.colorMode) {
            case 'average': return this.avgColor(data, width, sx, sy, bw, bh);
            case 'dominant': return this.domColor(data, width, sx, sy, bw, bh);
            case 'random': return this.randColor(data, width, sx, sy, bw, bh);
            case 'center': return this.centerColor(data, width, sx, sy, bw, bh);
            default: return this.avgColor(data, width, sx, sy, bw, bh);
        }
    }

    avgColor(d, w, sx, sy, bw, bh) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let y = sy; y < sy + bh; y++) for (let x = sx; x < sx + bw; x++) {
            const i = (y * w + x) * 4;
            r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; n++;
        }
        return [r / n | 0, g / n | 0, b / n | 0, a / n | 0];
    }

    domColor(d, w, sx, sy, bw, bh) {
        const map = new Map();
        for (let y = sy; y < sy + bh; y++) for (let x = sx; x < sx + bw; x++) {
            const i = (y * w + x) * 4, r = d[i] / 32 | 0, g = d[i + 1] / 32 | 0, b = d[i + 2] / 32 | 0,
                  k = `${r},${g},${b}`; map.set(k, (map.get(k) || 0) + 1);
        }
        let max = 0, color = [0, 0, 0, 255];
        for (const [k, v] of map) if (v > max) { max = v; const [r, g, b] = k.split(',').map(e => e * 32); color = [r, g, b, 255]; }
        return color;
    }

    randColor(d, w, sx, sy, bw, bh) {
        const rx = sx + (this.random.nextInt ? this.random.nextInt(0, bw - 1) : Math.random() * bw | 0),
              ry = sy + (this.random.nextInt ? this.random.nextInt(0, bh - 1) : Math.random() * bh | 0),
              i = (ry * w + rx) * 4;
        return [d[i], d[i + 1], d[i + 2], d[i + 3]];
    }

    centerColor(d, w, sx, sy, bw, bh) {
        const cx = sx + (bw / 2 | 0), cy = sy + (bh / 2 | 0), i = (cy * w + cx) * 4;
        return [d[i], d[i + 1], d[i + 2], d[i + 3]];
    }

    inPattern(rx, ry, bw, bh) {
        const maxR = Math.min(bw, bh) / 2;
        switch (this.parameters.pattern) {
            case 'circle': return rx * rx + ry * ry <= maxR * maxR;
            case 'diamond': return Math.abs(rx) + Math.abs(ry) <= maxR;
            default: return true;
        }
    }

    smooth(img, s) {
        const w = img.width, h = img.height, d = img.data, tmp = new Uint8ClampedArray(d),
              k = [[1,2,1],[2,4,2],[1,2,1]], ks = 16;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
                const px = x + kx - 1, py = y + ky - 1, i = (py * w + px) * 4, wgt = k[ky][kx];
                r += tmp[i] * wgt; g += tmp[i + 1] * wgt; b += tmp[i + 2] * wgt; a += tmp[i + 3] * wgt;
            }
            const i = (y * w + x) * 4;
            d[i] = tmp[i] * (1 - s) + (r / ks) * s;
            d[i + 1] = tmp[i + 1] * (1 - s) + (g / ks) * s;
            d[i + 2] = tmp[i + 2] * (1 - s) + (b / ks) * s;
            d[i + 3] = tmp[i + 3] * (1 - s) + (a / ks) * s;
        }
    }

    retroColor(img, p) {
        const d = img.data, enh = p * 0.3, contrast = 1 + enh,
              f = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.max(0, Math.min(255, f * (d[i] - 128) + 128));
            d[i + 1] = Math.max(0, Math.min(255, f * (d[i + 1] - 128) + 128));
            d[i + 2] = Math.max(0, Math.min(255, f * (d[i + 2] - 128) + 128));
            if (enh > 0.5) {
                const lv = 8, q = 255 / lv;
                d[i] = Math.round(d[i] / q) * q;
                d[i + 1] = Math.round(d[i + 1] / q) * q;
                d[i + 2] = Math.round(d[i + 2] / q) * q;
            }
        }
    }

    onStart() { }
    onStop() { }
}
