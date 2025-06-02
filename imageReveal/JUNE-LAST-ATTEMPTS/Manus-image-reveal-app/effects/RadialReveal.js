import { EffectBase } from './EffectBase.js';

export class RadialReveal extends EffectBase {
    constructor(name = 'RadialReveal', options = {}) { super(name, options); }

    initializeParameters() {
        this.parameters = {
            centerCount: this.options.centerCount ?? 3,
            revealSpeed: this.options.revealSpeed ?? 1,
            maxRadius: this.options.maxRadius ?? 0.8,
            fadeWidth: this.options.fadeWidth ?? 0.1,
            rotationSpeed: this.options.rotationSpeed ?? 0.5,
            pulsation: this.options.pulsation ?? 0.3,
            beatSync: this.options.beatSync !== false,
            pattern: this.options.pattern ?? 'circle',
            centerMode: this.options.centerMode ?? 'fixed'
        };
        this.revealCenters = [];
        this.maxImageRadius = 0;
    }

    draw(ctx, timingInfo) {
        if (!this.revealCenters.length) this.initCenters();
        const intensity = this.getIntensity() * this.getProgress(timingInfo);
        this.updateCenters(timingInfo, intensity);
        const mask = this.createMask(intensity, timingInfo);
        this.applyReveal(ctx, mask, intensity);
    }

    initCenters() {
        const w = this.originalImageData.width, h = this.originalImageData.height;
        this.maxImageRadius = Math.hypot(w, h) / 2; this.revealCenters = [];
        const count = this.parameters.centerCount;
        if (this.parameters.centerMode === 'fixed') {
            const pos = [
                [.5, .5], [.25, .25], [.75, .75], [.25, .75], [.75, .25]
            ];
            for (let i = 0; i < Math.min(count, pos.length); i++) {
                this.revealCenters.push({
                    x: pos[i][0] * w, y: pos[i][1] * h,
                    baseX: pos[i][0] * w, baseY: pos[i][1] * h,
                    radius: 0,
                    maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                    phase: i * (Math.PI * 2 / count), rotationAngle: 0
                });
            }
        } else if (this.parameters.centerMode === 'random') {
            for (let i = 0; i < count; i++) {
                const x = (this.random.nextFloat?.(0.2, 0.8) ?? (0.2 + Math.random() * 0.6)) * w;
                const y = (this.random.nextFloat?.(0.2, 0.8) ?? (0.2 + Math.random() * 0.6)) * h;
                this.revealCenters.push({
                    x, y, baseX: x, baseY: y, radius: 0,
                    maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                    phase: this.random.nextFloat?.(0, Math.PI * 2) ?? (Math.random() * Math.PI * 2),
                    rotationAngle: 0
                });
            }
        } else if (this.parameters.centerMode === 'grid') {
            const grid = Math.ceil(Math.sqrt(count));
            let idx = 0;
            for (let r = 0; r < grid && idx < count; r++)
                for (let c = 0; c < grid && idx < count; c++, idx++) {
                    const x = (c + .5) / grid * w, y = (r + .5) / grid * h;
                    this.revealCenters.push({
                        x, y, baseX: x, baseY: y, radius: 0,
                        maxRadius: this.maxImageRadius * this.parameters.maxRadius / grid,
                        phase: idx * (Math.PI * 2 / count), rotationAngle: 0
                    });
                }
        } else if (this.parameters.centerMode === 'orbit') {
            const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.3;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                this.revealCenters.push({
                    x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
                    baseX: cx, baseY: cy, orbitRadius: r, orbitAngle: a,
                    radius: 0, maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                    phase: i * (Math.PI * 2 / count), rotationAngle: 0
                });
            }
        }
    }

    updateCenters(timingInfo, intensity) {
        for (const c of this.revealCenters) {
            c.radius = this.lerp(c.radius, c.maxRadius * intensity, 0.1);
            if (this.parameters.beatSync && this.parameters.pulsation > 0) {
                const phase = (timingInfo.currentBeat + c.phase / (Math.PI * 2)) % 1;
                c.radius *= 1 + Math.sin(phase * Math.PI) * this.parameters.pulsation;
            }
            c.rotationAngle += this.parameters.rotationSpeed * 0.02;
            if (c.orbitRadius !== undefined) {
                c.orbitAngle += this.parameters.rotationSpeed * 0.01;
                c.x = c.baseX + Math.cos(c.orbitAngle) * c.orbitRadius;
                c.y = c.baseY + Math.sin(c.orbitAngle) * c.orbitRadius;
            }
        }
    }

    createMask(intensity, timingInfo) {
        const w = this.originalImageData.width, h = this.originalImageData.height, mask = new Float32Array(w * h);
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                let v = 0;
                for (const c of this.revealCenters)
                    v = Math.max(v, this.pixelReveal(x, y, c, timingInfo));
                mask[y * w + x] = v;
            }
        this.smoothMask(mask, w, h);
        return mask;
    }

    pixelReveal(x, y, c, timingInfo) {
        const dx = x - c.x, dy = y - c.y;
        switch (this.parameters.pattern) {
            case 'star': return this.starReveal(dx, dy, c);
            case 'polygon': return this.polyReveal(dx, dy, c);
            case 'spiral': return this.spiralReveal(dx, dy, c, timingInfo);
            default: return this.circleReveal(dx, dy, c);
        }
    }

    circleReveal(dx, dy, c) {
        const d = Math.hypot(dx, dy), fw = c.maxRadius * this.parameters.fadeWidth;
        if (d <= c.radius) return 1;
        if (d <= c.radius + fw) return 1 - (d - c.radius) / fw;
        return 0;
    }

    starReveal(dx, dy, c) {
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + c.rotationAngle, pts = 5, fw = c.maxRadius * this.parameters.fadeWidth;
        const sa = (a + Math.PI) % (Math.PI * 2 / pts), r = c.radius * (0.7 + 0.3 * Math.cos(sa * pts));
        if (d <= r) return 1;
        if (d <= r + fw) return 1 - (d - r) / fw;
        return 0;
    }

    polyReveal(dx, dy, c) {
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + c.rotationAngle, sides = 6, ang = Math.PI * 2 / sides,
            norm = ((a + Math.PI) % ang) - ang / 2, r = c.radius / Math.cos(norm), fw = c.maxRadius * this.parameters.fadeWidth;
        if (d <= r) return 1;
        if (d <= r + fw) return 1 - (d - r) / fw;
        return 0;
    }

    spiralReveal(dx, dy, c, timingInfo) {
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), turns = 3,
            sp = (d / c.maxRadius + a / (Math.PI * 2) * turns + timingInfo.currentTime * 0.5) % 1,
            cp = c.radius / c.maxRadius, fw = this.parameters.fadeWidth;
        if (sp <= cp) return 1;
        if (sp <= cp + fw) return 1 - (sp - cp) / fw;
        return 0;
    }

    applyReveal(ctx, mask, intensity) {
        this.copyImageData(this.originalImageData, this.outputImageData);
        const w = this.outputImageData.width, h = this.outputImageData.height, d = this.outputImageData.data;
        for (let i = 0; i < w * h; i++) {
            const r = mask[i] * intensity, j = i * 4;
            if (r < 1) d[j] = d[j] * r | 0, d[j + 1] = d[j + 1] * r | 0, d[j + 2] = d[j + 2] * r | 0;
            else if (intensity > 0.5) this.enhance(d, j, intensity);
        }
        if (intensity > 0.3) this.glow(this.outputImageData, mask, intensity);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    enhance(d, j, intensity) {
        const e = 0.2 * intensity, ct = 1 + e,
            f = (259 * (ct * 255 + 255)) / (255 * (259 - ct * 255));
        d[j] = Math.max(0, Math.min(255, f * (d[j] - 128) + 128));
        d[j + 1] = Math.max(0, Math.min(255, f * (d[j + 1] - 128) + 128));
        d[j + 2] = Math.max(0, Math.min(255, f * (d[j + 2] - 128) + 128));
    }

    glow(img, mask, intensity) {
        const w = img.width, h = img.height, d = img.data, g = intensity * 50 * 0.3;
        for (let y = 1; y < h - 1; y++)
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x, r = mask[i];
                if (r > 0.1 && r < 0.9) {
                    const j = i * 4;
                    d[j] = Math.min(255, d[j] + g);
                    d[j + 1] = Math.min(255, d[j + 1] + g);
                    d[j + 2] = Math.min(255, d[j + 2] + g);
                }
            }
    }

    smoothMask(mask, w, h) {
        const tmp = new Float32Array(mask), k = [[1,2,1],[2,4,2],[1,2,1]], ks = 16;
        for (let y = 1; y < h - 1; y++)
            for (let x = 1; x < w - 1; x++) {
                let s = 0;
                for (let ky = 0; ky < 3; ky++)
                    for (let kx = 0; kx < 3; kx++) {
                        const px = x + kx - 1, py = y + ky - 1, i = py * w + px;
                        s += tmp[i] * k[ky][kx];
                    }
                mask[y * w + x] = s / ks;
            }
    }

    lerp(a, b, t) { return a + (b - a) * t; }
    onStart() { this.revealCenters = []; }
    onStop() { }
}
