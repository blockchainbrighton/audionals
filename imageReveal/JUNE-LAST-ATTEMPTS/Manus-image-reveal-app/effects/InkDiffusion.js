import { EffectBase } from './EffectBase.js';

export class InkDiffusion extends EffectBase {
    constructor(name = 'InkDiffusion', options = {}) { super(name, options); }

    initializeParameters() {
        this.parameters = {
            dropCount: this.options.dropCount ?? 5,
            diffusionSpeed: this.options.diffusionSpeed ?? 1.0,
            viscosity: this.options.viscosity ?? 0.8,
            turbulence: this.options.turbulence ?? 0.3,
            colorBlending: this.options.colorBlending ?? 0.7,
            edgeSharpness: this.options.edgeSharpness ?? 0.5,
            beatSync: this.options.beatSync !== false,
            inkColor: this.options.inkColor ?? null,
            backgroundFade: this.options.backgroundFade ?? 0.9
        };
        this.inkDrops = [];
        this.diffusionField = null;
        this.velocityField = null;
        this.fieldWidth = 0;
        this.fieldHeight = 0;
        this.fieldScale = 4;
    }

    draw(ctx, timingInfo) {
        if (!this.diffusionField) this.initSimulation();
        const intensity = this.getIntensity() * this.getProgress(timingInfo);
        this.updateDrops(timingInfo, intensity);
        this.simulate(intensity, timingInfo);
        this.applyToImage(ctx, intensity);
    }

    initSimulation() {
        const w = this.originalImageData.width, h = this.originalImageData.height, s = this.fieldScale;
        this.fieldWidth = Math.ceil(w / s);
        this.fieldHeight = Math.ceil(h / s);
        this.diffusionField = new Float32Array(this.fieldWidth * this.fieldHeight);
        this.velocityField = { x: new Float32Array(this.fieldWidth * this.fieldHeight), y: new Float32Array(this.fieldWidth * this.fieldHeight) };
        this.inkDrops = [];
    }

    updateDrops(timingInfo, intensity) {
        if (this.parameters.beatSync) {
            if (timingInfo.currentBeat % 1 < 0.1 && this.inkDrops.length < this.parameters.dropCount)
                this.createDrop(intensity, timingInfo.currentTime);
        } else if (this.inkDrops.length < this.parameters.dropCount) {
            if (!this.inkDrops.length || timingInfo.currentTime - this.inkDrops.at(-1).creationTime > 0.5)
                this.createDrop(intensity, timingInfo.currentTime);
        }
        for (const d of this.inkDrops) {
            d.age = timingInfo.currentTime - d.creationTime;
            d.radius = Math.min(d.maxRadius, d.age * this.parameters.diffusionSpeed * 20);
            d.concentration = Math.max(0, d.initialConcentration * Math.exp(-d.age * 0.5));
        }
        this.inkDrops = this.inkDrops.filter(d => d.concentration > 0.01);
    }

    createDrop(intensity, t) {
        this.inkDrops.push({
            x: this.random.nextFloat ? this.random.nextFloat(0.2, 0.8) * this.fieldWidth : (0.2 + Math.random() * 0.6) * this.fieldWidth,
            y: this.random.nextFloat ? this.random.nextFloat(0.2, 0.8) * this.fieldHeight : (0.2 + Math.random() * 0.6) * this.fieldHeight,
            radius: 0,
            maxRadius: (this.random.nextFloat ? this.random.nextFloat(20, 50) : 20 + Math.random() * 30) * intensity,
            initialConcentration: (this.random.nextFloat ? this.random.nextFloat(0.7, 1) : 0.7 + Math.random() * 0.3) * intensity,
            concentration: (this.random.nextFloat ? this.random.nextFloat(0.7, 1) : 0.7 + Math.random() * 0.3) * intensity,
            creationTime: t,
            age: 0,
            color: this.parameters.inkColor ?? this.getSampledColor()
        });
    }

    getSampledColor() {
        const w = this.originalImageData.width, h = this.originalImageData.height, d = this.originalImageData.data,
              x = this.random.nextInt ? this.random.nextInt(0, w - 1) : Math.random() * w | 0,
              y = this.random.nextInt ? this.random.nextInt(0, h - 1) : Math.random() * h | 0, i = (y * w + x) * 4;
        return [d[i], d[i + 1], d[i + 2]];
    }

    simulate(intensity, timingInfo) {
        this.diffusionField.fill(0); this.velocityField.x.fill(0); this.velocityField.y.fill(0);
        for (const d of this.inkDrops) this.addDrop(d);
        this.diffuse(intensity); this.viscosity(); this.turbulence(timingInfo, intensity); this.smooth();
    }

    addDrop(d) {
        const cx = Math.round(d.x), cy = Math.round(d.y), r = d.radius, conc = d.concentration;
        const minX = Math.max(0, cx - Math.ceil(r)), maxX = Math.min(this.fieldWidth - 1, cx + Math.ceil(r)),
              minY = Math.max(0, cy - Math.ceil(r)), maxY = Math.min(this.fieldHeight - 1, cy + Math.ceil(r));
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
            const dx = x - d.x, dy = y - d.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= r) {
                const index = y * this.fieldWidth + x, f = 1 - dist / r, inf = conc * f * f;
                this.diffusionField[index] = Math.max(this.diffusionField[index], inf);
            }
        }
    }

    diffuse(intensity) {
        const tmp = new Float32Array(this.diffusionField), rate = 0.1 * this.parameters.diffusionSpeed * intensity, w = this.fieldWidth;
        for (let y = 1; y < this.fieldHeight - 1; y++)
            for (let x = 1; x < this.fieldWidth - 1; x++) {
                const i = y * w + x, n = [tmp[i - 1], tmp[i + 1], tmp[i - w], tmp[i + w]],
                      avg = n.reduce((s, v) => s + v, 0) / 4, cur = tmp[i];
                this.diffusionField[i] = cur + (avg - cur) * rate;
            }
    }

    viscosity() {
        const v = this.parameters.viscosity, x = this.velocityField.x, y = this.velocityField.y;
        for (let i = 0; i < x.length; i++) x[i] *= v, y[i] *= v;
    }

    turbulence(timingInfo, intensity) {
        const t = this.parameters.turbulence * intensity, time = timingInfo.currentTime;
        for (let y = 0; y < this.fieldHeight; y++)
            for (let x = 0; x < this.fieldWidth; x++) {
                const i = y * this.fieldWidth + x,
                      nX = this.noise2D(x * 0.1, y * 0.1 + time * 0.5) * t,
                      nY = this.noise2D(x * 0.1 + 100, y * 0.1 + time * 0.5) * t;
                this.velocityField.x[i] += nX;
                this.velocityField.y[i] += nY;
                if (this.diffusionField[i] > 0.1) {
                    const nx = Math.max(0, Math.min(this.fieldWidth - 1, x + this.velocityField.x[i] * 0.5)),
                          ny = Math.max(0, Math.min(this.fieldHeight - 1, y + this.velocityField.y[i] * 0.5)),
                          ni = Math.round(ny) * this.fieldWidth + Math.round(nx);
                    if (ni !== i && ni >= 0 && ni < this.diffusionField.length)
                        this.diffusionField[ni] = Math.max(this.diffusionField[ni], this.diffusionField[i] * 0.1);
                }
            }
    }

    smooth() {
        const tmp = new Float32Array(this.diffusionField), s = 0.3;
        for (let y = 1; y < this.fieldHeight - 1; y++)
            for (let x = 1; x < this.fieldWidth - 1; x++) {
                const i = y * this.fieldWidth + x;
                let sum = 0, count = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy, ni = ny * this.fieldWidth + nx;
                    sum += tmp[ni]; count++;
                }
                this.diffusionField[i] = tmp[i] * (1 - s) + (sum / count) * s;
            }
    }

    applyToImage(ctx, intensity) {
        this.copyImageData(this.originalImageData, this.outputImageData);
        const w = this.outputImageData.width, h = this.outputImageData.height, data = this.outputImageData.data, fade = this.parameters.backgroundFade;
        for (let i = 0; i < data.length; i += 4) data[i] *= fade, data[i + 1] *= fade, data[i + 2] *= fade;
        for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
                const px = y * w + x, fx = x / this.fieldScale | 0, fy = y / this.fieldScale | 0,
                      fi = fy * this.fieldWidth + fx;
                if (fi < this.diffusionField.length) {
                    const d = this.diffusionField[fi];
                    if (d > 0.1) {
                        const rA = Math.min(1, d * intensity), origI = px * 4, origD = this.originalImageData.data;
                        let [tr, tg, tb] = [origD[origI], origD[origI + 1], origD[origI + 2]];
                        if (this.parameters.colorBlending > 0) {
                            const c = this.getNearestInkColor(x, y); if (c) {
                                const blend = this.parameters.colorBlending * d;
                                tr = tr * (1 - blend) + c[0] * blend;
                                tg = tg * (1 - blend) + c[1] * blend;
                                tb = tb * (1 - blend) + c[2] * blend;
                            }
                        }
                        const edge = this.parameters.edgeSharpness, sharp = Math.pow(rA, 1 / (edge + 0.1));
                        data[origI] = data[origI] * (1 - sharp) + tr * sharp;
                        data[origI + 1] = data[origI + 1] * (1 - sharp) + tg * sharp;
                        data[origI + 2] = data[origI + 2] * (1 - sharp) + tb * sharp;
                    }
                }
            }
        if (intensity > 0.4) this.addInkTexture(this.outputImageData, intensity);
        ctx.putImageData(this.outputImageData, 0, 0);
    }

    getNearestInkColor(x, y) {
        let nearest = null, minD = 1e9, fx = x / this.fieldScale, fy = y / this.fieldScale;
        for (const d of this.inkDrops) {
            const dx = fx - d.x, dy = fy - d.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minD && dist <= d.radius) minD = dist, nearest = d;
        }
        return nearest ? nearest.color : null;
    }

    addInkTexture(imageData, intensity) {
        const d = imageData.data, t = intensity * 0.2;
        for (let i = 0; i < d.length; i += 4)
            if (this.random.next() < t * 0.1) {
                const n = (this.random.next() - 0.5) * 20 * t;
                d[i] = Math.max(0, Math.min(255, d[i] + n));
                d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
                d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
            }
    }

    noise2D(x, y) {
        const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (h - Math.floor(h)) * 2 - 1;
    }

    onStart() { this.inkDrops = []; this.diffusionField = null; this.velocityField = null; }
    onStop() { }
}
