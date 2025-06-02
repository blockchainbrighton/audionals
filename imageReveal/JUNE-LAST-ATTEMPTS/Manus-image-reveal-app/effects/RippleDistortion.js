import { EffectBase } from './EffectBase.js';

export class RippleDistortion extends EffectBase {
    constructor(name = 'RippleDistortion', options = {}) { super(name, options); }

    initializeParameters() {
        this.parameters = {
            amplitude: this.options.amplitude ?? 15,
            frequency: this.options.frequency ?? 0.3,
            speed: this.options.speed ?? 2,
            damping: this.options.damping ?? 0.95,
            centerX: this.options.centerX ?? 0.5,
            centerY: this.options.centerY ?? 0.5,
            multipleRipples: this.options.multipleRipples !== false,
            maxRipples: this.options.maxRipples ?? 5,
            beatSync: this.options.beatSync !== false,
            waveType: this.options.waveType ?? 'sine',
            distortionMode: this.options.distortionMode ?? 'radial'
        };
        this.ripples = [];
        this.lastBeatTime = 0;
        this.distortionField = null;
    }

    draw(ctx, timingInfo) {
        const intensity = this.getIntensity() * this.getProgress(timingInfo);
        this.updateRipples(timingInfo, intensity);
        this.makeDistortionField(timingInfo, intensity);
        this.applyDistortion(ctx, intensity);
    }

    updateRipples(timingInfo, intensity) {
        const t = timingInfo.currentTime;
        if (this.parameters.beatSync) {
            if (timingInfo.currentBeat % 1 < 0.1 && t - this.lastBeatTime > 0.2) {
                this.addRipple(t, intensity); this.lastBeatTime = t;
            }
        } else if (!this.ripples.length || t - this.ripples.at(-1).startTime > 1)
            this.addRipple(t, intensity);
        this.ripples = this.ripples.filter(r => {
            r.age = t - r.startTime;
            r.radius = r.age * this.parameters.speed * 100;
            r.amplitude = r.initialAmplitude * Math.pow(this.parameters.damping, r.age);
            return r.amplitude > 0.1 && r.radius < 2000;
        });
    }

    addRipple(t, intensity) {
        if (this.ripples.length >= this.parameters.maxRipples) this.ripples.shift();
        let cx, cy;
        if (this.parameters.multipleRipples) {
            cx = this.random.nextFloat?.(0.2, 0.8) ?? (0.2 + Math.random() * 0.6);
            cy = this.random.nextFloat?.(0.2, 0.8) ?? (0.2 + Math.random() * 0.6);
        } else {
            cx = this.parameters.centerX; cy = this.parameters.centerY;
        }
        this.ripples.push({
            centerX: cx * this.originalImageData.width,
            centerY: cy * this.originalImageData.height,
            startTime: t, age: 0, radius: 0,
            initialAmplitude: this.parameters.amplitude * intensity,
            amplitude: this.parameters.amplitude * intensity,
            frequency: (this.parameters.frequency ?? 0.3) + ((this.random.nextFloat?.(-0.1, 0.1)) ?? (Math.random() * 0.2 - 0.1)),
            phase: (this.random.nextFloat?.(0, Math.PI * 2)) ?? (Math.random() * Math.PI * 2)
        });
    }

    makeDistortionField(timingInfo, intensity) {
        const w = this.originalImageData.width, h = this.originalImageData.height;
        if (!this.distortionField || this.distortionField.length !== w * h * 2)
            this.distortionField = new Float32Array(w * h * 2);
        this.distortionField.fill(0);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                let ox = 0, oy = 0;
                for (const r of this.ripples) {
                    const dx = x - r.centerX, dy = y - r.centerY, dist = Math.hypot(dx, dy);
                    if (!dist) continue;
                    const d = this.rippleDist(dist, r, timingInfo), off = this.distOffset(dx, dy, dist, d);
                    ox += off.x; oy += off.y;
                }
                const i = (y * w + x) * 2;
                this.distortionField[i] = ox; this.distortionField[i + 1] = oy;
            }
    }

    rippleDist(dist, r, timingInfo) {
        const phase = dist * r.frequency - r.age * this.parameters.speed + r.phase;
        let wave;
        switch (this.parameters.waveType) {
            case 'square': wave = Math.sign(Math.sin(phase)); break;
            case 'triangle': wave = (2 / Math.PI) * Math.asin(Math.sin(phase)); break;
            case 'sawtooth': wave = 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5)); break;
            default: wave = Math.sin(phase);
        }
        return wave * r.amplitude * Math.exp(-dist / 200);
    }

    distOffset(dx, dy, dist, d) {
        switch (this.parameters.distortionMode) {
            case 'tangential': return { x: -dy / dist * d, y: dx / dist * d };
            case 'horizontal': return { x: d, y: 0 };
            case 'vertical': return { x: 0, y: d };
            case 'spiral': {
                const a = Math.atan2(dy, dx), sa = a + d * 0.1, nx = Math.cos(sa) * dist, ny = Math.sin(sa) * dist;
                return { x: nx - dx, y: ny - dy };
            }
            case 'twist': {
                const ta = d * 0.01, c = Math.cos(ta), s = Math.sin(ta), nx = dx * c - dy * s, ny = dx * s + dy * c;
                return { x: nx - dx, y: ny - dy };
            }
            default: // 'radial'
                return dist ? { x: dx / dist * d, y: dy / dist * d } : { x: 0, y: 0 };
        }
    }

    applyDistortion(ctx, intensity) {
        const w = this.originalImageData.width, h = this.originalImageData.height, src = this.originalImageData.data;
        this.copyImageData(this.originalImageData, this.outputImageData);
        const out = this.outputImageData.data, f = this.distortionField;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 2, ox = f[idx] * intensity, oy = f[idx + 1] * intensity,
                      sx = x - ox, sy = y - oy, c = this.bilinear(src, w, h, sx, sy),
                      j = (y * w + x) * 4;
                out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; out[j + 3] = c[3];
            }
        if (intensity > 0.6) this.chromatic(this.outputImageData, intensity);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    bilinear(d, w, h, x, y) {
        x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y));
        const x1 = x | 0, y1 = y | 0, x2 = Math.min(x1 + 1, w - 1), y2 = Math.min(y1 + 1, h - 1),
            fx = x - x1, fy = y - y1, i11 = (y1 * w + x1) * 4, i21 = (y1 * w + x2) * 4,
            i12 = (y2 * w + x1) * 4, i22 = (y2 * w + x2) * 4, r = Array(4);
        for (let c = 0; c < 4; c++) {
            const top = d[i11 + c] * (1 - fx) + d[i21 + c] * fx, bot = d[i12 + c] * (1 - fx) + d[i22 + c] * fx;
            r[c] = top * (1 - fy) + bot * fy;
        }
        return r.map(v => Math.round(v));
    }

    chromatic(img, intensity) {
        const w = img.width, h = img.height, d = img.data, t = new Uint8ClampedArray(d),
            ab = intensity * 2, cx = w / 2, cy = h / 2;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4, dx = x - cx, dy = y - cy,
                    dist = Math.hypot(dx, dy), nd = dist / Math.hypot(cx, cy),
                    ro = ab * nd, bo = -ab * nd,
                    rx = Math.min(w - 1, Math.max(0, x + ro)), rIdx = (y * w + Math.round(rx)) * 4,
                    bx = Math.min(w - 1, Math.max(0, x + bo)), bIdx = (y * w + Math.round(bx)) * 4;
                d[idx] = t[rIdx];
                d[idx + 1] = t[idx + 1];
                d[idx + 2] = t[bIdx + 2];
                d[idx + 3] = t[idx + 3];
            }
    }

    onStart() { this.ripples = []; this.lastBeatTime = 0; this.distortionField = null; }
    onStop() { this.ripples = []; }
}
